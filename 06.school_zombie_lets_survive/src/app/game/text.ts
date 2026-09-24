/**
 * 인게임 텍스트 정본 — `docs/reviews/story-builder.md` §2를 그대로 옮긴 것.
 * 문장을 고칠 일이 생기면 저 문서를 먼저 고친다.
 */

export const TITLE = "학교 좀비, 살아남자!";
export const SUBTITLE = "보라 브로콜리 푸딩의 비밀";

export const NAME_PROMPT = "네 이름을 알려줘!";
export const NAME_HINT = "(한글 최대 6자)";

/** {이름} 자리를 채운다 */
export function fill(text: string, name: string): string {
  return text.replaceAll("{이름}", name);
}

/** 메커닉이 처음 나올 때 한 번만 나오는 무전 */
export const MECHANIC_HINTS: Record<string, string> = {
  yawn: "하품 소리 나는 쪽엔 좀비가 있어!",
  locker: "들킬 것 같으면 사물함에 숨어!",
  chalk: "분필을 던지면 딴 데를 쳐다봐!",
  alarm: "알람시계는 다 끌어모아. 그 틈에 도망쳐!",
  popper: "펑! 폭죽 터지면 좀비가 도망가!",
  banana: "바나나 껍질 밟으면 철푸덕! 길목에 놔 봐.",
  bossSlip: "교장 선생님도 바나나엔 못 이겨!",
  popperGet: "폭죽 주웠다! 던지면 좀비가 도망가!",
  bananaGet: "바나나 껍질 주웠다! 좀비 지나갈 길에 놔!",
  door: "문 잠그면 잠깐 못 따라와. 세 번뿐이야!",
  torch: "손전등 켜면 잘 보여. 근데... 더 잘 들켜!",
  friend: "친구를 구하면 짐을 하나 대신 들어줘!",
  matron: "국자 아주머니는 정해진 길로만 다녀!",
  boss: "연설 중엔 눈 감고 있어. 그냥 지나가!",
  menu: "급식표 조각이 반짝여! 굳이 가봐야 보여.",
  map: "지도를 눌러 봐. 어디가 어딘지 다 보여!",
  dark: "깜깜해도 괜찮아, 손전등 있잖아!",
  vent: "비밀 통로다! 꾹 눌러서 들어가 봐.",
};

/** 오늘의 할 일 — 별 하나에 목표 하나 (DESIGN §16) */
export const GOAL_TITLE = "오늘의 할 일";
export const GOAL_MAIN = "재료 2개 모아서 출구로";
export const GOAL_MAIN_5 = "해독제 만들고 방송 켜기";
export const GOAL_MENU = "급식표 조각 2개 찾기";
export const GOAL_DONE = "목표 달성!";
export const GOAL_NEXT = "다음엔";
export const GOAL_ALL = "별 3개 다 모았어!";
export const GOAL_TAP = "눌러서 시작";

/** 쫓기는 중에는 환풍구에 못 들어간다 (DESIGN §13-1) */
export const VENT_DENY = "지금은 안 돼!";
/** 남의 기록을 깼을 때 (DESIGN §13-3) */
export const RECORD_BEATEN = "{상대이름}의 기록을 깼다!";

/** 잠들었을 때 나오는 랜덤 한 줄 (10종) */
export const SLEEP_LINES = [
  "5교시에 자면 안 되는데…",
  "꿈에서 급식을 세 번이나 더 먹었다",
  "잠꼬대: 숙제… 다 했어요…",
  "베개가 생각보다 푹신했다",
  "내 코 고는 소리에 내가 놀라 깼다",
  "베개 대신 급식판을 베고 잤다",
  "좀비들 코 고는 소리가 다 똑같았다",
  "꿈에서도 분필을 던졌다. 잘 피했다",
  "10초 잤는데 100년 잔 기분이었다",
  "일어나보니 볼에 자국이… 비밀이다",
];

export const WAKE_LINE = "아 깜짝이야! 얼마나 잤지?";

/** 교장 선생님 */
export const BOSS_INTRO = "어험! 다들 모여봐요. 조회를 시작하겠습니다.";
export const BOSS_SPEECH = [
  "에... 그러니까... 첫 번째로 말씀드리면...",
  "요즘 학생들 자세가 말이죠...",
  "제가 학교 다닐 때는 말이야...",
  "두 번째로... 아니 잠깐, 첫 번째부터 다시...",
  "이 얘기가 왜 나왔냐면 말이죠...",
  "그래서 결론적으로 말씀드리자면...",
  "마지막으로 딱 한 가지만 더...",
  "…어디까지 얘기했더라?",
];
export const BOSS_COUGH = "어험, 어험!";
export const BOSS_BROADCAST = "어라? 다들 왜 이렇게 상쾌해 보이지?";

/** 친구가 다시 잠들 때 공통으로 붙는 한 줄 */
export const FRIEND_DOWN_COMMON = "내가 너무 시끄러웠나 봐... 미안!";

/** 5-1 해독제 조합 */
export const RITUAL_NOTE = "재료를 다 넣어. 이제 거의 다 왔어!";
export const RITUAL_DONE = "해독제 완성! 방송실로 가자!";

/** 엔딩 스크립트 */
export const ENDING = [
  "{이름}이(가) 방송실 스위치를 켰다.",
  "기상 나팔 소리와 해독제 안개가 스피커를 타고 퍼진다.",
  "전교생이 기지개를 켜며 하나둘 깨어난다.",
  "교장 선생님: \"어... 내가 방금까지 뭐라고 했더라?\"",
  "교장 선생님: \"보라 브로콜리 푸딩은 오늘부로 금지!\"",
  "급식 아주머니: \"그럼 내일은 딸기 푸딩으로 할게요!\"",
  "보건 선생님: \"역시 우리 {이름}이야. 고생 많았어!\"",
  "전교 조회에서 {이름}이(가) 「학교를 구한 영웅」 상장을 받았다.",
  "다 같이 웃으며 딸기 푸딩을 먹는다.",
];

export const ENDING_MENU_BONUS = "게다가 {이름}이(가) 좋아하는 메뉴도 급식표에 올라갔다!";

/** 못 구한 친구가 남아 있을 때 — 빈자리가 다시 플레이할 이유가 된다 */
export const ENDING_FRIENDS_ASLEEP = "아직 자고 있는 친구가 {n}명 있대. 다시 가 볼까?";
/** 4명 전원 구출 */
export const ENDING_ALL_FRIENDS = "{이름}이랑 친구들 넷, 다 같이 학교를 구했다!";

export const MENU_SCREEN_TITLE = "이번 주 급식표";
export const MENU_COMPLETE = "{이름} 특선 메뉴 추가!";
export const MENU_MATRON = "얘가 뭘 좋아하나 했더니, 이거였구나!";

/** 급식표 10칸에 적히는 메뉴 이름 */
export const MENU_ITEMS = [
  "미역국",
  "돈가스",
  "김치볶음밥",
  "떡볶이",
  "카레라이스",
  "제육볶음",
  "잔치국수",
  "치즈스틱",
  "바나나우유",
  "딸기 푸딩",
];

export function randomSleepLine(): string {
  return SLEEP_LINES[Math.floor(Math.random() * SLEEP_LINES.length)];
}
