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
import { drawPrincessSprite, drawEnemySprite, drawPrincessPortrait } from "./sprites";
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

const SUPER_ATTACK_NAMES: Record<string, string> = {
  Aurora: "Rainbow Radiance",
  Luna: "Frost Dragon Breath",
  Stella: "Celestial Wings",
  Rose: "Phoenix Inferno",
  Elara: "Swan Lake Cascade",
  Ivy: "Forest Wrath",
  Coral: "Tidal Surge",
  Violet: "Butterfly Storm",
};

export function getSuperShake(state: GameState): { x: number; y: number } {
  if (!state.superActive) return { x: 0, y: 0 };
  const f = state.superAnimFrame;
  if (f < 10) {
    const intensity = 8;
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2,
    };
  }
  if (f < 60) {
    const intensity = 4 * (1 - (f - 10) / 50);
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2,
    };
  }
  return { x: 0, y: 0 };
}

export function drawSuperAttack(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  if (!state.superActive) return;

  const { player } = state;
  const f = state.superAnimFrame;
  const color = player.princess.color;
  const sparkle = player.princess.sparkleColor;
  const name = player.princess.name;
  const attackName = SUPER_ATTACK_NAMES[name] || "Super Attack";

  // Phase 1 (f 0-12): Screen flash
  if (f < 12) {
    const flashAlpha = f < 4 ? Math.min(1, f / 4) : Math.max(0, 1 - (f - 4) / 8);
    ctx.globalAlpha = flashAlpha * 0.9;
    ctx.fillStyle = f < 4 ? "#FFFFFF" : color;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
  }

  // Phase 2 (f 5-55): Dark overlay + diagonal slash + portrait cut-in
  if (f >= 5 && f < 80) {
    const overlayAlpha = f < 15 ? (f - 5) / 10 * 0.75 : f > 65 ? Math.max(0, (80 - f) / 15 * 0.75) : 0.75;
    ctx.globalAlpha = overlayAlpha;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
  }

  // Diagonal slash lines
  if (f >= 8 && f < 30) {
    const slashProgress = Math.min(1, (f - 8) / 8);
    ctx.save();
    ctx.globalAlpha = Math.min(1, slashProgress * 2) * (f < 25 ? 1 : (30 - f) / 5);
    ctx.strokeStyle = sparkle;
    ctx.lineWidth = 4;
    ctx.shadowColor = sparkle;
    ctx.shadowBlur = 15;
    const sx = -100 + slashProgress * (CANVAS_WIDTH + 200);
    const sy = -50 + slashProgress * (CANVAS_HEIGHT + 100);
    ctx.beginPath();
    ctx.moveTo(sx - 200, sy - 100);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 250, sy - 80);
    ctx.lineTo(sx - 50, sy + 20);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Portrait cut-in from left
  if (f >= 10 && f < 75) {
    const enterDuration = 12;
    const holdStart = 10 + enterDuration;
    const exitStart = 60;

    let portraitX: number;
    if (f < holdStart) {
      const t = (f - 10) / enterDuration;
      const ease = 1 - Math.pow(1 - t, 3);
      portraitX = -150 + ease * 270;
    } else if (f < exitStart) {
      portraitX = 120;
    } else {
      const t = (f - exitStart) / 15;
      portraitX = 120 - t * 300;
    }

    const portraitY = CANVAS_HEIGHT / 2 - 20;
    const portraitAlpha = f < holdStart
      ? Math.min(1, (f - 10) / 8)
      : f >= exitStart
        ? Math.max(0, 1 - (f - exitStart) / 10)
        : 1;

    ctx.save();
    ctx.globalAlpha = portraitAlpha;

    // Portrait glow behind
    const glowGrad = ctx.createRadialGradient(portraitX, portraitY, 30, portraitX, portraitY, 180);
    glowGrad.addColorStop(0, color);
    glowGrad.addColorStop(1, "transparent");
    ctx.globalAlpha = portraitAlpha * 0.4;
    ctx.fillStyle = glowGrad;
    ctx.fillRect(portraitX - 180, portraitY - 180, 360, 360);

    ctx.globalAlpha = portraitAlpha;
    drawPrincessPortrait(ctx, player.princess, portraitX, portraitY, 1.1, frame);
    ctx.restore();

    // Attack name text on right side
    if (f >= 18 && f < 65) {
      const textAlpha = f < 25 ? (f - 18) / 7 : f > 55 ? Math.max(0, (65 - f) / 10) : 1;
      ctx.save();
      ctx.globalAlpha = textAlpha;

      ctx.font = "bold 38px Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(attackName, CANVAS_WIDTH - 40, CANVAS_HEIGHT / 2 - 30);

      ctx.font = "bold 22px Arial";
      ctx.fillStyle = sparkle;
      ctx.shadowColor = sparkle;
      ctx.fillText(`— ${name} —`, CANVAS_WIDTH - 40, CANVAS_HEIGHT / 2 + 10);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // Phase 3 (f 50-150): Character-specific mega effect
  if (f >= 50) {
    drawCharacterSuperEffect(ctx, state, f - 50, color, sparkle, name);
  }

  // Phase 4: Trailing sparkle particles throughout
  if (f >= 10) {
    ctx.globalAlpha = Math.max(0, 0.8 - (f - 10) * 0.005);
    for (let i = 0; i < 6; i++) {
      const sparkleAngle = f * 0.05 + (Math.PI * 2 * i) / 6;
      const sparkleR = 40 + f * 2 + Math.sin(f * 0.15 + i * 3) * 30;
      const sx = player.x + Math.cos(sparkleAngle) * sparkleR;
      const sy = player.y + Math.sin(sparkleAngle) * sparkleR;
      if (sx > 0 && sx < CANVAS_WIDTH && sy > 0 && sy < CANVAS_HEIGHT) {
        const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
        sGrad.addColorStop(0, sparkle);
        sGrad.addColorStop(1, "transparent");
        ctx.fillStyle = sGrad;
        ctx.fillRect(sx - 8, sy - 8, 16, 16);
      }
    }
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawCharacterSuperEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ef: number,
  color: string,
  sparkle: string,
  name: string
) {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const alpha = Math.max(0, 1 - ef / 120);

  switch (name) {
    case "Aurora": {
      // Rainbow Radiance — rainbow arcs sweeping across screen
      const colors = ["#FF0000", "#FF7700", "#FFFF00", "#00FF00", "#0077FF", "#8800FF", "#FF00FF"];
      for (let i = 0; i < colors.length; i++) {
        const arcX = -200 + (ef * 12 + i * 60) % (CANVAS_WIDTH + 400);
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(arcX, CANVAS_HEIGHT + 100, 250 - i * 15, Math.PI, 0);
        ctx.stroke();
      }
      // Sparkle rain
      for (let i = 0; i < 20; i++) {
        ctx.globalAlpha = alpha * 0.6;
        const rx = (i * 43 + ef * 3) % CANVAS_WIDTH;
        const ry = (i * 67 + ef * 5) % CANVAS_HEIGHT;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(rx, ry, 3 + Math.sin(ef * 0.2 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "Luna": {
      // Frost Dragon Breath — ice crystals expanding
      ctx.globalAlpha = alpha * 0.5;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + ef * 0.02;
        const dist = ef * 5;
        const ix = cx + Math.cos(angle) * dist;
        const iy = cy + Math.sin(angle) * dist;
        ctx.strokeStyle = "#88DDFF";
        ctx.lineWidth = 2;
        drawIceCrystal(ctx, ix, iy, 15 + Math.sin(ef * 0.1 + i) * 5, angle + ef * 0.05);
      }
      // Frost mist
      const frostGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ef * 6);
      frostGrad.addColorStop(0, "rgba(136, 221, 255, 0.3)");
      frostGrad.addColorStop(1, "transparent");
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = frostGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    case "Stella": {
      // Celestial Wings — feathered wind blades spiraling
      ctx.globalAlpha = alpha * 0.7;
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16 + ef * 0.08;
        const dist = 50 + ef * 4;
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        ctx.fillStyle = i % 2 === 0 ? "#E8E0FF" : sparkle;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 18 + Math.sin(ef * 0.15 + i) * 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Whirlwind center
      ctx.strokeStyle = "#C8B8FF";
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.5;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + ef * 3 + ring * 25, ef * 0.1, ef * 0.1 + Math.PI * 1.5);
        ctx.stroke();
      }
      break;
    }
    case "Rose": {
      // Phoenix Inferno — fire columns erupting from bottom
      for (let i = 0; i < 8; i++) {
        const fx = 50 + i * (CANVAS_WIDTH - 100) / 7;
        const height = Math.min(CANVAS_HEIGHT, ef * 8 + Math.sin(ef * 0.2 + i * 2) * 40);
        const fireGrad = ctx.createLinearGradient(fx, CANVAS_HEIGHT, fx, CANVAS_HEIGHT - height);
        fireGrad.addColorStop(0, "#FF4400");
        fireGrad.addColorStop(0.4, "#FF8800");
        fireGrad.addColorStop(0.7, "#FFCC00");
        fireGrad.addColorStop(1, "transparent");
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = fireGrad;
        const w = 30 + Math.sin(ef * 0.3 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(fx - w, CANVAS_HEIGHT);
        ctx.quadraticCurveTo(fx - w * 0.3, CANVAS_HEIGHT - height * 0.6, fx, CANVAS_HEIGHT - height);
        ctx.quadraticCurveTo(fx + w * 0.3, CANVAS_HEIGHT - height * 0.6, fx + w, CANVAS_HEIGHT);
        ctx.fill();
      }
      // Embers
      for (let i = 0; i < 15; i++) {
        ctx.globalAlpha = alpha * 0.8;
        const ex = (i * 59 + ef * 4) % CANVAS_WIDTH;
        const ey = CANVAS_HEIGHT - (i * 47 + ef * 6) % CANVAS_HEIGHT;
        ctx.fillStyle = i % 3 === 0 ? "#FF4400" : i % 3 === 1 ? "#FF8800" : "#FFCC00";
        ctx.beginPath();
        ctx.arc(ex, ey, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "Elara": {
      // Swan Lake Cascade — elegant feathers raining down
      for (let i = 0; i < 20; i++) {
        const fx = (i * 47 + ef * 2) % (CANVAS_WIDTH + 40) - 20;
        const fy = (i * 73 + ef * 4) % (CANVAS_HEIGHT + 40) - 20;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = i % 3 === 0 ? "#FFFFFF" : i % 3 === 1 ? "#FFE4E1" : sparkle;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(Math.sin(ef * 0.05 + i) * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.restore();
      }
      // Elegant ripple rings
      for (let ring = 0; ring < 4; ring++) {
        const r = ef * 4 + ring * 40;
        ctx.globalAlpha = alpha * Math.max(0, 0.5 - ring * 0.1);
        ctx.strokeStyle = "#FFE4E1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.5, r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "Ivy": {
      // Forest Wrath — vines reaching across screen
      ctx.globalAlpha = alpha * 0.8;
      for (let v = 0; v < 6; v++) {
        const startAngle = (Math.PI * 2 * v) / 6 + 0.3;
        ctx.strokeStyle = v % 2 === 0 ? "#228B22" : "#32CD32";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const segments = Math.min(20, Math.floor(ef / 2));
        let vx = cx;
        let vy = cy;
        ctx.moveTo(vx, vy);
        for (let s = 0; s < segments; s++) {
          const a = startAngle + Math.sin(s * 0.8 + v) * 0.6;
          vx += Math.cos(a) * 25;
          vy += Math.sin(a) * 25;
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
        // Leaves at vine tips
        if (segments > 3) {
          ctx.fillStyle = "#32CD32";
          ctx.beginPath();
          ctx.ellipse(vx, vy, 8, 5, startAngle, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Green aura
      const greenGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ef * 5);
      greenGrad.addColorStop(0, "rgba(34, 139, 34, 0.3)");
      greenGrad.addColorStop(1, "transparent");
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = greenGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    case "Coral": {
      // Tidal Surge — wave crashing across screen
      ctx.globalAlpha = alpha * 0.6;
      for (let w = 0; w < 3; w++) {
        const waveX = -300 + ef * 10 - w * 120;
        ctx.fillStyle = w === 0 ? "#0077BE" : w === 1 ? "#00A5CF" : "#00CED1";
        ctx.beginPath();
        ctx.moveTo(waveX, 0);
        for (let px = 0; px < CANVAS_WIDTH + 200; px += 10) {
          const py = CANVAS_HEIGHT / 2 + Math.sin((px + waveX) * 0.02 + w) * (60 + w * 20)
            + Math.sin((px + waveX) * 0.05 + ef * 0.1) * 20;
          ctx.lineTo(waveX + px, py);
        }
        ctx.lineTo(waveX + CANVAS_WIDTH + 200, CANVAS_HEIGHT);
        ctx.lineTo(waveX, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
      // Bubbles
      for (let i = 0; i < 15; i++) {
        const bx = (i * 61 + ef * 5) % CANVAS_WIDTH;
        const by = (i * 43 + ef * 3) % CANVAS_HEIGHT;
        const br = 4 + Math.sin(ef * 0.2 + i) * 2;
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "Violet": {
      // Butterfly Storm — swarm of butterfly shapes
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24 + ef * 0.03;
        const dist = 20 + ef * 3 + Math.sin(ef * 0.08 + i * 2) * 40;
        const bx = cx + Math.cos(angle) * dist;
        const by = cy + Math.sin(angle) * dist;
        if (bx < -20 || bx > CANVAS_WIDTH + 20 || by < -20 || by > CANVAS_HEIGHT + 20) continue;
        ctx.globalAlpha = alpha * 0.8;
        const wingFlap = Math.sin(ef * 0.3 + i * 1.5) * 0.6;
        const hue = (i * 30 + ef * 5) % 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);
        // Left wing
        ctx.beginPath();
        ctx.ellipse(-4, 0, 6, 10 * (0.6 + wingFlap * 0.4), -0.3 + wingFlap * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.ellipse(4, 0, 6, 10 * (0.6 + wingFlap * 0.4), 0.3 - wingFlap * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = "#333";
        ctx.fillRect(-1, -4, 2, 8);
        ctx.restore();
      }
      // Sparkle dust trail
      const violetGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ef * 5);
      violetGrad.addColorStop(0, "rgba(148, 0, 211, 0.25)");
      violetGrad.addColorStop(1, "transparent");
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = violetGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      break;
    }
    default: {
      // Fallback: expanding energy rings
      for (let i = 0; i < 5; i++) {
        const r = ef * 6 + i * 30;
        ctx.globalAlpha = alpha * Math.max(0, 0.6 - i * 0.1);
        ctx.strokeStyle = i % 2 === 0 ? color : sparkle;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawIceCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
    ctx.stroke();
    // Branch tips
    const bx = Math.cos(a) * size * 0.6;
    const by = Math.sin(a) * size * 0.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a + 0.5) * size * 0.3, by + Math.sin(a + 0.5) * size * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a - 0.5) * size * 0.3, by + Math.sin(a - 0.5) * size * 0.3);
    ctx.stroke();
  }
  ctx.restore();
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
