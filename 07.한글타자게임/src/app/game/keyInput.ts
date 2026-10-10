/**
 * window keydown → game action (DESIGN.md §5.1, §13). Only `event.code` and
 * `event.shiftKey` are read — never `event.key`, `keyCode`, `isComposing`, or
 * CapsLock state — so the OS 한/영 setting never matters.
 */
import { mapCode, type Key } from "./hangul";

export type KeyAction =
  | { type: "key"; key: Key; shiftHeld: boolean }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "escape" }
  | { type: "arrow"; dir: "up" | "down" | "left" | "right" }
  | { type: "digit"; n: number }
  | { type: "shift"; side: "left" | "right" }
  | { type: "ignored"; code: string };

const ALWAYS_PREVENT = new Set(["Space", "Backspace", "Tab", "Slash", "Quote", "Enter"]);
const IGNORED_LANG = new Set(["Lang1", "Lang2", "HangulMode", "HanjaMode", "AltRight", "CapsLock"]);

/**
 * Returns null when the browser should keep the event (Ctrl/Alt/Meta combos,
 * auto-repeat is returned as null too but still prevented so Space doesn't scroll).
 */
export function readKey(e: KeyboardEvent): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const code = e.code;
  if (ALWAYS_PREVENT.has(code) || code.startsWith("Arrow")) e.preventDefault();
  if (e.repeat) return null;
  if (IGNORED_LANG.has(code)) return { type: "ignored", code };
  if (code === "ShiftLeft" || code === "ShiftRight") return { type: "shift", side: code === "ShiftLeft" ? "left" : "right" };
  if (code === "Backspace") return { type: "backspace" };
  if (code === "Enter" || code === "NumpadEnter") return { type: "enter" };
  if (code === "Escape") return { type: "escape" };
  if (code === "ArrowUp") return { type: "arrow", dir: "up" };
  if (code === "ArrowDown") return { type: "arrow", dir: "down" };
  if (code === "ArrowLeft") return { type: "arrow", dir: "left" };
  if (code === "ArrowRight") return { type: "arrow", dir: "right" };
  const key = mapCode(code, e.shiftKey);
  if (key) {
    e.preventDefault();
    return { type: "key", key, shiftHeld: e.shiftKey };
  }
  if (/^Digit[0-9]$/.test(code) && !e.shiftKey) return { type: "digit", n: Number(code.slice(5)) };
  return { type: "ignored", code };
}

/** Menu helper: the physical key behind a letter shortcut (R, C) regardless of IME. */
export function isCode(a: KeyAction, code: string): boolean {
  return a.type === "key" && a.key.code === code;
}
