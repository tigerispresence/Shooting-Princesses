import type { PropArt, ThemeKey } from "./types";

/**
 * 다섯 스테이지의 "대본".
 *
 * 퍼즐이 돌아가는 방식(engine)과 그림(background)은 이미 공통이라, 스테이지를
 * 늘리는 일은 여기에 글과 테마를 적는 일이 된다.
 */

export type PuzzleKind = "order" | "quiz" | "sequence" | "code" | "push";

/** 자리만 빼고 다 정해 둔 장식 물건 */
export interface ExtraProp {
  id: string;
  art: PropArt;
  name?: string;
  solid: true;
  say: string;
  detail: string;
  tint?: string;
}

export interface RoomSpec {
  name: string;
  theme: ThemeKey;
  intro: string;
  hint: string;
  kind: PuzzleKind;
  /** 장식 물건 후보. 여기서 세 개쯤 뽑아 흩어 놓는다. */
  extras: ExtraProp[];
  /** 순서 퍼즐: 켜는 물건을 뭐라고 부를지 (촛대 / 횃불 / 등불 …) */
  lightNoun?: string;
  /** 순서 퍼즐: 열리는 상자 이름 */
  chestName?: string;
  /** 순서 퍼즐: "짧은 것부터"를 알려 주는 존재 */
  clue?: ExtraProp;
  /** 수수께끼 퍼즐: 문제를 내는 유령 이름 */
  askerName?: string;
  /** 종소리 퍼즐: 다시 들려주는 장치 이름 */
  deviceName?: string;
  /** 숫자 자물쇠 퍼즐: 숫자를 숨겨 둘 물건의 그림 종류 */
  holderArts?: PropArt[];
}

export interface StageSpec {
  id: number;
  rooms: RoomSpec[];
}

// ---------------------------------------------------------------------------
// 어느 스테이지에서나 쓸 수 있는 장식 물건
// ---------------------------------------------------------------------------

/** 그림 종류마다 하나씩. id 뒤에 스테이지 번호를 붙여 겹치지 않게 쓴다. */
function common(suffix: string): ExtraProp[] {
  return [
    {
      id: `crate-${suffix}`,
      art: "crate",
      solid: true,
      say: "뚜껑을 열어 보니 단추 한 개랑 먼지뿐이야.",
      detail: "옆면에 「3」이라고 적힌 스티커가 반쯤 떨어져 나갔어.",
    },
    {
      id: `desk-${suffix}`,
      art: "desk",
      solid: true,
      say: "책이 산더미처럼 쌓인 책상이야.\n맨 위 책은 「용감한 공주 이야기 3권」.",
      detail: "책갈피가 마지막 장에 꽂혀 있어. 누군가 끝까지 다 읽었구나.",
    },
    {
      id: `broom-${suffix}`,
      art: "broom",
      solid: true,
      say: "빗자루가 혼자 스윽 움직인 것 같은데… 기분 탓이겠지?",
      detail: "손잡이가 반질반질해. 누군가 아주 오래 쥐고 쓸었나 봐.",
    },
    {
      id: `plant-${suffix}`,
      art: "plant",
      solid: true,
      say: "구석에 놓인 화분이야.",
      detail: "잎끝이 아주 조금 초록색이야. 아직 살아 있어!",
    },
  ];
}

/** 숫자를 숨겨 둘 수 있는 물건 — 그림 종류만 스테이지가 고른다. */
export const HOLDER_TEMPLATES: Record<
  string,
  { art: PropArt; name: string; say: string; detail: string }
> = {
  mirror: {
    art: "mirror",
    name: "김이 서리는 거울",
    say: "후— 하고 입김을 불자 거울에 김이 서리며 숫자가 떠올랐어!",
    detail: "숫자 획이 손가락으로 그은 자국이야. 누가 김 위에 써 놓고 갔어.",
  },
  portrait: {
    art: "portrait",
    name: "뒤집힌 초상화",
    say: "그림을 살짝 들추니 뒷면에 분필로 쓴 숫자가 있었어!",
    detail: "분필 가루가 아직 손에 묻어나. 아주 최근에 쓴 글씨야.",
  },
  plant: {
    art: "plant",
    name: "흙이 파헤쳐진 화분",
    say: "흙을 파 보니 숫자가 새겨진 나무 조각이 나왔어!",
    detail: "조각 가장자리가 반들반들해. 누가 자주 만졌나 봐.",
  },
  desk: {
    art: "desk",
    name: "서랍 달린 책상",
    say: "삐걱— 서랍을 열자 안쪽 바닥에 숫자가 큼직하게 적혀 있어!",
    detail: "서랍 안에 지우개 가루가 남았어. 한 번 고쳐 쓴 숫자구나.",
  },
  crate: {
    art: "crate",
    name: "먼지 앉은 상자",
    say: "상자를 기울이니 바닥에 숫자가 새겨져 있었어!",
    detail: "새긴 자국이 깊어. 못으로 꾹꾹 눌러 팠나 봐.",
  },
  armor: {
    art: "armor",
    name: "속이 텅 빈 갑옷",
    say: "투구를 벗겨 보니 안쪽에 숫자가 새겨져 있어!",
    detail: "숫자 옆에 아주 작게 「비밀」이라고 적혀 있어.",
  },
  telescope: {
    art: "telescope",
    name: "오래된 망원경",
    say: "망원경을 들여다보니 렌즈 가장자리에 숫자가 새겨져 있어!",
    detail: "렌즈를 닦자 숫자가 더 또렷해졌어.",
  },
};

// ---------------------------------------------------------------------------
// 스테이지 1 — 달빛 성
// ---------------------------------------------------------------------------

const STAGE_1: StageSpec = {
  id: 1,
  rooms: [
    {
      name: "먼지 쌓인 현관",
      theme: "hall",
      intro: "쿵! 뒤에서 문이 잠겼어. 가운데 상자 안에 열쇠가 있는 것 같은데… 자물쇠가 걸렸네.",
      hint: "촛불을 정해진 순서로 켜야 상자가 열려. 초를 하나씩 살펴봐!",
      kind: "order",
      lightNoun: "촛대",
      chestName: "자물쇠 걸린 상자",
      clue: {
        id: "portrait",
        art: "portrait",
        name: "성주님의 초상화",
        solid: true,
        say: "초상화 속 성주님이 너를 보며 조용히 말해.\n\n「나는 촛불을 켤 때 가장 짧게 남은 초부터 켠단다.\n오래 탔다는 건 그만큼 사랑받았다는 뜻이니까.」",
        detail: "성주님 손에 몽당초 한 자루가 들려 있어. 정말 짧은 초를 아끼시나 봐.",
      },
      extras: [
        {
          id: "armor1",
          art: "armor",
          name: "속이 텅 빈 갑옷",
          solid: true,
          say: "투구를 조심조심 들춰 봤어. 안에는 거미줄만 잔뜩!",
          detail: "가슴팍에 발톱 자국이 세 줄. 예전에 이 성에 고양이가 살았나 봐.",
        },
        ...common("1a"),
      ],
    },
    {
      name: "속삭이는 도서관",
      theme: "library",
      intro: "책장 사이에서 누가 킥킥 웃는다. 유령 사서 뽀글이가 나타났어!",
      hint: "뽀글이에게 말을 걸어 수수께끼를 풀자.",
      kind: "quiz",
      askerName: "유령 사서 뽀글이",
      extras: [
        {
          id: "note2",
          art: "note",
          solid: true,
          say: "「도서관 규칙 1번: 조용히 하기.」\n…아무도 없는데 자꾸 속삭이는 소리가 들려.",
          detail: "규칙 2번은 지워졌는데, 남은 글자가 「ㅁ… 물어보기」처럼 보여.",
        },
        ...common("1b"),
      ],
    },
    {
      name: "시계탑",
      theme: "clock",
      intro: "커다란 태엽이 째깍째깍. 바닥에 색색깔 종 네 개가 박혀 있어.",
      hint: "종이 울린 순서 그대로 밟아 봐!",
      kind: "sequence",
      deviceName: "커다란 태엽 장치",
      extras: [
        {
          id: "candle3a",
          art: "candle",
          solid: true,
          tint: "#ffb703",
          say: "촛불이 째깍째깍 박자에 맞춰 흔들려.",
          detail: "심지가 톱니바퀴 모양으로 꼬여 있어. 시계탑다운 초야!",
        },
        ...common("1c"),
      ],
    },
    {
      name: "거울의 방",
      theme: "mirror",
      intro: "사방이 거울! 문에는 숫자 세 개짜리 자물쇠가 달려 있어.",
      hint: "방 안에 숨은 숫자 3개를 찾아 문에 입력하자.",
      kind: "code",
      holderArts: ["mirror", "portrait", "plant", "desk", "crate"],
      extras: [
        {
          id: "mirrorB",
          art: "mirror",
          solid: true,
          say: "네 얼굴이 비쳐. 머리 리본이 살짝 삐뚤어졌네!",
          detail: "거울 속 네가 너보다 반 박자 늦게 움직이는 것 같기도… 기분 탓이야!",
        },
        {
          id: "keySign1",
          art: "keypadSign",
          solid: true,
          say: "「문 앞에 서서 살펴보면 숫자를 누를 수 있어요.」",
          detail: "안내판 구석에 「틀려도 몇 번이든 다시!」라고 적혀 있어.",
        },
      ],
    },
    {
      name: "달빛 옥상",
      theme: "rooftop",
      intro: "지붕 위로 나왔어! 커다란 달이 코앞이야. 마지막 문이 저기 보인다.",
      hint: "별 상자 2개를 달 표식 위로 밀어 놓자.",
      kind: "push",
      extras: [
        {
          id: "telescope1",
          art: "telescope",
          solid: true,
          say: "망원경으로 달을 봤어.\n달 표면에 별 모양 자국이 두 개 나 있어!",
          detail: "렌즈에 「달빛 성 천문대」라고 새겨져 있어. 이 성의 물건이구나.",
        },
        {
          id: "poggle1",
          art: "ghost",
          name: "따라온 뽀글이",
          solid: true,
          say: "뽀글이: 「상자는 밀 수만 있어. 당길 순 없다구!\n막히면 아래 버튼으로 다시 놓으면 돼.」",
          detail: "뽀글이가 웃을 때마다 몸이 살짝 투명해져. 기분이 좋은가 봐!",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 스테이지 2 — 잠긴 지하 감옥
// ---------------------------------------------------------------------------

const STAGE_2: StageSpec = {
  id: 2,
  rooms: [
    {
      name: "눅눅한 감방",
      theme: "cell",
      intro: "철컹! 감방 문이 닫혔어. 창살 너머로 유령 죄수가 빙긋 웃는다.",
      hint: "꼬물이에게 말을 걸어 수수께끼를 풀자.",
      kind: "quiz",
      askerName: "유령 죄수 꼬물이",
      extras: [
        {
          id: "note2a",
          art: "note",
          name: "벽에 새긴 낙서",
          solid: true,
          say: "「여기 있었다. 나가는 법은 하나뿐. 물어보는 것.」",
          detail: "글씨 옆에 작대기가 스물세 개. 스물세 밤을 세었나 봐.",
        },
        ...common("2a"),
      ],
    },
    {
      name: "간수실",
      theme: "guard",
      intro: "간수는 어디 갔지? 책상 위에 커다란 자물쇠 장부만 놓여 있어.",
      hint: "방 안에 숨은 숫자 3개를 찾아 철문에 입력하자.",
      kind: "code",
      holderArts: ["desk", "crate", "armor", "portrait", "mirror"],
      extras: [
        {
          id: "keySign2",
          art: "keypadSign",
          solid: true,
          say: "「철문 앞에 서서 살펴보면 숫자를 누를 수 있음.」",
          detail: "누가 연필로 「나도 자꾸 까먹음」이라고 덧붙여 놨어.",
        },
        ...common("2b"),
      ],
    },
    {
      name: "먼지투성이 창고",
      theme: "storage",
      intro: "낡은 짐이 산더미. 벽에 걸린 횃불 네 개가 나란히 꺼져 있어.",
      hint: "횃불을 정해진 순서로 켜야 상자가 열려. 하나씩 살펴봐!",
      kind: "order",
      lightNoun: "횃불",
      chestName: "쇠사슬 감긴 궤짝",
      clue: {
        id: "clue2",
        art: "note",
        name: "간수의 수첩",
        solid: true,
        say: "간수의 손글씨야.\n\n「횃불은 언제나 가장 짧게 닳은 것부터 붙인다.\n오래 쓴 놈이 제일 잘 붙으니까.」",
        detail: "수첩 귀퉁이에 짧은 횃불이 그려져 있고 「1번」이라고 적혀 있어.",
      },
      extras: [
        {
          id: "armor2",
          art: "armor",
          name: "녹슨 갑옷",
          solid: true,
          say: "간수가 입던 갑옷인가 봐. 어깨가 축 처져 있어.",
          detail: "가슴팍에 「야간 근무」라고 적힌 이름표가 달려 있어.",
        },
        ...common("2c"),
      ],
    },
    {
      name: "물 새는 하수구",
      theme: "sewer",
      intro: "찰박찰박. 발목까지 물이 찼어. 저쪽에 달 표식 두 개가 반짝인다.",
      hint: "별 상자 2개를 달 표식 위로 밀어 놓자.",
      kind: "push",
      extras: [
        {
          id: "ghost2",
          art: "ghost",
          name: "물방울 유령",
          solid: true,
          say: "유령: 「상자는 밀 수만 있어! 물에 젖어서 더 안 당겨져.」",
          detail: "말할 때마다 물방울이 톡톡 떨어져. 유령인데도 젖었네?",
        },
        ...common("2d"),
      ],
    },
    {
      name: "종탑 계단",
      theme: "belfry",
      intro: "계단 끝에 경보 종 네 개! 순서대로 울리면 바깥문이 열린대.",
      hint: "종이 울린 순서 그대로 밟아 봐!",
      kind: "sequence",
      deviceName: "녹슨 도르래",
      extras: [
        {
          id: "note2e",
          art: "note",
          solid: true,
          say: "「도르래를 당기면 경보 순서를 다시 들려준다.」",
          detail: "그 아래 — 「몇 번을 다시 들어도 혼나지 않는다.」",
        },
        ...common("2e"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 스테이지 3 — 물에 잠긴 서고
// ---------------------------------------------------------------------------

const STAGE_3: StageSpec = {
  id: 3,
  rooms: [
    {
      name: "얕은 물가",
      theme: "shallow",
      intro: "여기서부터 물이야. 물 위에 등불 네 개가 둥둥 떠 있어.",
      hint: "등불을 정해진 순서로 켜야 궤짝이 열려. 하나씩 살펴봐!",
      kind: "order",
      lightNoun: "등불",
      chestName: "물에 뜬 나무 궤짝",
      clue: {
        id: "clue3",
        art: "portrait",
        name: "젖은 초상화",
        solid: true,
        say: "물에 젖어 흐릿한 사서의 초상화야.\n\n「등불은 가장 짧게 닳은 것부터 켜야 물이 잔잔해진단다.」",
        detail: "액자 아래쪽이 물에 잠겨 색이 다 빠졌어.",
      },
      extras: [
        {
          id: "plant3a",
          art: "plant",
          name: "물풀 화분",
          solid: true,
          say: "물속에서도 잘 자라는 물풀이야.",
          detail: "잎에 작은 물방울이 구슬처럼 맺혔어.",
        },
        ...common("3a"),
      ],
    },
    {
      name: "젖은 서고",
      theme: "wetShelf",
      intro: "책들이 퉁퉁 불었어. 책장 뒤에서 물방울 요정이 빼꼼 내다본다.",
      hint: "또랑이에게 말을 걸어 수수께끼를 풀자.",
      kind: "quiz",
      askerName: "물방울 요정 또랑이",
      extras: [
        {
          id: "note3b",
          art: "note",
          solid: true,
          say: "「젖은 책은 펼치지 마세요. 찢어집니다.」",
          detail: "정작 이 쪽지도 흠뻑 젖어서 글씨가 번졌어.",
        },
        ...common("3b"),
      ],
    },
    {
      name: "분수대 광장",
      theme: "fountain",
      intro: "커다란 분수대 둘레에 물종 네 개! 물방울이 튈 때마다 소리가 나.",
      hint: "종이 울린 순서 그대로 밟아 봐!",
      kind: "sequence",
      deviceName: "분수대 손잡이",
      extras: [
        {
          id: "note3c",
          art: "note",
          solid: true,
          say: "「손잡이를 돌리면 물종이 처음부터 다시 울린다.」",
          detail: "손잡이가 반들반들해. 다들 여러 번 돌렸구나!",
        },
        ...common("3c"),
      ],
    },
    {
      name: "등불 복도",
      theme: "lantern",
      intro: "물이 빠진 복도야. 끝에 숫자 자물쇠가 달린 문이 보여.",
      hint: "방 안에 숨은 숫자 3개를 찾아 문에 입력하자.",
      kind: "code",
      holderArts: ["mirror", "desk", "crate", "plant", "telescope"],
      extras: [
        {
          id: "keySign3",
          art: "keypadSign",
          solid: true,
          say: "「문 앞에 서서 살펴보면 숫자를 누를 수 있어요.」",
          detail: "물에 젖어 글씨가 조금 번졌지만 읽을 수는 있어.",
        },
        ...common("3d"),
      ],
    },
    {
      name: "나룻배 선착장",
      theme: "dock",
      intro: "나룻배가 기다리고 있어! 배를 띄우려면 표식 위에 무게를 실어야 해.",
      hint: "별 상자 2개를 달 표식 위로 밀어 놓자.",
      kind: "push",
      extras: [
        {
          id: "telescope3",
          art: "telescope",
          solid: true,
          say: "망원경으로 물 건너를 봤어. 저 멀리 성문이 보인다!",
          detail: "렌즈에 소금기가 하얗게 앉았어. 바다 가까운가 봐.",
        },
        ...common("3e"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 스테이지 4 — 반짝이는 얼음 궁전
// ---------------------------------------------------------------------------

const STAGE_4: StageSpec = {
  id: 4,
  rooms: [
    {
      name: "얼음 현관",
      theme: "iceHall",
      intro: "발밑이 미끄러워! 바닥에 얼음 종 네 개가 박혀 있어.",
      hint: "종이 울린 순서 그대로 밟아 봐!",
      kind: "sequence",
      deviceName: "얼음 오르골",
      extras: [
        {
          id: "note4a",
          art: "note",
          solid: true,
          say: "「오르골을 감으면 얼음 종이 처음부터 다시 울린다.」",
          detail: "종이가 얼어서 뻣뻣해. 만지면 바스락 소리가 나.",
        },
        ...common("4a"),
      ],
    },
    {
      name: "서리 정원",
      theme: "frost",
      intro: "서리꽃이 잔뜩 피었어. 문에는 숫자 세 개짜리 얼음 자물쇠가 달려 있어.",
      hint: "방 안에 숨은 숫자 3개를 찾아 문에 입력하자.",
      kind: "code",
      holderArts: ["mirror", "plant", "crate", "portrait", "telescope"],
      extras: [
        {
          id: "keySign4",
          art: "keypadSign",
          solid: true,
          say: "「얼음 자물쇠는 세 자리. 장갑을 벗고 누르세요.」",
          detail: "누르는 자리만 얼음이 닳아 반들반들해.",
        },
        ...common("4b"),
      ],
    },
    {
      name: "눈사람 광장",
      theme: "snowyard",
      intro: "눈사람이 잔뜩! 그중 하나가 갑자기 눈을 깜빡였어.",
      hint: "눈사람에게 말을 걸어 수수께끼를 풀자.",
      kind: "quiz",
      askerName: "말하는 눈사람 도리",
      extras: [
        {
          id: "note4c",
          art: "note",
          solid: true,
          say: "「눈사람에게 뜨거운 걸 주지 마세요. 아주 슬퍼합니다.」",
          detail: "밑에 작게 「대신 수수께끼를 좋아함」이라고 적혀 있어.",
        },
        ...common("4c"),
      ],
    },
    {
      name: "고드름 복도",
      theme: "icicle",
      intro: "천장에 고드름이 주렁주렁. 얼음등 네 개가 꺼진 채로 서 있어.",
      hint: "얼음등을 정해진 순서로 켜야 상자가 열려. 하나씩 살펴봐!",
      kind: "order",
      lightNoun: "얼음등",
      chestName: "꽁꽁 언 보물상자",
      clue: {
        id: "clue4",
        art: "mirror",
        name: "성에 낀 거울",
        solid: true,
        say: "성에를 닦아 내자 글씨가 나타났어.\n\n「얼음등은 가장 짧게 녹은 것부터 켜야 한다.\n많이 녹았다는 건 그만큼 오래 빛났다는 뜻.」",
        detail: "글씨를 쓴 손가락 자국이 아직 남아 있어.",
      },
      extras: [
        {
          id: "plant4d",
          art: "plant",
          name: "얼음꽃 화분",
          solid: true,
          say: "유리처럼 투명한 얼음꽃이야.",
          detail: "가까이 가면 꽃잎이 아주 조금 녹아서 반짝여.",
        },
        ...common("4d"),
      ],
    },
    {
      name: "오로라 발코니",
      theme: "aurora",
      intro: "하늘에 초록 오로라가 넘실! 마지막 문이 저 끝에 있어.",
      hint: "별 상자 2개를 달 표식 위로 밀어 놓자.",
      kind: "push",
      extras: [
        {
          id: "telescope4",
          art: "telescope",
          solid: true,
          say: "망원경으로 오로라를 봤어. 초록 빛이 물결처럼 흘러가!",
          detail: "렌즈에 김이 서릴 만큼 밖이 추워.",
        },
        {
          id: "ghost4",
          art: "ghost",
          name: "눈송이 유령",
          solid: true,
          say: "유령: 「상자는 밀 수만 있어. 얼음 위라 잘 미끄러질걸?」",
          detail: "몸에서 작은 눈송이가 하나씩 떨어져 내려.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 스테이지 5 — 별빛 정원
// ---------------------------------------------------------------------------

const STAGE_5: StageSpec = {
  id: 5,
  rooms: [
    {
      name: "덩굴 대문",
      theme: "vine",
      intro: "덩굴이 대문을 칭칭 감았어. 숫자 세 개를 맞춰야 풀린대.",
      hint: "정원에 숨은 숫자 3개를 찾아 대문에 입력하자.",
      kind: "code",
      holderArts: ["plant", "crate", "desk", "mirror", "telescope"],
      extras: [
        {
          id: "keySign5",
          art: "keypadSign",
          solid: true,
          say: "「대문 앞에 서서 살펴보면 숫자를 누를 수 있어요.」",
          detail: "안내판을 덩굴이 반쯤 덮었어. 살짝 걷어 내야 보여.",
        },
        ...common("5a"),
      ],
    },
    {
      name: "반딧불이 숲",
      theme: "firefly",
      intro: "깜깜해! 반딧불 램프 네 개가 나뭇가지에 걸려 있어.",
      hint: "램프를 정해진 순서로 켜야 상자가 열려. 하나씩 살펴봐!",
      kind: "order",
      lightNoun: "반딧불 램프",
      chestName: "덩굴 감긴 상자",
      clue: {
        id: "clue5",
        art: "ghost",
        name: "반딧불 요정 초롱이",
        solid: true,
        say: "요정: 「우리는 가장 짧게 남은 램프부터 켜!\n많이 닳았다는 건 제일 오래 우릴 비춰 줬다는 뜻이니까.」",
        detail: "요정 손에 아주 작은 몽당 램프가 들려 있어.",
      },
      extras: [
        {
          id: "plant5b",
          art: "plant",
          name: "밤에 피는 꽃",
          solid: true,
          say: "깜깜해지면 피어나는 꽃이래.",
          detail: "꽃잎 안쪽이 은은하게 빛나. 반딧불이가 여기 모이는구나!",
        },
        ...common("5b"),
      ],
    },
    {
      name: "요정 연못",
      theme: "pond",
      intro: "연못 한가운데 연잎 위에 요정이 앉아 있어. 널 기다린 눈치야.",
      hint: "요정에게 말을 걸어 수수께끼를 풀자.",
      kind: "quiz",
      askerName: "연못 요정 하늘이",
      extras: [
        {
          id: "note5c",
          art: "note",
          solid: true,
          say: "「연못에 돌을 던지지 마세요. 요정이 깜짝 놀랍니다.」",
          detail: "밑에 작게 「대신 말을 걸어 주세요」라고 적혀 있어.",
        },
        ...common("5c"),
      ],
    },
    {
      name: "별자리 계단",
      theme: "starstair",
      intro: "계단마다 별종이 하나씩! 밟으면 딸랑 소리가 나며 별이 켜져.",
      hint: "종이 울린 순서 그대로 밟아 봐!",
      kind: "sequence",
      deviceName: "별 회전판",
      extras: [
        {
          id: "note5d",
          art: "note",
          solid: true,
          say: "「회전판을 돌리면 별종이 처음부터 다시 울린다.」",
          detail: "회전판 둘레에 별자리가 조그맣게 새겨져 있어.",
        },
        ...common("5d"),
      ],
    },
    {
      name: "하늘 전망대",
      theme: "observatory",
      intro: "정원 꼭대기 전망대야! 여기만 지나면 정말 밖으로 나갈 수 있어.",
      hint: "별 상자 2개를 달 표식 위로 밀어 놓자.",
      kind: "push",
      extras: [
        {
          id: "telescope5",
          art: "telescope",
          solid: true,
          say: "망원경으로 밤하늘을 봤어. 별이 쏟아질 것 같아!",
          detail: "렌즈에 「끝까지 온 사람만 볼 수 있음」이라고 새겨져 있어.",
        },
        {
          id: "ghost5",
          art: "ghost",
          name: "마중 나온 뽀글이",
          solid: true,
          say: "뽀글이: 「여기까지 오다니! 상자만 올리면 진짜 끝이야.」",
          detail: "뽀글이가 신나서 빙글빙글 돌고 있어.",
        },
      ],
    },
  ],
};

export const STAGE_SPECS: StageSpec[] = [STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5];
