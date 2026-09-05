/**
 * 방탈출 게임의 소리. 전부 Web Audio API로 즉석에서 만들어 낸다 — 오디오 파일 없음.
 *
 * iOS는 AudioContext가 suspended 상태로 태어나고, 진짜 사용자 제스처
 * (합성 이벤트가 아닌 native touchend/click) 안에서만 resume이 먹는다.
 * 그래서 unlock 리스너를 document에 직접 붙인다.
 */

/** 바닥 재질별 발소리 */
export type StepSound =
  | "stone"
  | "plank"
  | "plated"
  | "marble"
  | "shingle"
  | "water"
  | "ice"
  | "grass";

export type SFX =
  | "step"
  | "uiTap"
  | "uiConfirm"
  | "uiBack"
  | "panelOpen"
  | "panelClose"
  | "ghostTalk"
  | "pickup"
  | "chestOpen"
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
  | "stageClear"
  // 보스 대결
  | "bossAppear"
  | "bossStart"
  | "bossThrow"
  | "bossLand"
  | "bossHit"
  | "bossWin"
  | "bossLose";

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** 배경음악과 효과음을 따로 조절할 수 있게 갈래를 나눠 둔다. */
let bgmBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
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

  // 배경음악은 효과음보다 확실히 작아야 대사와 소리가 묻히지 않는다
  bgmBus = ctx.createGain();
  bgmBus.gain.value = 0.34;
  bgmBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** 배경음악 모듈이 쓰는 출력. music.ts에서만 쓴다. */
export function audioBus(): { ctx: AudioContext; bgm: GainNode } | null {
  const c = ensureCtx();
  if (!c || !bgmBus) return null;
  return { ctx: c, bgm: bgmBus };
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

/** 숫자 자물쇠는 누른 숫자마다 음이 달라서, 귀로도 몇 자리 눌렀는지 알 수 있다. */
export function playKeypad(digit: string): void {
  const n = Number(digit);
  const freq = Number.isFinite(n) ? 440 * Math.pow(2, n / 12) : 660;
  tone({ freq, dur: 0.08, type: "square", gain: 0.12 });
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
  if (!c || !sfxBus) return;
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
  g.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.12, delay = 0, cutoff = 1400, highpass = false) {
  const c = ensureCtx();
  if (!c || !sfxBus) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  const lp = c.createBiquadFilter();
  lp.type = highpass ? "highpass" : "lowpass";
  lp.frequency.value = cutoff;
  src.connect(lp);
  lp.connect(g);
  g.connect(sfxBus);
  src.start(c.currentTime + delay);
}

/**
 * 밟는 바닥에 따라 발소리가 달라진다.
 * 물에서는 첨벙, 얼음에서는 스르륵, 철판에서는 텅 — 같은 걸음도 방마다 다르게 들린다.
 */
export function playStep(surface: StepSound): void {
  switch (surface) {
    case "stone":
      noise(0.05, 0.05, 0, 900);
      tone({ freq: 150, dur: 0.04, type: "triangle", gain: 0.05 });
      break;
    case "plank":
      // 나무는 속이 빈 소리가 난다
      noise(0.04, 0.035, 0, 700);
      tone({ freq: 190, to: 150, dur: 0.07, type: "triangle", gain: 0.07 });
      break;
    case "plated":
      tone({ freq: 880, to: 660, dur: 0.05, type: "square", gain: 0.05 });
      noise(0.04, 0.03, 0, 3000, true);
      break;
    case "marble":
      tone({ freq: 1250, dur: 0.035, type: "sine", gain: 0.06 });
      noise(0.03, 0.025, 0, 4000, true);
      break;
    case "shingle":
      noise(0.06, 0.05, 0, 1200);
      break;
    case "water":
      // 첨벙 — 높은 쪽 잡음이 길게 흩어진다
      noise(0.16, 0.09, 0, 1200, true);
      tone({ freq: 420, to: 180, dur: 0.12, type: "sine", gain: 0.05 });
      break;
    case "ice":
      tone({ freq: 700, to: 1500, dur: 0.09, type: "sine", gain: 0.05 });
      noise(0.05, 0.02, 0, 5000, true);
      break;
    case "grass":
      noise(0.09, 0.035, 0, 2600, true);
      break;
  }
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
    case "uiTap":
      tone({ freq: 660, dur: 0.06, type: "sine", gain: 0.12 });
      break;
    case "uiConfirm":
      // 두 음 올라가며 "정했다"는 느낌
      tone({ freq: 587.33, dur: 0.1, type: "triangle", gain: 0.16 });
      tone({ freq: 880, dur: 0.18, type: "triangle", gain: 0.16, delay: 0.08 });
      break;
    case "uiBack":
      tone({ freq: 660, dur: 0.09, type: "sine", gain: 0.12 });
      tone({ freq: 440, dur: 0.14, type: "sine", gain: 0.12, delay: 0.07 });
      break;
    case "panelOpen":
      // 확대되는 느낌 — 낮은 데서 높은 데로 훅
      tone({ freq: 300, to: 900, dur: 0.16, type: "sine", gain: 0.1 });
      noise(0.12, 0.04, 0, 2400, true);
      break;
    case "panelClose":
      tone({ freq: 800, to: 320, dur: 0.14, type: "sine", gain: 0.09 });
      break;
    case "ghostTalk":
      // 유령이 말할 때 나는 흐물흐물한 소리
      tone({ freq: 520, to: 620, dur: 0.1, type: "sine", gain: 0.1 });
      tone({ freq: 600, to: 500, dur: 0.12, type: "sine", gain: 0.09, delay: 0.09 });
      tone({ freq: 560, to: 640, dur: 0.12, type: "sine", gain: 0.08, delay: 0.19 });
      break;
    case "pickup":
      // 열쇠를 손에 넣는 순간 — 반짝이는 세 음
      tone({ freq: 1046.5, dur: 0.1, type: "triangle", gain: 0.18 });
      tone({ freq: 1318.5, dur: 0.1, type: "triangle", gain: 0.16, delay: 0.08 });
      tone({ freq: 1567.98, dur: 0.26, type: "triangle", gain: 0.18, delay: 0.16 });
      break;
    case "chestOpen":
      // 나무 뚜껑이 삐걱 열리는 소리
      noise(0.3, 0.07, 0, 900);
      tone({ freq: 160, to: 320, dur: 0.32, type: "sawtooth", gain: 0.07 });
      tone({ freq: 784, dur: 0.2, type: "sine", gain: 0.1, delay: 0.24 });
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
    // --- 보스 대결 -------------------------------------------------------
    case "bossAppear":
      // 뿅— 하고 위에서 떨어지는 소리. 무섭기보다 웃겨야 한다.
      tone({ freq: 300, to: 90, dur: 0.34, type: "sawtooth", gain: 0.16 });
      tone({ freq: 160, to: 620, dur: 0.18, type: "square", gain: 0.12, delay: 0.3 });
      noise(0.2, 0.08, 0.28, 800);
      break;
    case "bossStart":
      // 삐— 시작 신호
      tone({ freq: 880, dur: 0.14, type: "square", gain: 0.18 });
      tone({ freq: 1318.5, dur: 0.26, type: "square", gain: 0.18, delay: 0.12 });
      break;
    case "bossThrow":
      // 휙 — 던지는 바람 소리
      noise(0.14, 0.06, 0, 2600, true);
      tone({ freq: 520, to: 900, dur: 0.12, type: "sine", gain: 0.07 });
      break;
    case "bossLand":
      // 툭 — 빗나간 눈덩이가 바닥에 터진다
      noise(0.1, 0.05, 0, 1100);
      tone({ freq: 190, to: 120, dur: 0.09, type: "triangle", gain: 0.06 });
      break;
    case "bossHit":
      // 퍽! 맞았다 — 낮고 짧게, 아프게 들리지 않을 만큼만
      noise(0.18, 0.12, 0, 700);
      tone({ freq: 260, to: 110, dur: 0.2, type: "square", gain: 0.16 });
      break;
    case "bossWin":
      // 이겼다 — 올라가는 세 음
      [659.25, 880, 1318.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.26, type: "square", gain: 0.2, delay: i * 0.11 }),
      );
      break;
    case "bossLose":
      // 아쉽다 — 미끄러져 내려가는 소리 (혼내는 소리가 아니라 장난스럽게)
      tone({ freq: 520, to: 200, dur: 0.4, type: "triangle", gain: 0.16 });
      tone({ freq: 260, to: 130, dur: 0.3, type: "sine", gain: 0.1, delay: 0.18 });
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
