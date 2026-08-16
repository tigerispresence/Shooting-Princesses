/** Small starter maze — big enough to be a real memory test, small enough to be fair. */
export const COLS = 7;
export const ROWS = 7;

export const CELL = 72;
export const PAD = 18;
export const WALL_W = 6;

export const CANVAS_W = COLS * CELL + PAD * 2;
export const CANVAS_H = ROWS * CELL + PAD * 2;

/** How long the whole maze stays on screen before the lights go out. */
export const FLASH_MS = 5000;

/**
 * How long the princess takes to walk one cell. Short on purpose — kids mash
 * the D-pad, and anything slower than this starts to feel like input lag.
 */
export const MOVE_MS = 130;

/** A peek re-flashes the maze briefly. */
export const PEEK_MS = 1000;
export const PEEKS_PER_MAZE = 1;

/** How long a bumped wall glows red before fading to "discovered" dim. */
export const BUMP_FADE_MS = 700;

/**
 * The victory lap: confetti, bursts and a cheering princess play for this long
 * before the results panel slides in, so the win gets a moment of its own.
 */
export const CELEBRATE_MS = 2000;

/** Downward acceleration for confetti, in canvas px per second squared. */
export const CONFETTI_GRAVITY = 520;

export const CONFETTI_COLORS = [
  "#ff8fba",
  "#ffd166",
  "#7ee8fa",
  "#c77dff",
  "#8affc1",
  "#fff0f6",
];

export const COLORS = {
  bg0: "#231045",
  bg1: "#12061f",
  floor: "rgba(255, 255, 255, 0.035)",
  wall: "#c77dff",
  wallGlow: "#e0aaff",
  wallDim: "rgba(199, 125, 255, 0.32)",
  bump: "#ff4d6d",
  trail: "rgba(224, 170, 255, 0.13)",
  trailEdge: "rgba(224, 170, 255, 0.28)",
  exit: "#ffd166",
  exitGlow: "#fff3c4",
  start: "#8affc1",
  dress: "#ffa6c9",
  dressMid: "#ff7fae",
  dressDark: "#d9548a",
  dressTrim: "#fff0f6",
  bodice: "#e85f96",
  sash: "#ffd166",
  gem: "#7ee8fa",
  skin: "#ffe0c9",
  blush: "rgba(255, 130, 160, 0.5)",
  hair: "#6b3f24",
  hairLight: "#8d5a34",
  crown: "#ffd166",
  shoe: "#ffd166",
  path: "rgba(255, 209, 102, 0.75)",
} as const;
