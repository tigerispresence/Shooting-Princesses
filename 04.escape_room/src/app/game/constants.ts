import type { PropArt, ThemeKey } from "./types";

/** 방 하나의 크기. 모든 방이 같은 격자를 쓴다. */
export const COLS = 15;
export const ROWS = 11;
export const TILE = 40;

export const CANVAS_W = COLS * TILE;
export const CANVAS_H = ROWS * TILE;

/** 한 칸 걸어가는 데 걸리는 시간. 아이들이 연타해도 답답하지 않을 만큼 짧게. */
export const MOVE_MS = 145;

/** 말풍선이 화면에 남아 있는 시간 */
export const TOAST_MS = 2600;

/** 문이 열리고 다음 방으로 넘어가기 전 잠깐 뜸 들이는 시간 */
export const ROOM_CLEAR_MS = 1400;

/** 종 하나가 울리는 시간 / 종 사이 간격 */
export const BELL_ON_MS = 420;
export const BELL_GAP_MS = 180;
/** 시범 연주를 시작하기 전 뜸 들이는 시간 */
export const BELL_LEAD_MS = 700;

export const STAGE_NAME = "달빛 성";
export const TOTAL_ROOMS = 5;

/** 방마다 다른 색. 같은 성이지만 방마다 공기가 달라야 한다. */
/** 바닥에 까는 재질 */
export type FloorStyle =
  | "stone"
  | "plank"
  | "plated"
  | "marble"
  | "shingle"
  | "water"
  | "ice"
  | "grass";

/** 벽을 쌓는 방식 */
export type WallStyle = "brick" | "plate" | "glass" | "battlement" | "hedge";

/** 방 한가운데 큼직하게 깔리는 무늬 */
export type FloorDecor =
  | "none"
  | "carpet"
  | "rug"
  | "clock"
  | "starmark"
  | "ridge"
  | "ripple"
  | "vines";

export interface Theme {
  /** 배경 그라데이션 위/아래 */
  bgTop: string;
  bgBottom: string;
  floor: string;
  floorAlt: string;
  /** 바닥 격자선 */
  grid: string;
  wall: string;
  wallTop: string;
  wallEdge: string;
  accent: string;
  accentSoft: string;
  /** 방 전체에 깔리는 어둠. 0이면 밝은 방. */
  gloom: number;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  decor: FloorDecor;
  /** 귀퉁이에 거미줄을 칠지 */
  cobwebs?: boolean;
}

export const THEMES: Record<ThemeKey, Theme> = {
  hall: {
    bgTop: "#241436",
    bgBottom: "#140a20",
    floor: "#4a3660",
    floorAlt: "#412e54",
    grid: "rgba(255,255,255,0.05)",
    wall: "#4a3560",
    wallTop: "#6a4b86",
    wallEdge: "#2a1c3c",
    accent: "#ffd166",
    accentSoft: "rgba(255,209,102,0.25)",
    gloom: 0.2,
    floorStyle: "stone",
    wallStyle: "brick",
    decor: "carpet",
    cobwebs: true,
  },
  library: {
    bgTop: "#2b1c30",
    bgBottom: "#180f1d",
    floor: "#5b402f",
    floorAlt: "#513829",
    grid: "rgba(255,220,180,0.05)",
    wall: "#5a3d2c",
    wallTop: "#7b5539",
    wallEdge: "#301f16",
    accent: "#9be7ff",
    accentSoft: "rgba(155,231,255,0.22)",
    gloom: 0.18,
    floorStyle: "plank",
    wallStyle: "brick",
    decor: "rug",
    cobwebs: true,
  },
  clock: {
    bgTop: "#152436",
    bgBottom: "#0b1420",
    floor: "#374b64",
    floorAlt: "#31435a",
    grid: "rgba(180,220,255,0.06)",
    wall: "#3a4f68",
    wallTop: "#546f8c",
    wallEdge: "#1b2836",
    accent: "#ffb703",
    accentSoft: "rgba(255,183,3,0.24)",
    gloom: 0.16,
    floorStyle: "plated",
    wallStyle: "plate",
    decor: "clock",
  },
  mirror: {
    bgTop: "#1d2b3a",
    bgBottom: "#101822",
    floor: "#44586e",
    floorAlt: "#3d5065",
    grid: "rgba(220,240,255,0.07)",
    wall: "#455a70",
    wallTop: "#63809b",
    wallEdge: "#22303e",
    accent: "#c8b6ff",
    accentSoft: "rgba(200,182,255,0.25)",
    gloom: 0.14,
    floorStyle: "marble",
    wallStyle: "glass",
    decor: "starmark",
  },
  rooftop: {
    bgTop: "#1b1746",
    bgBottom: "#0a0820",
    floor: "#3a3570",
    floorAlt: "#332e64",
    grid: "rgba(200,200,255,0.07)",
    wall: "#3c3672",
    wallTop: "#564e97",
    wallEdge: "#1a1740",
    accent: "#fff3c4",
    accentSoft: "rgba(255,243,196,0.3)",
    gloom: 0.12,
    floorStyle: "shingle",
    wallStyle: "battlement",
    decor: "ridge",
  },

  // --- 2. 잠긴 지하 감옥 ---------------------------------------------------
  cell: {
    bgTop: "#1c2230", bgBottom: "#0b0e16",
    floor: "#3a4250", floorAlt: "#333a47", grid: "rgba(200,220,255,0.05)",
    wall: "#454e5e", wallTop: "#606b7e", wallEdge: "#20252f",
    accent: "#9fd6ff", accentSoft: "rgba(159,214,255,0.22)", gloom: 0.22,
    floorStyle: "plated", wallStyle: "plate", decor: "none", cobwebs: true,
  },
  guard: {
    bgTop: "#2b2418", bgBottom: "#14100a",
    floor: "#57452f", floorAlt: "#4d3d2a", grid: "rgba(255,230,180,0.05)",
    wall: "#5c4a33", wallTop: "#7c6444", wallEdge: "#2e2418",
    accent: "#ffc65c", accentSoft: "rgba(255,198,92,0.22)", gloom: 0.2,
    floorStyle: "plank", wallStyle: "brick", decor: "rug", cobwebs: true,
  },
  storage: {
    bgTop: "#241d2c", bgBottom: "#100c15",
    floor: "#4a3f55", floorAlt: "#42384c", grid: "rgba(230,220,255,0.05)",
    wall: "#544868", wallTop: "#6e6087", wallEdge: "#281f33",
    accent: "#ffb703", accentSoft: "rgba(255,183,3,0.22)", gloom: 0.24,
    floorStyle: "stone", wallStyle: "brick", decor: "none", cobwebs: true,
  },
  sewer: {
    bgTop: "#16241f", bgBottom: "#080f0c",
    floor: "#2f4a3f", floorAlt: "#294038", grid: "rgba(160,255,210,0.05)",
    wall: "#3b5648", wallTop: "#527560", wallEdge: "#1b2a23",
    accent: "#7ef0b0", accentSoft: "rgba(126,240,176,0.22)", gloom: 0.26,
    floorStyle: "water", wallStyle: "brick", decor: "ripple",
  },
  belfry: {
    bgTop: "#241a2e", bgBottom: "#0f0a15",
    floor: "#4c3f5c", floorAlt: "#443853", grid: "rgba(230,220,255,0.06)",
    wall: "#5a4c6e", wallTop: "#77678f", wallEdge: "#2a2135",
    accent: "#ffd166", accentSoft: "rgba(255,209,102,0.24)", gloom: 0.2,
    floorStyle: "stone", wallStyle: "battlement", decor: "clock",
  },

  // --- 3. 물에 잠긴 서고 ---------------------------------------------------
  shallow: {
    bgTop: "#123044", bgBottom: "#07161f",
    floor: "#2b5468", floorAlt: "#264a5d", grid: "rgba(180,240,255,0.07)",
    wall: "#37627a", wallTop: "#4e8299", wallEdge: "#1a3441",
    accent: "#7ee8fa", accentSoft: "rgba(126,232,250,0.24)", gloom: 0.16,
    floorStyle: "water", wallStyle: "brick", decor: "ripple",
  },
  wetShelf: {
    bgTop: "#1d2a2c", bgBottom: "#0c1315",
    floor: "#48453a", floorAlt: "#403d34", grid: "rgba(200,240,240,0.05)",
    wall: "#4d5a52", wallTop: "#6a7a70", wallEdge: "#242c28",
    accent: "#9be7ff", accentSoft: "rgba(155,231,255,0.22)", gloom: 0.22,
    floorStyle: "plank", wallStyle: "brick", decor: "rug",
  },
  fountain: {
    bgTop: "#1a2c3e", bgBottom: "#0b141d",
    floor: "#4a5f74", floorAlt: "#43566a", grid: "rgba(230,245,255,0.07)",
    wall: "#546c84", wallTop: "#7191ad", wallEdge: "#28333f",
    accent: "#a8e6ff", accentSoft: "rgba(168,230,255,0.26)", gloom: 0.14,
    floorStyle: "marble", wallStyle: "glass", decor: "starmark",
  },
  lantern: {
    bgTop: "#2a1f22", bgBottom: "#120c0e",
    floor: "#4f4039", floorAlt: "#473933", grid: "rgba(255,225,200,0.05)",
    wall: "#5b4a41", wallTop: "#7a6357", wallEdge: "#2c231e",
    accent: "#ffb86b", accentSoft: "rgba(255,184,107,0.24)", gloom: 0.24,
    floorStyle: "stone", wallStyle: "brick", decor: "carpet",
  },
  dock: {
    bgTop: "#10283a", bgBottom: "#060f18",
    floor: "#4a4032", floorAlt: "#42392c", grid: "rgba(200,235,255,0.06)",
    wall: "#3a5164", wallTop: "#4f6d84", wallEdge: "#1a2732",
    accent: "#7ee8fa", accentSoft: "rgba(126,232,250,0.24)", gloom: 0.18,
    floorStyle: "plank", wallStyle: "battlement", decor: "ridge",
  },

  // --- 4. 반짝이는 얼음 궁전 -----------------------------------------------
  iceHall: {
    bgTop: "#1b3550", bgBottom: "#0a1626",
    floor: "#5b7ea0", floorAlt: "#537495", grid: "rgba(240,252,255,0.09)",
    wall: "#6b93b8", wallTop: "#8fb6d8", wallEdge: "#2b4157",
    accent: "#d6f4ff", accentSoft: "rgba(214,244,255,0.3)", gloom: 0.1,
    floorStyle: "ice", wallStyle: "glass", decor: "starmark",
  },
  frost: {
    bgTop: "#223a4e", bgBottom: "#0d1a24",
    floor: "#63849c", floorAlt: "#5b7a92", grid: "rgba(240,252,255,0.08)",
    wall: "#6f94ad", wallTop: "#92b6cd", wallEdge: "#2e4353",
    accent: "#b9ecff", accentSoft: "rgba(185,236,255,0.28)", gloom: 0.12,
    floorStyle: "ice", wallStyle: "glass", decor: "none",
  },
  snowyard: {
    bgTop: "#2a3c58", bgBottom: "#111a2a",
    floor: "#7d94ad", floorAlt: "#7489a2", grid: "rgba(255,255,255,0.1)",
    wall: "#8aa3bd", wallTop: "#a9c1d8", wallEdge: "#3a4a5e",
    accent: "#fff6d6", accentSoft: "rgba(255,246,214,0.3)", gloom: 0.08,
    floorStyle: "marble", wallStyle: "brick", decor: "ripple",
  },
  icicle: {
    bgTop: "#1d2b46", bgBottom: "#0a1120",
    floor: "#4f6a92", floorAlt: "#476186", grid: "rgba(220,240,255,0.08)",
    wall: "#5c7ba6", wallTop: "#7e9dc6", wallEdge: "#26334a",
    accent: "#a8d8ff", accentSoft: "rgba(168,216,255,0.26)", gloom: 0.16,
    floorStyle: "marble", wallStyle: "glass", decor: "carpet",
  },
  aurora: {
    bgTop: "#1c1c4e", bgBottom: "#080820",
    floor: "#3f4b86", floorAlt: "#39447b", grid: "rgba(200,255,240,0.08)",
    wall: "#4c5a9c", wallTop: "#6a79bd", wallEdge: "#232a52",
    accent: "#8affd8", accentSoft: "rgba(138,255,216,0.28)", gloom: 0.12,
    floorStyle: "ice", wallStyle: "battlement", decor: "ridge",
  },

  // --- 5. 별빛 정원 --------------------------------------------------------
  vine: {
    bgTop: "#1d3320", bgBottom: "#0a1409",
    floor: "#3f6338", floorAlt: "#395a33", grid: "rgba(200,255,190,0.06)",
    wall: "#3f5c39", wallTop: "#557a4c", wallEdge: "#1e2f1b",
    accent: "#c8ff8a", accentSoft: "rgba(200,255,138,0.24)", gloom: 0.16,
    floorStyle: "grass", wallStyle: "hedge", decor: "vines",
  },
  firefly: {
    bgTop: "#16241c", bgBottom: "#070d09",
    floor: "#33513c", floorAlt: "#2e4936", grid: "rgba(200,255,190,0.05)",
    wall: "#3a5241", wallTop: "#4f6e57", wallEdge: "#1a2820",
    accent: "#ffe98a", accentSoft: "rgba(255,233,138,0.26)", gloom: 0.26,
    floorStyle: "grass", wallStyle: "hedge", decor: "none",
  },
  pond: {
    bgTop: "#12303a", bgBottom: "#061419",
    floor: "#2c5a5e", floorAlt: "#275054", grid: "rgba(180,255,245,0.07)",
    wall: "#37676a", wallTop: "#4d8a8d", wallEdge: "#1a3335",
    accent: "#8affe4", accentSoft: "rgba(138,255,228,0.26)", gloom: 0.16,
    floorStyle: "water", wallStyle: "hedge", decor: "ripple",
  },
  starstair: {
    bgTop: "#241b46", bgBottom: "#0d0920",
    floor: "#4b3f78", floorAlt: "#443970", grid: "rgba(230,220,255,0.07)",
    wall: "#584a8c", wallTop: "#7566ad", wallEdge: "#281f4a",
    accent: "#d4b8ff", accentSoft: "rgba(212,184,255,0.28)", gloom: 0.18,
    floorStyle: "marble", wallStyle: "glass", decor: "starmark",
  },
  observatory: {
    bgTop: "#181545", bgBottom: "#07061c",
    floor: "#332f66", floorAlt: "#2e2a5d", grid: "rgba(220,220,255,0.07)",
    wall: "#413a80", wallTop: "#5c53a6", wallEdge: "#1e1a45",
    accent: "#fff3c4", accentSoft: "rgba(255,243,196,0.3)", gloom: 0.12,
    floorStyle: "shingle", wallStyle: "battlement", decor: "ridge",
  },
};

/**
 * 스프라이트를 타일보다 살짝 크게 그린다. 폰에서는 한 칸이 26px밖에 안 돼서,
 * 칸에 딱 맞춰 그리면 물건이 뭔지 알아보기 어렵다.
 */
export const SPRITE_SCALE = 1.18;

/** 바닥 종 4개의 색. 인덱스 0~3이 종 1~4. */
export const BELL_COLORS = ["#ff8fba", "#8affc1", "#7ee8fa", "#ffd166"];

export const CONFETTI_COLORS = [
  "#ff8fba",
  "#ffd166",
  "#7ee8fa",
  "#c77dff",
  "#8affc1",
  "#fff0f6",
];

/** 확대 화면 제목의 기본값. PropDef.name으로 덮어쓸 수 있다. */
export const PROP_NAMES: Record<PropArt, string> = {
  crate: "낡은 나무 상자",
  armor: "빈 갑옷",
  portrait: "오래된 초상화",
  plant: "말라 버린 화분",
  broom: "구석의 빗자루",
  note: "낡은 쪽지",
  ghost: "유령 뽀글이",
  desk: "책이 쌓인 책상",
  candle: "파랗게 흔들리는 촛불",
  gear: "커다란 태엽 장치",
  mirror: "먼지 앉은 거울",
  keypadSign: "문 옆 안내판",
  telescope: "오래된 망원경",
  chest: "자물쇠 걸린 상자",
};

/** 머리 모양. 캐릭터를 한눈에 구별해 주는 가장 큰 특징이다. */
export type HairStyle = "twin" | "bob" | "long" | "buns";

export interface HeroLook {
  dress: string;
  dressDark: string;
  dressTrim: string;
  sash: string;
  skin: string;
  blush: string;
  hair: string;
  hairLight: string;
  ribbon: string;
  shoe: string;
  hairStyle: HairStyle;
}

export interface CharacterDef {
  id: string;
  name: string;
  blurb: string;
  look: HeroLook;
}

/** 고를 수 있는 주인공들. 머리 모양과 색이 전부 다르다. */
export const CHARACTERS: CharacterDef[] = [
  {
    id: "byeol",
    name: "별이",
    blurb: "겁이 없고 호기심이 많아",
    look: {
      dress: "#ffa6c9",
      dressDark: "#d9548a",
      dressTrim: "#fff0f6",
      sash: "#ffd166",
      skin: "#ffe0c9",
      blush: "rgba(255,130,160,0.55)",
      hair: "#3d2a44",
      hairLight: "#5d4166",
      ribbon: "#ff5d8f",
      shoe: "#7a4b8f",
      hairStyle: "twin",
    },
  },
  {
    id: "dal",
    name: "달이",
    blurb: "차분하게 단서를 모아",
    look: {
      dress: "#9bd7ff",
      dressDark: "#4f96cf",
      dressTrim: "#f0faff",
      sash: "#ffd166",
      skin: "#ffe4d0",
      blush: "rgba(255,150,170,0.5)",
      hair: "#6b4224",
      hairLight: "#8f5d34",
      ribbon: "#ffd166",
      shoe: "#3f6c94",
      hairStyle: "bob",
    },
  },
  {
    id: "hae",
    name: "해나",
    blurb: "누구보다 빠르게 뛰어다녀",
    look: {
      dress: "#ffd98a",
      dressDark: "#e09a3a",
      dressTrim: "#fff8e6",
      sash: "#8affc1",
      skin: "#f7d8bb",
      blush: "rgba(255,140,120,0.5)",
      hair: "#c4541f",
      hairLight: "#e2793f",
      ribbon: "#6dbf7b",
      shoe: "#a8641f",
      hairStyle: "long",
    },
  },
  {
    id: "nuri",
    name: "누리",
    blurb: "수수께끼 푸는 걸 제일 좋아해",
    look: {
      dress: "#d4b8ff",
      dressDark: "#8f6bcf",
      dressTrim: "#f6f0ff",
      sash: "#7ee8fa",
      skin: "#ffe0c9",
      blush: "rgba(200,150,255,0.5)",
      hair: "#2b2f4a",
      hairLight: "#4a5170",
      ribbon: "#7ee8fa",
      shoe: "#5a4a8f",
      hairStyle: "buns",
    },
  },
];

/** 예전 코드가 쓰던 기본 주인공 색 */
export const HERO: HeroLook = CHARACTERS[0].look;

export interface StageDef {
  id: number;
  name: string;
  tagline: string;
  /** 카드 그림에 쓰는 색 */
  theme: ThemeKey;
  /** 아직 안 만든 스테이지는 잠겨 있다 */
  ready: boolean;
}

export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "달빛 성",
    tagline: "달빛이 스며드는 오래된 성. 다섯 개의 방을 지나 밖으로!",
    theme: "hall",
    ready: true,
  },
  {
    id: 2,
    name: "잠긴 지하 감옥",
    tagline: "철컹! 감방 문이 닫혔어. 유령 죄수가 빙긋 웃는다.",
    theme: "cell",
    ready: true,
  },
  {
    id: 3,
    name: "물에 잠긴 서고",
    tagline: "책들이 둥둥 떠다녀. 나룻배까지 가면 나갈 수 있을까?",
    theme: "shallow",
    ready: true,
  },
  {
    id: 4,
    name: "반짝이는 얼음 궁전",
    tagline: "발밑이 미끄러워! 오로라 발코니가 마지막 관문이야.",
    theme: "iceHall",
    ready: true,
  },
  {
    id: 5,
    name: "별빛 정원",
    tagline: "반딧불이가 길을 밝혀 줘. 하늘 전망대까지 올라가자!",
    theme: "vine",
    ready: true,
  },
];

/** 만들어 주신 분들 — 시작 화면에 적힌다 */
export const THANKS = ["이서연", "이서정"];

/** 유령 뽀글이의 색 — 무섭지 않게, 파스텔로 */
export const GHOST = {
  body: "rgba(203, 240, 255, 0.88)",
  edge: "rgba(255,255,255,0.95)",
  face: "#3a4a6a",
  blush: "rgba(255,150,190,0.5)",
} as const;
