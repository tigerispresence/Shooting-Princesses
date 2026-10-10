/**
 * Save data (DESIGN.md §12.8) and every rule that turns a finished round into
 * stars, candies, stickers and records. Pure functions over a cloned Save.
 */
import {
  DAILY_KEEP_DAYS,
  FAMILY_MILESTONES,
  GOLDEN_UMBRELLA,
  HOUSES,
  JARI_STAR_ACC,
  PRACTICE_CANDY_PER_STAR,
  RECENT_KEEP,
  SENTENCE_STAR3_CPM,
  SENTENCE_STAR_ACC,
  STORAGE_KEY,
  UMBRELLAS,
  WEEKLY_KEEP,
  WORD_STAR3_CPM,
  WORD_STAR_ACC,
  RAIN_STAR_MISSES,
} from "./constants";

export type Avatar = 0 | 1 | 2 | 3 | 4 | 5;

export interface Profile {
  id: string;
  name: string;
  avatar: Avatar;
  color: Avatar;
  createdAt: number;
  showKeyHint: boolean;
  candies: number;
  owned: { umbrella: number[]; house: number[] };
  equipped: { umbrella: number; house: number };
  stars: { jari: number[]; word: number[]; sentence: number; rain: number[] };
  best: { jariAcc: number[]; wordCpm: number[]; sentenceCpm: number; rainScore: number[]; rainLevel: number };
  weeklyWordBest: { [monday: string]: number };
  recentCpm: { [key: string]: number[] };
  stickers: { id: number; at: number; seen: boolean }[];
  totalKeys: number;
  daily: { [day: string]: number };
  streak: { last: string; days: number };
}

export interface Save {
  version: 1;
  lastProfileId: string | null;
  sound: boolean;
  familyCandies: number;
  profiles: Profile[];
}

export function newSave(): Save {
  return { version: 1, lastProfileId: null, sound: true, familyCandies: 0, profiles: [] };
}

export function newProfile(name: string, avatar: Avatar, color: Avatar): Profile {
  return {
    id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name,
    avatar,
    color,
    createdAt: Date.now(),
    showKeyHint: true,
    candies: 0,
    owned: { umbrella: [0], house: [0] },
    equipped: { umbrella: 0, house: 0 },
    stars: { jari: Array(8).fill(0), word: Array(3).fill(0), sentence: 0, rain: Array(12).fill(0) },
    best: { jariAcc: Array(8).fill(0), wordCpm: Array(3).fill(0), sentenceCpm: 0, rainScore: Array(12).fill(0), rainLevel: 0 },
    weeklyWordBest: {},
    recentCpm: {},
    stickers: [],
    totalKeys: 0,
    daily: {},
    streak: { last: "", days: 0 },
  };
}

/** Fill in any field missing from an older/hand-edited save so the app never crashes. */
function repairProfile(p: Partial<Profile>): Profile {
  const base = newProfile(p.name ?? "친구", (p.avatar ?? 0) as Avatar, (p.color ?? 0) as Avatar);
  const out: Profile = { ...base, ...p } as Profile;
  out.owned = { ...base.owned, ...(p.owned ?? {}) };
  out.equipped = { ...base.equipped, ...(p.equipped ?? {}) };
  out.stars = { ...base.stars, ...(p.stars ?? {}) };
  out.best = { ...base.best, ...(p.best ?? {}) };
  return out;
}

export function loadSave(): Save {
  if (typeof window === "undefined") return newSave();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return newSave();
    const s = JSON.parse(raw) as Partial<Save>;
    if (!s || s.version !== 1 || !Array.isArray(s.profiles)) return newSave();
    return {
      version: 1,
      lastProfileId: s.lastProfileId ?? null,
      sound: s.sound !== false,
      familyCandies: Number(s.familyCandies) || 0,
      profiles: s.profiles.map(repairProfile),
    };
  } catch {
    return newSave();
  }
}

export function writeSave(s: Save): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage full or blocked — the game keeps running
  }
}

// ---------------------------------------------------------------------------
// Dates (local)
// ---------------------------------------------------------------------------

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function mondayOf(d: Date = new Date()): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // Mon = 0
  out.setDate(out.getDate() - dow);
  return out;
}

export function weekDays(d: Date = new Date()): string[] {
  const m = mondayOf(d);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(m);
    x.setDate(m.getDate() + i);
    out.push(dayKey(x));
  }
  return out;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function totalStars(p: Profile): number {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return sum(p.stars.jari) + sum(p.stars.word) + p.stars.sentence + sum(p.stars.rain);
}

export function hasSticker(p: Profile, id: number): boolean {
  return p.stickers.some((s) => s.id === id);
}

export function streakDays(p: Profile): number {
  if (p.streak.last === dayKey() || p.streak.last === yesterdayKey()) return p.streak.days;
  return 0;
}

export function familyMilestoneReached(s: Save, i: number): boolean {
  return s.familyCandies >= FAMILY_MILESTONES[i].at;
}

export function ownsUmbrella(s: Save, p: Profile, i: number): boolean {
  if (i === GOLDEN_UMBRELLA) return s.familyCandies >= FAMILY_MILESTONES[3].at;
  return p.owned.umbrella.includes(i);
}

/** Cheapest decoration the profile hasn't bought yet, or null if they own everything. */
export function cheapestUnowned(p: Profile): { name: string; price: number } | null {
  const items = [
    ...UMBRELLAS.map((u, i) => ({ ...u, owned: p.owned.umbrella.includes(i) })),
    ...HOUSES.map((h, i) => ({ ...h, owned: p.owned.house.includes(i) })),
  ].filter((x) => !x.owned && x.price > 0);
  if (!items.length) return null;
  items.sort((a, b) => a.price - b.price);
  return { name: items[0].name, price: items[0].price };
}

export function wordWeeklyGain(p: Profile): number | null {
  const thisMon = dayKey(mondayOf());
  const cur = p.weeklyWordBest[thisMon] ?? 0;
  const prevKeys = Object.keys(p.weeklyWordBest).filter((k) => k < thisMon);
  if (!prevKeys.length) return null;
  const prev = Math.max(...prevKeys.map((k) => p.weeklyWordBest[k]));
  return cur - prev;
}

export function todayFamilyKeys(s: Save): number {
  const t = dayKey();
  return s.profiles.reduce((n, p) => n + (p.daily[t] ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Applying results
// ---------------------------------------------------------------------------

export interface Outcome {
  newStickers: number[];
  candies: number;
  familyUnlocks: number[]; // indices into FAMILY_MILESTONES
  newRecord: boolean;
}

function grant(p: Profile, id: number, out: number[]) {
  if (hasSticker(p, id)) return;
  p.stickers.push({ id, at: Date.now(), seen: false });
  out.push(id);
}

function pushRecent(p: Profile, key: string, cpm: number) {
  const arr = (p.recentCpm[key] ??= []);
  arr.push(cpm);
  while (arr.length > RECENT_KEEP) arr.shift();
}

function trimDaily(p: Profile) {
  const keys = Object.keys(p.daily).sort();
  while (keys.length > DAILY_KEEP_DAYS) delete p.daily[keys.shift() as string];
  const w = Object.keys(p.weeklyWordBest).sort();
  while (w.length > WEEKLY_KEEP) delete p.weeklyWordBest[w.shift() as string];
}

/** Count a finished round: keys, daily, streak, and the generic stickers. */
function finishRound(p: Profile, correctKeys: number, stickers: number[]) {
  const t = dayKey();
  p.totalKeys += correctKeys;
  p.daily[t] = (p.daily[t] ?? 0) + correctKeys;
  if (p.streak.last !== t) {
    p.streak.days = p.streak.last === yesterdayKey() ? p.streak.days + 1 : 1;
    p.streak.last = t;
  }
  trimDaily(p);
  if (p.totalKeys >= 1000) grant(p, 21, stickers);
  if (p.totalKeys >= 10000) grant(p, 22, stickers);
  if (p.streak.days >= 3) grant(p, 23, stickers);
}

function addCandies(s: Save, p: Profile, n: number, unlocks: number[]) {
  if (n <= 0) return;
  const before = s.familyCandies;
  p.candies += n;
  s.familyCandies += n;
  FAMILY_MILESTONES.forEach((m, i) => {
    if (before < m.at && s.familyCandies >= m.at) unlocks.push(i);
  });
}

export type PracticeMode = "jari" | "word" | "sentence";

export interface PracticeStats {
  mode: PracticeMode;
  level: number; // jari 0–7, word 0–2, sentence 0
  correct: number;
  wrong: number;
  seconds: number;
  cpm: number;
  acc: number;
  missedKeys: Record<string, number>; // expected jamo → miss count
}

export function practiceStars(st: PracticeStats): number {
  if (st.mode === "jari") {
    if (st.acc >= JARI_STAR_ACC[2]) return 3;
    if (st.acc >= JARI_STAR_ACC[1]) return 2;
    if (st.acc >= JARI_STAR_ACC[0]) return 1;
    return 0;
  }
  const accs = st.mode === "word" ? WORD_STAR_ACC : SENTENCE_STAR_ACC;
  const cpm3 = st.mode === "word" ? WORD_STAR3_CPM[st.level] : SENTENCE_STAR3_CPM;
  if (st.acc >= accs[1] && st.cpm >= cpm3) return 3;
  if (st.acc >= accs[0]) return 2;
  return 1;
}

export function recentKey(mode: PracticeMode | "rain", level: number): string {
  return mode === "sentence" ? "sentence" : `${mode}-${level + 1}`;
}

export function applyPractice(s: Save, profileId: string, st: PracticeStats): Outcome & { stars: number } {
  const p = s.profiles.find((x) => x.id === profileId);
  const out: Outcome & { stars: number } = { newStickers: [], candies: 0, familyUnlocks: [], newRecord: false, stars: 0 };
  if (!p) return out;
  const stars = practiceStars(st);
  out.stars = stars;
  const rk = recentKey(st.mode, st.level);
  const prevRecent = p.recentCpm[rk] ?? [];

  if (st.mode === "jari") {
    out.newRecord = prevRecent.length > 0 && st.cpm > Math.max(...prevRecent);
    p.stars.jari[st.level] = Math.max(p.stars.jari[st.level], stars);
    p.best.jariAcc[st.level] = Math.max(p.best.jariAcc[st.level], st.acc);
    if (st.level === 0 && stars > 0) grant(p, 1, out.newStickers);
    if (p.stars.jari.every((x) => x > 0)) grant(p, 2, out.newStickers);
    if (p.stars.jari.every((x) => x === 3)) grant(p, 3, out.newStickers);
  } else if (st.mode === "word") {
    out.newRecord = p.best.wordCpm[st.level] > 0 && st.cpm > p.best.wordCpm[st.level];
    p.stars.word[st.level] = Math.max(p.stars.word[st.level], stars);
    p.best.wordCpm[st.level] = Math.max(p.best.wordCpm[st.level], st.cpm);
    const mon = dayKey(mondayOf());
    p.weeklyWordBest[mon] = Math.max(p.weeklyWordBest[mon] ?? 0, st.cpm);
    grant(p, 4, out.newStickers);
    if (stars === 3) grant(p, 5 + st.level, out.newStickers);
  } else {
    out.newRecord = p.best.sentenceCpm > 0 && st.cpm > p.best.sentenceCpm;
    p.stars.sentence = Math.max(p.stars.sentence, stars);
    p.best.sentenceCpm = Math.max(p.best.sentenceCpm, st.cpm);
    grant(p, 8, out.newStickers);
    if (stars === 3) grant(p, 9, out.newStickers);
  }
  if (st.mode !== "jari") {
    if (st.cpm >= 50) grant(p, 10, out.newStickers);
    if (st.cpm >= 100) grant(p, 11, out.newStickers);
    if (st.cpm >= 150) grant(p, 12, out.newStickers);
    if (st.cpm >= 200) grant(p, 13, out.newStickers);
    if (st.wrong === 0) grant(p, 14, out.newStickers);
  }
  pushRecent(p, rk, st.cpm);
  finishRound(p, st.correct, out.newStickers);
  out.candies = Math.min(9, stars * PRACTICE_CANDY_PER_STAR);
  addCandies(s, p, out.candies, out.familyUnlocks);
  return out;
}

export interface RainStats {
  level: number; // 0–11
  success: boolean;
  score: number;
  candies: number; // earned this round (already includes success bonus)
  missed: number;
  maxCombo: number;
  cpm: number;
  keys: number; // keys of caught words
  completed: boolean; // false if the player quit from pause
}

export function rainStars(missed: number): number {
  if (missed <= RAIN_STAR_MISSES[2]) return 3;
  if (missed <= RAIN_STAR_MISSES[1]) return 2;
  return 1; // a success always earns at least ★ so the next level opens
}

export function applyRain(s: Save, profileId: string, st: RainStats): Outcome & { stars: number; prevBest: number } {
  const p = s.profiles.find((x) => x.id === profileId);
  const out = { newStickers: [] as number[], candies: 0, familyUnlocks: [] as number[], newRecord: false, stars: 0, prevBest: 0 };
  if (!p) return out;
  out.prevBest = p.best.rainScore[st.level];
  if (st.completed) {
    out.newRecord = st.score > out.prevBest && out.prevBest > 0;
    p.best.rainScore[st.level] = Math.max(p.best.rainScore[st.level], st.score);
    pushRecent(p, recentKey("rain", st.level), st.cpm);
    if (st.success) {
      out.stars = rainStars(st.missed);
      p.stars.rain[st.level] = Math.max(p.stars.rain[st.level], out.stars);
      p.best.rainLevel = Math.max(p.best.rainLevel, st.level + 1);
      if (st.level === 0) grant(p, 15, out.newStickers);
      if (st.level === 4) grant(p, 16, out.newStickers);
      if (st.level === 9) grant(p, 17, out.newStickers);
      if (st.level === 11) grant(p, 18, out.newStickers);
      if (st.level >= 5 && st.missed === 0) grant(p, 20, out.newStickers);
    }
    if (st.maxCombo >= 20) grant(p, 19, out.newStickers);
    finishRound(p, st.keys, out.newStickers);
  }
  out.candies = st.candies;
  addCandies(s, p, st.candies, out.familyUnlocks);
  return out;
}

/** Grant a one-off sticker (hidden ones). Returns true if it was new. */
export function grantSticker(s: Save, profileId: string, id: number): boolean {
  const p = s.profiles.find((x) => x.id === profileId);
  if (!p || hasSticker(p, id)) return false;
  p.stickers.push({ id, at: Date.now(), seen: false });
  return true;
}

export function addBonusCandies(s: Save, profileId: string, n: number): number[] {
  const p = s.profiles.find((x) => x.id === profileId);
  const unlocks: number[] = [];
  if (p) addCandies(s, p, n, unlocks);
  return unlocks;
}

export function buyItem(s: Save, profileId: string, kind: "umbrella" | "house", idx: number): number[] {
  const p = s.profiles.find((x) => x.id === profileId);
  const stickers: number[] = [];
  if (!p) return stickers;
  const price = kind === "umbrella" ? UMBRELLAS[idx].price : HOUSES[idx].price;
  if (price < 0 || p.candies < price || p.owned[kind].includes(idx)) return stickers;
  p.candies -= price;
  p.owned[kind].push(idx);
  p.equipped[kind] = idx;
  grant(p, 24, stickers);
  return stickers;
}

