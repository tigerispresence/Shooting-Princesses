"use client";

import type { Dir } from "./types";

interface Props {
  onHold: (dir: Dir) => void;
  onRelease: () => void;
  onInteract: () => void;
  onResetBoxes: () => void;
  showReset: boolean;
  disabled: boolean;
}

const PAD =
  "flex items-center justify-center rounded-2xl bg-white/10 text-2xl text-violet-50 " +
  "backdrop-blur active:bg-white/30 disabled:opacity-25 select-none touch-none " +
  "border border-white/15 pad-btn";

export default function TouchControls({
  onHold,
  onRelease,
  onInteract,
  onResetBoxes,
  showReset,
  disabled,
}: Props) {
  // pointerdown/up으로 처리한다. click은 반응이 한 박자 늦어서, 아이가
  // 방향키를 연타할 때 입력이 씹힌다.
  const hold = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    onHold(dir);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    onRelease();
  };

  const dpad = (dir: Dir, label: string, arrow: string) => (
    <button
      className={PAD}
      onPointerDown={hold(dir)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      disabled={disabled}
      aria-label={label}
    >
      {arrow}
    </button>
  );

  return (
    <div className="flex w-full max-w-[520px] items-center justify-between gap-3 px-3 touch-none">
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <div />
        {dpad("up", "위로", "▲")}
        <div />
        {dpad("left", "왼쪽", "◀")}
        <div />
        {dpad("right", "오른쪽", "▶")}
        <div />
        {dpad("down", "아래로", "▼")}
        <div />
      </div>

      <div className="flex flex-col items-stretch gap-2">
        {showReset && (
          <button
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm
                       text-violet-100 active:bg-white/25 touch-none select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              onResetBoxes();
            }}
          >
            🔄 상자 다시 놓기
          </button>
        )}
        <button
          className="rounded-2xl border border-amber-200/40 bg-amber-300/20 px-6 py-5 text-lg
                     font-bold text-amber-100 shadow-[0_0_18px_rgba(255,209,102,0.35)]
                     active:bg-amber-300/40 disabled:opacity-30 touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            onInteract();
          }}
          disabled={disabled}
          aria-label="살펴보기"
        >
          🔍 살펴보기
        </button>
      </div>
    </div>
  );
}
