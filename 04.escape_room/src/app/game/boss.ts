import { playSfx, playStep } from "./audio";
import { COLS, MOVE_MS, ROWS, THEMES, TILE } from "./constants";
import type { BossState, Box, Dir, GameState, RoomDef, Snowball, Spot } from "./types";

/**
 * 보스 대결 — 눈덩이 피하기.
 *
 * 스테이지마다 딱 한 번, 다섯 방 중 어느 문에서 튀어나올지는 판마다 다르다.
 * 이 게임의 퍼즐은 전부 "가만히 앉아 생각하는" 것이라, 심장이 뛰는 순간이
 * 여기 하나뿐이다.
 *
 * 만들면서 지킨 것 세 가지:
 *
 * 1. **져도 문은 열린다.** 손이 느린 날에 게임이 여기서 끝나면 안 된다.
 *    이기면 시간 보너스와 도장을 주고, 지면 그냥 지나간다.
 * 2. **떨어질 자리를 먼저 알려 준다.** 그림자가 0.62초 먼저 생기고, 한 칸
 *    걷는 데 0.145초니까 네 칸은 피할 수 있는 시간이다.
 * 3. **도망갈 길을 반드시 하나 남긴다.** 눈덩이를 여러 개 던질 때, 지금 선
 *    자리와 옆 네 칸이 전부 막히는 조합은 아예 던지지 않는다. 피할 수 없는
 *    공격은 실력이 아니라 운이다.
 */

export const BOSS_INTRO_MS = 3000;
export const BOSS_FIGHT_MS = 15000;
export const BOSS_RESULT_MS = 2800;

/** 그림자가 생긴 뒤 눈덩이가 떨어지기까지. 뒤로 갈수록 조금 짧아진다. */
export const BOSS_WARN_MS = 640;
const BOSS_WARN_MIN_MS = 460;
/** 세 번 맞으면 패배 */
export const BOSS_MAX_HITS = 3;
/** 맞은 뒤 잠깐 무적. 한자리에서 연달아 깎이지 않게. */
export const BOSS_HURT_MS = 900;

/** 카운트다운 한 숫자가 화면에 머무는 시간 (3·2·1) */
const COUNT_MS = 600;

export interface BossLook {
  /** 말풍선에 쓰는 이름 */
  name: string;
  /** 던지는 것 — 스테이지마다 다르다 */
  ball: string;
  /** 몸 색 */
  body: string;
  bodyDark: string;
  /** 눈덩이 색 */
  tint: string;
}

/**
 * 스테이지마다 다른 도깨비. 이름과 색만 바꿔도 딴 녀석처럼 보인다.
 *
 * 전부 통통하고 뿔이 짧고 뻐드렁니가 하나다 — 무섭기보다 웃기게. 열 살
 * 아이에게 진짜로 위협적인 보스는 필요 없다.
 */
export const BOSSES: Record<number, BossLook> = {
  1: { name: "그림자 도깨비 뿌뿌", ball: "먼지 뭉치", body: "#8f6bcf", bodyDark: "#5b3f96", tint: "#e6ddff" },
  2: { name: "감옥 지킴이 꾹꾹", ball: "물방울 폭탄", body: "#5f7f9c", bodyDark: "#3c556c", tint: "#c9ecff" },
  3: { name: "물벼락 도깨비 첨첨", ball: "물풍선", body: "#3f8f8a", bodyDark: "#28615e", tint: "#a8f0ff" },
  4: { name: "얼음 도깨비 쨍쨍", ball: "눈덩이", body: "#7fa8cf", bodyDark: "#4f7a9c", tint: "#ffffff" },
  5: { name: "별똥별 도깨비 뽕뽕", ball: "별똥별", body: "#c47fcf", bodyDark: "#8a4f96", tint: "#fff3c4" },
};

export function bossLook(stageId: number): BossLook {
  return BOSSES[stageId] ?? BOSSES[1];
}

// ---------------------------------------------------------------------------
// 아레나 — 눈덩이가 떨어질 수 있는 칸
// ---------------------------------------------------------------------------

function isFree(def: RoomDef, boxes: Box[], x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) return false;
  const ch = def.layout[y][x];
  if (ch === "#" || ch === "B" || ch === "D") return false;
  if (def.props.some((p) => p.solid && p.tx === x && p.ty === y)) return false;
  return !boxes.some((b) => b.tx === x && b.ty === y);
}

/**
 * 대결장 — 서로 걸어서 오갈 수 있는 칸 하나의 덩어리.
 *
 * 빈 칸을 전부 긁어모으면 책장 사이에 낀 "사방이 막힌 구석"까지 들어간다.
 * 거기는 걸어 들어갈 수가 없어서, 눈덩이가 떨어져 봐야 아무 일도 일어나지
 * 않는 헛방이 된다. 그래서 가장 큰 덩어리 하나만 골라 쓴다.
 */
function arenaTiles(def: RoomDef, boxes: Box[]): Spot[] {
  const free: Spot[] = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) if (isFree(def, boxes, x, y)) free.push([x, y]);
  }

  const key = (x: number, y: number) => `${x},${y}`;
  const left = new Set(free.map(([x, y]) => key(x, y)));
  let best: Spot[] = [];

  while (left.size > 0) {
    const first = left.values().next().value as string;
    const [fx, fy] = first.split(",").map(Number);
    const group: Spot[] = [];
    const queue: Spot[] = [[fx, fy]];
    left.delete(first);
    while (queue.length > 0) {
      const [x, y] = queue.pop() as Spot;
      group.push([x, y]);
      for (const [nx, ny] of [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
      ] as Spot[]) {
        const k = key(nx, ny);
        if (!left.has(k)) continue;
        left.delete(k);
        queue.push([nx, ny]);
      }
    }
    if (group.length > best.length) best = group;
  }
  return best;
}

/** 대결을 시작할 자리 — 대결장 안에서 방 한가운데에 가장 가까운 칸 */
function centerSpot(tiles: Spot[]): Spot {
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  let best = tiles[0] ?? [1, 1];
  let bestD = Infinity;
  for (const [x, y] of tiles) {
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// 시작 / 진행
// ---------------------------------------------------------------------------

export function createBoss(
  now: number,
  def: RoomDef,
  boxes: Box[],
): { boss: BossState; spot: Spot } {
  const tiles = arenaTiles(def, boxes);
  return {
    boss: {
      stage: "intro",
      at: now,
      startedAt: now,
      tiles,
      balls: [],
      hits: 0,
      hurtAt: -99999,
      nextThrowAt: now + BOSS_INTRO_MS,
    },
    spot: centerSpot(tiles),
  };
}

/** 대결이 얼마나 진행됐는지 0~1. 뒤로 갈수록 빨라진다. */
function progressOf(b: BossState, now: number): number {
  if (b.stage !== "fight") return 0;
  return Math.min(1, Math.max(0, (now - b.at) / BOSS_FIGHT_MS));
}

/** 3·2·1 카운트다운. 0이면 아직 대사를 읽는 중. */
export function countdownOf(b: BossState, now: number): number {
  if (b.stage !== "intro") return 0;
  const left = BOSS_INTRO_MS - (now - b.at);
  if (left > COUNT_MS * 3) return 0;
  return Math.max(1, Math.ceil(left / COUNT_MS));
}

/** 눈덩이가 떨어지기까지 얼마나 남았는지 0~1 (1이면 지금 떨어진다) */
export function ballProgress(ball: Snowball, now: number): number {
  const span = Math.max(1, ball.landAt - ball.spawnAt);
  return Math.min(1, Math.max(0, (now - ball.spawnAt) / span));
}

/** 지금 떨어지기로 예약된 칸들 */
function pendingTiles(b: BossState): Set<string> {
  const out = new Set<string>();
  for (const ball of b.balls) out.add(`${ball.tx},${ball.ty}`);
  return out;
}

/**
 * 던질 칸을 고른다.
 *
 * 절반 넘게는 지금 서 있는 칸을 노린다. 그래야 가만히 서 있는 게 통하지
 * 않고, "그림자가 발밑에 생기면 옆으로!" 라는 아주 단순한 규칙만 익히면
 * 누구나 피할 수 있다.
 */
function aim(b: BossState, px: number, py: number): Spot {
  if (Math.random() < 0.62) return [px, py];
  return b.tiles[Math.floor(Math.random() * b.tiles.length)] ?? [px, py];
}

/** 지금 선 자리나 옆 네 칸 중 안 막힌 데가 하나라도 있는지 */
function hasEscape(b: BossState, px: number, py: number): boolean {
  const taken = pendingTiles(b);
  const spots: Spot[] = [
    [px, py],
    [px, py - 1],
    [px, py + 1],
    [px - 1, py],
    [px + 1, py],
  ];
  return spots.some(
    ([x, y]) =>
      b.tiles.some(([tx, ty]) => tx === x && ty === y) && !taken.has(`${x},${y}`),
  );
}

function throwBalls(s: GameState, b: BossState, now: number): void {
  const p = s.player;
  const prog = progressOf(b, now);

  // 뒤로 갈수록 촘촘하게, 그리고 가끔 여러 개
  let count = 1;
  if (prog > 0.35 && Math.random() < 0.5) count++;
  if (prog > 0.7 && Math.random() < 0.4) count++;

  // 처음에는 넉넉하게, 끝으로 갈수록 조금 촉박하게 알려 준다
  const warn = BOSS_WARN_MS - (BOSS_WARN_MS - BOSS_WARN_MIN_MS) * prog;

  let thrown = 0;
  for (let i = 0; i < count; i++) {
    const [tx, ty] = i === 0 ? aim(b, p.tx, p.ty) : (b.tiles[Math.floor(Math.random() * b.tiles.length)] ?? [p.tx, p.ty]);
    if (pendingTiles(b).has(`${tx},${ty}`)) continue;
    b.balls.push({ tx, ty, spawnAt: now, landAt: now + warn });
    // 도망갈 길이 사라졌으면 방금 넣은 것을 되돌린다
    if (!hasEscape(b, p.tx, p.ty)) {
      b.balls.pop();
      continue;
    }
    thrown++;
  }
  if (thrown > 0) playSfx("bossThrow");

  const gap = 760 - 400 * prog;
  b.nextThrowAt = now + gap;
}

function endFight(s: GameState, b: BossState, won: boolean, now: number): void {
  const look = bossLook(s.stageId);
  b.stage = won ? "won" : "lost";
  b.at = now;
  b.balls = [];
  s.held = null;
  s.bossWon = won;
  playSfx(won ? "bossWin" : "bossLose");
  s.toast = {
    text: won
      ? `${look.name}: 「크윽… 졌다! 가라, 통과다.」\n⏱️ 시간 10초 단축 + 🏅 도장 획득!`
      : `${look.name}: 「히히, 내가 이겼다!\n그래도 문은 열어 줄게. 다음 판에 또 붙자!」`,
    until: now + BOSS_RESULT_MS,
  };
}

/** 한 칸 걷기. 퍼즐 장치는 건드리지 않는다 — 지금은 대결 중이다. */
export function bossStep(s: GameState, dir: Dir, now: number): void {
  const b = s.boss;
  if (!b || b.stage !== "fight") return;
  const p = s.player;
  p.dir = dir;
  if (p.moveAt >= 0) return;

  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  const nx = p.tx + dx;
  const ny = p.ty + dy;
  if (!b.tiles.some(([x, y]) => x === nx && y === ny)) {
    playSfx("bump");
    return;
  }
  p.fromTx = p.tx;
  p.fromTy = p.ty;
  p.tx = nx;
  p.ty = ny;
  p.moveAt = now;
  p.steps++;
  playStep(THEMES[s.defs[s.roomIndex].theme].floorStyle);
}

/**
 * 대결 진행. 프레임마다 불린다.
 * 대결이 끝났으면 true를 돌려준다 — 그때 다음 방으로 넘어간다.
 */
export function updateBoss(s: GameState, now: number): boolean {
  const b = s.boss;
  if (!b) return true;

  if (b.stage === "intro") {
    if (now - b.at >= BOSS_INTRO_MS) {
      b.stage = "fight";
      b.at = now;
      b.nextThrowAt = now + 400;
      playSfx("bossStart");
    }
    return false;
  }

  if (b.stage === "fight") {
    // 걷기 — 방향 버튼을 누르고 있으면 계속
    const p = s.player;
    if (p.moveAt >= 0 && now - p.moveAt >= MOVE_MS) {
      p.moveAt = -1;
      p.fromTx = p.tx;
      p.fromTy = p.ty;
    }
    if (p.moveAt < 0 && s.held) bossStep(s, s.held, now);

    // 떨어진 눈덩이 판정
    for (let i = b.balls.length - 1; i >= 0; i--) {
      const ball = b.balls[i];
      if (now < ball.landAt) continue;
      b.balls.splice(i, 1);
      splash(s, ball.tx, ball.ty, bossLook(s.stageId).tint);
      const hit = p.tx === ball.tx && p.ty === ball.ty;
      if (hit && now - b.hurtAt >= BOSS_HURT_MS) {
        b.hits++;
        b.hurtAt = now;
        playSfx("bossHit");
      } else {
        playSfx("bossLand");
      }
    }

    if (b.hits >= BOSS_MAX_HITS) {
      endFight(s, b, false, now);
      return false;
    }
    if (now - b.at >= BOSS_FIGHT_MS) {
      endFight(s, b, true, now);
      return false;
    }
    if (now >= b.nextThrowAt) throwBalls(s, b, now);
    return false;
  }

  // 결과 대사를 다 보여 준 뒤에 문을 통과한다
  if (now - b.at < BOSS_RESULT_MS) return false;

  // 대결에 쓴 시간은 탈출 기록에서 뺀다. 보스를 만난 게 손해면 안 된다.
  s.startedAt += now - b.startedAt;
  // 이겼으면 그 위에 10초를 더 깎아 준다
  if (b.stage === "won") s.startedAt += 10000;
  s.boss = null;
  return true;
}

function splash(s: GameState, tx: number, ty: number, color: string): void {
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  for (let i = 0; i < 12; i++) {
    const a = Math.PI + Math.random() * Math.PI;
    const sp = 50 + Math.random() * 120;
    s.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 320 + Math.random() * 260,
      maxLife: 600,
      color,
      size: 2 + Math.random() * 2.5,
    });
  }
}
