import { Princess, Player, EnemyType } from "./types";

export function drawPrincessSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  frame: number
) {
  const { princess } = player;
  const fireAnim = player.fireAnim;
  const px = player.x;
  const py = player.y;
  const s = player.width / 120;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(s, s);

  drawMount(ctx, princess, frame);
  drawPrincessBody(ctx, princess, frame, fireAnim);

  ctx.restore();
}

function drawMount(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const bob = Math.sin(frame * 0.08) * 2;
  ctx.save();
  ctx.translate(0, bob);

  switch (p.mount) {
    case "Unicorn": drawUnicorn(ctx, p, frame); break;
    case "Dragon": drawDragon(ctx, p, frame); break;
    case "Pegasus": drawPegasus(ctx, p, frame); break;
    case "Phoenix": drawPhoenix(ctx, p, frame); break;
    case "Swan": drawSwan(ctx, p, frame); break;
    case "Wolf": drawWolf(ctx, p, frame); break;
    case "Dolphin": drawDolphin(ctx, p, frame); break;
    case "Butterfly": drawButterfly(ctx, p, frame); break;
  }

  ctx.restore();
}

function drawUnicorn(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;
  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 15, 35, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mc.accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Legs
  ctx.fillStyle = mc.body;
  for (const [lx, phase] of [[-18, 0], [-8, 1], [12, 2], [22, 3]] as const) {
    const legKick = Math.sin(frame * 0.12 + phase) * 4;
    ctx.fillRect(lx - 3, 30, 6, 18 + legKick);
    ctx.fillStyle = mc.accent;
    ctx.fillRect(lx - 4, 46 + legKick, 8, 4);
    ctx.fillStyle = mc.body;
  }

  // Neck
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(25, 5);
  ctx.quadraticCurveTo(35, -10, 38, -25);
  ctx.quadraticCurveTo(42, -10, 32, 5);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(40, -30, 12, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mc.accent;
  ctx.stroke();

  // Horn
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.moveTo(48, -38);
  ctx.lineTo(55, -55);
  ctx.lineTo(44, -38);
  ctx.fill();
  // Horn glow
  ctx.shadowColor = mc.detail;
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(52, -50, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Eye
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.ellipse(46, -32, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(47, -33, 1, 0, Math.PI * 2);
  ctx.fill();

  // Mane
  ctx.fillStyle = mc.accent;
  for (let i = 0; i < 5; i++) {
    const mx = 28 + i * 2;
    const my = -20 + i * 6;
    const wave = Math.sin(frame * 0.1 + i) * 4;
    ctx.beginPath();
    ctx.ellipse(mx - 5 + wave, my, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail
  ctx.strokeStyle = mc.accent;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const tailWave = Math.sin(frame * 0.08) * 8;
  ctx.beginPath();
  ctx.moveTo(-30, 10);
  ctx.quadraticCurveTo(-45 + tailWave, 5, -50 + tailWave, 20);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawDragon(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Wings
  const wingFlap = Math.sin(frame * 0.1) * 12;
  ctx.fillStyle = mc.accent + "AA";
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-30, -30 + wingFlap, -15, -45 + wingFlap);
  ctx.quadraticCurveTo(0, -25 + wingFlap, -5, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, 5);
  ctx.quadraticCurveTo(25, -20 + wingFlap * 0.7, 15, -35 + wingFlap * 0.7);
  ctx.quadraticCurveTo(0, -15 + wingFlap * 0.7, 5, 5);
  ctx.fill();

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 15, 35, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scales
  ctx.fillStyle = mc.accent;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(-20 + i * 8, 8, 4, 0, Math.PI, true);
    ctx.fill();
  }

  // Legs
  ctx.fillStyle = mc.body;
  for (const [lx, phase] of [[-15, 0], [-5, 1], [15, 2], [25, 3]] as const) {
    const kick = Math.sin(frame * 0.12 + phase) * 3;
    ctx.fillRect(lx - 3, 28, 7, 16 + kick);
    ctx.fillStyle = mc.accent;
    ctx.beginPath();
    ctx.moveTo(lx - 5, 44 + kick);
    ctx.lineTo(lx + 6, 44 + kick);
    ctx.lineTo(lx, 48 + kick);
    ctx.fill();
    ctx.fillStyle = mc.body;
  }

  // Neck
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(25, 5);
  ctx.quadraticCurveTo(38, -8, 40, -22);
  ctx.quadraticCurveTo(44, -8, 32, 8);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(42, -28, 14, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.moveTo(38, -36);
  ctx.lineTo(34, -48);
  ctx.lineTo(42, -36);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(46, -36);
  ctx.lineTo(50, -46);
  ctx.lineTo(50, -34);
  ctx.fill();

  // Eye
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.ellipse(49, -29, 3, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.ellipse(49, -29, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils glow
  if (Math.floor(frame / 20) % 3 === 0) {
    ctx.fillStyle = mc.detail;
    ctx.shadowColor = mc.detail;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(54, -24, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Tail
  ctx.strokeStyle = mc.body;
  ctx.lineWidth = 5;
  const tailWave = Math.sin(frame * 0.08) * 10;
  ctx.beginPath();
  ctx.moveTo(-32, 15);
  ctx.quadraticCurveTo(-50, 10 + tailWave, -55, 25 + tailWave);
  ctx.stroke();
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.moveTo(-55, 20 + tailWave);
  ctx.lineTo(-60, 28 + tailWave);
  ctx.lineTo(-50, 30 + tailWave);
  ctx.fill();
  ctx.lineWidth = 1;
}

function drawPegasus(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Wings
  const wingFlap = Math.sin(frame * 0.12) * 15;
  ctx.fillStyle = mc.detail + "99";
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.quadraticCurveTo(-20, -35 + wingFlap, -5, -50 + wingFlap);
  ctx.quadraticCurveTo(5, -30 + wingFlap, -5, -5);
  ctx.fill();
  ctx.fillStyle = mc.body + "BB";
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(30, -25 + wingFlap * 0.8, 20, -40 + wingFlap * 0.8);
  ctx.quadraticCurveTo(5, -20 + wingFlap * 0.8, 10, 0);
  ctx.fill();

  // Body (horse)
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 15, 34, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  for (const [lx, phase] of [[-18, 0], [-8, 1.5], [12, 1], [22, 2.5]] as const) {
    const kick = Math.sin(frame * 0.12 + phase) * 5;
    ctx.fillStyle = mc.body;
    ctx.fillRect(lx - 3, 30, 6, 18 + kick);
    ctx.fillStyle = mc.accent;
    ctx.fillRect(lx - 4, 46 + kick, 8, 4);
  }

  // Neck
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(24, 5);
  ctx.quadraticCurveTo(34, -10, 37, -24);
  ctx.quadraticCurveTo(42, -10, 32, 5);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(39, -29, 12, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.ellipse(45, -30, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(46, -31, 1, 0, Math.PI * 2);
  ctx.fill();

  // Mane
  ctx.fillStyle = mc.detail;
  for (let i = 0; i < 5; i++) {
    const wave = Math.sin(frame * 0.1 + i * 0.8) * 4;
    ctx.beginPath();
    ctx.ellipse(27 + i * 2 - wave, -18 + i * 5, 5, 3, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail
  ctx.strokeStyle = mc.detail;
  ctx.lineWidth = 4;
  const tailWave = Math.sin(frame * 0.08) * 8;
  ctx.beginPath();
  ctx.moveTo(-30, 12);
  ctx.quadraticCurveTo(-48 + tailWave, 8, -52 + tailWave, 22);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawPhoenix(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Flame wings
  const wingFlap = Math.sin(frame * 0.14) * 12;
  const flicker = Math.sin(frame * 0.3) * 3;
  ctx.fillStyle = mc.detail + "88";
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-30 + flicker, -35 + wingFlap, -10, -50 + wingFlap);
  ctx.quadraticCurveTo(5, -25 + wingFlap, -5, 0);
  ctx.fill();
  ctx.fillStyle = mc.accent + "88";
  ctx.beginPath();
  ctx.moveTo(8, 5);
  ctx.quadraticCurveTo(30 + flicker, -20 + wingFlap * 0.8, 18, -42 + wingFlap * 0.8);
  ctx.quadraticCurveTo(2, -15 + wingFlap * 0.8, 8, 5);
  ctx.fill();

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 15, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feather details
  ctx.fillStyle = mc.detail;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-15 + i * 10, 20, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(22, 5);
  ctx.quadraticCurveTo(35, -8, 38, -22);
  ctx.quadraticCurveTo(42, -8, 30, 5);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(40, -27, 11, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.moveTo(50, -28);
  ctx.lineTo(58, -25);
  ctx.lineTo(50, -24);
  ctx.fill();

  // Crest
  ctx.fillStyle = mc.detail;
  for (let i = 0; i < 3; i++) {
    const wave = Math.sin(frame * 0.15 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(36 + i * 3, -35);
    ctx.lineTo(33 + i * 3 + wave, -45 - i * 3);
    ctx.lineTo(39 + i * 3, -35);
    ctx.fill();
  }

  // Eye
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(46, -28, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(46, -28, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Tail flames
  ctx.fillStyle = mc.detail + "CC";
  const tflicker = Math.sin(frame * 0.2) * 6;
  ctx.beginPath();
  ctx.moveTo(-28, 12);
  ctx.quadraticCurveTo(-45, 5 + tflicker, -55, 15 + tflicker);
  ctx.quadraticCurveTo(-42, 20, -28, 18);
  ctx.fill();
  ctx.fillStyle = mc.accent + "AA";
  ctx.beginPath();
  ctx.moveTo(-28, 15);
  ctx.quadraticCurveTo(-50, 18 - tflicker, -58, 28 - tflicker);
  ctx.quadraticCurveTo(-40, 25, -28, 20);
  ctx.fill();
}

function drawSwan(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Wings
  const wingFlap = Math.sin(frame * 0.1) * 8;
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.quadraticCurveTo(-25, -20 + wingFlap, -10, -35 + wingFlap);
  ctx.quadraticCurveTo(0, -15 + wingFlap, -10, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 5);
  ctx.quadraticCurveTo(25, -15 + wingFlap * 0.7, 15, -30 + wingFlap * 0.7);
  ctx.quadraticCurveTo(5, -10 + wingFlap * 0.7, 10, 5);
  ctx.fill();

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 18, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mc.accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Long neck (S-curve)
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(20, 8);
  ctx.bezierCurveTo(30, -5, 45, -15, 40, -35);
  ctx.bezierCurveTo(48, -15, 35, 0, 26, 10);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(40, -38, 8, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.moveTo(47, -39);
  ctx.lineTo(55, -36);
  ctx.lineTo(47, -35);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(44, -39, 2, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = mc.accent;
  const tailWave = Math.sin(frame * 0.08) * 5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-25, 15);
    ctx.quadraticCurveTo(-38, 8 + tailWave + i * 4, -45, 12 + tailWave + i * 5);
    ctx.quadraticCurveTo(-35, 15 + i * 2, -25, 18);
    ctx.fill();
  }
}

function drawWolf(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 15, 35, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fur texture
  ctx.fillStyle = mc.accent;
  ctx.beginPath();
  ctx.ellipse(0, 8, 28, 10, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Legs
  for (const [lx, phase] of [[-20, 0], [-10, 1.2], [10, 0.6], [20, 1.8]] as const) {
    const kick = Math.sin(frame * 0.15 + phase) * 6;
    ctx.fillStyle = mc.body;
    ctx.fillRect(lx - 4, 28, 8, 18 + kick);
    ctx.fillStyle = mc.accent;
    ctx.beginPath();
    ctx.ellipse(lx, 47 + kick, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(25, 5);
  ctx.quadraticCurveTo(38, -5, 40, -18);
  ctx.quadraticCurveTo(44, -5, 32, 8);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(42, -24, 14, 11, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = mc.accent;
  ctx.beginPath();
  ctx.ellipse(52, -21, 8, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(57, -22, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(36, -33);
  ctx.lineTo(32, -45);
  ctx.lineTo(40, -35);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(44, -33);
  ctx.lineTo(46, -46);
  ctx.lineTo(50, -33);
  ctx.fill();

  // Eyes
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.ellipse(46, -26, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(46, -26, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = mc.body;
  const tailWave = Math.sin(frame * 0.1) * 10;
  ctx.beginPath();
  ctx.moveTo(-32, 10);
  ctx.quadraticCurveTo(-48 + tailWave, 0, -50 + tailWave, -8);
  ctx.quadraticCurveTo(-44 + tailWave, 5, -30, 15);
  ctx.fill();
}

function drawDolphin(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(5, 15, 38, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = mc.accent;
  ctx.beginPath();
  ctx.ellipse(5, 20, 30, 10, 0, 0, Math.PI);
  ctx.fill();

  // Dorsal fin
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(-5, -12, 8, -8);
  ctx.lineTo(5, 2);
  ctx.fill();

  // Side fins
  const finFlap = Math.sin(frame * 0.12) * 5;
  ctx.beginPath();
  ctx.moveTo(-10, 22);
  ctx.quadraticCurveTo(-20, 30 + finFlap, -8, 32 + finFlap);
  ctx.lineTo(-8, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, 22);
  ctx.quadraticCurveTo(25, 28 - finFlap, 18, 30 - finFlap);
  ctx.lineTo(15, 22);
  ctx.fill();

  // Head/nose
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(40, 12, 12, 10, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(50, 10);
  ctx.quadraticCurveTo(60, 12, 55, 16);
  ctx.quadraticCurveTo(50, 14, 50, 10);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(45, 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.arc(46, 9, 1, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(50, 13, 5, 0.2, 1.2);
  ctx.stroke();

  // Tail
  ctx.fillStyle = mc.body;
  const tailFlap = Math.sin(frame * 0.1) * 8;
  ctx.beginPath();
  ctx.moveTo(-30, 15);
  ctx.quadraticCurveTo(-45, 8, -52, 5 + tailFlap);
  ctx.quadraticCurveTo(-48, 15, -30, 18);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, 15);
  ctx.quadraticCurveTo(-45, 22, -52, 28 - tailFlap);
  ctx.quadraticCurveTo(-48, 18, -30, 18);
  ctx.fill();

  // Water splash
  ctx.fillStyle = mc.detail + "44";
  for (let i = 0; i < 3; i++) {
    const sx = -35 - i * 8;
    const sy = 25 + Math.sin(frame * 0.15 + i) * 4;
    ctx.beginPath();
    ctx.arc(sx, sy, 3 - i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawButterfly(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  const mc = p.mountColors;

  // Wings
  const wingFlap = Math.sin(frame * 0.15) * 10;

  // Upper wings
  ctx.fillStyle = mc.body + "CC";
  ctx.beginPath();
  ctx.ellipse(-15, -5 + wingFlap * 0.5, 25, 18, -0.4 + wingFlap * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(15, -5 + wingFlap * 0.5, 25, 18, 0.4 - wingFlap * 0.02, 0, Math.PI * 2);
  ctx.fill();

  // Lower wings
  ctx.fillStyle = mc.accent + "BB";
  ctx.beginPath();
  ctx.ellipse(-12, 18 + wingFlap * 0.3, 18, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 18 + wingFlap * 0.3, 18, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wing patterns
  ctx.fillStyle = mc.detail + "88";
  ctx.beginPath();
  ctx.arc(-18, -8 + wingFlap * 0.5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, -8 + wingFlap * 0.5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-10, 16 + wingFlap * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, 16 + wingFlap * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = mc.body;
  ctx.beginPath();
  ctx.ellipse(0, 10, 6, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = mc.body;
  ctx.lineWidth = 1.5;
  const antennaWave = Math.sin(frame * 0.1) * 3;
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.quadraticCurveTo(-8 + antennaWave, -25, -12 + antennaWave, -30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.quadraticCurveTo(8 - antennaWave, -25, 12 - antennaWave, -30);
  ctx.stroke();
  ctx.fillStyle = mc.detail;
  ctx.beginPath();
  ctx.arc(-12 + antennaWave, -30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(12 - antennaWave, -30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
}

function drawPrincessBody(
  ctx: CanvasRenderingContext2D,
  p: Princess,
  frame: number,
  fireAnim: number
) {
  const isFiring = fireAnim > 0;
  const firePhase = fireAnim / 10;

  // Body / dress
  ctx.fillStyle = p.dressColor;
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(-12, 8);
  ctx.quadraticCurveTo(0, 12, 12, 8);
  ctx.lineTo(8, -10);
  ctx.fill();

  // Dress details
  ctx.fillStyle = p.dressAccent;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-12, 8);
  ctx.quadraticCurveTo(0, 12, 12, 8);
  ctx.lineTo(10, 0);
  ctx.fill();

  // Belt / sash
  ctx.fillStyle = p.crownColor;
  ctx.fillRect(-9, -2, 18, 3);

  // Neck
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(-3, -14, 6, 6);

  // Head
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, -20, 9, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  drawHair(ctx, p, frame);

  // Crown/tiara
  drawCrown(ctx, p);

  // Eyes
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.ellipse(-3.5, -21, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, -21, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-3, -22, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -22, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = "#FFB6C188";
  ctx.beginPath();
  ctx.ellipse(-6, -18, 2.5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, -18, 2.5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = "#C0392B";
  ctx.lineWidth = 1;
  if (isFiring) {
    ctx.beginPath();
    ctx.arc(0, -17, 2, 0, Math.PI);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -18, 1.8, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Arms
  ctx.strokeStyle = p.skinColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  // Left arm (back)
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-15, -2, -14, 4);
  ctx.stroke();

  // Right arm (wand arm)
  if (isFiring) {
    const reach = firePhase * 8;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.quadraticCurveTo(18 + reach, -15, 22 + reach, -18);
    ctx.stroke();

    // Wand
    ctx.strokeStyle = p.crownColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20 + reach, -16);
    ctx.lineTo(28 + reach, -22);
    ctx.stroke();

    // Wand tip glow
    ctx.fillStyle = p.sparkleColor;
    ctx.shadowColor = p.sparkleColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(28 + reach, -22, 3, 0, Math.PI * 2);
    ctx.fill();

    // Fire burst sparkles
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + frame * 0.3;
      const r = 6 + firePhase * 4;
      ctx.beginPath();
      ctx.arc(
        28 + reach + Math.cos(angle) * r,
        -22 + Math.sin(angle) * r,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.quadraticCurveTo(15, -8, 16, -4);
    ctx.stroke();

    // Wand (resting)
    ctx.strokeStyle = p.crownColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(20, -10);
    ctx.stroke();
    ctx.fillStyle = p.sparkleColor;
    ctx.beginPath();
    ctx.arc(20, -10, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 1;
  ctx.lineCap = "butt";
}

function drawHair(ctx: CanvasRenderingContext2D, p: Princess, frame: number) {
  ctx.fillStyle = p.hairColor;

  switch (p.hairStyle) {
    case "long": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      const wave = Math.sin(frame * 0.06) * 3;
      ctx.beginPath();
      ctx.moveTo(-9, -18);
      ctx.quadraticCurveTo(-12 + wave, -5, -10 + wave, 5);
      ctx.quadraticCurveTo(-8, -5, -7, -16);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -18);
      ctx.quadraticCurveTo(12 - wave, -5, 10 - wave, 5);
      ctx.quadraticCurveTo(8, -5, 7, -16);
      ctx.fill();
      break;
    }
    case "ponytail": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      const swing = Math.sin(frame * 0.08) * 5;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.quadraticCurveTo(-8 + swing, -35, -5 + swing, -45);
      ctx.quadraticCurveTo(5 + swing, -35, 0, -28);
      ctx.fill();
      break;
    }
    case "buns": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, -30, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -30, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "short": {
      ctx.beginPath();
      ctx.arc(0, -22, 10.5, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-9, -19, 3, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(9, -19, 3, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "braids": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 4; i++) {
          const bx = side * 9;
          const by = -16 + i * 5;
          const wave = Math.sin(frame * 0.06 + i) * 1.5 * side;
          ctx.beginPath();
          ctx.ellipse(bx + wave, by, 3.5, 2.5, side * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "wavy": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      const wave = Math.sin(frame * 0.07) * 2;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(side * 9, -18);
        ctx.bezierCurveTo(
          side * 14 + wave, -10,
          side * 10 - wave, -2,
          side * 13 + wave, 5
        );
        ctx.bezierCurveTo(
          side * 8 - wave, -2,
          side * 11 + wave, -10,
          side * 7, -16
        );
        ctx.fill();
      }
      break;
    }
    case "curly": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const cx = side * (9 + Math.sin(frame * 0.05 + i) * 1.5);
          const cy = -16 + i * 6;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "twintail": {
      ctx.beginPath();
      ctx.arc(0, -22, 10, Math.PI, 0);
      ctx.fill();
      const swing = Math.sin(frame * 0.07) * 4;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(side * 8, -26);
        ctx.quadraticCurveTo(side * 16 + swing * side, -15, side * 14 + swing * side, 2);
        ctx.quadraticCurveTo(side * 10, -10, side * 6, -22);
        ctx.fill();
      }
      // Ribbons
      ctx.fillStyle = p.dressAccent;
      ctx.beginPath();
      ctx.arc(-8, -26, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -26, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawCrown(ctx: CanvasRenderingContext2D, p: Princess) {
  ctx.fillStyle = p.crownColor;
  ctx.beginPath();
  ctx.moveTo(-6, -29);
  ctx.lineTo(-7, -34);
  ctx.lineTo(-4, -31);
  ctx.lineTo(0, -36);
  ctx.lineTo(4, -31);
  ctx.lineTo(7, -34);
  ctx.lineTo(6, -29);
  ctx.fill();

  // Gem
  ctx.fillStyle = p.crownGem;
  ctx.beginPath();
  ctx.arc(0, -31, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF88";
  ctx.beginPath();
  ctx.arc(0.5, -31.5, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  type: EnemyType,
  x: number,
  y: number,
  size: number,
  frame: number
): void {
  const s = size / 50;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  switch (type) {
    case "goblin": drawGoblinEnemy(ctx, frame); break;
    case "bat": drawBatEnemy(ctx, frame); break;
    case "troll": drawTrollEnemy(ctx, frame); break;
    case "darkFairy": drawDarkFairyEnemy(ctx, frame); break;
    case "dragon": drawDragonEnemy(ctx, frame); break;
  }

  ctx.restore();
}

function drawGoblinEnemy(ctx: CanvasRenderingContext2D, frame: number) {
  const bob = Math.sin(frame * 0.09) * 3;
  const earWiggle = Math.sin(frame * 0.15) * 4;
  ctx.save();
  ctx.translate(0, bob);

  ctx.fillStyle = "#6B9B37";
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.quadraticCurveTo(-26, -8 + earWiggle, -22, 2 + earWiggle);
  ctx.quadraticCurveTo(-16, 0, -13, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.quadraticCurveTo(26, -8 - earWiggle, 22, 2 - earWiggle);
  ctx.quadraticCurveTo(16, 0, 13, 2);
  ctx.fill();
  ctx.fillStyle = "#F48FB1";
  ctx.beginPath();
  ctx.ellipse(-19, -2 + earWiggle, 3, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(19, -2 - earWiggle, 3, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7CB342";
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#AED581";
  ctx.beginPath();
  ctx.ellipse(0, 13, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7CB342";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const armSwing = Math.sin(frame * 0.15) * 6;
  ctx.beginPath();
  ctx.moveTo(-11, 6);
  ctx.quadraticCurveTo(-18, 10 + armSwing * 0.3, -16, 16 + armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 6);
  ctx.quadraticCurveTo(18, 10 - armSwing * 0.3, 16, 16 - armSwing);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#8BC34A";
  ctx.beginPath();
  ctx.arc(0, -8, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#4F7A2B";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-9, -13);
  ctx.lineTo(-3, -11);
  ctx.moveTo(9, -13);
  ctx.lineTo(3, -11);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#FFEB3B";
  ctx.beginPath();
  ctx.ellipse(-5, -8, 3, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, -8, 3, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-4.5, -7.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5.5, -7.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-4, -8.3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -8.3, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6B9B37";
  ctx.beginPath();
  ctx.arc(0, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3E2723";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -3, 6, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.moveTo(3, 1.5);
  ctx.lineTo(4.5, 4);
  ctx.lineTo(2, 2);
  ctx.fill();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#4F7A2B";
  ctx.beginPath();
  ctx.moveTo(-2, -19);
  ctx.quadraticCurveTo(0, -25, 2, -19);
  ctx.quadraticCurveTo(0, -21, -2, -19);
  ctx.fill();

  ctx.restore();
}

function drawBatEnemy(ctx: CanvasRenderingContext2D, frame: number) {
  const bob = Math.sin(frame * 0.1) * 3;
  const wingFlap = Math.sin(frame * 0.25) * 14;
  ctx.save();
  ctx.translate(0, bob);

  ctx.fillStyle = "#7E57C2";
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(-22, -6 + wingFlap * 0.4, -26, 4 + wingFlap);
  ctx.quadraticCurveTo(-18, 6 + wingFlap * 0.3, -14, 2);
  ctx.quadraticCurveTo(-16, 10 + wingFlap * 0.5, -10, 8);
  ctx.quadraticCurveTo(-10, 4, -8, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.quadraticCurveTo(22, -6 - wingFlap * 0.4, 26, 4 - wingFlap);
  ctx.quadraticCurveTo(18, 6 - wingFlap * 0.3, 14, 2);
  ctx.quadraticCurveTo(16, 10 - wingFlap * 0.5, 10, 8);
  ctx.quadraticCurveTo(10, 4, 8, 2);
  ctx.fill();

  ctx.fillStyle = "#9575CD";
  ctx.beginPath();
  ctx.ellipse(0, 6, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#D1C4E9";
  ctx.beginPath();
  ctx.ellipse(0, 9, 6, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7E57C2";
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.quadraticCurveTo(-11, -22, -4, -16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -10);
  ctx.quadraticCurveTo(11, -22, 4, -16);
  ctx.fill();
  ctx.fillStyle = "#D1C4E9";
  ctx.beginPath();
  ctx.moveTo(-6.5, -11);
  ctx.quadraticCurveTo(-9, -19, -4.5, -15);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6.5, -11);
  ctx.quadraticCurveTo(9, -19, 4.5, -15);
  ctx.fill();

  ctx.fillStyle = "#9575CD";
  ctx.beginPath();
  ctx.arc(0, -6, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-3.5, -6, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.5, -6, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-2.9, -6.7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.1, -6.7, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.moveTo(-2, -1);
  ctx.lineTo(-1, 2);
  ctx.lineTo(-3, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, -1);
  ctx.lineTo(1, 2);
  ctx.lineTo(3, 0.5);
  ctx.fill();

  ctx.restore();
}

function drawTrollEnemy(ctx: CanvasRenderingContext2D, frame: number) {
  const bob = Math.sin(frame * 0.06) * 4;
  const clubSwing = Math.sin(frame * 0.1) * 8;
  ctx.save();
  ctx.translate(0, bob);

  ctx.save();
  ctx.translate(20, 6);
  ctx.rotate((clubSwing * Math.PI) / 180);
  ctx.fillStyle = "#8D6E63";
  ctx.fillRect(-2.5, -2, 5, 22);
  ctx.fillStyle = "#6D4C41";
  ctx.beginPath();
  ctx.ellipse(0, -6, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5D4037";
  for (const [nx, ny] of [[-3, -9], [3, -3], [-2, -2]] as const) {
    ctx.beginPath();
    ctx.arc(nx, ny, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#78909C";
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#B0BEC5";
  ctx.beginPath();
  ctx.ellipse(0, 16, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#78909C";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-17, 6);
  ctx.quadraticCurveTo(-24, 12, -22, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(17, 6);
  ctx.quadraticCurveTo(22, 8, 20, 16);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#607D8B";
  ctx.fillRect(-13, 26, 9, 8);
  ctx.fillRect(4, 26, 9, 8);

  ctx.fillStyle = "#90A4AE";
  ctx.beginPath();
  ctx.arc(0, -10, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#78909C";
  ctx.beginPath();
  ctx.ellipse(-14, -10, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, -10, 3, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.ellipse(-6, -11, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, -11, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(-6, -9, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -9, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-5.4, -9.6, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6.6, -9.6, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#78909C";
  ctx.beginPath();
  ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF9C4";
  ctx.beginPath();
  ctx.moveTo(-3, 1);
  ctx.lineTo(-4, 5);
  ctx.lineTo(-1.5, 1.5);
  ctx.fill();

  ctx.strokeStyle = "#37474F";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#546E7A";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, -24);
    ctx.quadraticCurveTo(i * 4 + 1, -30, i * 4 + 2, -24);
    ctx.fill();
  }

  ctx.restore();
}

function drawDarkFairyEnemy(ctx: CanvasRenderingContext2D, frame: number) {
  const bob = Math.sin(frame * 0.1) * 4;
  const wingFlap = Math.sin(frame * 0.3) * 6;
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.15);
  ctx.save();
  ctx.translate(0, bob);

  ctx.fillStyle = `rgba(186, 104, 200, ${0.15 + glow * 0.15})`;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(206, 147, 216, ${0.55 + Math.abs(wingFlap) * 0.01})`;
  ctx.beginPath();
  ctx.ellipse(-10, -2 + wingFlap * 0.3, 9, 13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, -2 - wingFlap * 0.3, 9, 13, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(-10, -4 + wingFlap * 0.3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, -4 - wingFlap * 0.3, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8E24AA";
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.quadraticCurveTo(0, 6, 5, 2);
  ctx.lineTo(3, 10);
  ctx.quadraticCurveTo(0, 12, -3, 10);
  ctx.fill();

  ctx.fillStyle = "#CE93D8";
  ctx.beginPath();
  ctx.arc(0, -4, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4A148C";
  ctx.beginPath();
  ctx.arc(0, -6, 8.5, Math.PI, 0);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const hx = -5 + i * 5;
    ctx.beginPath();
    ctx.moveTo(hx, -12);
    ctx.lineTo(hx + (i - 1) * 2, -18);
    ctx.lineTo(hx + 2.5, -12);
    ctx.fill();
  }

  ctx.strokeStyle = "#4A148C";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(-2, -5);
  ctx.moveTo(5, -6);
  ctx.lineTo(2, -5);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#4A148C";
  ctx.beginPath();
  ctx.ellipse(-2.8, -3.5, 1.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2.8, -3.5, 1.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-2.4, -4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.2, -4, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6A1B9A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 1, 2, Math.PI + 0.4, Math.PI * 2 - 0.4, true);
  ctx.stroke();

  ctx.strokeStyle = "#CE93D8";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 3);
  ctx.lineTo(4, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, 3);
  ctx.lineTo(-4, 6);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.4})`;
  for (let i = 0; i < 3; i++) {
    const angle = frame * 0.05 + (i * Math.PI * 2) / 3;
    const sx = Math.cos(angle) * 15;
    const sy = Math.sin(angle) * 15 - 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDragonEnemy(ctx: CanvasRenderingContext2D, frame: number) {
  const bob = Math.sin(frame * 0.07) * 4;
  const wingFlap = Math.sin(frame * 0.18) * 8;
  ctx.save();
  ctx.translate(0, bob);

  ctx.strokeStyle = "#E64A19";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  const tailWave = Math.sin(frame * 0.1) * 6;
  ctx.beginPath();
  ctx.moveTo(-16, 14);
  ctx.quadraticCurveTo(-28, 16 + tailWave, -30, 8 + tailWave);
  ctx.stroke();
  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.moveTo(-30, 4 + tailWave);
  ctx.lineTo(-35, 8 + tailWave);
  ctx.lineTo(-29, 12 + tailWave);
  ctx.fill();
  ctx.lineWidth = 1;

  ctx.fillStyle = "#FFAB91";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.quadraticCurveTo(-20, -4 + wingFlap, -14, 8 + wingFlap * 0.5);
  ctx.quadraticCurveTo(-10, 6, -6, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.quadraticCurveTo(20, -4 - wingFlap, 14, 8 - wingFlap * 0.5);
  ctx.quadraticCurveTo(10, 6, 6, 2);
  ctx.fill();

  ctx.fillStyle = "#F4511E";
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFCC80";
  ctx.beginPath();
  ctx.ellipse(0, 14, 9, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFB300";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-6 + i * 6, -2);
    ctx.lineTo(-4 + i * 6, -8);
    ctx.lineTo(-2 + i * 6, -2);
    ctx.fill();
  }

  ctx.fillStyle = "#F4511E";
  ctx.fillRect(-11, 20, 6, 7);
  ctx.fillRect(5, 20, 6, 7);

  ctx.fillStyle = "#FB8C00";
  ctx.beginPath();
  ctx.arc(0, -10, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.ellipse(0, -4, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFD54F";
  ctx.beginPath();
  ctx.moveTo(-6, -19);
  ctx.lineTo(-8, -25);
  ctx.lineTo(-4, -19);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -19);
  ctx.lineTo(8, -25);
  ctx.lineTo(4, -19);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.ellipse(-5, -12, 3, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, -12, 3, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2E7D32";
  ctx.beginPath();
  ctx.arc(-4.5, -11.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5.5, -11.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-4, -12.2, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -12.2, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#D84315";
  ctx.beginPath();
  ctx.arc(-2.5, -3, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2.5, -3, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#BF360C";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -3, 3.5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  const puffCycle = frame % 60;
  for (let i = 0; i < 2; i++) {
    const p = (puffCycle + i * 30) % 60;
    if (p < 40) {
      const py = -18 - p * 0.6;
      const px = (i === 0 ? -2.5 : 2.5) + Math.sin(frame * 0.1 + i) * 2;
      const alpha = 0.5 * (1 - p / 40);
      const r = 1.5 + p * 0.08;
      ctx.fillStyle = `rgba(210,210,210,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
