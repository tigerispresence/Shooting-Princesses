"use client";

import { useState, useEffect } from "react";
import { ScoreRecord } from "./types";

const STORAGE_KEY = "princessShooterScores";
const MAX_SCORES = 10;

export function saveScore(record: Omit<ScoreRecord, "date">): void {
  if (typeof window === "undefined") return;
  const scores = loadScores();
  scores.push({ ...record, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > MAX_SCORES) scores.length = MAX_SCORES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function loadScores(): ScoreRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

interface ScoreboardProps {
  onBack: () => void;
  highlightScore?: number;
}

export default function Scoreboard({ onBack, highlightScore }: ScoreboardProps) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    setScores(loadScores());
  }, []);

  return (
    <div className="flex flex-col items-center justify-start sm:justify-center min-h-screen p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        <h1
          className="text-3xl sm:text-4xl font-bold text-center mb-6 text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(90deg, #FFD700, #FF69B4, #FFD700)",
            WebkitBackgroundClip: "text",
          }}
        >
          Hall of Fame
        </h1>

        {scores.length === 0 ? (
          <div className="text-center text-purple-300/70 text-lg py-12">
            No scores yet! Play a game to set a record.
          </div>
        ) : (
          <div className="rounded-xl border-2 border-purple-500/30 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-purple-900/60 text-xs sm:text-sm font-bold text-purple-300">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-2 text-center">Stage</div>
              <div className="col-span-2 text-center">Princess</div>
              <div className="col-span-2 text-right">Date</div>
            </div>

            {/* Rows */}
            {scores.map((record, i) => {
              const isHighlight = highlightScore !== undefined && record.score === highlightScore;
              const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
              return (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-1 px-3 py-2 text-xs sm:text-sm border-t border-purple-500/10 transition-colors ${
                    isHighlight ? "bg-yellow-500/10" : i % 2 === 0 ? "bg-purple-900/20" : "bg-purple-900/10"
                  }`}
                >
                  <div
                    className="col-span-1 font-bold"
                    style={{ color: i < 3 ? rankColors[i] : "#B8A9E8" }}
                  >
                    {i + 1}
                  </div>
                  <div className="col-span-3 text-white truncate font-semibold">
                    {record.name}
                  </div>
                  <div className="col-span-2 text-right text-yellow-300 font-bold">
                    {record.score.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-center text-purple-200">
                    {record.stage}-{record.wave}
                  </div>
                  <div className="col-span-2 text-center text-pink-300 truncate">
                    {record.princess}
                  </div>
                  <div className="col-span-2 text-right text-purple-400 text-[10px] sm:text-xs">
                    {record.date}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onBack}
            className="px-6 py-2 text-sm font-bold rounded-full border-2 border-purple-400 bg-purple-800/50 hover:bg-purple-700/50 text-white transition-all cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
