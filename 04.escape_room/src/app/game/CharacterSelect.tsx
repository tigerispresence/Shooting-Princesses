"use client";

import { useEffect, useRef } from "react";
import { CHARACTERS } from "./constants";
import type { CharacterDef } from "./constants";
import { drawHeroPortrait } from "./sprites";

interface Props {
  selectedId: string;
  name: string;
  onSelect: (id: string) => void;
  onName: (name: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

/** 캐릭터 한 명을 그리는 작은 캔버스 */
function Portrait({ character, big }: { character: CharacterDef; big: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = big ? 132 : 78;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const frame = () => {
      ctx.clearRect(0, 0, size, size);
      // 발밑을 비추는 둥근 빛
      const g = ctx.createRadialGradient(size / 2, size * 0.72, 4, size / 2, size * 0.72, size * 0.5);
      g.addColorStop(0, "rgba(255,209,102,0.20)");
      g.addColorStop(1, "rgba(255,209,102,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      // 머리 위 리본과 만두머리까지 들어가도록 조금 내려 그리고 배율도 낮춘다
      drawHeroPortrait(
        ctx,
        size / 2,
        size * 0.64,
        character.look,
        performance.now(),
        size / (big ? 46 : 30),
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [character, size, big]);

  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

export default function CharacterSelect({
  selectedId,
  name,
  onSelect,
  onName,
  onConfirm,
  onBack,
}: Props) {
  const chosen = CHARACTERS.find((c) => c.id === selectedId) ?? CHARACTERS[0];
  const trimmed = name.trim();

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
          ← 처음으로
        </button>
        <h2 className="text-base font-bold text-amber-200">누구로 탈출할까?</h2>
        <span className="w-[84px]" />
      </div>

      {/* 고른 캐릭터를 크게 */}
      <div className="flex flex-col items-center gap-1 rounded-3xl border border-violet-300/20 bg-white/5 px-6 py-3">
        <Portrait character={chosen} big />
        <p className="text-lg font-bold text-amber-100">{chosen.name}</p>
        <p className="text-[13px] text-violet-200/85">{chosen.blurb}</p>
      </div>

      {/* 고르기 */}
      <div className="grid w-full max-w-[430px] grid-cols-4 gap-2">
        {CHARACTERS.map((c) => {
          const on = c.id === selectedId;
          return (
            <button
              key={c.id}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border py-2 touch-none select-none ${
                on
                  ? "border-amber-200/70 bg-amber-300/20 shadow-[0_0_16px_rgba(255,209,102,0.35)]"
                  : "border-white/12 bg-white/5 active:bg-white/15"
              }`}
              onPointerDown={(e) => {
                e.preventDefault();
                onSelect(c.id);
              }}
              aria-label={`${c.name} 고르기`}
              aria-pressed={on}
            >
              <Portrait character={c} big={false} />
              <span className={`text-xs ${on ? "text-amber-100" : "text-violet-200/80"}`}>
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 이름 */}
      <div className="flex w-full max-w-[430px] flex-col gap-1.5">
        <label htmlFor="hero-name" className="text-[13px] text-violet-200/85">
          이름을 정해 줘 (비워 두면 {chosen.name})
        </label>
        <input
          id="hero-name"
          value={name}
          onChange={(e) => onName(e.target.value.slice(0, 8))}
          placeholder={chosen.name}
          maxLength={8}
          className="rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-center text-lg
                     text-amber-100 placeholder:text-violet-300/40 outline-none
                     focus:border-amber-200/60"
        />
      </div>

      <button
        className="w-full max-w-[430px] rounded-2xl border border-amber-200/50 bg-amber-300/25 px-6 py-3.5
                   text-lg font-bold text-amber-100 shadow-[0_0_20px_rgba(255,209,102,0.35)]
                   active:bg-amber-300/45 touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        {trimmed || chosen.name}(으)로 시작!
      </button>
    </div>
  );
}
