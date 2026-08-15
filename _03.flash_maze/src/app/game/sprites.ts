import { COLORS } from "./constants";

/** Everything here is drawn with canvas primitives — no image assets. */

export function drawPrincess(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  t: number,
): void {
  const bob = Math.sin(t / 320) * size * 0.04;
  const y = cy + bob;

  ctx.save();

  // Soft glow so she stays findable in the dark.
  const glow = ctx.createRadialGradient(cx, y, 0, cx, y, size * 1.5);
  glow.addColorStop(0, "rgba(255, 143, 186, 0.45)");
  glow.addColorStop(1, "rgba(255, 143, 186, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, y, size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Dress
  const dressTop = y - size * 0.05;
  const dressBottom = y + size * 0.52;
  const grad = ctx.createLinearGradient(0, dressTop, 0, dressBottom);
  grad.addColorStop(0, COLORS.dress);
  grad.addColorStop(1, COLORS.dressDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, dressTop);
  ctx.quadraticCurveTo(
    cx - size * 0.5,
    y + size * 0.36,
    cx - size * 0.42,
    dressBottom,
  );
  ctx.lineTo(cx + size * 0.42, dressBottom);
  ctx.quadraticCurveTo(cx + size * 0.5, y + size * 0.36, cx, dressTop);
  ctx.closePath();
  ctx.fill();

  // Head
  const headR = size * 0.24;
  const headY = y - size * 0.3;
  ctx.fillStyle = COLORS.hair;
  ctx.beginPath();
  ctx.arc(cx, headY, headR * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(cx, headY + headR * 0.08, headR, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#3d2b3d";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.36, headY + headR * 0.06, headR * 0.13, 0, Math.PI * 2);
  ctx.arc(cx + headR * 0.36, headY + headR * 0.06, headR * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Crown
  ctx.fillStyle = COLORS.crown;
  const crownY = headY - headR * 1.02;
  const cw = headR * 0.95;
  ctx.beginPath();
  ctx.moveTo(cx - cw, crownY);
  ctx.lineTo(cx - cw * 0.5, crownY - headR * 0.5);
  ctx.lineTo(cx, crownY - headR * 0.08);
  ctx.lineTo(cx + cw * 0.5, crownY - headR * 0.5);
  ctx.lineTo(cx + cw, crownY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawExitDoor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  t: number,
  bright: boolean,
): void {
  const pulse = 0.65 + Math.sin(t / 380) * 0.35;
  const alpha = bright ? 1 : 0.42;

  ctx.save();
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.35);
  glow.addColorStop(0, `rgba(255, 209, 102, ${0.5 * pulse})`);
  glow.addColorStop(1, "rgba(255, 209, 102, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.35, 0, Math.PI * 2);
  ctx.fill();

  // Archway
  const w = size * 0.62;
  const h = size * 0.82;
  ctx.fillStyle = COLORS.exit;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy - h * 0.1);
  ctx.arc(cx, cy - h * 0.1, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, cy + h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 243, 196, 0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.12, w * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles
  ctx.fillStyle = COLORS.exitGlow;
  for (let i = 0; i < 3; i++) {
    const a = t / 700 + (i * Math.PI * 2) / 3;
    const rr = size * 0.72;
    const sx = cx + Math.cos(a) * rr;
    const sy = cy + Math.sin(a) * rr * 0.7;
    const s = size * 0.055 * (0.6 + 0.4 * Math.sin(t / 200 + i));
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.4, sy);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s * 0.4, sy);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawStartMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  ctx.save();
  ctx.strokeStyle = COLORS.start;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.setLineDash([size * 0.14, size * 0.1]);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
