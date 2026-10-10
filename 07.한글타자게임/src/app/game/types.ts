import type { CandyShape, GoldEffect } from "./constants";

/** One falling candy. `y` is the label centre. */
export interface Candy {
  id: number;
  word: string;
  keys: string[];
  x: number;
  y: number;
  w: number; // label width
  shape: CandyShape;
  color: string;
  gold: boolean;
  phase: number; // sway phase
  fading: number; // >0 while vanishing (seconds left)
  bornAt: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  t: number; // seconds left
  max: number;
  color: string;
}

export interface Flyer {
  x0: number;
  y0: number;
  t: number; // 0..1 progress
  color: string;
  shape: CandyShape | "star";
  big?: boolean; // name lollipop
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  star?: boolean;
}

export interface Splat {
  x: number;
  t: number;
  color: string;
}

export type RainPhase = "play" | "success" | "fail" | "panel" | "ending";

export interface RainState {
  level: number;
  phase: RainPhase;
  phaseT: number; // seconds in current phase
  time: number; // total sim time (for animation)
  playTime: number; // counted time for CPM (excludes float)
  introT: number; // seconds left showing the level banner
  startDelay: number; // seconds before the first candy
  candies: Candy[];
  nextId: number;
  spawnTimer: number;
  houses: boolean[]; // true = sticky
  houseJump: number[]; // thanks-jump timers
  caught: number;
  missed: number;
  score: number;
  combo: number;
  maxCombo: number;
  earned: number; // candies (currency) this round
  caughtKeys: number;
  rainbowLeft: number;
  slowT: number;
  floatT: number;
  banner: { name: string; desc: string; t: number } | null;
  input: string[];
  inputShake: number;
  umbrella: { x: number; from: number; to: number; t: number; open: number };
  flyers: Flyer[];
  floats: FloatText[];
  particles: Particle[];
  splats: Splat[];
  ppu: { x: number; dir: 1 | -1; sneeze: number; speech: string; speechT: number; heartT: number };
  heartsT: number;
  bee: { t: number; target: number } | null;
  bigUmbrellaT: number;
  nameCandyUsed: boolean;
  sparkleOn: boolean;
  lastEffect: GoldEffect | null;
  endingT: number;
}
