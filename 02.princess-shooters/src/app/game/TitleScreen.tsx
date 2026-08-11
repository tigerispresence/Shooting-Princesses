"use client";

import { useRef, useEffect, useCallback } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { initAudio } from "./audio";

interface TitleScreenProps {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    initAudio();
    cancelAnimationFrame(animRef.current);
    onStart();
  }, [onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars: { x: number; y: number; size: number; twinkle: number; speed: number }[] = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 0.65,
        size: Math.random() * 2.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.3 + 0.1,
      });
    }

    const fireflies: { x: number; y: number; vx: number; vy: number; phase: number }[] = [];
    for (let i = 0; i < 25; i++) {
      fireflies.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 200 + Math.random() * 350,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sky gradient — magical dusk
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, "#0a0025");
      skyGrad.addColorStop(0.2, "#1a0845");
      skyGrad.addColorStop(0.45, "#2d1570");
      skyGrad.addColorStop(0.65, "#5c2d91");
      skyGrad.addColorStop(0.8, "#8b3fa0");
      skyGrad.addColorStop(1, "#1a0a2e");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars
      for (const star of stars) {
        const alpha = 0.4 + 0.6 * Math.sin(f * 0.04 + star.twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting star (occasional)
      if (f % 300 < 15) {
        const t = (f % 300) / 15;
        const sx = 100 + t * 500;
        const sy = 50 + t * 120;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 40, sy - 15);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Moon — large glowing
      const moonX = CANVAS_WIDTH - 130;
      const moonY = 85;
      ctx.save();
      ctx.shadowColor = "#FFFACD";
      ctx.shadowBlur = 60;
      ctx.fillStyle = "#FFFACD";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#FFF8DC";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Moon craters
      ctx.fillStyle = "rgba(220, 210, 170, 0.4)";
      ctx.beginPath();
      ctx.arc(moonX - 12, moonY - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX + 15, moonY + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX - 5, moonY + 15, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Clouds (wispy)
      ctx.fillStyle = "rgba(180, 150, 220, 0.08)";
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 170 + f * 0.2) % (CANVAS_WIDTH + 200)) - 100;
        const cy = 60 + i * 50;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 100, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 50, cy - 8, 60, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant mountains/hills
      ctx.fillStyle = "#1a0a3e";
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT * 0.7);
      ctx.quadraticCurveTo(100, CANVAS_HEIGHT * 0.55, 200, CANVAS_HEIGHT * 0.65);
      ctx.quadraticCurveTo(350, CANVAS_HEIGHT * 0.5, 500, CANVAS_HEIGHT * 0.6);
      ctx.quadraticCurveTo(650, CANVAS_HEIGHT * 0.48, CANVAS_WIDTH, CANVAS_HEIGHT * 0.62);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Enchanted forest silhouette
      drawForest(ctx, f);

      // Castle
      drawCastle(ctx, f);

      // Ground with grass
      const groundGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.82, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, "#0d0520");
      groundGrad.addColorStop(1, "#150830");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, CANVAS_HEIGHT * 0.82, CANVAS_WIDTH, CANVAS_HEIGHT * 0.18);

      // Grass blades
      for (let i = 0; i < 60; i++) {
        const gx = i * (CANVAS_WIDTH / 60) + Math.sin(f * 0.03 + i) * 3;
        const gy = CANVAS_HEIGHT * 0.82;
        const gh = 8 + Math.sin(i * 0.7) * 4;
        ctx.strokeStyle = `rgba(30, 80, 30, ${0.3 + Math.sin(i) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + Math.sin(f * 0.05 + i) * 4, gy - gh * 0.6, gx + Math.sin(f * 0.04 + i) * 6, gy - gh);
        ctx.stroke();
      }

      // Fireflies
      for (const fly of fireflies) {
        fly.x += fly.vx + Math.sin(f * 0.02 + fly.phase) * 0.3;
        fly.y += fly.vy + Math.cos(f * 0.015 + fly.phase) * 0.2;
        if (fly.x < 0) fly.x = CANVAS_WIDTH;
        if (fly.x > CANVAS_WIDTH) fly.x = 0;
        if (fly.y < 180) fly.y = 550;
        if (fly.y > 560) fly.y = 180;

        const glow = 0.4 + 0.6 * Math.sin(f * 0.08 + fly.phase);
        ctx.save();
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255, 215, 0, ${glow})`;
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Flying princess silhouettes in the sky
      drawFlyingSilhouettes(ctx, f);

      // ============ TEXT OVERLAYS ============

      // Title glow backdrop
      const titleY = 160;
      const titleGlow = ctx.createRadialGradient(CANVAS_WIDTH / 2, titleY, 0, CANVAS_WIDTH / 2, titleY, 300);
      titleGlow.addColorStop(0, "rgba(147, 51, 234, 0.15)");
      titleGlow.addColorStop(1, "transparent");
      ctx.fillStyle = titleGlow;
      ctx.fillRect(0, titleY - 120, CANVAS_WIDTH, 240);

      // Main title
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Title shadow
      ctx.font = "bold 52px 'Georgia', serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillText("Princess Shooters", CANVAS_WIDTH / 2 + 3, titleY + 3);

      // Title with animated gradient (simulated with hue shift)
      const hue1 = (f * 1.5) % 360;
      const hue2 = (hue1 + 60) % 360;
      const hue3 = (hue1 + 120) % 360;
      const titleGrad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 250, 0, CANVAS_WIDTH / 2 + 250, 0);
      titleGrad.addColorStop(0, `hsl(${hue1}, 80%, 75%)`);
      titleGrad.addColorStop(0.3, `hsl(${hue2}, 80%, 80%)`);
      titleGrad.addColorStop(0.6, "#FFD700");
      titleGrad.addColorStop(1, `hsl(${hue3}, 80%, 75%)`);
      ctx.fillStyle = titleGrad;
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      ctx.fillText("Princess Shooters", CANVAS_WIDTH / 2, titleY);
      ctx.shadowBlur = 0;

      // Decorative stars around title
      ctx.fillStyle = "#FFD700";
      const starPositions = [
        [-270, -5], [270, -5], [-230, 15], [230, 15],
      ];
      for (const [ox, oy] of starPositions) {
        const sparkleAlpha = 0.5 + 0.5 * Math.sin(f * 0.08 + ox);
        ctx.globalAlpha = sparkleAlpha;
        drawTitleStar(ctx, CANVAS_WIDTH / 2 + ox, titleY + oy, 6 + Math.sin(f * 0.1 + ox) * 2);
      }
      ctx.globalAlpha = 1;

      // Subtitle
      ctx.font = "italic 20px 'Georgia', serif";
      ctx.fillStyle = "#E8D5FF";
      ctx.shadowColor = "#9B59B6";
      ctx.shadowBlur = 10;
      ctx.fillText("Realm of Radiance: The Grumble Curse", CANVAS_WIDTH / 2, titleY + 42);
      ctx.shadowBlur = 0;

      // Decorative line
      ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const lineW = 200 + Math.sin(f * 0.03) * 20;
      ctx.moveTo(CANVAS_WIDTH / 2 - lineW, titleY + 62);
      ctx.lineTo(CANVAS_WIDTH / 2, titleY + 58);
      ctx.lineTo(CANVAS_WIDTH / 2 + lineW, titleY + 62);
      ctx.stroke();
      // Center diamond
      ctx.fillStyle = "#FFD700";
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 2, titleY + 58);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();

      // "Press to Start" with pulsing
      const startAlpha = 0.5 + 0.5 * Math.sin(f * 0.06);
      ctx.globalAlpha = startAlpha;
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 15;
      ctx.fillText("Press any key or tap to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.7);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Special Thanks
      ctx.font = "16px 'Georgia', serif";
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 8;
      ctx.fillText("Special Thanks", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82);
      ctx.shadowBlur = 0;

      ctx.font = "bold 20px 'Georgia', serif";
      ctx.fillStyle = "#FF69B4";
      ctx.shadowColor = "#FF69B4";
      ctx.shadowBlur = 10;
      ctx.fillText("이서연  ♥  이서정", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.87);
      ctx.shadowBlur = 0;

      ctx.font = "12px 'Georgia', serif";
      ctx.fillStyle = "rgba(200, 180, 240, 0.6)";
      ctx.fillText("This adventure is for you!", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.91);

      // Bottom credits
      ctx.font = "10px Arial";
      ctx.fillStyle = "rgba(180, 160, 220, 0.4)";
      ctx.fillText("© 2026 Princess Shooters", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.97);

      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      handleStart();
    };

    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("click", handleStart);
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleStart();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("click", handleStart);
    };
  }, [handleStart]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 w-full max-w-4xl cursor-pointer"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function drawCastle(ctx: CanvasRenderingContext2D, f: number) {
  const baseX = CANVAS_WIDTH / 2;
  const baseY = CANVAS_HEIGHT * 0.68;
  ctx.fillStyle = "#0d0520";

  // Main body
  ctx.fillRect(baseX - 80, baseY - 80, 160, 100);

  // Left tower
  ctx.fillRect(baseX - 110, baseY - 140, 40, 160);
  // Left tower top (pointed)
  ctx.beginPath();
  ctx.moveTo(baseX - 115, baseY - 140);
  ctx.lineTo(baseX - 90, baseY - 185);
  ctx.lineTo(baseX - 65, baseY - 140);
  ctx.closePath();
  ctx.fill();

  // Right tower
  ctx.fillRect(baseX + 70, baseY - 140, 40, 160);
  // Right tower top
  ctx.beginPath();
  ctx.moveTo(baseX + 65, baseY - 140);
  ctx.lineTo(baseX + 90, baseY - 185);
  ctx.lineTo(baseX + 115, baseY - 140);
  ctx.closePath();
  ctx.fill();

  // Center tower (tallest)
  ctx.fillRect(baseX - 30, baseY - 170, 60, 190);
  ctx.beginPath();
  ctx.moveTo(baseX - 35, baseY - 170);
  ctx.lineTo(baseX, baseY - 230);
  ctx.lineTo(baseX + 35, baseY - 170);
  ctx.closePath();
  ctx.fill();

  // Battlements
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(baseX - 80 + i * 22, baseY - 90, 14, 10);
  }

  // Castle windows — glowing
  const windowGlow = 0.5 + 0.3 * Math.sin(f * 0.04);
  ctx.fillStyle = `rgba(255, 200, 100, ${windowGlow})`;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 8;

  // Center tower windows
  ctx.fillRect(baseX - 10, baseY - 150, 8, 12);
  ctx.fillRect(baseX + 2, baseY - 150, 8, 12);
  ctx.fillRect(baseX - 10, baseY - 120, 8, 12);
  ctx.fillRect(baseX + 2, baseY - 120, 8, 12);

  // Side tower windows
  ctx.fillRect(baseX - 98, baseY - 120, 7, 10);
  ctx.fillRect(baseX - 88, baseY - 120, 7, 10);
  ctx.fillRect(baseX + 80, baseY - 120, 7, 10);
  ctx.fillRect(baseX + 90, baseY - 120, 7, 10);

  // Main hall windows (arched)
  for (let i = 0; i < 3; i++) {
    const wx = baseX - 50 + i * 40;
    const wy = baseY - 55;
    ctx.beginPath();
    ctx.arc(wx, wy, 8, Math.PI, 0);
    ctx.fillRect(wx - 8, wy, 16, 15);
    ctx.fill();
  }

  // Gate (arched entrance)
  ctx.fillStyle = `rgba(200, 160, 80, ${windowGlow * 0.8})`;
  ctx.beginPath();
  ctx.arc(baseX, baseY - 5, 18, Math.PI, 0);
  ctx.fillRect(baseX - 18, baseY - 5, 36, 25);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Flags on tower tops
  const flagWave = Math.sin(f * 0.08) * 8;
  drawFlag(ctx, baseX - 90, baseY - 188, flagWave, "#FF69B4");
  drawFlag(ctx, baseX + 90, baseY - 188, flagWave + 2, "#9B59B6");
  drawFlag(ctx, baseX, baseY - 233, flagWave + 1, "#FFD700");
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, wave: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 12, y + 3 + wave * 0.3, x + 22, y + 2 + wave * 0.5);
  ctx.quadraticCurveTo(x + 12, y + 8 + wave * 0.2, x, y + 12);
  ctx.closePath();
  ctx.fill();

  // Flag pole
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x, y + 14);
  ctx.stroke();
}

function drawForest(ctx: CanvasRenderingContext2D, f: number) {
  // Left forest
  for (let i = 0; i < 8; i++) {
    const tx = 20 + i * 30 + Math.sin(i * 2) * 10;
    const ty = CANVAS_HEIGHT * 0.72 + Math.sin(i * 1.5) * 15;
    const th = 40 + Math.sin(i * 3) * 15;
    const sway = Math.sin(f * 0.02 + i) * 2;

    ctx.fillStyle = `rgba(${5 + i * 2}, ${15 + i * 3}, ${10 + i * 2}, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + sway - 12, ty - th * 0.5);
    ctx.lineTo(tx + sway * 1.5, ty - th);
    ctx.lineTo(tx + sway + 12, ty - th * 0.5);
    ctx.closePath();
    ctx.fill();

    // Trunk
    ctx.fillStyle = "rgba(30, 15, 5, 0.8)";
    ctx.fillRect(tx - 2, ty - 5, 4, 8);
  }

  // Right forest
  for (let i = 0; i < 8; i++) {
    const tx = CANVAS_WIDTH - 20 - i * 30 - Math.sin(i * 2) * 10;
    const ty = CANVAS_HEIGHT * 0.72 + Math.sin(i * 1.8) * 15;
    const th = 35 + Math.sin(i * 2.5) * 15;
    const sway = Math.sin(f * 0.02 + i + 3) * 2;

    ctx.fillStyle = `rgba(${5 + i * 2}, ${15 + i * 3}, ${10 + i * 2}, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + sway - 12, ty - th * 0.5);
    ctx.lineTo(tx + sway * 1.5, ty - th);
    ctx.lineTo(tx + sway + 12, ty - th * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(30, 15, 5, 0.8)";
    ctx.fillRect(tx - 2, ty - 5, 4, 8);
  }
}

function drawFlyingSilhouettes(ctx: CanvasRenderingContext2D, f: number) {
  // Two princess-on-mount silhouettes flying across the sky
  ctx.fillStyle = "rgba(20, 10, 40, 0.7)";

  // Silhouette 1 — unicorn flying left to right
  const s1x = ((f * 0.8) % (CANVAS_WIDTH + 200)) - 100;
  const s1y = 110 + Math.sin(f * 0.03) * 15;
  ctx.save();
  ctx.translate(s1x, s1y);
  ctx.scale(0.5, 0.5);
  // Mount body
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.ellipse(25, -12, 10, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Horn
  ctx.beginPath();
  ctx.moveTo(30, -18);
  ctx.lineTo(38, -35);
  ctx.lineTo(32, -20);
  ctx.fill();
  // Legs
  ctx.fillRect(-15, 10, 4, 15);
  ctx.fillRect(5, 10, 4, 15);
  // Rider
  ctx.beginPath();
  ctx.ellipse(0, -22, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rider head
  ctx.beginPath();
  ctx.arc(0, -36, 6, 0, Math.PI * 2);
  ctx.fill();
  // Trailing sparkles
  ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + 0.2 * Math.sin(f * 0.1)})`;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(-20 - i * 12, Math.sin(f * 0.1 + i) * 5, 3 - i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Silhouette 2 — dragon flying right to left (slower, higher)
  ctx.fillStyle = "rgba(20, 10, 40, 0.5)";
  const s2x = CANVAS_WIDTH + 100 - ((f * 0.5) % (CANVAS_WIDTH + 200));
  const s2y = 70 + Math.sin(f * 0.025 + 2) * 12;
  ctx.save();
  ctx.translate(s2x, s2y);
  ctx.scale(-0.4, 0.4);
  // Dragon body
  ctx.beginPath();
  ctx.ellipse(0, 0, 35, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.ellipse(30, -8, 12, 9, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  const wingFlap = Math.sin(f * 0.12) * 15;
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.quadraticCurveTo(-20, -30 - wingFlap, -40, -20 - wingFlap);
  ctx.quadraticCurveTo(-25, -10, -5, -5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, -8);
  ctx.quadraticCurveTo(15, -28 - wingFlap, 30, -18 - wingFlap);
  ctx.quadraticCurveTo(18, -8, 5, -5);
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.quadraticCurveTo(-50, 5, -55, -5);
  ctx.quadraticCurveTo(-48, 2, -30, 3);
  ctx.fill();
  // Rider
  ctx.beginPath();
  ctx.ellipse(5, -20, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -32, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTitleStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const outerX = x + Math.cos(angle) * size;
    const outerY = y + Math.sin(angle) * size;
    const innerAngle = angle + Math.PI / 5;
    const innerX = x + Math.cos(innerAngle) * size * 0.4;
    const innerY = y + Math.sin(innerAngle) * size * 0.4;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
}
