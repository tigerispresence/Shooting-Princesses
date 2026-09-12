"use client";

import { useEffect, useRef } from "react";

/**
 * 캔버스로 그린 아이콘을 React 안에 끼워 넣는 얇은 껍데기.
 * 이모지를 쓰지 않기 위한 장치다 — 기기마다 다르게 보이고 색도 못 바꾼다.
 */
interface Props {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  className?: string;
  /** 이 값이 바뀌면 다시 그린다 */
  redraw?: string | number | boolean;
  /** 매 프레임 다시 그린다 (별 연출 같은 것) */
  animate?: boolean;
}

export default function SpriteCanvas({
  width,
  height,
  draw,
  className,
  redraw,
  animate,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  // 렌더 중에 ref를 건드리지 않는다 — 최신 draw는 effect에서 받아 둔다
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const paint = () => {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, width, height);
      ctx.restore();
      if (animate) raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [width, height, redraw, animate]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width, height, display: "block" }}
      aria-hidden
    />
  );
}
