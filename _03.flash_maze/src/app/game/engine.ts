import {
  CELEBRATE_MS,
  CELL,
  COLS,
  CONFETTI_COLORS,
  FLASH_MS,
  MOVE_MS,
  PAD,
  PEEK_MS,
  PEEKS_PER_MAZE,
  ROWS,
} from "./constants";
import {
  DELTA,
  canMove,
  generateMaze,
  idx,
  shortestPathLength,
} from "./maze";
import type { Confetti, Dir, GameState } from "./types";

export function createGame(now: number): GameState {
  const maze = generateMaze(COLS, ROWS);
  const start = { c: 0, r: ROWS - 1 };
  const exit = { c: COLS - 1, r: 0 };

  return {
    maze,
    player: { ...start },
    start,
    exit,
    shortest: shortestPathLength(maze, start, exit),
    phase: "ready",
    phaseStart: now,
    // Face the player on the title and memorize screens — the back of her
    // head is a poor first impression.
    facing: "down",
    visualFrom: { x: start.c, y: start.r },
    moveStart: 0,
    stepParity: 0,
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
    confetti: [],
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

/**
 * Points, higher is better. Rewards escaping fast, without groping along
 * walls, and without wandering past the direct route. Floors at zero so a
 * slow run reads as "0", never as a negative number.
 */
export function computeScore(state: GameState): number {
  if (state.phase !== "won") return 0;
  const seconds = (state.finishedAt - state.darkStart) / 1000;
  const wastedSteps = Math.max(0, state.moves - state.shortest);
  const raw = 1000 - seconds * 10 - state.bumps * 25 - wastedSteps * 5;
  return Math.max(0, Math.round(raw));
}

/** No bumps and not one wasted step — walked the only route straight through. */
export function isPerfect(state: GameState): boolean {
  return (
    state.phase === "won" &&
    state.bumps === 0 &&
    state.moves === state.shortest
  );
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
 * Where the princess actually is on screen, in float cell coordinates, plus
 * how far through her current step she is. Rendering interpolates so she
 * walks between cells instead of teleporting.
 */
export function playerVisual(
  state: GameState,
  now: number,
): { x: number; y: number; progress: number; walking: boolean } {
  const progress =
    state.moveStart === 0
      ? 1
      : Math.min(1, (now - state.moveStart) / MOVE_MS);
  // Smoothstep: eases out of the old cell and into the new one without the
  // floaty overshoot a spring would give.
  const e = progress * progress * (3 - 2 * progress);
  return {
    x: state.visualFrom.x + (state.player.c - state.visualFrom.x) * e,
    y: state.visualFrom.y + (state.player.r - state.visualFrom.y) * e,
    progress,
    walking: progress < 1,
  };
}

/**
 * Attempt one grid step. Walking into a wall is not a no-op: it costs a bump
 * and permanently reveals that wall, so blundering still teaches you the maze.
 */
export function move(state: GameState, dir: Dir, now: number): void {
  if (state.phase !== "dark") return;

  const { c, r } = state.player;
  state.facing = dir;

  if (!canMove(state.maze, c, r, dir)) {
    state.bumps += 1;
    state.discovered.add(`${c},${r},${dir}`);
    state.bumpMarks.push({ c, r, dir, t: now });
    return;
  }

  // Start the next step from wherever she is *right now*, not from the cell
  // she was leaving — otherwise mashing the D-pad makes her snap backwards.
  const here = playerVisual(state, now);
  state.visualFrom = { x: here.x, y: here.y };
  state.moveStart = now;
  state.stepParity ^= 1;

  state.player = { c: c + DELTA[dir].dc, r: r + DELTA[dir].dr };
  state.moves += 1;

  const at = idx(state.maze, state.player.c, state.player.r);
  state.visited.add(at);
  state.path.push(at);

  if (state.player.c === state.exit.c && state.player.r === state.exit.r) {
    state.phase = "won";
    state.finishedAt = now;
    // Turn to face the player so she celebrates at the camera, not away.
    state.facing = "down";
    state.confetti = spawnConfetti(state.exit.c, state.exit.r);
  }
}

/** True while the victory lap is still playing. */
export function isCelebrating(state: GameState, now: number): boolean {
  return state.phase === "won" && now - state.finishedAt < CELEBRATE_MS;
}

/** A cone of confetti launched upward and outward from the exit door. */
function spawnConfetti(exitC: number, exitR: number): Confetti[] {
  const ox = PAD + (exitC + 0.5) * CELL;
  const oy = PAD + (exitR + 0.5) * CELL;

  return Array.from({ length: 80 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
    const speed = 130 + Math.random() * 300;
    return {
      x: ox + (Math.random() - 0.5) * CELL * 0.6,
      y: oy + (Math.random() - 0.5) * CELL * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 14,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: CELL * (0.05 + Math.random() * 0.07),
      round: Math.random() < 0.35,
    };
  });
}
