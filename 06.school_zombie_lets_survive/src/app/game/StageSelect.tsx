"use client";

import { useState } from "react";
import { playSfx } from "./audio";
import { STAGES } from "./maps";
import { drawMenuPiece, drawStar } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import { MENU_ITEMS, MENU_MATRON, MENU_SCREEN_TITLE, fill } from "./text";
import type { SaveData } from "./storage";

interface Props {
  save: SaveData;
  playerName: string;
  onPick: (stageId: number, practice: number | null) => void;
  onBack: () => void;
  onEnding: () => void;
}

export default function StageSelect({ save, playerName, onPick, onBack, onEnding }: Props) {
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
                  {!locked && save.best[st.id - 1] > 0 && (
                    <p className="text-[11px] text-violet-300/70">
                      최고 점수 {save.best[st.id - 1]}
                    </p>
                  )}
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
