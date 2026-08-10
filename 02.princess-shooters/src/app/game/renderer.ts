import {
  GameState,
  Player,
  Projectile,
  Enemy,
  Particle,
  Star,
  PowerUp,
} from "./types";
import { ENEMY_CONFIG, CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";

export function drawBackground(ctx: CanvasRenderingContext2D, stars: Star[], frame: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#0a0020");
  gradient.addColorStop(0.4, "#1a0a3e");
  gradient.addColorStop(0.7, "#2d1b69");
  gradient.addColorStop(1, "#4a2c8a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const star of stars) {
    const alpha = 0.5 + 0.5 * Math.sin(frame * 0.05 + star.twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const moonX = CANVAS_WIDTH - 80;
  const moonY = 60;
  ctx.fillStyle = "#FFFACD";
  ctx.shadowColor = "#FFFACD";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  drawClouds(ctx, frame);
}

function drawClouds(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 200 + frame * 0.3) % (CANVAS_WIDTH + 200)) - 100;
    const y = 100 + i * 80;
    ctx.beginPath();
    ctx.ellipse(x, y, 80, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 40, y - 10, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, frame: number) {
  const bobY = Math.sin(frame * 0.08) * 4;
  const px = player.x;
  const py = player.y + bobY;

  if (player.shieldActive) {
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + 0.2 * Math.sin(frame * 0.1)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py, player.width * 0.8, player.height * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  if (player.invincibleUntil > Date.now() && Math.floor(frame / 4) % 2 === 0) {
    return;
  }

  ctx.font = `${player.height * 0.7}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.princess.mountEmoji, px, py + 5);

  ctx.font = `${player.height * 0.45}px serif`;
  ctx.fillText(player.princess.emoji, px + 2, py - player.height * 0.25);

  ctx.fillStyle = player.princess.sparkleColor;
  for (let i = 0; i < 3; i++) {
    const sx = px - player.width * 0.5 - 5 - i * 8;
    const sy = py + Math.sin(frame * 0.15 + i) * 6;
    const size = 2 + Math.sin(frame * 0.2 + i * 2) * 1;
    ctx.globalAlpha = 0.6 - i * 0.15;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile, frame: number) {
  for (let i = 0; i < proj.trail.length; i++) {
    const t = proj.trail[i];
    const alpha = (i / proj.trail.length) * 0.5;
    const size = proj.size * (i / proj.trail.length) * 0.8;
    ctx.fillStyle = proj.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.shadowColor = proj.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = proj.color;
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(proj.x + 1, proj.y - 1, proj.size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  drawSparkle(ctx, proj.x, proj.y, proj.size * 2.5, proj.color, frame);
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, color: string, frame: number
) {
  const rot = frame * 0.1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 4; i++) {
    const angle = rot + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * size * 0.3, y + Math.sin(angle) * size * 0.3);
    ctx.lineTo(x + Math.cos(angle) * size * 0.7, y + Math.sin(angle) * size * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number) {
  const config = ENEMY_CONFIG[enemy.type];
  const bobY = Math.sin(frame * 0.06 + enemy.sinOffset) * 5;

  ctx.font = `${config.size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(config.emoji, enemy.x, enemy.y + bobY);

  if (enemy.health < enemy.maxHealth) {
    const barWidth = enemy.width * 0.8;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.height / 2 - 8 + bobY;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPct = enemy.health / enemy.maxHealth;
    const hue = healthPct * 120;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
  }
}

export function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  const alpha = particle.life / particle.maxLife;
  ctx.fillStyle = particle.color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp, frame: number) {
  const bobY = Math.sin(frame * 0.08 + powerUp.bobOffset) * 6;
  const emojis = { heart: "💖", shield: "🛡️", rapidFire: "⚡", tripleShot: "✨" };

  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 15;
  ctx.font = "28px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emojis[powerUp.type], powerUp.x, powerUp.y + bobY);
  ctx.shadowBlur = 0;
}

export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 45);

  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#FFD700";
  ctx.fillText(`Score: ${state.score}`, 15, 22);

  ctx.fillStyle = "#FF69B4";
  let heartsText = "";
  for (let i = 0; i < state.player.lives; i++) heartsText += "💖 ";
  ctx.font = "20px serif";
  ctx.fillText(heartsText, 160, 22);

  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#B8A9E8";
  ctx.textAlign = "center";
  ctx.fillText(`Wave ${state.wave}`, CANVAS_WIDTH / 2, 22);

  ctx.fillStyle = "#AAAAAA";
  ctx.font = "14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Best: ${state.highScore}`, CANVAS_WIDTH - 15, 22);

  if (state.rapidFireUntil > Date.now()) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("⚡ RAPID FIRE", 15, 55);
  }
  if (state.tripleShotUntil > Date.now()) {
    ctx.fillStyle = "#FF69B4";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("✨ TRIPLE SHOT", 15, state.rapidFireUntil > Date.now() ? 72 : 55);
  }
}

export function drawWaveTransition(ctx: CanvasRenderingContext2D, wave: number, frame: number) {
  ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + 0.1 * Math.sin(frame * 0.1)})`;
  ctx.fillRect(0, CANVAS_HEIGHT / 2 - 50, CANVAS_WIDTH, 100);

  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `hsl(${(frame * 3) % 360}, 80%, 70%)`;
  ctx.fillText(`Wave ${wave}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  ctx.font = "18px Arial";
  ctx.fillStyle = "#cccccc";
  ctx.fillText("Get ready!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
}

export function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `hsl(${(frame * 2) % 360}, 70%, 70%)`;
  ctx.fillText("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  if (state.score >= state.highScore && state.score > 0) {
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "#FF69B4";
    ctx.fillText("New High Score!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
  }

  ctx.font = "20px Arial";
  ctx.fillStyle = "#B8A9E8";
  ctx.fillText("Press SPACE or Click to play again", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
}

export function drawStartScreen(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `hsl(${(frame * 2) % 360}, 80%, 75%)`;
  ctx.fillText("Princess Shooters", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);

  ctx.font = "22px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText("Fairytale Sky Battle!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 55);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#B8A9E8";
  const instructions = [
    "Arrow Keys or WASD to move",
    "SPACE or Click to shoot sparkles",
    "Collect power-ups for bonuses!",
  ];
  instructions.forEach((text, i) => {
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + i * 28);
  });

  ctx.font = "20px Arial";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.5 * Math.sin(frame * 0.08)})`;
  ctx.fillText("Press SPACE or Click to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);

  const emojis = ["🦄", "🐉", "👸", "🦅"];
  emojis.forEach((e, i) => {
    const x = CANVAS_WIDTH / 2 - 90 + i * 60;
    const y = CANVAS_HEIGHT / 2 + 165 + Math.sin(frame * 0.06 + i) * 8;
    ctx.font = "32px serif";
    ctx.fillText(e, x, y);
  });
}
