"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setupAudioUnlock } from "./audio";
import { CANVAS_H, CANVAS_W, STAGES, TOTAL_ROOMS } from "./constants";
import type { HeroLook } from "./constants";
import {
  answerQuiz,
  closeModal,
  createGame,
  inspectAction,
  interact,
  keypadPress,
  keypadSubmit,
  resetBoxes,
  setHeld,
  startGame,
  toHud,
  update,
} from "./engine";
import InspectPanel from "./InspectPanel";
import PuzzlePanel from "./PuzzlePanel";
import { render } from "./renderer";
import { STAGE1_FALLBACK } from "./rooms";
import { saveBest } from "./storage";
import TouchControls from "./TouchControls";
import type { Dir, GameState, HudState } from "./types";

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

const INITIAL_HUD: HudState = {
  phase: "intro",
  roomIndex: 0,
  roomName: STAGE1_FALLBACK[0].name,
  hint: STAGE1_FALLBACK[0].hint,
  solved: false,
  doorOpen: false,
  elapsedMs: 0,
  mistakes: 0,
  toast: null,
  modal: null,
  canResetBoxes: false,
  foundDigits: [],
};

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  look: HeroLook;
  playerName: string;
  stageId: number;
  /** 스테이지 고르는 화면으로 돌아가기 */
  onExit: () => void;
}

export default function GameCanvas({ look, playerName, stageId, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const hudKeyRef = useRef<string>("");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);

  /** 여러 방향키를 동시에 누르고 있을 때, 마지막에 누른 쪽으로 걷는다. */
  const pressedRef = useRef<Dir[]>([]);

  const withState = useCallback((fn: (s: GameState, now: number) => void) => {
    const s = stateRef.current;
    if (s) fn(s, performance.now());
  }, []);

  const doHold = useCallback(
    (dir: Dir) => withState((s) => setHeld(s, dir)),
    [withState],
  );
  const doRelease = useCallback(() => withState((s) => setHeld(s, null)), [withState]);
  const doInteract = useCallback(() => withState((s, now) => interact(s, now)), [withState]);
  const doReset = useCallback(() => withState((s, now) => resetBoxes(s, now)), [withState]);
  const doStart = useCallback(() => withState((s, now) => startGame(s, now)), [withState]);

  const restart = useCallback(() => {
    stateRef.current = createGame(performance.now(), look, stageId);
    pressedRef.current = [];
    hudKeyRef.current = "";
  }, [look, stageId]);

  // iOS는 진짜 터치/클릭 안에서만 오디오가 열린다.
  useEffect(() => setupAudioUnlock(), []);

  // 게임 루프. 상태는 ref에만 두고, 화면에 보이는 값이 바뀔 때만 React로 넘긴다.
  useEffect(() => {
    if (!stateRef.current) stateRef.current = createGame(performance.now(), look, stageId);

    // 개발 중에만 콘솔/자동 플레이테스트에서 방 상태를 들여다볼 수 있게 열어 둔다.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__escape = stateRef;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const frame = () => {
      const now = performance.now();
      const s = stateRef.current;
      if (s) {
        update(s, now);
        render(ctx, s, dpr);
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
  }, [look, stageId]);

  // 탈출에 성공하면 기록을 남긴다
  const savedRef = useRef(false);
  useEffect(() => {
    if (hud.phase !== "stageClear") {
      savedRef.current = false;
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;
    saveBest(stageId, {
      timeMs: hud.elapsedMs,
      mistakes: hud.mistakes,
      name: playerName,
    });
  }, [hud.phase, hud.elapsedMs, hud.mistakes, stageId, playerName]);

  // 키보드
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const now = performance.now();

      if (s.modal) {
        if (e.key === "Escape") closeModal(s, now);
        else if (s.modal.kind === "inspect") {
          // Enter는 행동(불 켜기)이 있으면 그 행동, 없으면 닫기.
          // Space는 언제나 닫기 — 실수로 불을 켜 버리는 일이 없도록.
          if (e.key === "Enter" && s.modal.action) inspectAction(s, now);
          else if (e.key === " " || e.key === "Enter") closeModal(s, now);
        } else if (s.modal.kind === "keypad") {
          if (e.key === "Enter") keypadSubmit(s, now);
          else if (e.key === "Backspace") keypadPress(s, "del");
          else if (/^[0-9]$/.test(e.key)) keypadPress(s, e.key);
        } else if (/^[1-4]$/.test(e.key)) {
          answerQuiz(s, Number(e.key) - 1, now);
        }
        e.preventDefault();
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (s.phase === "intro") startGame(s, now);
        else interact(s, now);
        return;
      }

      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      e.preventDefault();
      if (!pressedRef.current.includes(dir)) pressedRef.current.push(dir);
      setHeld(s, dir);
    };

    const onUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const dir = KEY_DIRS[e.key];
      if (!s || !dir) return;
      pressedRef.current = pressedRef.current.filter((d) => d !== dir);
      setHeld(s, pressedRef.current[pressedRef.current.length - 1] ?? null);
    };

    // 탭을 벗어나면 눌린 키가 그대로 남아 혼자 걸어가는 일이 생긴다.
    const onBlur = () => {
      pressedRef.current = [];
      const s = stateRef.current;
      if (s) setHeld(s, null);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const cleared = hud.phase === "stageClear" ? TOTAL_ROOMS : hud.roomIndex;
  const stageName = STAGES.find((s) => s.id === stageId)?.name ?? "달빛 성";

  return (
    <div className="game-box mx-auto flex flex-col items-center gap-2">
      {/* 상단 바 */}
      <div className="stage-box flex items-center justify-between px-1 text-sm">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            className="shrink-0 rounded-lg px-1.5 py-0.5 text-violet-300/70 active:text-violet-100 touch-none select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              onExit();
            }}
            aria-label="스테이지 고르기로 돌아가기"
          >
            ◀
          </button>
          <span className="shrink-0">🕯️</span>
          <span className="truncate text-amber-200/90">
            {hud.phase === "stageClear" ? `${stageName} 탈출!` : hud.roomName}
          </span>
          {hud.solved && hud.phase !== "stageClear" && (
            <span className="shrink-0 text-xs text-amber-300/90">문 열림!</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_ROOMS }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < cleared
                    ? "bg-amber-300 shadow-[0_0_6px_rgba(255,209,102,0.9)]"
                    : i === cleared
                      ? "bg-violet-300/70"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <span className="tabular-nums text-violet-300/70">{formatTime(hud.elapsedMs)}</span>
        </div>
      </div>

      {/* 게임 화면 */}
      <div className="stage-box relative overflow-hidden rounded-2xl border border-violet-300/20 shadow-[0_0_30px_rgba(0,0,0,0.55)]">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {/* 말풍선 */}
        {hud.toast && hud.phase !== "stageClear" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2">
            <p
              className="toast-pop max-w-[92%] whitespace-pre-line rounded-2xl border border-amber-200/25
                         bg-black/72 px-4 py-2 text-center text-[13px] leading-snug text-amber-50 backdrop-blur"
            >
              {hud.toast}
            </p>
          </div>
        )}

        {/* 시작 화면 */}
        {hud.phase === "intro" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/72 p-4 text-center">
            <h1 className="text-2xl font-extrabold text-amber-200 drop-shadow">
              🌙 {stageName}
            </h1>
            <p className="max-w-[380px] text-sm leading-relaxed text-violet-100">
              <span className="text-amber-200">{playerName}</span>
              (이)가 다섯 개의 방을 지나 밖으로 나가야 해.
              <br />
              방마다 수수께끼가 하나씩 숨어 있어!
            </p>
            <p className="text-xs text-violet-300/80">
              방향키나 아래 버튼으로 걷고, <b className="text-amber-200">살펴보기</b>로 물건을
              조사해 봐.
            </p>
            <button
              className="mt-1 rounded-2xl border border-amber-200/50 bg-amber-300/25 px-8 py-3 text-lg
                         font-bold text-amber-100 shadow-[0_0_20px_rgba(255,209,102,0.4)]
                         active:bg-amber-300/45 touch-none select-none"
              onPointerDown={(e) => {
                e.preventDefault();
                doStart();
              }}
            >
              들어가기
            </button>
          </div>
        )}

        {/* 클리어 화면 */}
        {hud.phase === "stageClear" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center">
            <h2 className="cheer text-3xl font-extrabold text-amber-200 drop-shadow">
              탈출 성공! 🎉
            </h2>
            <p className="text-sm text-violet-100">
              <span className="text-amber-200">{playerName}</span>
              (이)가 {stageName}을 빠져나왔어. 뽀글이가 손을 흔들고 있네!
            </p>
            <div className="mt-1 flex gap-4 text-sm text-violet-200">
              <span>⏱️ {formatTime(hud.elapsedMs)}</span>
              <span>💭 틀린 횟수 {hud.mistakes}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                className="rounded-2xl border border-amber-200/50 bg-amber-300/25 px-6 py-3 text-base
                           font-bold text-amber-100 active:bg-amber-300/45 touch-none select-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  restart();
                }}
              >
                다시 도전하기
              </button>
              <button
                className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-base
                           text-violet-100 active:bg-white/25 touch-none select-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onExit();
                }}
              >
                다른 스테이지
              </button>
            </div>
          </div>
        )}

        {/* 물건을 확대해 보는 화면 */}
        {hud.modal?.kind === "inspect" && (
          <InspectPanel
            modal={hud.modal}
            onAction={() => withState((s, now) => inspectAction(s, now))}
            onClose={() => withState((s, now) => closeModal(s, now))}
          />
        )}

        {/* 수수께끼 · 숫자 자물쇠 패널 */}
        {hud.modal && hud.modal.kind !== "inspect" && (
          <PuzzlePanel
            modal={hud.modal}
            foundDigits={hud.foundDigits}
            onAnswer={(i) => withState((s, now) => answerQuiz(s, i, now))}
            onKey={(ch) => withState((s) => keypadPress(s, ch))}
            onSubmit={() => withState((s, now) => keypadSubmit(s, now))}
            onClose={() => withState((s, now) => closeModal(s, now))}
          />
        )}
      </div>

      {/* 힌트 */}
      <p className="px-3 text-center text-[13px] text-violet-200/85">
        {hud.phase === "stageClear" ? "다섯 개의 방을 모두 풀었어!" : `💡 ${hud.hint}`}
      </p>

      <TouchControls
        onHold={doHold}
        onRelease={doRelease}
        onInteract={doInteract}
        onResetBoxes={doReset}
        showReset={hud.canResetBoxes}
        disabled={hud.phase !== "playing"}
      />
    </div>
  );
}
