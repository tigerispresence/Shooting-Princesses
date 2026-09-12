import type { Look } from "./types";

/**
 * 저장되는 건 전부 localStorage 키 하나에 담긴 JSON 하나다.
 * 저장이 막힌 곳(시크릿 모드 등)에서도 게임은 그냥 처음부터 돌아간다.
 */

const KEY = "zombie-school:v1";

export interface SaveData {
  name: string;
  look: Look;
  unlockedStage: number;
  stars: number[];
  best: number[];
  menuPieces: boolean[];
  friendsMet: boolean[];
  sleepCount: number;
  unlockedHats: string[];
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
    best: [0, 0, 0, 0, 0],
    menuPieces: new Array(10).fill(false),
    friendsMet: [false, false, false, false],
    sleepCount: 0,
    unlockedHats: [],
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
      best: fixArray(parsed.best, 5, 0),
      menuPieces: fixArray(parsed.menuPieces, 10, false),
      friendsMet: fixArray(parsed.friendsMet, 4, false),
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
  data.unlockedHats = [...hats];
  return data;
}
