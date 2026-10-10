/**
 * Every tunable number from DESIGN.md lives here so playtesting only touches this file.
 */

export const STAGE_W = 1280;
export const STAGE_H = 720;
export const MIN_W = 1024;
export const MIN_H = 576;

export const FONT_STACK = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

// ---------------------------------------------------------------------------
// Fingers (§15.1)
// ---------------------------------------------------------------------------

export type Finger = "lp" | "lr" | "lm" | "li" | "lt" | "rt" | "ri" | "rm" | "rr" | "rp";

export const FINGER_ORDER: Finger[] = ["lp", "lr", "lm", "li", "lt", "rt", "ri", "rm", "rr", "rp"];

export const FINGER_COLOR: Record<Finger, string> = {
  lp: "#FF8FB8",
  lr: "#FFB86B",
  lm: "#FFE066",
  li: "#8EE6A0",
  lt: "#C9B6FF",
  rt: "#C9B6FF",
  ri: "#7CC8FF",
  rm: "#FFE066",
  rr: "#FFB86B",
  rp: "#FF8FB8",
};

export const FINGER_SHORT: Record<Finger, string> = {
  lp: "새끼", lr: "약지", lm: "중지", li: "검지", lt: "엄지",
  rt: "엄지", ri: "검지", rm: "중지", rr: "약지", rp: "새끼",
};

export const FINGER_FULL: Record<Finger, string> = {
  lp: "왼손 새끼", lr: "왼손 약지", lm: "왼손 중지", li: "왼손 검지", lt: "엄지",
  rt: "엄지", ri: "오른손 검지", rm: "오른손 중지", rr: "오른손 약지", rp: "오른손 새끼",
};

const F = (f: Finger, codes: string[]) => codes.map((c) => [c, f] as const);
export const CODE_FINGER: Record<string, Finger> = Object.fromEntries([
  ...F("lp", ["Backquote", "Digit1", "KeyQ", "KeyA", "KeyZ", "ShiftLeft", "Tab", "CapsLock"]),
  ...F("lr", ["Digit2", "KeyW", "KeyS", "KeyX"]),
  ...F("lm", ["Digit3", "KeyE", "KeyD", "KeyC"]),
  ...F("li", ["Digit4", "Digit5", "KeyR", "KeyT", "KeyF", "KeyG", "KeyV", "KeyB"]),
  ...F("ri", ["Digit6", "Digit7", "KeyY", "KeyU", "KeyH", "KeyJ", "KeyN", "KeyM"]),
  ...F("rm", ["Digit8", "KeyI", "KeyK", "Comma"]),
  ...F("rr", ["Digit9", "KeyO", "KeyL", "Period"]),
  ...F("rp", ["Digit0", "Minus", "Equal", "KeyP", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Slash", "ShiftRight", "Enter", "Backspace"]),
  ...F("rt", ["Space"]),
]);

export const isLeftHand = (code: string) => {
  const f = CODE_FINGER[code];
  return f === "lp" || f === "lr" || f === "lm" || f === "li";
};

// ---------------------------------------------------------------------------
// Practice (§4.2, §6–§10)
// ---------------------------------------------------------------------------

export const KEY_U = 58;
export const KEY_GAP = 6;
export const KEY_PULSE_PERIOD_MS = 800;
export const KEY_PRESS_MS = 120;
export const KEY_WRONG_MS = 200;
export const WRONG_SHAKE_MS = 150;
export const WRONG_PINK = "#FFC2D1";

export const CPM_REFRESH_MS = 500;
export const CPM_HIDE_FIRST_MS = 3000;
export const SAME_CHAR_MISS_HINT = 3;
export const SHIFT_MISS_HINT = 2;

export const JARI_LINE_FLASH_MS = 300;
export const SENTENCE_FLASH_MS = 400;
export const RAINBOW_WAVE_MS = 800;

export const JARI_STAR_ACC = [85, 95, 98]; // ★, ★★, ★★★
export const WORD_COUNT = 15;
export const WORD_STAR_ACC = [90, 95]; // ★★, ★★★
export const WORD_STAR3_CPM = [60, 70, 70];
export const SENTENCE_COUNT = 5;
export const SENTENCE_STAR_ACC = [90, 95];
export const SENTENCE_STAR3_CPM = 80;
export const PRACTICE_CANDY_PER_STAR = 3;

export const PASS_LINES = ["멋져요!", "손가락이 척척!", "타닥타닥 달인!"];
export const RETRY_LINE = "조금만 더! 한 번 더 해 볼까요?";

// ---------------------------------------------------------------------------
// 사탕비 마을 (§4.4, §11)
// ---------------------------------------------------------------------------

export const RAIN = {
  hudH: 56,
  spawnY: 110,
  groundY: 590,
  labelMinX: 60,
  labelMaxX: 1220,
  labelH: 46,
  labelPad: 28,
  labelFont: 30,
  candyArt: 34,
  overlapCheckY: 200,
  spawnRetries: 8,
  emptySpawnDelay: 0.8,
  twinMinDx: 300,
  twinIntervalMul: 1.6,
  swayDeg: 6,
  swayPeriod: 2,
  maxInputKeys: 14,
  houseCount: 8,
  houseX0: 80,
  houseDx: 160,
  houseW: 120,
  houseY: 590,
  umbrellaY: 560,
  umbrellaHomeX: 640,
  umbrellaSlide: 0.15,
  umbrellaW: 90,
  flyToJar: 0.4,
  popupTime: 0.6,
  inputShake: 0.15,
  ppuW: 220,
  ppuMinX: 200,
  ppuMaxX: 1080,
  ppuSpeed: 18,
  ppuSneeze: 0.3,
  ppuSpeech: 1,
  introTime: 0.8,
  bannerTime: 1.5,
  houseThanks: 0.5,
  successDance: 1.5,
  failPanelDelay: 1.0,
  failEnterDelay: 1.5,
  successEnterDelay: 0.5,
  guaranteedGoldId: 3,
  inputX: 640,
  inputY: 690,
  inputW: 420,
  inputH: 44,
  inputFont: 30,
  heartsTime: 1,
  endingShower: 5,
  endingBonus: 50,
  nameCandyBonus: 3,
} as const;

export const CANDY_COLORS = ["#8FD3FF", "#C9B6FF", "#9EF0D0", "#FFB3D1"];
export const GOLD = "#FFD43B";
export type CandyShape = "ball" | "lolli" | "bear" | "caramel";
export const CANDY_SHAPES: CandyShape[] = ["ball", "lolli", "bear", "caramel"];

export interface RainLevel {
  bg: number; // index into RAIN_BACKGROUNDS
  feature: string;
  speed: number;
  spawnInterval: number;
  maxOnScreen: number;
  goal: number;
  mix: [number, number, number]; // easy / normal / hard %
  gold: number;
  twin: number;
}

export const RAIN_BACKGROUNDS = [
  "아침 쿠키 마을",
  "젤리 언덕",
  "무지개 사탕길",
  "초콜릿 강",
  "마카롱 정원",
  "노을 푸딩 호수",
  "별빛 쿠키 마을",
];

export const RAIN_LEVELS: RainLevel[] = [
  { bg: 0, feature: "쉬운 낱말 사탕", speed: 26, spawnInterval: 6.0, maxOnScreen: 3, goal: 10, mix: [100, 0, 0], gold: 0, twin: 0 },
  { bg: 0, feature: "연습", speed: 29, spawnInterval: 5.5, maxOnScreen: 3, goal: 12, mix: [100, 0, 0], gold: 0, twin: 0 },
  { bg: 1, feature: "황금 별사탕", speed: 31, spawnInterval: 5.2, maxOnScreen: 4, goal: 12, mix: [100, 0, 0], gold: 0.15, twin: 0 },
  { bg: 1, feature: "연습", speed: 34, spawnInterval: 4.8, maxOnScreen: 4, goal: 14, mix: [100, 0, 0], gold: 0.12, twin: 0 },
  { bg: 2, feature: "쉬어 가기", speed: 28, spawnInterval: 5.6, maxOnScreen: 4, goal: 10, mix: [100, 0, 0], gold: 0.3, twin: 0 },
  { bg: 3, feature: "받침 있는 낱말", speed: 32, spawnInterval: 6.0, maxOnScreen: 4, goal: 14, mix: [40, 60, 0], gold: 0.12, twin: 0 },
  { bg: 3, feature: "연습", speed: 35, spawnInterval: 5.6, maxOnScreen: 5, goal: 16, mix: [30, 70, 0], gold: 0.12, twin: 0 },
  { bg: 4, feature: "쌍둥이 사탕", speed: 37, spawnInterval: 5.4, maxOnScreen: 5, goal: 16, mix: [30, 70, 0], gold: 0.12, twin: 0.25 },
  { bg: 4, feature: "연습", speed: 40, spawnInterval: 5.2, maxOnScreen: 6, goal: 18, mix: [20, 80, 0], gold: 0.12, twin: 0.3 },
  { bg: 5, feature: "쉬어 가기", speed: 33, spawnInterval: 5.8, maxOnScreen: 5, goal: 12, mix: [50, 50, 0], gold: 0.3, twin: 0.15 },
  { bg: 6, feature: "어려운 낱말", speed: 36, spawnInterval: 6.0, maxOnScreen: 6, goal: 16, mix: [0, 60, 40], gold: 0.12, twin: 0.15 },
  { bg: 6, feature: "모두 섞기", speed: 42, spawnInterval: 5.0, maxOnScreen: 6, goal: 20, mix: [10, 50, 40], gold: 0.12, twin: 0.3 },
];

export const RAIN_STAR_MISSES = [7, 4, 1]; // ★ ≤7, ★★ ≤4, ★★★ ≤1
export const RAIN_SUCCESS_HOUSE_BONUS = 50;
export const COMBO_SHOW = 5;
export const COMBO_CAP = 10;
export const RAIN_BPM = 96;
export const RAIN_BPM_FAST = 104;

export type GoldEffect = "bigUmbrella" | "snail" | "float" | "clean" | "rainbow" | "sneeze";
export const GOLD_EFFECTS: { id: GoldEffect; weight: number; name: string; desc: string }[] = [
  { id: "bigUmbrella", weight: 20, name: "커다란 우산", desc: "하늘의 사탕을 한꺼번에 받아요!" },
  { id: "snail", weight: 18, name: "느릿느릿 달팽이", desc: "사탕이 천천히 떨어져요" },
  { id: "float", weight: 18, name: "사탕 둥실", desc: "풍선이 사탕을 잡아 줘요" },
  { id: "clean", weight: 16, name: "쿠키 집 청소", desc: "꿀벌이 집을 깨끗하게!" },
  { id: "rainbow", weight: 14, name: "무지개 두 배", desc: "다음 낱말 5개는 두 배!" },
  { id: "sneeze", weight: 14, name: "뿌뿌 에취쇼", desc: "에취! 사탕이 위로 휘익~" },
];
export const SNAIL_TIME = 6;
export const SNAIL_MUL = 0.5;
export const FLOAT_TIME = 4;
export const RAINBOW_WORDS = 5;
export const SNEEZE_PUSH = 80;

export const FAIL_LINES = ["또 해 볼까?", "내일은 더 많이 받을 수 있어!"];

// ---------------------------------------------------------------------------
// Profiles, shop, family jar, stickers (§12)
// ---------------------------------------------------------------------------

export const MAX_PROFILES = 4;
export const NAME_MAX_CHARS = 5;
export const AVATARS = ["토끼", "고양이", "강아지", "곰", "펭귄", "다람쥐"];
export const PROFILE_COLORS = ["#FF8FB8", "#FFB86B", "#8EE6A0", "#7CC8FF", "#C9B6FF", "#FFE066"];

export const UMBRELLAS = [
  { name: "분홍 우산", price: 0 },
  { name: "하늘 우산", price: 30 },
  { name: "레몬 우산", price: 30 },
  { name: "민트 우산", price: 30 },
  { name: "보라 우산", price: 60 },
  { name: "땡땡이 우산", price: 100 },
  { name: "딸기 무늬 우산", price: 150 },
  { name: "무지개 우산", price: 300 },
  { name: "금빛 우산", price: -1 }, // family-jar reward (§12.5), never sold
];
export const GOLDEN_UMBRELLA = 8;

export const HOUSES = [
  { name: "생강 쿠키 집", price: 0 },
  { name: "초코칩 쿠키 집", price: 80 },
  { name: "마카롱 지붕 집", price: 150 },
  { name: "케이크 성", price: 400 },
];

export const FAMILY_MILESTONES = [
  { at: 500, name: "무지개 다리", line: "무지개 다리가 생겼어요" },
  { at: 1500, name: "사탕 회전목마", line: "사탕 회전목마가 생겼어요" },
  { at: 3000, name: "사탕 불꽃놀이", line: "성공하면 사탕 불꽃놀이가 터져요" },
  { at: 6000, name: "금빛 우산", line: "모두에게 금빛 우산이 생겼어요" },
];
export const FAMILY_CARD_MS = 1500;
export const STICKER_CARD_MS = 1200;

export const STICKERS: { id: number; name: string; hint: string; hidden?: boolean }[] = [
  { id: 1, name: "첫 발자국", hint: "자리연습 1단계 통과" },
  { id: 2, name: "자리 박사", hint: "자리연습 8단계 모두 통과" },
  { id: 3, name: "반짝 손가락", hint: "자리연습 8단계 모두 ★★★" },
  { id: 4, name: "낱말 새싹", hint: "낱말연습 한 판 끝까지" },
  { id: 5, name: "쉬움 별", hint: "낱말 쉬움 ★★★" },
  { id: 6, name: "보통 별", hint: "낱말 보통 ★★★" },
  { id: 7, name: "어려움 별", hint: "낱말 어려움 ★★★" },
  { id: 8, name: "글 쓰는 아이", hint: "짧은 글 한 판 끝까지" },
  { id: 9, name: "문장 별", hint: "짧은 글 ★★★" },
  { id: 10, name: "50타", hint: "낱말이나 짧은 글 50타 넘기" },
  { id: 11, name: "100타", hint: "낱말이나 짧은 글 100타 넘기" },
  { id: 12, name: "150타", hint: "낱말이나 짧은 글 150타 넘기" },
  { id: 13, name: "200타", hint: "낱말이나 짧은 글 200타 넘기" },
  { id: 14, name: "오타 제로", hint: "낱말이나 짧은 글을 정확도 100%로" },
  { id: 15, name: "우산 친구", hint: "사탕비 1단계 성공" },
  { id: 16, name: "무지개 사탕길", hint: "사탕비 5단계 성공" },
  { id: 17, name: "푸딩 호수", hint: "사탕비 10단계 성공" },
  { id: 18, name: "쿠키 마을 영웅", hint: "사탕비 12단계 성공" },
  { id: 19, name: "콤보 20", hint: "사탕비 한 판에서 콤보 20" },
  { id: 20, name: "한 집도 안 끈적", hint: "사탕비 6단계 이상을 하나도 안 놓치고 성공" },
  { id: 21, name: "천 번 타닥", hint: "맞게 친 키 1,000번" },
  { id: 22, name: "만 번 타닥", hint: "맞게 친 키 10,000번" },
  { id: 23, name: "사흘 연속", hint: "3일 연속 연습" },
  { id: 24, name: "첫 꾸미기", hint: "꾸미기 가게에서 처음 사기" },
  { id: 25, name: "뿌뿌 친구", hint: "뿌뿌의 이름을 불러 볼까?", hidden: true },
  { id: 26, name: "내 이름 사탕", hint: "사탕에 내 이름을 써 볼까?", hidden: true },
];

export const STORAGE_KEY = "tadak.v1";
export const RECENT_KEEP = 20;
export const DAILY_KEEP_DAYS = 14;
export const WEEKLY_KEEP = 8;
export const TOTAL_STARS = 72;
