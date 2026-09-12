"use client";

import { useEffect } from "react";
import { playSfx } from "./audio";
import { playNamedMusic } from "./music";
import { drawPlayer, drawZombie } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import { SUBTITLE, TITLE } from "./text";
import type { Look } from "./types";

interface Props {
  look: Look;
  savedName: string;
  onStart: () => void;
  onContinue: () => void;
}

export default function TitleScreen({ look, savedName, onStart, onContinue }: Props) {
  useEffect(() => {
    // 아직 오디오가 안 열렸으면 아무 일도 안 일어난다. 버튼을 누르면 그때 열린다.
    playNamedMusic("title");
  }, []);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="title-glow text-[30px] font-extrabold leading-tight text-amber-200">
        {TITLE}
      </h1>
      <p className="text-sm text-violet-200/80">{SUBTITLE}</p>

      <SpriteCanvas
        width={260}
        height={150}
        animate
        draw={(ctx, w, h) => {
          const t = performance.now();
          ctx.clearRect(0, 0, w, h);
          // 복도 바닥
          ctx.fillStyle = "#B8BEC7";
          ctx.fillRect(0, h - 46, w, 46);
          ctx.strokeStyle = "rgba(255,211,77,0.6)";
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 12]);
          ctx.beginPath();
          ctx.moveTo(0, h - 23);
          ctx.lineTo(w, h - 23);
          ctx.stroke();
          ctx.setLineDash([]);
          drawZombie(ctx, 58, h - 34, {
            kind: "basic",
            r: 17,
            bob: t * 0.003,
            state: "patrol",
            yawning: true,
          });
          drawZombie(ctx, w - 54, h - 34, {
            kind: "matron",
            r: 19,
            bob: t * 0.004 + 1,
            state: "patrol",
            yawning: false,
          });
          drawPlayer(ctx, w / 2, h - 36, {
            look,
            r: 19,
            walkT: t * 0.006,
            moving: true,
          });
        }}
      />

      {savedName ? (
        <>
          <p className="text-base font-bold text-violet-100">
            {savedName}아, 또 왔구나!
          </p>
          <button
            className="press-pulse rounded-3xl border-2 border-amber-200 bg-amber-300/35 px-10 py-4
                       text-xl font-extrabold text-amber-100 touch-none select-none active:bg-amber-300/55"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              onContinue();
            }}
          >
            이어하기
          </button>
          <button
            className="rounded-2xl border border-white/20 bg-white/10 px-6 py-2 text-sm text-violet-100
                       touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              onStart();
            }}
          >
            이름·옷 다시 고르기
          </button>
        </>
      ) : (
        <button
          className="press-pulse rounded-3xl border-2 border-amber-200 bg-amber-300/35 px-10 py-4
                     text-xl font-extrabold text-amber-100 touch-none select-none active:bg-amber-300/55"
          onPointerDown={(e) => {
            e.preventDefault();
            playSfx("uiTap");
            onStart();
          }}
        >
          시작하기
        </button>
      )}

      <p className="max-w-[300px] text-xs leading-relaxed text-violet-300/70">
        급식 신메뉴 「보라 브로콜리 푸딩」을 먹은 전교생이 졸음 좀비가 됐다.
        재료를 모아 해독제를 만들고 방송실에서 기상 나팔을 틀자!
      </p>
    </div>
  );
}
