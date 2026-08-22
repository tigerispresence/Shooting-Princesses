import { CANVAS_H, CANVAS_W, COLS, ROWS, THEMES, TILE } from "./constants";
import type { Theme } from "./constants";
import { roundRect } from "./sprites";
import type { RoomDef } from "./types";

/**
 * 방의 바닥과 벽은 한 번 그려 두고 매 프레임 복사만 한다.
 *
 * 돌 이음매, 나뭇결, 못 자국까지 넣으면 타일 165개를 매 프레임 다시 그리는 게
 * 부담이 된다. 어차피 방 안에서 변하지 않는 것들이라 방마다 한 장씩 구워 두면
 * 디테일을 아무리 넣어도 프레임 비용은 drawImage 한 번으로 고정된다.
 */
const cache = new Map<string, HTMLCanvasElement>();

/**
 * 자리마다 고정된 0~1 값. Math.random과 달리 매번 같은 무늬가 나온다.
 * sin을 쓰던 방식은 값이 고르게 퍼지지 않아 같은 무늬가 뭉쳐 나왔다.
 */
function noise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// 바닥
// ---------------------------------------------------------------------------

/** 돌 슬래브 — 현관용. 슬래브마다 색이 조금씩 다르고 금이 가 있다. */
function stoneFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  const v = noise(x, y);
  ctx.fillStyle = v > 0.5 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 슬래브 안쪽을 살짝 밝게 해서 이음매가 파여 보이게
  ctx.fillStyle = `rgba(255,255,255,${0.02 + v * 0.03})`;
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);

  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);

  // 금이 간 슬래브 — 드물게, 그리고 자리마다 다른 모양으로
  if (v > 0.93) {
    const w = noise(x, y, 21);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(px + 6 + w * 8, py + 5);
    ctx.bezierCurveTo(
      px + 14 + w * 10,
      py + 14,
      px + 8 + w * 6,
      py + 22,
      px + 16 + w * 14,
      py + TILE - 5,
    );
    ctx.stroke();
  }

  // 먼지 알갱이
  for (let i = 0; i < 3; i++) {
    const n1 = noise(x, y, i + 1);
    const n2 = noise(y, x, i + 5);
    ctx.fillStyle = `rgba(255,255,255,${0.03 + n1 * 0.05})`;
    ctx.fillRect(px + 4 + n1 * 30, py + 4 + n2 * 30, 2, 2);
  }
}

/** 나무 마루 — 도서관용. 널빤지가 가로로 길게 이어지고 못이 박혀 있다. */
function plankFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = y % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 널빤지 사이 홈 — 가로줄만
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py + 0.5);
  ctx.lineTo(px + TILE, py + 0.5);
  ctx.stroke();

  // 널빤지 끝 이음매를 줄마다 어긋나게
  if ((x + (y % 3) * 2) % 3 === 0) {
    ctx.beginPath();
    ctx.moveTo(px + 0.5, py);
    ctx.lineTo(px + 0.5, py + TILE);
    ctx.stroke();
  }

  // 나뭇결
  ctx.strokeStyle = "rgba(0,0,0,0.13)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const off = 9 + i * 11 + noise(x, y, i) * 4;
    ctx.beginPath();
    ctx.moveTo(px, py + off);
    ctx.bezierCurveTo(px + 12, py + off - 2, px + 26, py + off + 2, px + TILE, py + off);
    ctx.stroke();
  }

  // 못
  if (noise(x, y, 9) > 0.7) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(px + 6, py + 6, 1.4, 0, Math.PI * 2);
    ctx.arc(px + TILE - 6, py + 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 철판 — 시계탑용. 판마다 네 귀퉁이에 리벳이 박혀 있다. */
function platedFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  const g = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);

  ctx.strokeStyle = "rgba(0,0,0,0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (const [rx, ry] of [
    [7, 7],
    [TILE - 7, 7],
    [7, TILE - 7],
    [TILE - 7, TILE - 7],
  ]) {
    ctx.beginPath();
    ctx.arc(px + rx, py + ry, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 대리석 — 거울의 방용. 결이 흐르고 표면이 매끈하게 빛난다. */
function marbleFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 대리석 결
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 2; i++) {
    const a = noise(x, y, i) * Math.PI;
    ctx.save();
    ctx.translate(px + TILE / 2, py + TILE / 2);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-20, -6 + i * 9);
    ctx.bezierCurveTo(-6, -2 + i * 9, 6, -10 + i * 9, 20, -5 + i * 9);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

  // 윤이 나는 면
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.moveTo(px + 4, py + TILE - 4);
  ctx.lineTo(px + TILE - 10, py + 4);
  ctx.lineTo(px + TILE - 4, py + 4);
  ctx.lineTo(px + 10, py + TILE - 4);
  ctx.closePath();
  ctx.fill();
}

/** 기와 — 옥상용. 지붕널이 겹겹이 포개져 있다. */
function shingleFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = y % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 한 칸에 지붕널 두 줄, 줄마다 반 칸씩 어긋나게
  const stagger = y % 2 === 0 ? 0 : TILE / 2;
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1.6;
  for (let row = 0; row < 2; row++) {
    const ty = py + row * (TILE / 2);
    ctx.beginPath();
    ctx.moveTo(px, ty + 0.8);
    ctx.lineTo(px + TILE, ty + 0.8);
    ctx.stroke();
    // 지붕널이 겹치는 위쪽 그림자
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(px, ty + 1, TILE, 4);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const sx = px + stagger + i * (TILE / 2);
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, ty);
      ctx.lineTo(sx + 0.5, ty + TILE / 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.6;
  }

  // 달빛이 스친 지붕널 — 네모 얼룩으로 보이지 않게 가장자리만 옅게 훑는다
  if (noise(x, y, 3) > 0.86) {
    const g = ctx.createLinearGradient(px, py, px, py + TILE / 2);
    g.addColorStop(0, "rgba(255,243,196,0.10)");
    g.addColorStop(1, "rgba(255,243,196,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE / 2 - 4);
  }
}

/** 얕은 물 — 하수구·물에 잠긴 서고·연못용 */
function waterFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 물결 — 칸마다 위상을 달리해서 이어진 물처럼 보이게
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const off = 9 + i * 11 + noise(x, y, i) * 5;
    ctx.beginPath();
    for (let sx = 0; sx <= TILE; sx += 5) {
      const sy = py + off + Math.sin((px + sx) / 7 + i * 1.7) * 1.8;
      if (sx === 0) ctx.moveTo(px + sx, sy);
      else ctx.lineTo(px + sx, sy);
    }
    ctx.stroke();
  }

  // 물에 잠긴 돌바닥이 비쳐 보인다
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

  // 반짝이는 수면
  if (noise(x, y, 7) > 0.8) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(px + 12 + noise(x, y) * 16, py + 14, 5, 1.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 얼음 — 갈라진 금과 반들거리는 표면 */
function iceFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 비스듬히 흐르는 광택
  const g = ctx.createLinearGradient(px, py + TILE, px + TILE, py);
  g.addColorStop(0, "rgba(255,255,255,0.03)");
  g.addColorStop(0.5, "rgba(255,255,255,0.13)");
  g.addColorStop(1, "rgba(255,255,255,0.03)");
  ctx.fillStyle = g;
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

  // 얼음 금
  if (noise(x, y, 4) > 0.72) {
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1.1;
    const n = noise(x, y, 5);
    ctx.beginPath();
    ctx.moveTo(px + 5 + n * 10, py + 4);
    ctx.lineTo(px + 16 + n * 8, py + 19);
    ctx.lineTo(px + 9 + n * 14, py + TILE - 5);
    ctx.moveTo(px + 16 + n * 8, py + 19);
    ctx.lineTo(px + TILE - 5, py + 24);
    ctx.stroke();
  }
}

/** 잔디 — 정원용 */
function grassFloor(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = (x + y) % 2 === 0 ? th.floor : th.floorAlt;
  ctx.fillRect(px, py, TILE, TILE);

  // 풀포기
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const n1 = noise(x, y, i);
    const n2 = noise(y, x, i + 3);
    const gx = px + 3 + n1 * (TILE - 6);
    const gy = py + 6 + n2 * (TILE - 10);
    ctx.beginPath();
    ctx.moveTo(gx, gy + 4);
    ctx.quadraticCurveTo(gx + (n1 - 0.5) * 4, gy, gx + (n1 - 0.5) * 6, gy - 4);
    ctx.stroke();
  }

  // 가끔 피어 있는 작은 꽃
  if (noise(x, y, 12) > 0.86) {
    const fx = px + 10 + noise(x, y, 13) * 18;
    const fy = py + 12 + noise(x, y, 14) * 14;
    ctx.fillStyle = "rgba(255,240,150,0.5)";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// 벽
// ---------------------------------------------------------------------------

function wallBlock(ctx: CanvasRenderingContext2D, th: Theme, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;

  ctx.fillStyle = th.wall;
  ctx.fillRect(px, py, TILE, TILE);

  // 위에서 살짝 내려다보는 시점이라 윗면이 보인다
  const top = ctx.createLinearGradient(px, py, px, py + 12);
  top.addColorStop(0, th.wallTop);
  top.addColorStop(1, th.wall);
  ctx.fillStyle = top;
  ctx.fillRect(px, py, TILE, 12);

  switch (th.wallStyle) {
    case "brick": {
      // 벽돌 — 줄마다 반 장씩 어긋나게 쌓는다
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.5;
      for (let row = 0; row < 2; row++) {
        const by = py + 14 + row * 13;
        ctx.beginPath();
        ctx.moveTo(px, by);
        ctx.lineTo(px + TILE, by);
        ctx.stroke();
        const seam = px + (row % 2 === x % 2 ? 13 : 27);
        ctx.beginPath();
        ctx.moveTo(seam, by);
        ctx.lineTo(seam, by + 13);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(px + 2, py + 15, TILE - 4, 2);
      ctx.fillRect(px + 2, py + 28, TILE - 4, 2);
      if (noise(x, y, 11) > 0.86) {
        ctx.fillStyle = "rgba(126,180,96,0.2)";
        const mx = px + 8 + noise(x, y) * 22;
        for (let i = 0; i < 4; i++) {
          const n = noise(x, y, 30 + i);
          ctx.beginPath();
          ctx.ellipse(mx + (n - 0.5) * 9, py + TILE - 7 + n * 4, 3 + n * 2, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "plate": {
      // 리벳 박은 철판
      ctx.strokeStyle = "rgba(0,0,0,0.34)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 14, TILE - 6, TILE - 18);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (const [rx, ry] of [
        [8, 19],
        [TILE - 8, 19],
        [8, TILE - 8],
        [TILE - 8, TILE - 8],
      ]) {
        ctx.beginPath();
        ctx.arc(px + rx, py + ry, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "glass": {
      // 거울·얼음 패널
      const g = ctx.createLinearGradient(px + 4, py + 14, px + TILE - 4, py + TILE - 4);
      g.addColorStop(0, "rgba(220,240,255,0.20)");
      g.addColorStop(0.5, "rgba(160,190,220,0.08)");
      g.addColorStop(1, "rgba(220,240,255,0.18)");
      ctx.fillStyle = g;
      roundRect(ctx, px + 4, py + 15, TILE - 8, TILE - 19, 4);
      ctx.fill();
      ctx.strokeStyle = th.accentSoft;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px + 9, py + TILE - 9);
      ctx.lineTo(px + TILE - 12, py + 20);
      ctx.stroke();
      break;
    }
    case "hedge": {
      // 잎이 빽빽한 울타리
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(px, py + 12, TILE, TILE - 12);
      for (let i = 0; i < 11; i++) {
        const n1 = noise(x, y, i);
        const n2 = noise(y, x, i + 6);
        ctx.fillStyle = n1 > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(
          px + 4 + n1 * (TILE - 8),
          py + 6 + n2 * (TILE - 10),
          4 + n1 * 2.5,
          3 + n2 * 2,
          n1 * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
    }
    case "battlement": {
      // 성벽 — 돌 사이가 굵고 거칠다
      ctx.strokeStyle = "rgba(0,0,0,0.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py + 26);
      ctx.lineTo(px + TILE, py + 26);
      ctx.stroke();
      const seam = px + (x % 2 === 0 ? 14 : 26);
      ctx.beginPath();
      ctx.moveTo(seam, py + 26);
      ctx.lineTo(seam, py + TILE);
      ctx.moveTo(px + (x % 2 === 0 ? 26 : 14), py + 12);
      ctx.lineTo(px + (x % 2 === 0 ? 26 : 14), py + 26);
      ctx.stroke();
      break;
    }
  }

  ctx.strokeStyle = th.wallEdge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 0.75, py + 0.75, TILE - 1.5, TILE - 1.5);
}

/** 옥상 바깥 담장 위에 얹는 성가퀴 */
function battlements(ctx: CanvasRenderingContext2D, th: Theme): void {
  ctx.fillStyle = th.wallTop;
  for (let x = 0; x < COLS; x++) {
    if (x % 2 === 0) continue;
    ctx.fillRect(x * TILE + 6, 0, TILE - 12, 9);
    ctx.fillRect(x * TILE + 6, CANVAS_H - 9, TILE - 12, 9);
  }
}

/** 책장 — 도서관 벽면. 책 높이와 기울기를 조금씩 다르게 꽂는다. */
function shelf(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;

  ctx.fillStyle = "#3a2417";
  ctx.fillRect(px + 1, py + 2, TILE - 2, TILE - 4);
  ctx.strokeStyle = "#7b5539";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 2, TILE - 2, TILE - 4);

  const colors = ["#c9445e", "#4e7fc4", "#e0a53a", "#6dbf7b", "#b07cc6", "#e8e3d0"];
  for (let row = 0; row < 2; row++) {
    const shelfY = py + 6 + row * 16;
    // 선반 널
    ctx.fillStyle = "#5a3a24";
    ctx.fillRect(px + 2, shelfY + 13, TILE - 4, 2.5);

    let bx = px + 4;
    let i = 0;
    while (bx < px + TILE - 6) {
      const n = noise(x, y, row * 7 + i);
      const w = 3.5 + n * 3;
      const hh = 10 + n * 3;
      ctx.fillStyle = colors[Math.floor(noise(x, y, row * 13 + i) * colors.length) % colors.length];
      if (n > 0.85) {
        // 비스듬히 기댄 책 한 권
        ctx.save();
        ctx.translate(bx, shelfY + 13);
        ctx.rotate(0.25);
        ctx.fillRect(0, -hh, w, hh);
        ctx.restore();
      } else {
        ctx.fillRect(bx, shelfY + 13 - hh, w, hh);
        // 책등 장식
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(bx + 0.8, shelfY + 13 - hh + 2.5, w - 1.6, 1);
      }
      bx += w + 1.2;
      i++;
    }
  }
}

// ---------------------------------------------------------------------------
// 방마다 붙는 큰 장식
// ---------------------------------------------------------------------------

function floorDecor(ctx: CanvasRenderingContext2D, th: Theme): void {
  switch (th.decor) {
    case "carpet": {
      // 시작 지점에서 문까지 이어지는 붉은 융단. 예쁘기도 하고 갈 곳도 알려 준다.
      const y = 5 * TILE;
      ctx.fillStyle = "#7a2036";
      ctx.fillRect(TILE, y + 3, CANVAS_W - TILE * 2, TILE - 6);
      ctx.fillStyle = "#93304a";
      ctx.fillRect(TILE, y + 7, CANVAS_W - TILE * 2, TILE - 14);
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(TILE, y + 7);
      ctx.lineTo(CANVAS_W - TILE, y + 7);
      ctx.moveTo(TILE, y + TILE - 7);
      ctx.lineTo(CANVAS_W - TILE, y + TILE - 7);
      ctx.stroke();
      // 융단 무늬
      ctx.strokeStyle = "rgba(201,162,39,0.5)";
      ctx.lineWidth = 1.2;
      for (let x = 1; x < COLS - 1; x++) {
        const cx = x * TILE + TILE / 2;
        ctx.beginPath();
        ctx.arc(cx, y + TILE / 2, 6, 0, Math.PI * 2);
        ctx.moveTo(cx - 10, y + TILE / 2);
        ctx.lineTo(cx + 10, y + TILE / 2);
        ctx.stroke();
      }
      break;
    }
    case "rug": {
      // 통로에 깔린 낡은 양탄자.
      // 책장 칸(x=2~4, 8~10)을 피해 가운데 세 칸에만 깐다 — 책장 밑으로
      // 파고들면 깔개가 아니라 잘린 도형처럼 보인다.
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#3f4e7a";
      roundRect(ctx, TILE * 5.15, TILE * 2.15, TILE * 2.7, TILE * 5.7, 8);
      ctx.fill();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(201,162,39,0.45)";
      ctx.lineWidth = 1.2;
      roundRect(ctx, TILE * 5.45, TILE * 2.5, TILE * 2.1, TILE * 5, 6);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "clock": {
      // 바닥에 그려진 커다란 시계판. 태엽 장치가 정확히 그 한가운데에 놓인다.
      const cx = 7 * TILE + TILE / 2;
      const cy = 5 * TILE + TILE / 2;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffb703";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 132, 0, Math.PI * 2);
      ctx.stroke();

      // 눈금 — 12시 방향부터
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const long = i % 3 === 0;
        ctx.lineWidth = long ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 132, cy + Math.sin(a) * 132);
        ctx.lineTo(cx + Math.cos(a) * (long ? 112 : 122), cy + Math.sin(a) * (long ? 112 : 122));
        ctx.stroke();
      }

      // 멎어 버린 시곗바늘
      ctx.lineCap = "round";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 62, cy - 34);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 26, cy + 96);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "starmark": {
      // 바닥 한가운데 박힌 별 문양
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#c8b6ff";
      ctx.lineWidth = 2;
      for (const r of [58, 96, 134]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
        ctx.lineTo(cx + Math.cos(a) * 134, cy + Math.sin(a) * 134);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "ridge": {
      // 가운데를 따라 도드라진 마루
      ctx.save();
      ctx.fillStyle = "rgba(255,243,196,0.07)";
      ctx.fillRect(0, 5 * TILE + 14, CANVAS_W, 12);
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 5 * TILE + 14);
      ctx.lineTo(CANVAS_W, 5 * TILE + 14);
      ctx.moveTo(0, 5 * TILE + 26);
      ctx.lineTo(CANVAS_W, 5 * TILE + 26);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "ripple": {
      // 물이 퍼져 나가는 큰 파문
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 2;
      for (const r of [40, 78, 116, 154]) {
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2, CANVAS_H / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "vines": {
      // 바닥을 기어가는 덩굴
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const y0 = CANVAS_H * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let x = 0; x <= CANVAS_W; x += 24) {
          ctx.lineTo(x, y0 + Math.sin(x / 40 + i * 1.6) * 14);
        }
        ctx.stroke();
        for (let x = 20; x <= CANVAS_W; x += 70) {
          const ly = y0 + Math.sin(x / 40 + i * 1.6) * 14;
          ctx.beginPath();
          ctx.ellipse(x, ly - 7, 7, 4, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }
    case "none":
      break;
  }
}

/** 벽면 위쪽에 걸리는 것들 — 아치 벽감, 톱니바퀴, 거미줄 */
function wallDecor(ctx: CanvasRenderingContext2D, th: Theme): void {
  if (th.decor === "carpet") {
    // 위쪽 벽에 파인 아치 벽감
    for (const x of [2, 12]) {
      const px = x * TILE;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.moveTo(px + 8, TILE - 3);
      ctx.lineTo(px + 8, TILE * 0.5);
      ctx.arc(px + TILE / 2, TILE * 0.5, TILE / 2 - 8, Math.PI, 0);
      ctx.lineTo(px + TILE - 8, TILE - 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = th.accentSoft;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (th.decor === "clock") {
    // 위쪽 벽에 늘어선 톱니바퀴
    for (const [x, r] of [
      [3, 15],
      [4.2, 9],
      [11, 12],
    ] as const) {
      const cx = x * TILE + TILE / 2;
      const cy = TILE / 2 + 4;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffb703";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 네 귀퉁이 거미줄 — 오래 비어 있던 성이라는 표시
  if (th.cobwebs) {
    const corners: [number, number, number][] = [
      [TILE, TILE, 0],
      [CANVAS_W - TILE, TILE, Math.PI / 2],
      [TILE, CANVAS_H - TILE, -Math.PI / 2],
      [CANVAS_W - TILE, CANVAS_H - TILE, Math.PI],
    ];
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#e8e3f5";
    ctx.lineWidth = 1;
    for (const [x, y, rot] of corners) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, i * 9, 0, Math.PI / 2);
        ctx.stroke();
      }
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------

function paintRoom(ctx: CanvasRenderingContext2D, def: RoomDef): void {
  const th = THEMES[def.theme];

  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, th.bgTop);
  bg.addColorStop(1, th.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const FLOORS = {
    stone: stoneFloor,
    plank: plankFloor,
    plated: platedFloor,
    marble: marbleFloor,
    shingle: shingleFloor,
    water: waterFloor,
    ice: iceFloor,
    grass: grassFloor,
  } as const;
  const tile = FLOORS[th.floorStyle];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (def.layout[y][x] === "#") continue;
      tile(ctx, th, x, y);
    }
  }

  floorDecor(ctx, th);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = def.layout[y][x];
      if (ch === "#") wallBlock(ctx, th, x, y);
      else if (ch === "B") shelf(ctx, x, y);
    }
  }

  if (th.wallStyle === "battlement") battlements(ctx, th);
  wallDecor(ctx, th);

  // 벽 안쪽으로 드리우는 그림자 — 방이 상자처럼 납작해 보이지 않게
  ctx.save();
  const inner = ctx.createLinearGradient(0, TILE, 0, TILE * 3);
  inner.addColorStop(0, "rgba(0,0,0,0.45)");
  inner.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = inner;
  ctx.fillRect(TILE, TILE, CANVAS_W - TILE * 2, TILE * 2);
  ctx.restore();
}

/**
 * 방 번호로 캐시한다. 판마다 물건 자리는 바뀌지만 벽·바닥·장식은 그대로라,
 * 구워 둔 그림은 계속 쓸 수 있다. (물건과 상자는 여기 안 들어간다.)
 */
export function getRoomBackground(
  roomIndex: number,
  dpr: number,
  def: RoomDef,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${roomIndex}:${def.theme}:${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CANVAS_W * dpr);
  canvas.height = Math.round(CANVAS_H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  paintRoom(ctx, def);

  cache.set(key, canvas);
  return canvas;
}
