"use client";

import { useState } from "react";
import type { ScoreRecord } from "./types";

const STORAGE_KEY = "flashMazeScores";
const NAME_KEY = "flashMazeLastName";
const MAX_SCORES = 10;

export function saveScore(record: Omit<ScoreRecord, "date">): void {
  if (typeof window === "undefined") return;
  const scores = loadScores();
  scores.push({ ...record, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > MAX_SCORES) scores.length = MAX_SCORES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Private browsing or a full quota — the run still counts, it just
    // doesn't persist. Not worth interrupting a 10-year-old's victory over.
  }
}

export function loadScores(): ScoreRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as ScoreRecord[]) : [];
  } catch {
    return [];
  }
}

/** Remembering the last name saves retyping it every single run. */
export function loadLastName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLastName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Same as above — non-fatal.
  }
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

interface Props {
  onBack: () => void;
}

export default function Scoreboard({ onBack }: Props) {
  // This only ever mounts from a button press, so reading storage during the
  // first render is safe — and it picks up a score saved moments ago.
  const [scores] = useState<ScoreRecord[]>(() => loadScores());

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#12061f]/97 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center p-4">
        <h1
          className="mb-5 bg-clip-text text-center text-3xl font-bold text-transparent sm:text-4xl"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #FFD700, #FF69B4, #FFD700)",
            WebkitBackgroundClip: "text",
          }}
        >
          Hall of Fame
        </h1>

        {scores.length === 0 ? (
          <div className="py-12 text-center text-lg text-purple-300/70">
            No escapes yet! Get out of a maze to set a record.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border-2 border-purple-500/30">
            <div className="grid grid-cols-12 gap-1 bg-purple-900/60 px-3 py-2 text-xs font-bold text-purple-300 sm:text-sm">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-2 text-right">Time</div>
              <div className="col-span-1 text-center">👣</div>
              <div className="col-span-1 text-center">💥</div>
              <div className="col-span-2 text-right">Date</div>
            </div>

            {scores.map((record, i) => (
              <div
                key={`${record.date}-${record.score}-${i}`}
                className={`grid grid-cols-12 items-center gap-1 border-t border-purple-500/10 px-3 py-2 text-xs sm:text-sm ${
                  i % 2 === 0 ? "bg-purple-900/20" : "bg-purple-900/10"
                }`}
              >
                <div
                  className="col-span-1 font-bold"
                  style={{ color: i < 3 ? RANK_COLORS[i] : "#B8A9E8" }}
                >
                  {i + 1}
                </div>
                <div className="col-span-3 truncate font-semibold text-white">
                  {record.perfect && <span title="Perfect run">⭐ </span>}
                  {record.name}
                </div>
                <div className="col-span-2 text-right font-bold text-yellow-300">
                  {record.score}
                </div>
                <div className="col-span-2 text-right text-purple-200">
                  {(record.timeMs / 1000).toFixed(1)}s
                </div>
                <div className="col-span-1 text-center text-purple-200">
                  {record.moves}
                </div>
                <div
                  className={`col-span-1 text-center ${
                    record.bumps > 0 ? "text-rose-300" : "text-purple-200"
                  }`}
                >
                  {record.bumps}
                </div>
                <div className="col-span-2 text-right text-[10px] text-purple-400 sm:text-xs">
                  {record.date}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={onBack}
            className="cursor-pointer rounded-full border-2 border-purple-400 bg-purple-800/50 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-purple-700/50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
