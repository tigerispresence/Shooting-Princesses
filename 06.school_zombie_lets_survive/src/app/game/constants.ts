/**
 * DESIGN.md 부록 A의 숫자를 그대로 옮긴 표 + 팔레트.
 * 여기 없는 숫자를 코드에 직접 쓰지 않는다.
 */

export const TILE = 40;

/** 논리 뷰포트 — 12 × 16 타일, 세로 3:4 */
export const VIEW_W = 480;
export const VIEW_H = 640;

export const PLAYER_SPEED = 130;

export const PLAYER_R = 13;
export const ZOMBIE_R = 14;
export const MATRON_R = 16;
export const BOSS_R = 22;

export const CATCH_DIST = 20;
export const BOSS_CATCH_DIST = 28;
export const INTERACT_DIST = 34;

/** 카메라가 따라붙는 속도 (60fps 기준) */
export const CAM_LERP = 0.15;

/** 배고픈 좀비 — 1-3 급식실 전용 */
export const HUNGRY = {
  patrol: 52,
  chase: 88,
  notice: 110,
  delay: 0.6,
  giveup: 3500,
};

/** 급식 아주머니 */
export const MATRON = {
  patrol: 62,
  chase: 104,
  notice: 130,
  delay: 0.45,
  giveup: 4500,
  /** 분필에 반응하는 시간이 짧다 */
  distractMs: 1200,
};

export const CHALK = {
  speed: 240,
  range: 200,
  noiseR: 130,
  distractMs: 2500,
  cd: 1200,
};

export const ALARM = {
  delay: 1000,
  ringMs: 4000,
  noiseR: 220,
  max: 3,
};

export const DOOR = {
  lockMs: 8000,
  castMs: 600,
  uses: 3,
};

export const DARK_VIEW_R = 150;
export const TORCH_ANGLE = (70 * Math.PI) / 180;
export const TORCH_RANGE = 260;
export const TORCH_NOTICE_MULT = 1.35;
export const DARK_EYE_GLOW_R = 26;

export const HIDE_ENTER_MS = 250;
export const HIDE_RECD_MS = 1200;
/** 숨은 채로 한 방향을 이만큼 밀고 있으면 손 버튼 없이 그쪽으로 나간다 */
export const HIDE_AIM_EXIT_MS = 450;
/** 사물함 중심에서 나가는 자리까지의 거리 (1차 시도, 2차 시도) */
export const HIDE_EXIT_DIST = [TILE * 0.95, TILE * 1.35];
export const ZOMBIE_WAIT_MS = 3500;

export const FRIEND_FOLLOW_DIST = 32;
export const FRIEND_NOTICE_MULT = 1.0;
export const FRIEND_WAKE_MS = 1000;
export const FRIEND_STALL_MS = 2000;
export const FRIEND_COUNT = 4;

export const INGREDIENT_COUNT = 8;
export const MENU_PIECE_COUNT = 10;

/** 교장 선생님 보스 사이클 (총 12200ms) */
export const BOSS = {
  walkMs: 5500,
  windupMs: 1000,
  speechMs: 3500,
  recoverMs: 2200,
  walkSpeed: 34,
  recoverSpeed: 13,
  sleepR: 200,
  expandMs: 800,
  /** 연설에 휩쓸린 일반 좀비가 멈추는 시간 */
  zombieStallMs: 3000,
};

export const BROADCAST_HOLD_MS = 3000;

/**
 * 환풍구 (DESIGN §13-1).
 * **쫓기는 중에는 절대 못 쓴다** — 그래야 사물함(쫓길 때 살아남는 곳)의 자리가 안 겹친다.
 */
export const VENT = {
  /** 진입 상호작용. 사물함(0.25초)보다 훨씬 느리다 */
  enterMs: 800,
  /** 관 속 크롤 (조작 불가) */
  crawlMs: 1200,
  /** 출구 등장 */
  exitMs: 300,
  /** 재진입 쿨다운 */
  cdMs: 2000,
  /** 나온 직후 잡히지 않는 시간 — 크롤 중 좀비가 출구에 와 있어도 `?`부터 시작한다 */
  graceMs: 600,
  /** 이 거리 안에 추격 중인 좀비가 있으면 못 들어간다 */
  blockR: 200,
  /** 전체 개수 (스테이지 1/2/2/2/1) */
  total: 8,
  score: 200,
};

/** 친구 특기 (DESIGN §13-2) — 전부 누적된다 */
export const FRIEND_POWER = {
  /** 다온 — 분필 쿨다운 */
  chalkCd: 700,
  /** 세은 — 방송 게이지 배속 */
  broadcastMult: 1.5,
  /** 하늘 — `?` 유예 추가 (스테이지 4·5) */
  noticeBonus: 0.2,
  /** 아직 못 구한 친구가 "여기야!"를 외치는 거리 */
  callR: 260,
  callMs: 2500,
  /** 미니맵에 하늘색 점으로 보이는 거리 */
  minimapR: 300,
};

export const MINIMAP_W = 132;
export const MINIMAP_H = 88;
export const MINIMAP_ZOMBIE_R = 250;
export const MINIMAP_MATRON_R = 320;

export const GAMEOVER_MS = 3000;
export const SKIP_AFTER_MS = 400;

/** 하품 소리가 들리는 거리 (미니맵보다 살짝 넓게) */
export const YAWN_HEAR_R = 260;

/** 아슬아슬 판정 */
export const NEAR_MISS_IN = 40;
export const NEAR_MISS_OUT = 70;

export const SCORE = {
  ingredient: 500,
  menu: 300,
  friend: 700,
  clear: 1000,
  timePerSec: 10,
  stealth: 400,
  fresh: 1500,
  nearMiss: 100,
};

// --- 팔레트 (graphic-designer §1) -----------------------------------------

export const COLORS = {
  corridorFloor: "#B8BEC7",
  corridorLine: "#FFD34D",
  wallTop: "#EDEFF4",
  outline: "#3B3552",
  darkOverlay: "rgba(34, 30, 62, 0.94)",
  zombieBody: "#8FA69A",
  zombieEye: "#B47CFF",
  matronApron: "#FFFFFF",
  matronScarf: "#E85D5D",
  bossSuit: "#4A5A8C",
  bossTie: "#F2C94C",
  friendGlow: "#7FD4FF",
  torch: "#FFF3D6",
  speechRing: "#FFD34D",
  itemGlow: "#FFE08A",
  menuPaper: "#FFF3C4",
  hudBack: "rgba(30,26,58,0.55)",
  alert: "#FF3B3B",
  lockerTrim: "#7FE0D0",
};

export const HAIR_COLORS = ["#3A2E2A", "#8B5E3C", "#E8785A", "#F2CB6B"];
export const CLOTH_COLORS = ["#FF8FA3", "#6EC6E8", "#A6D96A", "#C6A6E8"];
export const HAIR_NAMES = ["까만 단발", "갈색 포니테일", "다홍 트윈테일", "금발 양갈래"];
export const CLOTH_NAMES = ["코랄", "하늘", "라임", "라벤더"];

/** 장식 전용 모자. 성능에는 아무 영향이 없다. */
export const HATS = [
  { id: "ribbon", name: "리본", need: "별 5개" },
  { id: "crown", name: "왕관", need: "별 10개" },
  { id: "lunch", name: "급식 모자", need: "별 15개" },
  { id: "pudding", name: "딸기 푸딩 모자", need: "급식표 10개" },
  { id: "janitor", name: "청소부 모자", need: "환풍구 8개" },
];

export const SUGGESTED_NAMES = ["하린", "서아", "유나", "지우"];
