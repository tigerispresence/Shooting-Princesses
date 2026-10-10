/**
 * 두벌식 (standard 2-set Korean) keyboard automaton.
 *
 * Pure module: no DOM, no React. The game never uses the OS IME — every
 * keydown's `event.code` is mapped here to a jamo, and on-screen text is
 * always `compose(keys)`. See DESIGN.md §5.
 */

/** One physical keystroke. `shift` is true only for the shifted jamo (ㄲ ㄸ ㅃ ㅆ ㅉ ㅒ ㅖ, ! ?). */
export interface Key {
  code: string;
  shift: boolean;
  jamo: string;
}

// ---------------------------------------------------------------------------
// Keymap (§5.1)
// ---------------------------------------------------------------------------

export const BASE_MAP: Record<string, string> = {
  KeyQ: "ㅂ", KeyW: "ㅈ", KeyE: "ㄷ", KeyR: "ㄱ", KeyT: "ㅅ",
  KeyY: "ㅛ", KeyU: "ㅕ", KeyI: "ㅑ", KeyO: "ㅐ", KeyP: "ㅔ",
  KeyA: "ㅁ", KeyS: "ㄴ", KeyD: "ㅇ", KeyF: "ㄹ", KeyG: "ㅎ",
  KeyH: "ㅗ", KeyJ: "ㅓ", KeyK: "ㅏ", KeyL: "ㅣ",
  KeyZ: "ㅋ", KeyX: "ㅌ", KeyC: "ㅊ", KeyV: "ㅍ", KeyB: "ㅠ",
  KeyN: "ㅜ", KeyM: "ㅡ",
  Space: " ", Period: ".", Comma: ",",
};

export const SHIFT_MAP: Record<string, string> = {
  KeyQ: "ㅃ", KeyW: "ㅉ", KeyE: "ㄸ", KeyR: "ㄲ", KeyT: "ㅆ",
  KeyO: "ㅒ", KeyP: "ㅖ",
  Digit1: "!", Slash: "?",
};

/** Codes whose shifted form is only reachable with Shift (no base glyph). */
const SHIFT_ONLY = new Set(["Digit1", "Slash"]);

/**
 * Map a physical key to a game Key. Returns null for keys outside the table
 * (digits, other symbols, F-keys, Shift+Period, ...), which callers ignore.
 * Shift on a key without a shifted jamo gives the base jamo (Shift+A = ㅁ).
 * Shift+Space is a plain space (§13).
 */
export function mapCode(code: string, shiftHeld: boolean): Key | null {
  if (shiftHeld && SHIFT_MAP[code]) return { code, shift: true, jamo: SHIFT_MAP[code] };
  if (SHIFT_ONLY.has(code)) return null;
  if (shiftHeld && (code === "Period" || code === "Comma")) return null; // < >
  const j = BASE_MAP[code];
  if (!j) return null;
  return { code, shift: false, jamo: j };
}

/** Reverse map jamo/symbol → Key. */
export const JAMO_TO_KEY: Record<string, Key> = (() => {
  const out: Record<string, Key> = {};
  for (const [code, jamo] of Object.entries(BASE_MAP)) out[jamo] = { code, shift: false, jamo };
  for (const [code, jamo] of Object.entries(SHIFT_MAP)) out[jamo] = { code, shift: true, jamo };
  return out;
})();

/** The 33 letter jamo on the keyboard (26 base + 7 shifted). */
export const ALL_KEY_JAMO: string[] = [
  ..."ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ",
  ..."ㅃㅉㄸㄲㅆㅒㅖ",
];

// ---------------------------------------------------------------------------
// Jamo tables (§5.2)
// ---------------------------------------------------------------------------

export const CHO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
export const JUNG = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
export const JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

const CONSONANTS = new Set(CHO);
const VOWELS = new Set(JUNG);

export const COMPOUND_VOWEL: Record<string, string> = {
  "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ",
  "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ",
  "ㅡㅣ": "ㅢ",
};
export const COMPOUND_JONG: Record<string, string> = {
  "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ",
  "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ",
  "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ",
  "ㅂㅅ": "ㅄ",
};
const SPLIT_VOWEL: Record<string, [string, string]> = {};
for (const [k, v] of Object.entries(COMPOUND_VOWEL)) SPLIT_VOWEL[v] = [k[0], k[1]];
const SPLIT_JONG: Record<string, [string, string]> = {};
for (const [k, v] of Object.entries(COMPOUND_JONG)) SPLIT_JONG[v] = [k[0], k[1]];

const JONG_OK = new Set(JONG.filter((j) => j && !SPLIT_JONG[j])); // single finals; ㄸㅃㅉ excluded by table

export const isConsonant = (j: string) => CONSONANTS.has(j);
export const isVowel = (j: string) => VOWELS.has(j);

const SBASE = 0xac00;
const SEND = 0xd7a3;

export function isSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= SBASE && c <= SEND;
}

export function syllableParts(ch: string): { cho: string; jung: string; jong: string } | null {
  if (!isSyllable(ch)) return null;
  const s = ch.charCodeAt(0) - SBASE;
  return {
    cho: CHO[Math.floor(s / 588)],
    jung: JUNG[Math.floor((s % 588) / 28)],
    jong: JONG[s % 28],
  };
}

function makeSyllable(cho: string, jung: string, jong: string): string {
  return String.fromCharCode(
    SBASE + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong),
  );
}

// ---------------------------------------------------------------------------
// decompose (§5.3)
// ---------------------------------------------------------------------------

function jamoToKey(j: string): Key {
  const k = JAMO_TO_KEY[j];
  if (!k) throw new Error(`No key for "${j}"`);
  return k;
}

/** Jamo sequence for one character (syllable, lone jamo, or symbol). */
export function charJamos(ch: string): string[] {
  const p = syllableParts(ch);
  if (!p) {
    if (SPLIT_VOWEL[ch]) return [...SPLIT_VOWEL[ch]];
    if (SPLIT_JONG[ch]) return [...SPLIT_JONG[ch]];
    return [ch];
  }
  const out = [p.cho];
  if (SPLIT_VOWEL[p.jung]) out.push(...SPLIT_VOWEL[p.jung]);
  else out.push(p.jung);
  if (p.jong) {
    if (SPLIT_JONG[p.jong]) out.push(...SPLIT_JONG[p.jong]);
    else out.push(p.jong);
  }
  return out;
}

/** Target text → keystroke sequence. Throws on characters the keyboard can't type. */
export function decompose(text: string): Key[] {
  const out: Key[] = [];
  for (const ch of text) for (const j of charJamos(ch)) out.push(jamoToKey(j));
  return out;
}

/** Same as decompose but only the jamo strings. */
export function decomposeJamo(text: string): string[] {
  return decompose(text).map((k) => k.jamo);
}

/** For each key of decompose(text), the index of the character it belongs to. */
export function keyCharIndex(text: string): number[] {
  const out: number[] = [];
  let i = 0;
  for (const ch of text) {
    const n = charJamos(ch).length;
    for (let k = 0; k < n; k++) out.push(i);
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// compose (§5.4)
// ---------------------------------------------------------------------------

interface Cur {
  cho?: string;
  jung?: string;
  jong?: string;
}

function flush(cur: Cur): string {
  if (cur.cho && cur.jung) return makeSyllable(cur.cho, cur.jung, cur.jong ?? "");
  if (cur.cho) return cur.cho;
  if (cur.jung) return cur.jung;
  return "";
}

/** Keystroke jamo sequence → displayed text. Pure; both strict and free mode use it. */
export function compose(jamos: readonly string[]): string {
  let out = "";
  let cur: Cur = {};
  for (const j of jamos) {
    if (isConsonant(j)) {
      if (!cur.cho && !cur.jung) {
        cur = { cho: j };
      } else if (!cur.jung || !cur.cho) {
        // cho only, or vowel only
        out += flush(cur);
        cur = { cho: j };
      } else if (!cur.jong) {
        if (JONG_OK.has(j)) cur.jong = j;
        else {
          out += flush(cur);
          cur = { cho: j };
        }
      } else {
        const dbl = COMPOUND_JONG[cur.jong + j];
        if (dbl) cur.jong = dbl;
        else {
          out += flush(cur);
          cur = { cho: j };
        }
      }
    } else if (isVowel(j)) {
      if (!cur.cho && !cur.jung) {
        cur = { jung: j };
      } else if (!cur.jung) {
        cur.jung = j;
      } else if (!cur.jong) {
        const dbl = COMPOUND_VOWEL[cur.jung + j];
        if (dbl) cur.jung = dbl;
        else {
          out += flush(cur);
          cur = { jung: j };
        }
      } else {
        // 종성 이동
        const split = SPLIT_JONG[cur.jong];
        let moved: string;
        if (split) {
          cur.jong = split[0];
          moved = split[1];
        } else {
          moved = cur.jong;
          cur.jong = undefined;
        }
        out += flush(cur);
        cur = { cho: moved, jung: j };
      }
    } else {
      out += flush(cur);
      cur = {};
      out += j;
    }
  }
  return out + flush(cur);
}

/** True if `a` is a prefix of `b` (jamo arrays). */
export function isPrefix(a: readonly string[], b: readonly string[]): boolean {
  if (a.length > b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && isPrefix(a, b);
}

// ---------------------------------------------------------------------------
// Content classification (used by the 낱말 level checks in the tests)
// ---------------------------------------------------------------------------

export function wordFeatures(word: string) {
  let jong = false;
  let shift = false;
  let compoundJong = false;
  let compoundVowel = false;
  let yeYae = false;
  for (const ch of word) {
    const p = syllableParts(ch);
    if (!p) continue;
    if (p.jong) jong = true;
    if (SPLIT_JONG[p.jong]) compoundJong = true;
    if (SPLIT_VOWEL[p.jung]) compoundVowel = true;
    if (p.jung === "ㅒ" || p.jung === "ㅖ") yeYae = true;
  }
  for (const k of decompose(word)) if (k.shift) shift = true;
  return { jong, shift, compoundJong, compoundVowel, yeYae };
}
