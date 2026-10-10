/**
 * 사탕비 마을 canvas drawing (1280×720 logical). Reads RainState, never mutates it.
 */
import { compose, isPrefix } from "./hangul";
import { FONT_STACK, RAIN, RAIN_BACKGROUNDS, RAIN_LEVELS, COMBO_SHOW } from "./constants";
import { drawCandy, drawHouse, drawJar, drawPpu, drawUmbrella, drawUmbrellaBuddy, heartPath, roundRect, starPath } from "./sprites";
import { houseX } from "./engine";
import type { RainState } from "./types";

type Ctx = CanvasRenderingContext2D;

export interface RenderOpts {
  animal: number;
  umbrella: number;
  house: number;
  name: string;
  family: { bridge: boolean; carousel: boolean; fireworks: boolean };
}

const JAR_X = 250;
const JAR_Y = 28;

const font = (px: number, bold = true) => `${bold ? "bold " : ""}${px}px ${FONT_STACK}`;

export function measureLabel(ctx: Ctx, text: string): number {
  ctx.font = font(RAIN.labelFont);
  return ctx.measureText(text).width;
}

interface Theme {
  sky: [string, string];
  ground: string;
  groundTop: string;
  night?: boolean;
}

const THEMES: Theme[] = [
  { sky: ["#BDE6FF", "#FFF3FA"], ground: "#9ADB8A", groundTop: "#B8EBA6" }, // 아침 쿠키 마을
  { sky: ["#D7C9FF", "#FFE9F5"], ground: "#FFB3D1", groundTop: "#FFD1E3" }, // 젤리 언덕
  { sky: ["#C8F1FF", "#FFF9E6"], ground: "#FFE3A3", groundTop: "#FFF0C7" }, // 무지개 사탕길
  { sky: ["#FFE3CC", "#FFF5EC"], ground: "#9B6A4A", groundTop: "#B98563" }, // 초콜릿 강
  { sky: ["#E2FFF4", "#FFF0F7"], ground: "#B9E8C9", groundTop: "#D6F5E0" }, // 마카롱 정원
  { sky: ["#FFC3A8", "#FFE7D1"], ground: "#F2C77E", groundTop: "#F8DCA6" }, // 노을 푸딩 호수
  { sky: ["#6A6FB8", "#B49BD8"], ground: "#6E9B78", groundTop: "#86B591", night: true }, // 별빛 쿠키 마을
];

function drawBackground(ctx: Ctx, s: RainState, o: RenderOpts) {
  const th = THEMES[RAIN_LEVELS[s.level].bg];
  const g = ctx.createLinearGradient(0, 0, 0, RAIN.groundY);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  const t = s.time;
  const bg = RAIN_LEVELS[s.level].bg;

  if (th.night) {
    for (let i = 0; i < 40; i++) {
      const x = (i * 211) % 1280;
      const y = 60 + ((i * 97) % 380);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.save();
      ctx.translate(x, y);
      starPath(ctx, 3 + (i % 3), 0.45);
      ctx.fillStyle = "#FFF6C8";
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(1120, 140, 34, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF3C4";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1135, 130, 30, 0, Math.PI * 2);
    ctx.fillStyle = th.sky[0];
    ctx.fill();
  } else {
    // soft clouds
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 + t * 6) % 1500) - 100;
      const y = 170 + (i % 3) * 70;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.arc(x + 30, y - 12, 30, 0, Math.PI * 2);
      ctx.arc(x + 62, y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // theme scenery behind the houses
  ctx.save();
  if (bg === 1) {
    const cols = ["#FF9FC0", "#C9B6FF", "#9EF0D0"];
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 260 - 40, RAIN.groundY - 10, 190, 120, 0, Math.PI, 0);
      ctx.fillStyle = cols[i % 3];
      ctx.globalAlpha = 0.6;
      ctx.fill();
    }
  } else if (bg === 2) {
    const cols = ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF", "#C9B6FF"];
    cols.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(640, RAIN.groundY + 60, 620 - i * 22, Math.PI, 0);
      ctx.lineWidth = 20;
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
    });
  } else if (bg === 3) {
    ctx.fillStyle = "#7A4A2E";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, RAIN.groundY - 40);
    for (let x = 0; x <= 1280; x += 40) ctx.lineTo(x, RAIN.groundY - 40 + Math.sin(x / 80 + t) * 6);
    ctx.lineTo(1280, RAIN.groundY - 10);
    ctx.lineTo(0, RAIN.groundY - 10);
    ctx.fill();
  } else if (bg === 4) {
    const cols = ["#FFB3D1", "#C9B6FF", "#9EF0D0", "#FFE3A3"];
    for (let i = 0; i < 14; i++) {
      const x = i * 96 + 30;
      ctx.globalAlpha = 0.75;
      roundRect(ctx, x - 26, RAIN.groundY - 70, 52, 18, 9);
      ctx.fillStyle = cols[i % 4];
      ctx.fill();
      roundRect(ctx, x - 26, RAIN.groundY - 50, 52, 18, 9);
      ctx.fill();
    }
  } else if (bg === 5) {
    ctx.fillStyle = "#FFD98A";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(640, RAIN.groundY - 18, 560, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#C9853A";
    ctx.beginPath();
    ctx.ellipse(640, RAIN.groundY - 30, 520, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(1000, 260, 60, 0, Math.PI * 2);
    ctx.fillStyle = "#FF9E7A";
    ctx.fill();
  }
  ctx.restore();

  if (o.family.bridge) {
    const cols = ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF", "#C9B6FF"];
    cols.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(640, RAIN.groundY, 330 - i * 9, Math.PI, 0);
      ctx.lineWidth = 9;
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  if (o.family.carousel) drawCarousel(ctx, 640, RAIN.groundY - 6, t);

  // ground
  ctx.fillStyle = th.ground;
  ctx.fillRect(0, RAIN.groundY, 1280, 720 - RAIN.groundY);
  ctx.fillStyle = th.groundTop;
  ctx.fillRect(0, RAIN.groundY, 1280, 10);

  if (th.night) {
    ctx.fillStyle = "rgba(30,20,60,0.12)";
    ctx.fillRect(0, 0, 1280, 720);
  }
}

function drawCarousel(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#FFB3D1";
  ctx.beginPath();
  ctx.moveTo(-60, -90);
  ctx.lineTo(0, -125);
  ctx.lineTo(60, -90);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-55, -92, 110, 6);
  for (let i = 0; i < 4; i++) {
    const a = t * 1.2 + (i * Math.PI) / 2;
    const px = Math.cos(a) * 45;
    const depth = Math.sin(a);
    ctx.strokeStyle = "#E6C46B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, -86);
    ctx.lineTo(px, -20);
    ctx.stroke();
    ctx.save();
    ctx.translate(px, -40 + Math.sin(t * 3 + i) * 5);
    ctx.scale(0.8 + depth * 0.1, 0.8 + depth * 0.1);
    drawCandy(ctx, ["ball", "bear", "caramel", "lolli"][i] as "ball", ["#8FD3FF", "#C9B6FF", "#9EF0D0", "#FFB3D1"][i], 24);
    ctx.restore();
  }
  ctx.fillStyle = "#C9B6FF";
  roundRect(ctx, -62, -16, 124, 16, 6);
  ctx.fill();
  ctx.restore();
}

function drawHouses(ctx: Ctx, s: RainState, o: RenderOpts) {
  const night = THEMES[RAIN_LEVELS[s.level].bg].night;
  for (let i = 0; i < RAIN.houseCount; i++) {
    const x = houseX(i);
    let y = RAIN.houseY + 62;
    const jump = s.houseJump[i];
    const sticky = s.houses[i];
    let face: "smile" | "yuck" | "laugh" | "wow" = sticky ? "yuck" : "smile";
    if (jump > 0) {
      y -= Math.sin((jump / RAIN.houseThanks) * Math.PI) * 18;
      face = "laugh";
    }
    if (s.phase === "success" || (s.phase === "panel" && s.caught >= RAIN_LEVELS[s.level].goal) || s.phase === "ending") {
      if (!sticky || s.phase === "ending") {
        y -= Math.abs(Math.sin(s.time * 7 + i)) * 16;
        face = "laugh";
      }
    }
    if (s.phase === "fail" || (s.phase === "panel" && s.caught < RAIN_LEVELS[s.level].goal)) face = "laugh";
    ctx.save();
    ctx.translate(x, y);
    drawHouse(ctx, o.house, RAIN.houseW, { sticky: sticky && s.phase !== "ending", face, night, t: s.time });
    ctx.restore();
    if (jump > 0) bubble(ctx, x, y - 120, "고마워!", 18);
    if (s.heartsT > 0) {
      ctx.save();
      ctx.translate(x, y - 130 - (1 - s.heartsT) * 30);
      ctx.globalAlpha = Math.min(1, s.heartsT * 2);
      heartPath(ctx, 26);
      ctx.fillStyle = "#FF6F91";
      ctx.fill();
      ctx.restore();
    }
  }
  // syrup splats on the ground
  for (const sp of s.splats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, 1 - sp.t / 8);
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.ellipse(sp.x, RAIN.groundY + 4, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function bubble(ctx: Ctx, x: number, y: number, text: string, px: number) {
  ctx.save();
  ctx.font = font(px);
  const w = ctx.measureText(text).width + 24;
  const h = px + 16;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#E3C7E8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h / 2 - 1);
  ctx.lineTo(x, y + h / 2 + 9);
  ctx.lineTo(x + 6, y + h / 2 - 1);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#6b4f7a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawCandies(ctx: Ctx, s: RainState) {
  const input = s.input;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const c of s.candies) {
    const alpha = c.fading > 0 ? Math.max(0, Math.min(1, c.fading)) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(c.x, c.y);
    const prefix = input.length > 0 && c.fading <= 0 && isPrefix(input, c.keys);
    // balloon while floating
    if (s.floatT > 0) {
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -RAIN.labelH / 2 - 30);
      ctx.lineTo(18, -RAIN.labelH / 2 - 78);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(18, -RAIN.labelH / 2 - 92, 13, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FF8FB8";
      ctx.fill();
    }
    // candy art (sways ±6°)
    ctx.save();
    ctx.translate(0, -RAIN.labelH / 2 - 18);
    ctx.rotate(((RAIN.swayDeg * Math.PI) / 180) * Math.sin((s.time * Math.PI * 2) / RAIN.swayPeriod + c.phase));
    drawCandy(ctx, c.gold ? "star" : c.shape, c.color, RAIN.candyArt, s.time + c.phase);
    ctx.restore();
    // label (never tilted)
    const w = c.w;
    roundRect(ctx, -w / 2, -RAIN.labelH / 2, w, RAIN.labelH, RAIN.labelH / 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(80,40,90,0.18)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = "transparent";
    if (c.gold) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#FFD43B";
      ctx.stroke();
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.color;
      ctx.stroke();
    }
    if (prefix) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      roundRect(ctx, -w / 2 - 4, -RAIN.labelH / 2 - 4, w + 8, RAIN.labelH + 8, RAIN.labelH / 2 + 4);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#B88CFF";
      ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(s.time * 10));
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    ctx.font = font(RAIN.labelFont);
    ctx.fillStyle = "#4a3a5a";
    ctx.fillText(c.word, 0, 2);
    ctx.restore();
  }
}

function drawPlayerUmbrella(ctx: Ctx, s: RainState, o: RenderOpts) {
  const u = s.umbrella;
  // tails at combo 5 / 10
  if (s.combo >= COMBO_SHOW) {
    for (let i = 0; i < 6; i++) {
      const x = u.x - (i + 1) * 10 * Math.sign(u.to - u.from || 1);
      const y = RAIN.umbrellaY - 30 + Math.sin(s.time * 8 + i) * 4;
      ctx.globalAlpha = 0.6 - i * 0.08;
      if (s.combo >= 10) {
        ctx.fillStyle = ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF", "#C9B6FF"][i];
        ctx.fillRect(x - 5, y - 4, 10, 8);
      } else {
        ctx.save();
        ctx.translate(x, y);
        starPath(ctx, 4, 0.4, 4);
        ctx.fillStyle = "#FFF";
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(u.x, RAIN.umbrellaY - 12);
  drawUmbrellaBuddy(ctx, o.animal, o.umbrella, RAIN.umbrellaW, 0.6 + 0.4 * u.open, s.time);
  ctx.restore();

  if (s.bigUmbrellaT > 0) {
    const k = s.bigUmbrellaT / 1.2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.translate(640, 330 + (1 - k) * -40);
    drawUmbrella(ctx, o.umbrella, 900 * (0.6 + 0.4 * Math.min(1, (1 - k) * 4)), 1, s.time);
    ctx.restore();
  }
}

function drawPpuCloud(ctx: Ctx, s: RainState) {
  const p = s.ppu;
  ctx.save();
  ctx.translate(p.x, 96);
  const sneeze = Math.max(0, p.sneeze) / RAIN.ppuSneeze;
  drawPpu(ctx, RAIN.ppuW * 0.75, {
    sneeze: Math.min(1, sneeze),
    heart: p.heartT > 0,
    sorry: s.phase === "fail" || (s.phase === "panel" && s.caught < RAIN_LEVELS[s.level].goal),
    happy: s.phase === "success",
    healthy: s.phase === "ending",
    t: s.time,
  });
  ctx.restore();
  if (p.sneeze > 0 && s.phase === "play") bubble(ctx, p.x + 120, 70, "에취!", 20);
  if (p.speechT > 0 && p.speech) bubble(ctx, p.x - 140, 74, p.speech, 20);
}

function drawHud(ctx: Ctx, s: RainState) {
  const lv = RAIN_LEVELS[s.level];
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(0, 0, 1280, RAIN.hudH);
  ctx.textBaseline = "middle";
  // score
  ctx.textAlign = "left";
  ctx.font = font(30);
  ctx.fillStyle = "#6b4f7a";
  ctx.fillText(s.score.toLocaleString("ko-KR"), 24, 29);
  if (s.combo >= COMBO_SHOW) {
    ctx.font = font(20);
    ctx.fillStyle = "#FF6F91";
    ctx.fillText(`콤보 ${s.combo}!`, 140, 30);
  }
  // jar
  ctx.save();
  ctx.translate(JAR_X, JAR_Y);
  drawJar(ctx, 44, Math.min(1, s.earned / 40), s.time);
  ctx.restore();
  ctx.font = font(22);
  ctx.fillStyle = "#6b4f7a";
  ctx.fillText(`${s.earned}`, JAR_X + 26, 30);
  // rainbow ×2 indicator
  let ix = 340;
  if (s.rainbowLeft > 0) {
    const cols = ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF"];
    cols.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(ix + 18, 40, 18 - i * 3, Math.PI, 0);
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    ctx.font = font(18);
    ctx.fillStyle = "#C46BFF";
    ctx.fillText(`×2 ${s.rainbowLeft}`, ix + 42, 30);
    ix += 100;
  }
  if (s.slowT > 0) {
    ctx.font = font(16);
    ctx.fillStyle = "#3aa86b";
    ctx.fillText(`달팽이 ${Math.ceil(s.slowT)}`, ix, 30);
  }

  // centre: level + progress
  ctx.textAlign = "center";
  ctx.font = font(22);
  ctx.fillStyle = "#6b4f7a";
  ctx.fillText(`${s.level + 1}단계`, 640, 17);
  const bw = 260;
  roundRect(ctx, 640 - bw / 2, 32, bw, 14, 7);
  ctx.fillStyle = "#EADCF2";
  ctx.fill();
  const f = Math.min(1, s.caught / lv.goal);
  if (f > 0) {
    roundRect(ctx, 640 - bw / 2, 32, Math.max(14, bw * f), 14, 7);
    ctx.fillStyle = "#FF8FB8";
    ctx.fill();
  }
  ctx.font = font(14);
  ctx.fillStyle = "#6b4f7a";
  ctx.fillText(`${Math.min(s.caught, lv.goal)} / ${lv.goal}`, 640 + bw / 2 + 34, 40);

  // houses
  for (let i = 0; i < RAIN.houseCount; i++) {
    const x = 980 + i * 34;
    ctx.save();
    ctx.translate(x, 46);
    ctx.globalAlpha = s.houses[i] ? 0.9 : 1;
    drawMiniHouse(ctx, s.houses[i]);
    ctx.restore();
  }
}

function drawMiniHouse(ctx: Ctx, sticky: boolean) {
  ctx.fillStyle = "#D9965A";
  ctx.fillRect(-11, -18, 22, 18);
  ctx.beginPath();
  ctx.moveTo(-14, -17);
  ctx.lineTo(0, -32);
  ctx.lineTo(14, -17);
  ctx.closePath();
  ctx.fillStyle = sticky ? "#FF78B4" : "#A0622D";
  ctx.fill();
  if (sticky) {
    ctx.fillStyle = "#FF78B4";
    ctx.fillRect(-10, -18, 4, 8);
    ctx.fillRect(2, -18, 4, 11);
  }
  ctx.fillStyle = "#8A5A3B";
  ctx.fillRect(-4, -9, 8, 9);
}

function drawInputBox(ctx: Ctx, s: RainState) {
  const shake = s.inputShake > 0 ? Math.sin(s.inputShake * 120) * 6 : 0;
  const x = RAIN.inputX - RAIN.inputW / 2 + shake;
  const y = RAIN.inputY - RAIN.inputH / 2;
  roundRect(ctx, x, y, RAIN.inputW, RAIN.inputH, RAIN.inputH / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#E7CFF0";
  ctx.stroke();
  const text = compose(s.input);
  const matches = s.input.length === 0 || s.candies.some((c) => c.fading <= 0 && isPrefix(s.input, c.keys));
  ctx.font = font(RAIN.inputFont);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = matches ? "#4a3a5a" : "#FF8FB0";
  ctx.fillText(text, RAIN.inputX + shake, RAIN.inputY + 2);
  const tw = ctx.measureText(text).width;
  if (Math.floor(s.time * 2) % 2 === 0) {
    ctx.fillStyle = "#B88CFF";
    ctx.fillRect(RAIN.inputX + tw / 2 + 3 + shake, RAIN.inputY - 15, 3, 30);
  }
  if (!text) {
    ctx.font = font(16, false);
    ctx.fillStyle = "#B9A9C6";
    ctx.fillText("사탕 낱말을 쳐요", RAIN.inputX, RAIN.inputY + 1);
  }
}

function drawFx(ctx: Ctx, s: RainState) {
  for (const q of s.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    if (q.star) {
      ctx.save();
      ctx.translate(q.x, q.y);
      starPath(ctx, q.size, 0.45, 4);
      ctx.fill();
      ctx.restore();
    } else ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  // candies flying to the jar on a parabola
  for (const f of s.flyers) {
    if (f.t < 0) {
      // name lollipop descending to the umbrella
      const k = 1 + f.t / 1.2;
      ctx.save();
      ctx.translate(f.x0, 120 + k * (RAIN.umbrellaY - 180));
      drawCandy(ctx, "lolli", f.color, 90, s.time);
      ctx.restore();
      continue;
    }
    const t = f.t;
    const x = f.x0 + (JAR_X - f.x0) * t;
    const y = f.y0 + (JAR_Y - f.y0) * t - Math.sin(t * Math.PI) * 120;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 - t * 0.5, 1 - t * 0.5);
    drawCandy(ctx, f.shape, f.color, f.big ? 60 : 30, s.time);
    ctx.restore();
  }
  for (const f of s.floats) {
    ctx.globalAlpha = Math.min(1, f.t / (f.max * 0.4));
    // a quick "pop" bounce as the number appears, then it settles to full size
    const age = Math.min(1, (f.max - f.t) / 0.22);
    const pop = age >= 1 ? 1 : 1 + 1.9 * (age - 1) ** 3 + 1.7 * (age - 1) ** 2;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(pop, pop);
    ctx.font = font(26);
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // bee cleaner
  if (s.bee) {
    const k = 1 - s.bee.t / 1.4;
    const tx = houseX(s.bee.target);
    const x = -40 + (tx + 40) * Math.min(1, k * 1.6);
    const y = RAIN.houseY - 80 + Math.sin(k * 30) * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#FFE066";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5b4636";
    ctx.fillRect(-4, -11, 4, 22);
    ctx.fillRect(5, -10, 3, 20);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-2, -16, 8, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(6, -15, 8, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // snail crawling while slowed
  if (s.slowT > 0) {
    const x = ((s.time * 40) % 1400) - 60;
    ctx.save();
    ctx.translate(x, 650);
    ctx.fillStyle = "#9EF0D0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-4, -12, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#C9B6FF";
    ctx.fill();
    ctx.restore();
  }
}

function drawBanners(ctx: Ctx, s: RainState) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (s.introT > 0 && s.phase === "play") {
    ctx.globalAlpha = Math.min(1, s.introT * 4);
    roundRect(ctx, 400, 260, 480, 90, 45);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.font = font(38);
    ctx.fillStyle = "#6b4f7a";
    ctx.fillText(`${s.level + 1}단계 · ${RAIN_BACKGROUNDS[RAIN_LEVELS[s.level].bg]}`, 640, 306);
    ctx.globalAlpha = 1;
  }
  if (s.banner) {
    const k = Math.min(1, s.banner.t * 3, (RAIN.bannerTime - s.banner.t) * 6 + 0.3);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k);
    roundRect(ctx, 400, 140, 480, 86, 24);
    ctx.fillStyle = "#FFF6C8";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#FFD43B";
    ctx.stroke();
    ctx.font = font(32);
    ctx.fillStyle = "#B07A00";
    ctx.fillText(s.banner.name, 640, 170);
    ctx.font = font(20, false);
    ctx.fillStyle = "#7A5A00";
    ctx.fillText(s.banner.desc, 640, 205);
    ctx.restore();
  }
}

function drawFireworks(ctx: Ctx, s: RainState) {
  for (let i = 0; i < 5; i++) {
    const t = (s.phaseT * 1.3 + i * 0.37) % 1.2;
    const cx = 200 + i * 220;
    const cy = 200 + (i % 2) * 80;
    for (let j = 0; j < 10; j++) {
      const a = (j * Math.PI * 2) / 10;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.translate(cx + Math.cos(a) * t * 90, cy + Math.sin(a) * t * 90);
      drawCandy(ctx, "ball", ["#FF8FB8", "#8FD3FF", "#9EF0D0", "#C9B6FF"][j % 4], 14);
      ctx.restore();
    }
  }
}

function drawEnding(ctx: Ctx, s: RainState, o: RenderOpts) {
  const t = s.endingT;
  const cols = ["#FF8FB8", "#FFB86B", "#FFE066", "#8EE6A0", "#7CC8FF", "#C9B6FF"];
  const k = Math.min(1, t / 1.5);
  cols.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(640, 520, 420 - i * 16, Math.PI, Math.PI + Math.PI * k);
    ctx.lineWidth = 16;
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  bubble(ctx, s.ppu.x, 180, "고마워! 이제 감기 다 나았어! 이건 진짜 선물이야~", 20);
  if (t > 1.2) {
    ctx.save();
    const pop = Math.min(1, (t - 1.2) * 3);
    ctx.translate(640, 330);
    ctx.scale(pop, pop);
    roundRect(ctx, -330, -50, 660, 100, 50);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FFD43B";
    ctx.stroke();
    ctx.font = font(44);
    ctx.fillStyle = "#FF6F91";
    ctx.fillText(`쿠키 마을의 영웅 ${o.name}!`, 0, 2);
    ctx.restore();
  }
  if (t > 2) {
    ctx.font = font(22);
    ctx.fillStyle = "#6b4f7a";
    ctx.fillText(`보너스 사탕 +${RAIN.endingBonus}`, 640, 420);
  }
}

export function renderRain(ctx: Ctx, s: RainState, o: RenderOpts): void {
  drawBackground(ctx, s, o);
  drawPpuCloud(ctx, s);
  drawHouses(ctx, s, o);
  drawCandies(ctx, s);
  drawPlayerUmbrella(ctx, s, o);
  if (s.phase === "success" && o.family.fireworks) drawFireworks(ctx, s);
  drawFx(ctx, s);
  drawHud(ctx, s);
  drawInputBox(ctx, s);
  drawBanners(ctx, s);
  if (s.phase === "ending") drawEnding(ctx, s, o);
}
