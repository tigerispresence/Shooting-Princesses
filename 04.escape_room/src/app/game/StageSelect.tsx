"use client";

import { useEffect, useRef } from "react";
import { STAGES } from "./constants";
import type { StageDef } from "./constants";
import type { BestRecord } from "./storage";
import { drawStageThumb } from "./titleArt";

interface Props {
  playerName: string;
  /** 스테이지별 최고 기록. 화면을 열 때 App이 읽어서 넘겨 준다. */
  bests: Record<number, BestRecord | null>;
  onPick: (stageId: number) => void;
  onBack: () => void;
}

const THUMB_W = 220;
const THUMB_H = 96;

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Thumb({ stage }: { stage: StageDef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = THUMB_W * dpr;
    canvas.height = THUMB_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const frame = () => {
      drawStageThumb(ctx, THUMB_W, THUMB_H, stage, performance.now());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  return (
    <canvas
      ref={ref}
      className="block w-full"
      style={{ aspectRatio: `${THUMB_W} / ${THUMB_H}` }}
    />
  );
}

export default function StageSelect({ playerName, bests, onPick, onBack }: Props) {
  return (
    <div className="game-box mx-auto flex flex-col items-center gap-3 px-3">
      <div className="flex w-full items-center justify-between">
        <button
          className="rounded-xl px-3 py-1.5 text-sm text-violet-300/80 active:text-violet-100 touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            onBack();
          }}
        >
          ← 캐릭터
        </button>
        <h2 className="text-base font-bold text-amber-200">어디로 갈까?</h2>
        <span className="w-[74px]" />
      </div>

      <p className="text-[13px] text-violet-200/85">
        <span className="text-amber-200">{playerName}</span>
        (이)의 모험을 시작할 곳을 골라 줘.
      </p>

      <div className="grid w-full max-w-[460px] gap-3">
        {STAGES.map((stage) => {
          const best = bests[stage.id];
          return (
            <button
              key={stage.id}
              disabled={!stage.ready}
              className={`overflow-hidden rounded-2xl border text-left touch-none select-none ${
                stage.ready
                  ? "border-amber-200/40 bg-white/5 active:bg-amber-300/15"
                  : "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-70"
              }`}
              onPointerDown={(e) => {
                e.preventDefault();
                if (stage.ready) onPick(stage.id);
              }}
            >
              <Thumb stage={stage} />
              <div className="flex items-start justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-violet-300/70">스테이지 {stage.id}</p>
                  <p className="text-base font-bold text-amber-100">{stage.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-violet-200/80">
                    {stage.tagline}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {stage.ready ? (
                    <>
                      <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs text-amber-100">
                        놀러 가기
                      </span>
                      <p className="mt-1.5 text-[11px] text-violet-300/70">
                        {best
                          ? `최고 ⏱️ ${formatTime(best.timeMs)} · ${best.name}`
                          : "아직 기록 없음"}
                      </p>
                    </>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-violet-200/70">
                      🔒 준비 중
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
