import { CHARACTERS } from "./constants";

/**
 * 브라우저에 남겨 두는 것들 — 마지막에 고른 이름·캐릭터와 스테이지별 최고 기록.
 * 전부 없어도 게임은 그냥 처음부터 시작된다.
 */

const NAME_KEY = "escape:name";
const CHAR_KEY = "escape:character";
const BEST_KEY = "escape:best:";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 시크릿 모드처럼 저장이 막힌 곳에서는 그냥 넘어간다
  }
}

export function loadName(): string {
  return read(NAME_KEY) ?? "";
}

export function saveName(name: string): void {
  write(NAME_KEY, name);
}

export function loadCharacterId(): string {
  const id = read(CHAR_KEY);
  return CHARACTERS.some((c) => c.id === id) ? (id as string) : CHARACTERS[0].id;
}

export function saveCharacterId(id: string): void {
  write(CHAR_KEY, id);
}

export interface BestRecord {
  timeMs: number;
  mistakes: number;
  name: string;
}

export function loadBest(stageId: number): BestRecord | null {
  const raw = read(BEST_KEY + stageId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BestRecord;
    if (typeof parsed?.timeMs !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 더 빠른 기록일 때만 덮어쓴다. */
export function saveBest(stageId: number, record: BestRecord): boolean {
  const prev = loadBest(stageId);
  if (prev && prev.timeMs <= record.timeMs) return false;
  write(BEST_KEY + stageId, JSON.stringify(record));
  return true;
}
