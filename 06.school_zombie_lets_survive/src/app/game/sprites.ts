import { CLOTH_COLORS, COLORS, HAIR_COLORS, TILE } from "./constants";
import { FRIENDS, INGREDIENTS } from "./maps";

/**
 * 캔버스로 직접 그리는 그림들. 이미지 파일도, 이모지도 쓰지 않는다.
 *
 * 규칙 (graphic-designer): 파스텔 + 굵은 외곽선 2px + 둥근 모서리,
 * 그림자는 발밑 타원 하나, **캐릭터 디테일은 3개 이하** (몸색 / 눈 / 머리 위 아이콘).
 * 엔티티마다 draw 함수가 하나씩이라 나중에 통째로 갈아 끼울 수 있다.
 */

const OUT = COLORS.outline;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 세로로 조금 긴 캡슐 = 이 게임의 공통 몸통 실루엣 */
/**
 * 몸통 윤곽선. 위·아래를 **타원 캡**으로 둥글린다 (반지름 = 가로의 절반짜리 원형 캡보다 더 둥글다).
 * 10살이 좀비를 "눈 달린 파란 사물함"이라고 불렀다 — 사물함 타일(모서리 5px 사각형)과
 * 형태로 확실히 갈라놓기 위한 조치다 (DESIGN §12-D).
 */
function bodyPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const rx = w / 2;
  const ry = Math.min(h / 2, w * 0.62);
  const top = y - h / 2 + ry;
  const bot = y + h / 2 - ry;
  ctx.beginPath();
  ctx.ellipse(x, top, rx, ry, 0, Math.PI, 0);
  ctx.lineTo(x + rx, bot);
  ctx.ellipse(x, bot, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, top);
  ctx.closePath();
}

function capsule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  bodyPath(ctx, x, y, w, h);
  ctx.fill();
  ctx.stroke();
}

/** 색을 그만큼 어둡게 (앞머리에 쓸 단일 톤. 새 색을 추가하지 않는다) */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

function eyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pupil: string,
  sleepy: boolean,
  wide = false,
): void {
  // 눈이 캡슐 실루엣(반폭 0.75r) 밖으로 튀어나가지 않도록 gap+반지름 합을 0.7r 이내로 묶는다.
  // (r=34 큰 미리보기에서 "눈이 커 보인다"는 지적의 실제 원인 — 모든 스케일에서 동일하게 새던 버그)
  const gap = r * 0.4;
  const rx = r * 0.27;
  for (const sx of [-gap, gap]) {
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(x + sx, y, rx, r * (sleepy ? 0.17 : wide ? 0.33 : 0.26), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(x + sx, y - (sleepy ? 0 : r * 0.04), r * (sleepy ? 0.12 : 0.155), 0, Math.PI * 2);
    ctx.fill();
    if (sleepy) {
      // 반쯤 덮인 눈꺼풀
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x + sx, y, rx, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// 주인공 · 친구
// ---------------------------------------------------------------------------

export interface LookOpts {
  hair: number;
  cloth: number;
  hat?: string | null;
}

export function drawHair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  style: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  const top = y - r * 0.78;
  switch (style) {
    case 0: // 까만 단발 — 몸통 위 일자
      roundRect(ctx, x - r * 0.82, top - r * 0.34, r * 1.64, r * 0.62, r * 0.3);
      ctx.fill();
      ctx.stroke();
      break;
    case 1: // 갈색 포니테일 — 옆으로 흐르는 곡선
      roundRect(ctx, x - r * 0.8, top - r * 0.3, r * 1.6, r * 0.56, r * 0.28);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + r * 0.92, y - r * 0.1, r * 0.24, r * 0.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 2: // 다홍 트윈테일 — 양쪽 작은 삼각
      roundRect(ctx, x - r * 0.8, top - r * 0.28, r * 1.6, r * 0.54, r * 0.26);
      ctx.fill();
      ctx.stroke();
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sx * r * 0.8, y - r * 0.5);
        ctx.lineTo(x + sx * r * 1.2, y - r * 0.05);
        ctx.lineTo(x + sx * r * 0.72, y - r * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    default: // 금발 양갈래 — 동그라미 두 개
      roundRect(ctx, x - r * 0.8, top - r * 0.28, r * 1.6, r * 0.54, r * 0.26);
      ctx.fill();
      ctx.stroke();
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + sx * r * 0.92, y - r * 0.44, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
  }
}

export function drawHat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hat: string,
): void {
  const top = y - r * 1.12;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  if (hat === "ribbon") {
    ctx.fillStyle = "#FF8FB8";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sx * r * 0.34, top + r * 0.1, r * 0.3, r * 0.22, sx * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#FFD1E3";
    ctx.beginPath();
    ctx.arc(x, top + r * 0.1, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hat === "crown") {
    ctx.fillStyle = "#FFD34D";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, top + r * 0.3);
    ctx.lineTo(x - r * 0.5, top - r * 0.18);
    ctx.lineTo(x - r * 0.18, top + r * 0.06);
    ctx.lineTo(x, top - r * 0.26);
    ctx.lineTo(x + r * 0.18, top + r * 0.06);
    ctx.lineTo(x + r * 0.5, top - r * 0.18);
    ctx.lineTo(x + r * 0.5, top + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hat === "lunch") {
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, x - r * 0.56, top - r * 0.04, r * 1.12, r * 0.34, r * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, top - r * 0.1, r * 0.46, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hat === "janitor") {
    ctx.fillStyle = "#7FD4FF";
    roundRect(ctx, x - r * 0.5, top - r * 0.06, r, r * 0.3, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, top - r * 0.12, r * 0.4, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hat === "pudding") {
    ctx.fillStyle = "#FFC2D6";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, top + r * 0.3);
    ctx.lineTo(x - r * 0.34, top - r * 0.12);
    ctx.lineTo(x + r * 0.34, top - r * 0.12);
    ctx.lineTo(x + r * 0.5, top + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#E8467A";
    ctx.beginPath();
    ctx.arc(x, top - r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export interface PlayerDrawOpts {
  look: LookOpts;
  r: number;
  walkT: number;
  moving: boolean;
  sleeping?: boolean;
  torch?: boolean;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: PlayerDrawOpts,
): void {
  const r = o.r;
  const bob = o.moving ? Math.sin(o.walkT) * 1.6 : Math.sin(o.walkT * 0.3) * 0.6;
  const cy = y + bob;
  shadow(ctx, x, y + r * 0.92, r * 0.78);
  capsule(ctx, x, cy, r * 1.5, r * 1.95, CLOTH_COLORS[o.look.cloth % 4]);
  // 흰 카라
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, x - r * 0.4, cy - r * 0.34, r * 0.8, r * 0.2, r * 0.1);
  ctx.fill();
  drawHair(ctx, x, cy, r, o.look.hair % 4, HAIR_COLORS[o.look.hair % 4]);
  if (o.sleeping) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * r * 0.3, cy - r * 0.14, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    eyes(ctx, x, cy - r * 0.16, r, "#2D2540", false);
  }
  if (o.look.hat) drawHat(ctx, x, cy, r, o.look.hat);
}

export function drawFriend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  who: number,
  r: number,
  t: number,
  asleep: boolean,
): void {
  // 하늘색 고리형 글로우 (펄스) — 좀비와 절대 안 헷갈리게
  const pulse = 0.7 + Math.sin(t * 0.004) * 0.3;
  ctx.save();
  ctx.strokeStyle = COLORS.friendGlow;
  ctx.globalAlpha = 0.5 + pulse * 0.4;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const f = FRIENDS[who % FRIENDS.length];
  const bob = Math.sin(t * 0.005 + who) * 1.4;
  shadow(ctx, x, y + r * 0.92, r * 0.72);
  capsule(ctx, x, y + bob, r * 1.42, r * 1.85, CLOTH_COLORS[f.cloth]);
  drawHair(ctx, x, y + bob, r, f.hair, HAIR_COLORS[f.hair]);
  if (asleep) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * r * 0.3, y + bob - r * 0.14, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    eyes(ctx, x, y + bob - r * 0.16, r, "#2D2540", false, true);
    // 손 흔들기
    ctx.strokeStyle = OUT;
    ctx.fillStyle = CLOTH_COLORS[f.cloth];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      x + r * 0.95,
      y + bob - r * 0.3 + Math.sin(t * 0.012) * 3,
      r * 0.24,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * 아직 못 구한 친구 — 엔딩에서 그 자리에 회색으로 누워 자고 있다.
 * 급식표 수집 화면의 회색 실루엣과 같은 언어다: **자리는 있고, 아직 안 채워졌다.**
 */
export function drawSleepingFriend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  name: string,
  t: number,
): void {
  ctx.save();
  shadow(ctx, x, y + r * 0.5, r * 0.9);
  ctx.translate(x, y + r * 0.45);
  ctx.rotate(Math.PI / 2.1);
  capsule(ctx, 0, 0, r * 1.42, r * 1.85, "#6E6A80");
  // 감은 눈
  ctx.strokeStyle = "#3B3552";
  ctx.lineWidth = 1.8;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * r * 0.3, -r * 0.14, r * 0.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // zzz
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  for (let i = 0; i < 3; i++) {
    const a = ((t * 0.0006 + i * 0.33) % 1);
    ctx.globalAlpha = 0.8 - a * 0.7;
    ctx.font = `bold ${9 + i * 3}px system-ui, sans-serif`;
    ctx.fillText("z", x + r * 0.9 + a * 10, y - r * 0.5 - a * 22);
  }
  ctx.restore();

  // 이름은 바닥(살구색) 위에 얹히므로 어두운 색으로 써야 읽힌다
  ctx.fillStyle = "rgba(72,54,44,0.85)";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, x, y + r * 1.7);
}

// ---------------------------------------------------------------------------
// 좀비 · 아주머니 · 교장
// ---------------------------------------------------------------------------

export interface ZombieDrawOpts {
  kind: "basic" | "hungry" | "matron";
  r: number;
  bob: number;
  state: string;
  /** 하품 중 */
  yawning: boolean;
  /** 개체 변주 — 앞머리 모양 (기본 좀비 전용) */
  variant?: 0 | 1 | 2;
  /** 뒤뚱임 위상 오프셋 */
  phase?: number;
  /** 뒤뚱임 진폭 배율 */
  amp?: number;
}

export function drawZombie(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  o: ZombieDrawOpts,
): void {
  const r = o.r;
  const hungry = o.kind === "hungry";
  const speed = o.state === "chase" ? 1.6 : hungry ? 1.3 : 1;
  // 개체마다 박자를 어긋나게 한다 — "복제 인간처럼 보인다"의 진짜 원인은
  // 형태가 아니라 **다 같은 박자로 흔들리는 것**이다 (DESIGN §12-A).
  const ph = o.phase ?? 0;
  const amp = o.amp ?? 1;
  const sway = Math.sin(o.bob + ph) * 2.4 * speed * amp;
  const stretch = o.yawning ? 1 + Math.sin((o.bob + ph) * 2) * 0.06 * amp : 1;
  shadow(ctx, x, y + r * 0.94, r * 0.82);

  ctx.save();
  ctx.translate(x + sway * 0.35, y);
  // 배고픈 좀비는 몸을 앞으로 기울여 "뒤뚱임이 빠르다"를 자세로도 읽히게 한다
  ctx.rotate(sway * 0.012 + (hungry ? -0.14 : 0));

  if (!hungry) {
    // 축 늘어진 팔 두 개 — 기본/아주머니 좀비의 실루엣, 플레이어와 구분되는 핵심
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.fillStyle = COLORS.zombieBody;
    for (const sx of [-1, 1]) {
      roundRect(ctx, sx * r * 0.78 - r * 0.16, -r * 0.2, r * 0.32, r * 1.25, r * 0.16);
      ctx.fill();
      ctx.stroke();
    }
  }

  const bw = r * 1.45;
  const bh = r * 1.9 * stretch;
  capsule(ctx, 0, 0, bw, bh, COLORS.zombieBody);

  // 앞머리 3종 — **윤곽선 안쪽에만** 그린다. 몸 색을 어둡게 한 단일 톤만 쓴다.
  // 밖으로 한 픽셀도 안 나가므로 흑백 실루엣은 넷이 완전히 같다.
  if (o.kind === "basic") {
    ctx.save();
    bodyPath(ctx, 0, 0, bw, bh);
    ctx.clip();
    ctx.fillStyle = shade(COLORS.zombieBody, 0.72);
    const top = -bh / 2;
    switch (o.variant ?? 0) {
      case 1: // 옆가르마 — 한쪽으로 흐르는 아치
        ctx.beginPath();
        ctx.moveTo(-bw, top);
        ctx.lineTo(bw, top);
        ctx.lineTo(bw * 0.5, top + bh * 0.3);
        ctx.quadraticCurveTo(-bw * 0.1, top + bh * 0.12, -bw, top + bh * 0.26);
        ctx.closePath();
        ctx.fill();
        break;
      case 2: // 뿔 두 개 — 위로 뻗친 머리카락 두 갈래
        ctx.beginPath();
        ctx.moveTo(-bw, top);
        ctx.lineTo(bw, top);
        ctx.lineTo(bw, top + bh * 0.14);
        ctx.lineTo(bw * 0.28, top + bh * 0.14);
        ctx.lineTo(bw * 0.14, top + bh * 0.3);
        ctx.lineTo(0, top + bh * 0.14);
        ctx.lineTo(-bw * 0.14, top + bh * 0.3);
        ctx.lineTo(-bw * 0.28, top + bh * 0.14);
        ctx.lineTo(-bw, top + bh * 0.14);
        ctx.closePath();
        ctx.fill();
        break;
      default: // 일자 뱅
        ctx.fillRect(-bw, top, bw * 2, bh * 0.24);
        break;
    }
    ctx.restore();
  }

  if (hungry) {
    // 한쪽 팔만 앞으로 뻗어 급식판을 든다 — 실루엣 자체가 기본 좀비와 다르다(흑백으로도 구분)
    ctx.fillStyle = COLORS.zombieBody;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    roundRect(ctx, r * 0.55, -r * 0.42, r * 0.95, r * 0.4, r * 0.18);
    ctx.fill();
    ctx.stroke();
  }

  if (o.kind === "matron") {
    // 빨간 머릿수건 + 흰 앞치마 + 국자 — 흑백으로 봐도 구분된다
    ctx.fillStyle = COLORS.matronApron;
    ctx.strokeStyle = OUT;
    roundRect(ctx, -r * 0.5, r * 0.05, r, r * 0.85, r * 0.16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.matronScarf;
    roundRect(ctx, -r * 0.85, -r * 1.08, r * 1.7, r * 0.6, r * 0.24);
    ctx.fill();
    ctx.stroke();
    // 국자
    ctx.strokeStyle = "#C9CDD6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.95, -r * 0.4);
    ctx.lineTo(r * 1.25, r * 0.5);
    ctx.stroke();
    ctx.fillStyle = "#E8EBF0";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(r * 1.3, r * 0.68, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hungry) {
    // 급식판 — 뻗은 팔 끝에 들려 있다 (아주머니의 예고편)
    ctx.fillStyle = "#D8DEE6";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    roundRect(ctx, r * 0.4, -r * 0.62, r * 1.1, r * 0.4, r * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#B48BE8";
    ctx.beginPath();
    ctx.arc(r * 0.65, -r * 0.42, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFC93C";
    ctx.beginPath();
    ctx.arc(r * 1.05, -r * 0.42, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  // 감지/추격 중엔 눈이 커진다("봤다"를 표정으로도 전달) — 배고픈 좀비는 항상 또렷하게 뜬 눈
  const alert = o.state === "notice" || o.state === "chase";
  eyes(ctx, 0, -r * 0.2, r, COLORS.zombieEye, !hungry && !alert, hungry || alert);
  if (hungry) {
    // 벌어진 입 — "배고프다"는 표정 신호
    ctx.fillStyle = "#5A3A42";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.08, r * 0.15, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phase: string,
  bob: number,
): void {
  const sway = Math.sin(bob) * 3.4;
  shadow(ctx, x, y + r * 0.9, r * 0.86);
  ctx.save();
  ctx.translate(x + sway * 0.4, y + (phase === "recover" ? -2 : 0));

  // 정장 = 어깨가 각진 사다리꼴
  ctx.fillStyle = COLORS.bossSuit;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.7);
  ctx.lineTo(r * 0.62, -r * 0.7);
  ctx.lineTo(r * 0.95, r * 0.95);
  ctx.lineTo(-r * 0.95, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 머리 (대머리 반짝임)
  ctx.fillStyle = "#F3D9BE";
  ctx.beginPath();
  ctx.arc(0, -r * 0.95, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 1.24, r * 0.16, r * 0.09, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // 넥타이
  ctx.fillStyle = COLORS.bossTie;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(r * 0.17, -r * 0.3);
  ctx.lineTo(0, r * 0.5);
  ctx.lineTo(-r * 0.17, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4단계가 표정으로 읽혀야 한다
  ctx.strokeStyle = "#3A3050";
  ctx.lineWidth = 2;
  if (phase === "speech") {
    // >_< 로 감은 눈
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.1, -r * 1.06);
      ctx.lineTo(sx * r * 0.32, -r * 0.95);
      ctx.lineTo(sx * r * 0.1, -r * 0.84);
      ctx.stroke();
    }
    ctx.fillStyle = "#7A3B4A";
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.68, r * 0.16, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.22, -r * 0.98, r * 0.16, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.zombieEye;
      ctx.beginPath();
      ctx.arc(sx * r * 0.22, -r * 0.98, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (phase === "windup" || phase === "speech") {
    // 마이크
    ctx.fillStyle = "#4A4458";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    roundRect(ctx, r * 0.72, -r * 0.85, r * 0.22, r * 0.6, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.83, -r * 0.92, r * 0.19, 0, Math.PI * 2);
    ctx.fillStyle = "#8E86A8";
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 머리 위 `?` / `!` — 이 게임의 공정성 그 자체 */
export function drawNotice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  kind: "?" | "!",
  progress: number,
  time: number,
): void {
  ctx.save();
  if (kind === "?") {
    const t = Math.min(1, progress / 0.15);
    ctx.globalAlpha = t;
    const size = r * 1.2;
    ctx.translate(x, y - r - 18 + (1 - t) * 8);
    ctx.font = `bold ${size * 1.7}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(150,150,160,0.9)";
    ctx.strokeText("?", 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("?", 0, 0);
  } else {
    // 튕겨 나오듯 0 → 1.3 → 1.0 오버슈트(0.12초, back-ease), 이후 0.5초마다 통통(idle bounce)
    const p = Math.max(0, progress);
    let scale: number;
    if (p < 0.08) {
      const e = p / 0.08;
      scale = 1.3 * (1 - (1 - e) * (1 - e));
    } else if (p < 0.12) {
      const e = (p - 0.08) / 0.04;
      scale = 1.3 - 0.3 * (1 - (1 - e) * (1 - e));
    } else {
      const cyc = time % 500;
      scale = cyc < 160 ? 1 + Math.sin((cyc / 160) * Math.PI) * 0.1 : 1;
    }
    const size = r * 2.0;
    ctx.translate(x, y - r - 18);
    ctx.scale(scale, scale);
    ctx.font = `bold ${size * 1.7}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeText("!", 0, 0);
    ctx.fillStyle = COLORS.alert;
    ctx.fillText("!", 0, 0);
  }
  ctx.restore();
}

/** 하품 말풍선 — 소리를 못 듣는 아이에게도 위치를 알려 준다 */
/** 좀비별로 고정되는 하품 말풍선 문구 (DESIGN §12-A) */
export const YAWN_WORDS = ["하암…", "숙제…", "zzz"];

export function drawYawnBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
  variant = 0,
): void {
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(t * 0.006) * 0.2;
  ctx.fillStyle = "#E8E4F2";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.9, y - r * 1.1, r * 0.62, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7A7392";
  ctx.font = `bold ${r * 0.44}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(YAWN_WORDS[variant % YAWN_WORDS.length], x + r * 0.9, y - r * 1.1);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 배경 사물
// ---------------------------------------------------------------------------

export function drawLockerTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  near: boolean,
): void {
  ctx.fillStyle = "#8FB4C9";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, px + 3, py + 2, TILE - 6, TILE - 4, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(px + TILE / 2, py + 6);
  ctx.lineTo(px + TILE / 2, py + TILE - 8);
  ctx.stroke();
  ctx.fillStyle = "#3B3552";
  ctx.beginPath();
  ctx.arc(px + TILE * 0.38, py + TILE * 0.56, 2.2, 0, Math.PI * 2);
  ctx.arc(px + TILE * 0.62, py + TILE * 0.56, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // 숨을 수 있는 것에만 붙는 연한 청록 테두리
  ctx.strokeStyle = COLORS.lockerTrim;
  ctx.lineWidth = near ? 3 : 2;
  ctx.globalAlpha = near ? 1 : 0.65;
  roundRect(ctx, px + 3, py + 2, TILE - 6, TILE - 4, 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (near) {
    ctx.fillStyle = COLORS.lockerTrim;
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("↓", px + TILE / 2, py - 4);
  }
}

/**
 * **살짝 열린 문** — 지금 상호작용 대상으로 잡힌 사물함 하나에만 그린다 (DESIGN §12-B).
 *
 * 사물함은 스펙상 항상 100% 안전한데(§M2) 그 사실이 화면에 안 적혀 있어서
 * 아이가 숨기를 망설였다. 문틈으로 **따뜻한 크림색 빈 공간**이 보이면
 * "안이 비었다 = 들어가도 된다"가 설명 없이 전달된다.
 * 숨어 있는 상태(`drawLockerOpenOverlay`)와는 다른 그림이다 — 이건 "들어오기 전".
 */
export function drawLockerAjar(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.save();
  // 문이 열린 만큼 드러나는 안쪽 (타일 폭의 약 15%)
  const innerX = px + TILE * 0.5;
  const innerW = TILE * 0.15;
  ctx.fillStyle = "#FFE9B8";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  roundRect(ctx, innerX, py + 5, innerW, TILE - 10, 2);
  ctx.fill();
  ctx.stroke();
  // 안쪽 바닥에 드리운 옅은 그늘 — 비어 있다는 걸 보여 주되 깜깜하지 않게
  ctx.fillStyle = "rgba(120,96,60,0.22)";
  roundRect(ctx, innerX, py + TILE - 13, innerW, 6, 2);
  ctx.fill();
  // 살짝 열린 문짝 (경첩이 오른쪽, 앞으로 조금 나온다)
  ctx.fillStyle = "#9FC2D6";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(px + TILE * 0.65, py + 4);
  ctx.lineTo(px + TILE - 3, py + 2);
  ctx.lineTo(px + TILE - 3, py + TILE - 2);
  ctx.lineTo(px + TILE * 0.65, py + TILE - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * 사물함이 "열려 있음"(플레이어가 그 안에 숨어 있음)을 위에 덧그린다.
 * `drawLockerTile`의 시그니처는 그대로 두고, 렌더러가 점유 여부를 알 때만 겹쳐 그린다.
 * — 문틈이 벌어지고 오른쪽 문짝이 살짝 튀어나와 "닫힘"과 실루엣이 달라진다.
 */
export function drawLockerOpenOverlay(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(18,16,30,0.6)";
  roundRect(ctx, px + TILE * 0.42, py + 3, TILE * 0.2, TILE - 6, 3);
  ctx.fill();
  ctx.fillStyle = "#B7D8E6";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  roundRect(ctx, px + TILE * 0.6, py + 3, TILE * 0.34, TILE - 6, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  stageId: number,
): void {
  const top = stageId === 3 ? "#6B5A46" : stageId === 4 ? "#6FB7D6" : "#D7A96B";
  ctx.fillStyle = top;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, px + 2, py + 3, TILE - 4, TILE - 6, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  roundRect(ctx, px + 5, py + 6, TILE - 10, (TILE - 12) / 2, 3);
  ctx.fill();
}

export function drawPillarTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.fillStyle = "#B9B2CE";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, px + 4, py + 2, TILE - 8, TILE - 4, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  roundRect(ctx, px + 8, py + 6, 6, TILE - 14, 3);
  ctx.fill();
}

export function drawDoorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  locked: boolean,
  uses: number,
): void {
  ctx.fillStyle = locked ? "#9FC4F0" : "#C79A6B";
  ctx.strokeStyle = locked ? "#3C6FB8" : OUT;
  ctx.lineWidth = locked ? 3 : 2;
  roundRect(ctx, px + 2, py + 6, TILE - 4, TILE - 12, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4A4458";
  ctx.beginPath();
  ctx.arc(px + TILE - 10, py + TILE / 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (locked) {
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, px + TILE / 2 - 5, py + TILE / 2 - 3, 10, 9, 2);
    ctx.fill();
    ctx.strokeStyle = "#3C6FB8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2 - 3, 4, Math.PI, 0);
    ctx.stroke();
  }
  // 남은 횟수 점 세 개
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < uses ? "#FFD34D" : "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.arc(px + 9 + i * 7, py + TILE - 9, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawExitTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  open: boolean,
  time: number,
): void {
  ctx.fillStyle = open ? "#9BE8B4" : "#BFC4CF";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px + 3, py + (TILE / 4) * i);
    ctx.lineTo(px + TILE - 3, py + (TILE / 4) * i);
    ctx.stroke();
  }
  if (open) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(time * 0.005) * 0.2;
    ctx.fillStyle = "#5FD98A";
    roundRect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, 3);
    ctx.fill();
    ctx.restore();
  }
}

export function drawBeakerTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  done: boolean,
  time: number,
): void {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 8);
  ctx.lineTo(px + TILE - 12, py + 8);
  ctx.lineTo(px + TILE - 6, py + TILE - 6);
  ctx.lineTo(px + 6, py + TILE - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = done ? "#FF9ED2" : "#B47CFF";
  ctx.beginPath();
  ctx.moveTo(px + 10, py + TILE * 0.55);
  ctx.lineTo(px + TILE - 10, py + TILE * 0.55);
  ctx.lineTo(px + TILE - 6, py + TILE - 6);
  ctx.lineTo(px + 6, py + TILE - 6);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = done ? "#FFC2E2" : "#D3B0FF";
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.002 + i * 0.6) % 1;
    ctx.beginPath();
    ctx.arc(px + 12 + i * 7, py + TILE * 0.5 - t * 22, 3 - t * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBroadcastDoorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ratio: number,
  time: number,
): void {
  ctx.fillStyle = "#6E86C4";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, px + 1, py + 2, TILE - 2, TILE - 4, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ratio >= 1 ? "#9BE8B4" : "#FFD34D";
  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(time * 0.006) * 0.25;
  ctx.beginPath();
  ctx.arc(px + TILE / 2, py + TILE * 0.36, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ON AIR", px + TILE / 2, py + TILE * 0.72);
}

export function drawChalkPileTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, px + 10 + i * 4, py + 20 - i * 3, 16, 5, 2.5);
    ctx.fill();
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// 환풍구 (DESIGN §13-1) — 미발견은 **그냥 배경 소품**이다. 하이라이트를 주지 않는다.
// ---------------------------------------------------------------------------

/** 벽에 붙은 환기 그릴 */
function grille(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#7E8894";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,28,44,0.55)";
  ctx.lineWidth = 1.4;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 3, y - h / 2 + (h / 4) * i);
    ctx.lineTo(x + w / 2 - 3, y - h / 2 + (h / 4) * i);
    ctx.stroke();
  }
}

/**
 * 환풍구 한 쪽. 입구를 가려 주는 소품을 먼저 그리고 그 뒤에 그릴이 보인다.
 * 찾기 전에는 다른 배경 소품과 똑같이 생겼다 — 그게 발견의 재미다.
 */
export function drawVent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  prop: string,
  found: boolean,
  charge: number,
  t: number,
): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT;
  switch (prop) {
    case "hatch": // 급식실 배식구
      ctx.fillStyle = "#C9CDD6";
      roundRect(ctx, x - 15, y - 12, 30, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8E97A6";
      roundRect(ctx, x - 12, y - 9, 24, 8, 2);
      ctx.fill();
      grille(ctx, x, y + 10, 22, 12);
      break;
    case "bed": // 보건실 침대
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, x - 16, y - 10, 32, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#BFD9F2";
      roundRect(ctx, x - 14, y - 2, 28, 10, 3);
      ctx.fill();
      grille(ctx, x, y + 13, 20, 10);
      break;
    case "cleaner": // 청소도구함
      ctx.fillStyle = "#A8B6A0";
      roundRect(ctx, x - 11, y - 15, 22, 30, 3);
      ctx.fill();
      ctx.stroke();
      // **가로 루버(살) 무늬 필수** — 사물함(숨는 곳)과 헷갈리면 안 된다.
      // 청록 하이라이트 테두리는 숨을 수 있는 것에만 쓴다. 여기엔 절대 안 쓴다 (§14-3).
      ctx.strokeStyle = "rgba(40,52,44,0.55)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 11 + i * 5.5);
        ctx.lineTo(x + 8, y - 11 + i * 5.5);
        ctx.stroke();
      }
      ctx.fillStyle = "#3B3552";
      ctx.beginPath();
      ctx.arc(x + 7, y + 10, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "drum": // 큰북
      ctx.fillStyle = "#C9772F";
      roundRect(ctx, x - 13, y - 11, 26, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFF1DC";
      ctx.beginPath();
      ctx.ellipse(x - 8, y, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      grille(ctx, x + 14, y, 10, 18);
      break;
    case "easel": // 이젤
      ctx.strokeStyle = "#9A7A52";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 14);
      ctx.lineTo(x, y - 14);
      ctx.lineTo(x + 9, y + 14);
      ctx.stroke();
      ctx.fillStyle = "#F3EEE2";
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      roundRect(ctx, x - 10, y - 10, 20, 14, 2);
      ctx.fill();
      ctx.stroke();
      grille(ctx, x + 13, y + 6, 10, 14);
      break;
    case "shelf": // 서가
      ctx.fillStyle = "#6B5A46";
      roundRect(ctx, x - 14, y - 14, 28, 28, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#C09A6B";
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 11 + i * 8, y - 10, 5, 9);
      grille(ctx, x, y + 9, 20, 8);
      break;
    case "vault": // 뜀틀
      ctx.fillStyle = "#D7A96B";
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, x - 14 + i, y - 12 + i * 8, 28 - i * 2, 8, 2);
        ctx.fill();
        ctx.stroke();
      }
      grille(ctx, x, y + 15, 18, 8);
      break;
    case "stand": // 스탠드 밑
      ctx.fillStyle = "#B9BFC9";
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, x - 15 + i * 3, y - 14 + i * 9, 30 - i * 6, 9, 2);
        ctx.fill();
        ctx.stroke();
      }
      grille(ctx, x, y + 14, 16, 8);
      break;
    default:
      grille(ctx, x, y, 26, 20);
      break;
  }

  if (found) {
    // 찾은 뒤에는 청록 마름모가 붙는다 — 미니맵 표시와 같은 언어
    ctx.save();
    ctx.translate(x, y - 20);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 0.75 + Math.sin(t * 0.005) * 0.25;
    ctx.fillStyle = COLORS.lockerTrim;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    roundRect(ctx, -4, -4, 8, 8, 1.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (charge > 0) {
    // 0.8초 진입 게이지 — 이 동안 무방비라는 게 이 메커닉의 값이다
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, x - 18, y - 30, 36, 6, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.lockerTrim;
    roundRect(ctx, x - 17, y - 29, 34 * Math.min(1, charge), 4, 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 관 속을 기어가는 연출 (1.2초 + 0.3초 등장) */
export function drawVentCrawl(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  total: number,
): void {
  const p = Math.min(1, t / total);
  // 출구 0.3초 동안 관이 위아래로 열린다
  const open = p < 0.78 ? 1 : 1 - (p - 0.78) / 0.22;
  const lid = h * 0.4 * open;
  ctx.save();
  ctx.fillStyle = "#1B1730";
  ctx.fillRect(0, 0, w, lid);
  ctx.fillRect(0, h - lid, w, lid);

  // 관 안쪽 — 위아래로 좁은 띠만 남는다
  const top = lid;
  const bot = h - lid;
  const band = bot - top;
  if (band > 4) {
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, "#2E2747");
    g.addColorStop(0.5, "#4A4068");
    g.addColorStop(1, "#2E2747");
    ctx.fillStyle = g;
    ctx.fillRect(0, top, w, band);
    // 이음매가 지나간다 = 앞으로 나아가는 느낌
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const x = ((i / 8 + p * 1.8) % 1) * w;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bot);
      ctx.stroke();
    }
    // 먼지
    ctx.fillStyle = "rgba(255,240,200,0.6)";
    for (let i = 0; i < 16; i++) {
      const a = (i * 0.37 + p * 2.2) % 1;
      ctx.globalAlpha = (1 - a) * 0.55;
      ctx.beginPath();
      ctx.arc(
        w - ((i * 0.13 + a) % 1) * w,
        top + band * ((i * 0.17 + 0.1) % 1),
        1.6 + a * 2.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#FFE9B8";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("스르륵…", w / 2, top + band / 2 + 5);
  }
  ctx.restore();
}

/** 친구 특기 아이콘 — 종이(준호) / 분필(다온) / 마이크(세은) / 시계(하늘) */
export function drawFriendPowerIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  who: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  switch (who) {
    case 0: // 하늘 — 시계(유예 시간)
      ctx.fillStyle = "#FFF3C4";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 0.2);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.16, 0.04);
      ctx.stroke();
      break;
    case 1: // 다온 — 분필
      ctx.rotate(-0.6);
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, -s * 0.32, -s * 0.11, s * 0.64, s * 0.22, s * 0.1);
      ctx.fill();
      ctx.stroke();
      break;
    case 2: // 준호 — 급식표 종이
      ctx.fillStyle = COLORS.menuPaper;
      roundRect(ctx, -s * 0.26, -s * 0.32, s * 0.52, s * 0.64, 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, -s * 0.16 + i * s * 0.16);
        ctx.lineTo(s * 0.16, -s * 0.16 + i * s * 0.16);
        ctx.stroke();
      }
      break;
    default: // 세은 — 마이크
      ctx.fillStyle = "#8E86A8";
      roundRect(ctx, -s * 0.11, -s * 0.34, s * 0.22, s * 0.42, s * 0.11);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.08);
      ctx.lineTo(0, s * 0.3);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 물건 (재료 · 급식표 · 분필 · 알람)
// ---------------------------------------------------------------------------

/** 재료는 타일의 60% 이하 크기 + 글로우가 밖으로 삐져나온다 */
export function drawIngredient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  index: number,
  time: number,
  size = TILE * 0.55,
): void {
  const pulse = 1 + Math.sin(time * 0.005) * 0.08;
  const color = INGREDIENTS[index].color;
  // 따뜻한 노란 반짝임 (손전등의 차가운 흰노랑과 구분)
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
  g.addColorStop(0, "rgba(255,224,138,0.55)");
  g.addColorStop(1, "rgba(255,224,138,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = OUT;
  // 30px 이하로 줄어도(하단 HUD 줄 + 흑백 처리) 형태 하나로 읽히도록
  // 잔 디테일을 줄이고 굵은 윤곽선 + 큼직한 덩어리 하나를 우선한다.
  ctx.lineWidth = 2.4;
  const s = size / 2;
  switch (index) {
    case 0: // 비타민 — 대각선 두 톤 알약 캡슐 (가장 흔한 "약" 픽토그램)
      ctx.save();
      ctx.rotate(0.55);
      roundRect(ctx, -s * 0.95, -s * 0.5, s * 1.9, s, s * 0.5);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.95, -s * 0.5, s * 0.95, s);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, -s * 0.5, s * 0.95, s);
      ctx.restore();
      roundRect(ctx, -s * 0.95, -s * 0.5, s * 1.9, s, s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, s * 0.5);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      break;
    case 1: // 고추장 — 뚜껑 있는 통 (실루엣 하나로 "병"이 읽힌다)
      ctx.fillStyle = "#FFE08A";
      roundRect(ctx, -s * 0.7, -s * 0.65, s * 1.4, s * 0.42, s * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      roundRect(ctx, -s * 0.62, -s * 0.28, s * 1.24, s * 1.15, s * 0.22);
      ctx.fill();
      ctx.stroke();
      break;
    case 2: // 분필 — 짧고 도톰한 막대 + 부러진 자국
      ctx.save();
      ctx.rotate(-0.5);
      ctx.fillStyle = color;
      roundRect(ctx, -s * 0.95, -s * 0.34, s * 1.9, s * 0.68, s * 0.28);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.34);
      ctx.lineTo(-s * 0.15, s * 0.34);
      ctx.stroke();
      ctx.restore();
      break;
    case 3: // 알람시계 — 흰 시계판이 색 테두리와 대비돼 바늘이 항상 또렷하다
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * s * 0.64, -s * 0.8, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 0.46);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.32, 0);
      ctx.stroke();
      break;
    case 4: // 큰북 — 흰 북면 + 교차한 스틱으로 "드럼"이 즉시 읽힌다
      ctx.fillStyle = color;
      roundRect(ctx, -s * 0.85, -s * 0.55, s * 1.7, s * 1.15, s * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFF1DC";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.55, s * 0.85, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.17;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 1.05);
      ctx.lineTo(s * 0.25, -s * 0.4);
      ctx.moveTo(s * 0.55, -s * 1.05);
      ctx.lineTo(-s * 0.25, -s * 0.4);
      ctx.stroke();
      ctx.lineCap = "butt";
      break;
    case 5: // 웃긴 책 — 책 실루엣 + 큰 웃는 표정으로 "웃기다"까지 전달
      ctx.fillStyle = color;
      roundRect(ctx, -s * 0.8, -s * 0.95, s * 1.6, s * 1.9, s * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(ctx, -s * 0.8, -s * 0.95, s * 0.22, s * 1.9, s * 0.1);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * s * 0.3, -s * 0.25, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.42, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      break;
    case 6: // 응원 나팔 — 확성기 꼴 + 흰 테두리 종 모양 입구
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.78, -s * 0.28);
      ctx.lineTo(-s * 0.78, s * 0.28);
      ctx.lineTo(s * 0.5, s * 0.85);
      ctx.lineTo(s * 0.5, -s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(s * 0.5, 0, s * 0.15, s * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    default: // 물호스 — 코일 + 노즐로 "호스"가 형태만으로 읽힌다
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.42;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.58, 0.5, Math.PI * 1.85);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.58, 0.5, Math.PI * 1.85);
      ctx.stroke();
      {
        const nx = Math.cos(0.5) * s * 0.58;
        const ny = Math.sin(0.5) * s * 0.58;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(0.5 - Math.PI / 2);
        ctx.fillStyle = "#4A4458";
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.6;
        roundRect(ctx, -s * 0.16, -s * 0.06, s * 0.32, s * 0.4, s * 0.1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
  }
  // 흰 하이라이트 점 — 30px에서도 "반짝인다"가 남도록 살짝 키움
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-s * 0.35, -s * 0.45, s * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 급식표 조각 — 10개 전부 똑같은 연노랑 접힌 종이 */
export function drawMenuPiece(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  size = TILE * 0.5,
): void {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.004) * 1.5);
  ctx.fillStyle = COLORS.menuPaper;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-s, -s * 1.2);
  ctx.lineTo(s * 0.5, -s * 1.2);
  ctx.lineTo(s, -s * 0.7);
  ctx.lineTo(s, s * 1.2);
  ctx.lineTo(-s, s * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.beginPath();
  ctx.moveTo(s * 0.5, -s * 1.2);
  ctx.lineTo(s, -s * 0.7);
  ctx.lineTo(s * 0.5, -s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.3 + i * s * 0.5);
    ctx.lineTo(s * 0.6, -s * 0.3 + i * s * 0.5);
    ctx.stroke();
  }
  // 반짝임 별 4개
  ctx.fillStyle = "#FFFFFF";
  for (let i = 0; i < 4; i++) {
    const a = time * 0.002 + (i * Math.PI) / 2;
    const rr = s * 1.6;
    star(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 2.4, a * 2);
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.32, Math.sin(a + Math.PI / 4) * r * 0.32);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawFlyingChalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spin: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  roundRect(ctx, -7, -2.5, 14, 5, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawAlarmOnGround(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ringing: boolean,
  time: number,
): void {
  const shake = ringing ? Math.sin(time * 0.04) * 2 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.fillStyle = "#FFC93C";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * 7, -8, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -5);
  ctx.moveTo(0, 0);
  ctx.lineTo(4, 1);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 버튼 아이콘 — 이모지를 절대 쓰지 않는다 (기기마다 다르게 보이고 색도 못 바꾼다)
// ---------------------------------------------------------------------------

export function drawHandIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#FFE1C4";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, -s * 0.42, -s * 0.1, s * 0.84, s * 0.72, s * 0.26);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    roundRect(ctx, -s * 0.4 + i * s * 0.21, -s * 0.6 + Math.abs(i - 1.5) * s * 0.08, s * 0.17, s * 0.6, s * 0.08);
    ctx.fill();
    ctx.stroke();
  }
  roundRect(ctx, -s * 0.62, -s * 0.05, s * 0.3, s * 0.18, s * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawChalkIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, -s * 0.42, -s * 0.13, s * 0.84, s * 0.26, s * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + s * 0.4 + i * s * 0.12, y - s * 0.34 - i * s * 0.1, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawAlarmIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y + s * 0.06);
  ctx.fillStyle = "#FFC93C";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * s * 0.3, -s * 0.34, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 0.2);
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.16, s * 0.04);
  ctx.stroke();
  ctx.restore();
}

export function drawTorchIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#7FD4FF";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, -s * 0.5, -s * 0.16, s * 0.44, s * 0.32, s * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.torch;
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.16);
  ctx.lineTo(s * 0.5, -s * 0.4);
  ctx.lineTo(s * 0.5, s * 0.4);
  ctx.lineTo(-s * 0.06, s * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawMapIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#FFF3C4";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  roundRect(ctx, -s * 0.45, -s * 0.35, s * 0.9, s * 0.7, s * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#B46A3A";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.2);
  ctx.quadraticCurveTo(0, -s * 0.1, s * 0.28, -s * 0.2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawPauseIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, x - s * 0.26, y - s * 0.3, s * 0.18, s * 0.6, 2);
  ctx.fill();
  roundRect(ctx, x + s * 0.08, y - s * 0.3, s * 0.18, s * 0.6, 2);
  ctx.fill();
}

export function drawSoundIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  on: boolean,
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.14);
  ctx.lineTo(x - s * 0.12, y - s * 0.14);
  ctx.lineTo(x + s * 0.06, y - s * 0.34);
  ctx.lineTo(x + s * 0.06, y + s * 0.34);
  ctx.lineTo(x - s * 0.12, y + s * 0.14);
  ctx.lineTo(x - s * 0.3, y + s * 0.14);
  ctx.closePath();
  ctx.fill();
  if (on) {
    ctx.beginPath();
    ctx.arc(x + s * 0.1, y, s * 0.24, -0.9, 0.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y - s * 0.18);
    ctx.lineTo(x + s * 0.42, y + s * 0.18);
    ctx.moveTo(x + s * 0.42, y - s * 0.18);
    ctx.lineTo(x + s * 0.16, y + s * 0.18);
    ctx.stroke();
  }
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  filled: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? "#FFD34D" : "rgba(255,255,255,0.16)";
  ctx.fill();
  ctx.strokeStyle = filled ? "#C79A1E" : "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export { roundRect };
