import {
  ALARM,
  BOSS_R,
  BROADCAST_HOLD_MS,
  CHALK,
  COLORS,
  DARK_EYE_GLOW_R,
  DARK_VIEW_R,
  GAMEOVER_MS,
  MINIMAP_H,
  MINIMAP_MATRON_R,
  MINIMAP_W,
  MINIMAP_ZOMBIE_R,
  PLAYER_R,
  TILE,
  TORCH_ANGLE,
  TORCH_RANGE,
  VIEW_H,
  VIEW_W,
} from "./constants";
import { INGREDIENTS, tileAt } from "./maps";
import { hasLineOfSight } from "./engine";
import {
  drawAlarmOnGround,
  drawBeakerTile,
  drawBoss,
  drawBroadcastDoorTile,
  drawChalkPileTile,
  drawDoorTile,
  drawExitTile,
  drawFlyingChalk,
  drawFriend,
  drawFurniture,
  drawIngredient,
  drawLockerAjar,
  drawLockerOpenOverlay,
  drawLockerTile,
  drawMenuPiece,
  drawNotice,
  drawPillarTile,
  drawPlayer,
  drawStar,
  drawYawnBubble,
  drawZombie,
  roundRect,
} from "./sprites";
import { SLEEP_LINES, WAKE_LINE } from "./text";
import type { GameState, Look, RoomDef } from "./types";

let darkCanvas: HTMLCanvasElement | null = null;

/**
 * `!`가 뜬 시점(진짜 추격 시작 시각)을 좀비별로 기억한다.
 * `z.t`는 giveup까지 남은 시간을 담고(보이는 동안 계속 리셋됨) "경과 시간"이 아니라서
 * 오버슈트 애니메이션의 기준으로 쓸 수 없다 — 전환 시점에만 set/delete 하므로
 * 매 프레임 할당이 생기지 않는다.
 */
const chaseStartAt = new WeakMap<object, number>();

function darkLayer(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!darkCanvas) {
    darkCanvas = document.createElement("canvas");
    darkCanvas.width = VIEW_W;
    darkCanvas.height = VIEW_H;
  }
  return darkCanvas.getContext("2d");
}

function roomOf(s: GameState, wx: number, wy: number): RoomDef | null {
  const t = tileAt(s.map, Math.floor(wx / TILE), Math.floor(wy / TILE));
  if (!t || t.room < 0) return null;
  return s.map.rooms[t.room];
}

export function isDarkHere(s: GameState): boolean {
  const r = roomOf(s, s.player.x, s.player.y);
  return !!r?.dark;
}

/**
 * 어두운 방 **밖**에서 그 방 안을 들여다볼 때, 안에 있는 좀비·재료·급식표·친구는 그리지 않는다.
 * 어두운 바닥색은 보여도 되지만 밖에서 정찰이 되면 어둠 메커닉이 통째로 무력해진다 (DESIGN §M6).
 */
function hiddenByDark(s: GameState, wx: number, wy: number): boolean {
  const t = tileAt(s.map, Math.floor(wx / TILE), Math.floor(wy / TILE));
  if (!t || t.room < 0) return false;
  const room = s.map.rooms[t.room];
  if (!room.dark) return false;
  const here = tileAt(s.map, Math.floor(s.player.x / TILE), Math.floor(s.player.y / TILE));
  return !here || here.room !== t.room;
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, look: Look): void {
  const scale = s.stage.renderScale;
  ctx.save();

  // 화면 진동 ±2px — 놀이기구 느낌으로 과하지 않게
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  }

  ctx.fillStyle = "#1B1830";
  ctx.fillRect(-4, -4, VIEW_W + 8, VIEW_H + 8);

  const camX = Math.round(s.camera.x);
  const camY = Math.round(s.camera.y);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camX, -camY);
  drawWorld(ctx, s, camX, camY, scale, look);
  ctx.restore();

  if (isDarkHere(s)) drawDarkness(ctx, s, camX, camY, scale);

  drawOverlays(ctx, s, camX, camY, scale);
  ctx.restore();

  if (s.flash > 0) {
    ctx.save();
    ctx.globalAlpha = (s.flash / 200) * 0.5;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  drawMinimap(ctx, s);
  drawHudBits(ctx, s);

  if (s.phase === "sleeping") drawSleepScene(ctx, s, look);
  if (s.phase === "ritual") drawRitual(ctx, s);
}

// ---------------------------------------------------------------------------
// 월드
// ---------------------------------------------------------------------------

function drawWorld(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  camX: number,
  camY: number,
  scale: number,
  look: Look,
): void {
  const viewW = VIEW_W / scale;
  const viewH = VIEW_H / scale;
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const x1 = Math.min(s.map.w - 1, Math.ceil((camX + viewW) / TILE) + 1);
  const y1 = Math.min(s.map.h - 1, Math.ceil((camY + viewH) / TILE) + 1);
  const t = s.time;

  const playerTile = tileAt(s.map, Math.floor(s.player.x / TILE), Math.floor(s.player.y / TILE));
  const outdoor = playerTile && playerTile.room >= 0 && s.map.rooms[playerTile.room].outdoor;

  // 바닥
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = tileAt(s.map, tx, ty);
      if (!tile) continue;
      const px = tx * TILE;
      const py = ty * TILE;
      const room = tile.room >= 0 ? s.map.rooms[tile.room] : null;

      if (tile.solid && !tile.locker && !tile.pillar) {
        // 벽 (또는 책상)
        if (tile.blocksSight && s.map.raw[ty][tx] === "#") {
          ctx.fillStyle = room?.wall ?? (outdoor ? "#9AD5E8" : "#D9DDE6");
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(px, py + TILE - 6, TILE, 6);
        } else {
          ctx.fillStyle = room?.floor ?? COLORS.corridorFloor;
          ctx.fillRect(px, py, TILE, TILE);
          drawFurniture(ctx, px, py, s.stageId);
        }
        continue;
      }

      if (tile.corridor) {
        ctx.fillStyle = COLORS.corridorFloor;
        ctx.fillRect(px, py, TILE, TILE);
        // 노란 중앙 점선 — 길찾기의 기준선
        ctx.strokeStyle = "rgba(255,211,77,0.55)";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 11]);
        ctx.beginPath();
        const vertical = !tileAt(s.map, tx + 1, ty)?.corridor || !tileAt(s.map, tx - 1, ty)?.corridor;
        if (vertical) {
          ctx.moveTo(px + TILE / 2, py);
          ctx.lineTo(px + TILE / 2, py + TILE);
        } else {
          ctx.moveTo(px, py + TILE / 2);
          ctx.lineTo(px + TILE, py + TILE / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = room?.floor ?? "#EFE7DA";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }

      if (tile.exit) drawExitTile(ctx, px, py, s.exitOpen, t);
      if (tile.beaker) drawBeakerTile(ctx, px, py, s.exitOpen, t);
      if (tile.broadcast) {
        drawBroadcastDoorTile(ctx, px, py, s.broadcast / BROADCAST_HOLD_MS, t);
      }
      if (tile.chalkPile) drawChalkPileTile(ctx, px, py);
    }
  }

  // 사물함 · 기둥 · 문
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = tileAt(s.map, tx, ty);
      if (!tile) continue;
      const px = tx * TILE;
      const py = ty * TILE;
      if (tile.locker) {
        const idx = ty * s.map.w + tx;
        const isTarget = s.target?.kind === "locker" && s.target.index === idx;
        drawLockerTile(ctx, px, py, isTarget);
        // 열림/닫힘 — 지금 이 사물함 안에 숨어 있으면 문틈이 벌어져 보인다
        if (s.player.hiding === idx) drawLockerOpenOverlay(ctx, px, py);
        // 들어갈 수 있는 **그 한 칸**만 문이 살짝 열려 안이 비었다는 걸 보여 준다
        else if (isTarget) drawLockerAjar(ctx, px, py);
      } else if (tile.pillar) {
        drawPillarTile(ctx, px, py);
      } else if (tile.door) {
        const d = s.doors.find((dd) => dd.tile === ty * s.map.w + tx);
        // 좀비가 두드리는 동안 문틀이 세 번 흔들린다 — 소리를 꺼도 "막혔다"가 보인다
        const shake = d && d.knockT > 0 ? Math.sin(((600 - d.knockT) / 600) * Math.PI * 6) * 3 : 0;
        ctx.save();
        ctx.translate(shake, 0);
        drawDoorTile(ctx, px, py, !!d && d.lockT > 0, d ? d.uses : 0);
        ctx.restore();
      }
    }
  }

  // 알람 소리 반경 — 두꺼운 주황 원 + 남은 시간 링
  for (const a of s.alarms) {
    if (!a.ringing) continue;
    const left = 1 - (a.t - ALARM.delay) / ALARM.ringMs;
    ctx.save();
    ctx.strokeStyle = "rgba(255,150,50,0.75)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, ALARM.noiseR * (0.55 + 0.45 * (1 - (left % 0.25) * 4)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,190,90,0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    ctx.stroke();
    ctx.restore();
    drawAlarmOnGround(ctx, a.x, a.y, true, t);
  }
  for (const a of s.alarms) if (!a.ringing) drawAlarmOnGround(ctx, a.x, a.y, false, t);

  // 분필
  for (const c of s.chalks) {
    if (!c.landed) {
      drawFlyingChalk(ctx, c.x, c.y, c.spin);
    } else {
      const p = Math.min(1, c.t / 600);
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, CHALK.noiseR * p, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawFlyingChalk(ctx, c.x, c.y, 0);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", c.x, c.y - 10);
    }
  }

  // 물건
  for (const it of s.items) {
    if (it.taken) continue;
    if (hiddenByDark(s, it.x, it.y)) continue;
    if (it.kind === "ingredient") drawIngredient(ctx, it.x, it.y, it.index, t + it.ph * 300);
    else if (it.kind === "menu") {
      // 반경 90px 안에 들어오면 살짝 반짝인다
      const near = Math.hypot(it.x - s.player.x, it.y - s.player.y) < 90;
      ctx.save();
      ctx.globalAlpha = near ? 1 : 0.85;
      drawMenuPiece(ctx, it.x, it.y, t + it.ph * 300);
      ctx.restore();
    } else {
      drawIngredient(ctx, it.x, it.y, 3, t, TILE * 0.42);
    }
  }

  // 친구
  for (const f of s.friends) {
    if (hiddenByDark(s, f.x, f.y)) continue;
    drawFriend(ctx, f.x, f.y, f.who, PLAYER_R, t, f.state !== "follow");
    if (f.state === "asleep" && f.wakeT > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      roundRect(ctx, f.x - 18, f.y - 34, 36, 6, 3);
      ctx.fill();
      ctx.fillStyle = COLORS.friendGlow;
      roundRect(ctx, f.x - 17, f.y - 33, 34 * Math.min(1, f.wakeT), 4, 2);
      ctx.fill();
    }
  }

  // 교장 연설 범위 — 바닥에 깔리는 노란 반투명 원
  const boss = s.boss;
  if (boss?.active && boss.phase === "speech" && boss.radius > 0) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = COLORS.speechRing;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#FFC93C";
    ctx.lineWidth = 3 + Math.sin(t * 0.01) * 1.5;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (boss?.active && boss.phase === "windup") {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.03) * 0.3;
    ctx.strokeStyle = COLORS.speechRing;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y + BOSS_R * 0.8, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (boss?.active && boss.phase === "recover") {
    // 회복 = "지금 가라" 신호. 소리 없이도 읽혀야 한다.
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#5FD98A";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y + BOSS_R * 0.8, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#5FD98A";
    ctx.beginPath();
    ctx.arc(boss.x, boss.y - BOSS_R * 1.9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 좀비
  for (const z of s.zombies) {
    if (hiddenByDark(s, z.x, z.y)) {
      chaseStartAt.delete(z);
      continue;
    }
    drawZombie(ctx, z.x, z.y, {
      kind: z.kind,
      r: z.r,
      bob: z.bob,
      state: z.state,
      yawning: z.pauseT > 0 || z.stallT > 0,
      variant: z.variant,
      phase: z.phase,
      amp: z.bobAmp,
    });
    if (z.pauseT > 0 || z.stallT > 0) {
      drawYawnBubble(ctx, z.x, z.y, z.r, t, z.kind === "basic" ? z.variant : 0);
    }
    if (z.state === "notice") {
      drawNotice(ctx, z.x, z.y, z.r, "?", (z.noticeDelay * 1000 - z.t) / 1000, t);
    } else if (z.state === "chase") {
      let start = chaseStartAt.get(z);
      if (start === undefined) {
        start = t;
        chaseStartAt.set(z, t);
      }
      drawNotice(ctx, z.x, z.y, z.r, "!", (t - start) / 1000, t);
    } else {
      chaseStartAt.delete(z);
    }
  }

  if (boss?.active) drawBoss(ctx, boss.x, boss.y, BOSS_R, boss.phase, boss.bob);

  // 주인공
  if (s.player.hiding < 0 || s.player.hideT > 0) {
    drawPlayer(ctx, s.player.x, s.player.y, {
      look,
      r: PLAYER_R,
      walkT: s.player.walkT,
      moving: s.player.moving,
      torch: s.player.torchOn,
    });
  } else {
    // 사물함 안 — 살짝 열린 틈으로 밖이 보인다
    ctx.save();
    ctx.fillStyle = "rgba(40,34,64,0.55)";
    ctx.beginPath();
    ctx.arc(s.player.x, s.player.y - 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(s.player.x - 5, s.player.y - 8, 2.2, 0, Math.PI * 2);
    ctx.arc(s.player.x + 5, s.player.y - 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 파티클
  for (const p of s.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    if (p.kind === "zzz") {
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("z", p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 상호작용 말풍선
  const tgt = s.target;
  if (tgt && s.phase === "playing") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(30,26,58,0.82)";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.6;
    roundRect(ctx, tgt.x - 26, tgt.y - 48, 52, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label =
      tgt.kind === "friend"
        ? "깨우기"
        : tgt.kind === "item"
          ? "줍기"
          : tgt.kind === "door"
            ? "문 잠그기"
            : tgt.kind === "locker"
              ? "숨기"
              : tgt.kind === "beaker"
                ? "섞기"
                : "방송 켜기";
    ctx.fillText(label, tgt.x, tgt.y - 37);
    ctx.restore();
  }

  // 점수 뜨는 글씨
  for (const f of s.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life / 500);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 어둠 · 손전등
// ---------------------------------------------------------------------------

function drawDarkness(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  camX: number,
  camY: number,
  scale: number,
): void {
  const dctx = darkLayer();
  if (!dctx || !darkCanvas) return;
  const px = (s.player.x - camX) * scale;
  const py = (s.player.y - camY) * scale;

  dctx.clearRect(0, 0, VIEW_W, VIEW_H);
  // 검정이 아니라 짙은 남보라
  dctx.fillStyle = COLORS.darkOverlay;
  dctx.fillRect(0, 0, VIEW_W, VIEW_H);

  dctx.globalCompositeOperation = "destination-out";
  const r = DARK_VIEW_R * scale;
  const g = dctx.createRadialGradient(px, py, r * 0.25, px, py, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.7, "rgba(0,0,0,0.75)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  dctx.fillStyle = g;
  dctx.beginPath();
  dctx.arc(px, py, r, 0, Math.PI * 2);
  dctx.fill();

  if (s.player.torchOn) {
    const tr = TORCH_RANGE * scale;
    const a = s.player.face;
    const cone = dctx.createRadialGradient(px, py, 0, px, py, tr);
    cone.addColorStop(0, "rgba(0,0,0,1)");
    cone.addColorStop(0.75, "rgba(0,0,0,0.9)");
    cone.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = cone;
    dctx.beginPath();
    dctx.moveTo(px, py);
    dctx.arc(px, py, tr, a - TORCH_ANGLE / 2, a + TORCH_ANGLE / 2);
    dctx.closePath();
    dctx.fill();
  }
  dctx.globalCompositeOperation = "source-over";

  ctx.drawImage(darkCanvas, 0, 0);

  // 손전등 불빛 (따뜻한 재료 반짝임과 색으로 구분되는 차가운 흰노랑)
  if (s.player.torchOn) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.18;
    const tr = TORCH_RANGE * scale;
    const a = s.player.face;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, tr);
    grad.addColorStop(0, COLORS.torch);
    grad.addColorStop(1, "rgba(255,243,214,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, tr, a - TORCH_ANGLE / 2, a + TORCH_ANGLE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 어둠 속에서도 보이는 것 — 재료 반짝임과 좀비 눈 (벽 너머로는 안 보인다)
  ctx.save();
  for (const it of s.items) {
    if (it.taken) continue;
    const sx = (it.x - camX) * scale;
    const sy = (it.y - camY) * scale;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    grad.addColorStop(0, "rgba(255,224,138,0.85)");
    grad.addColorStop(1, "rgba(255,224,138,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const z of s.zombies) {
    if (!hasLineOfSight(s.map, z.x, z.y, s.player.x, s.player.y)) continue;
    const sx = (z.x - camX) * scale;
    const sy = (z.y - camY - z.r * 0.2) * scale;
    const rr = DARK_EYE_GLOW_R * scale;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
    grad.addColorStop(0, "rgba(180,124,255,0.55)");
    grad.addColorStop(1, "rgba(180,124,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 화면 위 표시
// ---------------------------------------------------------------------------

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  camX: number,
  camY: number,
  scale: number,
): void {
  // 화면 밖 급식 아주머니 — 가장자리 빨간 화살표
  for (const z of s.zombies) {
    if (z.kind !== "matron") continue;
    const sx = (z.x - camX) * scale;
    const sy = (z.y - camY) * scale;
    const inside = sx > 0 && sx < VIEW_W && sy > 0 && sy < VIEW_H;
    const d = Math.hypot(z.x - s.player.x, z.y - s.player.y);
    if (inside || d > MINIMAP_MATRON_R) continue;
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const ex = cx + Math.cos(a) * (VIEW_W / 2 - 22);
    const ey = cy + Math.sin(a) * (VIEW_H / 2 - 22);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = "#FF4D4D";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 재료를 주우면 아이콘이 하단 재료 줄로 날아간다
  for (const f of s.flyIcons) {
    const sx = (f.x - camX) * scale;
    const sy = (f.y - camY) * scale;
    const tx = VIEW_W / 2 - 100 + f.index * 26;
    const ty = VIEW_H - 6;
    const t = f.t;
    const ease = t * t;
    const x = sx + (tx - sx) * ease;
    const y = sy + (ty - sy) * ease - Math.sin(t * Math.PI) * 60;
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.3;
    drawIngredient(ctx, x, y, f.index, 0, 28 * (1 - t * 0.35));
    ctx.restore();
  }

  // 보스 연설 자막
  const boss = s.boss;
  if (boss?.active && boss.phase === "speech") {
    drawSubtitle(ctx, boss.line);
  }

  // 방송 게이지 — 5-3 내내 항상 크게
  if (s.stageId === 5 && (s.visited[2] || s.broadcast > 0)) {
    const w = VIEW_W - 60;
    const x = 30;
    const y = VIEW_H - 74;
    const ratio = s.broadcast / BROADCAST_HOLD_MS;
    ctx.save();
    ctx.fillStyle = "rgba(20,16,40,0.72)";
    roundRect(ctx, x, y, w, 26, 13);
    ctx.fill();
    ctx.strokeStyle =
      boss?.phase === "recover" ? "#5FD98A" : "rgba(255,255,255,0.6)";
    ctx.lineWidth = boss?.phase === "recover" ? 3 : 2;
    roundRect(ctx, x, y, w, 26, 13);
    ctx.stroke();
    ctx.fillStyle = ratio >= 1 ? "#5FD98A" : "#FFD34D";
    roundRect(ctx, x + 3, y + 3, Math.max(0, (w - 6) * ratio), 20, 10);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`방송 준비 ${Math.round(ratio * 100)}%`, VIEW_W / 2, y + 13);
    ctx.restore();
  }

  // 구역 이름 카드
  if (s.card && s.cardT > 0) {
    const a = Math.min(1, s.cardT / 400);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(20,16,40,0.8)";
    roundRect(ctx, VIEW_W / 2 - 110, 92, 220, 40, 14);
    ctx.fill();
    ctx.fillStyle = "#FFD34D";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.card, VIEW_W / 2, 112);
    ctx.restore();
  }

  // 무전
  if (s.radio && s.radioT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.radioT / 400);
    const text = s.radio.replaceAll("{이름}", s.playerName);
    ctx.font = "bold 14px system-ui, sans-serif";
    const w = Math.min(VIEW_W - 30, ctx.measureText(text).width + 34);
    const x = (VIEW_W - w) / 2;
    const y = VIEW_H - 46;
    ctx.fillStyle = "rgba(20,16,40,0.84)";
    roundRect(ctx, x, y, w, 32, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,211,77,0.5)";
    ctx.lineWidth = 1.6;
    roundRect(ctx, x, y, w, 32, 12);
    ctx.stroke();
    ctx.fillStyle = "#FFF6DF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, VIEW_W / 2, y + 16);
    ctx.restore();
  }
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.save();
  ctx.font = "bold 13px system-ui, sans-serif";
  const w = Math.min(VIEW_W - 24, ctx.measureText(text).width + 28);
  const x = (VIEW_W - w) / 2;
  const y = VIEW_H - 110;
  ctx.fillStyle = "rgba(20,16,40,0.8)";
  roundRect(ctx, x, y, w, 28, 10);
  ctx.fill();
  ctx.fillStyle = "#FFE9B8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, VIEW_W / 2, y + 14);
  ctx.restore();
}

function drawHudBits(ctx: CanvasRenderingContext2D, s: GameState): void {
  // 문 잠그는 중
  if (s.castDoor >= 0) {
    const p = s.castT / 600;
    ctx.save();
    ctx.fillStyle = "rgba(20,16,40,0.7)";
    roundRect(ctx, VIEW_W / 2 - 60, VIEW_H / 2 + 40, 120, 14, 7);
    ctx.fill();
    ctx.fillStyle = "#9FC4F0";
    roundRect(ctx, VIEW_W / 2 - 57, VIEW_H / 2 + 43, 114 * Math.min(1, p), 8, 4);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 미니맵
// ---------------------------------------------------------------------------

export function drawMinimap(ctx: CanvasRenderingContext2D, s: GameState): void {
  const x = 8;
  const y = 8;
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "rgba(24,20,48,0.72)";
  roundRect(ctx, x, y, MINIMAP_W, MINIMAP_H, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.4;
  roundRect(ctx, x, y, MINIMAP_W, MINIMAP_H, 8);
  ctx.stroke();
  ctx.clip();
  drawMapInto(ctx, s, x + 4, y + 4, MINIMAP_W - 8, MINIMAP_H - 8, false);
  ctx.restore();
}

/** 전체 지도 (미니맵을 탭하면 열린다) */
export function drawFullMap(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  w: number,
  h: number,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(24,20,48,0.94)";
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fill();
  drawMapInto(ctx, s, 10, 10, w - 20, h - 20, true);
}

function drawMapInto(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  big: boolean,
): void {
  const mw = s.map.w * TILE;
  const mh = s.map.h * TILE;
  const k = Math.min(bw / mw, bh / mh);
  const ox = bx + (bw - mw * k) / 2;
  const oy = by + (bh - mh * k) / 2;
  const px = (wx: number) => ox + wx * k;
  const py = (wy: number) => oy + wy * k;

  // 방은 단색 블록 하나로 (벽선·문·타일 디테일 전부 생략)
  for (const r of s.map.rooms) {
    ctx.fillStyle = r.dark ? "#3B3360" : r.outdoor ? "#7C6A4E" : "#6C6489";
    ctx.fillRect(px(r.x * TILE), py(r.y * TILE), r.w * TILE * k, r.h * TILE * k);
  }
  // 복도는 가는 회색 막대
  ctx.fillStyle = "#9AA0B0";
  for (let ty = 0; ty < s.map.h; ty++) {
    for (let tx = 0; tx < s.map.w; tx++) {
      const t = tileAt(s.map, tx, ty);
      if (t && t.corridor && !t.solid) {
        ctx.fillRect(px(tx * TILE), py(ty * TILE), TILE * k + 0.6, TILE * k + 0.6);
      }
    }
  }

  if (big) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const r of s.map.rooms) {
      ctx.fillText(
        r.name,
        px((r.x + r.w / 2) * TILE),
        py((r.y + r.h / 2) * TILE),
      );
    }
  }

  // 남은 재료 = 노란 `!`
  for (const it of s.items) {
    if (it.taken || it.kind !== "ingredient") continue;
    ctx.fillStyle = "#FFD34D";
    ctx.font = `bold ${big ? 16 : 11}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", px(it.x), py(it.y));
  }

  // 출구 = 초록 삼각
  for (let ty = 0; ty < s.map.h; ty++) {
    for (let tx = 0; tx < s.map.w; tx++) {
      const t = tileAt(s.map, tx, ty);
      if (!t?.exit && !t?.broadcast) continue;
      const cx = px(tx * TILE + TILE / 2);
      const cy = py(ty * TILE + TILE / 2);
      ctx.fillStyle = s.exitOpen || t.broadcast ? "#5FD98A" : "rgba(120,200,150,0.35)";
      const r = big ? 7 : 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 좀비 점은 벽을 무시하고 보인다 — 버그가 아니라 의도다 (벽 너머 하품 소리의 시각 번역)
  for (const z of s.zombies) {
    const d = Math.hypot(z.x - s.player.x, z.y - s.player.y);
    if (z.kind === "matron") {
      if (d > MINIMAP_MATRON_R) continue;
      ctx.fillStyle = "#FF4D4D";
      const r = big ? 7 : 4;
      ctx.fillRect(px(z.x) - r, py(z.y) - r, r * 2, r * 2);
    } else {
      if (d > MINIMAP_ZOMBIE_R) continue;
      ctx.fillStyle = "#B47CFF";
      ctx.beginPath();
      ctx.arc(px(z.x), py(z.y), big ? 6 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 친구
  for (const f of s.friends) {
    if (f.state === "follow") continue;
    ctx.fillStyle = COLORS.friendGlow;
    ctx.beginPath();
    ctx.arc(px(f.x), py(f.y), big ? 6 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 교장
  if (s.boss?.active) {
    ctx.fillStyle = "#F2C94C";
    const r = big ? 8 : 5;
    ctx.beginPath();
    ctx.arc(px(s.boss.x), py(s.boss.y), r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 나 = 흰 점 + 진행 방향 짧은 선
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(px(s.player.x), py(s.player.y), big ? 7 : 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = big ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(px(s.player.x), py(s.player.y));
  ctx.lineTo(
    px(s.player.x) + Math.cos(s.player.face) * (big ? 16 : 8),
    py(s.player.y) + Math.sin(s.player.face) * (big ? 16 : 8),
  );
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 잠든 연출 · 조합 연출
// ---------------------------------------------------------------------------

function drawSleepScene(ctx: CanvasRenderingContext2D, s: GameState, look: Look): void {
  const t = s.sleepT;
  const fade = Math.min(0.62, (t / 1000) * 0.35);
  ctx.save();
  ctx.fillStyle = `rgba(24,20,48,${fade})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2 - 10;

  // 1단계 큰 하품 → 2단계 베개 → 3단계 종소리
  const fallen = t > 1000;
  ctx.save();
  ctx.translate(cx, cy);
  if (fallen) ctx.rotate(Math.PI / 2.2);
  drawPlayer(ctx, 0, 0, {
    look,
    r: 22,
    walkT: 0,
    moving: false,
    sleeping: true,
  });
  ctx.restore();

  if (t > 1000) {
    const p = Math.min(1, (t - 1000) / 400);
    ctx.fillStyle = "#FFF1F6";
    ctx.strokeStyle = "#D8C7D4";
    ctx.lineWidth = 2;
    roundRect(ctx, cx - 34, cy - 60 + p * 44, 68, 26, 12);
    ctx.fill();
    ctx.stroke();
  }
  if (t > 1400) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const a = ((t - 1400) / 900 + i * 0.33) % 1;
      ctx.globalAlpha = 1 - a;
      ctx.fillText("z", cx + 30 + a * 26, cy - 20 - a * 40);
    }
    ctx.globalAlpha = 1;
  }

  // 변주
  ctx.fillStyle = "#FFE9B8";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  if (s.sleepKind === "matron" && t > 700) {
    ctx.fillText("\"맛있…\"", cx, cy + 70);
  } else if (s.sleepKind === "boss" && t > 700) {
    ctx.fillText("\"…그리고 세 번째로…\"", cx, cy + 70);
  } else if (s.sleepKind === "buddy" && t > 700) {
    ctx.fillText("짝꿍과 함께 잠들었다", cx, cy + 70);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("z  z", cx + 46, cy - 26);
  }

  if (t > 2000) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("딩동댕동~", cx, cy - 96);
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillStyle = "#FFE9B8";
    ctx.fillText(WAKE_LINE, cx, cy + 104);
  }
  if (t >= GAMEOVER_MS) {
    ctx.fillStyle = "#E7E2F3";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(s.sleepLine || SLEEP_LINES[0], cx, cy + 132);
  }
  ctx.restore();
}

function drawRitual(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save();
  ctx.fillStyle = "rgba(18,26,36,0.86)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("해독제 만들기", cx, 90);

  // 비커
  const done = s.ritualStep >= 8;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(cx - 46, cy - 50);
  ctx.lineTo(cx + 46, cy - 50);
  ctx.lineTo(cx + 34, cy + 60);
  ctx.lineTo(cx - 34, cy + 60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const fillH = 10 + s.ritualStep * 11;
  ctx.fillStyle = done ? "#FF9ED2" : "#B47CFF";
  ctx.beginPath();
  ctx.moveTo(cx - 34 - (fillH / 110) * 12, cy + 60 - fillH);
  ctx.lineTo(cx + 34 + (fillH / 110) * 12, cy + 60 - fillH);
  ctx.lineTo(cx + 34, cy + 60);
  ctx.lineTo(cx - 34, cy + 60);
  ctx.closePath();
  ctx.fill();

  // 들어간 재료 이름
  for (let i = 0; i < Math.min(8, s.ritualStep); i++) {
    drawIngredient(ctx, cx - 84 + (i % 4) * 56, cy + 110 + Math.floor(i / 4) * 44, i, s.time, 28);
  }
  if (s.ritualStep < 8) {
    ctx.fillStyle = "#FFE9B8";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(
      `${INGREDIENTS[Math.min(7, s.ritualStep)].name} 투입!`,
      cx,
      cy - 78,
    );
  } else {
    ctx.fillStyle = "#FF9ED2";
    ctx.font = "bold 17px system-ui, sans-serif";
    ctx.fillText("해독제 완성!", cx, cy - 78);
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("아무 데나 눌러 건너뛰기", cx, VIEW_H - 40);
  ctx.restore();
}

/** 스테이지 클리어 화면에서 쓰는 별 (React가 캔버스 하나에 그린다) */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stars: number,
  t: number,
): void {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const appear = Math.min(1, Math.max(0, (t - i * 400) / 300));
    const size = 22 * (0.6 + appear * 0.4);
    drawStar(ctx, w / 2 + (i - 1) * 58, h / 2, size, i < stars && appear > 0.2);
  }
}
