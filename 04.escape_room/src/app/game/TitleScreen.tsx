"use client";

import { useEffect, useRef } from "react";
import { THANKS } from "./constants";
import { drawTitleScene } from "./titleArt";

interface Props {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 시작 화면은 게임판처럼 정해진 비율이 없다. 그림이 화면을 꽉 채우도록
  // 자리가 잡히면 그 크기에 맞춰 다시 그린다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let raf = 0;
    const frame = () => {
      if (w > 0 && h > 0) drawTitleScene(ctx, w, h, performance.now(), dpr);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="game-box mx-auto flex flex-col items-center gap-3 px-3">
      {/* 화면 아무 데나 눌러도 시작되게, 그림 전체를 버튼으로 만든다 */}
      <button
        className="title-stage relative block w-full overflow-hidden rounded-3xl border border-amber-200/25
                   text-left shadow-[0_0_36px_rgba(0,0,0,0.6)] touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          onStart();
        }}
        aria-label="게임 시작"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-5 text-center">
          <div className="mt-3">
            <p className="text-[11px] tracking-[0.4em] text-amber-200/80">ESCAPE ROOM</p>
            <h1 className="title-glow mt-1 text-[38px] font-extrabold leading-tight text-amber-100 sm:text-5xl">
              달빛 성 탈출
            </h1>
            <p className="mt-1 text-[13px] text-violet-100/90">
              방마다 숨은 수수께끼를 풀고 밖으로 나가자!
            </p>
          </div>

          <div className="mb-2 flex flex-col items-center gap-3">
            <span
              className="press-pulse rounded-full border border-amber-200/50 bg-amber-300/20 px-8 py-3
                         text-lg font-bold text-amber-100 backdrop-blur"
            >
              눌러서 시작하기
            </span>
            <p className="text-[12px] leading-relaxed text-violet-200/70">
              Special thanks to{" "}
              <span className="text-amber-200/90">{THANKS.join(", ")}</span>
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
