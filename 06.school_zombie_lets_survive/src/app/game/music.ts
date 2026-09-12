import { audioBus } from "./audio";

/**
 * 배경음악. 25ms마다 깨어나 0.12초 앞까지 AudioContext 시계에 미리 예약한다.
 * 그래야 탭이 잠깐 버벅여도 박자가 안 흔들린다.
 *
 * 톤 원칙 (musician): **좀비는 안 무섭다, 졸릴 뿐이다.**
 * 무서운 옥타브 도약이나 트라이톤은 쓰지 않는다.
 */

type Steps = number[];

interface Track {
  bpm: number;
  /** 으뜸음 MIDI */
  root: number;
  scale: number[];
  chords: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  arp: OscillatorType;
  melody: Steps;
  /** 로우패스 컷오프 (어두운 방) — 걸리면 짧은 딜레이(120ms/fb .25)도 같이 붙는다 */
  cutoff?: number;
  /** 탬버린(추격) */
  tamb?: boolean;
  /** 아르페지오를 쓸지 */
  arpOn?: boolean;
  /** 리드 볼륨 */
  leadGain?: number;
  /**
   * 보스 행진곡의 "위엄 있는 척하다 삑사리" 러바토.
   * 루프(= 8마디)마다 이 스텝은 1.15배로 밀리고 바로 다음 스텝이 0.85배로 당겨져
   * 전체 마디 길이는 그대로 유지된다.
   */
  rubatoStep?: number;
}

/** 기본 루프 길이(8마디). 각 트랙은 자기 `melody.length`로 루프돈다 — S4만 64(16마디). */
const REST = -1;

/** 졸음 모티프 솔-미-도-라를 5음계 계이름으로 옮긴 것 */
const SLEEPY: Steps = [4, REST, 2, REST, 0, REST, -2, REST];

const TRACKS: Record<string, Track> = {
  // 타이틀 — 학교 종 모티프를 아주 느긋하게
  title: {
    bpm: 76,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 3, 4, 0],
    lead: "triangle",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    melody: [
      ...SLEEPY,
      2, REST, 4, REST, 3, REST, 2, REST,
      4, REST, 3, 2, REST, 0, REST, REST,
      2, REST, 0, REST, REST, REST, REST, REST,
    ],
  },
  // S1 점심시간 끝 — 밝고 장난스러움
  s1: {
    bpm: 96,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 3, 4, 0],
    lead: "square",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    melody: [
      0, REST, 2, 4, REST, 2, 0, REST,
      4, REST, 3, 2, REST, 4, REST, REST,
      5, REST, 4, 3, REST, 2, 4, REST,
      0, REST, REST, 2, 0, REST, REST, REST,
    ],
  },
  // S2 5교시 — 살짝 정색한 수업 종 느낌, 그래도 밝음
  s2: {
    bpm: 100,
    root: 57,
    scale: [0, 2, 3, 5, 7],
    chords: [0, 4, 3, 0],
    lead: "square",
    bass: "triangle",
    arp: "square",
    arpOn: true,
    melody: [
      0, REST, 3, REST, 2, REST, 0, REST,
      4, REST, 3, 2, REST, REST, 2, REST,
      5, REST, 4, REST, 3, 2, REST, REST,
      2, REST, 0, REST, REST, REST, REST, REST,
    ],
  },
  // S3-1 음악실 — 뮤직박스, 스테이지 중 유일하게 숨 고르는 방
  s3: {
    bpm: 88,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 2, 3, 0],
    lead: "sine",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    leadGain: 0.14,
    melody: [
      4, REST, REST, 3, REST, 2, REST, REST,
      2, REST, 4, REST, 3, REST, REST, REST,
      5, REST, 4, REST, 3, REST, 2, REST,
      0, REST, REST, 2, REST, REST, REST, REST,
    ],
  },
  // S3-2/3 어두운 방 — 화성은 그대로, 필터만 먹먹하게 ("이불 속에서 듣는 소리")
  s3dark: {
    bpm: 92,
    root: 57,
    scale: [0, 2, 3, 5, 7],
    chords: [0, 3, 4, 0],
    lead: "square",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    cutoff: 900,
    melody: [
      0, REST, REST, 2, REST, 3, REST, REST,
      3, REST, 2, REST, 0, REST, REST, REST,
      4, REST, REST, 3, REST, 2, REST, REST,
      0, REST, REST, REST, REST, REST, REST, REST,
    ],
  },
  // S4 체육관·운동장 — 뛰어노는 느낌, 야외라 둥근 triangle. 맵이 넓으니 16마디로 두 배 길게.
  s4: {
    bpm: 104,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 4, 2, 3, 0, 3, 4, 0],
    lead: "triangle",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    melody: [
      // 전반 8마디 — 뛰어노는 기본 필
      0, 2, 4, REST, 4, 2, 0, REST,
      2, 3, 4, REST, 5, REST, 4, REST,
      5, 4, 3, REST, 2, 3, 4, REST,
      2, REST, 0, REST, 0, REST, REST, REST,
      // 후반 8마디 — 한 단 높여 뻗는 변주, 마디 끝마다 상승 필
      4, REST, 5, REST, 4, 2, 0, REST,
      2, 4, REST, 5, 4, REST, 2, REST,
      0, 2, 4, 5, REST, 4, 2, REST,
      0, REST, 2, 4, REST, REST, REST, REST,
    ],
  },
  // S5-1 과학실 — 조용한 실험실, 보스 직전 심호흡
  s5: {
    bpm: 84,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 3, 2, 0],
    lead: "sine",
    bass: "sine",
    arp: "sine",
    arpOn: true,
    leadGain: 0.08,
    melody: [
      REST, REST, 4, REST, REST, REST, 2, REST,
      REST, REST, 3, REST, REST, REST, REST, REST,
      REST, REST, 5, REST, REST, REST, 4, REST,
      REST, REST, 2, REST, REST, REST, REST, REST,
    ],
  },
  // 교장 행진곡 — 위엄 있는 척하다 삑사리 나는 웃긴 행진곡
  boss: {
    bpm: 150,
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 0, 4, 4],
    lead: "square",
    bass: "triangle",
    arp: "square",
    // step 24("6, REST")가 매 루프(8마디)마다 삑사리처럼 밀렸다 당겨진다 — rubatoStep 참고
    rubatoStep: 24,
    melody: [
      0, REST, 0, REST, 2, REST, 4, REST,
      4, REST, 2, REST, 0, REST, REST, REST,
      4, REST, 4, REST, 5, REST, 7, REST,
      6, REST, 6, REST, 4, REST, REST, REST,
    ],
  },
  // 연설 중 — 행진곡 요소를 전부 끄고 최면 자장가로 급전환
  bossSpeech: {
    bpm: 60,
    root: 60,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 0, 0, 0],
    lead: "sine",
    bass: "sine",
    arp: "sine",
    arpOn: true,
    leadGain: 0.1,
    melody: [
      ...SLEEPY,
      ...SLEEPY,
      ...SLEEPY,
      ...SLEEPY,
    ],
  },
  // 엔딩 — 밝은 왈츠, 다 같이 기지개
  ending: {
    bpm: 132,
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 5, 3, 4],
    lead: "triangle",
    bass: "triangle",
    arp: "sine",
    arpOn: true,
    melody: [
      0, REST, 2, 4, REST, 2, 4, REST,
      5, REST, 4, 2, REST, 4, REST, REST,
      7, REST, 6, 5, REST, 4, 2, REST,
      4, REST, 2, 0, REST, REST, REST, REST,
    ],
  },
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0;
let currentKey = "";
let current: Track | null = null;
let chaseMode = false;

/** 현재 트랙이 노트를 쏘는 입력 노드. 어두운 방이면 이 뒤에 로우패스+딜레이가 붙는다. */
let trackIn: GainNode | null = null;
let trackExtraNodes: AudioNode[] = [];

/** 보스 연설용 자장가 패드(sine 3화음) — 행진곡이 뮤트되는 동안 대신 운다 */
let padOscs: OscillatorNode[] = [];
let padGains: GainNode[] = [];

function disposeTrackChain(): void {
  try {
    trackIn?.disconnect();
  } catch {
    /* 이미 끊어졌으면 무시 */
  }
  trackExtraNodes.forEach((n) => {
    try {
      n.disconnect();
    } catch {
      /* noop */
    }
  });
  trackIn = null;
  trackExtraNodes = [];
}

/** 사물함/어두운 방과는 다른, "곡 자체"에 거는 먹먹함 — musician §1 s3dark 레시피 */
function buildTrackChain(ctx: AudioContext, dest: AudioNode, cutoff?: number): GainNode {
  const input = ctx.createGain();
  input.gain.value = 1;
  if (!cutoff) {
    input.connect(dest);
    return input;
  }
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoff;
  input.connect(lp);
  lp.connect(dest);

  // 짧은 딜레이로 "이불 속" 잔향 흉내 — 120ms / feedback 0.25
  const delay = ctx.createDelay(0.6);
  delay.delayTime.value = 0.12;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.25;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  lp.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(dest);

  trackExtraNodes.push(lp, delay, feedback, wet);
  return input;
}

function stopPad(): void {
  const oldOscs = padOscs;
  const oldGains = padGains;
  padOscs = [];
  padGains = [];
  if (!oldGains.length) return;
  oldGains.forEach((g) => {
    try {
      const c = g.context;
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setTargetAtTime(0.0001, c.currentTime, 0.2);
    } catch {
      /* noop */
    }
  });
  setTimeout(() => {
    oldOscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* noop */
      }
    });
    oldGains.forEach((g) => {
      try {
        g.disconnect();
      } catch {
        /* noop */
      }
    });
  }, 400);
}

/** 연설 중 최면 걸린 듯한 자장가 패드 — 행진곡 요소는 전부 뮤트되고 이것만 운다 */
function startPad(ctx: AudioContext, dest: AudioNode, t: Track): void {
  stopPad();
  try {
    [0, 2, 4].forEach((degree, i) => {
      const freq = midiToFreq(degreeToMidi(t, degree, 0));
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.setTargetAtTime(0.05 - i * 0.012, ctx.currentTime, 0.5);
      osc.connect(g);
      g.connect(dest);
      osc.start();
      padOscs.push(osc);
      padGains.push(g);
    });
  } catch {
    /* 오디오 실패는 게임 진행을 막지 않는다 */
  }
}

function midiToFreq(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function degreeToMidi(t: Track, degree: number, octave: number): number {
  const len = t.scale.length;
  const oct = Math.floor(degree / len) + octave;
  const idx = ((degree % len) + len) % len;
  return t.root + t.scale[idx] + oct * 12;
}

function voice(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType,
  gain: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

function tamburine(ctx: AudioContext, out: AudioNode, at: number): void {
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4000;
  const g = ctx.createGain();
  g.gain.value = 0.035;
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(at);
}

function scheduleStep(
  ctx: AudioContext,
  out: AudioNode,
  t: Track,
  index: number,
  at: number,
  stepDur: number,
): void {
  const chord = t.chords[Math.floor(index / 8) % t.chords.length];

  const deg = t.melody[index];
  if (deg !== undefined && deg !== REST) {
    voice(
      ctx,
      out,
      midiToFreq(degreeToMidi(t, deg, 1)),
      at,
      stepDur * 1.6,
      t.lead,
      t.leadGain ?? 0.12,
    );
  }

  if (index % 4 === 0) {
    const strong = index % 8 === 0;
    voice(
      ctx,
      out,
      midiToFreq(degreeToMidi(t, chord, -1)),
      at,
      stepDur * (strong ? 2.4 : 1.4),
      t.bass,
      strong ? 0.15 : 0.09,
    );
  }

  if (t.arpOn && index % 2 === 1) {
    const step3 = [0, 2, 4][(index >> 1) % 3];
    voice(
      ctx,
      out,
      midiToFreq(degreeToMidi(t, chord + step3, 1)),
      at,
      stepDur * 0.8,
      t.arp,
      0.045,
    );
  }

  if (chaseMode && index % 2 === 0) tamburine(ctx, out, at);
}

export interface MusicRequest {
  stageId: number;
  chase?: boolean;
  dark?: boolean;
  boss?: boolean;
  speech?: boolean;
}

function keyFor(r: MusicRequest): string {
  if (r.speech) return "bossSpeech";
  if (r.boss) return "boss";
  if (r.stageId === 3 && r.dark) return "s3dark";
  return "s" + r.stageId;
}

/** 스테이지/상황에 맞는 곡. 같은 곡이면 아무 일도 하지 않아 음악이 안 끊긴다. */
export function playMusic(req: MusicRequest): void {
  const key = keyFor(req);
  const chase = !!req.chase && !req.speech;
  if (key === currentKey && chase === chaseMode) return;
  if (key === currentKey && current) {
    // 같은 곡, 추격 여부만 바뀜 — 템포만 조인다 (화성은 그대로)
    chaseMode = chase;
    restartTempo();
    return;
  }
  chaseMode = chase;
  start(key);
}

export function playNamedMusic(key: "title" | "ending"): void {
  if (currentKey === key) return;
  chaseMode = false;
  start(key);
}

function tempoMul(): number {
  return chaseMode ? 1.36 : 1;
}

function restartTempo(): void {
  const bus = audioBus();
  if (!bus || !current) return;
  if (timer !== null) clearInterval(timer);
  const stepDur = 60 / (current.bpm * tempoMul()) / 4;
  nextNoteTime = Math.max(nextNoteTime, bus.ctx.currentTime + 0.05);
  loop(stepDur);
}

function start(key: string): void {
  const bus = audioBus();
  if (!bus) return;
  const t = TRACKS[key] ?? TRACKS.s1;
  try {
    stopMusic();
    trackIn = buildTrackChain(bus.ctx, bus.bgm, t.cutoff);
    if (key === "bossSpeech") startPad(bus.ctx, trackIn, t);
    currentKey = key;
    current = t;
    const stepDur = 60 / (t.bpm * tempoMul()) / 4;
    nextNoteTime = bus.ctx.currentTime + 0.08;
    step = 0;
    loop(stepDur);
  } catch {
    // 오디오 그래프 구성이 실패해도 게임은 계속된다
  }
}

function loop(stepDur: number): void {
  timer = setInterval(() => {
    try {
      const b = audioBus();
      const t = current;
      const out = trackIn;
      if (!b || !t || !out) return;
      const loopLen = t.melody.length;
      while (nextNoteTime < b.ctx.currentTime + SCHEDULE_AHEAD) {
        const idx = step % loopLen;
        scheduleStep(b.ctx, out, t, idx, nextNoteTime, stepDur);
        // 보스 행진곡의 "밀렸다 당겨지는" 러바토 — 8마디(=한 루프)마다 한 번
        let adv = stepDur;
        if (t.rubatoStep !== undefined) {
          if (idx === t.rubatoStep) adv = stepDur * 1.15;
          else if (idx === (t.rubatoStep + 1) % loopLen) adv = stepDur * 0.85;
        }
        nextNoteTime += adv;
        step++;
      }
    } catch {
      // 스케줄러 오류로 게임 루프를 막지 않는다
    }
  }, LOOKAHEAD_MS);
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  currentKey = "";
  current = null;
  stopPad();
  disposeTrackChain();
}

/** 스테이지 클리어 팡파레 — 별 개수만큼 음이 늘어난다 */
export function playClearFanfare(stars: number): void {
  const bus = audioBus();
  if (!bus) return;
  stopMusic();
  const base = [523.25, 659.25, 783.99, 1046.5];
  const extra = [0, 4, 7][Math.max(0, Math.min(2, stars - 1))];
  base.forEach((f, i) => {
    voice(bus.ctx, bus.bgm, f, bus.ctx.currentTime + i * 0.16, 0.4, "square", 0.16);
    if (stars >= 2) {
      voice(
        bus.ctx,
        bus.bgm,
        f * Math.pow(2, extra / 12),
        bus.ctx.currentTime + i * 0.16,
        0.4,
        "triangle",
        0.09,
      );
    }
  });
}
