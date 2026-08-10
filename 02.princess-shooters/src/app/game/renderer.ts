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
import { drawPrincessSprite, drawEnemySprite } from "./sprites";
import { STORY } from "./story";

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
  if (player.invincibleUntil > Date.now() && Math.floor(frame / 4) % 2 === 0) {
    return;
  }

  if (player.shieldActive) {
    const bobY = Math.sin(frame * 0.08) * 4;
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + 0.2 * Math.sin(frame * 0.1)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + bobY, player.width * 0.55, player.height * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  drawPrincessSprite(ctx, player, frame);

  // Trail sparkles behind mount
  ctx.fillStyle = player.princess.sparkleColor;
  for (let i = 0; i < 4; i++) {
    const sx = player.x - player.width * 0.4 - 8 - i * 10;
    const sy = player.y + Math.sin(frame * 0.15 + i) * 8 + Math.sin(frame * 0.08) * 4;
    const size = 3 + Math.sin(frame * 0.2 + i * 2) * 1.5;
    ctx.globalAlpha = 0.5 - i * 0.1;
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

  drawEnemySprite(ctx, enemy.type, enemy.x, enemy.y, config.size, frame + enemy.sinOffset * 10);

  if (enemy.health < enemy.maxHealth) {
    const barWidth = enemy.width * 0.8;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.height / 2 - 8;

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

  ctx.fillStyle = state.player.princess.color;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(state.player.princess.name, CANVAS_WIDTH - 15, 14);

  ctx.fillStyle = "#AAAAAA";
  ctx.font = "12px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Best: ${state.highScore}`, CANVAS_WIDTH - 15, 32);

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

  // Super charge meter
  const meterX = CANVAS_WIDTH / 2 - 60;
  const meterY = CANVAS_HEIGHT - 22;
  const meterW = 120;
  const meterH = 10;
  const charge = Math.min(state.superCharge, 10);

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(meterX - 1, meterY - 1, meterW + 2, meterH + 2);

  if (state.superReady) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.fillRect(meterX, meterY, meterW, meterH);
    ctx.font = "bold 10px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SUPER READY! [E]", CANVAS_WIDTH / 2, meterY + meterH / 2);
  } else if (state.superActive) {
    const flash = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
    ctx.fillStyle = `rgba(255, 100, 255, ${flash})`;
    ctx.fillRect(meterX, meterY, meterW, meterH);
    ctx.font = "bold 10px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SUPER ACTIVE!", CANVAS_WIDTH / 2, meterY + meterH / 2);
  } else {
    const pct = charge / 10;
    const grad = ctx.createLinearGradient(meterX, 0, meterX + meterW * pct, 0);
    grad.addColorStop(0, state.player.princess.color);
    grad.addColorStop(1, state.player.princess.sparkleColor);
    ctx.fillStyle = grad;
    ctx.fillRect(meterX, meterY, meterW * pct, meterH);
    ctx.font = "9px Arial";
    ctx.fillStyle = "#CCCCCC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${charge}/10`, CANVAS_WIDTH / 2, meterY + meterH / 2);
  }
}

export function drawWaveTransition(ctx: CanvasRenderingContext2D, wave: number, frame: number) {
  ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + 0.1 * Math.sin(frame * 0.1)})`;
  ctx.fillRect(0, CANVAS_HEIGHT / 2 - 70, CANVAS_WIDTH, 140);

  const storyWave = STORY.waves[Math.min(wave - 1, STORY.waves.length - 1)];

  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `hsl(${(frame * 3) % 360}, 80%, 70%)`;
  ctx.fillText(storyWave.title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(storyWave.introDialogue, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#B8A9E8";
  ctx.fillText(`Wave ${wave}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
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

export function drawSuperAttack(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  if (!state.superActive) return;

  const { player } = state;
  const f = state.superAnimFrame;
  const color = player.princess.color;
  const sparkle = player.princess.sparkleColor;
  const cx = player.x;
  const cy = player.y;

  // Expanding shockwave rings
  for (let i = 0; i < 3; i++) {
    const ringFrame = f - i * 12;
    if (ringFrame < 0) continue;
    const radius = ringFrame * 8;
    const alpha = Math.max(0, 0.6 - ringFrame * 0.008);
    ctx.strokeStyle = i % 2 === 0 ? color : sparkle;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4 - i;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rotating star burst
  if (f < 90) {
    const burstAlpha = Math.max(0, 0.8 - f * 0.009);
    ctx.globalAlpha = burstAlpha;
    const numRays = 12;
    for (let i = 0; i < numRays; i++) {
      const angle = (Math.PI * 2 * i) / numRays + f * 0.06;
      const innerR = 30 + f * 2;
      const outerR = 80 + f * 5;
      const grad = ctx.createLinearGradient(
        cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR,
        cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR
      );
      grad.addColorStop(0, sparkle);
      grad.addColorStop(1, "transparent");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  }

  // Screen edge glow
  const glowAlpha = Math.max(0, 0.3 - f * 0.003);
  const edgeGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, CANVAS_WIDTH);
  edgeGrad.addColorStop(0, "transparent");
  edgeGrad.addColorStop(0.6, "transparent");
  edgeGrad.addColorStop(1, color);
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Floating sparkle symbols around the princess
  ctx.globalAlpha = Math.max(0, 0.9 - f * 0.005);
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = sparkle;
  for (let i = 0; i < 8; i++) {
    const orbitAngle = (Math.PI * 2 * i) / 8 + f * 0.04;
    const orbitR = 50 + Math.sin(f * 0.1 + i) * 15;
    const sx = cx + Math.cos(orbitAngle) * orbitR;
    const sy = cy + Math.sin(orbitAngle) * orbitR;
    ctx.fillText("✦", sx, sy);
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

export function drawBattleCry(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  const name = state.player.princess.name;
  const quote = STORY.characterQuotes[name];
  if (!quote) return;

  const elapsed = Date.now() - state.startedAt;
  if (elapsed > 3000) return;

  const alpha = Math.max(0, 1 - elapsed / 3000);
  const y = CANVAS_HEIGHT / 2 - 40 - elapsed * 0.02;

  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = state.player.princess.color;
  ctx.globalAlpha = alpha;
  ctx.fillText(`"${quote}"`, CANVAS_WIDTH / 2, y);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`— ${name}`, CANVAS_WIDTH / 2, y + 25);
  ctx.globalAlpha = 1;
}
