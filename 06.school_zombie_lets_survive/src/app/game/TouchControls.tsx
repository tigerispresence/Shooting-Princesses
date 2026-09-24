"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  drawAlarmIcon,
  drawBananaIcon,
  drawChalkIcon,
  drawHandIcon,
  drawPopperIcon,
  drawTorchIcon,
} from "./sprites";
import SpriteCanvas from "./SpriteCanvas";

/**
 * 왼쪽은 아무 데나 눌러 생기는 가상 조이스틱, 오른쪽은 큰 버튼들.
 *
 * 전부 `pointerdown`으로 처리한다 — `click`은 한 박자 늦어 연타가 씹힌다.
 * 390×844 세로에서 오른쪽 버튼이 전부 엄지 반경(아래에서 20~200px,
 * 오른쪽 끝에서 16~180px) 안에 들어오게 배치했다.
 *
 * 소모품(알람시계·폭죽·바나나)은 **손에 하나라도 있을 때만** 버튼이 뜨고,
 * 뜬 것들만 둘째 줄에 오른쪽부터 차례로 늘어선다 — 버튼이 여섯 개로 불어나는 걸 막는다.
 */

const JOY_R = 56;
const DEAD = 10;

interface Props {
  onMove: (x: number, y: number) => void;
  onInteractDown: () => void;
  onInteractUp: () => void;
  onChalk: () => void;
  onAlarm: () => void;
  onPopper: () => void;
  onBanana: () => void;
  onTorch: () => void;
  showChalk: boolean;
  showAlarm: boolean;
  showPopper: boolean;
  showBanana: boolean;
  showTorch: boolean;
  alarms: number;
  poppers: number;
  bananas: number;
  torchOn: boolean;
  disabled: boolean;
}

export default function TouchControls({
  onMove,
  onInteractDown,
  onInteractUp,
  onChalk,
  onAlarm,
  onPopper,
  onBanana,
  onTorch,
  showChalk,
  showAlarm,
  showPopper,
  showBanana,
  showTorch,
  alarms,
  poppers,
  bananas,
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
    // 재료 줄이 캔버스 바로 아래로 올라갔으므로, 조작 영역은 화면 아래 끝까지 그대로 쓴다.
    // 판 자체는 이벤트를 안 먹고, 조이스틱 판과 버튼만 먹는다.
    <div className="pointer-events-none absolute inset-0 select-none">
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
      {/* 둘째 줄 — 가진 소모품만, 오른쪽부터 */}
      {(
        [
          showAlarm && {
            label: "알람시계 놓기",
            onDown: onAlarm,
            icon: drawAlarmIcon,
            iconK: 0.72,
            badge: alarms,
          },
          showPopper && {
            label: "폭죽 던지기",
            onDown: onPopper,
            icon: drawPopperIcon,
            iconK: 0.78,
            badge: poppers,
          },
          showBanana && {
            label: "바나나 껍질 놓기",
            onDown: onBanana,
            icon: drawBananaIcon,
            iconK: 0.8,
            badge: bananas,
          },
        ] as const
      )
        .filter((b): b is Exclude<typeof b, false> => !!b)
        .map((b, i) => (
          // key가 없으면 알람이 0개가 돼 사라질 때 폭죽 버튼이 그 자리로 밀려오며 아이콘이 안 바뀐다
          <Fragment key={b.label}>
            {btn(
              b.label,
              64,
              { right: 24 + i * 74, bottom: 118 },
              b.onDown,
              (ctx, w) => b.icon(ctx, w / 2, w / 2, w * b.iconK),
              undefined,
              b.badge,
            )}
          </Fragment>
        ))}
      {/* 손전등은 켜고 끄는 스위치라 조금 멀어도 된다 — 셋째 줄 */}
      {showTorch &&
        btn(
          "손전등",
          56,
          { right: 28, bottom: 194 },
          onTorch,
          (ctx, w) => drawTorchIcon(ctx, w / 2, w / 2, w * 0.74),
          undefined,
          undefined,
          torchOn,
        )}
    </div>
  );
}
