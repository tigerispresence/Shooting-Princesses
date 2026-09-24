/**
 * 「학교 좀비, 살아남자!」 타입 정의.
 *
 * 좌표는 전부 픽셀(float). 타일 격자는 맵을 손으로 그리기 위한 것이고,
 * 캐릭터는 원형 충돌체로 자유롭게 움직인다 (DESIGN.md §0).
 */

import type { Difficulty, Tuning } from "./difficulty";

/** 화면 흐름 단계 */
export type Phase =
  | "playing"
  | "sleeping" // 잡혀서 같이 잠든 연출 중
  | "ritual" // 5-1 해독제 조합 연출
  | "venting" // 환풍구 크롤 연출 중
  | "stageClear";

/** 환풍구 입구를 가려 주는 소품 (전부 배경처럼 그려진다 — 하이라이트 없음) */
export type VentProp =
  | "hatch" // 급식실 배식구
  | "bed" // 보건실 침대
  | "cleaner" // 청소도구함
  | "drum" // 큰북
  | "easel" // 이젤
  | "shelf" // 서가
  | "vault" // 뜀틀
  | "stand" // 스탠드
  | "grille"; // 맨 그릴

/** 잠든 연출의 변주 — 누구에게 잡혔는가 */
export type SleepKind = "pillow" | "matron" | "boss" | "buddy";

export type ZombieKind = "basic" | "hungry" | "matron";

export type ZombieState =
  | "patrol"
  | "notice"
  | "chase"
  | "investigate"
  | "stall"
  /** 폭죽에 놀라 반대쪽으로 도망치는 중 */
  | "flee";

export interface Vec {
  x: number;
  y: number;
}

/** 한 칸의 성질. 맵을 파싱할 때 미리 계산해 둔다. */
export interface TileInfo {
  /** 통과 불가 */
  solid: boolean;
  /** 시야를 막는다 */
  blocksSight: boolean;
  /** 숨을 수 있는 사물함 */
  locker: boolean;
  /** 잠글 수 있는 문 */
  door: boolean;
  /** 복도 바닥(회색 리놀륨). false면 방 바닥 */
  corridor: boolean;
  /** 출구 계단 */
  exit: boolean;
  /** 기둥 (교장 연설을 막는다) */
  pillar: boolean;
  /** 방송실 문 */
  broadcast: boolean;
  /** 과학실 비커 */
  beaker: boolean;
  /** 장식용 분필 더미 */
  chalkPile: boolean;
  /** 어느 방에 속하는가 (rooms 배열의 인덱스, 없으면 -1) */
  room: number;
}

export interface RoomDef {
  /** 타일 좌표 */
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  floor: string;
  wall: string;
  /** 어두운 방이면 손전등이 필요하다 */
  dark?: boolean;
  /** 야외 — 벽 대신 펜스, 하늘 배경 */
  outdoor?: boolean;
}

/** 스테이지 안의 한 구역 = 체크포인트 */
export interface SectionDef {
  /** 화면에 뜨는 이름 (예: "1-2 보건실") */
  label: string;
  /** 처음 들어갈 때 한 번 나오는 무전 */
  radio: string;
  /** 구역을 판정하는 타일 사각형 */
  zone: { x: number; y: number; w: number; h: number };
  /** 여기서 재개한다 (타일 좌표, 소수점 가능) */
  spawn: Vec;
}

/** 환풍구 한 쌍의 한쪽 끝 (맵 데이터) */
export interface VentDef {
  /** 타일 좌표 */
  x: number;
  y: number;
  prop: VentProp;
}

export interface VentPairDef {
  /** 전역 번호 0~7 (저장에 쓰인다) */
  id: number;
  a: VentDef;
  b: VentDef;
}

export interface MatronPath {
  /** 타일 좌표 웨이포인트 루프 */
  points: Vec[];
  /**
   * 이 재료(전역 인덱스)를 주울 때까지는 제자리에서 하품만 한다.
   * 스테이지 2 아주머니는 분필을 줍는 순간 순찰을 시작한다 — 「구역당 새 요소 하나」를 지키기 위함.
   */
  wakeOnIngredient?: number;
}

export interface StageDef {
  id: number;
  /** 「1. 점심시간 끝」 */
  title: string;
  /** 타이틀 카드 부제 */
  subtitle: string;
  /** 세 번째 별 — 이 스테이지만의 도전 (DESIGN §16). 쌓는 목표만 둔다, 실패가 확정되는 목표는 없다 */
  challenge: { text: string; need: number };
  par: number;
  renderScale: number;
  patrolSpeed: number;
  chaseSpeed: number;
  noticeR: number;
  noticeDelay: number;
  giveupMs: number;
  /** 시작할 때 손에 쥐고 있는 알람시계 */
  startAlarms: number;
  /** 시작할 때 손에 쥐고 있는 파티 폭죽 */
  startPoppers: number;
  /** 시작할 때 손에 쥐고 있는 바나나 껍질 */
  startBananas: number;
  rooms: RoomDef[];
  sections: SectionDef[];
  matronPaths: MatronPath[];
  /** 배고픈 좀비(`Z`)의 손으로 찍은 경로 — 급식 테이블 뒤를 지나야 한다 */
  hungryPath?: MatronPath;
  /** 환풍구 쌍. 한 쌍은 **인접한 두 방**만 잇는다 (DESIGN §13-1) */
  vents: VentPairDef[];
  /** 이 스테이지에서 얻는 재료 두 개 (전역 재료 인덱스 0~7) */
  ingredients: [number, number];
  /** ASCII 맵에서 재료를 나타내는 글자 */
  ingredientChars: [string, string];
  /** 급식표 조각 전역 인덱스 (0~9) */
  menuPieces: [number, number];
  map: string[];
}

export interface MapData {
  w: number;
  h: number;
  tiles: TileInfo[];
  rooms: RoomDef[];
  raw: string[];
}

export interface Look {
  hair: number;
  cloth: number;
  hat: string | null;
}

export interface Player {
  x: number;
  y: number;
  /** 바라보는 방향 (라디안) */
  face: number;
  /** 걷는 애니메이션용 */
  walkT: number;
  moving: boolean;
  /** 숨어 있는 사물함 타일 인덱스 (없으면 -1) */
  hiding: number;
  /** 문을 여닫는 중 (0~1) */
  hideT: number;
  hideDir: 1 | -1;
  /** 사물함에 들어가기 직전 자리 — 방향을 안 고르면 여기로 돌려놓는다 */
  hideFrom: Vec;
  /** 숨어 있는 동안 고른 나갈 방향 (단위 벡터, 8방향). 없으면 null */
  hideAim: Vec | null;
  /** 같은 방향을 계속 밀고 있는 시간 — 차면 손 버튼 없이도 그쪽으로 나간다 */
  hideAimT: number;
  /** 사물함 사방 중 나갈 수 있는 쪽 (bit 0 오른쪽, 1 아래, 2 왼쪽, 3 위) */
  hideExits: number;
  torchOn: boolean;
  alarms: number;
  poppers: number;
  bananas: number;
  chalkCd: number;
  /** 사물함별 재진입 쿨다운 */
  lockerCd: Map<number, number>;
}

export interface Zombie {
  id: number;
  kind: ZombieKind;
  x: number;
  y: number;
  r: number;
  patrolSpeed: number;
  chaseSpeed: number;
  noticeR: number;
  noticeDelay: number;
  giveupMs: number;
  state: ZombieState;
  /** 상태 타이머 (ms) */
  t: number;
  /** 순찰 경로 (픽셀 좌표) */
  path: Vec[];
  pathIndex: number;
  /** 경로를 앞으로 도는가 뒤로 도는가 */
  dir: 1 | -1;
  /** 웨이포인트에서 하품하며 멈춰 있는 시간 */
  pauseT: number;
  /** 마지막으로 본 곳 */
  lastSeen: Vec | null;
  /** investigate 목적지 */
  goal: Vec | null;
  /** 목적지까지의 길 (BFS 결과) */
  route: Vec[];
  routeAt: number;
  /** 다음 길찾기까지 남은 시간 */
  repathT: number;
  /** stall 남은 시간 */
  stallT: number;
  /** 하품 소리 타이머 */
  yawnT: number;
  /** 아슬아슬 판정용 */
  nearArmed: boolean;
  nearCd: number;
  /** 시작 위치 (재시작 때 되돌린다) */
  home: Vec;
  /** 순찰 경로에서 웨이포인트인 노드 인덱스 */
  stops: number[];
  /** 몸통 흔들림 */
  bob: number;
  /** 국자 소리 타이머 */
  clankT: number;
  /** 순찰 경로를 만들 때 쓰는 씨앗 — 같으면 항상 같은 길 */
  seed: number;
  /** 손으로 찍은 고정 웨이포인트 (아주머니 · 배고픈 좀비) */
  routePoints: Vec[] | null;
  /** 이 재료를 주울 때까지 제자리에서 하품만 한다 */
  wakeOnIngredient: number | null;
  dormant: boolean;
  /** 문 두드리기 쿨다운 */
  knockCd: number;
  /**
   * 개체 변주 (기본 좀비 전용, DESIGN §12-A).
   * 실루엣과 색은 절대 안 건드린다 — 박자와 윤곽선 **안쪽** 그림만 다르다.
   */
  variant: 0 | 1 | 2;
  /** 뒤뚱임·하품 위상 오프셋 (0~2π) */
  phase: number;
  /** 뒤뚱임 진폭 배율 (0.85~1.15) */
  bobAmp: number;
  /**
   * stall 중 어떤 꼴로 멈춰 있는가.
   * "none" = 그냥 하품 / "dizzy" = 폭죽에 놀라 별이 뱅뱅 / "slip" = 바나나에 미끄러져 누움
   */
  daze: "none" | "dizzy" | "slip";
  /** 미끄러진 방향 (누운 쪽) */
  slipDir: 1 | -1;
}

export interface Friend {
  id: number;
  /** FRIENDS 배열 인덱스 */
  who: number;
  x: number;
  y: number;
  home: Vec;
  /** "asleep" = 아직 못 깨움, "follow" = 따라오는 중 */
  state: "asleep" | "follow" | "down";
  /** 깨우는 중 진행도 (0~1) */
  wakeT: number;
  /** 줄줄이 따라오는 순서 */
  order: number;
  /** 따라다닌 자취 */
  trail: Vec[];
  bob: number;
  /** 이번 판에 점수를 줬는가 */
  scored: boolean;
}

/** 맵 위의 환풍구 한 쪽 */
export interface VentEnt {
  /** 전역 번호 0~7 */
  id: number;
  /** 같은 쌍의 반대쪽 (s.vents 안의 인덱스) */
  other: number;
  x: number;
  y: number;
  prop: VentProp;
  found: boolean;
  /** 진입 상호작용 진행도 (0~1) */
  charge: number;
}

export interface ItemEnt {
  kind: "ingredient" | "menu" | "alarm" | "popper" | "banana";
  /** ingredient면 0~7, menu면 0~9 */
  index: number;
  x: number;
  y: number;
  taken: boolean;
  /** 반짝임 위상 */
  ph: number;
}

export interface Chalk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  landed: boolean;
  /** 착지 후 파문 애니메이션 */
  t: number;
  spin: number;
}

export interface Alarm {
  x: number;
  y: number;
  /** 울리기 전 대기 → 울림 */
  t: number;
  ringing: boolean;
  done: boolean;
}

/** 던진 파티 폭죽 — 분필처럼 날아가서 착지하면 터진다 */
export interface Popper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  landed: boolean;
  /** 터진 뒤 연출 시간 */
  t: number;
  spin: number;
}

/** 바닥에 놓인 바나나 껍질 */
export interface Banana {
  x: number;
  y: number;
  /** 놓은 뒤 지난 시간 */
  t: number;
}

export interface Door {
  /** 타일 인덱스 */
  tile: number;
  x: number;
  y: number;
  /** 남은 잠금 시간 (ms) */
  lockT: number;
  uses: number;
  /** 잠그는 중 (0~1) */
  castT: number;
  /** 좀비가 두드리는 연출 */
  knockT: number;
}

export type BossPhase = "walk" | "windup" | "speech" | "recover";

export interface Boss {
  x: number;
  y: number;
  phase: BossPhase;
  t: number;
  /** 이번 연설 동안 연설 반경 안까지 들어왔다 — recover로 넘어갈 때 「연설 통과」 1회로 센다 (§16) */
  passArmed: boolean;
  /** 연설 반경 (0 → 200) */
  radius: number;
  line: string;
  lineIndex: number;
  active: boolean;
  bob: number;
  home: Vec;
  /** 바나나에 미끄러져 누워 있는 남은 시간 */
  slipT: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: "spark" | "dust" | "zzz" | "star" | "heart" | "confetti";
  /** confetti 전용 — 회전 */
  rot?: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

/** 재료 아이콘이 하단 줄로 날아가는 연출 */
export interface FlyIcon {
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  index: number;
}

export interface StageScore {
  ingredients: number;
  menus: number;
  friends: number;
  clear: number;
  time: number;
  stealth: number;
  fresh: number;
  nearMiss: number;
  total: number;
  /** 별 = 달성한 목표 수 (§16). goals[i]가 i번째 별 */
  stars: number;
  goals: boolean[];
}

/** 화면에 보여 주는 목표 한 줄 (§16). 스테이지마다 정확히 3개 */
export interface GoalView {
  text: string;
  done: boolean;
  now: number;
  need: number;
}

export interface GameState {
  stageId: number;
  stage: StageDef;
  /** 이 판에 굳어진 난이도 숫자들 (DESIGN §15) */
  tune: Tuning;
  map: MapData;
  phase: Phase;
  /** 일시정지 (React가 켜고 끈다) */
  paused: boolean;
  player: Player;
  zombies: Zombie[];
  friends: Friend[];
  items: ItemEnt[];
  chalks: Chalk[];
  alarms: Alarm[];
  poppers: Popper[];
  bananas: Banana[];
  doors: Door[];
  boss: Boss | null;
  particles: Particle[];
  floaters: Floater[];
  flyIcons: FlyIcon[];
  camera: Vec;
  /** 현재 구역 (0~2) */
  section: number;
  visited: boolean[];
  /** 체크포인트 좌표 */
  checkpoint: Vec;
  /** 흐른 시간 (ms) */
  elapsed: number;
  score: number;
  /** 이번 판에 모은 것들 */
  gotIngredients: boolean[];
  gotMenus: boolean[];
  /** 스테이지 시작부터 한 번도 `!`가 안 떴는가 */
  neverSpotted: boolean;
  /** 이번 스테이지에서 잔 횟수 */
  sleeps: number;
  sleepKind: SleepKind;
  sleepLine: string;
  /** 잠든 연출 타이머 */
  sleepT: number;
  /** 출구가 열렸는가 */
  exitOpen: boolean;
  /** 방송 게이지 (ms, 최대 3000) */
  broadcast: number;
  /** 5-1 조합 연출 진행 */
  ritualT: number;
  ritualStep: number;
  /** 화면 진동 */
  shake: number;
  /** 흰 섬광 */
  flash: number;
  /** 화면에 뜨는 무전 한 줄 */
  radio: string | null;
  radioT: number;
  /** 구역 이름 카드 */
  card: string | null;
  cardT: number;
  /** 세 번째 별 도전의 진행도 (§16). 스테이지마다 세는 게 다르다 */
  challenge: number;
  challengeDone: boolean;
  /** 상호작용 대상 */
  target: InteractTarget | null;
  /** 맵 위의 환풍구 (쌍당 2개) */
  vents: VentEnt[];
  /** 크롤 연출 타이머 */
  ventT: number;
  /** 지금 기어가고 있는 환풍구 (s.vents 인덱스) */
  ventFrom: number;
  /** 아무 환풍구나 다시 쓸 수 있게 되기까지 */
  ventCd: number;
  /** "지금은 안 돼!" 거부 표시 */
  ventDenyT: number;
  /** 환풍구에서 막 나온 뒤의 무적 유예 (불공정한 즉사 방지) */
  ventGrace: number;
  /** 이번 판에 새로 찾은 환풍구 */
  foundVents: boolean[];
  /** 따라오는 친구들의 특기 (인덱스 = FRIENDS) */
  friendPower: boolean[];
  /** 특기 아이콘이 팝하는 타이머 */
  powerPop: number[];
  /** 방송 게이지를 지금 채우는 중인가 (환풍구 진입 금지) */
  broadcastFilling: number;
  /** 아직 못 구한 친구의 "여기야!" 타이머 */
  callT: number;
  /** 상호작용 버튼을 누르고 있는가 */
  held: boolean;
  /** 이번 프레임에 새로 눌렀는가 */
  pressed: boolean;
  /** 조작 입력 (-1~1) */
  inx: number;
  iny: number;
  /** 마우스가 가리키는 방향 (라디안). null이면 이동 방향을 본다 */
  aim: number | null;
  /** 처음 손전등을 켰을 때 안내를 한 번만 */
  toldTorch: boolean;
  score_: StageScore | null;
  /** 연습 모드 좀비 수 (null이면 정상) */
  practiceZombies: number | null;
  /** 지도 전체 보기 */
  mapOpen: boolean;
  /** 이번 판에서 깨운 친구 수 */
  rescued: number;
  /** 오디오 하품 스로틀 */
  yawnBudget: number;
  time: number;
  /** 대사에 들어갈 이름 */
  playerName: string;
  /** 이미 보여 준 메커닉 안내 */
  hints: string[];
  /** 재료를 주운 순간의 짧은 정지 */
  hitstop: number;
  /** 잠그는 중인 문 (없으면 -1) */
  castDoor: number;
  castT: number;
  /** 이번 판에 쌓인 「아슬아슬」 점수 */
  nearMissScore: number;
  /** 발소리 간격 */
  stepT: number;
  bossIntroDone: boolean;
  /** 이번 판에 주운 급식표 */
  menusThisRun: number[];
  /** 친구가 따라붙은 순서 */
  friendSeq: number;
  /** 가상 조이스틱을 잡고 있는가 (키보드 입력과 안 싸우게) */
  padActive: boolean;
  /** 이번 판에 친구를 깨워서 받은 점수 */
  friendScore: number;
}

export interface InteractTarget {
  kind:
    | "friend"
    | "item"
    | "door"
    | "locker"
    | "beaker"
    | "broadcast"
    | "exit"
    | "vent";
  x: number;
  y: number;
  index: number;
}

export interface HudState {
  phase: Phase;
  section: string;
  score: number;
  menus: number;
  ingredients: boolean[];
  alarms: number;
  poppers: number;
  bananas: number;
  torch: boolean;
  canTorch: boolean;
  canChalk: boolean;
  canAlarm: boolean;
  /** 폭죽·바나나 버튼은 손에 하나라도 있을 때만 뜬다 — 버튼이 많아지는 걸 막는다 */
  canPopper: boolean;
  canBanana: boolean;
  sleepLine: string;
  canSkip: boolean;
  showRestart: boolean;
  broadcast: number;
  showBroadcast: boolean;
  stars: number;
  scoreBoard: StageScore | null;
  sleeps: number;
  stageId: number;
  /** 오늘의 할 일 3개 (§16) — 시작 카드·일시정지·지도·클리어에 같은 목록이 뜬다 */
  goals: GoalView[];
  hasIngredientA: boolean;
  hasIngredientB: boolean;
  /** 찾은 환풍구 수 (전역 0~8) */
  vents: number;
  difficulty: Difficulty;
  scoreMult: number;
  /** 따라오는 친구 (FRIENDS 인덱스) */
  companions: number[];
  /** 이번 스테이지 경과 시간 (ms) */
  timeMs: number;
  /** 지금 어두운 방에 있는가 (손전등 버튼은 여기서만 나온다) */
  inDark: boolean;
}
