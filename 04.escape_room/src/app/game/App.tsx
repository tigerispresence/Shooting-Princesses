"use client";

import { useCallback, useState } from "react";
import CharacterSelect from "./CharacterSelect";
import { CHARACTERS, STAGES } from "./constants";
import GameCanvas from "./GameCanvas";
import StageSelect from "./StageSelect";
import {
  loadBest,
  loadCharacterId,
  loadName,
  saveCharacterId,
  saveName,
} from "./storage";
import type { BestRecord } from "./storage";
import TitleScreen from "./TitleScreen";

type Screen = "title" | "character" | "stage" | "play";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id);
  const [name, setName] = useState("");
  const [stageId, setStageId] = useState(1);
  const [bests, setBests] = useState<Record<number, BestRecord | null>>({});

  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const playerName = name.trim() || character.name;

  /**
   * 저장된 값은 화면을 넘어가는 순간에 읽는다.
   * 첫 렌더에서 읽으면 서버가 그린 화면과 달라지고, effect에서 읽으면 렌더가
   * 한 번 더 도는데, 어차피 시작 화면에서는 쓸 일이 없는 값들이다.
   */
  const goCharacter = useCallback(() => {
    setCharacterId(loadCharacterId());
    setName(loadName());
    setScreen("character");
  }, []);

  const goStage = useCallback(() => {
    const next: Record<number, BestRecord | null> = {};
    for (const s of STAGES) next[s.id] = loadBest(s.id);
    setBests(next);
    setScreen("stage");
  }, []);

  const confirmCharacter = useCallback(() => {
    saveCharacterId(characterId);
    saveName(name.trim());
    goStage();
  }, [characterId, name, goStage]);

  const startStage = useCallback((id: number) => {
    setStageId(id);
    setScreen("play");
  }, []);

  if (screen === "title") return <TitleScreen onStart={goCharacter} />;

  if (screen === "character") {
    return (
      <CharacterSelect
        selectedId={characterId}
        name={name}
        onSelect={setCharacterId}
        onName={setName}
        onConfirm={confirmCharacter}
        onBack={() => setScreen("title")}
      />
    );
  }

  if (screen === "stage") {
    return (
      <StageSelect
        playerName={playerName}
        bests={bests}
        onPick={startStage}
        onBack={() => setScreen("character")}
      />
    );
  }

  return (
    <GameCanvas
      // 캐릭터나 스테이지가 바뀌면 게임을 처음부터 새로 만든다
      key={`${characterId}:${stageId}`}
      look={character.look}
      playerName={playerName}
      stageId={stageId}
      onExit={goStage}
    />
  );
}
