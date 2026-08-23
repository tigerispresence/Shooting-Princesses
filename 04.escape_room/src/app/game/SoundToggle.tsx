"use client";

import { useState } from "react";
import { isMuted, playSfx, setMuted } from "./audio";
import { loadMuted, saveMuted } from "./storage";

/**
 * 소리 끄기/켜기. 배경음악이 깔리는 이상 아이가 스스로 끌 수 있어야 한다.
 * (도서관이나 늦은 밤에도 놀 수 있게.)
 */
export default function SoundToggle() {
  // 저장된 값은 렌더가 아니라 첫 클릭 전까지 필요 없으므로, 초기값만 읽어 맞춘다
  const [off, setOff] = useState(() => {
    const stored = loadMuted();
    if (stored) setMuted(true);
    return stored || isMuted();
  });

  return (
    <button
      className="fixed right-2 top-2 z-40 rounded-full border border-white/15 bg-black/45 px-3 py-1.5
                 text-base backdrop-blur active:bg-white/20 touch-none select-none"
      onPointerDown={(e) => {
        e.preventDefault();
        const next = !off;
        setOff(next);
        setMuted(next);
        saveMuted(next);
        // 켤 때만 소리가 나야 확인이 된다
        if (!next) playSfx("uiTap");
      }}
      aria-label={off ? "소리 켜기" : "소리 끄기"}
      title={off ? "소리 켜기" : "소리 끄기"}
    >
      {off ? "🔇" : "🔊"}
    </button>
  );
}
