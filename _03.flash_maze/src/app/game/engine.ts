import { COLS, FLASH_MS, PEEK_MS, PEEKS_PER_MAZE, ROWS } from "./constants";
import { DELTA, canMove, generateMaze, idx } from "./maze";
import type { Dir, GameState } from "./types";

export function createGame(now: number): GameState {
  const maze = generateMaze(COLS, ROWS);
  const start = { c: 0, r: ROWS - 1 };
  const exit = { c: COLS - 1, r: 0 };

  return {
    maze,
    player: { ...start },
    start,
    exit,
    phase: "ready",
    phaseStart: now,
    peekUntil: 0,
    peeksLeft: PEEKS_PER_MAZE,
    moves: 0,
    bumps: 0,
    darkStart: 0,
    finishedAt: 0,
    visited: new Set([idx(maze, start.c, start.r)]),
    path: [idx(maze, start.c, start.r)],
    discovered: new Set(),
    bumpMarks: [],
  };
}

/** The maze is fully drawn during the flash, during a peek, and on the win screen. */
export function isRevealed(state: GameState, now: number): boolean {
  return (
    state.phase === "flash" || state.phase === "won" || now < state.peekUntil
  );
}

export function startFlash(state: GameState, now: number): void {
  if (state.phase !== "ready") return;
  state.phase = "flash";
  state.phaseStart = now;
}

/** Milliseconds left in the memorize phase. */
export function flashRemaining(state: GameState, now: number): number {
  if (state.phase !== "flash") return 0;
  return Math.max(0, FLASH_MS - (now - state.phaseStart));
}

export function elapsedMs(state: GameState, now: number): number {
  if (state.phase === "ready" || state.phase === "flash") return 0;
  const end = state.phase === "won" ? state.finishedAt : now;
  return Math.max(0, end - state.darkStart);
}

/** Drives phase transitions. Call once per frame before rendering. */
export function update(state: GameState, now: number): void {
  if (state.phase === "flash" && now - state.phaseStart >= FLASH_MS) {
    state.phase = "dark";
    state.phaseStart = now;
    state.darkStart = now;
  }

  // Drop bump flashes that have finished fading.
  if (state.bumpMarks.length > 0) {
    state.bumpMarks = state.bumpMarks.filter((b) => now - b.t < 1000);
  }
}

export function peek(state: GameState, now: number): void {
  if (state.phase !== "dark" || state.peeksLeft <= 0) return;
  state.peeksLeft -= 1;
  state.peekUntil = now + PEEK_MS;
}

/**
 * Attempt one grid step. Walking into a wall is not a no-op: it costs a bump
 * and permanently reveals that wall, so blundering still teaches you the maze.
 */
export function move(state: GameState, dir: Dir, now: number): void {
  if (state.phase !== "dark") return;

  const { c, r } = state.player;

  if (!canMove(state.maze, c, r, dir)) {
    state.bumps += 1;
    state.discovered.add(`${c},${r},${dir}`);
    state.bumpMarks.push({ c, r, dir, t: now });
    return;
  }

  state.player = { c: c + DELTA[dir].dc, r: r + DELTA[dir].dr };
  state.moves += 1;

  const at = idx(state.maze, state.player.c, state.player.r);
  state.visited.add(at);
  state.path.push(at);

  if (state.player.c === state.exit.c && state.player.r === state.exit.r) {
    state.phase = "won";
    state.finishedAt = now;
  }
}
