"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_H, CANVAS_W, FLASH_MS, PEEKS_PER_MAZE } from "./constants";
import {
  createGame,
  elapsedMs,
  flashRemaining,
  move,
  peek,
  startFlash,
  update,
} from "./engine";
import { render } from "./renderer";
import TouchControls from "./TouchControls";
import type { Dir, GameState, HudState } from "./types";

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const INITIAL_HUD: HudState = {
  phase: "ready",
  countdown: Math.ceil(FLASH_MS / 1000),
  moves: 0,
  bumps: 0,
  peeksLeft: PEEKS_PER_MAZE,
  elapsedMs: 0,
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const hudRef = useRef<HudState>(INITIAL_HUD);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);

  const newMaze = useCallback(() => {
    stateRef.current = createGame(performance.now());
  }, []);

  const doMove = useCallback((dir: Dir) => {
    const s = stateRef.current;
    if (s) move(s, dir, performance.now());
  }, []);

  const doStart = useCallback(() => {
    const s = stateRef.current;
    if (s) startFlash(s, performance.now());
  }, []);

  const doPeek = useCallback(() => {
    const s = stateRef.current;
    if (s) peek(s, performance.now());
  }, []);

  // Game loop: state lives in a ref and is drawn every frame; only the small
  // HUD object crosses into React, and only when a displayed value changes.
  useEffect(() => {
    if (!stateRef.current) stateRef.current = createGame(performance.now());

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
        render(ctx, s, now);

        const next: HudState = {
          phase: s.phase,
          countdown: Math.ceil(flashRemaining(s, now) / 1000),
          moves: s.moves,
          bumps: s.bumps,
          peeksLeft: s.peeksLeft,
          elapsedMs: Math.floor(elapsedMs(s, now) / 100) * 100,
        };
        const prev = hudRef.current;
        if (
          next.phase !== prev.phase ||
          next.countdown !== prev.countdown ||
          next.moves !== prev.moves ||
          next.bumps !== prev.bumps ||
          next.peeksLeft !== prev.peeksLeft ||
          next.elapsedMs !== prev.elapsedMs
        ) {
          hudRef.current = next;
          setHud(next);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;

      const dir = KEY_DIRS[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (s.phase === "ready") doStart();
        else if (s.phase === "won") newMaze();
        return;
      }
      if (e.key === "p" || e.key === "P") doPeek();
      if (e.key === "r" || e.key === "R") newMaze();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, doStart, doPeek, newMaze]);

  // Swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    touchStart.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    doMove(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  };

  const seconds = (hud.elapsedMs / 1000).toFixed(1);

  return (
    // Short viewports (landscape phones) put the D-pad beside the maze instead
    // of below it — stacked, the controls fall off the bottom of the screen.
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-2 px-3 [@media(max-height:640px)]:max-w-none [@media(max-height:640px)]:flex-row [@media(max-height:640px)]:justify-center [@media(max-height:640px)]:gap-5">
      <div className="maze-box flex flex-col items-center gap-2">
        {/* Stats — and, during the flash, the countdown. Both live ABOVE the
            canvas: anything drawn over the maze hides walls exactly when the
            player is trying to memorize them. */}
        <div className="flex h-8 w-full items-center justify-between font-mono text-sm text-purple-200/80">
          {hud.phase === "flash" ? (
            <div className="flex w-full items-center justify-center gap-3">
              <span className="tracking-widest text-purple-100">MEMORIZE!</span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {hud.countdown}
              </span>
            </div>
          ) : (
            <>
              <span>⏱ {seconds}s</span>
              <span>👣 {hud.moves}</span>
              <span className={hud.bumps > 0 ? "text-rose-300" : ""}>
                💥 {hud.bumps}
              </span>
              <button
                onClick={doPeek}
                disabled={hud.phase !== "dark" || hud.peeksLeft <= 0}
                className="rounded-lg border border-amber-200/25 bg-amber-300/20 px-3 py-1 text-amber-100 disabled:opacity-30"
              >
                👁 Peek {hud.peeksLeft}
              </button>
            </>
          )}
        </div>

        {/* Maze */}
        <div
          className="relative w-full touch-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <canvas
            ref={canvasRef}
            style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            className="w-full rounded-2xl shadow-2xl shadow-purple-900/50"
          />

          {hud.phase === "ready" && (
            <Overlay>
              <h1 className="text-2xl font-bold text-purple-100 sm:text-3xl">
                Flash Maze
              </h1>
              <p className="max-w-[18rem] text-center text-sm text-purple-200/85 sm:text-base">
                The maze shows for <b>5 seconds</b>. Then the lights go out and
                you escape from memory.
              </p>
              <button onClick={doStart} className={BIG_BTN}>
                Start
              </button>
            </Overlay>
          )}

          {hud.phase === "won" && (
            <Overlay>
              <h2 className="text-2xl font-bold text-amber-200 sm:text-3xl">
                You escaped! 🎉
              </h2>
              <p className="text-sm text-purple-100 sm:text-base">
                {seconds}s · {hud.moves} steps · {hud.bumps} bumps
              </p>
              <button onClick={newMaze} className={BIG_BTN}>
                New maze
              </button>
            </Overlay>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <TouchControls onMove={doMove} disabled={hud.phase !== "dark"} />
        <p className="text-center text-xs text-purple-300/50 [@media(max-height:640px)]:hidden">
          Arrow keys or WASD · P to peek · R for a new maze
        </p>
      </div>
    </div>
  );
}

const BIG_BTN =
  "rounded-full bg-gradient-to-r from-pink-400 to-purple-400 px-8 py-3 " +
  "text-lg font-bold text-white shadow-lg active:scale-95 transition";

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/70 backdrop-blur-sm px-4">
      {children}
    </div>
  );
}
