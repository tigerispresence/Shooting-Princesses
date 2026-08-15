"use client";

import type { Dir } from "./types";

interface Props {
  onMove: (dir: Dir) => void;
  disabled: boolean;
}

const BTN =
  "flex items-center justify-center rounded-2xl bg-white/10 text-2xl text-purple-100 " +
  "backdrop-blur active:bg-white/25 disabled:opacity-25 select-none touch-none " +
  "border border-white/10 h-16 w-16 sm:h-14 sm:w-14";

export default function TouchControls({ onMove, disabled }: Props) {
  // pointerdown rather than click: a tap should register immediately, and a
  // 10-year-old mashing the pad shouldn't lose inputs to click-delay.
  const press = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (!disabled) onMove(dir);
  };

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto touch-none">
      <div />
      <button
        className={BTN}
        onPointerDown={press("up")}
        disabled={disabled}
        aria-label="Move up"
      >
        ▲
      </button>
      <div />
      <button
        className={BTN}
        onPointerDown={press("left")}
        disabled={disabled}
        aria-label="Move left"
      >
        ◀
      </button>
      <div />
      <button
        className={BTN}
        onPointerDown={press("right")}
        disabled={disabled}
        aria-label="Move right"
      >
        ▶
      </button>
      <div />
      <button
        className={BTN}
        onPointerDown={press("down")}
        disabled={disabled}
        aria-label="Move down"
      >
        ▼
      </button>
      <div />
    </div>
  );
}
