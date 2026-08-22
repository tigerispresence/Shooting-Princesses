import { drawGhost, drawProp, roundRect, star } from "./sprites";
import type { PropArt, Reveal } from "./types";

/**
 * 물건을 코앞까지 당겨 본 그림.
 *
 * 지도 위에 그리는 스프라이트를 그대로 크게 키운 다음, 확대해야 비로소 보이는
 * 것들(먼지, 긁힌 자국, 숨겨진 숫자)을 위에 덧그린다. 스프라이트가 전부 벡터
 * 도형이라 몇 배로 키워도 뭉개지지 않는다.
 */

/** 스프라이트가 대략 ±16px을 쓰므로, 이 배율이면 화면을 알맞게 채운다. */
const ZOOM_BASE = 52;

function spotlight(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h * 0.44, 8, w / 2, h * 0.44, w * 0.75);
  g.addColorStop(0, "#42305c");
  g.addColorStop(0.55, "#2a1c40");
  g.addColorStop(1, "#150d24");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 빛줄기 속을 떠다니는 먼지. "확대해서 들여다보는 중"이라는 느낌을 준다. */
function dust(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  ctx.save();
  for (let i = 0; i < 26; i++) {
    // 자리를 인덱스에서 뽑아 매 프레임 튀지 않게 고정하고, 천천히 떠오르게만 한다
    const seed = i * 7919;
    const x = (seed % (w - 20)) + 10;
    const drift = Math.sin(t / 1400 + i) * 9;
    const y = h - (((seed / 3 + t / 26) % (h + 40)) - 20);
    ctx.globalAlpha = 0.12 + Math.abs(Math.sin(t / 900 + i * 1.7)) * 0.3;
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(x + drift, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 찾아낸 숫자 — 확대해야 보인다는 게 이 방 퍼즐의 핵심이라 큼직하게 띄운다. */
function drawDigit(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  value: string,
  label: string,
): void {
  const cx = w / 2;
  const cy = h * 0.46;
  const pulse = 1 + Math.sin(t / 260) * 0.04;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);

  ctx.fillStyle = "rgba(10,6,18,0.62)";
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -t / 45;
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#fff3c4";
  ctx.font = "bold 68px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, cx, cy + 3);
  ctx.restore();

  ctx.save();
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ly = h * 0.88;
  const lw = ctx.measureText(label).width + 26;
  ctx.fillStyle = "rgba(10,6,18,0.78)";
  roundRect(ctx, cx - lw / 2, ly - 14, lw, 28, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,209,102,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.fillText(label, cx, ly + 1);
  ctx.restore();
}

/** 액자 뒤에서 툭 떨어진 열쇠 */
function drawKey(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const cx = w * 0.68;
  const cy = h * 0.7 + Math.sin(t / 420) * 4;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.5 + Math.sin(t / 900) * 0.06);

  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 24;
  ctx.strokeStyle = "#ffd166";
  ctx.fillStyle = "#ffd166";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(-26, 0, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(30, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(30, 14);
  ctx.moveTo(18, 0);
  ctx.lineTo(18, 11);
  ctx.stroke();
  ctx.restore();

  // 반짝임
  ctx.save();
  ctx.shadowColor = "#fff3c4";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#fff3c4";
  for (let i = 0; i < 3; i++) {
    const a = t / 500 + (i * Math.PI * 2) / 3;
    const r = 46 + Math.sin(t / 300 + i) * 8;
    const s = 5 + Math.sin(t / 220 + i * 2) * 2;
    star(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, s, s * 0.4, 4);
    ctx.fill();
  }
  ctx.restore();
}

/** 그림 종류마다, 가까이서만 보이는 자잘한 흔적 */
function detailPass(
  ctx: CanvasRenderingContext2D,
  art: PropArt,
  w: number,
  h: number,
  t: number,
): void {
  ctx.save();
  switch (art) {
    case "armor": {
      // 가슴팍의 발톱 자국 세 줄
      ctx.strokeStyle = "rgba(20,14,30,0.5)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.44 + i * 13, h * 0.56);
        ctx.lineTo(w * 0.5 + i * 13, h * 0.68);
        ctx.stroke();
      }
      break;
    }
    case "crate":
    case "desk": {
      // 나뭇결
      ctx.strokeStyle = "rgba(20,14,30,0.22)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.24, h * 0.36 + i * 15);
        ctx.bezierCurveTo(
          w * 0.42,
          h * 0.33 + i * 15,
          w * 0.6,
          h * 0.4 + i * 15,
          w * 0.76,
          h * 0.36 + i * 15,
        );
        ctx.stroke();
      }
      break;
    }
    case "mirror": {
      // 김이 서린 자국
      ctx.globalAlpha = 0.5 + Math.sin(t / 800) * 0.12;
      const g = ctx.createRadialGradient(w / 2, h * 0.46, 6, w / 2, h * 0.46, w * 0.3);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.46, w * 0.26, h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "note": {
      // 촛불에 그을린 가장자리
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#5b3a2a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.74);
      ctx.quadraticCurveTo(w / 2, h * 0.8, w * 0.7, h * 0.72);
      ctx.stroke();
      break;
    }
    case "portrait": {
      // 액자를 감싼 거미줄
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#e8e3f5";
      ctx.lineWidth = 1.6;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(w * 0.16, h * 0.16, i * 22, 0, Math.PI / 2);
        ctx.stroke();
      }
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(w * 0.16, h * 0.16);
        ctx.lineTo(w * 0.16 + Math.cos(a) * 68, h * 0.16 + Math.sin(a) * 68);
        ctx.stroke();
      }
      break;
    }
    case "plant": {
      // 파헤쳐진 흙
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#3a2a1c";
      for (let i = 0; i < 14; i++) {
        const x = w * 0.36 + ((i * 37) % Math.round(w * 0.28));
        const y = h * 0.62 + ((i * 53) % 26);
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "candle": {
      // 흘러내린 촛농
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#fff0f6";
      for (let i = 0; i < 3; i++) {
        const x = w * 0.44 + i * 12;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.5);
        ctx.quadraticCurveTo(x + 4, h * 0.6 + i * 8, x, h * 0.66 + i * 8);
        ctx.quadraticCurveTo(x - 4, h * 0.6 + i * 8, x, h * 0.5);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

export function drawCloseup(
  ctx: CanvasRenderingContext2D,
  art: PropArt,
  w: number,
  h: number,
  t: number,
  reveal: Reveal | null,
  active = true,
  tint: string | null = null,
  burn = 1,
): void {
  spotlight(ctx, w, h);

  // 바닥 그림자 — 물건이 공중에 떠 보이지 않게
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.82, w * 0.28, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const k = w / ZOOM_BASE;
  ctx.save();
  ctx.translate(w / 2, h * 0.46);
  ctx.scale(k, k);
  ctx.translate(-w / 2, -h * 0.46);
  if (art === "ghost") drawGhost(ctx, w / 2, h * 0.46, t);
  else drawProp(ctx, art, w / 2, h * 0.46, t, "#ffd166", { active, tint, burn });
  ctx.restore();

  detailPass(ctx, art, w, h, t);

  if (reveal?.kind === "digit") drawDigit(ctx, w, h, t, reveal.value, reveal.label);
  else if (reveal?.kind === "key") drawKey(ctx, w, h, t);

  dust(ctx, w, h, t);
  vignette(ctx, w, h);

  // 돋보기 테두리 — 지금 확대해서 보고 있다는 표시
  ctx.save();
  ctx.strokeStyle = "rgba(255,209,102,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.stroke();
  ctx.restore();
}
