export type Dir = "up" | "down" | "left" | "right";

export interface Walls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Cell {
  walls: Walls;
}

export interface Maze {
  cols: number;
  rows: number;
  /** Row-major: index = row * cols + col. Row 0 is the top row. */
  cells: Cell[];
}

export interface Pos {
  c: number;
  r: number;
}

/**
 * ready  — title card, maze hidden, waiting for the player to start
 * flash  — the whole maze is visible for a few seconds; memorize it
 * dark   — maze hidden, player navigates from memory
 * won    — reached the exit; maze and path revealed
 */
export type Phase = "ready" | "flash" | "dark" | "won";

export interface BumpMark {
  c: number;
  r: number;
  dir: Dir;
  /** timestamp of the bump, for the fade-out animation */
  t: number;
}

export interface ScoreRecord {
  name: string;
  score: number;
  timeMs: number;
  moves: number;
  bumps: number;
  /** No bumps and no wasted steps. */
  perfect: boolean;
  date: string;
}

export interface GameState {
  maze: Maze;
  player: Pos;
  start: Pos;
  exit: Pos;
  /** Fewest possible steps from start to exit, for scoring wasted moves. */
  shortest: number;
  phase: Phase;
  /** timestamp the current phase began */
  phaseStart: number;
  /** which way she is facing, for the sprite */
  facing: Dir;
  /** where the walk animation started, in float cell coordinates */
  visualFrom: { x: number; y: number };
  /** timestamp the current step began */
  moveStart: number;
  /** flips every step so the feet alternate */
  stepParity: number;
  /** peek re-flashes the maze until this timestamp */
  peekUntil: number;
  peeksLeft: number;
  moves: number;
  bumps: number;
  /** timestamp the dark phase began, for the run timer */
  darkStart: number;
  finishedAt: number;
  /** cell indices the player has stood on */
  visited: Set<number>;
  /** cell indices in visit order, for drawing the path on the win screen */
  path: number[];
  /** walls the player has bumped into, kept dimly visible: "c,r,dir" */
  discovered: Set<string>;
  /** recent bumps, drawn as a red flash that fades */
  bumpMarks: BumpMark[];
}

/** Values mirrored into React for the HUD. */
export interface HudState {
  phase: Phase;
  countdown: number;
  moves: number;
  bumps: number;
  peeksLeft: number;
  elapsedMs: number;
  score: number;
  perfect: boolean;
}
