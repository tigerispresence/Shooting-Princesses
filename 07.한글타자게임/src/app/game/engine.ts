/**
 * 사탕비 마을 game logic (DESIGN.md §11). Mutates a RainState held in a ref.
 * No React, no drawing. Side effects (sound, stickers, end of round) are
 * reported through the `Fx` callbacks so the component decides what to do.
 */
import { compose, decomposeJamo, isPrefix, sameKeys } from "./hangul";
import { ShuffleBag, WORD_LISTS } from "./content";
import {
  CANDY_COLORS,
  CANDY_SHAPES,
  COMBO_CAP,
  FLOAT_TIME,
  GOLD_EFFECTS,
  RAIN,
  RAINBOW_WORDS,
  RAIN_LEVELS,
  RAIN_SUCCESS_HOUSE_BONUS,
  SNAIL_MUL,
  SNAIL_TIME,
  SNEEZE_PUSH,
  type GoldEffect,
} from "./constants";
import type { SfxName } from "./audio";
import type { Candy, RainState } from "./types";

export interface Fx {
  sfx: (n: SfxName) => void;
  sparkleLayer: () => void;
  /** Round over (success after the dance, fail after 1s). */
  done: (success: boolean) => void;
  nameCandy: () => void;
}

export type Measure = (text: string) => number;

const keyCache = new Map<string, string[]>();
export function wordKeys(w: string): string[] {
  let k = keyCache.get(w);
  if (!k) {
    k = decomposeJamo(w);
    keyCache.set(w, k);
  }
  return k;
}

export const houseX = (i: number) => RAIN.houseX0 + i * RAIN.houseDx;

let bags: ShuffleBag<string>[] = WORD_LISTS.map((l) => new ShuffleBag(l));

export function createRain(level: number, retry = false): RainState {
  bags = WORD_LISTS.map((l) => new ShuffleBag(l));
  const startDelay = retry ? 0 : RAIN.introTime;
  return {
    level,
    phase: "play",
    phaseT: 0,
    time: 0,
    playTime: 0,
    introT: RAIN.introTime,
    startDelay,
    candies: [],
    nextId: 1,
    spawnTimer: startDelay,
    houses: Array(RAIN.houseCount).fill(false),
    houseJump: Array(RAIN.houseCount).fill(0),
    caught: 0,
    missed: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    earned: 0,
    caughtKeys: 0,
    rainbowLeft: 0,
    slowT: 0,
    floatT: 0,
    banner: null,
    input: [],
    inputShake: 0,
    umbrella: { x: RAIN.umbrellaHomeX, from: RAIN.umbrellaHomeX, to: RAIN.umbrellaHomeX, t: 1, open: 0 },
    flyers: [],
    floats: [],
    particles: [],
    splats: [],
    ppu: { x: 640, dir: 1, sneeze: 0, speech: "", speechT: 0, heartT: 0 },
    heartsT: 0,
    bee: null,
    bigUmbrellaT: 0,
    nameCandyUsed: false,
    sparkleOn: false,
    lastEffect: null,
    endingT: 0,
  };
}

const active = (s: RainState) => s.candies.filter((c) => c.fading <= 0);

function conflicts(keys: string[], others: { keys: string[] }[]): boolean {
  for (const o of others) if (isPrefix(keys, o.keys) || isPrefix(o.keys, keys)) return true;
  return false;
}

function pickWord(s: RainState, tier: number, avoid: { keys: string[] }[]): string | null {
  return bags[tier].nextWhere((w) => !conflicts(wordKeys(w), avoid));
}

function pickTier(level: number): number {
  const mix = RAIN_LEVELS[level].mix;
  let r = Math.random() * 100;
  for (let i = 0; i < 3; i++) {
    if (r < mix[i]) return i;
    r -= mix[i];
  }
  return mix[1] ? 1 : 0;
}

function placeX(s: RainState, w: number, avoidX: number | null): number {
  const lo = RAIN.labelMinX + w / 2;
  const hi = RAIN.labelMaxX - w / 2;
  let x = lo + Math.random() * (hi - lo);
  for (let i = 0; i < RAIN.spawnRetries; i++) {
    const tooClose = s.candies.some((c) => c.y < RAIN.overlapCheckY && Math.abs(c.x - x) < (c.w + w) / 2 + 8);
    const twinBad = avoidX !== null && Math.abs(x - avoidX) < RAIN.twinMinDx;
    if (!tooClose && !twinBad) break;
    x = lo + Math.random() * (hi - lo);
  }
  if (avoidX !== null && Math.abs(x - avoidX) < RAIN.twinMinDx) {
    // force the twin to the far side
    x = avoidX < 640 ? Math.min(hi, avoidX + RAIN.twinMinDx + Math.random() * 100) : Math.max(lo, avoidX - RAIN.twinMinDx - Math.random() * 100);
  }
  return x;
}

function makeCandy(s: RainState, word: string, gold: boolean, x: number, w: number, shape: Candy["shape"], color: string): Candy {
  return {
    id: s.nextId++,
    word,
    keys: wordKeys(word),
    x,
    y: RAIN.spawnY,
    w,
    shape,
    color,
    gold,
    phase: Math.random() * Math.PI * 2,
    fading: 0,
    bornAt: s.time,
  };
}

function spawn(s: RainState, measure: Measure, fx: Fx): void {
  const lv = RAIN_LEVELS[s.level];
  const act = active(s);
  const twin = lv.twin > 0 && Math.random() < lv.twin && act.length + 2 <= lv.maxOnScreen;
  const shape = CANDY_SHAPES[Math.floor(Math.random() * CANDY_SHAPES.length)];
  const color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
  if (twin) {
    const w1 = pickWord(s, pickTier(s.level), act);
    if (!w1) return;
    const w2 = pickWord(s, pickTier(s.level), [...act, { keys: wordKeys(w1) }]);
    const lw1 = measure(w1) + RAIN.labelPad;
    const x1 = placeX(s, lw1, null);
    s.candies.push(makeCandy(s, w1, false, x1, lw1, shape, color));
    if (w2) {
      const lw2 = measure(w2) + RAIN.labelPad;
      const x2 = placeX(s, lw2, x1);
      s.candies.push(makeCandy(s, w2, false, x2, lw2, shape, color));
    }
    s.spawnTimer = lv.spawnInterval * RAIN.twinIntervalMul;
  } else {
    // The third candy of a gold level is always gold, so every kid actually meets one.
    const gold = lv.gold > 0 && (s.nextId === RAIN.guaranteedGoldId || Math.random() < lv.gold);
    const word = pickWord(s, gold ? 0 : pickTier(s.level), act);
    if (!word) return;
    const lw = measure(word) + RAIN.labelPad;
    s.candies.push(makeCandy(s, word, gold, placeX(s, lw, null), lw, shape, color));
    s.spawnTimer = lv.spawnInterval;
  }
  s.ppu.sneeze = RAIN.ppuSneeze;
  void fx;
}

function burst(s: RainState, x: number, y: number, n: number, colors: string[], speed = 120, star = false) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      life: 0.7 + Math.random() * 0.4,
      max: 1.1,
      color: colors[i % colors.length],
      size: 3 + Math.random() * 4,
      star,
    });
  }
}

function nearestHouse(x: number, filter: (i: number) => boolean): number {
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < RAIN.houseCount; i++) {
    if (!filter(i)) continue;
    const d = Math.abs(houseX(i) - x);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function catchCandy(s: RainState, c: Candy, fx: Fx, viaBig: boolean): void {
  s.candies = s.candies.filter((x) => x !== c);
  const keys = c.keys.length;
  const mult = 1 + 0.1 * Math.min(s.combo, COMBO_CAP);
  const rainbow = !viaBig && s.rainbowLeft > 0;
  let pts = 10 * keys * mult * (rainbow ? 2 : 1);
  if (viaBig) pts /= 2;
  pts = Math.round(pts);
  s.score += pts;
  s.earned += (c.gold ? 5 : 1) * (rainbow ? 2 : 1);
  if (rainbow) s.rainbowLeft--;
  s.caughtKeys += keys;
  s.caught++;
  if (!viaBig) {
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    if (s.combo === 5) speech(s, "히히!");
    if (s.combo === 10) speech(s, "우와아!");
    s.umbrella.from = s.umbrella.x;
    s.umbrella.to = c.x;
    s.umbrella.t = 0;
    s.umbrella.open = 1;
  }
  const hi = nearestHouse(c.x, () => true);
  if (hi >= 0 && Math.abs(houseX(hi) - c.x) < RAIN.houseDx / 2) s.houseJump[hi] = RAIN.houseThanks;
  s.flyers.push({ x0: c.x, y0: c.y, t: 0, color: c.gold ? "#FFD43B" : c.color, shape: c.gold ? "star" : c.shape });
  s.floats.push({ x: c.x, y: c.y - 30, text: `+${pts}`, t: RAIN.popupTime, max: RAIN.popupTime, color: rainbow ? "#C46BFF" : "#FF6F91" });
  burst(s, c.x, c.y, 10, c.gold ? ["#FFD43B", "#FFF6C8"] : [c.color, "#ffffff"]);
  fx.sfx("catch");
  if (c.gold && !viaBig) applyGold(s, fx);
  if (!s.sparkleOn && s.caught >= RAIN_LEVELS[s.level].goal / 2) {
    s.sparkleOn = true;
    fx.sparkleLayer();
  }
}

function speech(s: RainState, text: string) {
  s.ppu.speech = text;
  s.ppu.speechT = RAIN.ppuSpeech;
}

function rollEffect(): GoldEffect {
  const total = GOLD_EFFECTS.reduce((n, e) => n + e.weight, 0);
  let r = Math.random() * total;
  for (const e of GOLD_EFFECTS) {
    if (r < e.weight) return e.id;
    r -= e.weight;
  }
  return "rainbow";
}

function applyGold(s: RainState, fx: Fx): void {
  let eff = rollEffect();
  s.ppu.heartT = 1;
  fx.sfx("gold");
  if (eff === "clean") {
    const i = s.houses.findIndex((h) => h);
    if (i < 0) eff = "rainbow";
    else {
      s.houses[i] = false;
      s.bee = { t: 1.4, target: i };
      burst(s, houseX(i), RAIN.houseY - 50, 14, ["#FFE066", "#ffffff", "#9EF0D0"], 100, true);
    }
  }
  const info = GOLD_EFFECTS.find((e) => e.id === eff)!;
  s.banner = { name: info.name, desc: info.desc, t: RAIN.bannerTime };
  s.lastEffect = eff;
  switch (eff) {
    case "bigUmbrella": {
      s.bigUmbrellaT = 1.2;
      for (const c of active(s)) catchCandy(s, c, fx, true);
      break;
    }
    case "snail":
      s.slowT = SNAIL_TIME;
      break;
    case "float":
      s.floatT = FLOAT_TIME;
      break;
    case "rainbow":
      s.rainbowLeft = RAINBOW_WORDS;
      break;
    case "sneeze":
      s.ppu.sneeze = 0.6;
      for (const c of s.candies) c.y = Math.max(RAIN.spawnY, c.y - SNEEZE_PUSH);
      burst(s, s.ppu.x, 100, 40, ["#FF8FB8", "#8FD3FF", "#9EF0D0", "#C9B6FF", "#FFE066"], 260);
      break;
    default:
      break;
  }
}

function miss(s: RainState, c: Candy, fx: Fx): void {
  s.candies = s.candies.filter((x) => x !== c);
  if (c.gold) {
    burst(s, c.x, RAIN.groundY - 10, 12, ["#FFD43B", "#FFF6C8"], 90, true);
    return;
  }
  s.missed++;
  s.combo = 0;
  s.splats.push({ x: c.x, t: 0, color: c.color });
  if (s.splats.length > 12) s.splats.shift();
  const hi = nearestHouse(c.x, (i) => !s.houses[i]);
  if (hi >= 0) s.houses[hi] = true;
  fx.sfx("miss");
  if (s.houses.every((h) => h)) {
    s.phase = "fail";
    s.phaseT = 0;
    for (const x of s.candies) x.fading = 1.2;
    speech(s, "앗, 미안~ 에취!");
    s.ppu.speechT = 3;
    fx.sfx("gameover");
  }
}

function succeed(s: RainState, fx: Fx): void {
  s.phase = "success";
  s.phaseT = 0;
  for (const c of s.candies) {
    burst(s, c.x, c.y, 8, ["#ffffff", c.color], 80, true);
  }
  s.candies = [];
  s.input = [];
  const clean = s.houses.filter((h) => !h).length;
  s.score += clean * RAIN_SUCCESS_HOUSE_BONUS;
  s.earned += clean;
  fx.sfx("levelup");
}

export function cleanHouses(s: RainState): number {
  return s.houses.filter((h) => !h).length;
}

/** Advance the simulation. Not called while paused. */
export function updateRain(s: RainState, dt: number, measure: Measure, fx: Fx): void {
  s.time += dt;
  s.phaseT += dt;
  const lv = RAIN_LEVELS[s.level];

  // timers
  if (s.introT > 0) s.introT -= dt;
  if (s.inputShake > 0) s.inputShake -= dt;
  if (s.banner && (s.banner.t -= dt) <= 0) s.banner = null;
  if (s.heartsT > 0) s.heartsT -= dt;
  if (s.bigUmbrellaT > 0) s.bigUmbrellaT -= dt;
  if (s.bee && (s.bee.t -= dt) <= 0) s.bee = null;
  for (let i = 0; i < s.houseJump.length; i++) if (s.houseJump[i] > 0) s.houseJump[i] -= dt;

  // 뿌뿌 drifts
  const p = s.ppu;
  p.x += p.dir * RAIN.ppuSpeed * dt;
  if (p.x > RAIN.ppuMaxX) p.dir = -1;
  if (p.x < RAIN.ppuMinX) p.dir = 1;
  if (p.sneeze > 0) p.sneeze -= dt;
  if (p.speechT > 0) p.speechT -= dt;
  if (p.heartT > 0) p.heartT -= dt;

  // umbrella slide (0.15s) then drift home
  const u = s.umbrella;
  if (u.t < 1) {
    u.t = Math.min(1, u.t + dt / RAIN.umbrellaSlide);
    const e = 1 - (1 - u.t) * (1 - u.t);
    u.x = u.from + (u.to - u.from) * e;
  } else {
    if (u.open > 0) u.open = Math.max(0, u.open - dt * 1.4);
    else u.x += (RAIN.umbrellaHomeX - u.x) * Math.min(1, dt * 2);
  }

  // flyers → jar
  for (const f of s.flyers) {
    f.t += dt / RAIN.flyToJar;
    if (f.t >= 1 && f.t - dt / RAIN.flyToJar < 1) fx.sfx("jar");
  }
  s.flyers = s.flyers.filter((f) => f.t < 1);
  for (const f of s.floats) {
    f.t -= dt;
    f.y -= 50 * dt;
  }
  s.floats = s.floats.filter((f) => f.t > 0);
  for (const q of s.particles) {
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 220 * dt;
  }
  s.particles = s.particles.filter((q) => q.life > 0);
  for (const sp of s.splats) sp.t += dt;

  if (s.phase === "play") {
    const frozen = s.floatT > 0;
    if (s.slowT > 0) s.slowT -= dt;
    if (frozen) s.floatT -= dt;
    else s.playTime += dt;

    // spawning
    if (!frozen) {
      s.spawnTimer -= dt;
      const act = active(s);
      if (act.length === 0 && s.spawnTimer > RAIN.emptySpawnDelay && s.startDelay <= 0) s.spawnTimer = RAIN.emptySpawnDelay;
      if (s.spawnTimer <= 0) {
        s.startDelay = 0;
        if (act.length < lv.maxOnScreen) spawn(s, measure, fx);
        else s.spawnTimer = 0;
      }
    }

    // falling
    if (!frozen) {
      const v = lv.speed * (s.slowT > 0 ? SNAIL_MUL : 1);
      for (const c of s.candies) c.y += v * dt;
      for (const c of s.candies.slice()) {
        if (c.y >= RAIN.groundY && s.phase === "play") miss(s, c, fx);
      }
    }
    if (s.phase === "play" && s.caught >= lv.goal) succeed(s, fx);
  } else if (s.phase === "success") {
    if (s.phaseT >= RAIN.successDance) {
      s.phase = s.level === RAIN_LEVELS.length - 1 ? "ending" : "panel";
      s.phaseT = 0;
      fx.done(true);
    }
  } else if (s.phase === "fail") {
    for (const c of s.candies) {
      c.fading -= dt * 0.5;
      c.y += lv.speed * 0.15 * dt;
    }
    s.candies = s.candies.filter((c) => c.fading > 0);
    if (s.phaseT >= RAIN.failPanelDelay) {
      s.phase = "panel";
      s.phaseT = 0;
      fx.done(false);
    }
  } else if (s.phase === "ending") {
    s.endingT += dt;
    if (s.endingT < RAIN.endingShower && Math.random() < dt * 14) {
      const colors = ["#FF8FB8", "#8FD3FF", "#9EF0D0", "#C9B6FF", "#FFD43B"];
      s.flyers.push({
        x0: 60 + Math.random() * 1160,
        y0: 120 + Math.random() * 250,
        t: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: CANDY_SHAPES[Math.floor(Math.random() * 4)],
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Input (free mode, §2.1 / §11.2)
// ---------------------------------------------------------------------------

export function typeJamo(s: RainState, jamo: string, fx: Fx): void {
  if (s.phase !== "play") return;
  if (s.input.length >= RAIN.maxInputKeys) return;
  s.input.push(jamo);
  let best: Candy | null = null;
  for (const c of s.candies) {
    if (c.fading > 0) continue;
    if (sameKeys(s.input, c.keys) && (!best || c.y > best.y)) best = c;
  }
  if (best) {
    s.input = [];
    catchCandy(s, best, fx, false);
    if (s.phase === "play" && s.caught >= RAIN_LEVELS[s.level].goal) succeed(s, fx);
  }
}

export function backspace(s: RainState): void {
  if (s.phase !== "play") return;
  s.input.pop();
}

/** Enter / Space. */
export function submit(s: RainState, profileName: string, fx: Fx): void {
  if (s.phase !== "play" || s.input.length === 0) return;
  const text = compose(s.input);
  if (!s.nameCandyUsed && profileName && text === profileName) {
    s.nameCandyUsed = true;
    s.input = [];
    s.earned += RAIN.nameCandyBonus;
    s.flyers.push({ x0: s.umbrella.x, y0: 200, t: -1.2, color: "#FFB3D1", shape: "lolli", big: true });
    s.floats.push({ x: s.umbrella.x, y: 420, text: `${profileName} 사탕!`, t: 1.6, max: 1.6, color: "#FF6F91" });
    fx.sfx("gold");
    fx.nameCandy();
    return;
  }
  if (text === "사랑해") {
    s.heartsT = RAIN.heartsTime;
    s.input = [];
    fx.sfx("word");
    return;
  }
  s.inputShake = RAIN.inputShake;
  s.input = [];
  s.combo = 0;
  fx.sfx("wrong");
}

/** Typing-speed for the result panel (§6). */
export function rainCpm(s: RainState): number {
  if (s.playTime <= 0.5) return 0;
  return Math.round((s.caughtKeys * 60) / s.playTime);
}
