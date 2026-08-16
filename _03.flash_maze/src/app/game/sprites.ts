import { COLORS } from "./constants";
import type { Dir } from "./types";

/** Everything here is drawn with canvas primitives — no image assets. */

export interface PrincessPose {
  facing: Dir;
  walking: boolean;
  /** 0..1 through the current step */
  progress: number;
  /** flips each step so the feet alternate */
  stepParity: number;
  /** celebrating the escape: hops with both arms in the air */
  cheering?: boolean;
}

/**
 * A fairytale princess: layered gown, puffed sleeves, sash, flowing hair and
 * a gemmed tiara. She idles with a slow breath and blink, and walks with a
 * bob, a lean, swinging arms, alternating feet and a trailing skirt.
 *
 * Everything is proportional to `size` (her full height) so she scales with
 * the cell, and drawn around a translated origin so the walk lean is a single
 * rotation rather than per-part maths.
 */
export function drawPrincess(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  t: number,
  pose: PrincessPose,
): void {
  const s = size;
  const { facing, walking, progress, stepParity } = pose;
  const cheering = pose.cheering === true;

  // One arch through the step: 0 at both ends, 1 at mid-stride.
  const stride = walking ? Math.sin(progress * Math.PI) : 0;
  const sideways = facing === "left" ? -1 : facing === "right" ? 1 : 0;
  // Cheering overrides everything else: quick repeated hops, squashing a
  // little at the bottom of each one.
  const hop = cheering ? Math.abs(Math.sin(t / 105)) : 0;
  const bob = cheering
    ? -hop * s * 0.16
    : walking
      ? -stride * s * 0.05
      : Math.sin(t / 480) * s * 0.015;
  const lean = cheering
    ? Math.sin(t / 210) * 0.1
    : sideways * stride * 0.13;
  // Squash and stretch on the hop sells the bounce.
  const breathe = cheering
    ? 1 + hop * 0.07
    : 1 + Math.sin(t / 480) * 0.012;
  // Feet swap each step so consecutive steps don't look identical.
  const leadFoot = stepParity === 0 ? 1 : -1;

  // Blink for a moment every few seconds.
  const blinking = t % 3400 < 130;
  const facingAway = facing === "up";
  const faceShift = sideways * s * 0.035;

  ctx.save();

  // Soft glow — she must stay findable once the lights are out.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.25);
  glow.addColorStop(0, "rgba(255, 166, 201, 0.42)");
  glow.addColorStop(0.55, "rgba(255, 143, 186, 0.16)");
  glow.addColorStop(1, "rgba(255, 143, 186, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 1.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(cx, cy + bob);
  ctx.rotate(lean);
  if (!walking || cheering) ctx.scale(1, breathe);

  const hemY = s * 0.42;
  const waistY = s * 0.04;
  const shoulderY = -s * 0.08;
  const headY = -s * 0.25;
  const headR = s * 0.16;
  // The skirt and hair trail behind the direction of travel.
  const drag = -sideways * stride * s * 0.06;

  drawFeet(ctx, s, hemY, stride, leadFoot, walking);
  drawBackHair(ctx, s, headY, headR, drag);
  drawSkirt(ctx, s, waistY, hemY, drag);
  drawBodice(ctx, s, shoulderY, waistY);
  drawArms(ctx, s, shoulderY, stride, leadFoot, walking, cheering);
  drawSleeves(ctx, s, shoulderY);
  drawHead(ctx, s, headY, headR, faceShift, facingAway && !cheering, blinking);
  drawTiara(ctx, s, headY, headR, faceShift);

  ctx.restore();

  if (!walking) drawIdleSparkles(ctx, cx, cy, s, t);
}

function drawFeet(
  ctx: CanvasRenderingContext2D,
  s: number,
  hemY: number,
  stride: number,
  leadFoot: number,
  walking: boolean,
) {
  const swing = walking ? stride * s * 0.09 * leadFoot : 0;
  ctx.fillStyle = COLORS.shoe;
  [-1, 1].forEach((side) => {
    const offset = side === leadFoot ? swing : -swing;
    ctx.beginPath();
    ctx.ellipse(
      side * s * 0.09 + offset,
      hemY + s * 0.03,
      s * 0.062,
      s * 0.036,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  s: number,
  headY: number,
  headR: number,
  drag: number,
) {
  const grad = ctx.createLinearGradient(0, headY - headR, 0, headY + s * 0.3);
  grad.addColorStop(0, COLORS.hairLight);
  grad.addColorStop(1, COLORS.hair);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-headR * 1.05, headY);
  ctx.quadraticCurveTo(
    -headR * 1.5 + drag,
    headY + s * 0.16,
    -headR * 0.95 + drag,
    headY + s * 0.32,
  );
  ctx.quadraticCurveTo(0, headY + s * 0.38, headR * 0.95 + drag, headY + s * 0.32);
  ctx.quadraticCurveTo(headR * 1.5 + drag, headY + s * 0.16, headR * 1.05, headY);
  ctx.quadraticCurveTo(headR * 1.15, headY - headR * 1.3, 0, headY - headR * 1.25);
  ctx.quadraticCurveTo(-headR * 1.15, headY - headR * 1.3, -headR * 1.05, headY);
  ctx.closePath();
  ctx.fill();
}

function drawSkirt(
  ctx: CanvasRenderingContext2D,
  s: number,
  waistY: number,
  hemY: number,
  drag: number,
) {
  const grad = ctx.createLinearGradient(0, waistY, 0, hemY);
  grad.addColorStop(0, COLORS.dress);
  grad.addColorStop(0.55, COLORS.dressMid);
  grad.addColorStop(1, COLORS.dressDark);

  // Bell silhouette, hem dragged behind the direction of travel.
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, waistY);
  ctx.quadraticCurveTo(-s * 0.32, hemY - s * 0.12, -s * 0.3 + drag, hemY);
  ctx.quadraticCurveTo(0, hemY + s * 0.06, s * 0.3 + drag, hemY);
  ctx.quadraticCurveTo(s * 0.32, hemY - s * 0.12, s * 0.1, waistY);
  ctx.closePath();
  ctx.fill();

  // Ruffle layers, so the gown reads as fabric rather than a triangle.
  ctx.strokeStyle = "rgba(255, 240, 246, 0.55)";
  ctx.lineWidth = Math.max(1, s * 0.018);
  [0.45, 0.72].forEach((f) => {
    const yy = waistY + (hemY - waistY) * f;
    const half = s * (0.13 + 0.16 * f);
    ctx.beginPath();
    ctx.moveTo(-half, yy);
    ctx.quadraticCurveTo(0, yy + s * 0.045, half, yy);
    ctx.stroke();
  });

  // Hem trim
  ctx.strokeStyle = COLORS.dressTrim;
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.beginPath();
  ctx.moveTo(-s * 0.3 + drag, hemY);
  ctx.quadraticCurveTo(0, hemY + s * 0.06, s * 0.3 + drag, hemY);
  ctx.stroke();
}

function drawBodice(
  ctx: CanvasRenderingContext2D,
  s: number,
  shoulderY: number,
  waistY: number,
) {
  ctx.fillStyle = COLORS.bodice;
  ctx.beginPath();
  ctx.moveTo(-s * 0.115, shoulderY);
  ctx.quadraticCurveTo(-s * 0.13, waistY - s * 0.04, -s * 0.1, waistY + s * 0.01);
  ctx.lineTo(s * 0.1, waistY + s * 0.01);
  ctx.quadraticCurveTo(s * 0.13, waistY - s * 0.04, s * 0.115, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Gold sash with a gem at the waist.
  ctx.fillStyle = COLORS.sash;
  ctx.fillRect(-s * 0.115, waistY - s * 0.035, s * 0.23, s * 0.038);
  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.moveTo(0, waistY - s * 0.045);
  ctx.lineTo(s * 0.032, waistY - s * 0.016);
  ctx.lineTo(0, waistY + s * 0.014);
  ctx.lineTo(-s * 0.032, waistY - s * 0.016);
  ctx.closePath();
  ctx.fill();
}

function drawArms(
  ctx: CanvasRenderingContext2D,
  s: number,
  shoulderY: number,
  stride: number,
  leadFoot: number,
  walking: boolean,
  cheering: boolean,
) {
  ctx.strokeStyle = COLORS.skin;
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = "round";

  if (cheering) {
    // Both arms thrown up in a V.
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.11, shoulderY + s * 0.03);
      ctx.quadraticCurveTo(
        side * s * 0.22,
        shoulderY - s * 0.04,
        side * s * 0.24,
        shoulderY - s * 0.16,
      );
      ctx.stroke();
      // Hands
      ctx.fillStyle = COLORS.skin;
      ctx.beginPath();
      ctx.arc(side * s * 0.24, shoulderY - s * 0.17, s * 0.032, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  // Arms swing opposite the legs, which is what sells a walk cycle.
  const swing = walking ? stride * s * 0.07 * -leadFoot : 0;
  [-1, 1].forEach((side) => {
    const offset = side === leadFoot ? swing : -swing;
    ctx.beginPath();
    ctx.moveTo(side * s * 0.115, shoulderY + s * 0.03);
    ctx.quadraticCurveTo(
      side * s * 0.16,
      shoulderY + s * 0.09,
      side * s * 0.15 + offset,
      shoulderY + s * 0.15,
    );
    ctx.stroke();
  });
}

function drawSleeves(
  ctx: CanvasRenderingContext2D,
  s: number,
  shoulderY: number,
) {
  ctx.fillStyle = COLORS.dress;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(
      side * s * 0.125,
      shoulderY + s * 0.025,
      s * 0.055,
      s * 0.048,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  s: number,
  headY: number,
  headR: number,
  faceShift: number,
  facingAway: boolean,
  blinking: boolean,
) {
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  if (facingAway) {
    // Walking away from the camera: the back of her head, no face.
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.arc(0, headY, headR * 1.02, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Fringe
  ctx.fillStyle = COLORS.hair;
  ctx.beginPath();
  ctx.arc(0, headY, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(0, headY - headR * 0.35, headR * 0.98, headY - headR * 0.2);
  ctx.closePath();
  ctx.fill();

  // Side locks framing the face
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * headR * 0.92, headY - headR * 0.2);
    ctx.quadraticCurveTo(
      side * headR * 1.2,
      headY + headR * 0.5,
      side * headR * 0.78,
      headY + headR * 1.05,
    );
    ctx.quadraticCurveTo(
      side * headR * 0.62,
      headY + headR * 0.4,
      side * headR * 0.72,
      headY - headR * 0.2,
    );
    ctx.closePath();
    ctx.fill();
  });

  const eyeY = headY + headR * 0.12;
  const eyeDx = headR * 0.38;

  if (blinking) {
    ctx.strokeStyle = "#4a2f3d";
    ctx.lineWidth = Math.max(1, headR * 0.11);
    ctx.lineCap = "round";
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * eyeDx + faceShift - headR * 0.11, eyeY);
      ctx.quadraticCurveTo(
        side * eyeDx + faceShift,
        eyeY + headR * 0.09,
        side * eyeDx + faceShift + headR * 0.11,
        eyeY,
      );
      ctx.stroke();
    });
  } else {
    [-1, 1].forEach((side) => {
      const ex = side * eyeDx + faceShift;
      ctx.fillStyle = "#4a2f3d";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, headR * 0.13, headR * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex + headR * 0.05, eyeY - headR * 0.06, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Blush
  ctx.fillStyle = COLORS.blush;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(
      side * headR * 0.62 + faceShift,
      eyeY + headR * 0.3,
      headR * 0.16,
      headR * 0.1,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });

  // Smile
  ctx.strokeStyle = "#c1547a";
  ctx.lineWidth = Math.max(1, headR * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(faceShift, eyeY + headR * 0.28, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawTiara(
  ctx: CanvasRenderingContext2D,
  s: number,
  headY: number,
  headR: number,
  faceShift: number,
) {
  const baseY = headY - headR * 0.82;
  const half = headR * 0.72;
  const x = faceShift * 0.5;

  ctx.fillStyle = COLORS.crown;
  ctx.beginPath();
  ctx.moveTo(x - half, baseY);
  ctx.lineTo(x - half * 0.62, baseY - headR * 0.42);
  ctx.lineTo(x - half * 0.26, baseY - headR * 0.08);
  ctx.lineTo(x, baseY - headR * 0.62);
  ctx.lineTo(x + half * 0.26, baseY - headR * 0.08);
  ctx.lineTo(x + half * 0.62, baseY - headR * 0.42);
  ctx.lineTo(x + half, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.arc(x, baseY - headR * 0.66, headR * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb3d1";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(x + side * half * 0.62, baseY - headR * 0.46, headR * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A little magic while she is standing still. */
function drawIdleSparkles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  t: number,
) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const a = t / 1100 + (i * Math.PI * 2) / 3;
    const px = cx + Math.cos(a) * s * 0.5;
    const py = cy + Math.sin(a * 1.3) * s * 0.34;
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t / 320 + i * 1.7));
    const r = s * 0.035 * twinkle;
    ctx.globalAlpha = twinkle * 0.85;
    ctx.fillStyle = "#fff0f6";
    ctx.beginPath();
    ctx.moveTo(px, py - r);
    ctx.lineTo(px + r * 0.38, py);
    ctx.lineTo(px, py + r);
    ctx.lineTo(px - r * 0.38, py);
    ctx.closePath();
    ctx.fill();
  }
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
