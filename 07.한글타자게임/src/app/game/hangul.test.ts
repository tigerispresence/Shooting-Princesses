/**
 * Unit tests for the 두벌식 automaton and the content rules (DESIGN.md §5.4, §9.1).
 * Run: npm test   (npx tsx src/app/game/hangul.test.ts)
 */
import assert from "node:assert/strict";
import { compose, decompose, decomposeJamo, mapCode, wordFeatures, keyCharIndex } from "./hangul";
import {
  WORDS_EASY,
  WORDS_NORMAL,
  WORDS_HARD,
  SENTENCES,
  JARI_STAGES,
  makeJariRound,
  jariPriorKeys,
} from "./content";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}\n  ${(e as Error).message}`);
  }
}

const J = (s: string) => [...s];

// --- §5.4 explicit cases ---------------------------------------------------
test("ㄷㅏㄹㄱㅏ → 달가", () => assert.equal(compose(J("ㄷㅏㄹㄱㅏ")), "달가"));
test("ㄱㅗㅏ → 과", () => assert.equal(compose(J("ㄱㅗㅏ")), "과"));
test("ㅇㅣㅆㅓ → 이써", () => assert.equal(compose(J("ㅇㅣㅆㅓ")), "이써"));
test("ㄱㄱ → ㄱㄱ", () => assert.equal(compose(J("ㄱㄱ")), "ㄱㄱ"));
test("ㅏㄱ → ㅏㄱ", () => assert.equal(compose(J("ㅏㄱ")), "ㅏㄱ"));
test("ㄷㅏㄹㄱ → 닭", () => assert.equal(compose(J("ㄷㅏㄹㄱ")), "닭"));
test("ㄱㅏㄱㅏ → 가가", () => assert.equal(compose(J("ㄱㅏㄱㅏ")), "가가"));
test("ㄱㅏㄱㅣ partial ㄱㅏㄱ → 각", () => assert.equal(compose(J("ㄱㅏㄱ")), "각"));
test("ㄱㅏㄸ → 가ㄸ (ㄸ can't be 종성)", () => assert.equal(compose(J("ㄱㅏㄸ")), "가ㄸ"));
test("ㅗㅏ → ㅘ", () => assert.equal(compose(J("ㅗㅏ")), "ㅘ"));
test("ㄱㅏ.ㄴ → 가.ㄴ", () => assert.equal(compose(J("ㄱㅏ.ㄴ")), "가.ㄴ"));
test("empty", () => assert.equal(compose([]), ""));

// --- §5.3 decompose examples -----------------------------------------------
test("decompose 닭", () => assert.deepEqual(decomposeJamo("닭"), J("ㄷㅏㄹㄱ")));
test("decompose 과자", () => assert.deepEqual(decomposeJamo("과자"), J("ㄱㅗㅏㅈㅏ")));
test("decompose 있어요", () => {
  const ks = decompose("있어요");
  // DESIGN §5.3 lists [ㅇ,ㅣ,ㅆ,ㅓ,ㅇ,ㅛ]; 어 also needs its ㅇ, so the real sequence is 7 keys.
  assert.deepEqual(ks.map((k) => k.jamo), J("ㅇㅣㅆㅇㅓㅇㅛ"));
  assert.equal(ks[2].shift, true);
  assert.equal(ks[2].code, "KeyT");
});
test("keyCharIndex 닭이", () => assert.deepEqual(keyCharIndex("닭이"), [0, 0, 0, 0, 1, 1]));

// --- keymap ------------------------------------------------------------------
test("Shift+A = ㅁ (not shifted)", () => assert.deepEqual(mapCode("KeyA", true), { code: "KeyA", shift: false, jamo: "ㅁ" }));
test("Shift+R = ㄲ", () => assert.equal(mapCode("KeyR", true)?.jamo, "ㄲ"));
test("Digit1 alone ignored", () => assert.equal(mapCode("Digit1", false), null));
test("Shift+Digit1 = !", () => assert.equal(mapCode("Digit1", true)?.jamo, "!"));
test("Shift+Slash = ?", () => assert.equal(mapCode("Slash", true)?.jamo, "?"));
test("Shift+Space = space", () => assert.equal(mapCode("Space", true)?.jamo, " "));
test("Digit5 ignored", () => assert.equal(mapCode("Digit5", false), null));

// --- round trip for all content ------------------------------------------------
for (const w of [...WORDS_EASY, ...WORDS_NORMAL, ...WORDS_HARD, ...SENTENCES]) {
  test(`roundtrip ${w}`, () => assert.equal(compose(decomposeJamo(w)), w));
}

// Every prefix of every word must render without throwing and end in the word.
test("prefix composes are stable", () => {
  for (const w of [...WORDS_EASY, ...WORDS_NORMAL, ...WORDS_HARD, ...SENTENCES]) {
    const ks = decomposeJamo(w);
    for (let i = 0; i <= ks.length; i++) compose(ks.slice(0, i));
  }
});

// --- §9.1 level rules ------------------------------------------------------------
test("word counts", () => {
  assert.equal(WORDS_EASY.length, 60);
  assert.equal(WORDS_NORMAL.length, 60);
  assert.equal(WORDS_HARD.length, 47);
  assert.equal(SENTENCES.length, 24);
});
test("no duplicate words", () => {
  const all = [...WORDS_EASY, ...WORDS_NORMAL, ...WORDS_HARD];
  assert.equal(new Set(all).size, all.length);
});
for (const w of WORDS_EASY) {
  test(`easy rule ${w}`, () => {
    const f = wordFeatures(w);
    assert.ok(!f.jong && !f.shift && !f.compoundVowel && !f.yeYae, JSON.stringify(f));
  });
}
for (const w of WORDS_NORMAL) {
  test(`normal rule ${w}`, () => {
    const f = wordFeatures(w);
    // §9.1 test rule: no Shift keys, no 겹받침 (a few words like 과자 have no 받침 at all).
    assert.ok(!f.shift && !f.compoundJong && !f.yeYae, JSON.stringify(f));
  });
}
for (const w of WORDS_HARD) {
  test(`hard rule ${w}`, () => {
    const f = wordFeatures(w);
    assert.ok(f.shift || f.compoundJong || f.yeYae, JSON.stringify(f));
  });
}
test("sentences use only . , ! ? as symbols", () => {
  for (const s of SENTENCES) for (const ch of s) assert.ok(/[가-힣 .,!?]/.test(ch), `${s}: ${ch}`);
});

// --- 자리연습 generator -------------------------------------------------------------
test("jari rounds", () => {
  for (let st = 0; st < JARI_STAGES.length; st++) {
    for (let r = 0; r < 2000; r++) {
      const round = makeJariRound(st);
      assert.equal(round.length, 30);
      for (let i = 2; i < round.length; i++)
        assert.ok(!(round[i] === round[i - 1] && round[i] === round[i - 2]), `triple in stage ${st + 1}: ${round.join("")}`);
      const stage = JARI_STAGES[st];
      for (const k of stage.newKeys)
        assert.ok(round.filter((x) => x === k).length >= 3, `stage ${st + 1} key ${k} < 3`);
      const allowed = new Set(stage.pool === "all" ? round : [...stage.newKeys, ...jariPriorKeys(st)]);
      for (const k of round) assert.ok(allowed.has(k), `stage ${st + 1} stray key ${k}`);
      if (stage.pool === "all") assert.equal(new Set(round).size, 30);
      for (const k of round) assert.ok(decompose(k).length === 1);
    }
  }
});

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
