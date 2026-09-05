import {
  BELL_COLORS,
  CANVAS_H,
  CANVAS_W,
  COLS,
  MOVE_MS,
  ROWS,
  THEMES,
  TILE,
} from "./constants";
import { getRoomBackground } from "./background";
import {
  DELTA,
  currentRoom,
  currentRuntime,
  isInteractable,
  isPropActive,
  tileAt,
} from "./engine";
import {
  drawBell,
  drawBoss,
  drawDoor,
  drawGhost,
  drawHero,
  drawHeroCheer,
  drawMoonMark,
  drawProp,
  drawSnowball,
  drawStarBox,
  drawWarnTile,
  roundRect,
} from "./sprites";
import {
  BOSS_FIGHT_MS,
  BOSS_HURT_MS,
  BOSS_MAX_HITS,
  ballProgress,
  bossLook,
  countdownOf,
} from "./boss";
import type { BossMood } from "./sprites";
import type { Theme } from "./constants";
import type { GameState, PropDef } from "./types";

interface Drawable {
  /** 정렬 기준 — 아래쪽에 있는 것이 나중에(앞에) 그려진다 */
  sortY: number;
  draw: () => void;
}

function heroPixel(s: GameState): { x: number; y: number; t: number } {
  const p = s.player;
  const t = p.moveAt < 0 ? 1 : Math.min(1, (s.now - p.moveAt) / MOVE_MS);
  const x = (p.fromTx + (p.tx - p.fromTx) * t) * TILE + TILE / 2;
  const y = (p.fromTy + (p.ty - p.fromTy) * t) * TILE + TILE / 2;
  return { x, y, t };
}

/** 지금 바라보고 있는 칸 — 확인 버튼이 무엇을 향하는지 알려 준다. */
function drawFacingMarker(ctx: CanvasRenderingContext2D, s: GameState, th: Theme): void {
  const p = s.player;
  const [dx, dy] = DELTA[p.dir];
  const fx = p.tx + dx;
  const fy = p.ty + dy;
  if (fx < 0 || fy < 0 || fx >= COLS || fy >= ROWS) return;
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(s.now / 300) * 0.15;
  ctx.strokeStyle = th.accent;
  ctx.lineWidth = 2;
  roundRect(ctx, fx * TILE + 3, fy * TILE + 3, TILE - 6, TILE - 6, 6);
  ctx.stroke();
  ctx.restore();
}

/** 아직 안 살펴본 물건 위에 뜨는 물음표 */
function drawInteractHint(ctx: CanvasRenderingContext2D, s: GameState, prop: PropDef): void {
  const rt = currentRuntime(s);
  if (rt.examined[prop.id]) return;
  const bob = Math.sin(s.now / 320 + prop.tx) * 2;
  const cx = prop.tx * TILE + TILE / 2;
  const cy = prop.ty * TILE - 8 + bob;
  ctx.save();
  ctx.fillStyle = "#fff3c4";
  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 10;
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", cx, cy);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save();
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

/** 방 전체에 깔리는 어둠. 별이 주변만 환하다. */
function drawGloom(ctx: CanvasRenderingContext2D, s: GameState, th: Theme): void {
  if (th.gloom <= 0) return;
  const { x, y } = heroPixel(s);
  const g = ctx.createRadialGradient(x, y, 40, x, y, 330);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, `rgba(0,0,0,${th.gloom * 0.45})`);
  g.addColorStop(1, `rgba(0,0,0,${th.gloom})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

/** #rrggbb 를 반투명 rgba로. 촛불마다 빛 색이 달라야 해서 필요하다. */
function hexToGlow(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function drawCandleGlow(ctx: CanvasRenderingContext2D, s: GameState): void {
  const def = currentRoom(s);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rt = currentRuntime(s);
  for (const prop of def.props) {
    // 꺼진 촛불은 빛나지 않는다 — 어느 초가 켜졌는지 한눈에 보여야 한다
    if (prop.art !== "candle" || !isPropActive(def, rt, prop)) continue;
    const cx = prop.tx * TILE + TILE / 2;
    const cy = prop.ty * TILE + TILE / 2 - 13;
    const r = 52 + Math.sin(s.now / 150 + prop.tx) * 5;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0, hexToGlow(prop.tint ?? "#9be7ff", 0.32));
    g.addColorStop(1, hexToGlow(prop.tint ?? "#9be7ff", 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 옥상에만 뜨는 커다란 달과 별 */
function drawRooftopSky(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save();
  for (let i = 0; i < 40; i++) {
    // 좌표를 인덱스에서 뽑아 매 프레임 흔들리지 않게 고정한다
    const x = ((i * 137) % CANVAS_W) + 3;
    const y = ((i * 89) % (CANVAS_H - 60)) + 20;
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(s.now / 700 + i)) * 0.6;
    ctx.fillStyle = "#fff3c4";
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // 달은 물건이 없는 위쪽 한가운데에. 망원경 위에 겹치면 정체불명의 거품처럼 보인다.
  const mx = CANVAS_W / 2;
  const my = 74;
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#fff3c4";
  ctx.beginPath();
  ctx.arc(mx, my, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(mx, my, 36, 0, Math.PI * 2);
  ctx.fill();
  // 분화구 — 밋밋한 원이 아니라 진짜 달로 보이게
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#8a7a5a";
  for (const [dx, dy, r0] of [
    [-12, -8, 7],
    [9, 4, 5],
    [-4, 13, 4],
    [14, -12, 3],
  ] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, r0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 떨어질 자리와 떨어지는 중인 눈덩이 */
function drawIncoming(ctx: CanvasRenderingContext2D, s: GameState): void {
  const b = s.boss;
  if (!b) return;
  const tint = bossLook(s.stageId).tint;
  for (const ball of b.balls) {
    drawWarnTile(ctx, ball.tx * TILE, ball.ty * TILE, ballProgress(ball, s.now), tint);
  }
  // 눈덩이는 표시 위에 그린다. 화면 위쪽에서 시작해 쭉 내려온다 —
  // 너무 높은 데서 시작하면 던진 게 한동안 안 보여서 경고가 묻힌다.
  for (const ball of b.balls) {
    const k = ballProgress(ball, s.now);
    const cx = ball.tx * TILE + TILE / 2;
    const top = -14;
    const land = ball.ty * TILE + TILE / 2;
    const cy = top + (land - top) * k * k;
    drawSnowball(ctx, cx, cy, tint, s.now);
  }
}

/** 남은 시간 · 남은 기회 · 도깨비 이름. 대결 중에만 화면 위에 얹힌다. */
function drawBossHud(ctx: CanvasRenderingContext2D, s: GameState): void {
  const b = s.boss;
  if (!b) return;
  const look = bossLook(s.stageId);

  ctx.save();
  // 위쪽에 깔리는 띠 — 글자가 벽 무늬에 묻히지 않게
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, CANVAS_W, 26);

  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = look.tint;
  ctx.fillText(`👹 ${look.name}`, 8, 13);

  // 남은 기회 — 하트가 줄어드는 게 제일 빨리 읽힌다
  ctx.textAlign = "right";
  ctx.font = "13px system-ui, sans-serif";
  const hearts = "❤️".repeat(Math.max(0, BOSS_MAX_HITS - b.hits)) +
    "🖤".repeat(Math.min(BOSS_MAX_HITS, b.hits));
  ctx.fillText(hearts, CANVAS_W - 8, 13);

  // 남은 시간 바
  if (b.stage === "fight") {
    const left = Math.max(0, 1 - (s.now - b.at) / BOSS_FIGHT_MS);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, 26, CANVAS_W, 4);
    ctx.fillStyle = left > 0.3 ? "#8affc1" : "#ffd166";
    ctx.fillRect(0, 26, CANVAS_W * left, 4);
    ctx.textAlign = "center";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${Math.ceil((BOSS_FIGHT_MS - (s.now - b.at)) / 1000)}초`, CANVAS_W / 2, 13);
  }
  ctx.restore();
}

/** 3·2·1 카운트다운과 결과 글자 */
function drawBossBanner(ctx: CanvasRenderingContext2D, s: GameState): void {
  const b = s.boss;
  if (!b) return;
  let text: string | null = null;
  let color = "#ffd166";
  if (b.stage === "intro") {
    const c = countdownOf(b, s.now);
    if (c > 0) text = String(c);
  } else if (b.stage === "won") {
    text = "이겼다!";
    color = "#8affc1";
  } else if (b.stage === "lost") {
    text = "아쉽다!";
    color = "#ffb4c8";
  }
  if (!text) return;

  // 나타날 때 크게 부풀었다 제자리로 — 눈이 저절로 따라간다
  const k = Math.min(1, (s.now - b.at) / 220);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${44 + (1 - k) * 26}px system-ui, sans-serif`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(text, CANVAS_W / 2, CANVAS_H / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, dpr: number): void {
  const def = currentRoom(s);
  const rt = currentRuntime(s);
  const th = THEMES[def.theme];

  // 바닥과 벽은 방마다 한 번 구워 둔 그림을 그대로 얹는다
  const baked = getRoomBackground(s.roomIndex, dpr, def);
  if (baked) {
    ctx.drawImage(baked, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, th.bgTop);
    bg.addColorStop(1, th.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (def.theme === "rooftop") drawRooftopSky(ctx, s);

  // 바닥에 붙은 것들 — 종과 달 표식
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = def.layout[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (ch >= "1" && ch <= "4") {
        const n = Number(ch);
        drawBell(ctx, cx, cy, BELL_COLORS[n - 1], (rt.bellFlash[n] ?? 0) > s.now, s.now);
      } else if (ch === "X") {
        drawMoonMark(ctx, cx, cy, s.now);
      }
    }
  }

  if (s.phase === "playing") drawFacingMarker(ctx, s, th);

  // 문
  const openT = rt.solved ? Math.min(1, (s.now - s.doorOpenAt) / 400) : 0;
  for (let y = 0; y < ROWS; y++) {
    const x = def.layout[y].indexOf("D");
    if (x >= 0) drawDoor(ctx, x * TILE + TILE / 2, y * TILE + TILE / 2, openT, th.accent, s.now);
  }

  // 물건 · 상자 · 별이 — 아래쪽에 있는 것을 나중에 그려 자연스럽게 겹치게 한다
  const items: Drawable[] = [];

  for (const prop of def.props) {
    const cx = prop.tx * TILE + TILE / 2;
    const cy = prop.ty * TILE + TILE / 2;
    items.push({
      sortY: prop.ty,
      draw: () => {
        if (prop.art === "ghost") drawGhost(ctx, cx, cy, s.now);
        else
          drawProp(ctx, prop.art, cx, cy, s.now, th.accent, {
            active: isPropActive(def, rt, prop),
            tint: prop.tint ?? null,
            burn: prop.burn,
          });
        if (s.phase === "playing" && isInteractable(def, prop)) drawInteractHint(ctx, s, prop);
      },
    });
  }

  for (const b of rt.boxes) {
    const onTarget = tileAt(def, b.tx, b.ty) === "X";
    items.push({
      sortY: b.ty,
      draw: () =>
        drawStarBox(ctx, b.tx * TILE + TILE / 2, b.ty * TILE + TILE / 2, onTarget, s.now),
    });
  }

  const hp = heroPixel(s);
  const p = s.player;
  // 걸음마다 다리를 바꿔 딛도록 사이클의 앞/뒤 절반을 번갈아 쓴다
  const phase = p.moveAt >= 0 ? (p.steps % 2 === 0 ? hp.t * 0.5 : hp.t * 0.5 + 0.5) : 0;
  // 눈덩이에 맞은 직후에는 깜빡인다 — 지금 무적이라는 표시
  const blinking =
    s.boss !== null && s.now - s.boss.hurtAt < BOSS_HURT_MS && Math.floor(s.now / 90) % 2 === 0;
  items.push({
    sortY: hp.y / TILE,
    draw: () => {
      if (s.phase === "stageClear") drawHeroCheer(ctx, hp.x, hp.y, s.now, s.look);
      else if (!blinking) drawHero(ctx, hp.x, hp.y, p.dir, phase, s.now, s.look);
    },
  });

  // 도깨비는 문 앞 허공에 떠서 아래를 내려다본다
  if (s.boss) {
    const b = s.boss;
    const look = bossLook(s.stageId);
    const mood: BossMood = b.stage === "won" ? "sad" : b.stage === "lost" ? "cheer" : "grin";
    // 등장할 때 위에서 쿵 떨어진다
    const drop = b.stage === "intro" ? Math.min(1, (s.now - b.at) / 420) : 1;
    const by = -40 + (74 + 40) * drop;
    items.push({
      sortY: -1,
      draw: () =>
        drawBoss(ctx, CANVAS_W / 2, by, s.now, look.body, look.bodyDark, mood, 1.2 + 0.35 * drop),
    });
  }

  items.sort((a, b) => a.sortY - b.sortY);
  for (const it of items) it.draw();

  drawGloom(ctx, s, th);
  drawCandleGlow(ctx, s);
  if (s.phase === "boss") drawIncoming(ctx, s);
  drawParticles(ctx, s);

  if (s.phase === "boss") {
    drawBossHud(ctx, s);
    drawBossBanner(ctx, s);
  }

  // 방을 통과하는 순간 하얗게 번쩍
  if (s.phase === "roomClear") {
    const k = Math.min(1, (s.now - s.clearAt) / 500);
    ctx.fillStyle = `rgba(255,243,196,${0.55 * (1 - k)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}
