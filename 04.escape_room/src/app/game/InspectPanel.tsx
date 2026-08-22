"use client";

import { useEffect, useRef } from "react";
import { drawCloseup } from "./closeups";
import type { InspectModal } from "./types";

interface Props {
  modal: InspectModal;
  onAction: () => void;
  onClose: () => void;
}

/** 확대 그림을 그릴 정사각형 캔버스의 논리 크기. */
const SIZE = 300;

export default function InspectPanel({ modal, onAction, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 확대 그림은 계속 살아 움직인다 — 먼지가 떠다니고, 초상화 눈이 따라오고,
  // 촛불이 흔들린다. 정지 화면이면 "확대해서 들여다보는" 느낌이 안 산다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const frame = () => {
      drawCloseup(
        ctx,
        modal.art,
        SIZE,
        SIZE,
        performance.now(),
        modal.reveal,
        modal.active,
        modal.tint,
        modal.burn,
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [modal.art, modal.reveal, modal.active, modal.tint, modal.burn]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-3">
      <div
        className="panel-pop flex max-h-[94dvh] w-full max-w-[380px] flex-col items-center gap-3
                   overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#1c1030]/97 p-4
                   shadow-[0_0_40px_rgba(0,0,0,0.65)]"
      >
        <h2 className="text-center text-base font-bold text-amber-200">
          🔍 {modal.title}
        </h2>

        <canvas
          ref={canvasRef}
          className="w-full max-w-[300px] rounded-2xl"
          style={{ aspectRatio: "1 / 1" }}
        />

        <p className="whitespace-pre-line text-center text-[15px] leading-relaxed text-violet-50">
          {modal.text}
        </p>

        {modal.detail && (
          <p className="whitespace-pre-line rounded-xl bg-white/5 px-3 py-2 text-center text-[13px] leading-relaxed text-violet-200/85">
            자세히 보니… {modal.detail}
          </p>
        )}

        {modal.action && (
          <button
            className="mt-1 w-full rounded-2xl border border-orange-300/50 bg-orange-400/25 px-6 py-3
                       text-base font-bold text-orange-50 shadow-[0_0_18px_rgba(255,150,60,0.35)]
                       active:bg-orange-400/45 touch-none select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              onAction();
            }}
          >
            {modal.action.label}
          </button>
        )}

        <button
          className={`w-full rounded-2xl px-6 py-3 text-base touch-none select-none ${
            modal.action
              ? "text-violet-300/80 active:text-violet-100"
              : "mt-1 border border-amber-200/40 bg-amber-300/20 font-bold text-amber-100 active:bg-amber-300/40"
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          그만 보기
        </button>
      </div>
    </div>
  );
}
