"use client";

import { useCallback, useEffect, useState } from "react";
import { setBgmOn, setSfxOn, setupAudioUnlock } from "./audio";
import EndingScreen from "./EndingScreen";
import GameCanvas from "./GameCanvas";
import type { ClearResult } from "./GameCanvas";
import { stopMusic } from "./music";
import NameEntry from "./NameEntry";
import StageSelect from "./StageSelect";
import TitleScreen from "./TitleScreen";
import { emptySave, load, recordFor, refreshHats, save as writeSave } from "./storage";
import type { SaveData } from "./storage";
import { RECORD_BEATEN } from "./text";
import type { Look } from "./types";

type Screen = "title" | "name" | "stage" | "play" | "ending";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [data, setData] = useState<SaveData>(emptySave());
  const [stageId, setStageId] = useState(1);
  const [practice, setPractice] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [recordToast, setRecordToast] = useState<string | null>(null);

  // 저장된 값은 브라우저에서만 읽는다 (서버가 그린 화면과 달라지지 않게)
  useEffect(() => {
    const loaded = refreshHats(load());
    // 서버가 그린 화면과 달라지지 않도록 localStorage는 하이드레이션 뒤에 한 번만 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loaded);
    setBgmOn(loaded.bgmOn);
    setSfxOn(loaded.sfxOn);
    setReady(true);
  }, []);

  useEffect(() => setupAudioUnlock(), []);

  const persist = useCallback((next: SaveData) => {
    const fixed = refreshHats(next);
    setData({ ...fixed });
    writeSave(fixed);
  }, []);

  const onBgm = useCallback(
    (v: boolean) => {
      setBgmOn(v);
      persist({ ...data, bgmOn: v });
    },
    [data, persist],
  );
  const onSfx = useCallback(
    (v: boolean) => {
      setSfxOn(v);
      persist({ ...data, sfxOn: v });
    },
    [data, persist],
  );

  const handleClear = useCallback(
    (r: ClearResult) => {
      const next: SaveData = { ...data };
      const me = data.name || "친구";
      const i = r.stageId - 1;

      // --- 이름별 기록판 (DESIGN §13-3) ---
      // 진행도는 그대로 하나를 공유한다. 늘어나는 건 기록 칸 하나뿐이다.
      const mine = recordFor(data, me);
      const beaten = Object.entries(data.records)
        .filter(([n]) => n !== me)
        .filter(([, rec]) => rec.best[i] > 0 && r.score > rec.best[i])
        // 내가 이미 그 기록을 넘어선 적이 있으면 새삼 알리지 않는다
        .filter(([, rec]) => mine.best[i] <= rec.best[i])
        .sort((a, b) => b[1].best[i] - a[1].best[i])[0];
      setRecordToast(beaten ? RECORD_BEATEN.replace("{상대이름}", beaten[0]) : null);

      next.records = { ...data.records };
      next.records[me] = {
        best: [...mine.best],
        bestTimeMs: [...mine.bestTimeMs],
      };
      next.records[me].best[i] = Math.max(mine.best[i], r.score);
      next.records[me].bestTimeMs[i] =
        mine.bestTimeMs[i] > 0 ? Math.min(mine.bestTimeMs[i], r.timeMs) : r.timeMs;
      next.recentNames = [me, ...data.recentNames.filter((n) => n !== me)].slice(0, 4);

      next.stars = [...data.stars];
      next.best = [...data.best];
      next.stars[i] = Math.max(next.stars[i] ?? 0, r.stars);
      next.best[i] = Math.max(next.best[i] ?? 0, r.score);
      next.vents = data.vents.map((v, k) => v === true || r.foundVents[k] === true);
      next.menuPieces = r.menuPieces.slice();
      // 친구가 없는 스테이지에서는 r.friendsMet이 빈 배열이라, `||`로 합치면
      // undefined가 그대로 들어가 저장이 [null,null,null,null]이 된다.
      next.friendsMet = data.friendsMet.map((v, i) => v === true || r.friendsMet[i] === true);
      next.sleepCount = data.sleepCount + r.sleeps;
      next.unlockedStage = Math.max(next.unlockedStage, Math.min(5, r.stageId + 1));
      if (r.stageId === 5) next.ending = true;
      persist(next);
    },
    [data, persist],
  );

  if (!ready) {
    return <div className="h-[100dvh] w-full bg-[#151129]" />;
  }

  if (screen === "title") {
    return (
      <TitleScreen
        look={data.look}
        savedName={data.name}
        onStart={() => setScreen("name")}
        onContinue={() => {
          stopMusic();
          setScreen("stage");
        }}
      />
    );
  }

  if (screen === "name") {
    return (
      <NameEntry
        initialName={data.name}
        initialLook={data.look}
        unlockedHats={data.unlockedHats}
        onBack={() => setScreen("title")}
        onDone={(name, look: Look) => {
          persist({ ...data, name, look });
          stopMusic();
          setScreen("stage");
        }}
      />
    );
  }

  if (screen === "stage") {
    return (
      <StageSelect
        save={data}
        playerName={data.name || "친구"}
        onBack={() => setScreen("title")}
        onEnding={() => setScreen("ending")}
        onPick={(id, p) => {
          setStageId(id);
          setPractice(p);
          setRecordToast(null);
          setScreen("play");
        }}
      />
    );
  }

  if (screen === "ending") {
    return (
      <EndingScreen
        name={data.name || "친구"}
        look={data.look}
        friendsMet={data.friendsMet}
        allMenus={data.menuPieces.every(Boolean)}
        sleepCount={data.sleepCount}
        onDone={() => setScreen("stage")}
      />
    );
  }

  return (
    <GameCanvas
      key={`${stageId}:${practice}`}
      stageId={stageId}
      look={data.look}
      playerName={data.name || "친구"}
      menuPieces={data.menuPieces}
      foundVents={data.vents}
      friendsMet={data.friendsMet}
      recordToast={recordToast}
      practice={practice}
      bgmOn={data.bgmOn}
      sfxOn={data.sfxOn}
      onBgm={onBgm}
      onSfx={onSfx}
      onClear={handleClear}
      onExit={() => {
        stopMusic();
        setScreen("stage");
      }}
      onNext={
        stageId < 5
          ? () => {
              stopMusic();
              setStageId(stageId + 1);
            }
          : () => {
              stopMusic();
              setScreen("ending");
            }
      }
    />
  );
}
