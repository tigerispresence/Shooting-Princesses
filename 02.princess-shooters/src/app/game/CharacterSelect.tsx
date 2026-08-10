"use client";

import { useState } from "react";
import { PRINCESSES } from "./constants";

interface CharacterSelectProps {
  onSelect: (index: number) => void;
}

export default function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const [selected, setSelected] = useState(0);
  const princess = PRINCESSES[selected];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4">
      <h1
        className="text-3xl sm:text-5xl font-bold mb-1 text-transparent bg-clip-text animate-pulse"
        style={{
          backgroundImage: "linear-gradient(90deg, #FF69B4, #FFD700, #9B59B6, #3498DB, #FF69B4)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
        }}
      >
        Princess Shooters
      </h1>
      <p className="text-lg sm:text-xl text-yellow-300 mb-6">Fairytale Sky Battle!</p>

      {/* Selected character preview */}
      <div className="flex flex-col items-center mb-6 p-6 rounded-2xl bg-purple-900/40 border-2 border-purple-400/30 min-h-[160px]">
        <div className="text-6xl sm:text-7xl mb-2 relative">
          <span className="absolute -top-4 -right-2 text-3xl sm:text-4xl">{princess.emoji}</span>
          <span>{princess.mountEmoji}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: princess.color }}>
          {princess.name}
        </h2>
        <p className="text-purple-200 text-sm sm:text-base">
          riding a <span className="font-semibold text-white">{princess.mount}</span>
        </p>
        <p className="text-yellow-200/80 text-xs sm:text-sm mt-1 italic">{princess.description}</p>
        <div className="flex gap-1 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: princess.sparkleColor + "33", color: princess.sparkleColor }}>
            Sparkle: {princess.sparkleColor === "#FFD700" ? "Gold" : princess.sparkleColor === "#00FFFF" ? "Cyan" : princess.sparkleColor === "#FF69B4" ? "Pink" : princess.sparkleColor === "#FFA500" ? "Orange" : princess.sparkleColor === "#FFFFFF" ? "White" : princess.sparkleColor === "#98FB98" ? "Green" : princess.sparkleColor === "#7DF9FF" ? "Aqua" : "Orchid"}
          </span>
        </div>
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6 w-full max-w-lg">
        {PRINCESSES.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setSelected(i)}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all cursor-pointer ${
              selected === i
                ? "border-yellow-400 bg-purple-800/60 scale-105 shadow-lg"
                : "border-purple-600/30 bg-purple-900/20 hover:border-purple-400 hover:bg-purple-900/40"
            }`}
            style={selected === i ? { boxShadow: `0 0 20px ${p.color}40` } : {}}
          >
            <span className="text-2xl sm:text-3xl">{p.mountEmoji}</span>
            <span className="text-xs sm:text-sm font-bold truncate w-full text-center" style={{ color: p.color }}>
              {p.name}
            </span>
            <span className="text-[10px] sm:text-xs text-purple-300 truncate w-full text-center">{p.mount}</span>
          </button>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={() => onSelect(selected)}
        className="px-8 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl font-bold rounded-full border-2 border-yellow-400 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        Start Adventure!
      </button>

      {/* Controls hint */}
      <div className="mt-4 text-center text-purple-300/70 text-xs sm:text-sm space-y-0.5">
        <p>Keyboard: Arrow Keys / WASD to move, SPACE to shoot</p>
        <p>Touch: Drag left side to move, tap right side to shoot</p>
      </div>
    </div>
  );
}
