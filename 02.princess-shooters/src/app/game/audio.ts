/**
 * Retro chiptune audio engine for Realm of Radiance: The Grumble Curse.
 *
 * Everything here is synthesized with the Web Audio API — no external audio
 * files. Background music is a tiny step-sequencer (16th-note grid) driving
 * up to three oscillator "voices" (square lead, triangle bass, sine arp).
 * Sound effects are short one-off oscillator envelopes scheduled directly
 * against AudioContext.currentTime for sample-accurate timing.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SFXType =
  | "shoot"
  | "enemyHit"
  | "enemyDefeat"
  | "playerHit"
  | "powerUp"
  | "waveComplete"
  | "gameOver"
  | "shieldActivate"
  | "battleCry";

// ---------------------------------------------------------------------------
// Core Web Audio state
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let muted = false;
let masterVolume = 0.6;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/** Creates the shared AudioContext + gain graph. Safe to call multiple times. */
export function initAudio(): void {
  if (typeof window === "undefined") return;
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return;
  }

  const AC = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) return;

  audioCtx = new AC();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = muted ? 0 : masterVolume;
  masterGain.connect(audioCtx.destination);

  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 1;
  bgmGain.connect(masterGain);

  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 1;
  sfxGain.connect(masterGain);

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

/** Lazily ensures audio is ready (auto-inits + resumes) and returns the context, or null on the server. */
function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setMasterVolume(level: number): void {
  masterVolume = Math.max(0, Math.min(1, level));
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(muted ? 0 : masterVolume, audioCtx.currentTime, 0.05);
  }
}

export function toggleMute(): boolean {
  muted = !muted;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(muted ? 0 : masterVolume, audioCtx.currentTime, 0.05);
  }
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

// ---------------------------------------------------------------------------
// Tone scheduling primitive (shared by BGM voices and SFX)
// ---------------------------------------------------------------------------

interface ToneOptions {
  type: OscillatorType;
  startFreq: number;
  /** If set, the oscillator glides from startFreq to endFreq over glideTime. */
  endFreq?: number;
  glideTime?: number;
  /** AudioContext time the note starts. */
  start: number;
  /** Total audible duration in seconds (includes release tail). */
  duration: number;
  /** Peak envelope gain, 0..1, relative to the destination bus. */
  peak: number;
  /** Attack time in seconds. */
  attack?: number;
  dest: GainNode;
  detune?: number;
}

function scheduleTone(opts: ToneOptions): void {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type;
  osc.frequency.setValueAtTime(Math.max(20, opts.startFreq), opts.start);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, opts.start);

  if (opts.endFreq && opts.endFreq !== opts.startFreq) {
    const glide = opts.glideTime ?? opts.duration;
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.endFreq),
      opts.start + Math.max(0.01, glide)
    );
  }

  const attack = opts.attack ?? 0.008;
  const peak = Math.max(0.0001, opts.peak);
  const end = opts.start + opts.duration;

  gain.gain.setValueAtTime(0.0001, opts.start);
  gain.gain.exponentialRampToValueAtTime(peak, opts.start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(opts.dest);

  osc.start(opts.start);
  osc.stop(end + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

// ---------------------------------------------------------------------------
// Note name -> frequency (equal temperament, A4 = 440Hz)
// ---------------------------------------------------------------------------

const NOTE_SEMITONE: Record<string, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2,
};

function noteFreq(note: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  if (!match) return 440;
  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  const semitones = NOTE_SEMITONE[pitch] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

// ---------------------------------------------------------------------------
// Chiptune step-sequencer for BGM
// ---------------------------------------------------------------------------

interface Trigger {
  freq: number;
  durSteps: number;
}

interface Voice {
  triggers: Map<number, Trigger>;
  totalSteps: number;
}

interface Theme {
  bpm: number;
  melody: Voice;
  bass: Voice;
  arp?: Voice;
}

/** Parses a "NOTE:steps NOTE:steps -:steps ..." pattern into a step-indexed voice. */
function buildVoice(pattern: string): Voice {
  const triggers = new Map<number, Trigger>();
  let pos = 0;
  for (const token of pattern.trim().split(/\s+/)) {
    const [name, stepsStr] = token.split(":");
    const steps = parseInt(stepsStr, 10) || 1;
    if (name !== "-") {
      triggers.set(pos, { freq: noteFreq(name), durSteps: steps });
    }
    pos += steps;
  }
  return { triggers, totalSteps: pos };
}

/** Repeats a bar pattern string `times` times (joined with spaces). */
function rep(pattern: string, times: number): string {
  return new Array(times).fill(pattern).join(" ");
}

// --- Theme 1 (waves 1-2): light, playful, bouncy — C major pentatonic ------
const theme1Melody = buildVoice(
  [
    // Phrase A
    "C5:2 E5:2 G5:2 E5:2 D5:2 -:2 C5:2 -:2",
    "E5:2 G5:2 A5:2 G5:2 E5:4 D5:2 C5:2",
    "C5:2 D5:2 E5:2 D5:2 C5:2 -:2 G4:2 -:2",
    "E5:2 D5:2 C5:4 -:4 C5:4",
    // Phrase B
    "G5:2 A5:2 C6:2 A5:2 G5:2 -:2 E5:2 -:2",
    "A5:2 C6:2 D6:2 C6:2 A5:4 G5:2 E5:2",
    "G5:2 E5:2 D5:2 E5:2 C5:2 -:2 D5:2 -:2",
    "E5:2 D5:2 C5:4 -:4 C5:4",
  ].join(" ")
);
const theme1Bass = buildVoice(
  rep("C3:4 C4:4 C3:4 C4:4", 1) +
    " " +
    rep("A2:4 A3:4 A2:4 A3:4", 1) +
    " " +
    rep("G2:4 G3:4 G2:4 G3:4", 1) +
    " " +
    "C3:4 G2:4 C3:8" +
    " " +
    rep("C3:4 C4:4 C3:4 C4:4", 1) +
    " " +
    rep("A2:4 A3:4 A2:4 A3:4", 1) +
    " " +
    rep("G2:4 G3:4 G2:4 G3:4", 1) +
    " " +
    "C3:4 G2:4 C3:8"
);
const THEME_1: Theme = { bpm: 126, melody: theme1Melody, bass: theme1Bass };

// --- Theme 2 (waves 3-4): heavier, more rhythmic — A minor pentatonic ------
const t2Bar3 = "E4:1 -:1 G4:1 -:1 A4:2 C5:2 A4:1 -:1 G4:2 E4:2 -:2";
const t2Bar4 = "C5:2 A4:2 G4:2 E4:2 A4:8";
const theme2Melody = buildVoice(
  [
    "A4:2 -:1 C5:1 A4:2 -:1 G4:1 E4:2 -:2 A4:2 -:2",
    "C5:2 -:1 D5:1 C5:2 A4:2 -:1 G4:1 E4:4 A4:2",
    t2Bar3,
    t2Bar4,
    "A4:2 C5:2 D5:2 C5:2 A4:2 -:1 G4:1 E4:4",
    "C5:1 D5:1 E5:2 D5:2 C5:2 A4:2 G4:2 E4:2 -:2",
    t2Bar3,
    t2Bar4,
  ].join(" ")
);
const t2BassA = "A2:2 -:2 A2:2 A3:2 -:2 A2:2 -:2 A2:2";
const t2BassC = "C3:2 -:2 C3:2 C4:2 -:2 C3:2 -:2 C3:2";
const t2BassE = "E2:2 -:2 E2:2 E3:2 -:2 E2:2 -:2 E2:2";
const t2BassCadence = "A2:4 -:2 A2:2 A2:8";
const theme2Bass = buildVoice(
  [t2BassA, t2BassC, t2BassE, t2BassCadence, t2BassA, t2BassC, t2BassE, t2BassCadence].join(" ")
);
const t2ArpFlourish = "-:8 A5:1 C6:1 E5:1 A5:1 C6:1 E5:1 A5:1 C6:1";
const theme2Arp = buildVoice(
  ["-:16", "-:16", "-:16", t2ArpFlourish, "-:16", "-:16", "-:16", t2ArpFlourish].join(" ")
);
const THEME_2: Theme = { bpm: 132, melody: theme2Melody, bass: theme2Bass, arp: theme2Arp };

// --- Theme 3 (waves 5-6): epic, faster tempo — driving C major -------------
const t3Bar1 = "C5:1 D5:1 E5:1 G5:1 E5:1 D5:1 C5:1 D5:1 E5:2 G5:2 A5:2 G5:2";
const t3Bar2 = "A5:1 G5:1 E5:1 G5:1 A5:1 C6:1 A5:1 G5:1 E5:2 D5:2 C5:4";
const t3Bar3 = "C5:1 E5:1 G5:1 C6:1 G5:1 E5:1 C5:1 E5:1 D5:2 F5:2 E5:2 D5:2";
const t3Bar4 = "C6:4 -:2 G5:2 E5:2 C5:6";
const t3Bar8 = "G5:1 A5:1 C6:1 A5:1 G5:1 E5:1 D5:1 C5:1 C6:8";
const theme3Melody = buildVoice(
  [t3Bar1, t3Bar2, t3Bar3, t3Bar4, t3Bar1, t3Bar2, t3Bar3, t3Bar8].join(" ")
);
const t3BassC = "C3:2 C4:2 C3:2 C4:2 C3:2 C4:2 C3:2 C4:2";
const t3BassA = "A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2";
const t3BassF = "F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2";
const t3BassG = "G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2";
const t3BassGHigh = "G3:2 G4:2 G3:2 G4:2 G3:2 G4:2 G3:2 G4:2";
const theme3Bass = buildVoice(
  [t3BassC, t3BassA, t3BassF, t3BassG, t3BassC, t3BassA, t3BassF, t3BassGHigh].join(" ")
);
const t3ArpC = rep("C5:1 E5:1 G5:1 C6:1", 4);
const t3ArpA = rep("A4:1 C5:1 E5:1 A5:1", 4);
const t3ArpF = rep("F4:1 A4:1 C5:1 F5:1", 4);
const t3ArpG = rep("G4:1 B4:1 D5:1 G5:1", 4);
const t3ArpGHigh = rep("G5:1 B5:1 D6:1 G6:1", 4);
const theme3Arp = buildVoice(
  [t3ArpC, t3ArpA, t3ArpF, t3ArpG, t3ArpC, t3ArpA, t3ArpF, t3ArpGHigh].join(" ")
);
const THEME_3: Theme = { bpm: 150, melody: theme3Melody, bass: theme3Bass, arp: theme3Arp };

const THEMES: Theme[] = [THEME_1, THEME_2, THEME_3];

function themeIndexForWave(wave: number): number {
  if (wave <= 2) return 0;
  if (wave <= 4) return 1;
  return 2;
}

// --- Scheduler ---------------------------------------------------------
const SCHEDULE_AHEAD = 0.15; // seconds
const LOOKAHEAD_MS = 25;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let activeTheme: Theme | null = null;
let activeThemeIndex: number | null = null;
let stepDuration = 0;
let currentStep = 0;
let nextStepTime = 0;

function scheduleVoiceStep(voice: Voice | undefined, step: number, time: number, dest: GainNode, type: OscillatorType, peak: number) {
  if (!voice) return;
  const trigger = voice.triggers.get(step % voice.totalSteps);
  if (!trigger) return;
  const duration = Math.max(0.05, trigger.durSteps * stepDuration * 0.92);
  scheduleTone({
    type,
    startFreq: trigger.freq,
    start: time,
    duration,
    peak,
    attack: 0.006,
    dest,
  });
}

function schedulerTick(): void {
  if (!audioCtx || !activeTheme || !bgmGain) return;
  while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
    scheduleVoiceStep(activeTheme.melody, currentStep, nextStepTime, bgmGain, "square", 0.2);
    scheduleVoiceStep(activeTheme.bass, currentStep, nextStepTime, bgmGain, "triangle", 0.16);
    scheduleVoiceStep(activeTheme.arp, currentStep, nextStepTime, bgmGain, "sine", 0.08);

    currentStep = (currentStep + 1) % activeTheme.melody.totalSteps;
    nextStepTime += stepDuration;
  }
}

export function playBGM(wave: number): void {
  const ctx = ensureAudio();
  if (!ctx || !bgmGain) return;

  const themeIndex = themeIndexForWave(wave);
  if (themeIndex === activeThemeIndex && schedulerTimer !== null) {
    // Same intensity tier already playing — let it keep looping seamlessly.
    return;
  }

  stopBGM();

  const theme = THEMES[themeIndex];
  activeTheme = theme;
  activeThemeIndex = themeIndex;
  stepDuration = 60 / theme.bpm / 4; // 16th-note step length
  currentStep = 0;
  nextStepTime = ctx.currentTime + 0.05;

  bgmGain.gain.cancelScheduledValues(ctx.currentTime);
  bgmGain.gain.setValueAtTime(1, ctx.currentTime);

  schedulerTick();
  schedulerTimer = setInterval(schedulerTick, LOOKAHEAD_MS);
}

export function stopBGM(): void {
  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (bgmGain && audioCtx) {
    // Quick fade to avoid clicking on any notes still tailing off.
    bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
    bgmGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
  }
  activeTheme = null;
  activeThemeIndex = null;
}

// ---------------------------------------------------------------------------
// Sound effects
// ---------------------------------------------------------------------------

export function playSFX(type: SFXType): void {
  const ctx = ensureAudio();
  if (!ctx || !sfxGain) return;
  const dest = sfxGain;
  const t = ctx.currentTime;

  switch (type) {
    case "shoot": {
      scheduleTone({
        type: "square",
        startFreq: 620,
        endFreq: 1400,
        glideTime: 0.08,
        start: t,
        duration: 0.09,
        peak: 0.18,
        attack: 0.003,
        dest,
      });
      break;
    }

    case "enemyHit": {
      scheduleTone({
        type: "triangle",
        startFreq: 380,
        endFreq: 140,
        glideTime: 0.08,
        start: t,
        duration: 0.09,
        peak: 0.22,
        attack: 0.002,
        dest,
      });
      break;
    }

    case "enemyDefeat": {
      const notes = ["C6", "G5", "E5", "C5"];
      notes.forEach((n, i) => {
        scheduleTone({
          type: "sine",
          startFreq: noteFreq(n),
          start: t + i * 0.055,
          duration: 0.14,
          peak: 0.18,
          attack: 0.004,
          dest,
        });
      });
      // A little sparkle shimmer layered on top.
      scheduleTone({
        type: "sine",
        startFreq: 1800,
        endFreq: 2600,
        glideTime: 0.12,
        start: t,
        duration: 0.16,
        peak: 0.06,
        dest,
      });
      break;
    }

    case "playerHit": {
      scheduleTone({
        type: "sawtooth",
        startFreq: 150,
        endFreq: 90,
        glideTime: 0.25,
        start: t,
        duration: 0.3,
        peak: 0.2,
        attack: 0.005,
        dest,
      });
      scheduleTone({
        type: "square",
        startFreq: 145,
        endFreq: 85,
        glideTime: 0.25,
        start: t,
        duration: 0.3,
        peak: 0.12,
        detune: -12,
        attack: 0.005,
        dest,
      });
      break;
    }

    case "powerUp": {
      const notes = ["C5", "E5", "G5", "C6"];
      notes.forEach((n, i) => {
        scheduleTone({
          type: "square",
          startFreq: noteFreq(n),
          start: t + i * 0.07,
          duration: 0.12,
          peak: 0.16,
          attack: 0.004,
          dest,
        });
      });
      break;
    }

    case "waveComplete": {
      const melody = ["C5", "E5", "G5", "C6"];
      melody.forEach((n, i) => {
        scheduleTone({
          type: "square",
          startFreq: noteFreq(n),
          start: t + i * 0.1,
          duration: i === melody.length - 1 ? 0.4 : 0.13,
          peak: 0.2,
          attack: 0.004,
          dest,
        });
      });
      const harmony = ["E5", "G5", "C6"];
      harmony.forEach((n, i) => {
        scheduleTone({
          type: "triangle",
          startFreq: noteFreq(n),
          start: t + 0.3 + i * 0.001,
          duration: 0.4,
          peak: 0.1,
          attack: 0.01,
          dest,
        });
      });
      break;
    }

    case "gameOver": {
      const notes = ["A4", "G4", "F4", "E4", "D4"];
      notes.forEach((n, i) => {
        scheduleTone({
          type: "triangle",
          startFreq: noteFreq(n),
          start: t + i * 0.22,
          duration: 0.3,
          peak: 0.18,
          attack: 0.01,
          dest,
        });
      });
      break;
    }

    case "shieldActivate": {
      const notes = ["C6", "E6", "G6"];
      notes.forEach((n, i) => {
        scheduleTone({
          type: "sine",
          startFreq: noteFreq(n),
          start: t + i * 0.045,
          duration: 0.22,
          peak: 0.12,
          attack: 0.01,
          dest,
        });
      });
      break;
    }

    case "battleCry": {
      scheduleTone({
        type: "sawtooth",
        startFreq: noteFreq("G4"),
        endFreq: noteFreq("C5"),
        glideTime: 0.1,
        start: t,
        duration: 0.32,
        peak: 0.16,
        attack: 0.01,
        dest,
      });
      scheduleTone({
        type: "square",
        startFreq: noteFreq("G4"),
        endFreq: noteFreq("C5"),
        glideTime: 0.1,
        start: t,
        duration: 0.32,
        peak: 0.1,
        detune: 8,
        attack: 0.01,
        dest,
      });
      break;
    }
  }
}
