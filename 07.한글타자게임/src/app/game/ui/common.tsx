"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { readKey, type KeyAction } from "../keyInput";
import { drawAnimal, drawSpeaker, drawSticker, profileColor } from "../sprites";
import type { Profile, Save } from "../progress";
import { playSfx } from "../audio";

// ---------------------------------------------------------------------------
// App context
// ---------------------------------------------------------------------------

export type Screen =
  | { name: "profiles" }
  | { name: "create" }
  | { name: "menu" }
  | { name: "jariSelect" }
  | { name: "wordSelect" }
  | { name: "practice"; mode: "jari" | "word" | "sentence"; level: number }
  | { name: "rainSelect" }
  | { name: "rain"; level: number }
  | { name: "stickers" }
  | { name: "records" }
  | { name: "shop" };

export type ToastInput = { kind: "sticker"; sticker: number } | { kind: "family"; text: string };
export type Toast = ToastInput & { id: number };

export interface AppApi {
  save: Save;
  profile: Profile | null;
  commit: (fn: (draft: Save) => void) => void;
  go: (s: Screen) => void;
  toast: (t: ToastInput) => void;
  stageScale: number;
}

export const AppCtx = createContext<AppApi | null>(null);
export function useApp(): AppApi {
  const a = useContext(AppCtx);
  if (!a) throw new Error("AppCtx missing");
  return a;
}

// ---------------------------------------------------------------------------
// Keyboard hook — one window keydown listener per mounted screen
// ---------------------------------------------------------------------------

export function useKeys(handler: (a: KeyAction, e: KeyboardEvent) => void, enabled = true): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => {
      const a = readKey(e);
      if (a) ref.current(a, e);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [enabled]);
}

/** Enter or Space. */
export const isSelect = (a: KeyAction) => a.type === "enter" || (a.type === "key" && a.key.code === "Space");

/** Grid navigation for menus. Returns [focus, setFocus]. */
export function useMenuNav(
  count: number,
  cols: number,
  onSelect: (i: number) => void,
  onBack?: () => void,
  opts: { initial?: number; enabled?: boolean; digits?: boolean } = {},
): [number, (i: number) => void] {
  const [focus, setFocus] = useState(opts.initial ?? 0);
  useKeys((a) => {
    if (a.type === "arrow") {
      let f = focus;
      if (a.dir === "left") f = Math.max(0, f - 1);
      if (a.dir === "right") f = Math.min(count - 1, f + 1);
      if (a.dir === "up") f = f - cols >= 0 ? f - cols : f;
      if (a.dir === "down") f = f + cols < count ? f + cols : f;
      if (f !== focus) playSfx("click");
      setFocus(f);
    } else if (isSelect(a)) {
      onSelect(focus);
    } else if (a.type === "escape") {
      onBack?.();
    } else if (a.type === "digit" && opts.digits && a.n >= 1 && a.n <= count) {
      setFocus(a.n - 1);
      onSelect(a.n - 1);
    }
  }, opts.enabled !== false);
  return [Math.min(focus, Math.max(0, count - 1)), setFocus];
}

// ---------------------------------------------------------------------------
// Canvas art in React
// ---------------------------------------------------------------------------

export function Art({
  w,
  h,
  draw,
  animate = false,
  className,
}: {
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const { stageScale } = useApp();
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const k = Math.max(1, stageScale * (window.devicePixelRatio || 1));
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const t0 = performance.now();
    const paint = () => {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, (performance.now() - t0) / 1000);
      if (animate) raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  });
  return <canvas ref={ref} className={className} style={{ width: w, height: h, display: "block" }} />;
}

export function AnimalFace({ kind, size, color }: { kind: number; size: number; color?: number }) {
  return (
    <Art
      w={size}
      h={size}
      draw={(ctx) => {
        if (color !== undefined) {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = profileColor(color);
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.translate(size / 2, size * 0.55);
        drawAnimal(ctx, kind, size * 0.72);
      }}
    />
  );
}

export function StickerArt({ id, size, earned, hidden }: { id: number; size: number; earned: boolean; hidden?: boolean }) {
  return (
    <Art
      w={size}
      h={size}
      draw={(ctx) => {
        ctx.translate(size / 2, size / 2);
        drawSticker(ctx, id, size - 2, earned, hidden);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Buttons and bars
// ---------------------------------------------------------------------------

export function Btn({
  children,
  onClick,
  focused,
  className = "",
  disabled,
  big,
}: {
  children: ReactNode;
  onClick?: () => void;
  focused?: boolean;
  className?: string;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (disabled) return;
        playSfx("click");
        onClick?.();
      }}
      className={`whitespace-nowrap rounded-2xl font-bold transition-transform select-none ${big ? "px-7 py-4 text-2xl" : "px-5 py-2.5 text-lg"} ${
        disabled ? "bg-[#E9E4EE] text-[#A79DB3] cursor-not-allowed" : "bg-white text-[#6b4f7a] hover:scale-105 cursor-pointer shadow-[0_3px_0_#E3C7E8]"
      } ${focused ? "ring-4 ring-[#FF8FB8] scale-105" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        playSfx("click");
        onClick();
      }}
      className="rounded-xl bg-white/90 px-4 py-2 text-lg font-bold text-[#6b4f7a] shadow-[0_2px_0_#E3C7E8] hover:scale-105 cursor-pointer"
    >
      ← 뒤로
    </button>
  );
}

export function SpeakerButton() {
  const { save, commit } = useApp();
  const on = save.sound;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={on ? "소리 끄기" : "소리 켜기"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => commit((d) => void (d.sound = !d.sound))}
      className="rounded-xl bg-white/90 p-1.5 shadow-[0_2px_0_#E3C7E8] hover:scale-105 cursor-pointer"
    >
      <Art
        w={32}
        h={32}
        draw={(ctx) => {
          ctx.translate(16, 16);
          drawSpeaker(ctx, 28, on);
        }}
      />
    </button>
  );
}

export function StarRow({ n, of = 3, size = 22 }: { n: number; of?: number; size?: number }) {
  return (
    <span style={{ fontSize: size }} className="tracking-tight">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? "text-[#FFC93B]" : "text-[#E2D8EA]"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ScreenBg({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-b from-[#FFF0F7] to-[#EAF6FF] text-[#5b4a6b] ${className}`}>{children}</div>
  );
}

export function Header({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-0 flex h-16 items-center gap-4 px-5">
      {onBack && <BackButton onClick={onBack} />}
      <div className="text-3xl font-extrabold text-[#6b4f7a]">{title}</div>
      <div className="ml-auto flex items-center gap-3">
        {right}
        <SpeakerButton />
      </div>
    </div>
  );
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}분 ${s % 60}초` : `${s}초`;
}
