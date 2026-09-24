"use client";

import { useState } from "react";
import { playSfx } from "./audio";
import { STAGES } from "./maps";
import { drawMenuPiece, drawStar } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import {
  GOAL_ALL,
  GOAL_MAIN,
  GOAL_MAIN_5,
  GOAL_MENU,
  GOAL_NEXT,
  MENU_ITEMS,
  MENU_MATRON,
  MENU_SCREEN_TITLE,
  fill,
} from "./text";
import { goalFlags, recordFor } from "./storage";
import type { SaveData } from "./storage";
import { DIFFICULTIES, DIFFICULTY_DESC, DIFFICULTY_LABEL } from "./difficulty";
import type { Difficulty } from "./difficulty";

interface Props {
  save: SaveData;
  playerName: string;
  onPick: (stageId: number, practice: number | null) => void;
  onBack: () => void;
  onEnding: () => void;
  onDifficulty: (d: Difficulty) => void;
}

interface BoardRow {
  name: string;
  score: string;
  time: string;
  leader: boolean;
  diff: string;
}

/**
 * 최근 이름 두 개의 기록. 이름이 하나뿐이면 한 줄만 나온다 (빈 칸을 보여주지 않는다).
 * **지금 고른 난이도의 기록만** 보여 주고, 왕관도 그 안에서만 비교한다 (§15-3).
 */
function boardFor(save: SaveData, stageId: number): BoardRow[] {
  const i = stageId - 1;
  const d = save.difficulty;
  const names = save.recentNames.filter((n) => recordFor(save, n, d).best[i] > 0).slice(0, 2);
  if (!names.length) return [];
  const top = Math.max(...names.map((n) => recordFor(save, n, d).best[i]));
  return names.map((n) => {
    const rec = recordFor(save, n, d);
    const sec = rec.bestTimeMs[i] > 0 ? Math.round(rec.bestTimeMs[i] / 1000) : 0;
    return {
      name: n,
      score: `${rec.best[i]}점`,
      time: sec > 0 ? `${sec}초` : "-",
      leader: rec.best[i] === top && names.length > 1,
      diff: DIFFICULTY_LABEL[d],
    };
  });
}

/** 못 딴 별의 조건 한 줄 — 빈 별만 보여 주면 왜 비었는지 모른다 (§16) */
function nextGoal(save: SaveData, stageId: number, challenge: string): string {
  const texts = [stageId === 5 ? GOAL_MAIN_5 : GOAL_MAIN, GOAL_MENU, challenge];
  const flags = goalFlags(save.goals[stageId - 1] ?? 0);
  const idx = flags.findIndex((f) => !f);
  return idx < 0 ? GOAL_ALL : `☆ ${GOAL_NEXT}: ${texts[idx]}`;
}

export default function StageSelect({
  save,
  playerName,
  onPick,
  onBack,
  onEnding,
  onDifficulty,
}: Props) {
  const [tab, setTab] = useState<"stage" | "menu">("stage");
  const [practice, setPractice] = useState<number | null>(null);
  const totalStars = save.stars.reduce((a, b) => a + b, 0);
  const allMenus = save.menuPieces.every(Boolean);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center gap-3 overflow-y-auto px-5 py-5">
      <div className="flex w-full max-w-[420px] items-center justify-between">
        <button
          className="rounded-xl px-2 py-1 text-violet-300/80 touch-none select-none active:text-white"
          onPointerDown={(e) => {
            e.preventDefault();
            playSfx("uiBack");
            onBack();
          }}
          aria-label="뒤로"
        >
          ◀
        </button>
        <p className="text-sm font-bold text-violet-100">
          {playerName} · 별 {totalStars}/15
        </p>
        <div className="w-8" />
      </div>

      <div className="flex w-full max-w-[420px] gap-2">
        {(["stage", "menu"] as const).map((t) => (
          <button
            key={t}
            className={`flex-1 rounded-2xl border-2 py-2 text-sm font-bold touch-none select-none
                        ${tab === t ? "border-amber-200 bg-amber-300/25 text-amber-100" : "border-white/20 bg-white/5 text-violet-200"}`}
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              setTab(t);
            }}
          >
            {t === "stage" ? "스테이지" : MENU_SCREEN_TITLE}
          </button>
        ))}
      </div>

      {tab === "stage" ? (
        <div className="flex w-full max-w-[420px] flex-col gap-2">
          {STAGES.map((st) => {
            const locked = st.id > save.unlockedStage;
            const stars = save.stars[st.id - 1] ?? 0;
            return (
              <button
                key={st.id}
                disabled={locked}
                className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left
                            touch-none select-none
                            ${locked ? "border-white/10 bg-white/5 opacity-50" : "border-amber-200/40 bg-amber-300/10 active:bg-amber-300/25"}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (locked) return;
                  playSfx("uiTap");
                  onPick(st.id, practice);
                }}
              >
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-amber-100">{st.title}</p>
                  <p className="truncate text-xs text-violet-200/75">
                    {locked ? "앞 스테이지를 깨면 열려!" : st.subtitle}
                  </p>
                  {!locked && (
                    <p className="text-[11px] text-teal-200/80">
                      ◆ 환풍구 {st.vents.filter((v) => save.vents[v.id]).length}/
                      {st.vents.length}
                    </p>
                  )}
                  {!locked && (
                    <p className="truncate text-[11px] text-amber-200/85">
                      {nextGoal(save, st.id, st.challenge.text)}
                    </p>
                  )}
                  {/* 이름별 기록 — 자매가 번갈아 하는 게 이 게임의 실제 사용 환경이다 */}
                  {!locked &&
                    boardFor(save, st.id).map((row) => (
                      <p
                        key={row.name}
                        // 왕관(1등)과 "나"는 다른 축이다 — 내 줄은 배경 칩으로 찾는다
                        className={`inline-block rounded-md text-[11px] ${
                          row.name === playerName ? "bg-white/15 px-1.5" : ""
                        } ${row.leader ? "text-amber-200" : "text-violet-200/80"}`}
                      >
                        {row.leader ? "♔ " : ""}
                        {row.name} · {row.score} · {row.time}
                        <span className="ml-1 rounded bg-black/25 px-1 text-[9px]">
                          {row.diff}
                        </span>
                      </p>
                    ))}
                </div>
                <SpriteCanvas
                  width={74}
                  height={26}
                  redraw={stars}
                  draw={(ctx, w, h) => {
                    for (let i = 0; i < 3; i++) {
                      drawStar(ctx, 13 + i * 24, h / 2, 10, i < stars);
                    }
                  }}
                />
              </button>
            );
          })}

          {/* 난이도 — 아무 때나 바꿀 수 있다. 스테이지가 시작되면 그 판 동안 잠긴다. */}
          <div className="mt-2 rounded-2xl border border-white/20 bg-white/5 p-3">
            <p className="text-sm font-bold text-amber-100">난이도</p>
            <div className="mt-2 flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  className={`flex-1 rounded-xl border-2 px-2 py-2 text-sm font-bold touch-none select-none
                              ${save.difficulty === d ? "border-amber-200 bg-amber-300/20 text-amber-100" : "border-white/25 text-violet-200"}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playSfx("uiTap");
                    onDifficulty(d);
                  }}
                >
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-violet-200/80">
              {DIFFICULTY_DESC[save.difficulty]}
            </p>
            <p className="mt-1 text-[11px] text-violet-300/60">
              난이도를 바꿔도 별·급식표·환풍구·모자는 그대로예요. 기록만 따로 저장돼요.
            </p>
          </div>

          {save.ending && (
            <div className="mt-2 rounded-2xl border border-white/20 bg-white/5 p-3">
              <p className="text-sm font-bold text-amber-100">연습 모드</p>
              <p className="mb-2 text-xs text-violet-300/70">
                좀비 수를 줄여 놓고 마음껏 돌아다녀 보자.
              </p>
              <div className="flex flex-wrap gap-2">
                {[null, 0, 2, 4].map((n) => (
                  <button
                    key={String(n)}
                    className={`rounded-xl border-2 px-3 py-2 text-xs touch-none select-none
                                ${practice === n ? "border-amber-200 text-amber-100" : "border-white/25 text-violet-200"}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      playSfx("uiTap");
                      setPractice(n);
                    }}
                  >
                    {n === null ? "그대로" : `좀비 ${n}마리`}
                  </button>
                ))}
              </div>
              <button
                className="mt-3 w-full rounded-2xl border border-white/20 bg-white/10 py-2 text-sm text-violet-100
                           touch-none select-none active:bg-white/25"
                onPointerDown={(e) => {
                  e.preventDefault();
                  playSfx("uiTap");
                  onEnding();
                }}
              >
                엔딩 다시 보기
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-[420px] flex-col items-center gap-2">
          <p className="text-xs text-violet-300/70">
            방마다 숨어 있는 조각을 모으면 급식표가 완성돼!
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            {MENU_ITEMS.map((m, i) => {
              const got = save.menuPieces[i];
              return (
                <div
                  key={m}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2
                              ${got ? "border-amber-200/50 bg-amber-100/15" : "border-white/15 bg-white/5"}`}
                >
                  <SpriteCanvas
                    width={26}
                    height={30}
                    redraw={`${got}`}
                    draw={(ctx, w, h) => {
                      ctx.globalAlpha = got ? 1 : 0.28;
                      if (!got) ctx.filter = "grayscale(1)";
                      drawMenuPiece(ctx, w / 2, h / 2, 0, 22);
                    }}
                  />
                  <span
                    className={`text-sm ${got ? "font-bold text-amber-100" : "text-white/35"}`}
                  >
                    {got ? m : "?"}
                  </span>
                </div>
              );
            })}
          </div>
          {allMenus && (
            <div className="mt-2 rounded-2xl border-2 border-amber-200 bg-amber-300/20 p-3 text-center">
              <p className="text-sm font-extrabold text-amber-100">
                {fill("🍓 {이름} 특선 메뉴 추가!".replace("🍓 ", ""), playerName)}
              </p>
              <p className="mt-1 text-xs text-violet-100/80">{MENU_MATRON}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
