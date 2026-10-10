/**
 * Web Audio SFX and BGM (DESIGN.md §14 — 소리).
 *
 * Mood: 사탕비 마을 is cheerful, soft, never startling. "key" fires on every
 * keystroke, so it gets the gentlest treatment (quiet sine "tok" with a
 * touch of random pitch drift so it stays pleasant after thousands of
 * repeats). "wrong" is a soft dropping "bo-op", never a buzzer.
 *
 * Every oscillator/gain/filter created here is disconnected as soon as it
 * finishes (see `voice()`), so long play sessions never accumulate nodes.
 *
 * Public API (unchanged — callers depend on these exact names):
 *   unlockAudio()            call from inside a real click/keydown/touchend handler
 *   setMuted(bool) / isMuted()
 *   playSfx(name)
 *   startBgm({ fast }) / stopBgm() / setBgmSparkle(on)
 *
 * SSR-safe: everything no-ops without `window`.
 */

export type SfxName =
  | "key" // 맞은 키 "톡"
  | "wrong" // 틀린 키 "뽁"
  | "word" // 낱말/문장 완료 "띵동"
  | "star" // 결과 별 하나 "통"
  | "catch" // 사탕 받음 "퐁"
  | "jar" // 병에 쏙 "딸랑"
  | "miss" // 놓침 "철퍼덕"
  | "gold" // 황금 효과 실로폰
  | "levelup" // 성공 팡파레
  | "gameover" // 실패 "뿌우~"
  | "click"; // 메뉴 선택

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Must be called synchronously inside a user gesture (click / keydown / touchend). */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.setValueAtTime(m ? 0 : 1, ctx.currentTime);
}

export function isMuted(): boolean {
  return muted;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ---------------------------------------------------------------------------
// voice(): one self-cleaning oscillator. No clicks (gain always ramps from
// a near-zero floor), no leaks (disconnects everything once it ends).
// ---------------------------------------------------------------------------

interface VoiceOpts {
  type: OscillatorType;
  f0: number;
  f1?: number; // glide target; omit for a flat pitch
  dur: number; // seconds
  vol: number; // peak linear gain (keep moderate: 0.02–0.12)
  delay?: number; // seconds from now
  dest?: AudioNode | null;
  filterHz?: number; // optional lowpass to round off harsh edges
  attack?: number; // seconds; defaults to a soft ~8ms (never an instant pop)
}

function voice(opts: VoiceOpts): void {
  const dest = opts.dest ?? master;
  if (!ctx || !dest) return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const attack = opts.attack ?? Math.min(0.008, opts.dur / 3);

  const o = ctx.createOscillator();
  o.type = opts.type;
  o.frequency.setValueAtTime(Math.max(1, opts.f0), t);
  if (opts.f1 !== undefined && opts.f1 !== opts.f0) {
    o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), t + opts.dur);
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0005, opts.vol), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);

  let filter: BiquadFilterNode | null = null;
  if (opts.filterHz) {
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = opts.filterHz;
    filter.Q.value = 0.6;
    o.connect(filter);
    filter.connect(g);
  } else {
    o.connect(g);
  }
  g.connect(dest);

  const stopAt = t + opts.dur + 0.03;
  o.start(t);
  o.stop(stopAt);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
    filter?.disconnect();
  };
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

// ---------------------------------------------------------------------------
// SFX bodies
// ---------------------------------------------------------------------------

const SFX: Record<SfxName, () => void> = {
  // "톡" — the most frequent sound in the whole game (every correct key).
  // Plain sine (no harsh harmonics), very quiet, tiny random pitch drift so
  // 1000 repeats in a row still feel light instead of grating.
  key: () => {
    const f0 = rand(1080, 1220);
    voice({ type: "sine", f0, f1: f0 * 0.82, dur: 0.026, vol: 0.045, attack: 0.002 });
  },
  // "뽁" — gentle, rounded "bo-op". Never square/sawtooth, never loud.
  wrong: () => {
    const f0 = rand(300, 330);
    voice({ type: "sine", f0, f1: f0 * 0.68, dur: 0.1, vol: 0.05, attack: 0.01, filterHz: 1400 });
  },
  word: () => {
    voice({ type: "sine", f0: NOTE(84), dur: 0.09, vol: 0.06 });
    voice({ type: "sine", f0: NOTE(88), dur: 0.1, vol: 0.06, delay: 0.08 });
  },
  star: () => voice({ type: "triangle", f0: NOTE(72), dur: 0.12, vol: 0.09, filterHz: 3200 }),
  catch: () => voice({ type: "sine", f0: 600, f1: 1200, dur: 0.08, vol: 0.08 }),
  jar: () => {
    voice({ type: "sine", f0: 1500, f1: 1800, dur: 0.04, vol: 0.05 });
    voice({ type: "sine", f0: 2200, dur: 0.03, vol: 0.02, delay: 0.015 });
  },
  // "철퍼덕" — a soft splat, muffled by a lowpass so it stays funny, not harsh.
  miss: () => voice({ type: "sine", f0: 500, f1: 300, dur: 0.2, vol: 0.07, attack: 0.015, filterHz: 900 }),
  gold: () => {
    [79, 84, 88].forEach((n, i) =>
      voice({ type: "triangle", f0: NOTE(n), dur: 0.14, vol: 0.09, delay: i * 0.09, filterHz: 5200 }),
    );
  },
  levelup: () => {
    [72, 76, 79, 84, 88].forEach((n, i) =>
      voice({ type: "square", f0: NOTE(n), dur: i === 4 ? 0.4 : 0.14, vol: 0.045, delay: i * 0.13, filterHz: 4200 }),
    );
  },
  gameover: () => voice({ type: "triangle", f0: 400, f1: 250, dur: 0.4, vol: 0.08, filterHz: 2600 }),
  click: () => voice({ type: "sine", f0: 660, f1: 760, dur: 0.05, vol: 0.05 }),
};

export function playSfx(name: SfxName): void {
  if (muted) return;
  const c = ensure();
  if (!c || c.state !== "running") return;
  SFX[name]();
}

// ---------------------------------------------------------------------------
// BGM: cheerful 4-bar pentatonic loop for 사탕비 마을 (lookahead scheduler).
// Normal BPM 96 (DESIGN.md §14); `fast` (stages 11–12) bumps it to 104.
// A sparkle layer can be switched on mid-stage once 50% of the goal is hit.
// ---------------------------------------------------------------------------

// C major pentatonic (C D E G A), 8th notes, 4 bars × 8 steps = 32 (0 = rest).
// Bars 1–2 climb playfully, bar 3 reaches up to C6 for a bright "candy" lift,
// bar 4 glides back down to loop smoothly.
const MELODY = [
  72, 74, 76, 79, 76, 74, 72, 0,
  74, 76, 79, 81, 79, 76, 74, 0,
  76, 79, 81, 84, 81, 79, 76, 0,
  74, 72, 69, 0, 72, 74, 76, 0,
];
// One root per half-bar (8 halves across 4 bars): I – V – vi – IV, a bright,
// friendly progression.
const BASS = [48, 48, 43, 43, 45, 45, 41, 41];
// Sparse twinkly top layer, one bar long, repeats every bar once switched on.
const SPARKLE = [0, 88, 0, 0, 91, 0, 84, 0];

let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmGain: GainNode | null = null;
let step = 0;
let nextTime = 0;
let stepDur = 0.3125;
let sparkle = false;

export function startBgm(opts: { fast?: boolean } = {}): void {
  const c = ensure();
  if (!c || !master) return;
  stopBgm();
  const bpm = opts.fast ? 104 : 96;
  stepDur = 60 / bpm / 2;
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.45;
  bgmGain.connect(master);
  step = 0;
  nextTime = c.currentTime + 0.1;
  sparkle = false;
  bgmTimer = setInterval(schedule, 50);
}

function schedule() {
  if (!ctx || !bgmGain) return;
  while (nextTime < ctx.currentTime + 0.2) {
    const delay = Math.max(0, nextTime - ctx.currentTime);
    const s = step % 32;
    const m = MELODY[s];
    if (m) voice({ type: "square", f0: NOTE(m), dur: stepDur * 0.85, vol: 0.05, delay, dest: bgmGain, filterHz: 3600 });
    if (s % 4 === 0) {
      const b = BASS[Math.floor(s / 4)];
      voice({ type: "triangle", f0: NOTE(b), dur: stepDur * 3.6, vol: 0.07, delay, dest: bgmGain });
    }
    if (sparkle) {
      const sp = SPARKLE[s % 8];
      if (sp) voice({ type: "sine", f0: NOTE(sp), dur: 0.09, vol: 0.025, delay, dest: bgmGain });
    }
    nextTime += stepDur;
    step++;
  }
}

export function setBgmSparkle(on: boolean): void {
  sparkle = on;
}

export function stopBgm(): void {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
  if (bgmGain && ctx) {
    const g = bgmGain;
    const c = ctx;
    g.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
    setTimeout(() => g.disconnect(), 400);
  }
  bgmGain = null;
}
