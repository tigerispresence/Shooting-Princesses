/**
 * 방탈출 게임의 소리. 전부 Web Audio API로 즉석에서 만들어 낸다 — 오디오 파일 없음.
 *
 * iOS는 AudioContext가 suspended 상태로 태어나고, 진짜 사용자 제스처
 * (합성 이벤트가 아닌 native touchend/click) 안에서만 resume이 먹는다.
 * 그래서 unlock 리스너를 document에 직접 붙인다.
 */

export type SFX =
  | "step"
  | "bump"
  | "examine"
  | "found"
  | "right"
  | "wrong"
  | "push"
  | "boxSet"
  | "flame"
  | "blowOut"
  | "doorOpen"
  | "roomClear"
  | "stageClear";

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  }
  const AC =
    window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** 첫 터치/클릭에서 오디오를 깨운다. 한 번 성공하면 스스로 떨어진다. */
export function setupAudioUnlock(): () => void {
  if (typeof document === "undefined") return () => {};
  const unlock = () => {
    const c = ensureCtx();
    if (!c) return;
    // 무음 버퍼를 한 번 재생해야 iOS가 진짜로 열린다.
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    void c.resume().catch(() => {});
    if (c.state === "running") detach();
  };
  const detach = () => {
    document.removeEventListener("touchend", unlock);
    document.removeEventListener("click", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("touchend", unlock);
  document.addEventListener("click", unlock);
  document.addEventListener("keydown", unlock);
  return detach;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOpts {
  freq: number;
  /** 끝 주파수 (미끄러지는 소리용) */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur, type = "square", gain = 0.18, delay = 0 }: ToneOpts) {
  const c = ensureCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  // 짧은 어택 + 지수 감쇠. 클릭 잡음 없이 통통 튀는 소리가 난다.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.12, delay = 0) {
  const c = ensureCtx();
  if (!c || !master) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  src.connect(lp);
  lp.connect(g);
  g.connect(master);
  src.start(c.currentTime + delay);
}

/** 바닥 종 네 개. 각각 다른 음이라 귀로도 순서를 외울 수 있다. */
const BELL_FREQS = [523.25, 659.25, 783.99, 1046.5]; // 도 미 솔 높은도

export function playBell(index: number): void {
  const f = BELL_FREQS[index] ?? 523.25;
  tone({ freq: f, dur: 0.42, type: "triangle", gain: 0.22 });
  tone({ freq: f * 2, dur: 0.3, type: "sine", gain: 0.09 });
}

export function playSfx(name: SFX): void {
  switch (name) {
    case "step":
      noise(0.05, 0.05);
      break;
    case "bump":
      tone({ freq: 150, to: 90, dur: 0.12, type: "square", gain: 0.12 });
      break;
    case "examine":
      tone({ freq: 880, dur: 0.08, type: "sine", gain: 0.12 });
      break;
    case "found":
      tone({ freq: 659.25, dur: 0.12, type: "square" });
      tone({ freq: 987.77, dur: 0.16, type: "square", delay: 0.11 });
      tone({ freq: 1318.5, dur: 0.28, type: "square", delay: 0.22 });
      break;
    case "right":
      tone({ freq: 783.99, dur: 0.12, type: "triangle", gain: 0.2 });
      tone({ freq: 1046.5, dur: 0.24, type: "triangle", gain: 0.2, delay: 0.1 });
      break;
    case "wrong":
      tone({ freq: 233.08, dur: 0.16, type: "sawtooth", gain: 0.12 });
      tone({ freq: 174.61, dur: 0.26, type: "sawtooth", gain: 0.12, delay: 0.14 });
      break;
    case "push":
      noise(0.18, 0.1);
      tone({ freq: 120, to: 80, dur: 0.18, type: "triangle", gain: 0.1 });
      break;
    case "boxSet":
      tone({ freq: 1046.5, dur: 0.14, type: "sine", gain: 0.2 });
      tone({ freq: 1567.98, dur: 0.22, type: "sine", gain: 0.14, delay: 0.09 });
      break;
    case "flame":
      // 확— 하고 불이 붙는 소리
      noise(0.22, 0.09);
      tone({ freq: 320, to: 760, dur: 0.2, type: "triangle", gain: 0.14 });
      tone({ freq: 960, dur: 0.16, type: "sine", gain: 0.1, delay: 0.1 });
      break;
    case "blowOut":
      // 후— 하고 촛불이 한꺼번에 꺼지는 소리
      noise(0.34, 0.12);
      tone({ freq: 420, to: 120, dur: 0.34, type: "triangle", gain: 0.12 });
      break;
    case "doorOpen":
      tone({ freq: 200, to: 520, dur: 0.5, type: "triangle", gain: 0.16 });
      noise(0.4, 0.07);
      break;
    case "roomClear":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.24, type: "square", gain: 0.16, delay: i * 0.1 }),
      );
      break;
    case "stageClear":
      // 짧은 승리 팡파르
      [
        [523.25, 0],
        [659.25, 0.12],
        [783.99, 0.24],
        [1046.5, 0.36],
        [783.99, 0.52],
        [1046.5, 0.64],
        [1318.5, 0.78],
      ].forEach(([f, d]) =>
        tone({ freq: f, dur: 0.3, type: "square", gain: 0.18, delay: d }),
      );
      [261.63, 329.63, 392, 523.25].forEach((f, i) =>
        tone({ freq: f, dur: 0.45, type: "triangle", gain: 0.1, delay: i * 0.24 }),
      );
      break;
  }
}
