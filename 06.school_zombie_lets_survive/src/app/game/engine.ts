import {
  ALARM,
  BANANA,
  POPPER,
  BOSS,
  COLORS,
  BOSS_R,
  CAM_LERP,
  CHALK,
  DARK_VIEW_R,
  DOOR,
  FRIEND_FOLLOW_DIST,
  FRIEND_STALL_MS,
  FRIEND_WAKE_MS,
  GAMEOVER_MS,
  HIDE_AIM_EXIT_MS,
  HIDE_ENTER_MS,
  HIDE_EXIT_DIST,
  HIDE_RECD_MS,
  INTERACT_DIST,
  MATRON_R,
  NEAR_MISS_IN,
  NEAR_MISS_OUT,
  PLAYER_R,
  PLAYER_SPEED,
  SCORE,
  SKIP_AFTER_MS,
  TILE,
  FRIEND_POWER,
  VENT,
  VIEW_H,
  VIEW_W,
  YAWN_HEAR_R,
  ZOMBIE_R,
  ZOMBIE_WAIT_MS,
} from "./constants";
import { FRIENDS, INGREDIENTS, STAGES, parseMap, tileAt } from "./maps";
import { makeTuning } from "./difficulty";
import type { Difficulty } from "./difficulty";
import {
  playAlarmRing,
  playBroadcastTick,
  playClank,
  playFriendCall,
  playSfx,
  playSpeechSyllable,
  playStep,
  playYawn,
  setMuffled,
} from "./audio";
import {
  MECHANIC_HINTS,
  BOSS_COUGH,
  BOSS_INTRO,
  BOSS_SPEECH,
  GOAL_DONE,
  GOAL_MAIN,
  GOAL_MAIN_5,
  GOAL_MENU,
  randomSleepLine,
} from "./text";
import type {
  Boss,
  Friend,
  GameState,
  GoalView,
  HudState,
  InteractTarget,
  ItemEnt,
  MapData,
  Player,
  StageScore,
  Vec,
  VentEnt,
  Zombie,
} from "./types";

// ---------------------------------------------------------------------------
// 작은 도구들
// ---------------------------------------------------------------------------

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** 씨앗을 받는 아주 작은 난수 — 순찰 경로가 매번 같아야 외울 수 있다. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tileOf(px: number): number {
  return Math.floor(px / TILE);
}

function center(tx: number, ty: number): Vec {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function blocksMove(s: GameState, tx: number, ty: number, forZombie: boolean): boolean {
  const t = tileAt(s.map, tx, ty);
  if (!t) return true;
  if (t.solid) return true;
  if (forZombie && t.door) {
    const d = s.doors.find((dd) => dd.tile === ty * s.map.w + tx);
    if (d && d.lockT > 0) return true;
  }
  return false;
}

function blocksSight(map: MapData, tx: number, ty: number): boolean {
  const t = tileAt(map, tx, ty);
  return !t || t.blocksSight;
}

/** 원이 벽에 닿는가 */
function circleHits(
  s: GameState,
  x: number,
  y: number,
  r: number,
  forZombie: boolean,
): boolean {
  const x0 = tileOf(x - r);
  const x1 = tileOf(x + r);
  const y0 = tileOf(y - r);
  const y1 = tileOf(y + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!blocksMove(s, tx, ty, forZombie)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
  }
  return false;
}

/**
 * 축을 나눠서 민다. x를 먼저 옮겨 보고 막히면 x만 되돌리고 y를 옮긴다.
 * 막혔을 때는 12px까지 옆으로 슬쩍 밀어 코너에 안 끼게 한다.
 * **벽 끼임은 이 게임 최대의 적이다.**
 */
function moveCircle(
  s: GameState,
  pos: Vec,
  r: number,
  dx: number,
  dy: number,
  forZombie: boolean,
): void {
  if (dx !== 0) {
    const nx = pos.x + dx;
    if (!circleHits(s, nx, pos.y, r, forZombie)) {
      pos.x = nx;
    } else {
      // 코너 보정 — 옆으로 12px 이내에 빈 자리가 있으면 **검사한 그 자리로** 밀어 준다.
      // (검사한 곳과 다른 곳으로 옮기면 벽 안에 갇힌다. 실제로 그렇게 갇혔었다.)
      for (let off = 2; off <= 12; off += 2) {
        if (!circleHits(s, nx, pos.y - off, r, forZombie)) {
          pos.x = nx;
          pos.y -= off;
          break;
        }
        if (!circleHits(s, nx, pos.y + off, r, forZombie)) {
          pos.x = nx;
          pos.y += off;
          break;
        }
      }
    }
  }
  if (dy !== 0) {
    const ny = pos.y + dy;
    if (!circleHits(s, pos.x, ny, r, forZombie)) {
      pos.y = ny;
    } else {
      for (let off = 2; off <= 12; off += 2) {
        if (!circleHits(s, pos.x - off, ny, r, forZombie)) {
          pos.y = ny;
          pos.x -= off;
          break;
        }
        if (!circleHits(s, pos.x + off, ny, r, forZombie)) {
          pos.y = ny;
          pos.x += off;
          break;
        }
      }
    }
  }
}

/**
 * 어쩌다 벽 안에 갇혔을 때 가장 가까운 빈 자리로 밀어낸다.
 * 아이가 "조작이 안 먹는다"고 느끼는 상황을 절대 만들지 않기 위한 안전망.
 */
function unstick(s: GameState, pos: Vec, r: number, forZombie: boolean): void {
  if (!circleHits(s, pos.x, pos.y, r, forZombie)) return;
  for (let rad = 4; rad <= 80; rad += 4) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const nx = pos.x + Math.cos(ang) * rad;
      const ny = pos.y + Math.sin(ang) * rad;
      if (!circleHits(s, nx, ny, r, forZombie)) {
        pos.x = nx;
        pos.y = ny;
        return;
      }
    }
  }
}

/** 직선 시야. 시야 콘(부채꼴)은 안 쓴다 — 10살에게 요구가 너무 많다. */
export function hasLineOfSight(
  map: MapData,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (blocksSight(map, tileOf(x), tileOf(y))) return false;
  }
  return true;
}

/** 타일 격자 위 BFS. 좀비가 벽을 돌아 들어올 때 쓴다. */
function findPath(s: GameState, from: Vec, to: Vec, forZombie: boolean): Vec[] {
  const { w, h } = s.map;
  const sx = tileOf(from.x);
  const sy = tileOf(from.y);
  const gx = tileOf(to.x);
  const gy = tileOf(to.y);
  if (sx === gx && sy === gy) return [{ x: to.x, y: to.y }];
  if (gx < 0 || gy < 0 || gx >= w || gy >= h) return [];
  const prev = new Int32Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const queue: number[] = [sy * w + sx];
  seen[sy * w + sx] = 1;
  let head = 0;
  let found = false;
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur / w) | 0;
    if (cx === gx && cy === gy) {
      found = true;
      break;
    }
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const idx = ny * w + nx;
      if (seen[idx]) continue;
      if (blocksMove(s, nx, ny, forZombie)) continue;
      seen[idx] = 1;
      prev[idx] = cur;
      queue.push(idx);
    }
  }
  if (!found) return [];
  const out: Vec[] = [];
  let cur = gy * w + gx;
  while (cur !== sy * w + sx && cur >= 0) {
    out.push(center(cur % w, (cur / w) | 0));
    cur = prev[cur];
  }
  out.reverse();
  if (out.length) out[out.length - 1] = { x: to.x, y: to.y };
  return out;
}

/**
 * 순찰 경로를 자동으로 만든다. 씨앗이 같으면 결과가 같아서 "정해진 길"이 된다.
 * 좀비는 자기 방(또는 자기 복도) 안에서만 돈다.
 */
function buildPatrol(
  s: GameState,
  start: Vec,
  seed: number,
  radiusTiles: number,
): { path: Vec[]; stops: number[] } {
  const { w, h } = s.map;
  const sx = tileOf(start.x);
  const sy = tileOf(start.y);
  const startTile = tileAt(s.map, sx, sy);
  const wantCorridor = startTile ? startTile.corridor : false;
  const room = startTile ? startTile.room : -1;

  const depth = new Int32Array(w * h).fill(-1);
  const queue: number[] = [sy * w + sx];
  depth[sy * w + sx] = 0;
  let head = 0;
  const reach: number[] = [];
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur / w) | 0;
    if (depth[cur] > 0) reach.push(cur);
    if (depth[cur] >= radiusTiles) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const idx = ny * w + nx;
      if (depth[idx] >= 0) continue;
      if (blocksMove(s, nx, ny, true)) continue;
      const t = tileAt(s.map, nx, ny);
      if (!t) continue;
      // 자기 방 밖으로는 안 나간다 (복도 좀비는 복도만 돈다)
      if (room >= 0 && t.room !== room) continue;
      if (room < 0 && wantCorridor && !t.corridor) continue;
      depth[idx] = depth[cur] + 1;
      queue.push(idx);
    }
  }

  const rand = rng(seed);
  const picks: number[] = [];
  const far = [...reach].sort((a, b) => depth[b] - depth[a]);
  for (let i = 0; i < 3 && far.length; i++) {
    // 멀리 있는 칸들 중에서 하나씩 골라 서로 떨어지게 한다
    const pool = far.filter((t) => {
      if (picks.includes(t)) return false;
      return picks.every((p) => {
        const px = p % w;
        const py = (p / w) | 0;
        return Math.abs((t % w) - px) + Math.abs(((t / w) | 0) - py) > 3;
      });
    });
    if (!pool.length) break;
    const take = pool[Math.floor(rand() * Math.min(pool.length, 8))];
    picks.push(take);
  }

  const nodes: Vec[] = [{ x: start.x, y: start.y }];
  for (const p of picks) nodes.push(center(p % w, (p / w) | 0));

  const path: Vec[] = [];
  const stops: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    const leg = findPath(s, a, b, true);
    for (const pt of leg) path.push(pt);
    stops.push(Math.max(0, path.length - 1));
  }
  if (!path.length) path.push({ x: start.x, y: start.y });
  return { path, stops };
}

// ---------------------------------------------------------------------------
// 게임 만들기
// ---------------------------------------------------------------------------

export interface CreateOpts {
  stageId: number;
  playerName: string;
  menuPieces: boolean[];
  /** 이미 찾아 둔 환풍구 (전역 8칸) — 한 번 찾으면 영원히 내 것이다 */
  foundVents: boolean[];
  /** 구출해 둔 친구 — 스테이지 5에는 이 친구들이 따라 들어온다 */
  friendsMet: boolean[];
  /** 난이도. 없으면 보통 (= v0.6의 숫자 그대로) */
  difficulty?: Difficulty;
  practiceZombies?: number | null;
}

export function createGame(opts: CreateOpts): GameState {
  const stage = STAGES.find((s) => s.id === opts.stageId) ?? STAGES[0];
  const map = parseMap(stage);
  // 난이도는 판이 만들어질 때 숫자로 굳는다. 시작한 뒤에는 못 바꾼다 (기록이 오염된다).
  const tune = makeTuning(opts.difficulty ?? "normal", stage);

  const player: Player = {
    x: 0,
    y: 0,
    face: -Math.PI / 2,
    walkT: 0,
    moving: false,
    hiding: -1,
    hideT: 0,
    hideDir: 1,
    hideFrom: { x: 0, y: 0 },
    hideAim: null,
    hideAimT: 0,
    hideExits: 0,
    torchOn: false,
    alarms: tune.startAlarms,
    poppers: tune.startPoppers,
    bananas: tune.startBananas,
    chalkCd: 0,
    lockerCd: new Map(),
  };

  const s: GameState = {
    stageId: stage.id,
    stage,
    tune,
    map,
    phase: "playing",
    paused: false,
    player,
    zombies: [],
    friends: [],
    items: [],
    chalks: [],
    alarms: [],
    poppers: [],
    bananas: [],
    doors: [],
    boss: null,
    particles: [],
    floaters: [],
    flyIcons: [],
    camera: { x: 0, y: 0 },
    section: 0,
    visited: [false, false, false],
    checkpoint: { x: 0, y: 0 },
    elapsed: 0,
    score: 0,
    gotIngredients: new Array(8).fill(false),
    gotMenus: [...opts.menuPieces],
    neverSpotted: true,
    sleeps: 0,
    sleepKind: "pillow",
    sleepLine: "",
    sleepT: 0,
    exitOpen: false,
    broadcast: 0,
    ritualT: 0,
    ritualStep: 0,
    shake: 0,
    flash: 0,
    radio: null,
    radioT: 0,
    card: null,
    cardT: 0,
    challenge: 0,
    challengeDone: false,
    target: null,
    vents: [],
    ventT: 0,
    ventFrom: -1,
    ventCd: 0,
    ventDenyT: 0,
    ventGrace: 0,
    foundVents: [...opts.foundVents],
    friendPower: [false, false, false, false],
    powerPop: [0, 0, 0, 0],
    broadcastFilling: 0,
    callT: 0,
    held: false,
    pressed: false,
    inx: 0,
    iny: 0,
    aim: null,
    toldTorch: false,
    score_: null,
    practiceZombies: opts.practiceZombies ?? null,
    mapOpen: false,
    rescued: 0,
    yawnBudget: 0,
    time: 0,
    playerName: opts.playerName,
    hints: [],
    hitstop: 0,
    castDoor: -1,
    castT: 0,
    nearMissScore: 0,
    stepT: 0,
    bossIntroDone: false,
    menusThisRun: [],
    friendSeq: 0,
    padActive: false,
    friendScore: 0,
  };

  // 환풍구 — 쌍마다 양쪽 끝을 하나씩 만든다
  for (const pair of stage.vents) {
    const ai = s.vents.length;
    const bi = ai + 1;
    const found = !!s.foundVents[pair.id];
    s.vents.push({
      id: pair.id,
      other: bi,
      x: pair.a.x * TILE + TILE / 2,
      y: pair.a.y * TILE + TILE / 2,
      prop: pair.a.prop,
      found,
      charge: 0,
    });
    s.vents.push({
      id: pair.id,
      other: ai,
      x: pair.b.x * TILE + TILE / 2,
      y: pair.b.y * TILE + TILE / 2,
      prop: pair.b.prop,
      found,
      charge: 0,
    });
  }

  // 맵을 훑어서 등장인물과 물건을 뽑아낸다
  let zSeed = stage.id * 977;
  let matronIndex = 0;
  let friendIndex = 0;
  let menuSlot = 0;
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const ch = stage.map[ty][tx];
      const c = center(tx, ty);
      if (ch === "S") {
        player.x = c.x;
        player.y = c.y;
        s.checkpoint = { x: c.x, y: c.y };
      } else if (ch === "z" || ch === "Z") {
        const z = makeZombie(s, ch === "Z" ? "hungry" : "basic", c, zSeed++);
        if (ch === "Z" && stage.hungryPath) {
          z.routePoints = stage.hungryPath.points.map((p) => ({ x: p.x * TILE, y: p.y * TILE }));
        }
        s.zombies.push(z);
      } else if (ch === "A") {
        const path = stage.matronPaths[matronIndex++];
        const m = makeMatron(
          s,
          c,
          path ? path.points.map((p) => ({ x: p.x * TILE, y: p.y * TILE })) : [c],
        );
        m.wakeOnIngredient = path?.wakeOnIngredient ?? null;
        s.zombies.push(m);
      } else if (ch === "X") {
        s.boss = {
          x: c.x,
          y: c.y,
          phase: "walk",
          t: 0,
          passArmed: false,
          radius: 0,
          line: BOSS_SPEECH[0],
          lineIndex: 0,
          active: false,
          bob: 0,
          home: { x: c.x, y: c.y },
          slipT: 0,
        };
      } else if (ch === "F") {
        s.friends.push({
          id: friendIndex,
          who: friendIndex,
          x: c.x,
          y: c.y,
          home: { x: c.x, y: c.y },
          state: "asleep",
          wakeT: 0,
          order: 0,
          trail: [],
          bob: 0,
          scored: false,
        });
        friendIndex++;
      } else if (ch === "M") {
        const index = stage.menuPieces[Math.min(menuSlot, 1)];
        menuSlot++;
        s.items.push({
          kind: "menu",
          index,
          x: c.x,
          y: c.y,
          taken: s.gotMenus[index],
          ph: Math.random() * 6,
        });
      } else if (ch === "K") {
        s.items.push({ kind: "alarm", index: 0, x: c.x, y: c.y, taken: false, ph: 0 });
      } else if (ch === "B") {
        s.items.push({ kind: "popper", index: 0, x: c.x, y: c.y, taken: false, ph: 0 });
      } else if (ch === "W") {
        s.items.push({ kind: "banana", index: 0, x: c.x, y: c.y, taken: false, ph: 0 });
      } else if (ch === stage.ingredientChars[0]) {
        s.items.push({
          kind: "ingredient",
          index: stage.ingredients[0],
          x: c.x,
          y: c.y,
          taken: false,
          ph: 0,
        });
      } else if (ch === stage.ingredientChars[1]) {
        s.items.push({
          kind: "ingredient",
          index: stage.ingredients[1],
          x: c.x,
          y: c.y,
          taken: false,
          ph: 1.5,
        });
      } else if (ch === "D") {
        s.doors.push({
          tile: ty * map.w + tx,
          x: c.x,
          y: c.y,
          lockT: 0,
          uses: DOOR.uses,
          castT: 0,
          knockT: 0,
        });
      }
    }
  }

  // 어려움 — 스테이지 2~5에서 일반 좀비 **1마리를 배고픈 좀비로 교체**한다.
  // 추가가 아니라 교체라 §11-C 구역별 내역과 부록 A가 그대로 맞는다.
  if (tune.swapOneHungry && tune.hungry) {
    const victim = s.zombies.find((z) => z.kind === "basic");
    if (victim) {
      victim.kind = "hungry";
      victim.patrolSpeed = tune.hungry.patrol;
      victim.chaseSpeed = tune.hungry.chase;
      victim.noticeR = tune.hungry.notice;
      victim.noticeDelay = tune.hungry.delay;
      victim.giveupMs = tune.hungry.giveup;
      victim.variant = 0;
    }
  }

  // 연습 모드 — 좀비 수를 직접 줄여서 마음껏 돌아다닌다
  if (s.practiceZombies !== null) {
    s.zombies = s.zombies.slice(0, Math.max(0, s.practiceZombies));
  }

  // 구출한 친구는 스테이지 5까지 따라온다 (DESIGN §13-2).
  // 세은의 "나도 방송실 가는 거 도와줄게!"가 그제서야 말이 된다.
  if (stage.id === 5) {
    opts.friendsMet.forEach((met, who) => {
      if (!met) return;
      // 처음부터 뱀처럼 늘어선 채로 등장한다 (32 / 46 / 60 / 74 누적)
      const back = s.friends.reduce((sum, _, i) => sum + FRIEND_FOLLOW_DIST + 14 * i, 0)
        + FRIEND_FOLLOW_DIST + 14 * s.friends.length;
      s.friends.push({
        id: s.friends.length,
        who,
        x: player.x - back,
        y: player.y + 14,
        home: { x: player.x, y: player.y },
        state: "follow",
        wakeT: 0,
        order: s.friendSeq++,
        trail: [],
        bob: 0,
        // 스테이지 4에서 이미 점수를 받았다 — 여기서 또 주지 않는다
        scored: true,
      });
    });
  }

  for (const z of s.zombies) resetZombie(s, z);
  s.camera.x = player.x - VIEW_W / 2;
  s.camera.y = player.y - VIEW_H / 2;
  clampCamera(s);
  return s;
}

function makeZombie(s: GameState, kind: "basic" | "hungry", at: Vec, seed: number): Zombie {
  // 쉬움에서는 배고픈 좀비가 없다 — 일반 좀비로 강등한다
  const hungry = kind === "hungry" ? s.tune.hungry : null;
  if (kind === "hungry" && !hungry) kind = "basic";
  const base = hungry ?? s.tune.basic;
  const rnd = rng(seed * 31 + 7);
  // LCG는 이웃한 씨앗의 첫 출력이 붙어 있어서, 그대로 쓰면 한 스테이지의 좀비가
  // 전부 같은 앞머리를 달고 나온다. 두 번 돌려서 흩어 놓는다.
  rnd();
  rnd();
  return {
    id: s.zombies.length,
    kind,
    x: at.x,
    y: at.y,
    r: ZOMBIE_R,
    patrolSpeed: base.patrol,
    chaseSpeed: base.chase,
    noticeR: base.notice,
    noticeDelay: base.delay,
    giveupMs: base.giveup,
    state: "patrol",
    t: 0,
    path: [],
    pathIndex: 0,
    dir: 1,
    pauseT: 0,
    lastSeen: null,
    goal: null,
    route: [],
    routeAt: 0,
    repathT: 0,
    stallT: 0,
    yawnT: 1200 + Math.random() * 2400,
    nearArmed: false,
    nearCd: 0,
    home: { x: at.x, y: at.y },
    stops: [],
    bob: Math.random() * 6,
    clankT: 0,
    seed,
    routePoints: null,
    wakeOnIngredient: null,
    dormant: false,
    knockCd: 0,
    // 개체 변주는 태어날 때 한 번만 뽑는다 (씨앗 고정 = 매번 같은 좀비).
    // 기본 좀비에게만 준다 — 배고픈 좀비·아주머니는 "다른 종류의 적"이라 섞이면 안 된다.
    variant: kind === "basic" ? ((Math.floor(rnd() * 3) % 3) as 0 | 1 | 2) : 0,
    phase: kind === "basic" ? rnd() * Math.PI * 2 : 0,
    bobAmp: kind === "basic" ? 0.85 + rnd() * 0.3 : 1,
    daze: "none",
    slipDir: 1,
  };
}

function makeMatron(s: GameState, at: Vec, points: Vec[]): Zombie {
  const z = makeZombie(s, "basic", at, 0);
  z.kind = "matron";
  z.r = MATRON_R;
  // 개체 변주는 기본 좀비 전용이다 — 아주머니는 "다른 종류의 적"이라 항상 같은 박자로 움직인다
  z.variant = 0;
  z.phase = 0;
  z.bobAmp = 1;
  z.patrolSpeed = s.tune.matron.patrol;
  z.chaseSpeed = s.tune.matron.chase;
  z.noticeR = s.tune.matron.notice;
  z.noticeDelay = s.tune.matron.delay;
  z.giveupMs = s.tune.matron.giveup;
  z.routePoints = points;
  z.path = points;
  z.stops = [];
  return z;
}

function resetZombie(s: GameState, z: Zombie): void {
  z.x = z.home.x;
  z.y = z.home.y;
  z.state = "patrol";
  z.t = 0;
  z.pauseT = 0;
  z.lastSeen = null;
  z.goal = null;
  z.route = [];
  z.routeAt = 0;
  z.stallT = 0;
  z.nearArmed = false;
  z.dir = 1;
  z.pathIndex = 0;
  // 분필을 줍기 전까지 제자리에서 하품만 하는 상태인가
  z.dormant =
    z.wakeOnIngredient !== null && !s.gotIngredients[z.wakeOnIngredient];
  z.knockCd = 0;

  if (z.routePoints) {
    // 손으로 찍은 웨이포인트를 BFS로 이어 붙인다.
    // 직선으로 두면 책상·급식 테이블에 걸려 멈춘다 — 실제로 그랬다.
    const path: Vec[] = [];
    const stops: number[] = [];
    for (let i = 0; i < z.routePoints.length; i++) {
      const a = i === 0 ? z.routePoints[z.routePoints.length - 1] : z.routePoints[i - 1];
      const leg = findPath(s, a, z.routePoints[i], true);
      for (const pt of leg) path.push(pt);
      stops.push(Math.max(0, path.length - 1));
    }
    z.path = path.length ? path : z.routePoints.slice();
    // 아주머니는 두리번거림 없이 쭉 간다. 배고픈 좀비는 지점마다 하품한다.
    z.stops = z.kind === "matron" ? [] : stops;
    // 서 있는 자리에서 가장 가까운 노드부터 돈다 (안 그러면 첫 노드까지 벽을 뚫듯 직진한다)
    let bestI = 0;
    let bestD = Infinity;
    z.path.forEach((pt, i) => {
      const d = dist(pt.x, pt.y, z.x, z.y);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    z.pathIndex = bestI;
    return;
  }
  if (z.kind === "matron") return;
  const built = buildPatrol(s, z.home, z.seed, 9);
  z.path = built.path;
  z.stops = built.stops;
}

function clampCamera(s: GameState): void {
  const scale = s.stage.renderScale;
  const viewW = VIEW_W / scale;
  const viewH = VIEW_H / scale;
  const maxX = s.map.w * TILE - viewW;
  const maxY = s.map.h * TILE - viewH;
  s.camera.x = Math.max(0, Math.min(s.camera.x, Math.max(0, maxX)));
  s.camera.y = Math.max(0, Math.min(s.camera.y, Math.max(0, maxY)));
}

// ---------------------------------------------------------------------------
// 입력
// ---------------------------------------------------------------------------

export function setMove(s: GameState, x: number, y: number): void {
  s.inx = x;
  s.iny = y;
}

export function setAim(s: GameState, angle: number | null): void {
  s.aim = angle;
}

export function pressInteract(s: GameState): void {
  s.held = true;
  s.pressed = true;
}

export function releaseInteract(s: GameState): void {
  s.held = false;
}

export function skipCutscene(s: GameState): void {
  if (s.phase === "sleeping" && s.sleepT > SKIP_AFTER_MS) s.sleepT = GAMEOVER_MS;
  else if (s.phase === "ritual") finishRitual(s);
}

export function throwChalk(s: GameState): void {
  if (s.phase !== "playing" || s.paused) return;
  if (s.stageId < 2) return;
  if (s.player.hiding >= 0) return;
  if (s.player.chalkCd > 0) return;
  // 다온(미술부)이 따라오면 분필을 더 자주 던질 수 있다 — 분필을 죽이는 게 아니라 더 쓰게 만든다
  const fast = s.friendPower[1];
  s.player.chalkCd = fast ? s.tune.chalkCdFast : s.tune.chalkCd;
  if (fast) s.powerPop[1] = 600;
  const a = s.aim ?? s.player.face;
  s.chalks.push({
    x: s.player.x,
    y: s.player.y,
    vx: Math.cos(a) * CHALK.speed,
    vy: Math.sin(a) * CHALK.speed,
    traveled: 0,
    landed: false,
    t: 0,
    spin: 0,
  });
  playSfx("chalkThrow");
  hint(s, "chalk");
}

export function placeAlarm(s: GameState): void {
  if (s.phase !== "playing" || s.paused) return;
  if (s.stageId < 3) return;
  if (s.player.hiding >= 0) return;
  if (s.player.alarms <= 0) return;
  s.player.alarms--;
  s.alarms.push({ x: s.player.x, y: s.player.y, t: 0, ringing: false, done: false });
  playSfx("alarmSet");
  hint(s, "alarm");
}

/** 파티 폭죽 — 분필과 같은 방향·속도로 날아가 착지 지점에서 터진다 */
export function throwPopper(s: GameState): void {
  if (s.phase !== "playing" || s.paused) return;
  if (s.stageId < 4) return;
  if (s.player.hiding >= 0) return;
  if (s.player.poppers <= 0) return;
  s.player.poppers--;
  const a = s.aim ?? s.player.face;
  s.poppers.push({
    x: s.player.x,
    y: s.player.y,
    vx: Math.cos(a) * POPPER.speed,
    vy: Math.sin(a) * POPPER.speed,
    traveled: 0,
    landed: false,
    t: 0,
    spin: 0,
  });
  playSfx("chalkThrow");
}

/** 바나나 껍질 — 발밑에 놓는다. 좀비(와 교장 선생님)가 밟으면 미끄러진다 */
export function placeBanana(s: GameState): void {
  if (s.phase !== "playing" || s.paused) return;
  if (s.stageId < 3) return;
  if (s.player.hiding >= 0) return;
  if (s.player.bananas <= 0) return;
  s.player.bananas--;
  s.bananas.push({ x: s.player.x, y: s.player.y, t: 0 });
  playSfx("bananaSet");
  hint(s, "banana");
}

export function toggleTorch(s: GameState): void {
  if (s.phase !== "playing" || s.paused) return;
  if (s.stageId < 3) return;
  s.player.torchOn = !s.player.torchOn;
  playSfx("flashlight");
  if (s.player.torchOn && !s.toldTorch) {
    s.toldTorch = true;
    setRadio(s, MECHANIC_HINTS.torch);
  }
}

export function toggleMap(s: GameState): void {
  s.mapOpen = !s.mapOpen;
}

function hint(s: GameState, key: string): void {
  if (s.hints.includes(key)) return;
  s.hints.push(key);
  const line = MECHANIC_HINTS[key];
  if (line) setRadio(s, line);
}

function setRadio(s: GameState, text: string): void {
  s.radio = text;
  s.radioT = 3400;
}

// ---------------------------------------------------------------------------
// 업데이트
// ---------------------------------------------------------------------------

export function update(s: GameState, dtMs: number): void {
  const dt = Math.min(dtMs, 50) / 1000;
  s.time += dtMs;

  if (s.radioT > 0) s.radioT -= dtMs;
  if (s.cardT > 0) s.cardT -= dtMs;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dtMs);
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dtMs);

  updateParticles(s, dt);
  updateFloaters(s, dt);

  if (s.paused || s.mapOpen) {
    s.pressed = false;
    return;
  }

  if (s.phase === "sleeping") {
    s.sleepT += dtMs;
    s.pressed = false;
    return;
  }
  if (s.phase === "stageClear") {
    s.pressed = false;
    return;
  }
  if (s.phase === "ritual") {
    updateRitual(s, dtMs);
    s.pressed = false;
    return;
  }
  if (s.phase === "venting") {
    // 관 속을 기어가는 동안에도 바깥 세상은 계속 돈다 — 시간이 멈추면 환풍구가 너무 세진다.
    // 다만 플레이어는 보이지 않고 잡히지도 않는다.
    s.ventT += dtMs;
    s.elapsed += dtMs;
    updateDoors(s, dtMs);
    updateChalks(s, dt, dtMs);
    updateAlarms(s, dtMs);
    updatePoppers(s, dt, dtMs);
    updateBananas(s, dtMs);
    updateZombies(s, dt, dtMs);
    updateFriends(s, dt, dtMs);
    updateBoss(s, dt, dtMs);
    updateCamera(s, dt);
    if (s.ventT >= VENT.crawlMs + VENT.exitMs) {
      s.phase = "playing";
      s.ventT = 0;
      s.ventFrom = -1;
      s.ventCd = VENT.cdMs;
      // 기어오는 1.2초 사이에 좀비가 출구 앞에 와 있을 수 있다.
      // `?` 없이 0px에서 잡히면 아이는 "내가 뭘 잘못했는지" 알 수 없다 — §M1 공정성 계약 위반.
      // 그래서 **등장 유예 0.6초** + 근처 좀비는 반드시 `?`부터 다시 시작한다. 시간 정지가 아니다.
      s.ventGrace = VENT.graceMs;
      for (const z of s.zombies) {
        if (dist(z.x, z.y, s.player.x, s.player.y) > 200) continue;
        if (z.state !== "chase" && z.state !== "notice") continue;
        z.state = "notice";
        z.t = noticeDelayMs(s, z);
      }
    }
    s.pressed = false;
    return;
  }

  if (s.hitstop > 0) {
    s.hitstop -= dtMs;
    s.pressed = false;
    return;
  }

  s.elapsed += dtMs;
  if (s.ventCd > 0) s.ventCd -= dtMs;
  if (s.ventGrace > 0) s.ventGrace -= dtMs;
  if (s.ventDenyT > 0) s.ventDenyT -= dtMs;
  if (s.broadcastFilling > 0) s.broadcastFilling -= dtMs;
  for (let i = 0; i < s.powerPop.length; i++) {
    if (s.powerPop[i] > 0) s.powerPop[i] -= dtMs;
  }
  updateFriendPowers(s, dtMs);

  // 전체 지도를 아이가 스스로 못 찾을 수 있어서 1-1에서 한 번 알려 준다
  if (s.stageId === 1 && s.elapsed > 9000) hint(s, "map");

  updatePlayer(s, dt, dtMs);
  updateDoors(s, dtMs);
  updateChalks(s, dt, dtMs);
  updateAlarms(s, dtMs);
  updatePoppers(s, dt, dtMs);
  updateBananas(s, dtMs);
  updateZombies(s, dt, dtMs);
  updateFriends(s, dt, dtMs);
  updateBoss(s, dt, dtMs);
  updateSection(s);
  updateInteraction(s, dtMs);
  updateCamera(s, dt);

  s.pressed = false;
}

function updateCamera(s: GameState, dt: number): void {
  const scale = s.stage.renderScale;
  const tx = s.player.x - VIEW_W / scale / 2;
  const ty = s.player.y - VIEW_H / scale / 2;
  const k = 1 - Math.pow(1 - CAM_LERP, dt * 60);
  s.camera.x += (tx - s.camera.x) * k;
  s.camera.y += (ty - s.camera.y) * k;
  clampCamera(s);
}

function updatePlayer(s: GameState, dt: number, dtMs: number): void {
  const p = s.player;
  if (p.chalkCd > 0) p.chalkCd -= dtMs;

  for (const [k, v] of p.lockerCd) {
    const next = v - dtMs;
    if (next <= 0) p.lockerCd.delete(k);
    else p.lockerCd.set(k, next);
  }

  // 사물함 문 여닫는 0.25초
  if (p.hideT > 0) {
    p.hideT -= dtMs;
    if (p.hideT <= 0) {
      p.hideT = 0;
      if (p.hideDir === -1) {
        p.hiding = -1;
        // 고른 방향이 있으면 그쪽 빈 자리로, 없으면 들어오기 전 자리로.
        // 사물함 칸은 통과 불가라 그 안에 두면 갇힌다
        const out = lockerExitSpot(s, p);
        p.x = out.x;
        p.y = out.y;
        if (p.hideAim) p.face = Math.atan2(p.hideAim.y, p.hideAim.x);
        p.hideAim = null;
        p.hideAimT = 0;
        unstick(s, p, PLAYER_R, false);
      }
    }
    return;
  }
  if (p.hiding >= 0) {
    setMuffled(true);
    updateHideAim(s, p, dtMs);
    return;
  }
  setMuffled(false);

  // 문 잠그는 0.6초 동안은 못 움직인다
  if (s.castDoor >= 0) {
    s.castT += dtMs;
    const door = s.doors[s.castDoor];
    if (!door || s.castT >= DOOR.castMs) {
      if (door) {
        door.lockT = DOOR.lockMs;
        door.uses--;
        door.castT = 0;
        playSfx("doorLock");
        spawnSparks(s, door.x, door.y, "#7FD4FF", 8);
      }
      s.castDoor = -1;
      s.castT = 0;
    }
    return;
  }

  let dx = s.inx;
  let dy = s.iny;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0.08;
  if (p.moving) {
    dx /= len;
    dy /= len;
    const mag = Math.min(1, len);
    const speed = PLAYER_SPEED * mag;
    moveCircle(s, p, PLAYER_R, dx * speed * dt, dy * speed * dt, false);
    p.face = Math.atan2(dy, dx);
    p.walkT += dt * speed * 0.06;
    // 발소리
    s.stepT -= dtMs * mag;
    if (s.stepT <= 0) {
      s.stepT = 280;
      const t = tileAt(s.map, tileOf(p.x), tileOf(p.y));
      const room = t && t.room >= 0 ? s.map.rooms[t.room] : null;
      playStep(t?.corridor ? "corridor" : room?.outdoor ? "field" : "room");
    }
  }
  if (s.aim !== null) p.face = s.aim;
  unstick(s, p, PLAYER_R, false);

  // 출구
  const tile = tileAt(s.map, tileOf(p.x), tileOf(p.y));
  if (tile?.exit && s.exitOpen) finishStage(s);
}

/**
 * 따라오는 친구의 특기를 매 프레임 다시 센다 (DESIGN §13-2). 전부 누적된다.
 * 어느 것도 좀비를 직접 무력화하지 않는다 — 전부 "조금 편해진다"의 범주다.
 */
function updateFriendPowers(s: GameState, dtMs: number): void {
  for (let i = 0; i < 4; i++) s.friendPower[i] = false;
  for (const f of s.friends) if (f.state === "follow") s.friendPower[f.who] = true;

  // 아직 못 구한 친구는 가까이 가면 "여기야!" 하고 부른다.
  // 넓은 스테이지 4에서 친구를 못 찾는 문제만 정확히 해결한다 — 버튼은 안 만든다.
  s.callT -= dtMs;
  if (s.callT <= 0) {
    s.callT = FRIEND_POWER.callMs;
    for (const f of s.friends) {
      if (f.state !== "asleep") continue;
      if (dist(f.x, f.y, s.player.x, s.player.y) > FRIEND_POWER.callR) continue;
      s.floaters.push({
        x: f.x,
        y: f.y - 30,
        text: "여기야!",
        color: "#7FD4FF",
        life: 1600,
      });
      // 2.5초마다 반복되는 **위치 비컨**이다. 구출 순간(friendWake)과 같은 소리를 쓰면
      // 정작 진짜 구출한 순간이 안 특별해진다.
      playFriendCall(f.x - s.player.x, dist(f.x, f.y, s.player.x, s.player.y));
      break;
    }
  }
}

function updateSection(s: GameState): void {
  const tx = s.player.x / TILE;
  const ty = s.player.y / TILE;
  const sections = s.stage.sections;
  for (let i = 0; i < sections.length; i++) {
    const z = sections[i].zone;
    if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) {
      if (s.section !== i || !s.visited[i]) {
        s.section = i;
        s.checkpoint = { x: sections[i].spawn.x * TILE, y: sections[i].spawn.y * TILE };
        if (!s.visited[i]) {
          s.visited[i] = true;
          s.card = sections[i].label;
          s.cardT = 1600;
          setRadio(s, sections[i].radio);
          playSfx("stageStart");
        }
      }
      return;
    }
  }
}

// --- 사물함에서 나갈 방향 고르기 -------------------------------------------

/** 숨어 있는 사물함의 중심. 들어갈 때 p.x = 칸 중심, p.y = 중심 + TILE*0.45 로 놓았다 */
function lockerCenter(p: GameState["player"]): Vec {
  return { x: p.x, y: p.y - TILE * 0.45 };
}

/** 입력 벡터를 8방향 단위 벡터로 맞춘다 */
function snap8(x: number, y: number): Vec {
  const a = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4);
  // 1e-16 같은 부동소수 찌꺼기를 없애서 방향 비교가 깔끔하게 되게
  return { x: Math.round(Math.cos(a) * 1000) / 1000, y: Math.round(Math.sin(a) * 1000) / 1000 };
}

/** 그 방향으로 나갔을 때 설 수 있는 자리. 못 서면 null */
function exitSpotToward(s: GameState, c: Vec, dir: Vec): Vec | null {
  for (const d of HIDE_EXIT_DIST) {
    const x = c.x + dir.x * d;
    const y = c.y + dir.y * d;
    if (!circleHits(s, x, y, PLAYER_R, false)) return { x, y };
  }
  return null;
}

/** 사방 중 나갈 수 있는 쪽을 비트로. 화살표 힌트를 그릴 때 쓴다 */
function lockerExitMask(s: GameState, c: Vec): number {
  const dirs = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ];
  let m = 0;
  for (let i = 0; i < 4; i++) if (exitSpotToward(s, c, dirs[i])) m |= 1 << i;
  return m;
}

function lockerExitSpot(s: GameState, p: GameState["player"]): Vec {
  if (p.hideAim) {
    const spot = exitSpotToward(s, lockerCenter(p), p.hideAim);
    if (spot) return spot;
  }
  return { x: p.hideFrom.x, y: p.hideFrom.y };
}

function leaveLocker(s: GameState, p: GameState["player"]): void {
  p.hideDir = -1;
  p.hideT = HIDE_ENTER_MS;
  playSfx("lockerOut");
  p.lockerCd.set(p.hiding, HIDE_RECD_MS);
}

/**
 * 숨은 채로 방향을 밀면 화살표가 그쪽을 가리키고, 계속 밀고 있으면 손 버튼 없이도 나간다.
 * 살짝 건드린 정도(조이스틱 흔들림)로는 안 나간다.
 */
function updateHideAim(s: GameState, p: GameState["player"], dtMs: number): void {
  if (p.hideT > 0) return;
  const mag = Math.hypot(s.inx, s.iny);
  if (mag < 0.45) {
    p.hideAimT = 0;
    return;
  }
  const dir = snap8(s.inx, s.iny);
  const same = p.hideAim && Math.abs(p.hideAim.x - dir.x) < 1e-6 && Math.abs(p.hideAim.y - dir.y) < 1e-6;
  if (!same) {
    p.hideAim = dir;
    p.hideAimT = 0;
    return;
  }
  // 막힌 쪽으로는 아무리 밀어도 안 나간다 — 화살표만 흐리게 보인다
  if (!exitSpotToward(s, lockerCenter(p), dir)) {
    p.hideAimT = 0;
    return;
  }
  p.hideAimT += dtMs;
  if (p.hideAimT >= HIDE_AIM_EXIT_MS) {
    p.hideAimT = 0;
    leaveLocker(s, p);
  }
}

/** 렌더러용 — 고른 방향으로 실제로 나갈 수 있는지 */
export function hideAimOpen(s: GameState): boolean {
  const p = s.player;
  if (p.hiding < 0 || !p.hideAim) return false;
  return exitSpotToward(s, lockerCenter(p), p.hideAim) !== null;
}

// --- 상호작용 ---------------------------------------------------------------

function updateInteraction(s: GameState, dtMs: number): void {
  const p = s.player;
  s.target = findTarget(s);

  if (p.hiding >= 0) {
    if (s.pressed && p.hideT <= 0) leaveLocker(s, p);
    return;
  }

  const t = s.target;
  // 꾹 누르는 것들 — 친구 깨우기 / 방송 켜기
  if (t && s.held) {
    if (t.kind === "friend") {
      const f = s.friends[t.index];
      f.wakeT += dtMs / FRIEND_WAKE_MS;
      if (f.wakeT >= 1) {
        f.wakeT = 0;
        wakeFriend(s, f);
      }
      return;
    }
    if (t.kind === "vent" && s.vents[t.index].found) {
      // 이미 찾은 환풍구 — 꾹 눌러 들어간다.
      // **아직 못 찾았으면 여기서 return하지 않는다.** 그러면 아래 `pressed` 발견 분기에
      // 영원히 도달하지 못한다 (`pressed`는 프레임마다 리셋되므로 사람 손으로는 못 누른다).
      const v = s.vents[t.index];
      if (ventBlocked(s)) {
        s.ventDenyT = 1000;
        v.charge = 0;
      } else if (Math.abs(s.inx) + Math.abs(s.iny) > 0.1) {
        // 도중에 움직이면 취소 — 0.8초 동안 무방비라는 게 이 메커닉의 값이다
        v.charge = 0;
      } else {
        v.charge += dtMs / VENT.enterMs;
        if (v.charge >= 1) enterVent(s, t.index);
      }
      return;
    }
    if (t.kind === "broadcast") {
      if (!s.exitOpen) {
        // 해독제를 안 만들고 오면 방송을 켤 수 없다
        if (s.radioT <= 0) setRadio(s, "먼저 과학실에서 해독제를 만들어야 해!");
        return;
      }
      const before = s.broadcast;
      // 세은(방송부)이 있으면 게이지가 1.5배 빨리 찬다. 보스 사이클 자체는 안 건드린다.
      const mult = s.friendPower[3] ? FRIEND_POWER.broadcastMult : 1;
      if (mult > 1) s.powerPop[3] = 400;
      s.broadcastFilling = 250;
      s.broadcast = Math.min(s.tune.broadcastHold, s.broadcast + dtMs * mult);
      if (Math.floor(before / 250) !== Math.floor(s.broadcast / 250)) {
        playBroadcastTick(s.broadcast / s.tune.broadcastHold);
      }
      if (s.broadcast >= s.tune.broadcastHold) finishStage(s);
      return;
    }
  }
  if (!s.held) {
    for (const f of s.friends) if (f.state === "asleep") f.wakeT = 0;
    for (const v of s.vents) v.charge = 0;
  }

  if (!s.pressed || !t) return;

  switch (t.kind) {
    case "item": {
      takeItem(s, s.items[t.index]);
      break;
    }
    case "door": {
      const d = s.doors[t.index];
      if (d.uses > 0 && d.lockT <= 0) {
        s.castDoor = t.index;
        s.castT = 0;
        hint(s, "door");
      }
      break;
    }
    case "locker": {
      p.hiding = t.index;
      p.hideDir = 1;
      p.hideT = HIDE_ENTER_MS;
      p.hideFrom = { x: p.x, y: p.y };
      p.x = t.x;
      p.y = t.y + TILE * 0.45;
      p.hideAim = null;
      p.hideAimT = 0;
      p.hideExits = lockerExitMask(s, { x: t.x, y: t.y });
      playSfx("lockerIn");
      hint(s, "locker");
      if (s.stageId === 1) bumpChallenge(s, 1);
      // 들어가는 걸 본 좀비는 사물함 앞에서 한참 하품한다
      for (const z of s.zombies) {
        if (z.state === "chase" || z.state === "notice") {
          z.state = "investigate";
          z.goal = { x: t.x, y: t.y };
          z.t = ZOMBIE_WAIT_MS;
          z.route = [];
        }
      }
      break;
    }
    case "vent": {
      const v = s.vents[t.index];
      // 걸어 들어가서가 아니라 **눌러서** 찾는다 — 그래야 "내가 찾았다"가 된다
      if (!v.found) findVent(s, v);
      break;
    }
    case "beaker": {
      if (s.phase === "playing") startRitual(s);
      break;
    }
    default:
      break;
  }
}

/** 어두운 방의 그릴은 손전등 없이는 벽과 구분되지 않는다 */
function ventHidden(s: GameState, v: VentEnt): boolean {
  const t = tileAt(s.map, tileOf(v.x), tileOf(v.y));
  if (!t || t.room < 0) return false;
  if (!s.map.rooms[t.room].dark) return false;
  return !s.player.torchOn;
}

/** 지금 이 환풍구에 들어갈 수 있는가. 못 들어가면 왜 못 들어가는지도 같이 돌려준다. */
function ventBlocked(s: GameState): boolean {
  if (s.ventCd > 0) return true;
  // 방송 게이지를 채우는 중에는 못 들어간다 (§13-1 보스 층 규칙)
  if (s.stageId === 5 && s.broadcastFilling > 0) return true;
  // **추격 중인 좀비가 200px 안에 있으면 절대 못 들어간다.**
  // 이 한 줄이 사물함("쫓길 때 살아남는 곳")의 자리를 지켜 준다.
  for (const z of s.zombies) {
    if (z.state !== "chase") continue;
    if (dist(z.x, z.y, s.player.x, s.player.y) <= VENT.blockR) return true;
  }
  return false;
}

function enterVent(s: GameState, index: number): void {
  const from = s.vents[index];
  const to = s.vents[from.other];
  if (!to) return;
  s.phase = "venting";
  s.ventT = 0;
  s.ventFrom = index;
  from.charge = 0;
  // 목격한 좀비는 환풍구 앞에서 하품하다 순찰로 돌아간다 (사물함과 같은 규칙)
  for (const z of s.zombies) {
    if (z.state === "chase" || z.state === "notice") {
      z.state = "investigate";
      z.goal = { x: from.x, y: from.y };
      z.t = ZOMBIE_WAIT_MS;
      z.route = [];
    }
  }
  // 크롤 연출이 화면을 덮는 동안 반대쪽으로 옮겨 둔다
  s.player.x = to.x;
  s.player.y = to.y;
  s.player.hiding = -1;
  unstick(s, s.player, PLAYER_R, false);
  playSfx("ventOpen");
  playSfx("ventCrawl");
}

function findVent(s: GameState, v: VentEnt): void {
  for (const other of s.vents) {
    if (other.id === v.id) other.found = true;
  }
  s.foundVents[v.id] = true;
  s.score += VENT.score;
  s.floaters.push({
    x: v.x,
    y: v.y - 22,
    text: `비밀 통로! +${VENT.score}`,
    color: COLORS.lockerTrim,
    life: 1500,
  });
  spawnSparks(s, v.x, v.y, COLORS.lockerTrim, 14);
  playSfx("ventFound");
  hint(s, "vent");
}

function findTarget(s: GameState): InteractTarget | null {
  const p = s.player;
  if (p.hiding >= 0) return null;
  let best: InteractTarget | null = null;
  let bestScore = Infinity;

  const consider = (
    kind: InteractTarget["kind"],
    x: number,
    y: number,
    index: number,
    priority: number,
  ) => {
    const d = dist(p.x, p.y, x, y);
    if (d > INTERACT_DIST + (kind === "locker" || kind === "broadcast" ? 12 : 0)) return;
    const score = priority * 1000 + d;
    if (score < bestScore) {
      bestScore = score;
      best = { kind, x, y, index };
    }
  };

  // 우선순위: 잠든 친구 > 재료/급식표 > 문 > 사물함
  s.friends.forEach((f, i) => {
    if (f.state === "asleep") consider("friend", f.x, f.y, i, 0);
  });
  s.items.forEach((it, i) => {
    if (!it.taken) consider("item", it.x, it.y, i, 1);
  });
  // 환풍구 — 어두운 방에서는 손전등을 켜야만 그릴이 보인다 (호기심에 값을 매긴다)
  s.vents.forEach((v, i) => {
    if (ventHidden(s, v)) return;
    consider("vent", v.x, v.y, i, 2);
  });
  s.doors.forEach((d, i) => {
    if (d.uses > 0 && d.lockT <= 0) consider("door", d.x, d.y, i, 3);
  });

  // 사물함 / 비커 / 방송실 문 — 타일을 직접 본다
  const tx = tileOf(p.x);
  const ty = tileOf(p.y);
  for (let y = ty - 1; y <= ty + 1; y++) {
    for (let x = tx - 1; x <= tx + 1; x++) {
      const t = tileAt(s.map, x, y);
      if (!t) continue;
      const c = center(x, y);
      const idx = y * s.map.w + x;
      if (t.locker && !s.player.lockerCd.has(idx)) consider("locker", c.x, c.y, idx, 4);
      if (t.beaker) consider("beaker", c.x, c.y, idx, 1);
      if (t.broadcast) consider("broadcast", c.x, c.y, idx, 0);
    }
  }
  return best;
}

function takeItem(s: GameState, it: ItemEnt): void {
  if (it.taken) return;
  it.taken = true;
  if (it.kind === "ingredient") {
    s.gotIngredients[it.index] = true;
    s.score += SCORE.ingredient;
    s.floaters.push({
      x: it.x,
      y: it.y - 20,
      text: `+${SCORE.ingredient}`,
      color: "#FFD34D",
      life: 1200,
    });
    s.flyIcons.push({ x: it.x, y: it.y, tx: 0, ty: 0, t: 0, index: it.index });
    s.hitstop = 120;
    spawnSparks(s, it.x, it.y, INGREDIENTS[it.index].color, 14);
    playSfx("pickup");
    setRadio(s, `${INGREDIENTS[it.index].name} 찾았다! 잘했어!`);
    wakeDormant(s, it.index);
    checkExit(s);
  } else if (it.kind === "menu") {
    s.gotMenus[it.index] = true;
    s.menusThisRun.push(it.index);
    s.score += SCORE.menu;
    s.floaters.push({
      x: it.x,
      y: it.y - 20,
      text: `+${SCORE.menu}`,
      color: "#FFF3C4",
      life: 1200,
    });
    spawnSparks(s, it.x, it.y, "#FFF3C4", 10);
    playSfx("paper");
    hint(s, "menu");
  } else if (it.kind === "alarm") {
    s.player.alarms = Math.min(s.tune.alarmMax, s.player.alarms + 1);
    playSfx("alarmSet");
    spawnSparks(s, it.x, it.y, "#FFC93C", 8);
  } else if (it.kind === "popper") {
    s.player.poppers = Math.min(s.tune.popperMax, s.player.poppers + 1);
    playSfx("alarmSet");
    spawnConfetti(s, it.x, it.y, 10);
    hint(s, "popperGet");
  } else {
    s.player.bananas = Math.min(s.tune.bananaMax, s.player.bananas + 1);
    playSfx("alarmSet");
    spawnSparks(s, it.x, it.y, "#FFE45C", 8);
    hint(s, "bananaGet");
  }
}

/** 이 재료를 기다리던 좀비가 있으면 지금부터 움직인다 */
function wakeDormant(s: GameState, ingredientIndex: number): void {
  for (const z of s.zombies) {
    if (!z.dormant || z.wakeOnIngredient !== ingredientIndex) continue;
    z.dormant = false;
    z.clankT = 0;
    hint(s, "matron");
  }
}

function checkExit(s: GameState): void {
  if (s.stageId === 5) return;
  const [a, b] = s.stage.ingredients;
  if (s.gotIngredients[a] && s.gotIngredients[b] && !s.exitOpen) {
    s.exitOpen = true;
    playSfx("exitOpen");
    setRadio(s, "재료 다 모았어! 계단으로 가!");
  }
}

// --- 분필 · 알람 · 문 -------------------------------------------------------

function updateChalks(s: GameState, dt: number, dtMs: number): void {
  for (let i = s.chalks.length - 1; i >= 0; i--) {
    const c = s.chalks[i];
    if (!c.landed) {
      const nx = c.x + c.vx * dt;
      const ny = c.y + c.vy * dt;
      c.traveled += Math.hypot(nx - c.x, ny - c.y);
      c.spin += dt * 14;
      if (blocksMove(s, tileOf(nx), tileOf(ny), false) || c.traveled >= CHALK.range) {
        c.landed = true;
        c.t = 0;
        playSfx("chalkLand");
        const turned = makeNoise(s, c.x, c.y, CHALK.noiseR, CHALK.distractMs, false);
        if (s.stageId === 2 && turned > 0) bumpChallenge(s, 1);
      } else {
        c.x = nx;
        c.y = ny;
      }
    } else {
      c.t += dtMs;
      if (c.t > 1600) s.chalks.splice(i, 1);
    }
  }
}

function updateAlarms(s: GameState, dtMs: number): void {
  for (let i = s.alarms.length - 1; i >= 0; i--) {
    const a = s.alarms[i];
    a.t += dtMs;
    if (!a.ringing && a.t >= ALARM.delay) {
      a.ringing = true;
      playAlarmRing();
    }
    if (a.ringing) {
      const ringT = a.t - ALARM.delay;
      if (Math.floor((ringT - dtMs) / 500) !== Math.floor(ringT / 500)) playAlarmRing();
      // 울리는 내내 붙잡아 둔다
      makeNoise(s, a.x, a.y, ALARM.noiseR, 400, true);
      if (s.stageId === 3 && !s.challengeDone) {
        const gathered = s.zombies.filter((z) => dist(z.x, z.y, a.x, a.y) < 44).length;
        if (gathered >= 2) bumpChallenge(s, 1);
      }
      if (ringT >= ALARM.ringMs) s.alarms.splice(i, 1);
    }
  }
}

function updatePoppers(s: GameState, dt: number, dtMs: number): void {
  for (let i = s.poppers.length - 1; i >= 0; i--) {
    const c = s.poppers[i];
    if (!c.landed) {
      const nx = c.x + c.vx * dt;
      const ny = c.y + c.vy * dt;
      c.traveled += Math.hypot(nx - c.x, ny - c.y);
      c.spin += dt * 10;
      if (blocksMove(s, tileOf(nx), tileOf(ny), false) || c.traveled >= POPPER.range) {
        c.landed = true;
        c.t = 0;
        playSfx("popper");
        s.shake = Math.max(s.shake, 120);
        spawnConfetti(s, c.x, c.y, 28);
        scareZombies(s, c.x, c.y, POPPER.scareR);
        hint(s, "popper");
      } else {
        c.x = nx;
        c.y = ny;
      }
    } else {
      c.t += dtMs;
      if (c.t > 900) s.poppers.splice(i, 1);
    }
  }
}

/** 반경 안 좀비가 터진 곳 반대쪽으로 도망친다. 추격 중이던 좀비도 놓친다 */
function scareZombies(s: GameState, x: number, y: number, radius: number): number {
  let scared = 0;
  for (const z of s.zombies) {
    if (z.dormant) continue;
    const d = dist(z.x, z.y, x, y);
    if (d > radius) continue;
    scared++;
    const dx = z.x - x;
    const dy = z.y - y;
    const len = Math.hypot(dx, dy) || 1;
    z.state = "flee";
    z.t = POPPER.fleeMs;
    z.stallT = 0;
    z.daze = "none";
    z.goal = { x: z.x + (dx / len) * POPPER.fleeDist, y: z.y + (dy / len) * POPPER.fleeDist };
    z.route = [];
    z.routeAt = 0;
    z.repathT = 0;
    z.nearArmed = false;
    z.pauseT = 0;
    s.floaters.push({ x: z.x, y: z.y - z.r - 14, text: "으악!", color: "#FFFFFF", life: 800 });
  }
  return scared;
}

function updateBananas(s: GameState, dtMs: number): void {
  for (let i = s.bananas.length - 1; i >= 0; i--) {
    const b = s.bananas[i];
    b.t += dtMs;
    if (b.t < BANANA.armMs) continue;
    let used = false;
    for (const z of s.zombies) {
      if (z.dormant) continue;
      if (z.stallT > 0 && z.daze === "slip") continue;
      if (dist(z.x, z.y, b.x, b.y) > BANANA.stepR) continue;
      // 「슈욱— 철푸덕!」 — 그 자리에 누워서 별이 뱅뱅 돈다. 쫓아오던 중이어도 끝.
      z.state = "patrol";
      z.goal = null;
      z.route = [];
      z.stallT = BANANA.slipMs;
      z.daze = "slip";
      z.slipDir = z.x >= b.x ? 1 : -1;
      z.pauseT = 0;
      z.nearArmed = false;
      resnapPatrol(z);
      used = true;
      break;
    }
    const boss = s.boss;
    if (
      !used &&
      boss &&
      boss.active &&
      boss.slipT <= 0 &&
      boss.phase !== "speech" &&
      dist(boss.x, boss.y, b.x, b.y) <= BANANA.stepR + 6
    ) {
      // 교장 선생님도 바나나엔 못 이긴다 — 연설 준비가 끊기고 누워 있다가 헛기침(회복)으로 이어진다
      boss.phase = "recover";
      boss.t = -BANANA.bossSlipMs;
      boss.slipT = BANANA.bossSlipMs;
      boss.radius = 0;
      boss.passArmed = false;
      setRadio(s, MECHANIC_HINTS.bossSlip);
      used = true;
    }
    if (used) {
      playSfx("slip");
      s.shake = Math.max(s.shake, 90);
      spawnSparks(s, b.x, b.y, "#FFE45C", 10);
      s.floaters.push({ x: b.x, y: b.y - 26, text: "철푸덕!", color: "#FFE45C", life: 1000 });
      s.bananas.splice(i, 1);
    }
  }
}

/** 멈춰 있던 자리에서 가장 가까운 순찰 지점부터 다시 돈다 */
function resnapPatrol(z: Zombie): void {
  let bestI = 0;
  let bestD = Infinity;
  z.path.forEach((pt, i) => {
    const dd = dist(pt.x, pt.y, z.x, z.y);
    if (dd < bestD) {
      bestD = dd;
      bestI = i;
    }
  });
  z.pathIndex = bestI;
}

function updateDoors(s: GameState, dtMs: number): void {
  for (const d of s.doors) {
    if (d.lockT > 0) d.lockT -= dtMs;
    if (d.knockT > 0) d.knockT -= dtMs;
  }
}

/** 소리 반경 안의 좀비를 그 지점으로 끌어온다 */
function makeNoise(
  s: GameState,
  x: number,
  y: number,
  radius: number,
  holdMs: number,
  keepHolding: boolean,
): number {
  let turned = 0;
  for (const z of s.zombies) {
    if (z.stallT > 0 && !keepHolding) continue;
    // 도망치는 중이거나 미끄러져 누워 있으면 소리에 반응하지 않는다
    if (z.state === "flee" || (z.stallT > 0 && z.daze !== "none")) continue;
    const d = dist(z.x, z.y, x, y);
    if (d > radius) continue;
    turned++;
    const ms = z.kind === "matron" && !keepHolding ? s.tune.matron.distractMs : holdMs;
    if (keepHolding) {
      // 알람시계 — 시계 쪽으로 와서 울리는 내내 붙잡힌다
      if (d < 36) {
        z.state = "investigate";
        z.t = Math.max(z.t, ms);
        z.goal = { x, y };
        z.route = [];
        continue;
      }
    }
    z.state = "investigate";
    z.goal = { x, y };
    z.t = ms;
    z.route = [];
    z.routeAt = 0;
    z.repathT = 0;
    z.nearArmed = false;
  }
  return turned;
}

// --- 좀비 ------------------------------------------------------------------

function updateZombies(s: GameState, dt: number, dtMs: number): void {
  const p = s.player;
  const hidden = p.hiding >= 0;
  s.yawnBudget = Math.max(0, s.yawnBudget - dtMs);

  for (const z of s.zombies) {
    z.bob += dt * (z.state === "chase" ? 9 : 4);
    if (z.nearCd > 0) z.nearCd -= dtMs;

    if (z.stallT > 0) {
      z.stallT -= dtMs;
      if (z.daze === "none") yawnTimer(s, z, dtMs, true);
      else if (z.stallT <= 0) z.daze = "none";
      continue;
    }
    z.daze = "none";

    // 감지
    let noticeR = z.noticeR;
    const tile = tileAt(s.map, tileOf(p.x), tileOf(p.y));
    const room = tile && tile.room >= 0 ? s.map.rooms[tile.room] : null;
    if (p.torchOn && room?.dark) noticeR *= s.tune.torchMult;
    const dp = dist(z.x, z.y, p.x, p.y);
    const sees =
      !hidden && dp <= noticeR && hasLineOfSight(s.map, z.x, z.y, p.x, p.y);

    switch (z.state) {
      case "patrol":
        if (sees) {
          z.state = "notice";
          z.t = noticeDelayMs(s, z);
          playSfx("notice");
          if (s.friendPower[0] && s.stageId >= 4) s.powerPop[0] = 700;
        } else {
          patrolStep(s, z, dt, dtMs);
        }
        break;
      case "notice":
        z.t -= dtMs;
        if (!sees) {
          z.state = "patrol";
        } else if (z.t <= 0) {
          z.state = "chase";
          z.lastSeen = { x: p.x, y: p.y };
          z.nearArmed = false;
          s.neverSpotted = false;
          s.shake = Math.max(s.shake, 150);
          playSfx("alert");
        }
        break;
      case "chase": {
        const goal = chaseTarget(s, z);
        if (sees) {
          z.lastSeen = { x: p.x, y: p.y };
          z.t = z.giveupMs;
        } else if (s.tune.dropChaseOnLos) {
          // 쉬움 — 모퉁이를 돌면 놓친다. 7살의 본능("벽 뒤로 숨는다")을 항상 정답으로 만든다.
          // 마지막 목격 지점까지는 느긋하게 걸어가므로 화면상으론 똑같아 보인다.
          z.state = "investigate";
          z.goal = z.lastSeen;
          z.t = 1200;
          z.route = [];
        } else {
          z.t -= dtMs;
          if (z.t <= 0) {
            z.state = "investigate";
            z.goal = z.lastSeen;
            z.t = 2000;
            z.route = [];
          }
        }
        steerTo(s, z, goal.x, goal.y, z.chaseSpeed, dt, dtMs);
        checkNearMiss(s, z, dp);
        break;
      }
      case "investigate": {
        const goal = z.goal;
        if (!goal) {
          z.state = "patrol";
          break;
        }
        if (sees) {
          z.state = "notice";
          z.t = noticeDelayMs(s, z);
          playSfx("notice");
          break;
        }
        const d = dist(z.x, z.y, goal.x, goal.y);
        if (d > 18) {
          steerTo(s, z, goal.x, goal.y, z.patrolSpeed * 1.25, dt, dtMs);
        } else {
          z.t -= dtMs;
          yawnTimer(s, z, dtMs, true);
          if (z.t <= 0) {
            z.state = "patrol";
            z.goal = null;
            // 가까운 순찰 지점부터 다시
            let bestI = 0;
            let bestD = Infinity;
            z.path.forEach((pt, i) => {
              const dd = dist(pt.x, pt.y, z.x, z.y);
              if (dd < bestD) {
                bestD = dd;
                bestI = i;
              }
            });
            z.pathIndex = bestI;
          }
        }
        break;
      }
      case "flee": {
        // 폭죽에 놀라 반대쪽으로 냅다 뛴다 — 그동안은 아무것도 못 본다
        z.t -= dtMs;
        if (z.goal) steerTo(s, z, z.goal.x, z.goal.y, z.chaseSpeed * 1.1, dt, dtMs);
        if (z.t <= 0 || (z.goal && dist(z.x, z.y, z.goal.x, z.goal.y) < 12)) {
          z.state = "patrol";
          z.goal = null;
          z.stallT = POPPER.dizzyMs;
          z.daze = "dizzy";
          resnapPatrol(z);
        }
        break;
      }
      default:
        break;
    }

    yawnTimer(s, z, dtMs, z.state === "patrol" && z.pauseT > 0);
    knockOnLockedDoor(s, z, dtMs);

    if (z.kind === "matron" && !z.dormant) {
      z.clankT -= dtMs;
      if (z.clankT <= 0) {
        z.clankT = 300;
        playClank(z.x - p.x, dp);
      }
    }

    // 잡힘 (환풍구에서 막 나온 0.6초 동안은 잡히지 않는다)
    if (
      !hidden &&
      z.state !== "flee" &&
      s.phase === "playing" &&
      s.ventGrace <= 0 &&
      dp < s.tune.catchDist
    ) {
      caught(s, z.kind === "matron" ? "matron" : hasFollower(s) ? "buddy" : "pillow");
    }
  }
}

/**
 * 잠긴 문에 막힌 좀비는 0.6초 멈춰 세 번 두드리고 다른 길로 돌아간다.
 * 이건 정보성 소리가 아니라 **보상 피드백**이다 — 문을 잠근 게 먹혔다는 확인.
 * 소리를 꺼도 알 수 있게 문틀이 같이 흔들린다 (§9-0).
 */
function knockOnLockedDoor(s: GameState, z: Zombie, dtMs: number): void {
  if (z.knockCd > 0) {
    z.knockCd -= dtMs;
    return;
  }
  if (z.state !== "chase" && z.state !== "investigate") return;
  for (const d of s.doors) {
    if (d.lockT <= 0) continue;
    if (dist(z.x, z.y, d.x, d.y) > 36) continue;
    z.knockCd = 4000;
    z.stallT = Math.max(z.stallT, 600);
    d.knockT = 600;
    playSfx("knock");
    return;
  }
}

/** 하늘(축구부)이 따라오면 스테이지 4·5에서 `?` 유예가 0.2초 늘어난다 */
function noticeDelayMs(s: GameState, z: Zombie): number {
  const bonus = s.friendPower[0] && s.stageId >= 4 ? FRIEND_POWER.noticeBonus : 0;
  return (z.noticeDelay + bonus) * 1000;
}

function hasFollower(s: GameState): boolean {
  return s.friends.some((f) => f.state === "follow");
}

/** 추격 중인 좀비는 플레이어와 친구들 중 가장 가까운 쪽을 쫓는다 */
function chaseTarget(s: GameState, z: Zombie): Vec {
  let best: Vec = z.lastSeen ?? { x: s.player.x, y: s.player.y };
  let bestD = dist(z.x, z.y, best.x, best.y);
  for (const f of s.friends) {
    if (f.state !== "follow") continue;
    const d = dist(z.x, z.y, f.x, f.y);
    if (d < bestD) {
      bestD = d;
      best = { x: f.x, y: f.y };
    }
  }
  return best;
}

function checkNearMiss(s: GameState, z: Zombie, d: number): void {
  if (d < NEAR_MISS_IN) z.nearArmed = true;
  else if (z.nearArmed && d > NEAR_MISS_OUT && z.nearCd <= 0) {
    z.nearArmed = false;
    z.nearCd = 2500;
    s.score += SCORE.nearMiss;
    s.nearMissScore += SCORE.nearMiss;
    s.flash = 200;
    s.floaters.push({
      x: s.player.x,
      y: s.player.y - 26,
      text: `아슬아슬! +${SCORE.nearMiss}`,
      color: "#FFFFFF",
      life: 1000,
    });
    playSfx("nearMiss");
  }
}

function yawnTimer(s: GameState, z: Zombie, dtMs: number, active: boolean): void {
  z.yawnT -= dtMs;
  if (z.yawnT > 0) return;
  z.yawnT = active ? 1800 + Math.random() * 1600 : 3200 + Math.random() * 2600;
  if (z.kind === "matron") return;
  const d = dist(z.x, z.y, s.player.x, s.player.y);
  if (d > YAWN_HEAR_R) return;
  if (s.yawnBudget > 0) return;
  s.yawnBudget = 160;
  const blocked = !hasLineOfSight(s.map, z.x, z.y, s.player.x, s.player.y);
  playYawn(z.x - s.player.x, d, blocked);
  hint(s, "yawn");
}

function patrolStep(s: GameState, z: Zombie, dt: number, dtMs: number): void {
  // 아직 깨어나지 않았다 — 제자리에서 하품만 한다
  if (z.dormant) return;
  if (z.pauseT > 0) {
    z.pauseT -= dtMs;
    return;
  }
  if (!z.path.length) return;
  const goal = z.path[z.pathIndex % z.path.length];
  const d = dist(z.x, z.y, goal.x, goal.y);
  if (d < 6) {
    const wasStop = z.stops.includes(z.pathIndex % z.path.length);
    z.pathIndex = (z.pathIndex + 1) % z.path.length;
    // 각 지점에서 0.8~1.6초 멈춰 하품
    if (wasStop || z.kind === "matron") {
      if (z.kind !== "matron") z.pauseT = 800 + Math.random() * 800;
    }
    return;
  }
  moveToward(s, z, goal.x, goal.y, z.patrolSpeed, dt);
}

function steerTo(
  s: GameState,
  z: Zombie,
  gx: number,
  gy: number,
  speed: number,
  dt: number,
  dtMs: number,
): void {
  // 보이면 곧장, 안 보이면 벽을 돌아 들어온다
  if (hasLineOfSight(s.map, z.x, z.y, gx, gy)) {
    z.route = [];
    moveToward(s, z, gx, gy, speed, dt);
    return;
  }
  z.repathT -= dtMs;
  if (!z.route.length || z.repathT <= 0) {
    z.route = findPath(s, { x: z.x, y: z.y }, { x: gx, y: gy }, true);
    z.routeAt = 0;
    z.repathT = 500;
  }
  while (z.routeAt < z.route.length && dist(z.x, z.y, z.route[z.routeAt].x, z.route[z.routeAt].y) < 10) {
    z.routeAt++;
  }
  const next = z.route[z.routeAt];
  if (!next) {
    moveToward(s, z, gx, gy, speed, dt);
    return;
  }
  moveToward(s, z, next.x, next.y, speed, dt);
}

function moveToward(
  s: GameState,
  z: Zombie,
  gx: number,
  gy: number,
  speed: number,
  dt: number,
): void {
  const dx = gx - z.x;
  const dy = gy - z.y;
  const d = Math.hypot(dx, dy) || 1;
  moveCircle(s, z, z.r, (dx / d) * speed * dt, (dy / d) * speed * dt, true);
}

// --- 친구 ------------------------------------------------------------------

function wakeFriend(s: GameState, f: Friend): void {
  f.state = "follow";
  f.order = s.friendSeq++;
  f.trail = [];
  playSfx("friendWake");
  hint(s, "friend");
  setRadio(s, FRIENDS[f.who].line);
  if (!f.scored) {
    f.scored = true;
    s.friendScore += SCORE.friend;
    s.score += SCORE.friend;
    s.floaters.push({
      x: f.x,
      y: f.y - 24,
      text: `+${SCORE.friend}`,
      color: "#7FD4FF",
      life: 1200,
    });
  }
  spawnSparks(s, f.x, f.y, "#7FD4FF", 12);
  if (s.stageId === 4) {
    const awake = s.friends.filter((x) => x.state === "follow").length;
    s.floaters.push({
      x: s.player.x,
      y: s.player.y - 30,
      text: awake >= 4 ? `★ ${GOAL_DONE}` : `★ 친구 ${awake}/4`,
      color: "#FFD34D",
      life: 1300,
    });
  }
}

/**
 * 세 번째 별 도전 진행 (§16). 스테이지 4는 친구 수를 매 순간 보므로 여기로 안 온다.
 * 진행 중엔 `★ n/need`, 달성하면 `★ 목표 달성!` — 아이가 목표를 쫓다가 잊지 않게 한다.
 */
function bumpChallenge(s: GameState, n: number): void {
  if (s.challengeDone || s.phase !== "playing") return;
  const need = s.stage.challenge.need;
  s.challenge = Math.min(need, s.challenge + n);
  const done = s.challenge >= need;
  if (done) {
    s.challengeDone = true;
    playSfx("starPop");
  }
  s.floaters.push({
    x: s.player.x,
    y: s.player.y - 30,
    text: done ? `★ ${GOAL_DONE}` : `★ ${s.challenge}/${need}`,
    color: "#FFD34D",
    life: 1300,
  });
}

/** 오늘의 할 일 3개 — 별 하나에 목표 하나 (§16) */
export function goalsOf(s: GameState): GoalView[] {
  const [a, b] = s.stage.ingredients;
  const got = [a, b].filter((i) => s.gotIngredients[i]).length;
  const menus = s.stage.menuPieces.filter((i) => s.gotMenus[i]).length;
  const menuNeed = s.stage.menuPieces.length;
  const main: GoalView =
    s.stageId === 5
      ? { text: GOAL_MAIN_5, done: s.phase === "stageClear", now: s.exitOpen ? 1 : 0, need: 2 }
      : { text: GOAL_MAIN, done: s.phase === "stageClear", now: got, need: 2 };
  if (s.stageId === 5 && s.phase === "stageClear") main.now = 2;
  const menu: GoalView = { text: GOAL_MENU, done: menus >= menuNeed, now: menus, need: menuNeed };
  let ch: GoalView;
  if (s.stageId === 4) {
    const awake = s.friends.filter((f) => f.state === "follow").length;
    // 친구가 다시 잠들면 꺼질 수 있다 — 그게 사실이니 그대로 보여 준다
    ch = { text: s.stage.challenge.text, done: awake >= 4, now: awake, need: 4 };
  } else {
    ch = {
      text: s.stage.challenge.text,
      done: s.challengeDone,
      now: s.challenge,
      need: s.stage.challenge.need,
    };
  }
  return [main, menu, ch];
}

function updateFriends(s: GameState, dt: number, dtMs: number): void {
  const followers = s.friends
    .filter((f) => f.state === "follow")
    .sort((a, b) => a.order - b.order);

  let leadX = s.player.x;
  let leadY = s.player.y;
  followers.forEach((f, n) => {
    f.bob += dt * 6;
    // 뒤로 갈수록 간격을 벌린다 (32 / 46 / 60 / 74) — 넷이 한 덩어리로 뭉치지 않게
    const gap = FRIEND_FOLLOW_DIST + 14 * n;
    const d = dist(f.x, f.y, leadX, leadY);
    if (d > gap) {
      const k = Math.min(1, (dt * 240) / Math.max(d, 1));
      const tx = leadX + ((f.x - leadX) / d) * gap;
      const ty = leadY + ((f.y - leadY) / d) * gap;
      moveCircle(s, f, PLAYER_R - 2, (tx - f.x) * k * 3, (ty - f.y) * k * 3, false);
    }
    leadX = f.x;
    leadY = f.y;

    // 좀비에 닿으면 그 자리에서 잠들고, 좀비는 2초간 같이 하품한다
    for (const z of s.zombies) {
      if (z.stallT > 0) continue;
      if (dist(z.x, z.y, f.x, f.y) < s.tune.catchDist + 2) {
        f.state = "down";
        f.wakeT = 0;
        z.stallT = FRIEND_STALL_MS;
        z.state = "patrol";
        playSfx("friendCaught");
        setRadio(s, FRIENDS[f.who].sleepLine);
        spawnZzz(s, f.x, f.y);
        break;
      }
    }
  });
  // 다시 잠든 친구는 그 자리에서 깨우면 된다
  for (const f of s.friends) {
    if (f.state === "down") {
      f.state = "asleep";
      f.home = { x: f.x, y: f.y };
    }
  }
  void dtMs;
}

// --- 보스 ------------------------------------------------------------------

function updateBoss(s: GameState, dt: number, dtMs: number): void {
  const b = s.boss;
  if (!b) return;
  if (!b.active) {
    if (s.visited[1] || s.visited[2]) {
      b.active = true;
      setRadio(s, BOSS_INTRO);
      hint(s, "boss");
    }
    return;
  }
  b.bob += dt * 3;
  const p = s.player;
  const dp = dist(b.x, b.y, p.x, p.y);
  b.t += dtMs;
  if (b.slipT > 0) {
    // 바나나에 미끄러져 누워 있다 — 완전 무해
    b.slipT -= dtMs;
    return;
  }

  switch (b.phase) {
    case "walk":
      if (p.hiding < 0) moveToward2(s, b, p.x, p.y, s.tune.bossWalkSpeed, dt);
      if (dp < s.tune.bossCatchDist && p.hiding < 0 && s.ventGrace <= 0) caught(s, "boss");
      if (b.t >= BOSS.walkMs) {
        b.phase = "windup";
        b.t = 0;
        playSfx("bossSpeech");
      }
      break;
    case "windup":
      if (dp < s.tune.bossCatchDist && p.hiding < 0 && s.ventGrace <= 0) caught(s, "boss");
      if (b.t >= BOSS.windupMs) {
        b.phase = "speech";
        b.t = 0;
        b.radius = 0;
        b.lineIndex = (b.lineIndex + 1) % BOSS_SPEECH.length;
        b.line = BOSS_SPEECH[b.lineIndex];
        // 연설은 일반 좀비도 더 졸리게 만든다 — 위협이자 기회
        for (const z of s.zombies) z.stallT = Math.max(z.stallT, BOSS.zombieStallMs);
      }
      break;
    case "speech": {
      b.radius = s.tune.bossSleepR * Math.min(1, b.t / BOSS.expandMs);
      // 연설 반경 언저리까지 들어와서(기둥 뒤든 뭐든) 안 잡히고 버티면 「연설 통과」 (§16)
      if (s.phase === "playing" && p.hiding < 0 && dp < s.tune.bossSleepR + 20) b.passArmed = true;
      if (Math.floor((b.t - dtMs) / 420) !== Math.floor(b.t / 420)) playSpeechSyllable();
      // 눈을 감고 있어 몸통 충돌은 꺼진다. 벽·기둥에 막히면 안전하다.
      if (
        p.hiding < 0 &&
        s.ventGrace <= 0 &&
        dp < b.radius &&
        hasLineOfSight(s.map, b.x, b.y, p.x, p.y)
      ) {
        caught(s, "boss");
      }
      if (b.t >= BOSS.speechMs) {
        b.phase = "recover";
        b.t = 0;
        b.radius = 0;
        playSfx("bossCough");
        setRadio(s, BOSS_COUGH);
        if (b.passArmed && s.phase === "playing") bumpChallenge(s, 1);
        b.passArmed = false;
      }
      break;
    }
    case "recover":
      // 완전 무해 — 지금이 기회다
      if (p.hiding < 0) moveToward2(s, b, p.x, p.y, BOSS.recoverSpeed, dt);
      if (b.t >= BOSS.recoverMs) {
        b.phase = "walk";
        b.t = 0;
      }
      break;
  }
}

function moveToward2(s: GameState, b: Boss, gx: number, gy: number, speed: number, dt: number): void {
  const dx = gx - b.x;
  const dy = gy - b.y;
  const d = Math.hypot(dx, dy) || 1;
  moveCircle(s, b, BOSS_R, (dx / d) * speed * dt, (dy / d) * speed * dt, true);
}

// --- 5-1 해독제 조합 --------------------------------------------------------

function startRitual(s: GameState): void {
  s.phase = "ritual";
  s.ritualT = 0;
  s.ritualStep = 0;
}

function updateRitual(s: GameState, dtMs: number): void {
  s.ritualT += dtMs;
  const step = Math.min(8, Math.floor(s.ritualT / 1100));
  if (step !== s.ritualStep) {
    s.ritualStep = step;
    if (step <= 7) {
      playSfx("pickup");
      spawnSparks(s, s.player.x, s.player.y - 30, INGREDIENTS[step].color, 10);
    }
  }
  if (s.ritualT > 8 * 1100 + 1400) finishRitual(s);
}

function finishRitual(s: GameState): void {
  if (s.phase !== "ritual") return;
  s.phase = "playing";
  s.ritualStep = 8;
  s.exitOpen = true;
  playSfx("ingredientComplete");
  spawnSparks(s, s.player.x, s.player.y - 20, "#FF9ED2", 26);
  setRadio(s, "해독제 완성! 방송실로 가자!");
}

// --- 잠들기 · 클리어 ---------------------------------------------------------

function caught(s: GameState, kind: GameState["sleepKind"]): void {
  if (s.phase !== "playing") return;
  s.phase = "sleeping";
  s.sleepKind = kind;
  s.sleepLine = randomSleepLine();
  s.sleepT = 0;
  s.sleeps++;
  s.inx = 0;
  s.iny = 0;
  playSfx("sleep");
  spawnZzz(s, s.player.x, s.player.y);
}

/** 버튼을 누른 순간부터 조작 가능해지기까지 300ms 안. 상태 객체만 제자리에서 리셋한다. */
export function restartFromCheckpoint(s: GameState): void {
  s.phase = "playing";
  s.sleepT = 0;
  s.player.x = s.checkpoint.x;
  s.player.y = s.checkpoint.y;
  s.player.hiding = -1;
  s.player.hideT = 0;
  s.player.chalkCd = 0;
  s.player.lockerCd.clear();
  s.player.alarms = Math.max(s.player.alarms, s.tune.startAlarms);
  s.player.poppers = Math.max(s.player.poppers, s.tune.startPoppers);
  s.player.bananas = Math.max(s.player.bananas, s.tune.startBananas);
  s.chalks.length = 0;
  s.alarms.length = 0;
  s.poppers.length = 0;
  s.bananas.length = 0;
  s.ventT = 0;
  s.ventFrom = -1;
  s.ventCd = 0;
  s.ventDenyT = 0;
  s.ventGrace = 0;
  for (const v of s.vents) v.charge = 0;
  s.castDoor = -1;
  s.castT = 0;
  s.particles.length = 0;
  s.floaters.length = 0;
  s.inx = 0;
  s.iny = 0;
  s.held = false;
  for (const d of s.doors) {
    d.lockT = 0;
    d.castT = 0;
  }
  for (const z of s.zombies) resetZombie(s, z);
  for (const f of s.friends) {
    f.state = "asleep";
    f.wakeT = 0;
    f.x = f.home.x;
    f.y = f.home.y;
  }
  if (s.boss) {
    s.boss.x = s.boss.home.x;
    s.boss.y = s.boss.home.y;
    s.boss.phase = "walk";
    s.boss.t = 0;
    s.boss.radius = 0;
    s.boss.passArmed = false;
    s.boss.slipT = 0;
  }
  s.camera.x = s.player.x - VIEW_W / s.stage.renderScale / 2;
  s.camera.y = s.player.y - VIEW_H / s.stage.renderScale / 2;
  clampCamera(s);
  s.card = s.stage.sections[s.section].label;
  s.cardT = 1200;
  playSfx("stageStart");
}

function finishStage(s: GameState): void {
  if (s.phase !== "playing") return;
  s.phase = "stageClear";
  const [a, b] = s.stage.ingredients;
  const allIngredients = s.stageId === 5 || (s.gotIngredients[a] && s.gotIngredients[b]);
  const stageMenus = s.stage.menuPieces.filter((i) => s.gotMenus[i]).length;
  const allMenus = s.stage.menuPieces.every((i) => s.gotMenus[i]);
  const awake = s.friends.filter((f) => f.state === "follow").length;
  const friendsOk = s.stageId !== 4 || awake === 4;

  const sec = s.elapsed / 1000;
  const timeBonus = Math.max(0, Math.round((s.stage.par - sec) * SCORE.timePerSec));
  const ingredientScore =
    (s.stageId === 5 ? 0 : 0) +
    [a, b].filter((i) => s.gotIngredients[i]).length * SCORE.ingredient;
  const stealth = s.neverSpotted && allIngredients ? SCORE.stealth : 0;
  const fresh = s.sleeps === 0 ? SCORE.fresh : 0;
  // 스테이지 5에 따라 들어온 친구에게는 점수를 다시 주지 않는다
  const friendScore = s.friendScore;

  // 별 하나에 목표 하나 (§16): ★ 클리어 / ★ 급식표 / ★ 이 스테이지의 도전.
  // 「안 자기」는 더 이상 별 조건이 아니다 — 점수 보너스(쌩쌩해요!)로만 남는다.
  const challengeOk = s.stageId === 4 ? friendsOk : s.challengeDone;
  const goals = [true, allIngredients && allMenus, challengeOk];
  const stars = goals.filter(Boolean).length;

  const board: StageScore = {
    ingredients: ingredientScore,
    menus: stageMenus * SCORE.menu,
    friends: friendScore,
    clear: SCORE.clear,
    time: timeBonus,
    stealth,
    fresh,
    nearMiss: s.nearMissScore,
    total: 0,
    stars,
    goals,
  };
  board.total =
    board.ingredients +
    board.menus +
    board.friends +
    board.clear +
    board.time +
    board.stealth +
    board.fresh +
    board.nearMiss;
  // 어려움 ×1.5 — 벌이 아니라 동경의 대상이다 (쉬움에 벌점은 주지 않는다)
  board.total = Math.round(board.total * s.tune.scoreMult);
  s.score = board.total;
  s.score_ = board;
  s.rescued = awake;
}

// --- 파티클 ------------------------------------------------------------------

function spawnSparks(s: GameState, x: number, y: number, color: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 40 + Math.random() * 90;
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: 600 + Math.random() * 300,
      maxLife: 900,
      color,
      size: 2 + Math.random() * 3,
      kind: "spark",
    });
  }
}

const CONFETTI_COLORS = ["#FF7BA9", "#FFD34D", "#7FD4FF", "#A6D96A", "#C6A6E8", "#FFFFFF"];

/** 색종이 — 위로 튀어 올라 팔랑팔랑 떨어진다 */
function spawnConfetti(s: GameState, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const v = 90 + Math.random() * 140;
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 900 + Math.random() * 500,
      maxLife: 1400,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 3 + Math.random() * 3,
      kind: "confetti",
      rot: Math.random() * Math.PI * 2,
    });
  }
}

function spawnZzz(s: GameState, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    s.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 16,
      vx: 8 + Math.random() * 10,
      vy: -18 - Math.random() * 10,
      life: 1400,
      maxLife: 1400,
      color: "#FFFFFF",
      size: 9 + i * 2,
      kind: "zzz",
    });
  }
}

function updateParticles(s: GameState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.life -= dt * 1000;
    if (p.life <= 0) {
      s.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === "spark") p.vy += 220 * dt;
    if (p.kind === "confetti") {
      // 팔랑팔랑 — 느리게 떨어지며 좌우로 흔들리고 돈다
      p.vy += 90 * dt;
      p.vy = Math.min(p.vy, 70);
      p.vx *= 1 - 2.2 * dt;
      p.x += Math.sin(p.life * 0.012) * 18 * dt;
      p.rot = (p.rot ?? 0) + dt * 6;
    }
  }
}

function updateFloaters(s: GameState, dt: number): void {
  for (let i = s.floaters.length - 1; i >= 0; i--) {
    const f = s.floaters[i];
    f.life -= dt * 1000;
    f.y -= dt * 26;
    if (f.life <= 0) s.floaters.splice(i, 1);
  }
  for (let i = s.flyIcons.length - 1; i >= 0; i--) {
    const f = s.flyIcons[i];
    f.t += dt * 1.4;
    if (f.t >= 1) s.flyIcons.splice(i, 1);
  }
}

// --- HUD -------------------------------------------------------------------

export function toHud(s: GameState): HudState {
  const stageIngredients = s.stage.ingredients;
  const here = tileAt(s.map, tileOf(s.player.x), tileOf(s.player.y));
  const inDark = !!(here && here.room >= 0 && s.map.rooms[here.room].dark);
  return {
    phase: s.phase,
    section: s.stage.sections[s.section]?.label ?? "",
    score: Math.round(s.score),
    menus: s.gotMenus.filter(Boolean).length,
    ingredients: s.gotIngredients.slice(),
    alarms: s.player.alarms,
    poppers: s.player.poppers,
    bananas: s.player.bananas,
    torch: s.player.torchOn,
    canTorch: s.stageId >= 3 && inDark,
    canChalk: s.stageId >= 2,
    canAlarm: s.stageId >= 3,
    canPopper: s.stageId >= 4 && s.player.poppers > 0,
    canBanana: s.stageId >= 3 && s.player.bananas > 0,
    sleepLine: s.sleepLine,
    canSkip: s.phase === "sleeping" && s.sleepT > SKIP_AFTER_MS,
    showRestart: s.phase === "sleeping" && s.sleepT >= GAMEOVER_MS,
    broadcast: Math.round((s.broadcast / s.tune.broadcastHold) * 100),
    showBroadcast: s.stageId === 5 && (s.visited[2] || s.broadcast > 0),
    stars: s.score_?.stars ?? 0,
    scoreBoard: s.score_,
    sleeps: s.sleeps,
    stageId: s.stageId,
    goals: goalsOf(s),
    hasIngredientA: s.gotIngredients[stageIngredients[0]],
    hasIngredientB: s.gotIngredients[stageIngredients[1]],
    inDark,
    vents: s.foundVents.filter(Boolean).length,
    difficulty: s.tune.id,
    scoreMult: s.tune.scoreMult,
    companions: s.friends.filter((f) => f.state === "follow").map((f) => f.who),
    timeMs: Math.round(s.elapsed / 1000) * 1000,
  };
}

export { DARK_VIEW_R };
