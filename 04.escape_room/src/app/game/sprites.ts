import { GHOST, HERO, SPRITE_SCALE, TILE } from "./constants";
import type { HeroLook } from "./constants";
import type { Dir, PropArt } from "./types";

/**
 * 모든 그림은 Canvas 2D로 직접 그린다 — 이미지 파일 없음.
 * 좌표는 전부 "타일 한 칸의 중심(cx, cy)" 기준이며, 한 칸은 TILE(40px)이다.
 */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** (cx, cy)를 고정한 채 스프라이트만 키운다. */
function zoom(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.translate(cx, cy);
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
  ctx.translate(-cx, -cy);
}

function star(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5,
  rot = -Math.PI / 2,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// 주인공 별이
// ---------------------------------------------------------------------------

/**
 * @param phase 0~1 걷기 사이클. 서 있을 때는 0.
 * @param t     시간(ms) — 서 있을 때 살짝 숨쉬는 움직임에 쓴다.
 */
export function drawHero(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Dir,
  phase: number,
  t: number,
  look: HeroLook = HERO,
): void {
  const walking = phase > 0;
  const swing = walking ? Math.sin(phase * Math.PI * 2) : 0;
  const bob = walking ? Math.abs(Math.sin(phase * Math.PI * 2)) * 1.6 : Math.sin(t / 520) * 0.7;
  const y = cy - bob;
  const back = dir === "up";
  const side = dir === "left" || dir === "right";
  const face = dir === "left" ? -1 : 1;
  const hx = cx + (side && !back ? face * 0.6 : 0);

  ctx.save();
  zoom(ctx, cx, cy);

  // 그림자
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 15, 9, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 머리 (몸통 뒤로 넘어가는 부분) -------------------------------------
  // 걸을 때 살랑거리도록 흔들림을 조금 준다
  const sway = swing * 1.2;
  ctx.fillStyle = look.hair;
  switch (look.hairStyle) {
    case "twin":
      ctx.beginPath();
      ctx.ellipse(cx - 7.6 - sway * 0.4, y - 7.4 + Math.abs(sway) * 0.4, 2.8, 5.2, 0.3 + sway * 0.08, 0, Math.PI * 2);
      ctx.ellipse(cx + 7.6 - sway * 0.4, y - 7.4 + Math.abs(sway) * 0.4, 2.8, 5.2, -0.3 + sway * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.hairLight;
      ctx.beginPath();
      ctx.ellipse(cx - 8.2 - sway * 0.4, y - 8.6, 1, 2, 0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 7 - sway * 0.4, y - 8.6, 1, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "long":
      // 어깨 아래까지 흘러내리는 긴 생머리
      ctx.beginPath();
      ctx.moveTo(cx - 7.4, y - 12);
      ctx.quadraticCurveTo(cx - 10.4 + sway * 0.5, y - 2, cx - 8, y + 7);
      ctx.quadraticCurveTo(cx, y + 10, cx + 8, y + 7);
      ctx.quadraticCurveTo(cx + 10.4 + sway * 0.5, y - 2, cx + 7.4, y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = look.hairLight;
      ctx.beginPath();
      ctx.ellipse(cx - 7.4, y - 3, 1.2, 4.4, 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bob":
      // 턱선에서 딱 떨어지는 단발
      ctx.beginPath();
      ctx.moveTo(cx - 7.8, y - 11);
      ctx.quadraticCurveTo(cx - 9.6, y - 5, cx - 7.6, y - 1.4);
      ctx.lineTo(cx + 7.6, y - 1.4);
      ctx.quadraticCurveTo(cx + 9.6, y - 5, cx + 7.8, y - 11);
      ctx.closePath();
      ctx.fill();
      break;
    case "buns":
      break;
  }

  // 다리와 구두
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 3, y + 9);
  ctx.lineTo(cx - 3 + swing * 2.5, y + 14);
  ctx.moveTo(cx + 3, y + 9);
  ctx.lineTo(cx + 3 - swing * 2.5, y + 14);
  ctx.stroke();
  ctx.fillStyle = look.shoe;
  ctx.beginPath();
  ctx.ellipse(cx - 3 + swing * 2.5, y + 15, 2.8, 1.9, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 3 - swing * 2.5, y + 15, 2.8, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.ribbon;
  ctx.beginPath();
  ctx.arc(cx - 3 + swing * 2.5, y + 13.6, 1, 0, Math.PI * 2);
  ctx.arc(cx + 3 - swing * 2.5, y + 13.6, 1, 0, Math.PI * 2);
  ctx.fill();

  // 치마 — 두 겹. 아래 단이 조금 더 넓게 퍼진다.
  ctx.fillStyle = look.dressDark;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 3);
  ctx.lineTo(cx + 6, y + 3);
  ctx.lineTo(cx + 10, y + 12);
  ctx.quadraticCurveTo(cx, y + 15, cx - 10, y + 12);
  ctx.closePath();
  ctx.fill();

  const grad = ctx.createLinearGradient(cx, y - 5, cx, y + 10);
  grad.addColorStop(0, look.dress);
  grad.addColorStop(1, look.dressDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - 5, y - 4);
  ctx.lineTo(cx + 5, y - 4);
  ctx.lineTo(cx + 8.5, y + 8);
  ctx.quadraticCurveTo(cx, y + 11, cx - 8.5, y + 8);
  ctx.closePath();
  ctx.fill();

  // 치맛단 물결
  ctx.strokeStyle = look.dressTrim;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, y + 12);
  for (let i = 0; i < 4; i++) {
    const x0 = cx - 10 + i * 5;
    ctx.quadraticCurveTo(x0 + 2.5, y + 15, x0 + 5, y + 12.6);
  }
  ctx.stroke();

  // 앞치마
  if (!back) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.moveTo(cx - 3, y - 2);
    ctx.lineTo(cx + 3, y - 2);
    ctx.lineTo(cx + 4.5, y + 8);
    ctx.quadraticCurveTo(cx, y + 9.6, cx - 4.5, y + 8);
    ctx.closePath();
    ctx.fill();
  }

  // 허리 리본
  ctx.fillStyle = look.sash;
  ctx.fillRect(cx - 6, y + 0.6, 12, 2.4);
  ctx.beginPath();
  ctx.ellipse(cx - 6.4, y + 1.8, 2, 1.4, -0.3, 0, Math.PI * 2);
  ctx.ellipse(cx + 6.4, y + 1.8, 2, 1.4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 부풀린 소매
  ctx.fillStyle = look.dress;
  ctx.beginPath();
  ctx.arc(cx - 5.4, y - 2.4, 2.6, 0, Math.PI * 2);
  ctx.arc(cx + 5.4, y - 2.4, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // 팔
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 5.6, y - 1.4);
  ctx.lineTo(cx - 7.4 - swing, y + 4);
  ctx.moveTo(cx + 5.6, y - 1.4);
  ctx.lineTo(cx + 7.4 + swing, y + 4);
  ctx.stroke();

  // 목걸이 — 작은 별
  if (!back) {
    ctx.fillStyle = look.sash;
    star(ctx, cx, y - 3.4, 1.8, 0.8);
    ctx.fill();
  }

  // 얼굴
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(hx, y - 10, 6.6, 0, Math.PI * 2);
  ctx.fill();

  // --- 머리 (얼굴 위에 얹히는 부분) ---------------------------------------
  ctx.fillStyle = look.hair;
  if (back) {
    ctx.beginPath();
    ctx.arc(cx, y - 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.hairLight;
    ctx.beginPath();
    ctx.ellipse(cx - 2.4, y - 12.4, 2.6, 1.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 앞머리 — 가운데를 살짝 가르고 옆으로 흘린다
    ctx.beginPath();
    ctx.arc(hx, y - 11.2, 7, Math.PI, Math.PI * 2);
    ctx.rect(hx - 7, y - 11.2, 14, 1.6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 1.2, y - 15);
    ctx.quadraticCurveTo(hx - 6, y - 12, hx - 7.2, y - 6.4);
    ctx.quadraticCurveTo(hx - 4.6, y - 9.6, hx - 0.6, y - 10.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 1.2, y - 15);
    ctx.quadraticCurveTo(hx + 6, y - 12, hx + 7.2, y - 6.4);
    ctx.quadraticCurveTo(hx + 4.6, y - 9.6, hx + 0.6, y - 10.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = look.hairLight;
    ctx.beginPath();
    ctx.ellipse(hx - 2.6, y - 13.4, 2.8, 1.1, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // 만두머리는 머리 꼭대기에 얹는다
  if (look.hairStyle === "buns") {
    for (const bx of [cx - 6.8, cx + 6.8]) {
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.arc(bx, y - 15.4, 3.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.hairLight;
      ctx.beginPath();
      ctx.ellipse(bx - 1.2, y - 16.6, 1.5, 0.9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // 리본은 만두 하나에 하나씩, 만두 "위쪽"에. 아래쪽에 그리면 얼굴을
      // 가로질러 안경처럼 보인다.
      ctx.strokeStyle = look.ribbon;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx, y - 15.4, 4.8, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
  }

  // 리본 — 머리 모양마다 달리는 자리가 다르다
  ctx.fillStyle = look.ribbon;
  const bows: [number, number, number][] =
    look.hairStyle === "twin"
      ? [
          [cx - 8.4, y - 12.6, -0.4],
          [cx + 8.4, y - 12.6, 0.4],
        ]
      : look.hairStyle === "bob"
        ? [[cx + 7.4, y - 12.4, 0.3]]
        : look.hairStyle === "long"
          ? [[cx - 7.4, y - 12.4, -0.3]]
          : [];
  for (const [bx, by, rot] of bows) {
    ctx.beginPath();
    ctx.ellipse(bx - 1.6, by, 2, 1.6, rot, 0, Math.PI * 2);
    ctx.ellipse(bx + 1.6, by, 2, 1.6, -rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 얼굴 생김새 — 뒤돌아 있으면 그리지 않는다
  if (!back) {
    const ex = side ? face * 2.2 : 0;

    ctx.fillStyle = "#2b2233";
    if (side) {
      ctx.beginPath();
      ctx.ellipse(hx + ex, y - 9.4, 1.05, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(200,140,120,0.75)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(hx + face * 6.2, y - 9.6);
      ctx.lineTo(hx + face * 7.2, y - 8.4);
      ctx.lineTo(hx + face * 6.2, y - 7.8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx - 2.5, y - 9.4, 1.1, 1.4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 2.5, y - 9.4, 1.1, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    if (side) ctx.arc(hx + ex + 0.4, y - 9.9, 0.42, 0, Math.PI * 2);
    else {
      ctx.arc(cx - 2.1, y - 9.9, 0.45, 0, Math.PI * 2);
      ctx.arc(cx + 2.9, y - 9.9, 0.45, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = "#2b2233";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    if (side) {
      ctx.moveTo(hx + ex - 1.3, y - 10.5);
      ctx.lineTo(hx + ex + 1.3, y - 10.7);
    } else {
      ctx.moveTo(cx - 3.8, y - 10.6);
      ctx.lineTo(cx - 1.4, y - 10.8);
      ctx.moveTo(cx + 1.4, y - 10.8);
      ctx.lineTo(cx + 3.8, y - 10.6);
    }
    ctx.stroke();

    ctx.fillStyle = look.blush;
    ctx.beginPath();
    ctx.ellipse(hx - 4.2, y - 7.2, 1.7, 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(hx + 4.2, y - 7.2, 1.7, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#b4586e";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(hx + (side ? face * 1.2 : 0), y - 7.4, 1.7, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

/** 캐릭터 고르는 화면에 크게 그리는 전신 그림 */
export function drawHeroPortrait(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  look: HeroLook,
  t: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawHero(ctx, cx, cy, "down", 0, t, look);
  ctx.restore();
}

/** 클리어 화면에서 두 팔 번쩍 든 별이 */
export function drawHeroCheer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  look: HeroLook = HERO,
): void {
  const hop = Math.abs(Math.sin(t / 220)) * 5;
  drawHero(ctx, cx, cy - hop, "down", 0, t, look);
  ctx.save();
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  const y = cy - hop;
  ctx.beginPath();
  ctx.moveTo(cx - 5, y - 2);
  ctx.lineTo(cx - 9, y - 9);
  ctx.moveTo(cx + 5, y - 2);
  ctx.lineTo(cx + 9, y - 9);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 유령 뽀글이
// ---------------------------------------------------------------------------

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
): void {
  const bob = Math.sin(t / 480) * 2.6;
  const y = cy + bob;
  const sway = Math.sin(t / 700) * 1.2;

  ctx.save();
  zoom(ctx, cx, cy);

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 15, 8 - bob * 0.3, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 — 아랫자락이 물결치며 흔들린다
  ctx.shadowColor = "rgba(180,230,255,0.8)";
  ctx.shadowBlur = 10;
  const body = ctx.createLinearGradient(cx, y - 12, cx, y + 12);
  body.addColorStop(0, "rgba(226,248,255,0.95)");
  body.addColorStop(1, GHOST.body);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, y - 3, 9, Math.PI, 0);
  ctx.lineTo(cx + 9, y + 7);
  for (let i = 0; i < 3; i++) {
    const x0 = cx + 9 - i * 6;
    const deep = i % 2 === 0 ? 12 : 3;
    ctx.quadraticCurveTo(x0 - 3, y + deep + sway * (i % 2 === 0 ? 1 : -1), x0 - 6, y + 7);
  }
  ctx.lineTo(cx - 9, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // 안쪽에서 은은하게 도는 빛
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - 3.4, y - 6.4, 2.6, 1.8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // 짧은 팔
  ctx.strokeStyle = GHOST.edge;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 8, y - 1);
  ctx.lineTo(cx - 11 - sway, y + 2.5);
  ctx.moveTo(cx + 8, y - 1);
  ctx.lineTo(cx + 11 + sway, y + 2.5);
  ctx.stroke();

  // 옆구리에 낀 책 — 사서니까
  ctx.fillStyle = "#c9445e";
  ctx.save();
  ctx.translate(cx + 10 + sway, y + 3.5);
  ctx.rotate(0.3);
  ctx.fillRect(-3, -2.6, 6, 5.2);
  ctx.fillStyle = "#f3e6c8";
  ctx.fillRect(-2, -2, 4, 4.2);
  ctx.restore();

  // 눈 — 반짝임 한 점씩
  ctx.fillStyle = GHOST.face;
  ctx.beginPath();
  ctx.ellipse(cx - 3.2, y - 4, 1.6, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 3.2, y - 4, 1.6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(cx - 2.7, y - 4.7, 0.55, 0, Math.PI * 2);
  ctx.arc(cx + 3.7, y - 4.7, 0.55, 0, Math.PI * 2);
  ctx.fill();

  // 동그란 안경
  ctx.strokeStyle = "rgba(90,110,150,0.75)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(cx - 3.2, y - 4, 3, 0, Math.PI * 2);
  ctx.arc(cx + 3.2, y - 4, 3, 0, Math.PI * 2);
  ctx.moveTo(cx - 0.2, y - 4);
  ctx.lineTo(cx + 0.2, y - 4);
  ctx.stroke();

  ctx.fillStyle = GHOST.blush;
  ctx.beginPath();
  ctx.ellipse(cx - 6.4, y - 0.6, 2.1, 1.3, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 6.4, y - 0.6, 2.1, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 웃는 입
  ctx.strokeStyle = GHOST.face;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(cx, y - 1.2, 2.3, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 방 안의 물건들
// ---------------------------------------------------------------------------

export interface PropOpts {
  /**
   * 촛대는 불이 켜졌는지, 상자는 뚜껑이 열렸는지.
   * 촛대는 기본이 "켜짐"(다른 방의 장식 촛불은 늘 켜져 있다),
   * 상자는 기본이 "닫힘"이다.
   */
  active?: boolean;
  /** 촛불 색 */
  tint?: string | null;
  /** 초가 얼마나 남았는지 0~1 */
  burn?: number;
}

export function drawProp(
  ctx: CanvasRenderingContext2D,
  art: PropArt,
  cx: number,
  cy: number,
  t: number,
  accent: string,
  opts?: PropOpts,
): void {
  ctx.save();
  zoom(ctx, cx, cy);
  switch (art) {
    case "crate": {
      ctx.fillStyle = "#7b5539";
      roundRect(ctx, cx - 13, cy - 11, 26, 24, 3);
      ctx.fill();
      ctx.strokeStyle = "#a9764f";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy - 11);
      ctx.lineTo(cx + 13, cy + 13);
      ctx.moveTo(cx + 13, cy - 11);
      ctx.lineTo(cx - 13, cy + 13);
      ctx.stroke();
      break;
    }
    case "armor": {
      // 어깨 갑옷
      ctx.fillStyle = "#7d8ba4";
      ctx.beginPath();
      ctx.ellipse(cx - 9, cy + 1, 4.2, 3.4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 9, cy + 1, 4.2, 3.4, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // 몸통 — 가운데가 불룩하게 빛나도록 좌우로 명암을 준다
      const plate = ctx.createLinearGradient(cx - 9, cy, cx + 9, cy);
      plate.addColorStop(0, "#6d7b93");
      plate.addColorStop(0.42, "#aab8cc");
      plate.addColorStop(1, "#6d7b93");
      ctx.fillStyle = plate;
      roundRect(ctx, cx - 8.5, cy - 1, 17, 15, 5);
      ctx.fill();
      ctx.strokeStyle = "#c3cfe2";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(cx, cy + 0.5);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();

      // 허리띠와 버클
      ctx.fillStyle = "#5a4a35";
      ctx.fillRect(cx - 8.5, cy + 8.6, 17, 2.8);
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(cx - 2, cy + 8.2, 4, 3.6);

      // 리벳
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(cx - 6, cy + 2 + i * 4, 0.8, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy + 2 + i * 4, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 투구
      ctx.fillStyle = "#9aa7bd";
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 6.6, Math.PI, 0);
      ctx.rect(cx - 6.6, cy - 6, 13.2, 5.2);
      ctx.fill();
      ctx.strokeStyle = "#c3cfe2";
      ctx.lineWidth = 1;
      ctx.stroke();
      // 면갑 틈 — 안이 비어 있어 새까맣다
      ctx.fillStyle = "#232c3a";
      ctx.fillRect(cx - 4.6, cy - 5.2, 9.2, 2.2);
      ctx.fillRect(cx - 0.9, cy - 2.6, 1.8, 1.8);
      // 붉은 볏
      ctx.fillStyle = "#c9445e";
      ctx.beginPath();
      ctx.moveTo(cx - 0.6, cy - 12.6);
      ctx.quadraticCurveTo(cx + 5.4, cy - 11.4, cx + 3.6, cy - 6.2);
      ctx.quadraticCurveTo(cx + 1.4, cy - 9.4, cx - 1.8, cy - 10.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "portrait": {
      ctx.fillStyle = "#8a6a3a";
      roundRect(ctx, cx - 12, cy - 13, 24, 26, 2);
      ctx.fill();
      ctx.fillStyle = "#2c2438";
      ctx.fillRect(cx - 9, cy - 10, 18, 20);
      // 액자 속 인물 — 눈이 플레이어를 따라오는 느낌으로 천천히 움직인다.
      // 지도에서는 콩알만 하지만 확대 화면에서는 크게 보이므로, 어깨와 머리까지
      // 갖춰 그려야 "덩어리"가 아니라 사람으로 읽힌다.
      const look = Math.sin(t / 900) * 1.6;
      ctx.fillStyle = "#4a3d63";
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 10);
      ctx.quadraticCurveTo(cx, cy + 1, cx + 8, cy + 10);
      ctx.closePath();
      ctx.fill();
      // 뒷머리
      ctx.fillStyle = "#2a2038";
      ctx.beginPath();
      ctx.arc(cx, cy - 2.5, 6.2, 0, Math.PI * 2);
      ctx.fill();
      // 얼굴
      ctx.fillStyle = "#e8c6ac";
      ctx.beginPath();
      ctx.arc(cx, cy - 1.5, 5, 0, Math.PI * 2);
      ctx.fill();
      // 앞머리
      ctx.fillStyle = "#2a2038";
      ctx.beginPath();
      ctx.arc(cx, cy - 3.2, 5.2, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx - 2 + look, cy - 1.4, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 2 + look, cy - 1.4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#241a2e";
      ctx.beginPath();
      ctx.arc(cx - 2 + look, cy - 1.4, 0.7, 0, Math.PI * 2);
      ctx.arc(cx + 2 + look, cy - 1.4, 0.7, 0, Math.PI * 2);
      ctx.fill();
      // 옅은 미소
      ctx.strokeStyle = "#a4636f";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy + 0.6, 1.6, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      // 작은 왕관 — 가운데 봉우리를 확실히 높여야 뿔 두 개로 안 보인다
      ctx.fillStyle = "#c9a227";
      ctx.beginPath();
      ctx.moveTo(cx - 4.6, cy - 6.4);
      ctx.lineTo(cx - 4.6, cy - 8.4);
      ctx.lineTo(cx - 2.3, cy - 7);
      ctx.lineTo(cx, cy - 9.8);
      ctx.lineTo(cx + 2.3, cy - 7);
      ctx.lineTo(cx + 4.6, cy - 8.4);
      ctx.lineTo(cx + 4.6, cy - 6.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 1.6;
      roundRect(ctx, cx - 12, cy - 13, 24, 26, 2);
      ctx.stroke();
      break;
    }
    case "plant": {
      ctx.fillStyle = "#8d5a34";
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 2);
      ctx.lineTo(cx + 8, cy + 2);
      ctx.lineTo(cx + 6, cy + 14);
      ctx.lineTo(cx - 6, cy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#5f7f4a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 2);
        ctx.quadraticCurveTo(cx + i * 8, cy - 6, cx + i * 10, cy - 12 + Math.abs(i) * 4);
        ctx.stroke();
      }
      break;
    }
    case "broom": {
      ctx.strokeStyle = "#a9764f";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 14);
      ctx.lineTo(cx - 3, cy + 8);
      ctx.stroke();
      ctx.fillStyle = "#d9b26a";
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + 6);
      ctx.lineTo(cx - 10, cy + 15);
      ctx.lineTo(cx + 4, cy + 15);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "note": {
      ctx.fillStyle = "#f3e6c8";
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t / 1400) * 0.04);
      roundRect(ctx, -11, -12, 22, 24, 2);
      ctx.fill();
      ctx.strokeStyle = "#b79b6a";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-7, -6 + i * 5);
        ctx.lineTo(7 - (i % 2) * 4, -6 + i * 5);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "desk": {
      ctx.fillStyle = "#6b4426";
      roundRect(ctx, cx - 14, cy - 2, 28, 6, 2);
      ctx.fill();
      ctx.fillRect(cx - 12, cy + 4, 3, 10);
      ctx.fillRect(cx + 9, cy + 4, 3, 10);
      // 쌓인 책
      const books = ["#c9445e", "#4e7fc4", "#e0a53a"];
      books.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(cx - 9 + i, cy - 6 - i * 4, 17 - i * 2, 4);
      });
      break;
    }
    case "candle": {
      const on = opts?.active !== false;
      const flame = opts?.tint ?? "#9be7ff";
      // 남은 길이. 이 값이 그림에 그대로 드러나야 순서를 눈으로 비교할 수 있다.
      const burn = Math.max(0.12, Math.min(1, opts?.burn ?? 1));
      const bottom = cy + 3;
      const len = 15 * burn;
      const top = bottom - len;

      // 받침 — 불이 꺼져 있어도 어느 촛대인지 알아보게 색을 입힌다
      ctx.fillStyle = "#7a6a86";
      roundRect(ctx, cx - 4, cy + 2, 8, 12, 2);
      ctx.fill();
      ctx.fillStyle = "#9b8aa8";
      ctx.fillRect(cx - 5.5, cy + 12, 11, 2.4);
      if (opts?.tint) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = opts.tint;
        roundRect(ctx, cx - 4, cy + 2, 8, 12, 2);
        ctx.fill();
        ctx.fillRect(cx - 5.5, cy + 12, 11, 2.4);
        ctx.restore();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        roundRect(ctx, cx - 4, cy + 2, 8, 12, 2);
        ctx.stroke();
      }

      // 초
      ctx.fillStyle = "#fff0f6";
      ctx.fillRect(cx - 3, top, 6, len);
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(cx + 1.4, top, 1.6, len);

      // 짧게 탄 초일수록 촛농이 많이 흘러내렸다 — 길이와 같은 이야기를 한 번 더
      ctx.fillStyle = "#fff0f6";
      const drips = Math.round((1 - burn) * 3);
      for (let i = 0; i < drips; i++) {
        const dx = cx - 2.4 + i * 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, bottom - 1);
        ctx.quadraticCurveTo(dx + 1.4, bottom + 2 + i, dx, bottom + 4 + i);
        ctx.quadraticCurveTo(dx - 1.4, bottom + 2 + i, dx, bottom - 1);
        ctx.fill();
      }

      // 심지
      ctx.strokeStyle = on ? "#4a3a2a" : "#2b2233";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top - 2.5);
      ctx.stroke();

      if (on) {
        const flick = 1 + Math.sin(t / 110) * 0.16;
        ctx.fillStyle = flame;
        ctx.shadowColor = flame;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(cx, top - 5, 2.6 * flick, 5 * flick, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(cx, top - 4.4, 1.1 * flick, 2.2 * flick, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 꺼진 초 — 심지에서 연기 한 줄이 피어오른다
        ctx.strokeStyle = "rgba(200,200,220,0.28)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx, top - 3);
        ctx.quadraticCurveTo(cx + 2.4, top - 6, cx - 0.6, top - 8.5);
        ctx.stroke();
      }
      break;
    }
    case "gear": {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t / 2600);
      ctx.fillStyle = "#8a6f3f";
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.rect(-2.6, -16, 5.2, 6);
        ctx.rotate(Math.PI / 5);
        void a;
      }
      ctx.fill();
      ctx.fillStyle = "#b28e50";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5c4a2a";
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.5 + Math.sin(t / 400) * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "mirror": {
      ctx.fillStyle = "#c9a227";
      roundRect(ctx, cx - 11, cy - 14, 22, 28, 10);
      ctx.fill();
      const g = ctx.createLinearGradient(cx - 8, cy - 11, cx + 8, cy + 11);
      g.addColorStop(0, "#dbe9ff");
      g.addColorStop(0.5, "#8fa9c9");
      g.addColorStop(1, "#dbe9ff");
      ctx.fillStyle = g;
      roundRect(ctx, cx - 8, cy - 11, 16, 22, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 6);
      ctx.lineTo(cx + 3, cy - 7);
      ctx.stroke();
      break;
    }
    case "keypadSign": {
      ctx.fillStyle = "#3f4a5c";
      roundRect(ctx, cx - 10, cy - 11, 20, 22, 3);
      ctx.fill();
      ctx.fillStyle = accent;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect(cx - 7 + c * 5, cy - 8 + r * 5, 3.4, 3.4);
        }
      }
      break;
    }
    case "chest": {
      const open = opts?.active === true;
      // 몸통
      const wood = ctx.createLinearGradient(cx, cy - 2, cx, cy + 14);
      wood.addColorStop(0, "#8a5a33");
      wood.addColorStop(1, "#5a3a22");
      ctx.fillStyle = wood;
      roundRect(ctx, cx - 14, cy - 2, 28, 16, 3);
      ctx.fill();
      ctx.strokeStyle = "#3a2416";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 쇠 띠
      ctx.fillStyle = "#c0c8d6";
      ctx.fillRect(cx - 10, cy - 2, 3, 16);
      ctx.fillRect(cx + 7, cy - 2, 3, 16);

      if (open) {
        // 열린 뚜껑 — 뒤로 젖혀져 있고 안에서 빛이 새어 나온다
        ctx.save();
        ctx.translate(cx, cy - 2);
        ctx.rotate(-0.5);
        ctx.fillStyle = "#a9764f";
        roundRect(ctx, -14, -11, 28, 11, 4);
        ctx.fill();
        ctx.strokeStyle = "#3a2416";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#ffd166";
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 10, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // 닫힌 뚜껑과 자물쇠
        ctx.fillStyle = "#a9764f";
        roundRect(ctx, cx - 14, cy - 12, 28, 12, 4);
        ctx.fill();
        ctx.strokeStyle = "#3a2416";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = "#c0c8d6";
        ctx.fillRect(cx - 10, cy - 12, 3, 12);
        ctx.fillRect(cx + 7, cy - 12, 3, 12);
        ctx.fillStyle = "#c9a227";
        roundRect(ctx, cx - 4, cy - 4, 8, 7, 1.6);
        ctx.fill();
        ctx.strokeStyle = "#c9a227";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 2.8, Math.PI, 0);
        ctx.stroke();
        // 자물쇠에 새겨진 촛불 네 개 — 무엇을 해야 하는지 알려 준다
        ctx.fillStyle = "rgba(255,243,196,0.85)";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(cx - 5.4 + i * 3.6, cy - 8, 0.9, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "telescope": {
      ctx.strokeStyle = "#8695ad";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.moveTo(cx, cy + 14);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy - 1);
      ctx.rotate(-0.6);
      ctx.fillStyle = "#4e5f7a";
      roundRect(ctx, -13, -4, 26, 8, 4);
      ctx.fill();
      ctx.fillStyle = accent;
      roundRect(ctx, 9, -5, 6, 10, 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 퍼즐 요소
// ---------------------------------------------------------------------------

/** 바닥에 박힌 종. lit이면 환하게 울리는 중. */
export function drawBell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  lit: boolean,
  t: number,
): void {
  ctx.save();
  zoom(ctx, cx, cy);
  const pulse = lit ? 1.12 + Math.sin(t / 70) * 0.06 : 1;
  ctx.globalAlpha = lit ? 1 : 0.55;
  ctx.fillStyle = color;
  if (lit) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14 * pulse, 11 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // 종 모양
  ctx.fillStyle = lit ? "#fffdf4" : "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 4);
  ctx.quadraticCurveTo(cx - 6, cy - 7, cx, cy - 7);
  ctx.quadraticCurveTo(cx + 6, cy - 7, cx + 6, cy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 밀어서 옮기는 별 상자 */
export function drawStarBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  onTarget: boolean,
  t: number,
): void {
  ctx.save();
  zoom(ctx, cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 15, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(cx, cy - 15, cx, cy + 14);
  g.addColorStop(0, onTarget ? "#8b7ad6" : "#5a4f8f");
  g.addColorStop(1, onTarget ? "#5c4ea8" : "#3b3468");
  ctx.fillStyle = g;
  roundRect(ctx, cx - 15, cy - 15, 30, 29, 5);
  ctx.fill();
  ctx.strokeStyle = onTarget ? "#fff3c4" : "#7d72b8";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (onTarget) {
    ctx.shadowColor = "#fff3c4";
    ctx.shadowBlur = 14 + Math.sin(t / 180) * 6;
  }
  ctx.fillStyle = onTarget ? "#fff3c4" : "#ffd166";
  star(ctx, cx, cy, 9, 4);
  ctx.fill();
  ctx.restore();
}

/** 별 상자를 올려야 하는 달 표식 */
export function drawMoonMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
): void {
  ctx.save();
  // 지붕널 무늬 위에서도 눈에 띄도록 어두운 받침을 먼저 깐다
  ctx.fillStyle = "rgba(12,8,28,0.5)";
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#fff3c4";
  ctx.shadowBlur = 10 + Math.sin(t / 400) * 5;
  ctx.globalAlpha = 0.85 + Math.sin(t / 500) * 0.15;
  ctx.strokeStyle = "#fff3c4";
  ctx.lineWidth = 2.4;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t / 90;
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // 초승달
  ctx.fillStyle = "rgba(255,243,196,0.6)";
  ctx.beginPath();
  ctx.arc(cx + 1, cy, 8, 0, Math.PI * 2);
  ctx.arc(cx + 4.5, cy - 1.5, 7.5, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}

/** 다음 방으로 가는 문. open이면 안쪽에서 빛이 새어 나온다. */
export function drawDoor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  open: number,
  accent: string,
  t: number,
): void {
  ctx.save();
  ctx.fillStyle = "#2a1c3c";
  roundRect(ctx, cx - TILE / 2, cy - TILE / 2 - 4, TILE, TILE + 4, 3);
  ctx.fill();

  if (open > 0) {
    // 열린 문: 따뜻한 빛
    const g = ctx.createLinearGradient(cx, cy - 20, cx, cy + 20);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(1, accent);
    ctx.globalAlpha = Math.min(1, open);
    ctx.fillStyle = g;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 20 + Math.sin(t / 260) * 8;
    roundRect(ctx, cx - 13, cy - 17, 26, 34, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#6b4426";
    roundRect(ctx, cx - 14, cy - 18, 28, 36, 4);
    ctx.fill();
    ctx.strokeStyle = "#a9764f";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(cx + 8, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // 자물쇠
    ctx.fillStyle = "#c0c8d6";
    roundRect(ctx, cx - 6, cy - 2, 12, 10, 2);
    ctx.fill();
    ctx.strokeStyle = "#c0c8d6";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 4, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export { star, roundRect };
