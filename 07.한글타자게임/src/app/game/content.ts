/**
 * Practice and rain content (DESIGN.md §8–§10). All words are everyday words;
 * all sentences were written for this game.
 */

export interface JariStage {
  name: string;
  /** New keys introduced in this stage (jamo). Empty for review stages. */
  newKeys: string[];
  /** Keys used to fill the rest of the round. */
  pool: "same" | "mix" | "all";
  /** Share of new keys when pool === "mix". */
  newRatio: number;
}

const S1 = [..."ㅁㄴㅇㄹ"];
const S2 = [..."ㅓㅏㅣ"];
const S4 = [..."ㅂㅈㄷㄱㅕㅑㅐㅔ"];
const S5 = [..."ㅋㅌㅊㅍㅡ"];
const S6 = [..."ㅅㅛㅎㅗㅠㅜ"];
const S7 = [..."ㅃㅉㄸㄲㅆㅒㅖ"];

export const JARI_STAGES: JariStage[] = [
  { name: "기본자리 왼손", newKeys: S1, pool: "same", newRatio: 1 },
  { name: "기본자리 오른손", newKeys: S2, pool: "same", newRatio: 1 },
  { name: "기본자리 모두", newKeys: [...S1, ...S2], pool: "same", newRatio: 1 },
  { name: "윗글쇠", newKeys: S4, pool: "mix", newRatio: 0.7 },
  { name: "아랫글쇠", newKeys: S5, pool: "mix", newRatio: 0.7 },
  { name: "가운데글쇠", newKeys: S6, pool: "mix", newRatio: 0.7 },
  { name: "쌍자음 Shift", newKeys: S7, pool: "mix", newRatio: 0.6 },
  { name: "모두 복습", newKeys: [], pool: "all", newRatio: 0 },
];

/** Keys learned in stages before `idx` (0-based). */
export function jariPriorKeys(idx: number): string[] {
  const groups = [S1, S2, [], S4, S5, S6, S7];
  const out: string[] = [];
  for (let i = 0; i < idx && i < groups.length; i++) out.push(...groups[i]);
  return out;
}

/** Keys shown on the stage tile. */
export function jariStageKeys(idx: number): string[] {
  const st = JARI_STAGES[idx];
  if (st.pool === "all") return [];
  return st.newKeys;
}

export const WORD_LEVEL_NAMES = ["쉬움", "보통", "어려움"];

export const WORDS_EASY = `나비 바다 하마 오리 기차 모자 우주 사자 여우 고래
피아노 바나나 고구마 도토리 비누 치마 구두 아기 나무 하루
노래 우유 포도 자두 거미 개미 소리 머리 다리 허리
가지 오이 무지개 미소 기타 라디오 요리 너구리 부채 어머니
아버지 누나 그네 우비 버스 해바라기 지구 세수 호수 모래
파도 토마토 휴지 가수 나라 야구 제비 보리차 크레파스 시소`.split(/\s+/);

export const WORDS_NORMAL = `사탕 친구 학교 공주 강아지 고양이 선물 풍선 장미 사랑
마음 하늘 구름 바람 달님 동물 공원 놀이터 그림 연필
지우개 공책 색종이 가방 신발 양말 수박 사진 음악 생일
케이크 촛불 선생님 동생 언니 엄마 할머니 가족 우산 눈사람
김밥 만두 과자 사과 의자 기린 원숭이 펭귄 거북이 다람쥐
인형 왕관 요정 마법 반지 줄넘기 자전거 도서관 운동장 산책`.split(/\s+/);

export const WORDS_HARD = `토끼 딸기 꽃밭 아빠 오빠 코끼리 썰매 짝꿍 빵집 떡볶이
꿀벌 쪽지 까치 꼬리 땅콩 뿌리 씨앗 쌍둥이 깜짝 빨강
꿈나라 별똥별 뻐꾸기 찐빵 꽃게 빨래 뜨개질 아저씨 시계 얘기
예쁜 닭 흙 맑음 많이 괜찮아 여덟 값 없어요 읽기
앉아요 짧은 밝은 넓은 깨끗해 따뜻해 있어요`.split(/\s+/);

export const WORD_LISTS = [WORDS_EASY, WORDS_NORMAL, WORDS_HARD];

export const SENTENCES = [
  "오늘도 좋은 하루!",
  "나는 노래를 좋아해요.",
  "고양이가 낮잠을 자요.",
  "하늘에 무지개가 떴어요.",
  "우리는 사이좋은 자매예요.",
  "친구와 함께 그림을 그려요.",
  "바다에서 조개를 주웠어요.",
  "별빛이 반짝반짝 빛나요.",
  "토끼가 깡충깡충 뛰어요.",
  "엄마가 만든 김밥은 최고!",
  "내일은 소풍 가는 날이에요.",
  "꽃밭에 나비가 날아와요.",
  "강아지가 꼬리를 흔들어요.",
  "실수해도 괜찮아, 다시 하면 돼!",
  "책을 읽으면 마음이 따뜻해요.",
  "우리 같이 자전거 탈래?",
  "눈사람이 웃고 있어요.",
  "생일 축하해, 사랑해!",
  "비 온 뒤에 하늘이 맑아요.",
  "나는 무엇이든 할 수 있어!",
  "구름 위로 풍선이 날아가요.",
  "아침마다 우유를 마셔요.",
  "언니랑 같이 춤을 춰요.",
  "연습하면 점점 빨라져요.",
];

// ---------------------------------------------------------------------------
// Shuffle bags
// ---------------------------------------------------------------------------

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export class ShuffleBag<T> {
  private items: T[];
  private bag: T[] = [];
  constructor(items: T[]) {
    this.items = items.slice();
  }
  next(): T {
    if (this.bag.length === 0) this.bag = shuffle(this.items.slice());
    return this.bag.pop() as T;
  }
  /** Draw the first item passing `ok`, leaving rejected items in the bag. */
  nextWhere(ok: (t: T) => boolean): T | null {
    if (this.bag.length === 0) this.bag = shuffle(this.items.slice());
    for (let i = this.bag.length - 1; i >= 0; i--) {
      if (ok(this.bag[i])) return this.bag.splice(i, 1)[0];
    }
    // Nothing left in this pass fits; try a fresh pass of the full list.
    const fresh = shuffle(this.items.slice());
    for (let i = fresh.length - 1; i >= 0; i--) if (ok(fresh[i])) return fresh[i];
    return null;
  }
}

// Session-wide bags so a second round doesn't repeat the first round's words.
const wordBags = WORD_LISTS.map((l) => new ShuffleBag(l));
const sentenceBag = new ShuffleBag(SENTENCES);

export function drawWords(level: number, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(wordBags[level].next());
  return out;
}

export function drawSentences(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(sentenceBag.next());
  return out;
}

// ---------------------------------------------------------------------------
// 자리연습 round generator (§8.2)
// ---------------------------------------------------------------------------

function hasTriple(a: string[]): boolean {
  for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) return true;
  return false;
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export const JARI_ROUND_LEN = 30;
export const JARI_LINE_LEN = 10;

export function makeJariRound(stageIdx: number, rnd: () => number = Math.random): string[] {
  const st = JARI_STAGES[stageIdx];
  const all = [..."ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡㅃㅉㄸㄲㅆㅒㅖ"];
  let out: string[] = [];
  if (st.pool === "all") {
    // 33 keys spread evenly: one pass of a shuffled set covers 30 distinct keys.
    out = shuffle(all.slice(), rnd).slice(0, JARI_ROUND_LEN);
  } else {
    for (const k of st.newKeys) out.push(k, k, k);
    const prior = jariPriorKeys(stageIdx);
    while (out.length < JARI_ROUND_LEN) {
      if (st.pool === "same" || prior.length === 0 || rnd() < st.newRatio) out.push(pick(st.newKeys, rnd));
      else out.push(pick(prior, rnd));
    }
    out = out.slice(0, JARI_ROUND_LEN);
  }
  return arrangeNoTriple(out, rnd);
}

/**
 * Random order of the given multiset with no key three times in a row.
 * Randomised greedy (weighted by remaining count, always taking the most
 * plentiful key when it would otherwise become impossible), retried a few times.
 */
function arrangeNoTriple(items: string[], rnd: () => number): string[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const counts = new Map<string, number>();
    for (const k of items) counts.set(k, (counts.get(k) ?? 0) + 1);
    const seq: string[] = [];
    let ok = true;
    while (seq.length < items.length) {
      const n = seq.length;
      const banned = n >= 2 && seq[n - 1] === seq[n - 2] ? seq[n - 1] : null;
      const left = items.length - n;
      let forced: string | null = null;
      for (const [k, c] of counts) {
        // k needs at least ceil(c/2)-1 separators; if others can't supply them, k must go now
        if (k !== banned && c > 0 && c - 1 > 2 * (left - c)) forced = k;
      }
      let pickKey = forced;
      if (!pickKey) {
        const cands = [...counts].filter(([k, c]) => c > 0 && k !== banned);
        if (!cands.length) {
          ok = false;
          break;
        }
        let r = rnd() * cands.reduce((t, [, c]) => t + c, 0);
        for (const [k, c] of cands) {
          r -= c;
          if (r < 0) {
            pickKey = k;
            break;
          }
        }
        pickKey ??= cands[cands.length - 1][0];
      }
      seq.push(pickKey);
      counts.set(pickKey, (counts.get(pickKey) ?? 0) - 1);
    }
    if (ok && !hasTriple(seq)) return seq;
  }
  return shuffle(items.slice(), rnd);
}

