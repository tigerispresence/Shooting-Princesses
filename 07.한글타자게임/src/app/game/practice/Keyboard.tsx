"use client";

import { BASE_MAP, SHIFT_MAP, type Key } from "../hangul";
import { CODE_FINGER, FINGER_COLOR, FINGER_ORDER, FINGER_SHORT, KEY_GAP, KEY_U, WRONG_PINK, isLeftHand, type Finger } from "../constants";

interface KeyDef {
  code: string;
  w: number; // units
  label?: string; // for non-letter keys
  small?: string;
}

const R = (codes: string, prefix = "Key"): KeyDef[] => [...codes].map((c) => ({ code: prefix + c, w: 1, small: c }));

export const ROWS: { x0: number; keys: KeyDef[] }[] = [
  {
    x0: 0,
    keys: [
      { code: "Backquote", w: 1, label: "`" },
      ...[..."1234567890"].map((d) => ({ code: `Digit${d}`, w: 1, label: d })),
      { code: "Minus", w: 1, label: "-" },
      { code: "Equal", w: 1, label: "=" },
      { code: "Backspace", w: 2, label: "←" },
    ],
  },
  {
    x0: 0,
    keys: [
      { code: "Tab", w: 1.5, label: "Tab" },
      ...R("QWERTYUIOP"),
      { code: "BracketLeft", w: 1, label: "[" },
      { code: "BracketRight", w: 1, label: "]" },
      { code: "Backslash", w: 1.5, label: "\\" },
    ],
  },
  {
    x0: 0,
    keys: [
      { code: "CapsLock", w: 1.75, label: "Caps" },
      ...R("ASDFGHJKL"),
      { code: "Semicolon", w: 1, label: ";" },
      { code: "Quote", w: 1, label: "'" },
      { code: "Enter", w: 2.25, label: "Enter" },
    ],
  },
  {
    x0: 0,
    keys: [
      { code: "ShiftLeft", w: 2.25, label: "Shift" },
      ...R("ZXCVBNM"),
      { code: "Comma", w: 1, label: "," },
      { code: "Period", w: 1, label: "." },
      { code: "Slash", w: 1, label: "/" },
      { code: "ShiftRight", w: 2.75, label: "Shift" },
    ],
  },
  { x0: 3.75, keys: [{ code: "Space", w: 6.25, label: "" }] },
];

const unitW = (w: number) => w * (KEY_U + KEY_GAP) - KEY_GAP;
export const KB_W = unitW(15);
export const KB_H = 5 * KEY_U + 4 * KEY_GAP;

export interface KeyLayout {
  code: string;
  x: number;
  y: number;
  w: number;
  def: KeyDef;
}

export const LAYOUT: KeyLayout[] = (() => {
  const out: KeyLayout[] = [];
  ROWS.forEach((row, r) => {
    let x = row.x0 * (KEY_U + KEY_GAP);
    for (const k of row.keys) {
      const w = unitW(k.w);
      out.push({ code: k.code, x, y: r * (KEY_U + KEY_GAP), w, def: k });
      x += w + KEY_GAP;
    }
  });
  return out;
})();

export const shiftFor = (k: Key): "ShiftLeft" | "ShiftRight" => (isLeftHand(k.code) ? "ShiftRight" : "ShiftLeft");

export interface Pulse {
  code: string;
  id: number;
}

export function Keyboard({
  next,
  hint,
  pressed,
  wrong,
  bounce,
  flashShift,
  heldShift,
  rainbowId,
  marks,
  scale = 1,
}: {
  next: Key | null;
  hint: boolean;
  pressed?: Pulse | null;
  wrong?: Pulse | null;
  bounce?: Pulse | null;
  flashShift?: "ShiftLeft" | "ShiftRight" | null;
  heldShift?: boolean;
  rainbowId?: number;
  /** Mini keyboard on the result screen: code → pink label */
  marks?: Record<string, boolean>;
  scale?: number;
}) {
  const nextShift = next && next.shift ? shiftFor(next) : null;
  return (
    <div className="relative" style={{ width: KB_W * scale, height: KB_H * scale }}>
      {LAYOUT.map(({ code, x, y, w, def }) => {
        const finger = CODE_FINGER[code];
        const color = finger ? FINGER_COLOR[finger] : "#DDD6E3";
        const isNext = hint && !!next && (next.code === code || nextShift === code);
        const isFlash = flashShift === code;
        const isPressed = pressed?.code === code;
        const isHeld = !!heldShift && (code === "ShiftLeft" || code === "ShiftRight");
        const isWrong = wrong?.code === code;
        const isBounce = bounce?.code === code;
        const marked = marks?.[code];
        const ko = BASE_MAP[code] && code !== "Space" ? BASE_MAP[code] : def.label ?? "";
        const sh = SHIFT_MAP[code];
        const cls = [
          "kb-key absolute flex select-none rounded-[10px] font-bold",
          isNext ? "kb-next" : "",
          isFlash ? "kb-flash" : "",
          isPressed ? "kb-down" : "",
          isHeld ? "kb-held" : "",
          isWrong ? "kb-wrong" : "",
          isBounce ? "kb-bounce" : "",
          rainbowId ? "kb-rainbow" : "",
        ].join(" ");
        const bg = marked ? WRONG_PINK : isNext || isFlash ? color : mix(color, 0.2);
        const keyId = `${code}-${isPressed ? pressed?.id : ""}-${isWrong ? wrong?.id : ""}-${isBounce ? bounce?.id : ""}-${rainbowId ?? ""}`;
        return (
          <div
            key={keyId}
            className={cls}
            style={{
              left: x * scale,
              top: y * scale,
              width: w * scale,
              height: KEY_U * scale,
              background: bg,
              border: isNext || isFlash ? `${3 * scale}px solid #fff` : `${1.5 * scale}px solid rgba(120,90,140,0.18)`,
              boxShadow: isNext || isFlash ? `0 0 ${14 * scale}px ${color}` : `0 ${3 * scale}px 0 rgba(120,90,140,0.15)`,
              animationDelay: rainbowId ? `${(x / KB_W) * 0.45}s` : undefined,
              zIndex: isNext || isBounce ? 2 : 1,
            }}
          >
            <span
              className="absolute left-0 right-0 text-center text-[#4a3a5a]"
              style={{ top: 6 * scale, fontSize: (ko.length > 1 ? 14 : 24) * scale, lineHeight: 1 }}
            >
              {ko}
            </span>
            {sh && (
              <span className="absolute text-[#8a6f98]" style={{ right: 5 * scale, top: 3 * scale, fontSize: 14 * scale }}>
                {sh}
              </span>
            )}
            {def.small && (
              <span className="absolute text-[#9d8aa8]" style={{ left: 6 * scale, bottom: 3 * scale, fontSize: 12 * scale, fontWeight: 600 }}>
                {def.small}
              </span>
            )}
            {(code === "KeyF" || code === "KeyJ") && (
              <span
                className="absolute rounded bg-[#6b4f7a]/50"
                style={{ left: "50%", bottom: 8 * scale, width: 14 * scale, height: 3 * scale, transform: "translateX(-50%)" }}
              />
            )}
            {(isNext || isFlash) && (
              <span
                aria-hidden
                className="kb-sparkle pointer-events-none absolute select-none text-white"
                style={{ right: -6 * scale, top: -8 * scale, fontSize: 16 * scale }}
              >
                ✦
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Blend a hex colour toward white at the given strength. */
export function mix(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (c: number) => Math.round(255 - (255 - c) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function FingerBar({ active, big }: { active: Finger[]; big: Finger | null }) {
  return (
    <div className="flex items-end justify-center gap-3">
      {FINGER_ORDER.map((f, i) => {
        const on = active.includes(f);
        const isBig = big === f;
        const s = isBig ? 1.5 : on ? 1.3 : 1;
        return (
          <div key={f} className={`flex flex-col items-center ${i === 5 ? "ml-8" : ""}`} style={{ width: 52 }}>
            <div
              className="rounded-full transition-transform duration-150"
              style={{
                width: 40,
                height: 40,
                background: FINGER_COLOR[f],
                transform: `scale(${s})`,
                boxShadow: on || isBig ? `0 0 16px ${FINGER_COLOR[f]}, 0 0 0 3px #fff` : "0 2px 0 rgba(120,90,140,0.2)",
                opacity: on || isBig || active.length === 0 ? 1 : 0.55,
              }}
            />
            <div className="mt-1.5 text-[13px] font-bold text-[#7a6688]">{FINGER_SHORT[f]}</div>
          </div>
        );
      })}
    </div>
  );
}
