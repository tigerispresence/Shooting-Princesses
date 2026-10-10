"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compose, decompose, JAMO_TO_KEY, keyCharIndex, type Key } from "../hangul";
import { JARI_LINE_LEN, JARI_STAGES, WORD_LEVEL_NAMES, drawSentences, drawWords, makeJariRound } from "../content";
import {
  CODE_FINGER,
  CPM_HIDE_FIRST_MS,
  CPM_REFRESH_MS,
  FINGER_FULL,
  JARI_LINE_FLASH_MS,
  RAINBOW_WAVE_MS,
  SAME_CHAR_MISS_HINT,
  SENTENCE_COUNT,
  SENTENCE_FLASH_MS,
  SHIFT_MISS_HINT,
  WORD_COUNT,
  WRONG_PINK,
  type Finger,
} from "../constants";
import { playSfx } from "../audio";
import { applyPractice, type PracticeMode, type PracticeStats } from "../progress";
import { BackButton, Btn, SpeakerButton, isSelect, useApp, useKeys, type Screen } from "../ui/common";
import { isCode } from "../keyInput";
import { FingerBar, Keyboard, shiftFor, type Pulse } from "./Keyboard";
import { PracticeResult, type ResultData } from "./PracticeResult";

interface Round {
  units: string[]; // display text per unit (line / word / sentence)
  keys: Key[][];
}

function buildRound(mode: PracticeMode, level: number): Round {
  if (mode === "jari") {
    const all = makeJariRound(level);
    const units: string[] = [];
    const keys: Key[][] = [];
    for (let i = 0; i < all.length; i += JARI_LINE_LEN) {
      const line = all.slice(i, i + JARI_LINE_LEN);
      units.push(line.join(""));
      keys.push(line.map((j) => JAMO_TO_KEY[j]));
    }
    return { units, keys };
  }
  const units = mode === "word" ? drawWords(level, WORD_COUNT) : drawSentences(SENTENCE_COUNT);
  return { units, keys: units.map((u) => decompose(u)) };
}

export function modeTitle(mode: PracticeMode, level: number): string {
  if (mode === "jari") return `자리연습 ${level + 1}단계 · ${JARI_STAGES[level].name}`;
  if (mode === "word") return `낱말연습 · ${WORD_LEVEL_NAMES[level]}`;
  return "짧은 글 연습";
}

interface G {
  round: Round;
  unit: number;
  pos: number;
  correct: number;
  wrong: number;
  missed: Record<string, number>;
  sameMiss: number;
  shiftHeldMiss: number;
  shiftMissingMiss: number;
  firstAt: number | null;
  activeMs: number;
  runSince: number | null;
  flashUntil: number;
  flashTimer: ReturnType<typeof setTimeout> | null;
  lastCorrectMs: number;
  done: boolean;
  blurred: boolean;
}

function freshG(mode: PracticeMode, level: number): G {
  return {
    round: buildRound(mode, level),
    unit: 0,
    pos: 0,
    correct: 0,
    wrong: 0,
    missed: {},
    sameMiss: 0,
    shiftHeldMiss: 0,
    shiftMissingMiss: 0,
    firstAt: null,
    activeMs: 0,
    runSince: null,
    flashUntil: 0,
    flashTimer: null,
    lastCorrectMs: 0,
    done: false,
    blurred: false,
  };
}

export function PracticeScreen({ mode, level }: { mode: PracticeMode; level: number }) {
  const app = useApp();
  const { profile, commit, go } = app;
  // Mutable round state lives in a ref (handlers/timers); `view` is the render snapshot.
  const [view, setView] = useState<G>(() => freshG(mode, level));
  const g = useRef<G>(view);
  const rerender = useCallback(() => setView({ ...g.current }), []);

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [pressed, setPressed] = useState<Pulse | null>(null);
  const [wrongKey, setWrongKey] = useState<Pulse | null>(null);
  const [bounce, setBounce] = useState<Pulse | null>(null);
  const [shakeId, setShakeId] = useState(0);
  const [shakeOn, setShakeOn] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; finger: Finger | null; shift: "ShiftLeft" | "ShiftRight" | null } | null>(null);
  const [heldShift, setHeldShift] = useState(false);
  const [cpmText, setCpmText] = useState("--");
  const [flashUnit, setFlashUnit] = useState<number | null>(null);
  const [rainbowId, setRainbowId] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const pulseId = useRef(1);
  const [, setNowTick] = useState(0);

  const hint = profile?.showKeyHint !== false;

  // ---- timing -------------------------------------------------------------
  const now = () => performance.now();
  const elapsed = () => {
    const s = g.current;
    return s.activeMs + (s.runSince !== null ? now() - s.runSince : 0);
  };
  const stopRun = () => {
    const s = g.current;
    if (s.runSince !== null) {
      s.activeMs += now() - s.runSince;
      s.runSince = null;
    }
  };
  const startRun = () => {
    const s = g.current;
    if (s.runSince === null && s.firstAt !== null && !s.done && !pausedRef.current && !s.blurred && s.flashUntil === 0)
      s.runSince = now();
  };

  // live CPM every 0.5s, "--" for the first 3s
  useEffect(() => {
    const id = setInterval(() => {
      const s = g.current;
      if (s.firstAt === null || s.done) return;
      const ms = elapsed();
      setCpmText(ms < CPM_HIDE_FIRST_MS ? "--" : String(Math.round((s.correct * 60) / (ms / 1000))));
    }, CPM_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause timing while the window is unfocused
  useEffect(() => {
    const onBlur = () => {
      g.current.blurred = true;
      stopRun();
      setHeldShift(false);
    };
    const onFocus = () => {
      g.current.blurred = false;
      startRun();
    };
    const onVis = () => (document.hidden ? onBlur() : onFocus());
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") setHeldShift(false);
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keyup", onKeyUp);
      if (g.current.flashTimer) clearTimeout(g.current.flashTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // blink the caret / pulse animations don't need ticks, but the bubble does
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const restart = (lv = level) => {
    if (g.current.flashTimer) clearTimeout(g.current.flashTimer);
    g.current = freshG(mode, lv);
    pausedRef.current = false;
    setPaused(false);
    setResult(null);
    setBubble(null);
    setCpmText("--");
    setFlashUnit(null);
    setRainbowId(0);
    rerender();
  };

  const backScreen = (): Screen =>
    mode === "jari" ? { name: "jariSelect" } : mode === "word" ? { name: "wordSelect" } : { name: "menu" };

  const finish = () => {
    const s = g.current;
    s.done = true;
    stopRun();
    const seconds = Math.max(0.5, s.lastCorrectMs / 1000);
    const cpm = Math.round((s.correct * 60) / seconds);
    const acc = Math.round((s.correct / (s.correct + s.wrong)) * 100);
    const stats: PracticeStats = { mode, level, correct: s.correct, wrong: s.wrong, seconds, cpm, acc, missedKeys: { ...s.missed } };
    let res: ResultData | null = null;
    if (profile) {
      commit((d) => {
        const out = applyPractice(d, profile.id, stats);
        const p = d.profiles.find((x) => x.id === profile.id)!;
        const recent = (p.recentCpm[mode === "sentence" ? "sentence" : `${mode}-${level + 1}`] ?? []).slice(-5);
        res = { stats, stars: out.stars, candies: out.candies, newRecord: out.newRecord, recent, newStickers: out.newStickers, familyUnlocks: out.familyUnlocks };
      });
    }
    const show = () => {
      if (res) setResult(res);
    };
    if (mode === "jari" && s.wrong === 0) {
      setRainbowId(Date.now());
      setTimeout(show, RAINBOW_WAVE_MS);
    } else show();
  };

  const advanceUnit = () => {
    const s = g.current;
    if (s.flashTimer) clearTimeout(s.flashTimer);
    s.flashTimer = null;
    s.flashUntil = 0;
    s.unit++;
    s.pos = 0;
    setFlashUnit(null);
    startRun();
    rerender();
  };

  const completeUnit = () => {
    const s = g.current;
    playSfx("word");
    if (s.unit === s.round.units.length - 1) {
      finish();
      rerender();
      return;
    }
    const ms = mode === "jari" ? JARI_LINE_FLASH_MS : mode === "sentence" ? SENTENCE_FLASH_MS : 0;
    if (ms === 0) {
      s.unit++;
      s.pos = 0;
      rerender();
      return;
    }
    stopRun();
    s.flashUntil = now() + ms;
    setFlashUnit(s.unit);
    s.flashTimer = setTimeout(() => {
      if (g.current === s && s.flashUntil) advanceUnit();
    }, ms);
    rerender();
  };

  const handleKey = (key: Key, shiftHeld: boolean) => {
    const s = g.current;
    if (s.done) return;
    if (s.flashUntil) advanceUnit();
    if (s.firstAt === null) {
      s.firstAt = now();
      startRun();
    }
    const expected = s.round.keys[s.unit][s.pos];
    setPressed({ code: key.code, id: pulseId.current++ });
    if (key.jamo === expected.jamo) {
      s.correct++;
      s.pos++;
      s.sameMiss = 0;
      s.shiftHeldMiss = 0;
      s.shiftMissingMiss = 0;
      s.lastCorrectMs = elapsed();
      setBubble(null);
      setBounce(null);
      playSfx("key");
      if (s.pos >= s.round.keys[s.unit].length) completeUnit();
      else rerender();
      return;
    }
    // wrong — never advances
    s.wrong++;
    s.missed[expected.jamo] = (s.missed[expected.jamo] ?? 0) + 1;
    s.sameMiss++;
    if (!expected.shift && shiftHeld) {
      s.shiftHeldMiss++;
      s.shiftMissingMiss = 0;
    } else if (expected.shift && !shiftHeld) {
      s.shiftMissingMiss++;
      s.shiftHeldMiss = 0;
    } else {
      s.shiftHeldMiss = 0;
      s.shiftMissingMiss = 0;
    }
    playSfx("wrong");
    setShakeId(pulseId.current++);
    setShakeOn(true);
    setWrongKey({ code: key.code, id: pulseId.current++ });
    setBounce({ code: expected.code, id: pulseId.current++ });
    if (s.shiftMissingMiss >= SHIFT_MISS_HINT) {
      setBubble({ text: "Shift를 같이 눌러요!", finger: null, shift: shiftFor(expected) });
    } else if (s.shiftHeldMiss >= SHIFT_MISS_HINT) {
      setBubble({ text: "Shift에서 손을 떼 볼까요?", finger: null, shift: null });
    } else if (s.sameMiss >= SAME_CHAR_MISS_HINT) {
      const f = CODE_FINGER[expected.code];
      const label = expected.jamo === " " ? "띄어쓰기" : expected.jamo;
      const who = f ? FINGER_FULL[f] : "손가락";
      setBubble({ text: `${who}로 ${label}${expected.shift ? " (Shift)" : ""}!`, finger: f ?? null, shift: null });
    }
    rerender();
  };

  // clear transient pulses
  useEffect(() => {
    if (!shakeOn) return;
    const t = setTimeout(() => setShakeOn(false), 150);
    return () => clearTimeout(t);
  }, [shakeOn, shakeId]);
  useEffect(() => {
    if (!wrongKey) return;
    const t = setTimeout(() => setWrongKey(null), 200);
    return () => clearTimeout(t);
  }, [wrongKey]);

  const pause = () => {
    if (g.current.done) return;
    pausedRef.current = true;
    stopRun();
    setPaused(true);
  };
  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
    startRun();
  };

  useKeys(
    (a) => {
      if (result) return; // result screen has its own handler
      if (paused) {
        if (isSelect(a)) resume();
        else if (isCode(a, "KeyR")) restart();
        else if (a.type === "escape") go(backScreen());
        return;
      }
      if (a.type === "escape") return pause();
      if (a.type === "shift") return setHeldShift(true);
      if (a.type === "key") {
        if (a.shiftHeld) setHeldShift(true);
        handleKey(a.key, a.shiftHeld);
      }
      // Backspace, Enter, digits, everything else: ignored in strict mode
    },
    true,
  );

  if (result) {
    return (
      <PracticeResult
        data={result}
        mode={mode}
        level={level}
        onRetry={() => restart()}
        onNext={() => {
          const nextLevel = level + 1;
          go({ name: "practice", mode, level: nextLevel });
        }}
        onMenu={() => go(backScreen())}
      />
    );
  }

  const s = view;
  const unitKeys = s.round.keys[Math.min(s.unit, s.round.keys.length - 1)];
  const next = !s.done && !s.flashUntil ? unitKeys[s.pos] ?? null : null;
  const total = s.round.units.length;
  const acc = s.correct + s.wrong === 0 ? 100 : Math.round((s.correct / (s.correct + s.wrong)) * 100);
  const activeFingers: Finger[] = [];
  if (next) {
    const f = CODE_FINGER[next.code];
    if (next.code === "Space") activeFingers.push("lt", "rt");
    else if (f) activeFingers.push(f);
    if (next.shift) activeFingers.push(shiftFor(next) === "ShiftLeft" ? "lp" : "rp");
  }
  const bubbleRight = bubble?.finger ? bubble.finger.startsWith("r") && bubble.finger !== "rt" : bubble?.shift === "ShiftRight";
  const progressLabel = mode === "jari" ? `${Math.min(s.unit + 1, total)} / ${total} 줄` : `${Math.min(s.unit + (s.done ? 0 : 1), total)} / ${total}`;
  const progressFrac = (s.unit + (s.done ? 1 : s.pos / unitKeys.length)) / total;

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#FFF4FA] to-[#EEF7FF] text-[#5b4a6b]">
      {/* top bar */}
      <div className="absolute left-0 right-0 top-0 flex h-16 items-center gap-4 border-b-2 border-[#F1E2F3] bg-white/70 px-4">
        <BackButton onClick={pause} />
        <div className="text-xl font-extrabold text-[#6b4f7a]">{modeTitle(mode, level)}</div>
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold">{progressLabel}</div>
          <div className="h-3 w-40 overflow-hidden rounded-full bg-[#EADCF2]">
            <div className="h-full rounded-full bg-[#FF8FB8] transition-all" style={{ width: `${progressFrac * 100}%` }} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5 text-lg font-bold">
          <div>
            타수 <span className="text-2xl text-[#FF6F91]">{cpmText}</span>타
          </div>
          <div>
            정확도 <span className="text-2xl text-[#4FA3E0]">{acc}</span>%
          </div>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              profile &&
              commit((d) => {
                const p = d.profiles.find((x) => x.id === profile.id);
                if (p) p.showKeyHint = !p.showKeyHint;
              })
            }
            className={`rounded-xl px-3 py-1.5 text-base font-bold shadow-[0_2px_0_#E3C7E8] cursor-pointer ${hint ? "bg-[#FF8FB8] text-white" : "bg-white text-[#9d8aa8]"}`}
          >
            키보드 보기 {hint ? "켜짐" : "꺼짐"}
          </button>
          <SpeakerButton />
        </div>
      </div>

      {/* problem area y 80–300 */}
      <div className="absolute left-0 right-0" style={{ top: 80, height: 220 }}>
        {mode === "jari" && <JariArea g={s} shakeId={shakeOn ? shakeId : 0} flash={flashUnit !== null} />}
        {mode === "word" && <WordArea g={s} shakeId={shakeOn ? shakeId : 0} />}
        {mode === "sentence" && <SentenceArea g={s} shakeId={shakeOn ? shakeId : 0} flash={flashUnit !== null} />}
      </div>

      {bubble && (
        // Sits in the empty corner beside the space bar, on the side of the hand it talks about.
        <div
          className="absolute z-10 whitespace-nowrap rounded-full border-4 border-[#FFD1E3] bg-white px-6 py-2 text-2xl font-extrabold text-[#FF6F91] shadow-lg bubble-pop"
          style={bubbleRight ? { top: 578, right: 168 } : { top: 578, left: 168 }}
        >
          {bubble.text}
        </div>
      )}

      {/* keyboard y 320–640 */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 320 }}>
        <Keyboard
          next={next}
          hint={hint}
          pressed={pressed}
          wrong={wrongKey}
          bounce={bounce}
          flashShift={bubble?.shift ?? null}
          heldShift={heldShift}
          rainbowId={rainbowId || undefined}
        />
      </div>

      {/* finger bar y 650–710 */}
      <div className="absolute left-0 right-0" style={{ top: 646 }}>
        <FingerBar active={hint ? activeFingers : []} big={bubble?.finger ?? null} />
      </div>

      {paused && (
        <PauseOverlay
          onResume={resume}
          onRestart={() => restart()}
          onExit={() => go(backScreen())}
        />
      )}
    </div>
  );
}

export function PauseOverlay({ onResume, onRestart, onExit }: { onResume: () => void; onRestart: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#5b4a6b]/40">
      <div className="overlay-pop flex w-[440px] flex-col items-center gap-4 rounded-[32px] bg-white p-8 shadow-2xl">
        <div className="text-4xl font-extrabold text-[#6b4f7a]">잠깐 쉬어요</div>
        <Btn big className="w-full bg-[#FF8FB8]! text-white!" onClick={onResume}>
          계속하기 (Enter)
        </Btn>
        <Btn big className="w-full" onClick={onRestart}>
          처음부터 (R)
        </Btn>
        <Btn big className="w-full" onClick={onExit}>
          나가기 (Esc)
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem areas
// ---------------------------------------------------------------------------

function JariArea({ g, shakeId, flash }: { g: G; shakeId: number; flash: boolean }) {
  const unit = Math.min(g.unit, g.round.units.length - 1);
  const line = [...g.round.units[unit]];
  const keys = g.round.keys[unit];
  const boxW = 80;
  const gap = 12;
  const total = line.length * boxW + (line.length - 1) * gap;
  return (
    <div className="relative h-full">
      <div className="absolute flex" style={{ left: (1280 - total) / 2, top: 30, gap }}>
        {line.map((ch, i) => {
          const done = i < g.pos || flash || g.done;
          const cur = i === g.pos && !flash && !g.done;
          const f = CODE_FINGER[keys[i].code];
          const color = f ? `var(--f-${f})` : "#ccc";
          return (
            <div
              key={cur ? `c${i}-${shakeId}` : `b${i}`}
              className={`relative flex items-center justify-center rounded-2xl text-[48px] font-extrabold ${cur ? "box-bounce" : ""} ${
                cur && shakeId ? "shake" : ""
              } ${flash ? "line-flash" : ""}`}
              style={{
                width: boxW,
                height: boxW,
                background: done ? "#EFEAF2" : "#fff",
                color: done ? "#B9AFC2" : "#4a3a5a",
                border: cur ? `4px solid ${color}` : "2px solid #EADCF2",
                boxShadow: cur ? `0 0 14px ${color}` : undefined,
              }}
            >
              {ch}
              {done && <span className="absolute right-1.5 top-0.5 text-base text-[#8EE6A0]">✓</span>}
            </div>
          );
        })}
      </div>
      <div className="absolute left-0 right-0 flex justify-center gap-3" style={{ top: 140 }}>
        {g.round.units.map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i < g.unit || g.done ? "bg-[#8EE6A0]" : i === g.unit ? "bg-[#FF8FB8]" : "bg-[#E2D8EA]"}`} />
        ))}
        <span className="ml-2 text-lg font-bold text-[#9d8aa8]">
          {Math.min(g.unit + 1, g.round.units.length)} / {g.round.units.length} 줄
        </span>
      </div>
    </div>
  );
}

function TargetText({ text, pos, keysLen, size, shakeId, done, spaceDots, pink }: { text: string; pos: number; keysLen: number; size: number; shakeId: number; done: boolean; spaceDots?: boolean; pink?: boolean }) {
  const idx = keyCharIndex(text);
  const curChar = done || pos >= keysLen ? Infinity : idx[pos];
  const chars = [...text];
  return (
    <div className="flex justify-center font-extrabold" style={{ fontSize: size, lineHeight: 1.2 }}>
      {chars.map((ch, i) => {
        const state = i < curChar ? "done" : i === curChar ? "cur" : "todo";
        const isSpace = ch === " ";
        return (
          <span
            key={state === "cur" ? `c${i}-${shakeId}` : `${i}`}
            className={`relative inline-block ${state === "cur" && shakeId ? "shake" : ""}`}
            style={{
              color: state === "done" ? "#4a3a5a" : state === "cur" ? "#4a3a5a" : "#C9BED3",
              minWidth: isSpace ? size * 0.35 : undefined,
            }}
          >
            {isSpace ? "\u00a0" : ch}
            {isSpace && spaceDots && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#E2D8EA]" />}
            {state === "cur" && (
              <span
                className="absolute -bottom-1 left-0 right-0 rounded-full"
                style={{ height: Math.max(6, size / 9), background: shakeId || pink ? WRONG_PINK : "#FFE066" }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

function Typed({ keys, size }: { keys: Key[]; size: number }) {
  const text = compose(keys.map((k) => k.jamo));
  return (
    <div className="flex items-center justify-center font-extrabold text-[#6b4f7a]" style={{ fontSize: size, lineHeight: 1.2, whiteSpace: "pre" }}>
      {text}
      <span className="caret ml-1 inline-block rounded bg-[#B88CFF]" style={{ width: 4, height: size * 0.9 }} />
    </div>
  );
}

function WordArea({ g, shakeId }: { g: G; shakeId: number }) {
  const unit = Math.min(g.unit, g.round.units.length - 1);
  const word = g.round.units[unit];
  const keys = g.round.keys[unit];
  const nextWords = g.round.units.slice(unit + 1, unit + 3);
  return (
    <div className="relative h-full">
      <div className="absolute left-0 right-0" style={{ top: 150 - 80 - 43 }}>
        <TargetText key={unit} text={word} pos={g.pos} keysLen={keys.length} size={72} shakeId={shakeId} done={g.done} pink={g.sameMiss > 0} />
      </div>
      <div className="absolute flex flex-col gap-2 text-[32px] font-bold text-[#C9BED3]" style={{ left: 1000, top: 40, width: 240 }}>
        {nextWords.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="absolute left-0 right-0" style={{ top: 250 - 80 - 34 }}>
        <Typed keys={keys.slice(0, g.pos)} size={56} />
      </div>
    </div>
  );
}

function SentenceArea({ g, shakeId, flash }: { g: G; shakeId: number; flash: boolean }) {
  const unit = Math.min(g.unit, g.round.units.length - 1);
  const text = g.round.units[unit];
  const keys = g.round.keys[unit];
  const next = g.round.units[unit + 1];
  return (
    <div className={`relative h-full ${flash ? "sentence-flash" : ""}`}>
      <div className="absolute left-0 right-0" style={{ top: 140 - 80 - 24 }}>
        <TargetText text={text} pos={g.pos} keysLen={keys.length} size={40} shakeId={shakeId} done={g.done || flash} spaceDots pink={g.sameMiss > 0} />
      </div>
      <div className="absolute left-0 right-0" style={{ top: 210 - 80 - 24 }}>
        <Typed keys={keys.slice(0, g.pos)} size={40} />
      </div>
      {next && (
        <div className="absolute left-0 right-0 text-center text-2xl font-bold text-[#C9BED3]" style={{ top: 280 - 80 - 14 }}>
          {next}
        </div>
      )}
    </div>
  );
}
