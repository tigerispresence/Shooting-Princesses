"use client";

import { drawStar } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import { GOAL_TITLE } from "./text";
import type { GoalView } from "./types";

/**
 * 오늘의 할 일 3줄 — 별 하나에 목표 하나 (DESIGN §16).
 * 시작 카드·일시정지·전체 지도·클리어 화면이 전부 이 하나를 쓴다. 목록이 화면마다 다르면 아이가 헷갈린다.
 */
export default function GoalList({
  goals,
  title = true,
  compact = false,
}: {
  goals: GoalView[];
  title?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="w-full text-left">
      {title && (
        <p className="mb-1 text-center text-xs font-bold tracking-wide text-amber-200/80">
          {GOAL_TITLE}
        </p>
      )}
      <ul className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
        {goals.map((g, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 rounded-xl px-2 ${compact ? "py-0.5" : "py-1"}
                        ${g.done ? "bg-amber-300/15 text-amber-100" : "bg-white/5 text-violet-100/85"}`}
          >
            <SpriteCanvas
              width={22}
              height={22}
              redraw={g.done ? "on" : "off"}
              draw={(ctx, w, h) => drawStar(ctx, w / 2, h / 2, 9, g.done)}
            />
            <span className={`flex-1 ${compact ? "text-[12px]" : "text-[13px]"} font-bold`}>
              {g.text}
            </span>
            <span className="tabular-nums text-[11px] text-white/60">
              {g.done ? "✓" : `${g.now}/${g.need}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
