import { ALARM, BANANA, BOSS, CHALK, DARK_VIEW_R, MATRON, POPPER, TORCH_NOTICE_MULT } from "./constants";
import type { StageDef } from "./types";

/**
 * 난이도 세 단계 (DESIGN §15).
 *
 * **보통 = v0.6의 숫자 그대로.** 한 글자도 안 바뀐다.
 *
 * 설계를 지배하는 두 제약:
 * - **쉬움**: 7살이 해도 스테이지 5까지 거의 질 수 없다.
 * - **어려움**: 그래도 공정하다 — `?` 유예는 0.35초 아래로 안 내려가고,
 *   플레이어(130 px/s)는 **언제나** 가장 빠른 추격자보다 빠르다.
 */

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: "좀비가 느리고 금방 포기해요",
  normal: "원래 게임",
  hard: "빠르고 눈치가 빨라요 · 점수 ×1.5",
};

/** 가드레일 — 어떤 난이도·스테이지에서도 추격 속도가 이 값을 넘지 않는다 (플레이어 130) */
export const CHASE_SPEED_CAP = 118;
/** 가드레일 — `?` 유예의 바닥. 어려움 3~5스테이지가 정확히 여기 닿는다 */
export const NOTICE_DELAY_FLOOR = 0.35;

export function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "normal" || v === "hard";
}

export interface EnemyTuning {
  patrol: number;
  chase: number;
  notice: number;
  delay: number;
  giveup: number;
}

export interface Tuning {
  id: Difficulty;
  /** 이 스테이지의 기본 좀비 */
  basic: EnemyTuning;
  /** 급식 아주머니 */
  matron: EnemyTuning & { distractMs: number };
  /** 배고픈 좀비. `null`이면 **일반 좀비로 강등**한다 (쉬움) */
  hungry: EnemyTuning | null;
  catchDist: number;
  bossCatchDist: number;
  bossWalkSpeed: number;
  bossSleepR: number;
  broadcastHold: number;
  alarmMax: number;
  startAlarms: number;
  popperMax: number;
  startPoppers: number;
  bananaMax: number;
  startBananas: number;
  chalkCd: number;
  /** 다온이 따라올 때의 분필 쿨다운 (같은 비율로 줄인다) */
  chalkCdFast: number;
  darkViewR: number;
  torchMult: number;
  scoreMult: number;
  /** 쉬움 전용 — 시야가 끊기면 추격 즉시 해제 (§15-2) */
  dropChaseOnLos: boolean;
  /** 어려움 — 스테이지 2~5에서 일반 좀비 1마리를 배고픈 좀비로 **교체** (총 마릿수 불변) */
  swapOneHungry: boolean;
}

const cap = (v: number) => Math.min(CHASE_SPEED_CAP, Math.round(v));
const floorDelay = (v: number) => Math.max(NOTICE_DELAY_FLOOR, Math.round(v * 100) / 100);

/**
 * 스테이지 하나에 적용할 실제 숫자를 만든다.
 * 상수를 건드리지 않고 게임 인스턴스마다 값을 들고 있게 해서, 난이도를 바꿔도
 * 다른 판에 영향이 없다.
 */
export function makeTuning(diff: Difficulty, stage: StageDef): Tuning {
  const base: Tuning = {
    id: "normal",
    basic: {
      patrol: stage.patrolSpeed,
      chase: stage.chaseSpeed,
      notice: stage.noticeR,
      delay: stage.noticeDelay,
      giveup: stage.giveupMs,
    },
    matron: {
      patrol: MATRON.patrol,
      chase: MATRON.chase,
      notice: MATRON.notice,
      delay: MATRON.delay,
      giveup: MATRON.giveup,
      distractMs: MATRON.distractMs,
    },
    hungry: {
      patrol: 52,
      chase: 88,
      notice: 110,
      delay: 0.6,
      giveup: 3500,
    },
    catchDist: 20,
    bossCatchDist: 28,
    bossWalkSpeed: BOSS.walkSpeed,
    bossSleepR: BOSS.sleepR,
    broadcastHold: 3000,
    alarmMax: ALARM.max,
    startAlarms: stage.startAlarms,
    popperMax: POPPER.max,
    startPoppers: stage.startPoppers,
    bananaMax: BANANA.max,
    startBananas: stage.startBananas,
    chalkCd: CHALK.cd,
    chalkCdFast: 700,
    darkViewR: DARK_VIEW_R,
    torchMult: TORCH_NOTICE_MULT,
    scoreMult: 1,
    dropChaseOnLos: false,
    swapOneHungry: false,
  };

  if (diff === "normal") return base;

  if (diff === "easy") {
    return {
      ...base,
      id: "easy",
      basic: {
        patrol: Math.round(stage.patrolSpeed * 0.75),
        chase: cap(stage.chaseSpeed * 0.72),
        notice: Math.round(stage.noticeR * 0.75),
        delay: floorDelay(stage.noticeDelay + 0.35),
        giveup: Math.round(stage.giveupMs * 0.6),
      },
      matron: { patrol: 47, chase: 75, notice: 98, delay: MATRON.delay, giveup: Math.round(MATRON.giveup * 0.6), distractMs: MATRON.distractMs },
      // 배고픈 좀비를 없앤다 — 일반 좀비로 강등
      hungry: null,
      catchDist: 16,
      bossCatchDist: 24,
      bossWalkSpeed: 24,
      bossSleepR: 150,
      broadcastHold: 2000,
      alarmMax: 5,
      // 알람을 못 쓰는 스테이지(1·2)에는 그대로 0을 둔다
      startAlarms: stage.startAlarms === 0 ? 0 : Math.min(5, stage.startAlarms + 2),
      // 폭죽·바나나도 같은 원칙 — 아직 못 쓰는 스테이지에는 0을 둔다
      popperMax: 4,
      startPoppers: stage.startPoppers === 0 ? 0 : Math.min(4, stage.startPoppers + 1),
      bananaMax: 4,
      startBananas: stage.startBananas === 0 ? 0 : Math.min(4, stage.startBananas + 1),
      chalkCd: 800,
      chalkCdFast: Math.round((800 * 700) / 1200),
      darkViewR: 210,
      torchMult: 1.2,
      scoreMult: 1,
      dropChaseOnLos: true,
      swapOneHungry: false,
    };
  }

  return {
    ...base,
    id: "hard",
    basic: {
      patrol: Math.round(stage.patrolSpeed * 1.15),
      chase: cap(stage.chaseSpeed * 1.12),
      notice: Math.round(stage.noticeR * 1.2),
      delay: floorDelay(stage.noticeDelay - 0.15),
      giveup: Math.round(stage.giveupMs * 1.4),
    },
    matron: { patrol: 71, chase: cap(116), notice: 156, delay: MATRON.delay, giveup: Math.round(MATRON.giveup * 1.4), distractMs: MATRON.distractMs },
    hungry: { patrol: 60, chase: cap(99), notice: 132, delay: 0.6, giveup: Math.round(3500 * 1.4) },
    catchDist: 23,
    bossCatchDist: 31,
    bossWalkSpeed: 40,
    bossSleepR: 230,
    broadcastHold: 3500,
    alarmMax: 2,
    startAlarms: stage.startAlarms === 0 ? 0 : Math.max(1, stage.startAlarms - 1),
    popperMax: 2,
    startPoppers: stage.startPoppers === 0 ? 0 : Math.max(1, stage.startPoppers - 1),
    bananaMax: 2,
    startBananas: stage.startBananas === 0 ? 0 : Math.max(1, stage.startBananas - 1),
    chalkCd: 1500,
    chalkCdFast: Math.round((1500 * 700) / 1200),
    darkViewR: 120,
    torchMult: 1.45,
    scoreMult: 1.5,
    dropChaseOnLos: false,
    // 마릿수를 늘리지 않고 **교체**한다 — 맵 배치·미니맵 밀도를 다시 볼 필요가 없다
    swapOneHungry: stage.id >= 2,
  };
}
