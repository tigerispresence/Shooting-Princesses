"use client";

import { useState } from "react";
import { playSfx } from "./audio";
import {
  CLOTH_COLORS,
  CLOTH_NAMES,
  HAIR_COLORS,
  HAIR_NAMES,
  HATS,
  SUGGESTED_NAMES,
} from "./constants";
import { drawPlayer } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import { NAME_HINT, NAME_PROMPT } from "./text";
import type { Look } from "./types";

interface Props {
  initialName: string;
  initialLook: Look;
  unlockedHats: string[];
  onDone: (name: string, look: Look) => void;
  onBack: () => void;
}

export default function NameEntry({
  initialName,
  initialLook,
  unlockedHats,
  onDone,
  onBack,
}: Props) {
  const [name, setName] = useState(initialName);
  const [look, setLook] = useState<Look>(initialLook);

  const swatch = (
    colors: string[],
    names: string[],
    current: number,
    set: (i: number) => void,
    label: string,
  ) => (
    <div className="w-full">
      <p className="mb-1 text-left text-xs text-violet-300/70">{label}</p>
      <div className="flex gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            className={`h-11 flex-1 rounded-xl border-2 touch-none select-none
                        ${current === i ? "border-amber-200 scale-105" : "border-white/25"}`}
            style={{ background: c }}
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              set(i);
            }}
            aria-label={names[i]}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center gap-3 overflow-y-auto px-6 py-6 text-center">
      <h2 className="text-xl font-extrabold text-amber-200">{NAME_PROMPT}</h2>
      <p className="text-xs text-violet-300/70">{NAME_HINT}</p>

      <input
        className="w-full max-w-[280px] rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3
                   text-center text-lg font-bold text-white outline-none focus:border-amber-200"
        value={name}
        maxLength={6}
        placeholder="이름"
        onChange={(e) => setName(e.target.value.slice(0, 6))}
      />
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_NAMES.map((n) => (
          <button
            key={n}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-violet-100
                       touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              setName(n);
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <SpriteCanvas
        width={150}
        height={150}
        animate
        redraw={`${look.hair}-${look.cloth}-${look.hat}`}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 58, 0, Math.PI * 2);
          ctx.fill();
          drawPlayer(ctx, w / 2, h / 2 + 14, {
            look,
            r: 34,
            walkT: performance.now() * 0.004,
            moving: true,
          });
        }}
      />

      <div className="flex w-full max-w-[300px] flex-col gap-3">
        {swatch(HAIR_COLORS, HAIR_NAMES, look.hair, (i) => setLook({ ...look, hair: i }), "머리")}
        {swatch(CLOTH_COLORS, CLOTH_NAMES, look.cloth, (i) => setLook({ ...look, cloth: i }), "옷")}

        {unlockedHats.length > 0 && (
          <div>
            <p className="mb-1 text-left text-xs text-violet-300/70">모자 (장식 전용)</p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-xl border-2 px-3 py-2 text-xs touch-none select-none
                            ${look.hat === null ? "border-amber-200 text-amber-100" : "border-white/25 text-violet-200"}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setLook({ ...look, hat: null });
                }}
              >
                없음
              </button>
              {HATS.filter((h) => unlockedHats.includes(h.id)).map((h) => (
                <button
                  key={h.id}
                  className={`rounded-xl border-2 px-3 py-2 text-xs touch-none select-none
                              ${look.hat === h.id ? "border-amber-200 text-amber-100" : "border-white/25 text-violet-200"}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playSfx("uiTap");
                    setLook({ ...look, hat: h.id });
                  }}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2 pb-4">
        <button
          className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm text-violet-100
                     touch-none select-none active:bg-white/25"
          onPointerDown={(e) => {
            e.preventDefault();
            playSfx("uiBack");
            onBack();
          }}
        >
          뒤로
        </button>
        <button
          className="rounded-2xl border-2 border-amber-200 bg-amber-300/35 px-8 py-3 text-base
                     font-bold text-amber-100 touch-none select-none active:bg-amber-300/55
                     disabled:opacity-40"
          disabled={!name.trim()}
          onPointerDown={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            playSfx("pickup");
            onDone(name.trim(), look);
          }}
        >
          이걸로 할래!
        </button>
      </div>
    </div>
  );
}
