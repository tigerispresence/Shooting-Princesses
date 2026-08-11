"use client";

import { useState, useRef, useEffect } from "react";
import { PRINCESSES, PLAYER_WIDTH, PLAYER_HEIGHT } from "./constants";
import { drawPrincessSprite } from "./sprites";
import { Player } from "./types";
import { initAudio } from "./audio";

interface CharacterSelectProps {
  onSelect: (index: number, customName: string) => void;
}

export default function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const [selected, setSelected] = useState(0);
  const [customName, setCustomName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const princess = PRINCESSES[selected];
  const displayName = customName.trim() || princess.name;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      frameRef.current++;
      const frame = frameRef.current;
      ctx.clearRect(0, 0, 200, 200);

      const previewPlayer: Player = {
        x: 100,
        y: 110,
        width: PLAYER_WIDTH * 1.4,
        height: PLAYER_HEIGHT * 1.4,
        speed: 0,
        princess: PRINCESSES[selected],
        lives: 3,
        invincibleUntil: 0,
        shieldActive: false,
        shieldUntil: 0,
        fireAnim: Math.floor(frame / 60) % 3 === 0 ? Math.max(0, 10 - (frame % 60) * 0.5) : 0,
      };

      drawPrincessSprite(ctx, previewPlayer, frame);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [selected]);

  return (
    <div
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-3 sm:py-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
    >
      <h1
        className="text-2xl sm:text-5xl font-bold mb-0.5 sm:mb-1 text-transparent bg-clip-text animate-pulse"
        style={{
          backgroundImage: "linear-gradient(90deg, #FF69B4, #FFD700, #9B59B6, #3498DB, #FF69B4)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
        }}
      >
        Princess Shooters
      </h1>
      <p className="text-sm sm:text-xl text-yellow-300 mb-2 sm:mb-6">Fairytale Sky Battle!</p>

      {/* Mobile: side-by-side preview + grid. Desktop: stacked */}
      <div className="flex flex-col sm:contents">
        <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-0 mb-3 sm:mb-6">
          {/* Selected character preview */}
          <div className="flex flex-col items-center p-2 sm:p-4 rounded-2xl bg-purple-900/40 border-2 border-purple-400/30 shrink-0">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              className="w-[100px] h-[100px] sm:w-[200px] sm:h-[200px] mb-1 sm:mb-2"
            />
            <h2 className="text-lg sm:text-3xl font-bold" style={{ color: princess.color }}>
              {displayName}
            </h2>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value.slice(0, 16))}
              placeholder={princess.name}
              className="mt-1 sm:mt-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-purple-800/50 border border-purple-400/40 text-center text-white text-xs sm:text-base placeholder-purple-400/50 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 w-32 sm:w-48"
              maxLength={16}
            />
            <p className="text-purple-200 text-xs sm:text-base mt-1">
              riding a <span className="font-semibold text-white">{princess.mount}</span>
            </p>
            <p className="text-yellow-200/80 text-[10px] sm:text-sm mt-0.5 sm:mt-1 italic hidden sm:block">{princess.description}</p>
          </div>

          {/* Character grid — compact on mobile */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full max-w-lg sm:mt-6 sm:mb-6">
            {PRINCESSES.map((p, i) => (
              <button
                key={p.name}
                onClick={() => { initAudio(); setSelected(i); }}
                className={`flex flex-col items-center gap-0 sm:gap-1 p-1.5 sm:p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selected === i
                    ? "border-yellow-400 bg-purple-800/60 scale-105 shadow-lg"
                    : "border-purple-600/30 bg-purple-900/20 hover:border-purple-400 hover:bg-purple-900/40"
                }`}
                style={selected === i ? { boxShadow: `0 0 20px ${p.color}40` } : {}}
              >
                <span className="text-xl sm:text-3xl">{p.mountEmoji}</span>
                <span className="text-[10px] sm:text-sm font-bold truncate w-full text-center" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span className="text-[9px] sm:text-xs text-purple-300 truncate w-full text-center hidden sm:block">{p.mount}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => { initAudio(); onSelect(selected, customName.trim()); }}
        className="px-8 sm:px-12 py-2.5 sm:py-4 text-base sm:text-xl font-bold rounded-full border-2 border-yellow-400 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        Start Adventure!
      </button>

      {/* Controls hint — hidden on mobile to save space */}
      <div className="mt-2 sm:mt-4 text-center text-purple-300/70 text-[10px] sm:text-sm space-y-0.5">
        <p className="hidden sm:block">Keyboard: Arrow Keys / WASD to move, SPACE to shoot</p>
        <p className="sm:hidden">Tap to select, then start!</p>
        <p className="hidden sm:block">Touch: Drag left side to move, tap right side to shoot</p>
      </div>
    </div>
  );
}
