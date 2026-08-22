import { COLS, ROWS } from "./constants";
import { RIDDLES } from "./riddles";
import { HOLDER_TEMPLATES, STAGE_SPECS } from "./stageData";
import type { ExtraProp, RoomSpec } from "./stageData";
import type { PropDef, RoomDef } from "./types";

/**
 * 스테이지 1 「달빛 성」 — 다섯 개의 방.
 *
 * 방의 벽 모양은 고정이지만, **물건 자리와 문제는 한 판마다 새로 뽑는다.**
 * 같은 스테이지를 다시 해도 촛대가 다른 구석에 서 있고, 뽀글이는 다른
 * 수수께끼를 내고, 자물쇠 숫자도 달라진다.
 *
 * layout 문자
 *   #  벽        .  바닥        S  시작 위치      D  다음 방으로 가는 문
 *   B  책장(막힘) 1~4 바닥 종    X  달 표식        O  별 상자 시작 위치
 *
 * 각 줄은 정확히 COLS(15)글자, 줄 수는 ROWS(11)개여야 한다.
 */

type Spot = [number, number];

// ---------------------------------------------------------------------------
// 뽑기 도구
// ---------------------------------------------------------------------------

function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// ---------------------------------------------------------------------------
// 방 모양 (고정)
// ---------------------------------------------------------------------------

const OPEN_ROOM = [
  "###############",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#S............D",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "###############",
];

const LIBRARY_ROOM = [
  "###############",
  "#.............#",
  "#.BBB...BBB...#",
  "#.............#",
  "#.BBB...BBB...#",
  "#S............D",
  "#.BBB...BBB...#",
  "#.............#",
  "#.BBB...BBB...#",
  "#.............#",
  "###############",
];

/**
 * 종은 저마다 막다른 벽감 안에 있다.
 *
 * 뻥 뚫린 방에 종을 놓았더니, 종에서 종으로 걸어가는 길에 다른 종을 밟고
 * 지나가 순서가 초기화됐다. 벽감에 넣으면 일부러 들어가지 않는 한 밟히지
 * 않는다.
 */
const CLOCK_ROOM = [
  "###############",
  "#.............#",
  "#.#1#.....#2#.#",
  "#.###.....###.#",
  "#.............#",
  "#S............D",
  "#.............#",
  "#.###.....###.#",
  "#.#3#.....#4#.#",
  "#.............#",
  "###############",
];

/** 별 상자 배치 — 전부 손으로 풀어 보고 확인한 것들 */
const PUSH_LAYOUTS = [
  // 아래에서 위로 민 다음 가운데로 모으기
  [
    "###############",
    "#.............#",
    "#.............#",
    "#.....X.X.....#",
    "#.............#",
    "#S............D",
    "#.............#",
    "#...O.....O...#",
    "#.............#",
    "#.............#",
    "###############",
  ],
  // 위에서 아래로 민 다음 가운데로 모으기
  [
    "###############",
    "#.............#",
    "#.............#",
    "#...O.....O...#",
    "#.............#",
    "#S............D",
    "#.............#",
    "#.....X.X.....#",
    "#.............#",
    "#.............#",
    "###############",
  ],
  // 곧게 아래로만 네 번
  [
    "###############",
    "#.............#",
    "#.............#",
    "#....O...O....#",
    "#.............#",
    "#S............D",
    "#.............#",
    "#....X...X....#",
    "#.............#",
    "#.............#",
    "###############",
  ],
];

// ---------------------------------------------------------------------------
// 물건 자리 뽑기
// ---------------------------------------------------------------------------

function tileAt(layout: string[], x: number, y: number): string {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return "#";
  return layout[y][x];
}

function findChar(layout: string[], ch: string): Spot {
  for (let y = 0; y < ROWS; y++) {
    const x = layout[y].indexOf(ch);
    if (x >= 0) return [x, y];
  }
  return [1, 1];
}

/**
 * 물건을 놓아도 되는 칸.
 *
 * 시작 자리와 문 앞은 비워 둔다. 거기가 막히면 방에 들어서자마자 갇히거나
 * 문 앞에 설 수 없게 된다.
 */
function placeableSpots(layout: string[]): Spot[] {
  const [sx, sy] = findChar(layout, "S");
  const [dx, dy] = findChar(layout, "D");
  const out: Spot[] = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (tileAt(layout, x, y) !== ".") continue;
      if (x === sx && y === sy) continue;
      if (Math.abs(x - sx) + Math.abs(y - sy) <= 1) continue;
      if (Math.abs(x - dx) + Math.abs(y - dy) <= 1) continue;
      out.push([x, y]);
    }
  }
  return out;
}

/** 시작 자리에서 걸어서 닿을 수 있는 칸 전부 */
function reachable(def: RoomDef): Set<string> {
  const solid = new Set(def.props.filter((p) => p.solid).map((p) => `${p.tx},${p.ty}`));
  const start = findChar(def.layout, "S");
  const seen = new Set<string>([`${start[0]},${start[1]}`]);
  const queue: Spot[] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.shift() as Spot;
    for (const [ax, ay] of [
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
      [x + 1, y],
    ] as Spot[]) {
      const ch = tileAt(def.layout, ax, ay);
      if (ch === "#" || ch === "B" || ch === "D") continue;
      const key = `${ax},${ay}`;
      if (seen.has(key) || solid.has(key)) continue;
      seen.add(key);
      queue.push([ax, ay]);
    }
  }
  return seen;
}

/**
 * 뽑아 놓은 방이 정말 풀리는지 확인한다.
 *
 * 물건을 아무 데나 흩어 놓으면 통로를 막아 문이나 물건에 못 가는 배치가
 * 가끔 나온다. 그런 판은 버리고 다시 뽑는 편이, 자리를 손으로 일일이
 * 정해 두는 것보다 훨씬 안전하다.
 */
function isSolvable(def: RoomDef): boolean {
  const seen = reachable(def);
  const near = (x: number, y: number) =>
    [
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
      [x + 1, y],
    ].some(([ax, ay]) => seen.has(`${ax},${ay}`));

  const [dx, dy] = findChar(def.layout, "D");
  if (!near(dx, dy)) return false;

  // 살펴봐야 하는 물건은 전부 앞에 설 수 있어야 한다
  for (const p of def.props) {
    if (p.solid && !near(p.tx, p.ty)) return false;
  }

  // 바닥 종은 밟을 수 있어야 하고, 별 상자와 달 표식은 옆에 설 수 있어야 한다
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = tileAt(def.layout, x, y);
      if (ch >= "1" && ch <= "4") {
        if (!seen.has(`${x},${y}`)) return false;
      } else if (ch === "O" || ch === "X") {
        if (!near(x, y)) return false;
      }
    }
  }
  return true;
}

/** 풀리는 배치가 나올 때까지 다시 뽑는다. */
function build(make: () => RoomDef): RoomDef {
  for (let i = 0; i < 200; i++) {
    const def = make();
    if (isSolvable(def)) return def;
  }
  // 여기까지 올 일은 없지만, 최후에는 길을 막는 물건을 빼고라도 진행되게 한다
  const bare = make();
  return { ...bare, props: bare.props.filter((p) => !p.solid) };
}

// ---------------------------------------------------------------------------
// 순서 퍼즐 — 짧게 남은 것부터 켜기
// ---------------------------------------------------------------------------

/** 남은 길이별 설명. 짧은 것부터 켜야 하므로 길이가 곧 정답 순서다. */
const LIGHT_LEVELS = [
  {
    burn: 0.18,
    say: "거의 다 타서 손가락 한 마디만 남았어.",
    detail: "촛농이 산더미처럼 쌓였어. 여기서 제일 많이 쓴 거구나.",
  },
  {
    burn: 0.45,
    say: "반쯤 타서 절반만 남았어.",
    detail: "심지가 까맣게 그을렸어. 켰다 껐다 여러 번 했나 봐.",
  },
  {
    burn: 0.72,
    say: "조금밖에 안 타서 아직 길쭉해.",
    detail: "촛농이 딱 한 줄 흘렀어. 몇 번 안 켰다는 뜻이야.",
  },
  {
    burn: 1,
    say: "새것 그대로라 제일 길어.",
    detail: "심지가 새하얘. 정말 한 번도 불을 붙인 적이 없어.",
  },
];

const LIGHT_COLORS = [
  { id: "lightBlue", color: "파란", tint: "#9be7ff" },
  { id: "lightOrange", color: "주황", tint: "#ffb703" },
  { id: "lightGreen", color: "초록", tint: "#8affc1" },
  { id: "lightPurple", color: "보라", tint: "#c77dff" },
];

function placeExtras(
  extras: ExtraProp[],
  count: number,
  next: () => Spot,
): PropDef[] {
  return shuffle(extras)
    .slice(0, count)
    .map((p) => {
      const [tx, ty] = next();
      return { ...p, tx, ty };
    });
}

function makeOrderRoom(spec: RoomSpec): RoomDef {
  const spots = shuffle(placeableSpots(OPEN_ROOM));
  let i = 0;
  const next = (): Spot => spots[i++];
  const noun = spec.lightNoun ?? "촛대";

  // 어느 색이 몇 번째로 짧은지는 판마다 달라진다
  const lights = shuffle(LIGHT_COLORS).map((c, idx) => {
    const level = LIGHT_LEVELS[idx];
    const [tx, ty] = next();
    return {
      id: c.id,
      tx,
      ty,
      art: "candle" as const,
      name: `${c.color} ${noun}`,
      solid: true,
      tint: c.tint,
      burn: level.burn,
      say: `${c.color}빛 ${noun}야.\n${level.say}`,
      detail: level.detail,
    };
  });

  const [chestX, chestY] = next();
  const [noteX, noteY] = next();
  const clueSpot = next();

  return {
    name: spec.name,
    theme: spec.theme,
    intro: spec.intro,
    hint: spec.hint,
    layout: OPEN_ROOM,
    props: [
      {
        id: "chest",
        tx: chestX,
        ty: chestY,
        art: "chest",
        name: spec.chestName ?? "자물쇠 걸린 상자",
        solid: true,
        detail: `자물쇠 위에 ${noun} 네 개가 나란히 새겨져 있어.`,
      },
      {
        id: "orderNote",
        tx: noteX,
        ty: noteY,
        art: "note",
        name: "구겨진 쪽지",
        solid: true,
        say: `「이 방의 ${noun} 네 개를 정해진 순서로 켜면 상자가 열린다.\n한 번이라도 순서가 틀리면 전부 꺼진다.」`,
        detail: "정작 순서는 안 적혀 있어. 누군가는 알고 있을 텐데…",
      },
      ...(spec.clue ? [{ ...spec.clue, tx: clueSpot[0], ty: clueSpot[1] }] : []),
      ...lights,
      ...placeExtras(spec.extras, 3, next),
    ],
    puzzle: {
      kind: "order",
      // 짧게 남은 것부터가 정답
      sequence: [...lights].sort((a, b) => a.burn - b.burn).map((c) => c.id),
      chestId: "chest",
      right: `네 번째 ${noun}에 불이 붙는 순간 자물쇠가 철컥!\n뚜껑이 스르르 열리고 안에서 녹슨 열쇠가 반짝였어.`,
      wrong: `휙— 불이 전부 꺼졌어!\n순서가 틀렸나 봐. 짧게 남은 ${noun}부터라고 했는데…`,
    },
  };
}

// ---------------------------------------------------------------------------
// 수수께끼 퍼즐
// ---------------------------------------------------------------------------

function makeQuizRoom(spec: RoomSpec): RoomDef {
  const spots = shuffle(placeableSpots(LIBRARY_ROOM));
  let i = 0;
  const next = (): Spot => spots[i++];

  const riddle = pick(RIDDLES);
  // 보기 순서도 섞는다. 늘 첫 번째가 정답이면 금방 눈치챈다.
  const choices = shuffle([riddle.answer, ...riddle.wrong]);
  const asker = spec.askerName ?? "유령";
  const shortName = asker.split(" ").pop() ?? asker;
  const [gx, gy] = next();

  return {
    name: spec.name,
    theme: spec.theme,
    intro: spec.intro,
    hint: spec.hint,
    layout: LIBRARY_ROOM,
    props: [
      { id: "poggle", tx: gx, ty: gy, art: "ghost", name: asker, solid: true },
      ...placeExtras(spec.extras, 3, next),
    ],
    puzzle: {
      kind: "quiz",
      askerId: "poggle",
      question: `${shortName}: 「자, 오늘의 수수께끼야!\n${riddle.question}」`,
      choices,
      answer: choices.indexOf(riddle.answer),
      right: `${shortName}: 「우와, 맞았어! ${riddle.why} 똑똑한걸?」`,
      wrong: `${shortName}: 「땡! 조건을 하나씩 다시 읽어 봐.」`,
    },
  };
}

// ---------------------------------------------------------------------------
// 종소리 순서 퍼즐
// ---------------------------------------------------------------------------

function makeSequenceRoom(spec: RoomSpec): RoomDef {
  // 장치는 바닥에 그려진 무늬의 한가운데라 자리가 고정이다
  const device: Spot = [7, 5];
  const spots = shuffle(
    placeableSpots(CLOCK_ROOM).filter(([x, y]) => !(x === device[0] && y === device[1])),
  );
  let i = 0;
  const next = (): Spot => spots[i++];

  return {
    name: spec.name,
    theme: spec.theme,
    intro: spec.intro,
    hint: spec.hint,
    layout: CLOCK_ROOM,
    props: [
      {
        id: "bigGear",
        tx: device[0],
        ty: device[1],
        art: "gear",
        name: spec.deviceName ?? "커다란 태엽 장치",
        solid: true,
      },
      ...placeExtras(spec.extras, 3, next),
    ],
    puzzle: { kind: "sequence", length: 4, replayId: "bigGear" },
  };
}

// ---------------------------------------------------------------------------
// 숫자 자물쇠 퍼즐
// ---------------------------------------------------------------------------

function makeCodeRoom(spec: RoomSpec): RoomDef {
  const spots = shuffle(placeableSpots(OPEN_ROOM));
  let i = 0;
  const next = (): Spot => spots[i++];

  // 숫자 세 개도, 어느 물건이 갖고 있는지도 판마다 새로 뽑는다
  const arts = spec.holderArts ?? ["mirror", "portrait", "plant", "desk", "crate"];
  const holders = shuffle(arts)
    .slice(0, 3)
    .map((art, idx) => ({ key: `holder${idx}`, ...HOLDER_TEMPLATES[art] }));

  const slots = holders.map((h) => ({
    propId: h.key,
    digit: String(Math.floor(Math.random() * 10)),
    say: h.say,
  }));

  const holderProps: PropDef[] = holders.map((h) => {
    const [tx, ty] = next();
    return { id: h.key, tx, ty, art: h.art, name: h.name, solid: true, detail: h.detail };
  });

  const [noteX, noteY] = next();
  const orderHint = holders.map((h, idx) => `${idx + 1}. ${h.name}`).join("\n");

  return {
    name: spec.name,
    theme: spec.theme,
    intro: spec.intro,
    hint: spec.hint,
    layout: OPEN_ROOM,
    props: [
      ...holderProps,
      {
        id: "codeNote",
        tx: noteX,
        ty: noteY,
        art: "note",
        name: "순서가 적힌 쪽지",
        solid: true,
        say: `「자물쇠는 세 자리. 이 순서로 찾아야 해.」\n\n${orderHint}`,
        detail: "쪽지 아래쪽에 작은 글씨 — 「순서를 지키지 않으면 안 열려.」",
      },
      ...placeExtras(spec.extras, 2, next),
    ],
    puzzle: { kind: "code", slots },
  };
}

// ---------------------------------------------------------------------------
// 상자 밀기 퍼즐
// ---------------------------------------------------------------------------

/**
 * 상자를 미는 길은 통째로 비워 둔다.
 *
 * 장식 물건 하나가 통로에 서 있으면 상자가 표식까지 못 가서 방이 안 풀린다.
 * 물건 앞에 설 수 있는지만 확인해서는 이걸 못 잡는다 — 상자가 지나갈 칸과
 * 밀 때 서야 하는 칸까지 다 비어 있어야 한다.
 */
function isPushLane(x: number, y: number): boolean {
  return y >= 2 && y <= 8 && x >= 3 && x <= 11;
}

function makePushRoom(spec: RoomSpec): RoomDef {
  const layout = pick(PUSH_LAYOUTS);
  const spots = shuffle(placeableSpots(layout).filter(([x, y]) => !isPushLane(x, y)));
  let i = 0;
  const next = (): Spot => spots[i++];
  const [noteX, noteY] = next();

  return {
    name: spec.name,
    theme: spec.theme,
    intro: spec.intro,
    hint: spec.hint,
    layout,
    props: [
      {
        id: "pushNote",
        tx: noteX,
        ty: noteY,
        art: "note",
        solid: true,
        say: "「별 상자를 달 표식 위에 올려 놓으면 문이 열린다.」",
        detail: "그 아래 — 「상자는 밀 수만 있다. 잘 생각하고 밀 것.」",
      },
      ...placeExtras(spec.extras, 2, next),
    ],
    puzzle: { kind: "push" },
  };
}

// ---------------------------------------------------------------------------

const BUILDERS = {
  order: makeOrderRoom,
  quiz: makeQuizRoom,
  sequence: makeSequenceRoom,
  code: makeCodeRoom,
  push: makePushRoom,
} as const;

/** 한 판에 쓸 다섯 개의 방을 새로 뽑는다. */
export function buildStage(stageId: number): RoomDef[] {
  const spec = STAGE_SPECS.find((s) => s.id === stageId) ?? STAGE_SPECS[0];
  return spec.rooms.map((room) => build(() => BUILDERS[room.kind](room)));
}

/**
 * 아직 판이 안 만들어졌을 때(서버 렌더링, 첫 HUD 값) 쓰는 빈 방.
 * 실제 게임은 언제나 buildStage()가 뽑아 준 방으로 돌아간다.
 */
export const STAGE1_FALLBACK: RoomDef[] = [
  {
    name: STAGE_SPECS[0].rooms[0].name,
    theme: STAGE_SPECS[0].rooms[0].theme,
    intro: "",
    hint: STAGE_SPECS[0].rooms[0].hint,
    layout: OPEN_ROOM,
    props: [],
    puzzle: { kind: "order", sequence: [], chestId: "chest", right: "", wrong: "" },
  },
];
