"use client";

import { useEffect, useRef, useState } from "react";
import { JAMO_TO_KEY } from "../hangul";
import { FAMILY_MILESTONES, PASS_LINES, RETRY_LINE } from "../constants";
import { playSfx } from "../audio";
import type { PracticeMode, PracticeStats } from "../progress";
import { Art, Btn, formatTime, useApp, useKeys } from "../ui/common";
import { isCode } from "../keyInput";
import { drawJar } from "../sprites";
import { Keyboard } from "./Keyboard";
import { modeTitle } from "./PracticeScreen";

export interface ResultData {
  stats: PracticeStats;
  stars: number;
  candies: number;
  newRecord: boolean;
  recent: number[];
  newStickers: number[];
  familyUnlocks: number[];
}

const ENTER_GUARD_MS = 500;

export function PracticeResult({
  data,
  mode,
  level,
  onRetry,
  onNext,
  onMenu,
}: {
  data: ResultData;
  mode: PracticeMode;
  level: number;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
}) {
  const { toast } = useApp();
  const [filled, setFilled] = useState(0);
  const shownAt = useRef(0);
  const [line] = useState(() => (data.stars > 0 ? PASS_LINES[Math.floor(Math.random() * PASS_LINES.length)] : RETRY_LINE));
  const passed = data.stars > 0;
  const hasNext = passed && ((mode === "jari" && level < 7) || (mode === "word" && level < 2));

  useEffect(() => {
    shownAt.current = performance.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < data.stars; i++)
      timers.push(
        setTimeout(() => {
          setFilled(i + 1);
          playSfx("star");
        }, 300 + i * 250),
      );
    data.newStickers.forEach((id, i) => timers.push(setTimeout(() => toast({ kind: "sticker", sticker: id }), 900 + i * 1300)));
    data.familyUnlocks.forEach((m, i) =>
      timers.push(
        setTimeout(
          () => toast({ kind: "family", text: `우리 집 사탕 병이 ${FAMILY_MILESTONES[m].at.toLocaleString("ko-KR")}개가 됐어요! ${FAMILY_MILESTONES[m].line}` }),
          900 + (data.newStickers.length + i) * 1300,
        ),
      ),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeys((a) => {
    const ready = performance.now() - shownAt.current > ENTER_GUARD_MS;
    if (!ready) return;
    if (a.type === "enter") (hasNext ? onNext : onRetry)();
    else if (isCode(a, "KeyR")) onRetry();
    else if (a.type === "escape") onMenu();
  });

  const st = data.stats;
  const top = Object.entries(st.missedKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const marks: Record<string, boolean> = {};
  for (const [j] of top) {
    const k = JAMO_TO_KEY[j];
    if (k) marks[k.code] = true;
  }
  const maxBar = Math.max(1, ...data.recent);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#FFF0F7] to-[#EAF6FF] text-[#5b4a6b]">
      <div className="overlay-pop relative flex flex-col items-center rounded-[36px] bg-white px-10 pt-6 shadow-2xl" style={{ width: 760, height: 520 }}>
        {data.newRecord && (
          <div className="ribbon absolute -right-4 top-6 rotate-12 rounded-lg bg-[#FF6F91] px-5 py-1.5 text-xl font-extrabold text-white shadow">새 기록!</div>
        )}
        <div className="text-base font-bold text-[#9d8aa8]">{modeTitle(mode, level)}</div>
        <div className="text-3xl font-extrabold text-[#FF6F91]">{line}</div>
        <div className="mt-1 flex gap-2 text-[52px] leading-none">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < filled ? "star-pop text-[#FFC93B]" : "text-[#EEE6F3]"}>
              ★
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-end gap-12">
          <div className="text-center">
            <div className="text-sm font-bold text-[#9d8aa8]">타수</div>
            <div className="text-5xl font-extrabold text-[#FF6F91]">
              {st.cpm}
              <span className="text-2xl">타</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[#9d8aa8]">정확도</div>
            <div className="text-5xl font-extrabold text-[#4FA3E0]">
              {st.acc}
              <span className="text-2xl">%</span>
            </div>
          </div>
          <div className="pb-1 text-center">
            <div className="text-sm font-bold text-[#9d8aa8]">걸린 시간</div>
            <div className="text-2xl font-bold">{formatTime(st.seconds)}</div>
          </div>
          <div className="flex items-center gap-1 pb-1">
            <Art
              w={44}
              h={44}
              draw={(ctx) => {
                ctx.translate(22, 24);
                drawJar(ctx, 40, 0.7);
              }}
            />
            <div className="text-2xl font-extrabold text-[#C46BFF]">사탕 +{data.candies}</div>
          </div>
        </div>

        <div className="mt-4 flex w-full gap-6">
          <div className="flex-1 rounded-2xl bg-[#FFF6FA] p-3">
            <div className="mb-1 text-base font-bold">자주 틀린 키</div>
            {top.length === 0 ? (
              <div className="flex h-[110px] items-center justify-center text-2xl font-extrabold text-[#3aa86b]">실수 0개! 완벽해요</div>
            ) : (
              <>
                <Keyboard next={null} hint={false} marks={marks} scale={0.36} />
                <div className="mt-1 flex gap-3 text-lg font-bold text-[#FF6F91]">
                  {top.map(([j, n]) => (
                    <span key={j}>
                      {j === " " ? "띄어쓰기" : j} {n}번
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="w-[250px] rounded-2xl bg-[#F3F8FF] p-3">
            <div className="mb-1 text-base font-bold">최근 타수</div>
            <div className="flex h-[118px] items-end justify-around gap-2">
              {data.recent.map((v, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-xs font-bold text-[#7a6688]">{v}</div>
                  <div
                    className="w-8 rounded-t-lg"
                    style={{ height: Math.max(6, (v / maxBar) * 92), background: i === data.recent.length - 1 ? "#FF6F91" : "#FFC2D1" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 flex gap-4">
          {hasNext && (
            <Btn big className="bg-[#FF8FB8]! text-white!" onClick={onNext}>
              다음 단계 (Enter)
            </Btn>
          )}
          <Btn big className={!hasNext ? "bg-[#FF8FB8]! text-white!" : ""} onClick={onRetry}>
            다시 하기 (R)
          </Btn>
          <Btn big onClick={onMenu}>
            메뉴 (Esc)
          </Btn>
        </div>
      </div>
    </div>
  );
}

