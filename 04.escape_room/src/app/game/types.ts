import type { HeroLook } from "./constants";

export type Dir = "up" | "down" | "left" | "right";

/**
 * intro      — 스테이지 시작 안내 (아직 못 움직임)
 * playing    — 방 안에서 돌아다니는 중
 * modal      — 퀴즈/키패드 패널이 떠 있음 (React가 그림)
 * roomClear  — 문이 열리고 다음 방으로 넘어가는 연출 중
 * stageClear — 5개 방 전부 통과
 */
export type Phase = "intro" | "playing" | "modal" | "roomClear" | "stageClear";

export type ThemeKey =
  // 1. 달빛 성
  | "hall"
  | "library"
  | "clock"
  | "mirror"
  | "rooftop"
  // 2. 잠긴 지하 감옥
  | "cell"
  | "guard"
  | "storage"
  | "sewer"
  | "belfry"
  // 3. 물에 잠긴 서고
  | "shallow"
  | "wetShelf"
  | "fountain"
  | "lantern"
  | "dock"
  // 4. 반짝이는 얼음 궁전
  | "iceHall"
  | "frost"
  | "snowyard"
  | "icicle"
  | "aurora"
  // 5. 별빛 정원
  | "vine"
  | "firefly"
  | "pond"
  | "starstair"
  | "observatory";

/** 스프라이트 종류. renderer가 이 값으로 무엇을 그릴지 고른다. */
export type PropArt =
  | "crate"
  | "armor"
  | "portrait"
  | "plant"
  | "broom"
  | "note"
  | "ghost"
  | "desk"
  | "candle"
  | "gear"
  | "mirror"
  | "keypadSign"
  | "telescope"
  | "chest";

export interface PropDef {
  id: string;
  tx: number;
  ty: number;
  art: PropArt;
  /** 지나갈 수 없는 물건인지. 벽에 걸린 그림처럼 납작한 건 false. */
  solid?: boolean;
  /** 확대 화면 제목. 없으면 그림 종류별 기본 이름을 쓴다. */
  name?: string;
  /** 살펴봤을 때 뜨는 설명. 없으면 그냥 장식. */
  say?: string;
  /** 확대해서 봐야 보이는 것 — 한 줄 더 붙는 관찰 결과. */
  detail?: string;
  /** 촛불 색처럼 물건마다 다른 색 */
  tint?: string;
  /** 초가 얼마나 남았는지 0~1. 순서를 눈으로 비교하게 만드는 핵심 값이다. */
  burn?: number;
}

// ---------------------------------------------------------------------------
// 퍼즐 정의 — 방마다 하나씩
// ---------------------------------------------------------------------------

/**
 * 촛불을 정해진 순서로 켜야 상자가 열린다.
 *
 * 순서는 어디에도 적혀 있지 않다. 단서("짧게 남은 초부터")를 읽고, 촛대를 하나씩
 * 확대해 남은 길이를 확인해서 스스로 순서를 세워야 한다. 찍으려면 24가지를
 * 매번 처음부터 켜야 하니 관찰하는 쪽이 훨씬 빠르다.
 */
export interface OrderPuzzle {
  kind: "order";
  /** 정답 순서대로 늘어놓은 prop id */
  sequence: string[];
  /** 다 켜면 열리는 상자 */
  chestId: string;
  right: string;
  wrong: string;
}

/** 누군가에게 말을 걸면 수수께끼를 낸다. 4지선다. */
export interface QuizPuzzle {
  kind: "quiz";
  askerId: string;
  question: string;
  choices: string[];
  answer: number;
  right: string;
  wrong: string;
}

/** 바닥 종을 울린 순서대로 밟는다. */
export interface SequencePuzzle {
  kind: "sequence";
  length: number;
  /** 다시 들려주는 물건 */
  replayId: string;
}

/** 방 안에 흩어진 숫자를 모아 문에 입력한다. */
export interface CodePuzzle {
  kind: "code";
  slots: { propId: string; digit: string; say: string }[];
}

/** 상자를 표식 위로 민다. */
export interface PushPuzzle {
  kind: "push";
}

export type PuzzleDef =
  | OrderPuzzle
  | QuizPuzzle
  | SequencePuzzle
  | CodePuzzle
  | PushPuzzle;

export interface RoomDef {
  name: string;
  theme: ThemeKey;
  /** 방에 들어오자마자 뜨는 안내 */
  intro: string;
  /** HUD에 늘 떠 있는 한 줄 힌트 */
  hint: string;
  /** ROWS개의 문자열, 각 COLS글자 */
  layout: string[];
  props: PropDef[];
  puzzle: PuzzleDef;
}

// ---------------------------------------------------------------------------
// 실행 중 상태
// ---------------------------------------------------------------------------

export interface Box {
  tx: number;
  ty: number;
}

export interface RoomRuntime {
  solved: boolean;
  /** 이미 살펴본 물건 */
  examined: Record<string, boolean>;
  keyFound: boolean;
  /** 지금까지 순서에 맞게 켜 둔 촛대 (order 퍼즐) */
  lit: string[];
  /** propId -> 찾아낸 숫자 */
  digits: Record<string, string>;
  /** 정답 종 순서 (1~4) */
  seq: number[];
  /** 지금까지 맞게 밟은 개수 */
  seqInput: number;
  /** 시범 연주 시작 시각. -1이면 연주 중 아님 */
  seqPlayAt: number;
  /** 시범 연주에서 마지막으로 소리를 낸 음의 인덱스 */
  seqPlayIdx: number;
  /** 종 번호 -> 빛이 꺼지는 시각 */
  bellFlash: Record<number, number>;
  boxes: Box[];
}

export interface Player {
  tx: number;
  ty: number;
  /** 칸 사이를 부드럽게 움직이기 위한 출발 칸 */
  fromTx: number;
  fromTy: number;
  dir: Dir;
  /** 이동 시작 시각. -1이면 서 있는 중 */
  moveAt: number;
  /** 걷기 애니메이션 카운터 */
  steps: number;
}

/** 확대 화면 안에서 크게 드러나는 것. */
export type Reveal =
  | { kind: "digit"; value: string; label: string }
  | { kind: "key" };

export interface InspectModal {
  kind: "inspect";
  art: PropArt;
  title: string;
  text: string;
  /** 확대해야 보이는 한 줄. 그림 아래에 따로 적힌다. */
  detail: string | null;
  reveal: Reveal | null;
  /**
   * 이 화면을 닫는 순간 방이 풀린다면 그때 띄울 말.
   * 열쇠를 찾은 장면을 다 본 뒤에 문이 열려야 순서가 자연스럽다.
   */
  solveOnClose: string | null;
  /** 촛불이 켜져 있는지 / 상자가 열려 있는지 */
  active: boolean;
  tint: string | null;
  burn: number;
  /**
   * 확대 화면에서 바로 할 수 있는 행동. 촛대는 "보기"와 "켜기"가 따로여야
   * 순서를 정하기 전에 마음 놓고 들여다볼 수 있다.
   */
  action: { label: string; propId: string } | null;
}

export type ModalState =
  | { kind: "quiz"; question: string; choices: string[]; answer: number }
  | { kind: "keypad"; entry: string; length: number; wrong: boolean }
  | InspectModal;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  /** 고른 캐릭터의 색과 머리 모양 */
  look: HeroLook;
  /** 이번 판에 뽑힌 다섯 개의 방 */
  defs: RoomDef[];
  phase: Phase;
  roomIndex: number;
  rooms: RoomRuntime[];
  player: Player;
  /** 누르고 있는 방향 (키보드 홀드 / 터치 홀드) */
  held: Dir | null;
  toast: { text: string; until: number } | null;
  modal: ModalState | null;
  particles: Particle[];
  now: number;
  startedAt: number;
  finishedAt: number;
  roomEnteredAt: number;
  /** 문이 열린 시각 — 열리는 연출에 쓴다 */
  doorOpenAt: number;
  /** roomClear 연출 시작 시각 */
  clearAt: number;
  /** 틀린 횟수 (결과 화면용) */
  mistakes: number;
}

export interface HudState {
  phase: Phase;
  roomIndex: number;
  roomName: string;
  hint: string;
  solved: boolean;
  doorOpen: boolean;
  elapsedMs: number;
  mistakes: number;
  toast: string | null;
  modal: ModalState | null;
  /** 상자 밀기 방에서만 보이는 되돌리기 버튼 */
  canResetBoxes: boolean;
  /** 암호 방에서 지금까지 찾아낸 숫자. 아직 못 찾은 자리는 null. */
  foundDigits: (string | null)[];
}
