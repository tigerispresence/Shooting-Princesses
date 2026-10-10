/**
 * Canvas-drawn sprites. Every function draws centred on (0,0) at the current
 * transform, so callers translate to the entity position first. Plain Canvas
 * 2D only — no image files. A graphic-designer pass can restyle any of these
 * without touching game logic.
 */
import { CANDY_COLORS, GOLD, PROFILE_COLORS, type CandyShape } from "./constants";

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function starPath(ctx: Ctx, r: number, inner = 0.48, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function heartPath(ctx: Ctx, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.85, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.25, 0, s * 0.35);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Animal faces (§12.1): 토끼 고양이 강아지 곰 펭귄 다람쥐
// ---------------------------------------------------------------------------

const ANIMAL_FUR = ["#FFFFFF", "#FFD9A8", "#E8C39E", "#C99A6B", "#3E4A61", "#D99A5B"];

export function drawAnimal(ctx: Ctx, kind: number, size: number, tint?: string, blink = false) {
  const r = size / 2;
  const fur = ANIMAL_FUR[kind] ?? "#fff";
  ctx.save();
  ctx.lineWidth = Math.max(1.5, size / 30);
  ctx.strokeStyle = "#5b4636";
  // ears
  ctx.fillStyle = fur;
  if (kind === 0) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.35, -r * 0.95, r * 0.2, r * 0.5, s * 0.15, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * r * 0.35, -r * 0.95, r * 0.09, r * 0.35, s * 0.15, 0, TAU);
      ctx.fillStyle = "#FFC2D1";
      ctx.fill();
      ctx.fillStyle = fur;
    }
  } else if (kind === 1 || kind === 5) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.75, -r * 0.35);
      ctx.lineTo(s * r * 0.55, -r * 1.0);
      ctx.lineTo(s * r * 0.15, -r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 2) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.78, -r * 0.15, r * 0.24, r * 0.5, s * -0.3, 0, TAU);
      ctx.fillStyle = "#B98A5E";
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = fur;
  } else if (kind === 3) {
    for (const s of [-1, 1]) {
      circle(ctx, s * r * 0.62, -r * 0.62, r * 0.26, fur);
      ctx.stroke();
      circle(ctx, s * r * 0.62, -r * 0.62, r * 0.12, "#E8B88A");
    }
  }
  // head
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();
  if (kind === 4) {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.6, r * 0.55, 0, 0, TAU);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
  }
  if (kind === 5) {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.45, r * 0.35, 0, 0, TAU);
    ctx.fillStyle = "#FBE3C4";
    ctx.fill();
  }
  if (kind === 2 || kind === 3) {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 0.32, r * 0.24, 0, 0, TAU);
    ctx.fillStyle = "#F7E2C8";
    ctx.fill();
  }
  // eyes
  const ey = -r * 0.08;
  for (const s of [-1, 1]) {
    if (blink) {
      ctx.beginPath();
      ctx.arc(s * r * 0.3, ey, r * 0.1, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = "#2b2b38";
      ctx.stroke();
    } else {
      circle(ctx, s * r * 0.3, ey, r * 0.1, "#2b2b38");
      circle(ctx, s * r * 0.3 + r * 0.035, ey - r * 0.04, r * 0.035, "#fff");
    }
  }
  // cheeks
  ctx.globalAlpha = 0.55;
  for (const s of [-1, 1]) circle(ctx, s * r * 0.5, r * 0.2, r * 0.11, tint ?? "#FF9FBF");
  ctx.globalAlpha = 1;
  // nose + mouth
  if (kind === 4) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, r * 0.08);
    ctx.lineTo(r * 0.12, r * 0.08);
    ctx.lineTo(0, r * 0.24);
    ctx.closePath();
    ctx.fillStyle = "#FFB347";
    ctx.fill();
  } else {
    circle(ctx, 0, r * 0.14, r * 0.07, "#5b4636");
    ctx.beginPath();
    ctx.strokeStyle = "#5b4636";
    ctx.arc(-r * 0.08, r * 0.2, r * 0.08, 0, Math.PI);
    ctx.arc(r * 0.08, r * 0.2, r * 0.08, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Umbrellas (§12.4)
// ---------------------------------------------------------------------------

const UMB_COLORS = ["#FF8FB8", "#7CC8FF", "#FFE066", "#9EF0D0", "#B79CFF", "#FF8FB8", "#FF6F91", "", "#FFD43B"];

export function drawUmbrella(ctx: Ctx, style: number, w: number, open = 1, t = 0) {
  const r = w / 2;
  const h = r * (0.55 + 0.25 * open);
  ctx.save();
  // handle
  ctx.strokeStyle = "#8a6a4f";
  ctx.lineWidth = Math.max(2, w / 30);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, r * 0.95);
  ctx.arc(-r * 0.12, r * 0.95, r * 0.12, 0, Math.PI);
  ctx.stroke();
  // canopy
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(-r, -h * 1.25, 0, -h * 1.25);
  ctx.quadraticCurveTo(r, -h * 1.25, r, 0);
  for (let i = 4; i > 0; i--) {
    const x1 = -r + ((i - 1) * 2 * r) / 4;
    const x0 = -r + (i * 2 * r) / 4;
    ctx.quadraticCurveTo((x0 + x1) / 2, -h * 0.25, x1, 0);
  }
  ctx.closePath();
  if (style === 7) {
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF", "#C9B6FF"].forEach((c, i) => g.addColorStop(i / 5, c));
    ctx.fillStyle = g;
  } else if (style === 8) {
    const g = ctx.createLinearGradient(0, -h * 1.25, 0, 0);
    g.addColorStop(0, "#FFF3B0");
    g.addColorStop(0.5, "#FFD43B");
    g.addColorStop(1, "#E9A800");
    ctx.fillStyle = g;
  } else ctx.fillStyle = UMB_COLORS[style] ?? UMB_COLORS[0];
  ctx.fill();
  ctx.strokeStyle = "rgba(90,60,80,0.55)";
  ctx.lineWidth = Math.max(1.5, w / 45);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  if (style === 5) {
    for (let x = -r; x < r; x += r * 0.35)
      for (let y = -h * 1.2; y < 0; y += r * 0.3) circle(ctx, x + ((y / (r * 0.3)) % 2) * r * 0.17, y, r * 0.07, "#fff");
  }
  if (style === 6) {
    for (let x = -r * 0.8; x < r; x += r * 0.42)
      for (let y = -h * 1.05; y < 0; y += r * 0.36) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.07, r * 0.09, 0, 0, TAU);
        ctx.fillStyle = "#fff0f3";
        ctx.fill();
        circle(ctx, 0, -r * 0.08, r * 0.04, "#8EE6A0");
        ctx.restore();
      }
  }
  if (style === 8) {
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-r * 0.5 + i * r * 0.5, -h * 0.65 + Math.sin(t * 3 + i) * 3);
      starPath(ctx, r * 0.08);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // ribs
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  for (const x of [-r * 0.5, 0, r * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(0, -h * 1.25);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, 0, -h * 1.27, Math.max(2, w / 28), "#8a6a4f");
  ctx.restore();
}

/** Profile animal holding its umbrella, centred on the animal's head. */
export function drawUmbrellaBuddy(ctx: Ctx, animal: number, umbrella: number, w: number, open = 1, t = 0) {
  ctx.save();
  ctx.translate(0, -w * 0.25);
  drawUmbrella(ctx, umbrella, w, open, t);
  ctx.restore();
  ctx.save();
  ctx.translate(0, w * 0.32);
  drawAnimal(ctx, animal, w * 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Cookie houses (§11.1, §12.4) — origin at the house's bottom centre
// ---------------------------------------------------------------------------

const HOUSE_WALL = ["#D9965A", "#C68A55", "#F3D9B1", "#FFE3EC"];
const HOUSE_ROOF = ["#A0622D", "#5C3A21", "#B9A6FF", "#FF9FC0"];

export function drawHouse(
  ctx: Ctx,
  style: number,
  w: number,
  opts: { sticky?: boolean; face?: "smile" | "yuck" | "laugh" | "wow"; night?: boolean; t?: number } = {},
) {
  const h = w * 0.62;
  const t = opts.t ?? 0;
  ctx.save();
  const wall = HOUSE_WALL[style] ?? HOUSE_WALL[0];
  const roof = HOUSE_ROOF[style] ?? HOUSE_ROOF[0];
  // walls
  roundRect(ctx, -w * 0.42, -h, w * 0.84, h, 8);
  ctx.fillStyle = wall;
  ctx.fill();
  ctx.strokeStyle = "rgba(90,50,30,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (style === 1) {
    for (const [x, y] of [[-0.25, -0.75], [0.28, -0.3], [-0.3, -0.2], [0.2, -0.8]])
      circle(ctx, x * w, y * h, w * 0.035, "#4A2C17");
  }
  if (style === 3) {
    // cake layers
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-w * 0.42, -h * 0.5, w * 0.84, h * 0.08);
    for (let i = 0; i < 6; i++) circle(ctx, -w * 0.35 + i * w * 0.14, -h * 0.46, w * 0.04, "#FF6F91");
  }
  // roof
  ctx.beginPath();
  if (style === 2) {
    // macaron roof
    roundRect(ctx, -w * 0.5, -h - w * 0.28, w, w * 0.15, w * 0.07);
    ctx.fillStyle = roof;
    ctx.fill();
    ctx.fillStyle = "#FFF6E0";
    ctx.fillRect(-w * 0.47, -h - w * 0.13, w * 0.94, w * 0.04);
    roundRect(ctx, -w * 0.5, -h - w * 0.1, w, w * 0.12, w * 0.06);
    ctx.fillStyle = roof;
    ctx.fill();
  } else if (style === 3) {
    // castle towers
    for (const s of [-1, 1]) {
      ctx.fillStyle = wall;
      ctx.fillRect(s * w * 0.42 - w * 0.08, -h - w * 0.18, w * 0.16, w * 0.2);
      ctx.beginPath();
      ctx.moveTo(s * w * 0.42 - w * 0.11, -h - w * 0.18);
      ctx.lineTo(s * w * 0.42, -h - w * 0.4);
      ctx.lineTo(s * w * 0.42 + w * 0.11, -h - w * 0.18);
      ctx.closePath();
      ctx.fillStyle = roof;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h);
    ctx.lineTo(0, -h - w * 0.36);
    ctx.lineTo(w * 0.34, -h);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    circle(ctx, 0, -h - w * 0.4, w * 0.05, "#FF6F91");
  } else {
    ctx.moveTo(-w * 0.52, -h + 4);
    ctx.lineTo(0, -h - w * 0.34);
    ctx.lineTo(w * 0.52, -h + 4);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();
    // icing
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = -w * 0.48 + (i * w * 0.96) / 8;
      const y = -h + 2 + (i % 2 === 0 ? 0 : 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // window
  const lit = opts.night;
  roundRect(ctx, w * 0.12, -h * 0.82, w * 0.2, w * 0.18, 4);
  ctx.fillStyle = lit ? "#FFE9A8" : "#BFE7FF";
  ctx.fill();
  // door
  roundRect(ctx, -w * 0.32, -h * 0.55, w * 0.22, h * 0.55, w * 0.1);
  ctx.fillStyle = "#8A5A3B";
  ctx.fill();
  // face on the wall
  const face = opts.face ?? (opts.sticky ? "yuck" : "smile");
  const fx = w * 0.18;
  const fy = -h * 0.32;
  ctx.strokeStyle = "#4A2C17";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  if (face === "yuck") {
    // squeezed > < eyes, wavy mouth — a funny grimace, not sad
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(fx + s * w * 0.09 - s * 4, fy - 5);
      ctx.lineTo(fx + s * w * 0.09 + s * 2, fy - 1);
      ctx.lineTo(fx + s * w * 0.09 - s * 4, fy + 3);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(fx - 9 + i * 4.5, fy + 10 + (i % 2 ? -2.5 : 2.5));
    ctx.stroke();
  } else {
    for (const s of [-1, 1]) {
      if (face === "laugh") {
        ctx.beginPath();
        ctx.arc(fx + s * w * 0.09, fy - 1, 3.5, Math.PI, 0);
        ctx.stroke();
      } else circle(ctx, fx + s * w * 0.09, fy - 2, 3, "#4A2C17");
    }
    ctx.beginPath();
    if (face === "wow") ctx.arc(fx, fy + 9, 4, 0, TAU);
    else ctx.arc(fx, fy + 5, face === "laugh" ? 7 : 5, 0.15 * Math.PI, 0.85 * Math.PI);
    if (face === "laugh") {
      ctx.fillStyle = "#FF8FA8";
      ctx.fill();
    }
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    circle(ctx, fx - w * 0.15, fy + 5, 4, "#FF8FB8");
    circle(ctx, fx + w * 0.15, fy + 5, 4, "#FF8FB8");
    ctx.globalAlpha = 1;
  }
  // syrup when sticky
  if (opts.sticky) {
    ctx.fillStyle = "rgba(255,120,180,0.85)";
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h - 2);
    ctx.quadraticCurveTo(0, -h - w * 0.42, w * 0.5, -h - 2);
    for (let i = 6; i >= 0; i--) {
      const x = -w * 0.5 + (i * w) / 6;
      const drip = (i % 2 ? 22 : 10) + Math.sin(t * 2 + i) * 3;
      ctx.lineTo(x, -h + drip);
      ctx.lineTo(x - w / 12, -h + 2);
    }
    ctx.closePath();
    ctx.fill();
    circle(ctx, -w * 0.2, -h - w * 0.15, 4, "rgba(255,255,255,0.7)");
    circle(ctx, w * 0.25, -h + 18, 3, "#8FD3FF");
    circle(ctx, -w * 0.05, -h + 14, 3, "#C9B6FF");
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Candies (§11.3) — drawn at ~size px, centred
// ---------------------------------------------------------------------------

export function drawCandy(ctx: Ctx, shape: CandyShape | "star", color: string, size: number, t = 0) {
  const r = size / 2;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(80,60,90,0.35)";
  if (shape === "star") {
    ctx.save();
    ctx.rotate(Math.sin(t * 2) * 0.15);
    starPath(ctx, r * 1.1);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.strokeStyle = "#E0A800";
    ctx.stroke();
    ctx.restore();
    // eyes
    circle(ctx, -r * 0.22, -r * 0.05, r * 0.09, "#6b4a00");
    circle(ctx, r * 0.22, -r * 0.05, r * 0.09, "#6b4a00");
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.14, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = "#6b4a00";
    ctx.stroke();
    // orbiting sparkles
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + (i * TAU) / 4;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.2);
      starPath(ctx, 4, 0.4, 4);
      ctx.fillStyle = "#FFF6C8";
      ctx.fill();
      ctx.restore();
    }
  } else if (shape === "ball") {
    circle(ctx, 0, 0, r * 0.8, color);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, -2.2, -0.6);
    ctx.stroke();
    circle(ctx, -r * 0.3, -r * 0.3, r * 0.14, "rgba(255,255,255,0.8)");
  } else if (shape === "lolli") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(-2, r * 0.3, 4, r * 0.9);
    circle(ctx, 0, -r * 0.1, r * 0.7, color);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let a = 0; a < TAU * 2; a += 0.3) {
      const rr = (a / (TAU * 2)) * r * 0.6;
      ctx.lineTo(Math.cos(a) * rr, -r * 0.1 + Math.sin(a) * rr);
    }
    ctx.stroke();
  } else if (shape === "bear") {
    circle(ctx, -r * 0.45, -r * 0.55, r * 0.25, color);
    circle(ctx, r * 0.45, -r * 0.55, r * 0.25, color);
    circle(ctx, 0, -r * 0.2, r * 0.5, color);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.5, r * 0.45, 0, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.35;
    circle(ctx, -r * 0.2, -r * 0.4, r * 0.14, "#fff");
    ctx.globalAlpha = 1;
    circle(ctx, -r * 0.18, -r * 0.25, r * 0.07, "#4a3a5a");
    circle(ctx, r * 0.18, -r * 0.25, r * 0.07, "#4a3a5a");
  } else {
    // caramel with ribbon wrap
    ctx.fillStyle = color;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.45, 0);
      ctx.lineTo(s * r * 1.0, -r * 0.4);
      ctx.lineTo(s * r * 1.0, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    roundRect(ctx, -r * 0.55, -r * 0.42, r * 1.1, r * 0.84, r * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(-r * 0.1, -r * 0.42, r * 0.2, r * 0.84);
  }
  ctx.restore();
}

export const candyColor = (i: number) => CANDY_COLORS[i % CANDY_COLORS.length];

// ---------------------------------------------------------------------------
// 뿌뿌 — cotton-candy cloud with a cold
// ---------------------------------------------------------------------------

export function drawPpu(
  ctx: Ctx,
  w: number,
  opts: { sneeze?: number; heart?: boolean; happy?: boolean; sorry?: boolean; healthy?: boolean; t?: number } = {},
) {
  const t = opts.t ?? 0;
  const s = 1 + (opts.sneeze ?? 0) * 0.12;
  ctx.save();
  ctx.scale(s, 1 / s);
  const puffs: [number, number, number][] = [
    [-0.33, 0.05, 0.22], [-0.15, -0.12, 0.26], [0.1, -0.15, 0.27], [0.3, 0.0, 0.22], [0, 0.08, 0.3], [-0.38, 0.12, 0.16], [0.4, 0.12, 0.16],
  ];
  const g = ctx.createLinearGradient(0, -w * 0.3, 0, w * 0.25);
  g.addColorStop(0, "#FFE4F1");
  g.addColorStop(1, "#E7D4FF");
  for (const [x, y, r] of puffs) {
    ctx.beginPath();
    ctx.arc(x * w, y * w + Math.sin(t * 1.5 + x * 5) * 1.5, r * w, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // face
  const ey = -w * 0.02;
  ctx.strokeStyle = "#5b4a6b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const sx of [-1, 1]) {
    const ex = sx * w * 0.1;
    if (opts.heart) {
      ctx.save();
      ctx.translate(ex, ey);
      heartPath(ctx, 14);
      ctx.fillStyle = "#FF6F91";
      ctx.fill();
      ctx.restore();
    } else if ((opts.sneeze ?? 0) > 0 || opts.happy) {
      ctx.beginPath();
      ctx.arc(ex, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      circle(ctx, ex, ey, 5, "#5b4a6b");
      circle(ctx, ex + 1.5, ey - 1.5, 1.6, "#fff");
    }
  }
  // nose (red when sick)
  circle(ctx, 0, ey + 10, 5, opts.healthy ? "#FFB3D1" : "#FF8C8C");
  ctx.beginPath();
  if ((opts.sneeze ?? 0) > 0) ctx.ellipse(0, ey + 24, 7, 8, 0, 0, TAU);
  else if (opts.sorry) ctx.arc(0, ey + 26, 6, 1.15 * Math.PI, 1.85 * Math.PI);
  else ctx.arc(0, ey + 18, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  circle(ctx, -w * 0.18, ey + 12, 7, "#FF9FBF");
  circle(ctx, w * 0.18, ey + 12, 7, "#FF9FBF");
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Misc small art
// ---------------------------------------------------------------------------

export function drawSmiley(ctx: Ctx, size: number) {
  const r = size / 2;
  circle(ctx, 0, 0, r * 0.9, "#FFE066");
  ctx.strokeStyle = "#B08900";
  ctx.lineWidth = Math.max(2, size / 24);
  ctx.stroke();
  circle(ctx, -r * 0.3, -r * 0.2, r * 0.1, "#5b4636");
  circle(ctx, r * 0.3, -r * 0.2, r * 0.1, "#5b4636");
  ctx.beginPath();
  ctx.arc(0, r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = "#5b4636";
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  circle(ctx, -r * 0.55, r * 0.2, r * 0.12, "#FF8FB8");
  circle(ctx, r * 0.55, r * 0.2, r * 0.12, "#FF8FB8");
  ctx.globalAlpha = 1;
}

export function drawSpeaker(ctx: Ctx, size: number, on: boolean) {
  const s = size / 24;
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = "#6b4f7a";
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.lineTo(-4, -4);
  ctx.lineTo(2, -9);
  ctx.lineTo(2, 9);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6b4f7a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  if (on) {
    ctx.beginPath();
    ctx.arc(3, 0, 5, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(3, 0, 9, -0.9, 0.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(12, 4);
    ctx.moveTo(12, -4);
    ctx.lineTo(6, 4);
    ctx.stroke();
  }
  ctx.restore();
}

/** Candy jar, `fill` 0..1. Origin at centre. */
export function drawJar(ctx: Ctx, size: number, fill: number, t = 0) {
  const w = size * 0.7;
  const h = size * 0.8;
  ctx.save();
  // lid
  roundRect(ctx, -w * 0.4, -h / 2 - size * 0.08, w * 0.8, size * 0.12, 4);
  ctx.fillStyle = "#FF8FB8";
  ctx.fill();
  // glass
  roundRect(ctx, -w / 2, -h / 2 + size * 0.04, w, h, w * 0.25);
  ctx.fillStyle = "rgba(220,240,255,0.55)";
  ctx.fill();
  ctx.save();
  ctx.clip();
  const f = Math.max(0, Math.min(1, fill));
  const top = h / 2 + size * 0.04 - h * f;
  for (let i = 0; i < 40; i++) {
    const x = -w / 2 + ((i * 37) % 100) / 100 * w;
    const y = h / 2 + size * 0.04 - ((i * 53) % 100) / 100 * h;
    if (y < top) continue;
    circle(ctx, x, y, size * 0.07, CANDY_COLORS[i % 4]);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(90,110,140,0.6)";
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h / 2 + size * 0.04, w, h, w * 0.25);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h * 0.2);
  ctx.lineTo(-w * 0.3, h * 0.15 + Math.sin(t) * 0.01);
  ctx.stroke();
  ctx.restore();
}

const STICKER_BG = ["#FFD1E3", "#FFE3C2", "#FFF4B8", "#D4F7DC", "#D3ECFF", "#E8DEFF"];

/** Round sticker. `motif` picks the little picture. */
export function drawSticker(ctx: Ctx, id: number, size: number, earned: boolean, hidden = false) {
  const r = size / 2;
  ctx.save();
  circle(ctx, 0, 0, r, earned ? "#fff" : "#E6E1EA");
  circle(ctx, 0, 0, r * 0.86, earned ? STICKER_BG[id % 6] : "#D5D0DA");
  if (hidden && !earned) {
    ctx.fillStyle = "#9d94a8";
    ctx.font = `bold ${r}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, r * 0.05);
    ctx.restore();
    return;
  }
  ctx.globalAlpha = earned ? 1 : 0.35;
  const motif = STICKER_MOTIF[id] ?? "star";
  const col = earned ? undefined : "#8f8799";
  ctx.save();
  switch (motif) {
    case "paw":
      circle(ctx, 0, r * 0.15, r * 0.3, col ?? "#C99A6B");
      for (let i = 0; i < 4; i++) circle(ctx, (i - 1.5) * r * 0.24, -r * 0.28 - (i === 1 || i === 2 ? r * 0.1 : 0), r * 0.12, col ?? "#C99A6B");
      break;
    case "key":
      roundRect(ctx, -r * 0.4, -r * 0.4, r * 0.8, r * 0.8, r * 0.15);
      ctx.fillStyle = col ?? "#8EE6A0";
      ctx.fill();
      ctx.fillStyle = earned ? "#2f5a3a" : "#fff";
      ctx.font = `bold ${r * 0.55}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ㄹ", 0, r * 0.03);
      break;
    case "sprout":
      ctx.fillStyle = col ?? "#5FC97A";
      ctx.fillRect(-2, -r * 0.1, 4, r * 0.55);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * r * 0.22, -r * 0.18, r * 0.24, r * 0.12, s * -0.5, 0, TAU);
        ctx.fill();
      }
      break;
    case "pencil":
      ctx.rotate(-0.7);
      ctx.fillStyle = col ?? "#FFB86B";
      ctx.fillRect(-r * 0.12, -r * 0.5, r * 0.24, r * 0.75);
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, r * 0.25);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(r * 0.12, r * 0.25);
      ctx.fillStyle = col ?? "#F7D9B0";
      ctx.fill();
      break;
    case "umbrella":
      ctx.translate(0, r * 0.05);
      drawUmbrella(ctx, earned ? id % 7 : 0, r * 1.2);
      break;
    case "house":
      ctx.translate(0, r * 0.45);
      drawHouse(ctx, earned ? 0 : 0, r * 1.1);
      break;
    case "candy":
      drawCandy(ctx, "lolli", col ?? "#FFB3D1", r * 0.9);
      break;
    case "cloud":
      drawPpu(ctx, r * 1.5, { happy: true });
      break;
    case "heart":
      heartPath(ctx, r * 0.9);
      ctx.fillStyle = col ?? "#FF6F91";
      ctx.fill();
      break;
    case "fire":
      starPath(ctx, r * 0.55, 0.6, 8);
      ctx.fillStyle = col ?? "#FF8FB8";
      ctx.fill();
      break;
    case "text": {
      ctx.fillStyle = col ?? "#7C5CFF";
      ctx.font = `bold ${r * 0.48}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(STICKER_TEXT[id] ?? "", 0, r * 0.03);
      break;
    }
    default:
      starPath(ctx, r * 0.55);
      ctx.fillStyle = col ?? "#FFD43B";
      ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.restore();
}

const STICKER_MOTIF: Record<number, string> = {
  1: "paw", 2: "key", 3: "star", 4: "sprout", 5: "star", 6: "star", 7: "star", 8: "pencil", 9: "star",
  10: "text", 11: "text", 12: "text", 13: "text", 14: "heart", 15: "umbrella", 16: "candy", 17: "candy",
  18: "house", 19: "fire", 20: "house", 21: "text", 22: "text", 23: "paw", 24: "umbrella", 25: "cloud", 26: "candy",
};
const STICKER_TEXT: Record<number, string> = { 10: "50타", 11: "100타", 12: "150타", 13: "200타", 21: "1천", 22: "1만" };

export const profileColor = (i: number) => PROFILE_COLORS[i] ?? PROFILE_COLORS[0];
