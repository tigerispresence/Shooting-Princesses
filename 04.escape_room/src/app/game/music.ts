import { audioBus } from "./audio";

/**
 * 배경음악. 오디오 파일 없이 Web Audio로 그때그때 연주한다.
 *
 * 옛날 게임기처럼 세 성부만 쓴다 — 멜로디(리드), 베이스, 아르페지오.
 * 스테이지마다 조성·화음·악기가 다르고, 같은 스테이지 안에서는 방마다
 * 멜로디·빠르기·악기를 바꿔 "같은 곡의 다른 얼굴"로 들리게 했다.
 *
 * 스케줄링은 setInterval로 대충 찍지 않고, 25ms마다 깨어나 0.12초 앞까지의
 * 음을 AudioContext 시계에 미리 예약한다. 그래야 탭이 잠깐 버벅여도
 * 박자가 흔들리지 않는다.
 */

/** 음이름 대신 "음계의 몇 번째 음"으로 적는다. -1은 쉼표. */
type Steps = number[];

interface StageMusic {
  bpm: number;
  /** 으뜸음의 MIDI 번호 */
  root: number;
  /** 반음 간격으로 적은 음계 */
  scale: number[];
  /** 8스텝마다 바뀌는 화음. 음계 위 계이름. */
  chords: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  arp: OscillatorType;
  melodyA: Steps;
  melodyB: Steps;
}

/** 한 스텝 = 16분음표. 32스텝이면 두 마디짜리 한 바퀴가 된다. */
const LOOP = 32;

const STAGE_MUSIC: Record<number, StageMusic> = {
  // 달빛 성 — 가단조. 조심스럽게 걷는 느낌.
  1: {
    bpm: 96,
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 6, 0],
    lead: "square",
    bass: "triangle",
    arp: "sine",
    melodyA: [
      0, -1, 2, 4, -1, 2, 0, -1,
      5, -1, 4, 2, -1, 4, -1, -1,
      6, -1, 5, 4, -1, 2, 4, -1,
      0, -1, -1, 2, 0, -1, -1, -1,
    ],
    melodyB: [
      4, -1, 5, -1, 6, -1, 5, 4,
      2, -1, 4, -1, 5, -1, -1, -1,
      6, 7, 6, 5, 4, -1, 2, -1,
      0, -1, 2, -1, 0, -1, -1, -1,
    ],
  },
  // 지하 감옥 — 라단조 화성단음계. 무겁고 조금 으스스하게.
  2: {
    bpm: 82,
    root: 50,
    scale: [0, 2, 3, 5, 7, 8, 11],
    chords: [0, 3, 4, 0],
    lead: "sawtooth",
    bass: "square",
    arp: "triangle",
    melodyA: [
      0, -1, -1, 2, -1, 3, -1, -1,
      3, -1, 2, -1, 0, -1, -1, -1,
      4, -1, -1, 6, -1, 4, -1, -1,
      0, -1, -1, -1, -1, -1, -1, -1,
    ],
    melodyB: [
      0, 2, 3, 4, -1, 3, 2, -1,
      3, -1, -1, 2, 0, -1, -1, -1,
      6, -1, 4, -1, 3, -1, 2, -1,
      0, -1, -1, 0, -1, -1, -1, -1,
    ],
  },
  // 물에 잠긴 서고 — 바장조 5음계. 물방울처럼 느리고 둥둥.
  3: {
    bpm: 74,
    root: 53,
    scale: [0, 2, 4, 7, 9],
    chords: [0, 3, 1, 0],
    lead: "sine",
    bass: "triangle",
    arp: "sine",
    melodyA: [
      0, -1, 2, -1, 4, -1, -1, -1,
      3, -1, 2, -1, -1, -1, -1, -1,
      4, -1, 5, -1, 4, -1, 2, -1,
      0, -1, -1, -1, -1, -1, -1, -1,
    ],
    melodyB: [
      4, -1, -1, 3, -1, 2, -1, -1,
      1, -1, 2, -1, 3, -1, -1, -1,
      5, -1, 4, -1, 3, -1, -1, -1,
      2, -1, 0, -1, -1, -1, -1, -1,
    ],
  },
  // 얼음 궁전 — 다장조. 밝고 반짝반짝, 조금 빠르게.
  4: {
    bpm: 112,
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 4, 5, 3],
    lead: "triangle",
    bass: "triangle",
    arp: "sine",
    melodyA: [
      4, -1, 2, -1, 0, -1, 2, -1,
      4, -1, 5, -1, 4, -1, -1, -1,
      6, -1, 5, -1, 4, -1, 2, -1,
      4, -1, -1, -1, -1, -1, -1, -1,
    ],
    melodyB: [
      7, -1, 6, 5, -1, 4, -1, 2,
      4, -1, -1, 5, -1, 6, -1, -1,
      7, -1, 9, -1, 7, -1, 6, -1,
      4, -1, -1, 2, 4, -1, -1, -1,
    ],
  },
  // 별빛 정원 — 사장조. 따뜻하고 느긋하게.
  5: {
    bpm: 88,
    root: 55,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 5, 3, 4],
    lead: "triangle",
    bass: "sine",
    arp: "triangle",
    melodyA: [
      0, -1, 2, -1, 4, -1, 2, -1,
      5, -1, 4, -1, 2, -1, -1, -1,
      2, -1, 4, -1, 5, -1, 4, -1,
      2, -1, 0, -1, -1, -1, -1, -1,
    ],
    melodyB: [
      4, -1, 5, 6, -1, 5, 4, -1,
      2, -1, 4, -1, 5, -1, -1, -1,
      7, -1, 6, -1, 5, 4, -1, 2,
      4, -1, -1, 0, -1, -1, -1, -1,
    ],
  },
};

/**
 * 같은 스테이지 안에서 방마다 곡의 얼굴을 바꾼다.
 * 조성과 화음은 그대로 두고 멜로디·악기·빠르기만 바꿔서, 딴 곡처럼 들리지만
 * 어울리지 않는 소리는 나지 않는다.
 */
const ROOM_VARIATIONS = [
  { useB: false, octave: 0, bpmMul: 1, arp: false, lift: 0 },
  { useB: true, octave: 0, bpmMul: 1.05, arp: true, lift: 0 },
  { useB: false, octave: 1, bpmMul: 0.94, arp: true, lift: 0 },
  { useB: true, octave: 0, bpmMul: 1.1, arp: false, lift: 12 },
  { useB: false, octave: 1, bpmMul: 1, arp: true, lift: 0 },
];

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

let timer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step = 0;
let current: { stage: number; room: number } | null = null;

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** 계이름 -> MIDI 번호. 음계를 넘어가면 옥타브를 올린다. */
function degreeToMidi(music: StageMusic, degree: number, octave = 0): number {
  const len = music.scale.length;
  const oct = Math.floor(degree / len) + octave;
  const idx = ((degree % len) + len) % len;
  return music.root + music.scale[idx] + oct * 12;
}

function voice(
  ctx: AudioContext,
  out: GainNode,
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
  // 딱딱 끊기지 않게 짧은 어택과 여운을 준다
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

function scheduleStep(
  ctx: AudioContext,
  out: GainNode,
  music: StageMusic,
  variation: (typeof ROOM_VARIATIONS)[number],
  index: number,
  at: number,
  stepDur: number,
): void {
  const melody = variation.useB ? music.melodyB : music.melodyA;
  const chord = music.chords[Math.floor(index / 8) % music.chords.length];

  // 멜로디
  const deg = melody[index];
  if (deg >= 0) {
    const freq = midiToFreq(degreeToMidi(music, deg, 1 + variation.octave) + variation.lift);
    voice(ctx, out, freq, at, stepDur * 1.6, music.lead, 0.13);
  }

  // 베이스 — 마디 첫박과 가운데
  if (index % 4 === 0) {
    const strong = index % 8 === 0;
    const freq = midiToFreq(degreeToMidi(music, chord, -1) + variation.lift);
    voice(ctx, out, freq, at, stepDur * (strong ? 2.4 : 1.4), music.bass, strong ? 0.16 : 0.1);
  }

  // 아르페지오 — 화음의 1-3-5음을 또박또박
  if (variation.arp && index % 2 === 1) {
    const tone = [0, 2, 4][(index >> 1) % 3];
    const freq = midiToFreq(degreeToMidi(music, chord + tone, 1) + variation.lift);
    voice(ctx, out, freq, at, stepDur * 0.8, music.arp, 0.05);
  }
}

/**
 * 스테이지·방에 맞는 곡을 튼다. 같은 곡이면 아무 일도 하지 않아서,
 * 방 안에서 화면이 다시 그려져도 음악이 끊기지 않는다.
 */
export function playRoomMusic(stageId: number, roomIndex: number): void {
  if (current && current.stage === stageId && current.room === roomIndex) return;

  const bus = audioBus();
  if (!bus) return;
  const music = STAGE_MUSIC[stageId] ?? STAGE_MUSIC[1];
  const variation = ROOM_VARIATIONS[roomIndex % ROOM_VARIATIONS.length];

  stopMusic();
  current = { stage: stageId, room: roomIndex };

  // 4분음표를 넷으로 쪼갠 16분음표. /2로 두면 멜로디가 절반 속도로 늘어진다.
  const stepDur = 60 / (music.bpm * variation.bpmMul) / 4;
  nextNoteTime = bus.ctx.currentTime + 0.08;
  step = 0;

  // 개발 중에만 — 어느 방의 곡이 도는지 자동 테스트에서 확인할 수 있게
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__music = {
      stage: stageId,
      room: roomIndex,
      bpm: Math.round(music.bpm * variation.bpmMul),
      lead: music.lead,
    };
  }

  timer = setInterval(() => {
    const b = audioBus();
    if (!b) return;
    while (nextNoteTime < b.ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(b.ctx, b.bgm, music, variation, step % LOOP, nextNoteTime, stepDur);
      nextNoteTime += stepDur;
      step++;
    }
  }, LOOKAHEAD_MS);
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  current = null;
}

/** 클리어 화면처럼 "지금 곡을 멈추고 나중에 다시 골라야" 할 때 */
export function resetMusic(): void {
  stopMusic();
}
