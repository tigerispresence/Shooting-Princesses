import { isDifficulty } from "./difficulty";
import type { Difficulty } from "./difficulty";
import type { Look } from "./types";

/**
 * 저장되는 건 전부 localStorage 키 하나에 담긴 JSON 하나다.
 * 저장이 막힌 곳(시크릿 모드 등)에서도 게임은 그냥 처음부터 돌아간다.
 */

const KEY = "zombie-school:v1";

/** 이름별 기록. 진행도(해금·별·급식표·환풍구)는 그대로 하나를 공유한다 — 프로필 시스템이 아니다. */
export interface NameRecord {
  best: number[];
  bestTimeMs: number[];
}

/**
 * 난이도별 기록 + 그 이름이 마지막에 쓰던 난이도.
 * `lastDifficulty`가 핵심이다 — 자매가 번갈아 할 때 이름만 고르면 각자의 난이도로 맞춰진다.
 */
export interface NameRecords {
  lastDifficulty: Difficulty;
  easy: NameRecord;
  normal: NameRecord;
  hard: NameRecord;
}

export interface SaveData {
  name: string;
  look: Look;
  unlockedStage: number;
  stars: number[];
  /** 스테이지별 달성한 목표 비트(1 클리어 / 2 급식표 / 4 도전). 별 = 켜진 비트 수 (DESIGN §16) */
  goals: number[];
  best: number[];
  menuPieces: boolean[];
  friendsMet: boolean[];
  sleepCount: number;
  unlockedHats: string[];
  /** 찾은 환풍구 8칸 (한 번 찾으면 영원히) */
  vents: boolean[];
  /** 지금 고른 난이도. 없으면 보통 */
  difficulty: Difficulty;
  /** 이름별·난이도별 최고 점수·최단 시간 */
  records: Record<string, NameRecords>;
  /** 기록판에 보여 줄 최근 이름 (최신 순) */
  recentNames: string[];
  bgmOn: boolean;
  sfxOn: boolean;
  /** 엔딩을 본 적이 있는가 (연습 모드 해금) */
  ending: boolean;
}

export function emptySave(): SaveData {
  return {
    name: "",
    look: { hair: 0, cloth: 0, hat: null },
    unlockedStage: 1,
    stars: [0, 0, 0, 0, 0],
    goals: [0, 0, 0, 0, 0],
    best: [0, 0, 0, 0, 0],
    menuPieces: new Array(10).fill(false),
    friendsMet: [false, false, false, false],
    sleepCount: 0,
    unlockedHats: [],
    vents: new Array(8).fill(false),
    difficulty: "normal",
    records: {},
    recentNames: [],
    bgmOn: true,
    sfxOn: true,
    ending: false,
  };
}

export function load(): SaveData {
  const base = emptySave();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...base,
      ...parsed,
      look: { ...base.look, ...(parsed.look ?? {}) },
      stars: fixArray(parsed.stars, 5, 0),
      goals: migrateGoals(fixArray(parsed.goals, 5, 0), fixArray(parsed.stars, 5, 0)),
      best: fixArray(parsed.best, 5, 0),
      menuPieces: fixArray(parsed.menuPieces, 10, false),
      friendsMet: fixArray(parsed.friendsMet, 4, false),
      vents: fixArray(parsed.vents, 8, false),
      difficulty: isDifficulty(parsed.difficulty) ? parsed.difficulty : "normal",
      records: normalizeRecords(parsed.records),
      recentNames: Array.isArray(parsed.recentNames)
        ? parsed.recentNames.filter((n): n is string => typeof n === "string")
        : [],
      unlockedHats: Array.isArray(parsed.unlockedHats) ? parsed.unlockedHats : [],
    };
  } catch {
    return base;
  }
}

/**
 * 길이를 맞추고 타입을 되돌린다.
 * 예전 저장본에 `null`이 섞여 있을 수 있어서(친구 없는 스테이지에서 생겼던 버그)
 * 빈 값은 전부 기본값으로 되돌린다.
 */
function fixArray<T>(value: unknown, len: number, fallback: T): T[] {
  const out = new Array<T>(len).fill(fallback);
  if (Array.isArray(value)) {
    for (let i = 0; i < len; i++) {
      const v = value[i];
      if (v === undefined || v === null) continue;
      if (typeof fallback === "boolean") out[i] = (v === true) as unknown as T;
      else if (typeof fallback === "number") out[i] = (Number(v) || 0) as unknown as T;
      else out[i] = v as T;
    }
  }
  return out;
}

function emptyRecord(): NameRecord {
  return { best: [0, 0, 0, 0, 0], bestTimeMs: [0, 0, 0, 0, 0] };
}

export function emptyNameRecords(): NameRecords {
  return {
    lastDifficulty: "normal",
    easy: emptyRecord(),
    normal: emptyRecord(),
    hard: emptyRecord(),
  };
}

function oneRecord(value: unknown): NameRecord {
  const r = (value ?? {}) as Partial<NameRecord>;
  return { best: fixArray(r.best, 5, 0), bestTimeMs: fixArray(r.bestTimeMs, 5, 0) };
}

/**
 * 난이도가 생기기 전(v2)의 기록은 `best`/`bestTimeMs`가 최상위에 있었다.
 * 그건 전부 **보통**의 기록이다 — 그대로 `normal` 칸으로 옮긴다. 아무것도 잃지 않는다.
 */
function normalizeRecords(value: unknown): Record<string, NameRecords> {
  const out: Record<string, NameRecords> = {};
  if (!value || typeof value !== "object") return out;
  for (const [name, rec] of Object.entries(value as Record<string, unknown>)) {
    const r = (rec ?? {}) as Record<string, unknown>;
    const legacy = Array.isArray(r.best) || Array.isArray(r.bestTimeMs);
    out[name] = {
      lastDifficulty: isDifficulty(r.lastDifficulty) ? r.lastDifficulty : "normal",
      easy: oneRecord(r.easy),
      normal: legacy ? oneRecord(r) : oneRecord(r.normal),
      hard: oneRecord(r.hard),
    };
  }
  return out;
}

/** 이름 하나의 난이도별 기록 묶음 */
export function recordsFor(data: SaveData, name: string): NameRecords {
  return data.records[name] ?? emptyNameRecords();
}

/** 이름 + 난이도 한 칸 */
export function recordFor(data: SaveData, name: string, diff: Difficulty): NameRecord {
  return recordsFor(data, name)[diff];
}

export function save(data: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장이 막혀 있어도 게임은 계속 돌아간다
  }
}

/** 별 총합으로 열리는 모자를 계산해 채워 넣는다. */
export function refreshHats(data: SaveData): SaveData {
  const total = data.stars.reduce((a, b) => a + b, 0);
  const hats = new Set(data.unlockedHats);
  if (total >= 5) hats.add("ribbon");
  if (total >= 10) hats.add("crown");
  if (total >= 15) hats.add("lunch");
  if (data.menuPieces.every(Boolean)) hats.add("pudding");
  if (data.vents.every(Boolean)) hats.add("janitor");
  data.unlockedHats = [...hats];
  return data;
}

/** 목표 비트 → 별 개수. 옛 세이브의 별은 그대로 존중한다(내려가지 않는다) */
export function starsOf(goalBits: number, oldStars: number): number {
  let n = 0;
  for (let b = 0; b < 3; b++) if (goalBits & (1 << b)) n++;
  return Math.max(n, oldStars);
}

/** 목표별 달성 여부 3칸 */
export function goalFlags(goalBits: number): boolean[] {
  return [0, 1, 2].map((b) => (goalBits & (1 << b)) !== 0);
}

/**
 * §16 이전 세이브 이관: 별만 있고 목표 비트가 없으면 별에서 거꾸로 채운다.
 * 옛 ★ = 클리어, ★★ = 급식표까지. 옛 ★★★(안 자기)은 새 도전과 다르므로 비트는 안 켜고 별 수만 지킨다.
 */
function migrateGoals(goals: number[], stars: number[]): number[] {
  return goals.map((g, i) => {
    if (g !== 0 || stars[i] <= 0) return g;
    return stars[i] >= 2 ? 3 : 1;
  });
}
