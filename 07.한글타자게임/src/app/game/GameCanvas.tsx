"use client";

import { useEffect, useRef, useState } from "react";
import { FAIL_LINES, FAMILY_MILESTONES, RAIN, RAIN_BACKGROUNDS, RAIN_LEVELS, STAGE_H, STAGE_W } from "./constants";
import { backspace, createRain, rainCpm, submit, typeJamo, updateRain, type Fx } from "./engine";
import { measureLabel, renderRain, type RenderOpts } from "./renderer";
import { playSfx, setBgmSparkle, startBgm, stopBgm } from "./audio";
import { addBonusCandies, applyRain, cheapestUnowned, grantSticker, rainStars, type RainStats } from "./progress";
import { Btn, StarRow, useApp, useKeys } from "./ui/common";
import { isCode } from "./keyInput";
import { PauseOverlay } from "./practice/PracticeScreen";
import type { RainState } from "./types";

interface PanelData {
  success: boolean;
  stars: number;
  score: number;
  best: number;
  newRecord: boolean;
  candies: number;
  maxCombo: number;
  cpm: number;
  toNext: { name: string; need: number; frac: number } | null;
  line: string;
  shownAt: number;
}

export default function GameCanvas({ level }: { level: number }) {
  const app = useApp();
  const { go, stageScale } = app;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RainState>(createRain(level));
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [ending, setEnding] = useState<number | null>(null); // timestamp ending started
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });

  const lv = RAIN_LEVELS[level];
  const fast = level >= 10;

  const renderOpts = (): RenderOpts => {
    const s = appRef.current.save;
    const p = appRef.current.profile;
    return {
      animal: p?.avatar ?? 0,
      umbrella: p?.equipped.umbrella ?? 0,
      house: p?.equipped.house ?? 0,
      name: p?.name ?? "",
      family: {
        bridge: s.familyCandies >= FAMILY_MILESTONES[0].at,
        carousel: s.familyCandies >= FAMILY_MILESTONES[1].at,
        fireworks: s.familyCandies >= FAMILY_MILESTONES[2].at,
      },
    };
  };

  // ---- round end ------------------------------------------------------------
  const finishRound = (success: boolean, completed = true) => {
    const s = stateRef.current;
    const p = appRef.current.profile;
    stopBgm();
    if (!p) return null;
    const stats: RainStats = {
      level,
      success,
      score: s.score,
      candies: s.earned,
      missed: s.missed,
      maxCombo: s.maxCombo,
      cpm: rainCpm(s),
      keys: s.caughtKeys,
      completed,
    };
    let out: ReturnType<typeof applyRain> | null = null;
    let unlocks: number[] = [];
    let toNext: PanelData["toNext"] = null;
    appRef.current.commit((d) => {
      out = applyRain(d, p.id, stats);
      unlocks = [...out.familyUnlocks];
      if (success && level === RAIN_LEVELS.length - 1) unlocks.push(...addBonusCandies(d, p.id, RAIN.endingBonus));
      const dp = d.profiles.find((x) => x.id === p.id)!;
      const c = cheapestUnowned(dp);
      if (c) toNext = { name: c.name, need: Math.max(0, c.price - dp.candies), frac: Math.min(1, dp.candies / c.price) };
    });
    const o = out as ReturnType<typeof applyRain> | null;
    if (o) {
      o.newStickers.forEach((id, i) => setTimeout(() => appRef.current.toast({ kind: "sticker", sticker: id }), 400 + i * 1300));
      unlocks.forEach((m, i) =>
        setTimeout(
          () =>
            appRef.current.toast({
              kind: "family",
              text: `우리 집 사탕 병이 ${FAMILY_MILESTONES[m].at.toLocaleString("ko-KR")}개가 됐어요! ${FAMILY_MILESTONES[m].line}`,
            }),
          400 + (o.newStickers.length + i) * 1300,
        ),
      );
    }
    return { out: o, stats, toNext };
  };

  const fxRef = useRef<Fx>(null as unknown as Fx);
  const makeFx = (): Fx => ({
    sfx: (n) => playSfx(n),
    sparkleLayer: () => setBgmSparkle(true),
    nameCandy: () => {
      const p = appRef.current.profile;
      if (!p) return;
      let isNew = false;
      appRef.current.commit((d) => {
        isNew = grantSticker(d, p.id, 26);
      });
      if (isNew) appRef.current.toast({ kind: "sticker", sticker: 26 });
    },
    done: (success) => {
      const r = finishRound(success);
      if (!r || !r.out) return;
      const s = stateRef.current;
      if (success && level === RAIN_LEVELS.length - 1) {
        setEnding(performance.now());
        return;
      }
      setPanel({
        success,
        stars: success ? rainStars(s.missed) : 0,
        score: s.score,
        best: Math.max(r.out.prevBest, s.score),
        newRecord: r.out.newRecord,
        candies: s.earned,
        maxCombo: s.maxCombo,
        cpm: r.stats.cpm,
        toNext: r.toNext,
        line: FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)],
        shownAt: performance.now(),
      });
    },
  });
  useEffect(() => {
    fxRef.current = makeFx();
  });

  // ---- loop -------------------------------------------------------------------
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const measure = (t: string) => measureLabel(ctx, t);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = c.width / STAGE_W;
      if (!pausedRef.current) updateRain(stateRef.current, dt, measure, fxRef.current);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      renderRain(ctx, stateRef.current, renderOpts());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // dev-only handle so automated smoke tests can read the falling words
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __tadakRain?: typeof stateRef }).__tadakRain = stateRef;
  }, []);

  // backing-store size follows the stage scale for crisp text
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const k = Math.min(2.5, Math.max(1, stageScale * (window.devicePixelRatio || 1)));
    c.width = Math.round(STAGE_W * k);
    c.height = Math.round(STAGE_H * k);
  }, [stageScale]);

  // music
  useEffect(() => {
    startBgm({ fast });
    return () => stopBgm();
  }, [fast]);

  const pause = () => {
    const s = stateRef.current;
    if (pausedRef.current || s.phase !== "play") return;
    pausedRef.current = true;
    setPaused(true);
    stopBgm();
  };
  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
    startBgm({ fast });
    if (stateRef.current.sparkleOn) setBgmSparkle(true);
  };
  const restart = () => {
    stateRef.current = createRain(level, true);
    pausedRef.current = false;
    setPaused(false);
    setPanel(null);
    startBgm({ fast });
  };
  const quitFromPause = () => {
    // Candies caught before quitting are still hers (§11.6 spirit); no stars or records.
    if (stateRef.current.earned > 0) finishRound(false, false);
    go({ name: "rainSelect" });
  };

  // auto-pause on blur
  useEffect(() => {
    const onBlur = () => pause();
    const onVis = () => document.hidden && pause();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useKeys((a) => {
    const s = stateRef.current;
    const name = appRef.current.profile?.name ?? "";
    if (ending !== null) {
      if (a.type === "enter" && performance.now() - ending > 2000) go({ name: "rainSelect" });
      return;
    }
    if (panel) {
      // The fail panel appears failPanelDelay after the fail, and Enter opens at failEnterDelay from the fail.
      const wait = panel.success ? RAIN.successEnterDelay : RAIN.failEnterDelay - RAIN.failPanelDelay;
      if (performance.now() - panel.shownAt < wait * 1000) return;
      if (a.type === "escape") return go({ name: "rainSelect" });
      if (isCode(a, "KeyR")) return restart();
      if (a.type === "enter") {
        if (panel.success && level < RAIN_LEVELS.length - 1) go({ name: "rain", level: level + 1 });
        else restart();
        return;
      }
      if (!panel.success && isCode(a, "KeyC")) go({ name: "shop" });
      return;
    }
    if (paused) {
      if (a.type === "enter" || (a.type === "key" && a.key.code === "Space")) resume();
      else if (isCode(a, "KeyR")) restart();
      else if (a.type === "escape") quitFromPause();
      return;
    }
    if (a.type === "escape") return pause();
    if (s.phase !== "play") return;
    if (a.type === "backspace") backspace(s);
    else if (a.type === "enter") submit(s, name, fxRef.current);
    else if (a.type === "key") {
      if (a.key.code === "Space") submit(s, name, fxRef.current);
      else typeJamo(s, a.key.jamo, fxRef.current);
    }
  });

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} width={STAGE_W} height={STAGE_H} style={{ width: STAGE_W, height: STAGE_H, display: "block" }} />
      {!panel && ending === null && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={pause}
          className="absolute left-3 top-[64px] rounded-xl bg-white/85 px-3 py-1 text-base font-bold text-[#6b4f7a] shadow cursor-pointer"
        >
          ← 뒤로
        </button>
      )}
      {paused && <PauseOverlay onResume={resume} onRestart={restart} onExit={quitFromPause} />}
      {panel && <RainPanel data={panel} level={level} onNext={() => go({ name: "rain", level: level + 1 })} onRetry={restart} onSelect={() => go({ name: "rainSelect" })} onShop={() => go({ name: "shop" })} />}
      {ending !== null && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => go({ name: "rainSelect" })}
          className="absolute top-[455px] left-1/2 -translate-x-1/2 rounded-2xl bg-white px-6 py-3 text-xl font-bold text-[#6b4f7a] shadow cursor-pointer"
        >
          단계 선택으로 (Enter)
        </button>
      )}
      <div className="pointer-events-none absolute right-3 top-[64px] text-sm font-bold text-[#6b4f7a]/70">
        {level + 1}단계 · {RAIN_BACKGROUNDS[lv.bg]}
      </div>
    </div>
  );
}

function RainPanel({
  data,
  level,
  onNext,
  onRetry,
  onSelect,
  onShop,
}: {
  data: PanelData;
  level: number;
  onNext: () => void;
  onRetry: () => void;
  onSelect: () => void;
  onShop: () => void;
}) {
  const hasNext = data.success && level < RAIN_LEVELS.length - 1;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#5b4a6b]/30">
      <div className="overlay-pop relative flex w-[760px] flex-col items-center gap-3 rounded-[36px] bg-white px-10 py-8 text-[#5b4a6b] shadow-2xl">
        {data.success ? (
          <>
            {data.newRecord && <div className="absolute -right-4 top-6 rotate-12 rounded-lg bg-[#FF6F91] px-4 py-1 text-lg font-extrabold text-white">내 새 기록!</div>}
            <div className="text-4xl font-extrabold text-[#FF6F91]">마을을 지켰어요!</div>
            <StarRow n={data.stars} size={56} />
            <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-xl font-bold">
              <div>점수</div>
              <div className="text-right text-[#FF6F91]">{data.score.toLocaleString("ko-KR")}</div>
              <div>받은 사탕</div>
              <div className="text-right text-[#C46BFF]">{data.candies}개</div>
              <div>최고 콤보</div>
              <div className="text-right">{data.maxCombo}</div>
              <div>타수</div>
              <div className="text-right">{data.cpm}타</div>
            </div>
            <div className="mt-2 flex gap-3">
              {hasNext && (
                <Btn big className="bg-[#FF8FB8]! text-white!" onClick={onNext}>
                  다음 단계 (Enter)
                </Btn>
              )}
              <Btn big className={hasNext ? "" : "bg-[#FF8FB8]! text-white!"} onClick={onRetry}>
                다시 (R)
              </Btn>
              <Btn big onClick={onSelect}>
                단계 선택 (Esc)
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-extrabold text-[#FF6F91]">마을이 달콤 범벅이 됐어요!</div>
            <div className="text-5xl font-extrabold text-[#C46BFF]">사탕 {data.candies}개는 내 거!</div>
            {data.toNext && (
              <div className="w-full">
                <div className="mb-1 text-center text-lg font-bold">
                  {data.toNext.need > 0 ? `다음 꾸미기(${data.toNext.name})까지 사탕 ${data.toNext.need}개` : `지금 ${data.toNext.name}를 살 수 있어요!`}
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-[#EADCF2]">
                  <div className="h-full rounded-full bg-[#C9B6FF]" style={{ width: `${data.toNext.frac * 100}%` }} />
                </div>
              </div>
            )}
            <div className="text-lg font-bold">
              이번 점수 {data.score.toLocaleString("ko-KR")} · 내 최고 {data.best.toLocaleString("ko-KR")}
            </div>
            <div className="text-2xl font-bold text-[#6b4f7a]">{data.line}</div>
            <div className="mt-1 flex gap-3">
              <Btn big className="bg-[#FF8FB8]! text-white! ring-4 ring-[#FFD1E3]" onClick={onRetry}>
                다시 하기 (Enter)
              </Btn>
              <Btn big onClick={onShop}>
                꾸미러 가기 (C)
              </Btn>
              <Btn big onClick={onSelect}>
                단계 선택 (Esc)
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
