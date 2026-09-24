"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx, setupAudioUnlock } from "./audio";
import { COLORS, MINIMAP_H, MINIMAP_W, VIEW_H, VIEW_W } from "./constants";
import {
  createGame,
  placeAlarm,
  placeBanana,
  throwPopper,
  pressInteract,
  releaseInteract,
  restartFromCheckpoint,
  setAim,
  setMove,
  skipCutscene,
  throwChalk,
  toHud,
  toggleTorch,
  update,
} from "./engine";
import { INGREDIENTS, STAGES } from "./maps";
import { playClearFanfare, playMusic, stopMusic } from "./music";
import PauseMenu from "./PauseMenu";
import GoalList from "./GoalList";
import { GOAL_ALL, GOAL_NEXT, GOAL_TAP } from "./text";
import { drawFullMap, drawStars, isDarkHere, render } from "./renderer";
import * as sprites from "./sprites";
import { drawIngredient, drawPauseIcon, drawSoundIcon } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import TouchControls from "./TouchControls";
import { DIFFICULTY_LABEL } from "./difficulty";
import type { Difficulty } from "./difficulty";
import type { GameState, HudState, Look, StageScore } from "./types";

export interface ClearResult {
  stageId: number;
  stars: number;
  score: number;
  timeMs: number;
  menuPieces: boolean[];
  friendsMet: boolean[];
  foundVents: boolean[];
  sleeps: number;
  /** 달성한 목표 3칸 — 별 하나에 하나 (§16) */
  goals: boolean[];
}

interface Props {
  stageId: number;
  look: Look;
  playerName: string;
  menuPieces: boolean[];
  foundVents: boolean[];
  friendsMet: boolean[];
  /** 남의 기록을 깼을 때 클리어 화면에 뜨는 한 줄 */
  recordToast: string | null;
  difficulty: Difficulty;
  practice: number | null;
  bgmOn: boolean;
  sfxOn: boolean;
  onBgm: (v: boolean) => void;
  onSfx: (v: boolean) => void;
  onClear: (r: ClearResult) => void;
  onExit: () => void;
  onNext: (() => void) | null;
}

/** 캔버스 바로 아래에 붙는 재료 줄 높이 */
const INGREDIENT_ROW_H = 40;

const EMPTY_HUD: HudState = {
  phase: "playing",
  section: "",
  score: 0,
  menus: 0,
  ingredients: new Array(8).fill(false),
  alarms: 0,
  poppers: 0,
  bananas: 0,
  torch: false,
  canTorch: false,
  canChalk: false,
  canAlarm: false,
  canPopper: false,
  canBanana: false,
  sleepLine: "",
  canSkip: false,
  showRestart: false,
  broadcast: 0,
  showBroadcast: false,
  stars: 0,
  scoreBoard: null,
  sleeps: 0,
  stageId: 1,
  hasIngredientA: false,
  hasIngredientB: false,
  inDark: false,
  vents: 0,
  companions: [],
  timeMs: 0,
  difficulty: "normal",
  scoreMult: 1,
  goals: [],
};

export default function GameCanvas({
  stageId,
  look,
  playerName,
  menuPieces,
  foundVents,
  friendsMet,
  recordToast,
  difficulty,
  practice,
  bgmOn,
  sfxOn,
  onBgm,
  onSfx,
  onClear,
  onExit,
  onNext,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const hudKeyRef = useRef("");
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  // 오늘의 할 일 카드 — 시작 전에 한 번. 연습 모드엔 목표가 없다.
  const [goalCard, setGoalCard] = useState(practice === null);
  const [rotate, setRotate] = useState(false);
  const [box, setBox] = useState({ w: 360, h: 480 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const clearedRef = useRef(false);
  const clearTimeRef = useRef(0);

  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];

  const withState = useCallback((fn: (s: GameState) => void) => {
    const s = stateRef.current;
    if (s) fn(s);
  }, []);

  // iOS는 진짜 터치/클릭 안에서만 오디오가 열린다
  useEffect(() => setupAudioUnlock(), []);

  // 게임 만들기 + 루프. 상태는 ref에만 둔다 (게임 루프 안에서 React state 금지).
  useEffect(() => {
    stateRef.current = createGame({
      stageId,
      playerName,
      menuPieces,
      foundVents,
      friendsMet,
      difficulty,
      practiceZombies: practice,
    });
    clearedRef.current = false;
    hudKeyRef.current = "";

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__zombie = stateRef;
      // 흑백 실루엣 테스트(DESIGN §12-A)를 자동으로 돌리기 위한 개발 전용 훅
      (window as unknown as Record<string, unknown>).__sprites = sprites;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    let chaseHold = 0;

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const s = stateRef.current;
      if (s) {
        const k = keysRef.current;
        const kx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        const ky = (k.down ? 1 : 0) - (k.up ? 1 : 0);
        if (kx || ky) setMove(s, kx, ky);
        else if (!s.padActive) setMove(s, 0, 0);

        update(s, dt);
        render(ctx, s, look);

        // 음악 — 추격이 잠깐 끊겨도 곡이 덜덜거리지 않게 붙잡아 둔다
        const chasing = s.zombies.some((z) => z.state === "chase");
        chaseHold = chasing ? 1500 : Math.max(0, chaseHold - dt);
        if (s.phase === "playing" || s.phase === "ritual") {
          playMusic({
            stageId: s.stageId,
            chase: chaseHold > 0,
            dark: isDarkHere(s),
            boss: !!s.boss?.active,
            speech: s.boss?.active && s.boss.phase === "speech",
          });
        }

        const next = toHud(s);
        const key = JSON.stringify(next);
        if (key !== hudKeyRef.current) {
          hudKeyRef.current = key;
          setHud(next);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // look은 그리기에만 쓰여서 다시 만들 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, playerName, practice, difficulty]);

  useEffect(() => () => stopMusic(), []);

  // 캔버스는 남는 자리에 3:4로 꽉 채운다. 크기를 JS로 재야 미니맵 탭 영역을 정확히 얹을 수 있다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      // 재료 줄(40px)은 캔버스 **바로 아래**에 붙는다. 그 몫을 빼고 캔버스 크기를 잡는다.
      // 세로 예산: 52(상단) + 520(캔버스) + 40(재료 줄) = 612 → 컨트롤에 232px 남는다.
      // 데스크톱에서는 화면 높이에 맞춰 키우되 1.6배까지만.
      const k = Math.min(
        el.clientWidth / VIEW_W,
        (el.clientHeight - INGREDIENT_ROW_H) / VIEW_H,
        1.6,
      );
      setBox({ w: Math.floor(VIEW_W * k), h: Math.floor(VIEW_H * k) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 세로 전용 — 눕히면 안내만 띄우고 게임은 멈춘다
  useEffect(() => {
    const check = () => {
      setRotate(window.innerWidth > window.innerHeight && window.innerHeight < 560);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    withState((s) => {
      s.paused = paused || rotate || goalCard;
      s.mapOpen = mapOpen;
      if (paused || rotate || mapOpen || goalCard) {
        keysRef.current = { up: false, down: false, left: false, right: false };
        setMove(s, 0, 0);
        releaseInteract(s);
      }
    });
  }, [paused, rotate, mapOpen, goalCard, withState]);

  // 클리어
  useEffect(() => {
    if (hud.phase !== "stageClear" || clearedRef.current) return;
    clearedRef.current = true;
    clearTimeRef.current = performance.now();
    stopMusic();
    playClearFanfare(hud.stars);
    const s = stateRef.current;
    if (!s) return;
    onClear({
      stageId,
      stars: hud.stars,
      score: hud.score,
      timeMs: Math.round(s.elapsed),
      menuPieces: s.gotMenus.slice(),
      // 스테이지 4에서 구출한 친구만 기록에 반영한다 (5에서는 이미 데리고 시작한다)
      friendsMet: [0, 1, 2, 3].map(
        (i) => friendsMet[i] === true || s.friends.some((f) => f.who === i && f.state === "follow"),
      ),
      foundVents: s.foundVents.slice(),
      sleeps: s.sleeps,
      goals: s.score_?.goals ?? [true, false, false],
    });
    // friendsMet은 게임을 만들 때 넘긴 값 그대로라 의존성에 넣을 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.phase, hud.stars, hud.score, stageId, onClear]);

  const doRestart = useCallback(() => {
    // 버튼을 누른 순간부터 조작 가능해지기까지 300ms 이내 — 상태만 제자리에서 리셋한다
    withState((s) => restartFromCheckpoint(s));
  }, [withState]);

  // 키보드
  useEffect(() => {
    const dirOf = (key: string): keyof typeof keysRef.current | null => {
      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          return "up";
        case "ArrowDown":
        case "s":
        case "S":
          return "down";
        case "ArrowLeft":
        case "a":
        case "A":
          return "left";
        case "ArrowRight":
        case "d":
        case "D":
          return "right";
        default:
          return null;
      }
    };

    const onDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.repeat) return;

      // 할 일 카드는 아무 키로 닫는다
      if (goalCard) {
        e.preventDefault();
        setGoalCard(false);
        playSfx("uiTap");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMapOpen(false);
        setPaused((p) => !p);
        playSfx("uiTap");
        return;
      }
      if (s.phase === "sleeping") {
        e.preventDefault();
        if (s.sleepT >= 3000) doRestart();
        else skipCutscene(s);
        return;
      }
      if (s.phase === "ritual") {
        e.preventDefault();
        skipCutscene(s);
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMapOpen((v) => !v);
        return;
      }
      if (paused || mapOpen) return;

      const dir = dirOf(e.key);
      if (dir) {
        e.preventDefault();
        keysRef.current[dir] = true;
        return;
      }
      if (e.key === " " || e.key === "e" || e.key === "E" || e.key === "Enter") {
        e.preventDefault();
        pressInteract(s);
        return;
      }
      if (e.key === "Shift") {
        e.preventDefault();
        setAim(s, null);
        throwChalk(s);
        return;
      }
      if (e.key === "q" || e.key === "Q" || e.key === "1") {
        e.preventDefault();
        placeAlarm(s);
        return;
      }
      if (e.key === "r" || e.key === "R" || e.key === "2") {
        e.preventDefault();
        setAim(s, null);
        throwPopper(s);
        return;
      }
      if (e.key === "c" || e.key === "C" || e.key === "3") {
        e.preventDefault();
        placeBanana(s);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleTorch(s);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const dir = dirOf(e.key);
      if (dir) keysRef.current[dir] = false;
      if (e.key === " " || e.key === "e" || e.key === "E" || e.key === "Enter") {
        releaseInteract(s);
      }
    };

    const onBlur = () => {
      keysRef.current = { up: false, down: false, left: false, right: false };
      const s = stateRef.current;
      if (s) {
        setMove(s, 0, 0);
        releaseInteract(s);
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mapOpen, goalCard]);

  // 마우스로 분필 던지기 — 커서 방향
  const aimFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    if (e.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / VIEW_W;
    const scale = s.stage.renderScale;
    const psx = (s.player.x - s.camera.x) * scale * k + rect.left;
    const psy = (s.player.y - s.camera.y) * scale * k + rect.top;
    setAim(s, Math.atan2(e.clientY - psy, e.clientX - psx));
  }, []);

  const clearBoard: StageScore | null = hud.scoreBoard;
  const ingredientNames = stage.ingredients;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#151129]">
      {/* 상단 띠 — 정보 3개만. 넓은 화면에서 화면 끝으로 흩어지지 않게 캔버스 폭에 맞춰 가운데 정렬한다. */}
      <div
        className="mx-auto flex h-[52px] w-full shrink-0 items-center justify-between px-3 text-white"
        style={{ maxWidth: box.w }}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] text-violet-300/70">점수</span>
          <span className="text-lg font-extrabold tabular-nums text-amber-200">
            {hud.score}
          </span>
        </div>
        {/* 구역 이름은 정적인 텍스트라 여기 있어야 한다 — 아래 띠에 두면 버튼에 밀려 잘린다 */}
        <div className="flex min-w-0 flex-col items-center leading-tight">
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-[12px] font-bold text-violet-100">
              급식표 {hud.menus}/10
            </span>
            <span className="text-[12px] font-bold text-teal-200/90">
              환풍구 {hud.vents}/8
            </span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            {/* 지금 어느 모드인지 부모가 한눈에 알아야 한다 (기록이 헷갈리지 않게) */}
            <span
              className={`rounded px-1 text-[10px] font-bold ${
                hud.difficulty === "easy"
                  ? "bg-emerald-300/25 text-emerald-200"
                  : hud.difficulty === "hard"
                    ? "bg-rose-400/25 text-rose-200"
                    : "bg-white/12 text-violet-200"
              }`}
            >
              {DIFFICULTY_LABEL[hud.difficulty]}
            </span>
            <span className="truncate text-[11px] font-bold text-amber-200/85">
              {hud.section}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              const next = !(bgmOn || sfxOn);
              onBgm(next);
              onSfx(next);
            }}
            aria-label="소리 한 번에 끄기"
          >
            <SpriteCanvas
              width={26}
              height={26}
              redraw={`${bgmOn || sfxOn}`}
              draw={(ctx, w) => drawSoundIcon(ctx, w / 2, w / 2, w * 0.9, bgmOn || sfxOn)}
            />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              setPaused(true);
            }}
            aria-label="일시정지"
          >
            <SpriteCanvas
              width={24}
              height={24}
              draw={(ctx, w) => drawPauseIcon(ctx, w / 2, w / 2, w)}
            />
          </button>
        </div>
      </div>

      {/* 게임 화면 */}
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 flex-col items-center">
        <div className="relative" style={{ width: box.w, height: box.h }}>
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            onPointerMove={aimFromEvent}
            onPointerDown={(e) => {
              const s = stateRef.current;
              if (!s) return;
              if (s.phase === "ritual") {
                skipCutscene(s);
                return;
              }
              if (s.phase === "sleeping") {
                if (s.sleepT >= 3000) doRestart();
                else skipCutscene(s);
                return;
              }
              if (e.pointerType === "mouse" && e.button === 0) {
                aimFromEvent(e);
                throwChalk(s);
              }
            }}
          />

          {/* 미니맵을 탭하면 전체 지도 + 일시정지.
              z-10: 폰에서 조이스틱 캡처 영역(왼쪽 55%, 전체 높이)이 이 위를 덮어 탭이 먹히지 않았다 */}
          <button
            className="absolute z-10 touch-none select-none"
            style={{
              left: 0,
              top: 0,
              width: ((MINIMAP_W + 16) * box.w) / VIEW_W,
              height: ((MINIMAP_H + 16) * box.h) / VIEW_H,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playSfx("uiTap");
              setMapOpen((v) => !v);
            }}
            aria-label="전체 지도 보기"
          />

        </div>

        {/* 재료 8칸 — **캔버스 바로 아래**. 화면 맨 아래에 두면 떠 있는 버튼이 덮는다 (§14-5).
            동행 친구 아이콘 줄은 삭제했다 — 친구 머리 위 아이콘이 이미 같은 정보를 준다. */}
        <div
          className="flex shrink-0 items-center justify-between gap-[2px] px-1"
          style={{ width: box.w, height: INGREDIENT_ROW_H }}
        >
          {INGREDIENTS.map((ing, i) => {
            // 아직 못 얻은 칸도 **색은 그대로** 두고 흐리게만 한다.
            const got = hud.ingredients[i];
            return (
              <div
                key={ing.name}
                className={`relative flex h-[34px] flex-1 items-center justify-center rounded-lg
                            ${got ? "border border-amber-200/50 bg-amber-200/10" : "border border-dashed border-white/30"}`}
                title={ing.name}
                style={{ opacity: got ? 1 : 0.45 }}
              >
                <SpriteCanvas
                  width={28}
                  height={28}
                  redraw={`${got}`}
                  draw={(ctx, w) => drawIngredient(ctx, w / 2, w / 2, i, 0, 20)}
                />
                {got && (
                  <span className="absolute -right-[1px] -top-[2px] text-[10px] font-bold leading-none text-emerald-300">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!paused && !rotate && !mapOpen && !goalCard && hud.phase === "playing" && (
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2"
            style={{ width: box.w }}
          >
            <TouchControls
              onMove={(x, y) =>
                withState((s) => {
                  s.padActive = x !== 0 || y !== 0;
                  setMove(s, x, y);
                })
              }
              onInteractDown={() => withState((s) => pressInteract(s))}
              onInteractUp={() => withState((s) => releaseInteract(s))}
              onChalk={() => withState((s) => throwChalk(s))}
              onAlarm={() => withState((s) => placeAlarm(s))}
              onPopper={() => withState((s) => throwPopper(s))}
              onBanana={() => withState((s) => placeBanana(s))}
              onTorch={() => withState((s) => toggleTorch(s))}
              showChalk={hud.canChalk}
              showAlarm={hud.canAlarm}
              showPopper={hud.canPopper}
              showBanana={hud.canBanana}
              showTorch={hud.canTorch}
              alarms={hud.alarms}
              poppers={hud.poppers}
              bananas={hud.bananas}
              torchOn={hud.torch}
              disabled={hud.phase !== "playing"}
            />
          </div>
        )}

        {/* 잠들었다 — 종 치고 다시! */}
        {hud.phase === "sleeping" && hud.showRestart && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
            <button
              className="pointer-events-auto rounded-3xl border-2 border-amber-200 bg-amber-300/90 px-8 py-4
                         text-xl font-extrabold text-[#2B2540] shadow-lg touch-none select-none
                         active:scale-95 bell-pop"
              onPointerDown={(e) => {
                e.preventDefault();
                playSfx("bell");
                doRestart();
              }}
            >
              종 치고 다시!
            </button>
          </div>
        )}
        {hud.phase === "sleeping" && !hud.showRestart && hud.canSkip && (
          <p className="pointer-events-none absolute inset-x-0 bottom-8 z-20 text-center text-xs text-white/60">
            아무 데나 눌러서 건너뛰기
          </p>
        )}

        {/* 전체 지도 */}
        {mapOpen && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#151129]/92 p-4">
            <h3 className="text-lg font-extrabold text-amber-200">학교 지도</h3>
            <SpriteCanvas
              width={330}
              height={330}
              animate
              draw={(ctx, w, h) => {
                const s = stateRef.current;
                if (s) drawFullMap(ctx, s, w, h);
              }}
            />
            <div className="w-full max-w-[330px]">
              <GoalList goals={hud.goals} compact />
            </div>
            <button
              className="rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-8 py-3 text-base
                         font-bold text-amber-100 touch-none select-none active:bg-amber-300/50"
              onPointerDown={(e) => {
                e.preventDefault();
                playSfx("uiBack");
                setMapOpen(false);
              }}
            >
              닫기
            </button>
          </div>
        )}

        {paused && !rotate && (
          <PauseMenu
            bgmOn={bgmOn}
            sfxOn={sfxOn}
            onBgm={onBgm}
            onSfx={onSfx}
            sectionLabel={hud.section}
            goals={hud.goals}
            onResume={() => {
              playSfx("uiTap");
              setPaused(false);
            }}
            onRestart={() => {
              setPaused(false);
              doRestart();
            }}
            onExit={() => {
              stopMusic();
              onExit();
            }}
          />
        )}

        {/* 오늘의 할 일 — 시작 전 카드. 아무 데나 눌러서 닫는다 (§16) */}
        {goalCard && !rotate && (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#151129]/92 p-6 text-center touch-none select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              setGoalCard(false);
            }}
          >
            <h2 className="text-2xl font-extrabold text-amber-200">{stage.title}</h2>
            <p className="text-sm text-violet-200/80">{stage.subtitle}</p>
            <div className="mt-1 w-full max-w-[320px] rounded-2xl border border-amber-200/30 bg-white/5 p-3">
              <GoalList goals={hud.goals} />
            </div>
            <p className="mt-2 rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-8 py-3 text-lg font-bold text-amber-100 bell-pop">
              {GOAL_TAP}
            </p>
          </div>
        )}

        {rotate && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#151129] p-6 text-center">
            <p className="text-2xl font-extrabold text-amber-200">폰을 세워 주세요</p>
            <p className="text-sm text-violet-200/80">이 게임은 세로로 하는 게 제일 재밌어!</p>
          </div>
        )}

        {/* 클리어 */}
        {hud.phase === "stageClear" && clearBoard && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-[#151129]/92 p-5 text-center">
            <h2 className="text-2xl font-extrabold text-amber-200">{stage.title} 통과!</h2>
            <SpriteCanvas
              width={220}
              height={64}
              animate
              draw={(ctx, w, h) =>
                drawStars(ctx, w, h, clearBoard.stars, performance.now() - clearTimeRef.current)
              }
            />
            <div className="w-full max-w-[300px]">
              <GoalList goals={hud.goals} title={false} compact />
              {hud.goals.every((g) => g.done) ? (
                <p className="pt-1 text-center text-sm font-extrabold text-amber-200">{GOAL_ALL}</p>
              ) : (
                <p className="pt-1 text-center text-[12px] text-violet-300/80">
                  {GOAL_NEXT}: {hud.goals.find((g) => !g.done)?.text}
                </p>
              )}
            </div>
            <div className="w-full max-w-[300px] space-y-1 text-[13px] text-violet-100">
              <Row label="재료" value={clearBoard.ingredients} />
              <Row label="급식표" value={clearBoard.menus} />
              {clearBoard.friends > 0 && <Row label="친구 구출" value={clearBoard.friends} />}
              <Row label="클리어" value={clearBoard.clear} />
              <Row label="시간 보너스" value={clearBoard.time} />
              {clearBoard.stealth > 0 && <Row label="들키지 않았어!" value={clearBoard.stealth} />}
              {clearBoard.fresh > 0 && <Row label="쌩쌩해요!" value={clearBoard.fresh} />}
              {clearBoard.nearMiss > 0 && <Row label="아슬아슬" value={clearBoard.nearMiss} />}
              {hud.scoreMult !== 1 && (
                <div className="flex justify-between text-rose-200">
                  <span>어려움 보너스</span>
                  <span className="tabular-nums">×{hud.scoreMult}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-white/20 pt-1 text-base font-extrabold text-amber-200">
                <span>합계</span>
                <span className="tabular-nums">{clearBoard.total}</span>
              </div>
              <p className="pt-1 text-xs text-violet-300/70">
                이번에 잔 횟수 {hud.sleeps}번 · 걸린 시간{" "}
                {Math.floor(hud.timeMs / 1000)}초
              </p>
              {recordToast && (
                <p className="toast-pop pt-1 text-sm font-extrabold text-teal-200">
                  {recordToast}
                </p>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {onNext && (
                <button
                  className="rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-6 py-3 text-base
                             font-bold text-amber-100 touch-none select-none active:bg-amber-300/50"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playSfx("uiTap");
                    onNext();
                  }}
                >
                  다음 스테이지
                </button>
              )}
              <button
                className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-base
                           text-violet-100 touch-none select-none active:bg-white/25"
                onPointerDown={(e) => {
                  e.preventDefault();
                  playSfx("uiBack");
                  onExit();
                }}
              >
                스테이지 고르기
              </button>
            </div>
          </div>
        )}
      </div>

      <span className="hidden">{ingredientNames.join(",")}</span>
      <span className="hidden">{COLORS.itemGlow}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-violet-200/80">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
