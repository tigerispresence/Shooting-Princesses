import { CANVAS_H, CANVAS_W, THEMES } from "./constants";
import type { StageDef } from "./constants";
import { roundRect, star } from "./sprites";

/**
 * 시작 화면과 스테이지 카드에 들어가는 그림. 전부 Canvas 2D로 그린다.
 *
 * 돌벽과 문처럼 움직이지 않는 부분은 방 배경과 같은 방식으로 한 번 구워 두고,
 * 촛불·먼지·열쇠구멍에서 새어 나오는 빛만 매 프레임 다시 그린다.
 */

const bakeCache = new Map<string, HTMLCanvasElement>();

function noise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// 시작 화면
// ---------------------------------------------------------------------------

/** 뒤쪽 돌벽 */
function stoneWall(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#2a1840");
  bg.addColorStop(1, "#0f0820");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const bw = 62;
  const bh = 30;
  for (let row = 0; row * bh < h; row++) {
    const offset = row % 2 === 0 ? 0 : -bw / 2;
    for (let col = -1; col * bw + offset < w; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const v = noise(col, row);
      ctx.fillStyle = `rgba(255,255,255,${0.012 + v * 0.022})`;
      ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
      if (v > 0.9) {
        ctx.fillStyle = "rgba(126,180,96,0.10)";
        ctx.beginPath();
        ctx.ellipse(x + 12 + v * 22, y + bh - 5, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** 화면 한가운데 버티고 선, 굳게 잠긴 아치문 */
function lockedDoor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const top = h * 0.3;
  const dw = 150;
  const dh = h * 0.62;

  // 문틀
  ctx.fillStyle = "#241633";
  ctx.beginPath();
  ctx.moveTo(cx - dw / 2 - 12, top + dh);
  ctx.lineTo(cx - dw / 2 - 12, top + 18);
  ctx.arc(cx, top + 18, dw / 2 + 12, Math.PI, 0);
  ctx.lineTo(cx + dw / 2 + 12, top + dh);
  ctx.closePath();
  ctx.fill();

  // 문짝
  const wood = ctx.createLinearGradient(cx - dw / 2, 0, cx + dw / 2, 0);
  wood.addColorStop(0, "#4a2c18");
  wood.addColorStop(0.5, "#6b4426");
  wood.addColorStop(1, "#3e2414");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(cx - dw / 2, top + dh);
  ctx.lineTo(cx - dw / 2, top + 18);
  ctx.arc(cx, top + 18, dw / 2, Math.PI, 0);
  ctx.lineTo(cx + dw / 2, top + dh);
  ctx.closePath();
  ctx.fill();

  // 널빤지 이음매
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const x = cx - dw / 2 + (i * dw) / 4;
    ctx.beginPath();
    ctx.moveTo(x, top + 20);
    ctx.lineTo(x, top + dh);
    ctx.stroke();
  }

  // 쇠 띠와 리벳
  ctx.fillStyle = "#8b8fa3";
  for (const by of [top + dh * 0.32, top + dh * 0.72]) {
    ctx.fillRect(cx - dw / 2, by, dw, 11);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(cx - dw / 2 + 14 + i * 24, by + 5.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#8b8fa3";
  }
}

function bakeTitle(w: number, h: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `title:${w}x${h}:${dpr}`;
  const hit = bakeCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  stoneWall(ctx, w, h);
  lockedDoor(ctx, w, h);

  // 벽에 걸린 열쇠 꾸러미 — 정작 필요한 열쇠는 여기 없다
  const kx = w * 0.16;
  const ky = h * 0.32;
  // 못과 고리
  ctx.strokeStyle = "#8b8fa3";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(kx, ky - 30);
  ctx.lineTo(kx, ky - 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(kx, ky - 8, 7, 0, Math.PI * 2);
  ctx.stroke();

  // 고리에 매달린 열쇠 세 자루. 아래로 늘어뜨리고 살짝만 벌린다.
  for (const [tilt, len] of [
    [-0.42, 30],
    [-0.02, 36],
    [0.4, 27],
  ] as const) {
    ctx.save();
    ctx.translate(kx, ky - 4);
    ctx.rotate(tilt);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    // 손잡이
    ctx.beginPath();
    ctx.arc(0, 5, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    // 몸통
    ctx.beginPath();
    ctx.moveTo(0, 9.5);
    ctx.lineTo(0, len);
    ctx.stroke();
    // 톱니
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, len);
    ctx.lineTo(5, len);
    ctx.moveTo(0, len - 6);
    ctx.lineTo(4, len - 6);
    ctx.stroke();
    ctx.restore();
  }

  // 오른쪽 벽의 쇠창살 창 — 달빛이 들어온다
  const wx = w * 0.84;
  const wy = h * 0.26;
  ctx.fillStyle = "#0d1330";
  roundRect(ctx, wx - 34, wy - 30, 68, 62, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,243,196,0.16)";
  ctx.beginPath();
  ctx.arc(wx + 8, wy - 8, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,243,196,0.5)";
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(wx - 26 + ((i * 47) % 56), wy - 24 + ((i * 29) % 48), 1.6, 1.6);
  }
  ctx.strokeStyle = "#5c6478";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(wx - 18 + i * 18, wy - 30);
    ctx.lineTo(wx - 18 + i * 18, wy + 32);
    ctx.stroke();
  }
  ctx.strokeStyle = "#7a8398";
  ctx.lineWidth = 3;
  roundRect(ctx, wx - 34, wy - 30, 68, 62, 6);
  ctx.stroke();

  // 네 귀퉁이 거미줄
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#e8e3f5";
  ctx.lineWidth = 1.2;
  for (const [x, y, rot] of [
    [0, 0, 0],
    [w, 0, Math.PI / 2],
    [0, h, -Math.PI / 2],
  ] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, i * 13, 0, Math.PI / 2);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  bakeCache.set(key, canvas);
  return canvas;
}

/** 벽에 걸린 횃불 하나 */
function torch(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, seed: number): void {
  const flick = 1 + Math.sin(t / 90 + seed) * 0.18 + Math.sin(t / 37 + seed) * 0.06;

  // 빛무리
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y - 14, 4, x, y - 14, 110 * flick);
  g.addColorStop(0, "rgba(255,190,90,0.30)");
  g.addColorStop(0.5, "rgba(255,140,60,0.10)");
  g.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 14, 110 * flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 받침대
  ctx.fillStyle = "#4a4353";
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x + 5, y + 16);
  ctx.lineTo(x - 5, y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#665c72";
  ctx.fillRect(x - 9, y - 3, 18, 4);

  // 불꽃
  ctx.save();
  ctx.shadowColor = "#ffb703";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.moveTo(x, y - 30 * flick);
  ctx.quadraticCurveTo(x + 9, y - 12, x + 5, y - 2);
  ctx.quadraticCurveTo(x, y - 6, x - 5, y - 2);
  ctx.quadraticCurveTo(x - 9, y - 12, x, y - 30 * flick);
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(x, y - 20 * flick);
  ctx.quadraticCurveTo(x + 5, y - 9, x, y - 3);
  ctx.quadraticCurveTo(x - 5, y - 9, x, y - 20 * flick);
  ctx.fill();
  ctx.restore();
}

/**
 * 시작 화면 전체.
 * @param t 시간(ms)
 */
export function drawTitleScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  dpr: number,
): void {
  const baked = bakeTitle(w, h, dpr);
  if (baked) ctx.drawImage(baked, 0, 0, w, h);
  else {
    ctx.fillStyle = "#140a20";
    ctx.fillRect(0, 0, w, h);
  }

  const cx = w / 2;
  const keyholeY = h * 0.62;

  // 열쇠구멍에서 새어 나오는 빛 — 저 너머에 나갈 길이 있다는 신호
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createRadialGradient(cx, keyholeY, 2, cx, keyholeY, 150);
  const pulse = 0.5 + Math.sin(t / 700) * 0.12;
  beam.addColorStop(0, `rgba(255,243,196,${0.5 * pulse})`);
  beam.addColorStop(1, "rgba(255,243,196,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.arc(cx, keyholeY, 150, 0, Math.PI * 2);
  ctx.fill();

  // 아래로 퍼지는 빛줄기
  const shaft = ctx.createLinearGradient(cx, keyholeY, cx, h);
  shaft.addColorStop(0, `rgba(255,243,196,${0.3 * pulse})`);
  shaft.addColorStop(1, "rgba(255,243,196,0)");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(cx - 7, keyholeY);
  ctx.lineTo(cx + 7, keyholeY);
  ctx.lineTo(cx + 70, h);
  ctx.lineTo(cx - 70, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 열쇠구멍
  ctx.fillStyle = "#120a1e";
  ctx.beginPath();
  ctx.arc(cx, keyholeY - 5, 7, 0, Math.PI * 2);
  ctx.moveTo(cx - 4, keyholeY - 1);
  ctx.lineTo(cx + 4, keyholeY - 1);
  ctx.lineTo(cx + 6, keyholeY + 14);
  ctx.lineTo(cx - 6, keyholeY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 문고리
  ctx.strokeStyle = "#8b8fa3";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx + 52, keyholeY - 4, 12, 0, Math.PI * 2);
  ctx.stroke();

  torch(ctx, w * 0.1, h * 0.52, t, 0);
  torch(ctx, w * 0.9, h * 0.52, t, 2.1);

  // 빛 속을 떠다니는 먼지
  ctx.save();
  for (let i = 0; i < 34; i++) {
    const seed = i * 7919;
    const x = ((seed % Math.round(w - 20)) + 10 + Math.sin(t / 1600 + i) * 12) % w;
    const y = h - (((seed / 3 + t / 30) % (h + 60)) - 30);
    ctx.globalAlpha = 0.1 + Math.abs(Math.sin(t / 1100 + i * 1.7)) * 0.3;
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 문 위를 맴도는 반짝임
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const a = t / 1400 + (i * Math.PI * 2) / 3;
    const sx = cx + Math.cos(a) * 96;
    const sy = h * 0.36 + Math.sin(a * 1.3) * 26;
    const s = 4 + Math.sin(t / 260 + i * 2) * 1.6;
    ctx.fillStyle = "rgba(255,243,196,0.85)";
    star(ctx, sx, sy, s, s * 0.4, 4);
    ctx.fill();
  }
  ctx.restore();

  // 가장자리 어둠
  const vig = ctx.createRadialGradient(cx, h * 0.5, w * 0.28, cx, h * 0.5, w * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// 스테이지 카드 그림
// ---------------------------------------------------------------------------

export function drawStageThumb(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: StageDef,
  t: number,
): void {
  const th = THEMES[stage.theme];

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, th.bgTop);
  bg.addColorStop(1, th.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 바닥과 벽을 아주 단순하게
  ctx.fillStyle = th.floor;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);
  ctx.fillStyle = th.wall;
  ctx.fillRect(0, 0, w, h * 0.45);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x < w; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h * 0.45);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, h * 0.45);
  ctx.lineTo(w, h * 0.45);
  ctx.stroke();

  const cx = w / 2;
  const cy = h * 0.52;

  // 스테이지마다 다른 상징물
  if (stage.id === 1) {
    // 커다란 달
    ctx.fillStyle = "rgba(255,243,196,0.9)";
    ctx.beginPath();
    ctx.arc(w * 0.76, h * 0.2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = th.wall;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.17, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (stage.id === 2) {
    // 감옥 쇠창살
    ctx.strokeStyle = "#9aa7bd";
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.26 + i * 18, h * 0.08);
      ctx.lineTo(w * 0.26 + i * 18, h * 0.44);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.26);
    ctx.lineTo(w * 0.26 + 3 * 18 + 4, h * 0.26);
    ctx.stroke();
  } else if (stage.id === 3) {
    // 출렁이는 물결
    ctx.strokeStyle = "rgba(155,231,255,0.7)";
    ctx.lineWidth = 3;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = h * 0.62 + r * 12 + Math.sin(x / 16 + t / 500 + r) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (stage.id === 4) {
    // 천장에 매달린 고드름
    ctx.fillStyle = "rgba(214,244,255,0.85)";
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * (w / 7);
      const len = 12 + ((i * 37) % 16);
      ctx.beginPath();
      ctx.moveTo(x - 5, 0);
      ctx.lineTo(x + 5, 0);
      ctx.lineTo(x, len);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // 나무 사이를 떠다니는 반딧불이
    ctx.fillStyle = "rgba(90,140,80,0.7)";
    for (const [tx, ty, r] of [
      [w * 0.16, h * 0.3, 22],
      [w * 0.84, h * 0.26, 18],
    ] as const) {
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const fx = 20 + ((i * 53) % (w - 40)) + Math.sin(t / 900 + i) * 10;
      const fy = h * 0.25 + ((i * 29) % 60) + Math.cos(t / 700 + i) * 8;
      ctx.globalAlpha = 0.4 + Math.abs(Math.sin(t / 500 + i * 1.4)) * 0.6;
      ctx.fillStyle = "#ffe98a";
      ctx.beginPath();
      ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 잠긴 문 — 어느 스테이지나 목표는 같다
  ctx.fillStyle = "#6b4426";
  roundRect(ctx, cx - 15, cy - 26, 30, 40, 5);
  ctx.fill();
  ctx.strokeStyle = "#a9764f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = stage.ready ? "#ffd166" : "#8b8fa3";
  ctx.beginPath();
  ctx.arc(cx + 8, cy - 6, 2.4, 0, Math.PI * 2);
  ctx.fill();

  if (stage.ready) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy - 6, 2, cx, cy - 6, 46);
    g.addColorStop(0, `rgba(255,209,102,${0.28 + Math.sin(t / 600) * 0.08})`);
    g.addColorStop(1, "rgba(255,209,102,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else {
    // 준비 중인 스테이지는 자물쇠가 크게 걸려 있다
    ctx.fillStyle = "rgba(10,6,20,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c0c8d6";
    roundRect(ctx, cx - 11, cy - 4, 22, 18, 3);
    ctx.fill();
    ctx.strokeStyle = "#c0c8d6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 7.5, Math.PI, 0);
    ctx.stroke();
  }
}

export { CANVAS_H, CANVAS_W };
