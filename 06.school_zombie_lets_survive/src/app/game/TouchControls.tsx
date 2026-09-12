"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawAlarmIcon,
  drawChalkIcon,
  drawHandIcon,
  drawTorchIcon,
} from "./sprites";
import SpriteCanvas from "./SpriteCanvas";

/**
 * 왼쪽은 아무 데나 눌러 생기는 가상 조이스틱, 오른쪽은 큰 버튼들.
 *
 * 전부 `pointerdown`으로 처리한다 — `click`은 한 박자 늦어 연타가 씹힌다.
 * 390×844 세로에서 오른쪽 버튼이 전부 엄지 반경(아래에서 20~200px,
 * 오른쪽 끝에서 16~180px) 안에 들어오게 배치했다.
 */

const JOY_R = 56;
const DEAD = 10;

interface Props {
  onMove: (x: number, y: number) => void;
  onInteractDown: () => void;
  onInteractUp: () => void;
  onChalk: () => void;
  onAlarm: () => void;
  onTorch: () => void;
  showChalk: boolean;
  showAlarm: boolean;
  showTorch: boolean;
  alarms: number;
  torchOn: boolean;
  disabled: boolean;
}

export default function TouchControls({
  onMove,
  onInteractDown,
  onInteractUp,
  onChalk,
  onAlarm,
  onTorch,
  showChalk,
  showAlarm,
  showTorch,
  alarms,
  torchOn,
  disabled,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  // 손가락이 있는 기기에서만 조이스틱 판을 살린다.
  // 데스크톱에서 이 판이 이벤트를 먹으면 캔버스의 마우스 조준·분필 던지기가 막힌다.
  const [coarse, setCoarse] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const place = useCallback((x: number, y: number, kx: number, ky: number) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    base.style.display = "block";
    base.style.left = `${x - JOY_R}px`;
    base.style.top = `${y - JOY_R}px`;
    knob.style.display = "block";
    knob.style.left = `${x + kx - 26}px`;
    knob.style.top = `${y + ky - 26}px`;
  }, []);

  const hide = useCallback(() => {
    if (baseRef.current) baseRef.current.style.display = "none";
    if (knobRef.current) knobRef.current.style.display = "none";
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches || navigator.maxTouchPoints > 0);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const down = (e: PointerEvent) => {
      if (padRef.current) return;
      if (e.pointerType === "mouse") return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.preventDefault();
      padRef.current = { id: e.pointerId, x, y };
      place(x, y, 0, 0);
      el.setPointerCapture(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      const pad = padRef.current;
      if (!pad || pad.id !== e.pointerId) return;
      const rect = el.getBoundingClientRect();
      let dx = e.clientX - rect.left - pad.x;
      let dy = e.clientY - rect.top - pad.y;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) {
        dx = (dx / d) * JOY_R;
        dy = (dy / d) * JOY_R;
      }
      place(pad.x, pad.y, dx, dy);
      if (d < DEAD) onMove(0, 0);
      else onMove(dx / JOY_R, dy / JOY_R);
    };

    const up = (e: PointerEvent) => {
      const pad = padRef.current;
      if (!pad || pad.id !== e.pointerId) return;
      padRef.current = null;
      hide();
      onMove(0, 0);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [onMove, place, hide]);

  const btn = (
    label: string,
    size: number,
    style: React.CSSProperties,
    onDown: () => void,
    icon: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    onUp?: () => void,
    badge?: number,
    active?: boolean,
  ) => (
    <button
      className={`pointer-events-auto absolute flex items-center justify-center rounded-full border-2
                  backdrop-blur touch-none select-none active:scale-95
                  ${active ? "border-amber-200 bg-amber-300/40" : "border-white/60 bg-white/20"}`}
      style={{ width: size, height: size, ...style }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (disabled) return;
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
      onPointerLeave={() => onUp?.()}
      aria-label={label}
    >
      <SpriteCanvas width={size} height={size} draw={icon} redraw={`${active}`} />
      {badge !== undefined && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center
                     rounded-full bg-amber-300 text-[11px] font-bold text-[#2B2540]"
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    // 조작 영역은 아래 재료 줄 위까지 덮는다 — 그래야 버튼이 엄지 반경(화면 아래에서 20~200px) 안에 들어온다.
    // 판 자체는 이벤트를 안 먹고, 조이스틱 판과 버튼만 먹는다.
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 select-none"
      style={{ bottom: -40 }}
    >
      {/* 왼쪽 절반 아무 데나 눌러 생기는 조이스틱 */}
      <div
        ref={areaRef}
        className={`absolute bottom-0 left-0 top-0 w-[55%] touch-none
                    ${coarse ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          ref={baseRef}
          className="pointer-events-none absolute hidden rounded-full border-2 border-white/35 bg-white/10"
          style={{ width: JOY_R * 2, height: JOY_R * 2 }}
        />
        <div
          ref={knobRef}
          className="pointer-events-none absolute hidden rounded-full border-2 border-white/70 bg-white/40"
          style={{ width: 52, height: 52 }}
        />
      </div>

      {/* 큰 손 버튼 */}
      {btn(
        "상호작용",
        88,
        { right: 16, bottom: 20 },
        onInteractDown,
        (ctx, w) => drawHandIcon(ctx, w / 2, w / 2, w * 0.62),
        onInteractUp,
      )}
      {showChalk &&
        btn("분필 던지기", 68, { right: 112, bottom: 26 }, onChalk, (ctx, w) =>
          drawChalkIcon(ctx, w / 2, w / 2, w * 0.7),
        )}
      {showAlarm &&
        btn(
          "알람시계 놓기",
          68,
          { right: 24, bottom: 118 },
          onAlarm,
          (ctx, w) => drawAlarmIcon(ctx, w / 2, w / 2, w * 0.72),
          undefined,
          alarms,
        )}
      {showTorch &&
        btn(
          "손전등",
          60,
          { right: 108, bottom: 108 },
          onTorch,
          (ctx, w) => drawTorchIcon(ctx, w / 2, w / 2, w * 0.74),
          undefined,
          undefined,
          torchOn,
        )}
    </div>
  );
}
