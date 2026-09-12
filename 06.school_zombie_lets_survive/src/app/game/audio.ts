/**
 * 소리 엔진. 오디오 파일은 하나도 없고 전부 Web Audio로 즉석에서 만든다.
 * 레시피는 `docs/reviews/musician.md` §2를 따른다.
 *
 * iOS는 AudioContext가 suspended로 태어나고 **진짜** 사용자 제스처
 * (native touchend/click) 안에서만 resume이 먹는다. 이 프로젝트에서 두 번 깨졌다.
 *
 * 음악(bgmBus)과 효과음(sfxBus)을 따로 끌 수 있다 — 이 게임은 소리가 정보를
 * 나르기 때문에 "음악만 끄기"가 기본 권장 조합이다.
 */

export type SFX =
  | "notice"
  | "alert"
  | "pickup"
  | "paper"
  | "lockerIn"
  | "lockerOut"
  | "chalkThrow"
  | "chalkLand"
  | "doorLock"
  | "knock"
  | "flashlight"
  | "friendWake"
  | "friendCaught"
  | "nearMiss"
  | "bossSpeech"
  | "bossCough"
  | "ingredientComplete"
  | "bell"
  | "uiTap"
  | "uiBack"
  | "matronClank"
  | "starPop"
  | "menuComplete"
  | "stageStart"
  | "alarmSet"
  | "exitOpen"
  | "ventOpen"
  | "ventCrawl"
  | "ventFound"
  | "sleep";

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
/** 사물함 안에서 배경음악에 거는 로우패스 */
let bgmFilter: BiquadFilterNode | null = null;
let bgmOn = true;
let sfxOn = true;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  bgmFilter = ctx.createBiquadFilter();
  bgmFilter.type = "lowpass";
  bgmFilter.frequency.value = 18000;
  bgmFilter.connect(master);

  bgmBus = ctx.createGain();
  bgmBus.gain.value = bgmOn ? 0.3 : 0;
  bgmBus.connect(bgmFilter);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxOn ? 1 : 0;
  sfxBus.connect(master);

  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** music.ts가 쓰는 출력 */
export function audioBus(): { ctx: AudioContext; bgm: GainNode } | null {
  const c = ensureCtx();
  if (!c || !bgmBus) return null;
  return { ctx: c, bgm: bgmBus };
}

/** 첫 터치/클릭에서 오디오를 깨운다. 성공하면 스스로 떨어진다. */
export function setupAudioUnlock(): () => void {
  if (typeof document === "undefined") return () => {};
  const unlock = () => {
    const c = ensureCtx();
    if (!c) return;
    // 무음 버퍼를 한 번 재생해야 iOS가 진짜로 열린다
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

export function setBgmOn(on: boolean): void {
  bgmOn = on;
  if (bgmBus && ctx) bgmBus.gain.setTargetAtTime(on ? 0.3 : 0, ctx.currentTime, 0.03);
}

export function setSfxOn(on: boolean): void {
  sfxOn = on;
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.03);
}

export function isBgmOn(): boolean {
  return bgmOn;
}

export function isSfxOn(): boolean {
  return sfxOn;
}

/** 사물함 안 — 곡은 그대로 두고 문틈으로 듣는 느낌만 준다 */
export function setMuffled(on: boolean): void {
  if (!bgmFilter || !ctx) return;
  bgmFilter.frequency.setTargetAtTime(on ? 1200 : 18000, ctx.currentTime, 0.08);
}

// --- 기본 합성 도구 --------------------------------------------------------

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 좌우 (−1 ~ 1) */
  pan?: number;
  /** 로우패스 컷오프 */
  cutoff?: number;
}

function tone(o: ToneOpts): void {
  const c = ensureCtx();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  const gain = o.gain ?? 0.16;
  osc.type = o.type ?? "square";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t0 + o.dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);

  let node: AudioNode = g;
  osc.connect(g);
  if (o.cutoff !== undefined) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.cutoff;
    node.connect(lp);
    node = lp;
  }
  if (o.pan !== undefined && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    node.connect(p);
    node = p;
  }
  node.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
}

interface NoiseOpts {
  dur: number;
  gain?: number;
  delay?: number;
  cutoff?: number;
  highpass?: boolean;
  band?: boolean;
  pan?: number;
  sweepTo?: number;
}

function noise(o: NoiseOpts): void {
  const c = ensureCtx();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const len = Math.max(1, Math.floor(c.sampleRate * o.dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = o.gain ?? 0.1;
  const f = c.createBiquadFilter();
  f.type = o.band ? "bandpass" : o.highpass ? "highpass" : "lowpass";
  f.frequency.setValueAtTime(o.cutoff ?? 1400, t0);
  if (o.sweepTo !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(o.sweepTo, 20), t0 + o.dur);
  }
  src.connect(f);
  f.connect(g);
  let node: AudioNode = g;
  if (o.pan !== undefined && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    node.connect(p);
    node = p;
  }
  node.connect(sfxBus);
  src.start(t0);
}

/**
 * 졸음 모티프 — 솔·미·도·라. 이 게임의 청각 정체성 (musician §4).
 * 속도와 음역만 바꿔 `?` 연출·게임오버·보스 연설 세 곳에서 다시 쓴다.
 */
const SLEEPY_MOTIF = [392, 329.63, 261.63, 220];

interface MotifOpts {
  /** 옥타브 이동. 1 = 위로 한 옥타브, -1 = 아래로 한 옥타브 */
  octave: number;
  totalMs: number;
  gain: number;
  pan?: number;
  /** 마지막 음에서 볼륨이 꺼지듯 페이드 — 진짜 잠드는 느낌 (게임오버용) */
  fadeLast?: boolean;
  /** 저음 웅얼거림용 포먼트 필터(2밴드 bandpass) — 보스 저음 버전 */
  formant?: boolean;
}

function motif(opts: MotifOpts): void {
  const { octave, totalMs, gain, pan, fadeLast, formant } = opts;
  const each = totalMs / 1000 / 4;
  SLEEPY_MOTIF.forEach((f, i) => {
    const from = f * Math.pow(2, octave);
    const to = (SLEEPY_MOTIF[i + 1] ?? f * 0.94) * Math.pow(2, octave);
    const isLast = i === SLEEPY_MOTIF.length - 1;
    const noteGain = fadeLast && isLast ? gain * 0.45 : gain;
    if (formant) {
      formantTone({
        freq: from,
        to,
        dur: each * (fadeLast && isLast ? 1.6 : 1.1),
        gain: noteGain,
        delay: i * each,
      });
    } else {
      tone({
        freq: from,
        to,
        dur: each * (fadeLast && isLast ? 1.6 : 1.1),
        type: "triangle",
        gain: noteGain,
        delay: i * each,
        pan,
      });
    }
  });
}

interface FormantOpts {
  freq: number;
  to?: number;
  dur: number;
  gain: number;
  delay?: number;
}

/**
 * 교장 선생님 저음 웅얼거림 — sawtooth를 2밴드 bandpass(포먼트)로 통과시켜
 * "저음으로 웅얼거리는" 목소리 인상을 준다 (musician §2 bossSpeech 레시피).
 */
function formantTone(o: FormantOpts): void {
  const c = ensureCtx();
  if (!c || !sfxBus) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t0 + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  const f1 = c.createBiquadFilter();
  f1.type = "bandpass";
  f1.frequency.value = 650;
  f1.Q.value = 5;
  const f2 = c.createBiquadFilter();
  f2.type = "bandpass";
  f2.frequency.value = 1100;
  f2.Q.value = 4;
  osc.connect(g);
  g.connect(f1);
  f1.connect(f2);
  f2.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

/**
 * 좀비 하품 — 위치가 들린다.
 * 좌우는 StereoPanner, 거리는 볼륨, 벽 너머는 먹먹하게 (musician §3).
 */
export function playYawn(dx: number, dist: number, blocked: boolean): void {
  const pan = Math.max(-1, Math.min(1, dx / 240));
  let g = Math.pow(Math.max(0, 1 - dist / 260), 1.5) * 0.16;
  if (blocked) g *= 0.5;
  if (g < 0.005) return;
  tone({
    freq: 220,
    to: 160,
    dur: 0.7,
    type: "sine",
    gain: g,
    pan,
    cutoff: blocked ? 1500 : 6000,
  });
  tone({
    freq: 223,
    to: 158,
    dur: 0.66,
    type: "triangle",
    gain: g * 0.6,
    pan,
    cutoff: blocked ? 1500 : 6000,
  });
}

/**
 * 아직 못 구한 친구가 부르는 소리 (2.5초마다 반복되는 **위치 비컨**).
 * `friendWake`(구출 성공)보다 짧고 높고 절반 크기다 — 알림이 아니라 배경에 깔리는 신호다.
 */
export function playFriendCall(dx: number, dist: number): void {
  const pan = Math.max(-1, Math.min(1, dx / 240));
  const g = Math.max(0, 1 - dist / 260) * 0.075;
  if (g < 0.004) return;
  tone({ freq: 660, to: 880, dur: 0.18, type: "sine", gain: g, pan });
}

/** 급식 아주머니 국자 — 화면 밖에서 오는 걸 미리 알려 준다 */
export function playClank(dx: number, dist: number): void {
  const pan = Math.max(-1, Math.min(1, dx / 240));
  const g = Math.pow(Math.max(0, 1 - dist / 380), 1.4) * 0.14;
  if (g < 0.004) return;
  tone({ freq: 900, dur: 0.08, type: "triangle", gain: g, pan });
  noise({ dur: 0.06, gain: g * 0.5, cutoff: 3000, highpass: true, pan });
}

/** 방송 게이지가 차오르는 소리 — 비율이 오를수록 밝아진다 */
export function playBroadcastTick(ratio: number): void {
  tone({ freq: 440 + 440 * ratio, dur: 0.08, type: "sine", gain: 0.08 });
}

let lastSyllableAt = 0;

/**
 * 연설 웅얼거림 — 한 음절씩. 연설이 새로 시작할 때(직전 호출로부터 1초 이상 지났을 때)
 * 첫 음절만 졸음 모티프를 한 옥타브 낮춰(G3-E3-C3-A2) 포먼트로 통과시킨다 —
 * "저음으로 웅얼거리는 교장 선생님" 버전 (musician §4-3). "어? 그 소리다" 하고 알아채는 지점.
 */
export function playSpeechSyllable(): void {
  const c = ensureCtx();
  const now = c?.currentTime ?? 0;
  const isFirst = now - lastSyllableAt > 1.0;
  lastSyllableAt = now;
  if (isFirst) {
    motif({ octave: -1, totalMs: 900, gain: 0.09, formant: true });
    return;
  }
  const f = 110 + Math.random() * 50;
  formantTone({ freq: f, to: f * 0.9, dur: 0.26, gain: 0.09 });
  tone({ freq: f * 2.4, dur: 0.2, type: "sawtooth", gain: 0.03, cutoff: 900 });
}

/** 알람시계 울리는 동안 0.5초마다 */
export function playAlarmRing(): void {
  tone({ freq: 880, dur: 0.12, type: "square", gain: 0.12 });
  tone({ freq: 880, dur: 0.12, type: "square", gain: 0.12, delay: 0.16 });
}

/** 발소리 — 바닥에 따라 다르다 */
export function playStep(kind: "corridor" | "room" | "field"): void {
  if (kind === "corridor") noise({ dur: 0.04, gain: 0.035, cutoff: 1200, band: true });
  else if (kind === "room") noise({ dur: 0.04, gain: 0.03, cutoff: 400 });
  else noise({ dur: 0.05, gain: 0.03, cutoff: 2500, band: true });
}

export function playSfx(name: SFX): void {
  switch (name) {
    case "notice":
      // 졸음 모티프를 8배속으로 압축한 "어?" — 높은 옥타브(G5-E5-C5-A4)
      motif({ octave: 1, totalMs: 150, gain: 0.08 });
      tone({ freq: 660, to: 740, dur: 0.18, type: "sine", gain: 0.1 });
      break;
    case "alert":
      tone({ freq: 523.25, dur: 0.09, type: "square", gain: 0.17 });
      tone({ freq: 783.99, dur: 0.14, type: "square", gain: 0.17, delay: 0.08 });
      break;
    case "pickup":
      [523.25, 659.25, 783.99].forEach((f, i) =>
        tone({ freq: f, dur: 0.12, type: "square", gain: 0.16, delay: i * 0.08 }),
      );
      break;
    case "paper":
      noise({ dur: 0.18, gain: 0.06, cutoff: 2000, sweepTo: 4000, highpass: true });
      tone({ freq: 1046.5, dur: 0.16, type: "sine", gain: 0.12, delay: 0.08 });
      break;
    case "lockerIn":
      tone({ freq: 220, to: 160, dur: 0.14, type: "square", gain: 0.12 });
      noise({ dur: 0.08, gain: 0.06, cutoff: 900 });
      break;
    case "lockerOut":
      tone({ freq: 170, to: 250, dur: 0.14, type: "square", gain: 0.12 });
      noise({ dur: 0.08, gain: 0.06, cutoff: 900 });
      break;
    case "chalkThrow":
      noise({ dur: 0.15, gain: 0.05, cutoff: 1500, sweepTo: 400, band: true });
      break;
    case "chalkLand":
      tone({ freq: 330, dur: 0.07, type: "triangle", gain: 0.13 });
      break;
    case "doorLock":
      tone({ freq: 196, to: 130, dur: 0.22, type: "triangle", gain: 0.15 });
      noise({ dur: 0.06, gain: 0.05, cutoff: 1200 });
      break;
    case "knock":
      for (let i = 0; i < 3; i++) noise({ dur: 0.08, gain: 0.08, cutoff: 300, delay: i * 0.12 });
      break;
    case "flashlight":
      tone({ freq: 1000, dur: 0.03, type: "square", gain: 0.1 });
      break;
    case "friendWake":
      [392, 523.25, 659.25].forEach((f, i) =>
        tone({ freq: f, dur: 0.2, type: "triangle", gain: 0.15, delay: i * 0.11 }),
      );
      break;
    case "friendCaught":
      [523.25, 392, 329.63].forEach((f, i) =>
        tone({ freq: f, dur: 0.12, type: "sine", gain: 0.12, delay: i * 0.1 }),
      );
      break;
    case "nearMiss":
      // 밝고 아주 짧게 — 추격 중 흰 섬광과 겹쳐도 놀라게 하면 안 된다 (§10-5 검증 대상)
      noise({ dur: 0.13, gain: 0.035, cutoff: 3000, highpass: true });
      tone({ freq: 880, to: 1320, dur: 0.12, type: "sine", gain: 0.06 });
      break;
    case "bossSpeech":
      // 예고 "에—" 1.0초 — sawtooth를 2밴드 포먼트로 통과시킨 저음 목소리
      formantTone({ freq: 130, to: 118, dur: 1.0, gain: 0.13 });
      formantTone({ freq: 261, to: 236, dur: 0.9, gain: 0.05, delay: 0.05 });
      break;
    case "bossCough":
      noise({ dur: 0.12, gain: 0.12, cutoff: 500 });
      noise({ dur: 0.12, gain: 0.1, cutoff: 500, delay: 0.16 });
      tone({ freq: 150, to: 110, dur: 0.1, type: "triangle", gain: 0.1 });
      break;
    case "ingredientComplete":
      [523.25, 587.33, 659.25, 698.46, 783.99].forEach((f, i) =>
        tone({ freq: f, dur: 0.16, type: "sine", gain: 0.16, delay: i * 0.08 }),
      );
      break;
    case "bell":
      // 딩동댕동 — 흔한 음정 4개
      [659.25, 523.25, 587.33, 392].forEach((f, i) => {
        tone({ freq: f, dur: 0.45, type: "sine", gain: 0.2, delay: i * 0.38 });
        tone({ freq: f * 2, dur: 0.3, type: "sine", gain: 0.06, delay: i * 0.38 });
      });
      break;
    case "uiTap":
      tone({ freq: 784, dur: 0.05, type: "square", gain: 0.12 });
      break;
    case "uiBack":
      tone({ freq: 392, dur: 0.05, type: "square", gain: 0.12 });
      break;
    case "matronClank":
      // triangle+노이즈 금속성 (positional 버전은 playClank 사용)
      tone({ freq: 900, dur: 0.08, type: "triangle", gain: 0.1 });
      noise({ dur: 0.06, gain: 0.05, cutoff: 3000, highpass: true });
      break;
    case "starPop":
      [523.25, 659.25, 783.99].forEach((f, i) =>
        tone({ freq: f, dur: 0.18, type: "sine", gain: 0.18, delay: i * 0.18 }),
      );
      break;
    case "menuComplete":
      [523.25, 587.33, 659.25, 698.46, 783.99, 880].forEach((f, i) =>
        tone({ freq: f, dur: 0.18, type: "square", gain: 0.16, delay: i * 0.09 }),
      );
      break;
    case "stageStart":
      tone({ freq: 440, dur: 0.12, type: "sine", gain: 0.14 });
      tone({ freq: 660, dur: 0.18, type: "sine", gain: 0.14, delay: 0.1 });
      break;
    case "alarmSet":
      tone({ freq: 660, dur: 0.07, type: "square", gain: 0.12 });
      tone({ freq: 990, dur: 0.09, type: "square", gain: 0.1, delay: 0.07 });
      break;
    case "exitOpen":
      tone({ freq: 392, to: 784, dur: 0.4, type: "triangle", gain: 0.16 });
      tone({ freq: 1046.5, dur: 0.3, type: "sine", gain: 0.1, delay: 0.3 });
      break;
    case "ventOpen":
      // 금속 그릴이 삐걱 열린다
      tone({ freq: 320, to: 180, dur: 0.4, type: "sawtooth", gain: 0.08, cutoff: 1400 });
      noise({ dur: 0.22, gain: 0.06, cutoff: 2400, highpass: true });
      break;
    case "ventCrawl":
      // 관 속에서 울리는 기어가는 소리 + 먼지 (1.2초)
      for (let i = 0; i < 6; i++) {
        noise({ dur: 0.16, gain: 0.045, cutoff: 700, delay: i * 0.2 });
      }
      tone({ freq: 90, to: 70, dur: 1.2, type: "sine", gain: 0.05 });
      break;
    case "ventFound":
      // 급식표보다 낮고 뿌듯한 3음 상승
      [392, 493.88, 587.33].forEach((f, i) =>
        tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.18, delay: i * 0.12 }),
      );
      break;
    case "sleep":
      // 하품 → 베개 툭 → 코골이 (§6 연출과 1:1). 마지막 음(A3)에서 진짜 잠들듯 페이드.
      motif({ octave: 0, totalMs: 1600, gain: 0.14, fadeLast: true });
      tone({ freq: 110, to: 70, dur: 0.3, type: "triangle", gain: 0.16, delay: 1.1 });
      for (let i = 0; i < 4; i++) {
        noise({ dur: 0.3, gain: 0.06, cutoff: 220, delay: 1.5 + i * 0.42 });
      }
      break;
  }
}
