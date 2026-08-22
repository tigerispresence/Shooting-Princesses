import { playBell, playSfx } from "./audio";
import type { HeroLook } from "./constants";
import {
  HERO,
  PROP_NAMES,
  BELL_GAP_MS,
  BELL_LEAD_MS,
  BELL_ON_MS,
  CANVAS_W,
  COLS,
  CONFETTI_COLORS,
  MOVE_MS,
  ROOM_CLEAR_MS,
  ROWS,
  TILE,
  TOAST_MS,
  TOTAL_ROOMS,
} from "./constants";
import { buildStage } from "./rooms";
import type {
  Box,
  Dir,
  Reveal,
  GameState,
  HudState,
  Player,
  PropDef,
  RoomDef,
  RoomRuntime,
} from "./types";

export const DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// ---------------------------------------------------------------------------
// 맵 조회
// ---------------------------------------------------------------------------

export function tileAt(def: RoomDef, x: number, y: number): string {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return "#";
  return def.layout[y][x];
}

function isBlockedTile(ch: string): boolean {
  return ch === "#" || ch === "B";
}

export function propAt(def: RoomDef, x: number, y: number): PropDef | undefined {
  return def.props.find((p) => p.tx === x && p.ty === y);
}

export function boxAt(rt: RoomRuntime, x: number, y: number): Box | undefined {
  return rt.boxes.find((b) => b.tx === x && b.ty === y);
}

export function doorOf(def: RoomDef): { x: number; y: number } {
  for (let y = 0; y < ROWS; y++) {
    const x = def.layout[y].indexOf("D");
    if (x >= 0) return { x, y };
  }
  return { x: COLS - 1, y: Math.floor(ROWS / 2) };
}

function spawnOf(def: RoomDef): { x: number; y: number } {
  for (let y = 0; y < ROWS; y++) {
    const x = def.layout[y].indexOf("S");
    if (x >= 0) return { x, y };
  }
  return { x: 1, y: 1 };
}

export function targetsOf(def: RoomDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) if (def.layout[y][x] === "X") out.push({ x, y });
  }
  return out;
}

function startBoxes(def: RoomDef): Box[] {
  const out: Box[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) if (def.layout[y][x] === "O") out.push({ tx: x, ty: y });
  }
  return out;
}

/**
 * 살펴볼 거리가 있는 물건인지. 대사가 있거나, 그 방 퍼즐에 쓰이는 물건이면 참.
 * 화면에 "?"를 띄울지 정하는 데 쓴다 — 정작 열쇠가 든 초상화에 표시가 없으면
 * 아이는 그 앞을 그냥 지나친다.
 */
export function isInteractable(def: RoomDef, prop: PropDef): boolean {
  if (prop.say !== undefined) return true;
  const pz = def.puzzle;
  switch (pz.kind) {
    case "order":
      return prop.id === pz.chestId || pz.sequence.includes(prop.id);
    case "quiz":
      return prop.id === pz.askerId;
    case "sequence":
      return prop.id === pz.replayId;
    case "code":
      return pz.slots.some((sl) => sl.propId === prop.id);
    default:
      return false;
  }
}

/**
 * 촛대에 불이 켜져 있는지 / 상자가 열려 있는지.
 * 다른 방의 장식 촛불은 늘 켜져 있고, 순서 퍼즐의 촛대만 꺼진 채로 시작한다.
 */
export function isPropActive(def: RoomDef, rt: RoomRuntime, prop: PropDef): boolean {
  const pz = def.puzzle;
  if (pz.kind !== "order") return prop.art !== "chest";
  if (prop.id === pz.chestId) return rt.solved;
  if (pz.sequence.includes(prop.id)) return rt.lit.includes(prop.id);
  return true;
}

export function currentRoom(s: GameState): RoomDef {
  return s.defs[s.roomIndex];
}

export function currentRuntime(s: GameState): RoomRuntime {
  return s.rooms[s.roomIndex];
}

// ---------------------------------------------------------------------------
// 생성
// ---------------------------------------------------------------------------

/** 같은 종이 연달아 나오면 "두 번 밟으라는 건가?" 하고 헷갈리므로 피한다. */
function makeSequence(len: number): number[] {
  const out: number[] = [];
  while (out.length < len) {
    const n = 1 + Math.floor(Math.random() * 4);
    if (out.length > 0 && out[out.length - 1] === n) continue;
    out.push(n);
  }
  return out;
}

function initRuntime(def: RoomDef): RoomRuntime {
  return {
    solved: false,
    examined: {},
    keyFound: false,
    lit: [],
    digits: {},
    seq: def.puzzle.kind === "sequence" ? makeSequence(def.puzzle.length) : [],
    seqInput: 0,
    seqPlayAt: -1,
    seqPlayIdx: -1,
    bellFlash: {},
    boxes: startBoxes(def),
  };
}

function makePlayer(at: { x: number; y: number }): Player {
  return {
    tx: at.x,
    ty: at.y,
    fromTx: at.x,
    fromTy: at.y,
    dir: "right",
    moveAt: -1,
    steps: 0,
  };
}

export function createGame(
  now: number,
  look: HeroLook = HERO,
  stageId = 1,
): GameState {
  // 물건 자리와 문제는 판을 시작할 때 새로 뽑는다
  const defs = buildStage(stageId);
  return {
    look,
    defs,
    phase: "intro",
    roomIndex: 0,
    rooms: defs.map(initRuntime),
    player: makePlayer(spawnOf(defs[0])),
    held: null,
    toast: null,
    modal: null,
    particles: [],
    now,
    startedAt: now,
    finishedAt: 0,
    roomEnteredAt: now,
    doorOpenAt: -1,
    clearAt: -1,
    mistakes: 0,
  };
}

export function startGame(s: GameState, now: number): void {
  if (s.phase !== "intro") return;
  s.phase = "playing";
  s.startedAt = now;
  s.now = now;
  onEnterRoom(s, now);
}

function onEnterRoom(s: GameState, now: number): void {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  s.roomEnteredAt = now;
  toast(s, def.intro, now, 3600);
  if (def.puzzle.kind === "sequence" && !rt.solved) startPlayback(rt, now);
}

// ---------------------------------------------------------------------------
// 말풍선 / 파티클
// ---------------------------------------------------------------------------

function toast(s: GameState, text: string, now: number, ms = TOAST_MS): void {
  s.toast = { text, until: now + ms };
}

function sparkle(s: GameState, tx: number, ty: number, color: string, count: number): void {
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 110;
    s.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 520 + Math.random() * 420,
      maxLife: 900,
      color,
      size: 2 + Math.random() * 2.5,
    });
  }
}

function confetti(s: GameState): void {
  for (let i = 0; i < 90; i++) {
    s.particles.push({
      x: Math.random() * CANVAS_W,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 90,
      vy: 60 + Math.random() * 130,
      life: 2400 + Math.random() * 1600,
      maxLife: 4000,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 3 + Math.random() * 3,
    });
  }
}

function updateParticles(s: GameState, dt: number): void {
  const g = 260;
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      s.particles.splice(i, 1);
      continue;
    }
    p.vy += (g * dt) / 1000;
    p.x += (p.vx * dt) / 1000;
    p.y += (p.vy * dt) / 1000;
  }
}

// ---------------------------------------------------------------------------
// 이동
// ---------------------------------------------------------------------------

export function setHeld(s: GameState, dir: Dir | null): void {
  s.held = dir;
}

function beginMove(s: GameState, nx: number, ny: number, now: number): void {
  const p = s.player;
  p.fromTx = p.tx;
  p.fromTy = p.ty;
  p.tx = nx;
  p.ty = ny;
  p.moveAt = now;
  p.steps++;
  playSfx("step");
}

function tryStep(s: GameState, dir: Dir, now: number): void {
  const p = s.player;
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  p.dir = dir;

  const [dx, dy] = DELTA[dir];
  const nx = p.tx + dx;
  const ny = p.ty + dy;
  const ch = tileAt(def, nx, ny);

  if (ch === "D") {
    if (!rt.solved) {
      playSfx("bump");
      toast(s, `자물쇠가 굳게 잠겨 있어.\n${def.hint}`, now, 2600);
      return;
    }
    beginMove(s, nx, ny, now);
    return;
  }

  if (isBlockedTile(ch) || propAt(def, nx, ny)?.solid) {
    playSfx("bump");
    return;
  }

  const box = boxAt(rt, nx, ny);
  if (box) {
    // 상자는 미는 것만 된다. 진행 방향으로 한 칸이 비어 있어야 밀린다.
    const bx = nx + dx;
    const by = ny + dy;
    const bch = tileAt(def, bx, by);
    if (isBlockedTile(bch) || bch === "D" || propAt(def, bx, by)?.solid || boxAt(rt, bx, by)) {
      playSfx("bump");
      return;
    }
    box.tx = bx;
    box.ty = by;
    if (bch === "X") {
      playSfx("boxSet");
      sparkle(s, bx, by, "#fff3c4", 14);
    } else {
      playSfx("push");
    }
    checkPush(s, now);
  }

  beginMove(s, nx, ny, now);
}

/** 터치 버튼 한 번 = 한 칸. 키보드는 setHeld로 계속 걷는다. */
export function tapMove(s: GameState, dir: Dir, now: number): void {
  if (s.phase !== "playing" || s.player.moveAt >= 0) {
    // 이동 중이어도 방향은 바꿔 준다 — 다음 프레임에 이어서 걷도록.
    if (s.phase === "playing") s.player.dir = dir;
    return;
  }
  tryStep(s, dir, now);
}

function onArrive(s: GameState, now: number): void {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  const p = s.player;
  const ch = tileAt(def, p.tx, p.ty);

  if (ch === "D" && rt.solved) {
    s.phase = "roomClear";
    s.clearAt = now;
    sparkle(s, p.tx, p.ty, "#ffd166", 30);
    playSfx("roomClear");
    return;
  }

  if (def.puzzle.kind === "sequence" && !rt.solved && rt.seqPlayAt < 0 && ch >= "1" && ch <= "4") {
    const n = Number(ch);
    rt.bellFlash[n] = now + 380;
    playBell(n - 1);
    if (n === rt.seq[rt.seqInput]) {
      rt.seqInput++;
      sparkle(s, p.tx, p.ty, "#fff3c4", 8);
      if (rt.seqInput >= rt.seq.length) {
        solveRoom(s, now, "딸랑— 종소리가 딱 맞았어!\n\n문이 스르륵 열렸다!");
      }
    } else {
      rt.seqInput = 0;
      s.mistakes++;
      playSfx("wrong");
      toast(s, "앗, 순서가 달라! 다시 들려줄게.", now, 2400);
      startPlayback(rt, now);
    }
  }
}

// ---------------------------------------------------------------------------
// 퍼즐
// ---------------------------------------------------------------------------

function startPlayback(rt: RoomRuntime, now: number): void {
  rt.seqPlayAt = now;
  rt.seqPlayIdx = -1;
  rt.seqInput = 0;
  rt.bellFlash = {};
}

function advancePlayback(rt: RoomRuntime, now: number): void {
  const t = now - rt.seqPlayAt - BELL_LEAD_MS;
  if (t < 0) return;
  const unit = BELL_ON_MS + BELL_GAP_MS;
  const idx = Math.floor(t / unit);
  if (idx >= rt.seq.length) {
    rt.seqPlayAt = -1;
    return;
  }
  if (idx > rt.seqPlayIdx) {
    rt.seqPlayIdx = idx;
    const n = rt.seq[idx];
    playBell(n - 1);
    rt.bellFlash[n] = now + BELL_ON_MS;
  }
}

function solveRoom(s: GameState, now: number, message: string): void {
  const rt = currentRuntime(s);
  if (rt.solved) return;
  rt.solved = true;
  s.doorOpenAt = now;
  playSfx("doorOpen");
  toast(s, message, now, 3800);
  const d = doorOf(currentRoom(s));
  sparkle(s, d.x, d.y, "#ffd166", 26);
}

function checkPush(s: GameState, now: number): void {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  const targets = targetsOf(def);
  const done = targets.every((t) => rt.boxes.some((b) => b.tx === t.x && b.ty === t.y));
  if (done) solveRoom(s, now, "별 상자가 달빛을 받아 반짝인다!\n\n마지막 문이 열렸어!");
}

/** 상자가 구석에 끼었을 때 처음 자리로 돌려 놓는다. */
export function resetBoxes(s: GameState, now: number): void {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  if (def.puzzle.kind !== "push" || rt.solved) return;
  rt.boxes = startBoxes(def);
  toast(s, "별 상자를 처음 자리로 돌려 놓았어.", now, 2000);
  playSfx("examine");
}

// ---------------------------------------------------------------------------
// 살펴보기 (확인 버튼 / Space)
// ---------------------------------------------------------------------------

/**
 * 물건을 코앞까지 당겨 보는 화면을 띄운다.
 *
 * 열쇠를 찾는 순간처럼 방이 풀리는 경우에도 문은 바로 열지 않고 solveOnClose에
 * 담아 둔다. 열쇠가 툭 떨어지는 장면을 다 보고 나서 문이 열려야 순서가 맞다.
 */
interface InspectOpts {
  reveal?: Reveal | null;
  solveOnClose?: string | null;
  active?: boolean;
  action?: { label: string; propId: string } | null;
}

function openInspect(
  s: GameState,
  prop: PropDef,
  text: string,
  opts: InspectOpts = {},
): void {
  s.modal = {
    kind: "inspect",
    art: prop.art,
    title: prop.name ?? PROP_NAMES[prop.art],
    text,
    detail: prop.detail ?? null,
    reveal: opts.reveal ?? null,
    solveOnClose: opts.solveOnClose ?? null,
    active: opts.active ?? isPropActive(currentRoom(s), currentRuntime(s), prop),
    tint: prop.tint ?? null,
    burn: prop.burn ?? 1,
    action: opts.action ?? null,
  };
  s.phase = "modal";
}

export function interact(s: GameState, now: number): void {
  if (s.phase === "intro") {
    startGame(s, now);
    return;
  }
  if (s.phase !== "playing" || s.player.moveAt >= 0) return;

  const def = currentRoom(s);
  const rt = currentRuntime(s);
  const p = s.player;
  const [dx, dy] = DELTA[p.dir];
  const fx = p.tx + dx;
  const fy = p.ty + dy;

  if (tileAt(def, fx, fy) === "D") {
    if (rt.solved) {
      toast(s, "문이 활짝 열렸어! 안으로 들어가자.", now, 2200);
      return;
    }
    if (def.puzzle.kind === "code") {
      s.modal = { kind: "keypad", entry: "", length: def.puzzle.slots.length, wrong: false };
      s.phase = "modal";
      playSfx("examine");
      return;
    }
    playSfx("bump");
    toast(s, `자물쇠가 굳게 잠겨 있어.\n${def.hint}`, now, 2600);
    return;
  }

  const prop = propAt(def, fx, fy);
  if (!prop) {
    toast(s, "여긴 아무것도 없네.", now, 1400);
    return;
  }

  rt.examined[prop.id] = true;
  const pz = def.puzzle;

  if (pz.kind === "order") {
    if (prop.id === pz.chestId) {
      openInspect(
        s,
        prop,
        rt.solved
          ? "뚜껑이 활짝 열려 있어. 열쇠는 아까 꺼냈지!"
          : "튼튼한 자물쇠가 걸려 있어.\n촛불 네 개를 순서대로 켜야 열린대.",
      );
      return;
    }
    if (pz.sequence.includes(prop.id)) {
      const lit = rt.lit.includes(prop.id);
      openInspect(s, prop, prop.say ?? "", {
        active: lit,
        // "보기"와 "켜기"를 나눠 둔다. 켜기 전에 마음 놓고 길이를 비교해야
        // 순서를 세울 수 있다.
        action: lit || rt.solved ? null : { label: "🔥 불 켜기", propId: prop.id },
      });
      return;
    }
  }

  if (pz.kind === "quiz" && prop.id === pz.askerId) {
    if (rt.solved) {
      toast(s, "뽀글이: 「잘 가~ 다음 방에서 또 보자!」", now, 2400);
      return;
    }
    s.modal = {
      kind: "quiz",
      question: pz.question,
      choices: pz.choices,
      answer: pz.answer,
    };
    s.phase = "modal";
    playSfx("examine");
    return;
  }

  if (pz.kind === "sequence" && prop.id === pz.replayId) {
    if (rt.solved) {
      toast(s, "태엽이 기분 좋게 째깍째깍 돌아간다.", now, 2000);
      return;
    }
    startPlayback(rt, now);
    toast(s, "태엽을 감았어. 종소리를 잘 들어 봐!", now, 2200);
    playSfx("examine");
    return;
  }

  if (pz.kind === "code") {
    const slot = pz.slots.find((sl) => sl.propId === prop.id);
    if (slot) {
      if (!rt.digits[prop.id]) {
        rt.digits[prop.id] = slot.digit;
        playSfx("found");
        sparkle(s, prop.tx, prop.ty, "#c8b6ff", 14);
      } else {
        playSfx("examine");
      }
      const order = pz.slots.indexOf(slot) + 1;
      openInspect(s, prop, slot.say, {
        reveal: { kind: "digit", value: slot.digit, label: `${order}번째 숫자` },
      });
      return;
    }
  }

  playSfx("examine");
  if (prop.say) openInspect(s, prop, prop.say);
  else toast(s, "특별한 건 없는 것 같아.", now, 1600);
}

// ---------------------------------------------------------------------------
// 패널 (퀴즈 / 키패드)
// ---------------------------------------------------------------------------

/**
 * 확대 화면의 행동 버튼 — 지금은 촛불 켜기 하나뿐.
 * 순서가 맞으면 계속 켜지고, 틀리면 켜 둔 촛불이 전부 꺼진다.
 */
export function inspectAction(s: GameState, now: number): void {
  const modal = s.modal;
  if (!modal || modal.kind !== "inspect" || !modal.action) return;

  const def = currentRoom(s);
  const rt = currentRuntime(s);
  const pz = def.puzzle;
  const id = modal.action.propId;

  s.modal = null;
  s.phase = "playing";

  if (pz.kind !== "order" || rt.solved || rt.lit.includes(id)) return;

  const prop = def.props.find((p) => p.id === id);
  if (id === pz.sequence[rt.lit.length]) {
    rt.lit.push(id);
    playSfx("flame");
    if (prop) sparkle(s, prop.tx, prop.ty, prop.tint ?? "#ffd166", 12);
    if (rt.lit.length >= pz.sequence.length) {
      const chest = def.props.find((p) => p.id === pz.chestId);
      if (chest) {
        rt.examined[chest.id] = true;
        playSfx("found");
        sparkle(s, chest.tx, chest.ty, "#ffd166", 22);
        openInspect(s, chest, pz.right, {
          active: true,
          reveal: { kind: "key" },
          solveOnClose: "열쇠를 자물쇠에 꽂자 철컥— 문이 열렸다!",
        });
      }
    } else {
      toast(s, `촛불이 켜졌어! (${rt.lit.length}/${pz.sequence.length})`, now, 1800);
    }
  } else {
    rt.lit = [];
    s.mistakes++;
    playSfx("blowOut");
    toast(s, pz.wrong, now, 3600);
  }
}

export function closeModal(s: GameState, now: number): void {
  const modal = s.modal;
  if (!modal) return;
  s.modal = null;
  s.phase = "playing";
  if (modal.kind === "inspect" && modal.solveOnClose) {
    solveRoom(s, now, modal.solveOnClose);
  }
}

export function answerQuiz(s: GameState, index: number, now: number): void {
  if (!s.modal || s.modal.kind !== "quiz") return;
  const pz = currentRoom(s).puzzle;
  if (pz.kind !== "quiz") return;
  closeModal(s, now);
  if (index === pz.answer) {
    playSfx("right");
    solveRoom(s, now, `${pz.right}\n\n책장이 스르륵 밀리며 문이 열렸어!`);
  } else {
    playSfx("wrong");
    s.mistakes++;
    toast(s, pz.wrong, now, 3200);
  }
}

export function keypadPress(s: GameState, ch: string): void {
  if (!s.modal || s.modal.kind !== "keypad") return;
  const m = s.modal;
  m.wrong = false;
  if (ch === "del") {
    m.entry = m.entry.slice(0, -1);
  } else if (m.entry.length < m.length) {
    m.entry += ch;
  }
  playSfx("examine");
}

export function keypadSubmit(s: GameState, now: number): void {
  if (!s.modal || s.modal.kind !== "keypad") return;
  const pz = currentRoom(s).puzzle;
  if (pz.kind !== "code") return;
  const code = pz.slots.map((sl) => sl.digit).join("");
  if (s.modal.entry === code) {
    closeModal(s, now);
    playSfx("right");
    solveRoom(s, now, "찰칵! 자물쇠가 풀렸어.\n\n거울들이 일제히 반짝인다!");
  } else {
    s.modal.entry = "";
    s.modal.wrong = true;
    s.mistakes++;
    playSfx("wrong");
  }
}

// ---------------------------------------------------------------------------
// 프레임 업데이트
// ---------------------------------------------------------------------------

function advanceRoom(s: GameState, now: number): void {
  if (s.roomIndex >= TOTAL_ROOMS - 1) {
    s.phase = "stageClear";
    s.finishedAt = now;
    s.held = null;
    confetti(s);
    playSfx("stageClear");
    return;
  }
  s.roomIndex++;
  s.player = makePlayer(spawnOf(currentRoom(s)));
  s.particles = [];
  s.doorOpenAt = -1;
  s.clearAt = -1;
  s.phase = "playing";
  onEnterRoom(s, now);
}

export function update(s: GameState, now: number): void {
  const dt = Math.min(48, Math.max(0, now - s.now));
  s.now = now;

  const rt = currentRuntime(s);
  if (rt.seqPlayAt >= 0) advancePlayback(rt, now);

  const p = s.player;
  if (p.moveAt >= 0 && now - p.moveAt >= MOVE_MS) {
    p.moveAt = -1;
    p.fromTx = p.tx;
    p.fromTy = p.ty;
    onArrive(s, now);
  }

  if (s.phase === "playing" && p.moveAt < 0 && s.held) tryStep(s, s.held, now);

  if (s.phase === "roomClear" && now - s.clearAt >= ROOM_CLEAR_MS) advanceRoom(s, now);

  if (s.toast && now >= s.toast.until) s.toast = null;
  updateParticles(s, dt);
}

export function elapsedMs(s: GameState): number {
  if (s.phase === "intro") return 0;
  const end = s.phase === "stageClear" ? s.finishedAt : s.now;
  return Math.max(0, end - s.startedAt);
}

export function toHud(s: GameState): HudState {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  return {
    phase: s.phase,
    roomIndex: s.roomIndex,
    roomName: def.name,
    hint: def.hint,
    solved: rt.solved,
    doorOpen: rt.solved,
    // 초 단위로 잘라서 넘긴다 — 매 프레임 값이 바뀌면 React가 매 프레임 다시 그린다.
    elapsedMs: Math.floor(elapsedMs(s) / 1000) * 1000,
    mistakes: s.mistakes,
    toast: s.toast?.text ?? null,
    modal: s.modal,
    canResetBoxes: def.puzzle.kind === "push" && !rt.solved,
    foundDigits:
      def.puzzle.kind === "code"
        ? def.puzzle.slots.map((sl) => rt.digits[sl.propId] ?? null)
        : [],
  };
}
