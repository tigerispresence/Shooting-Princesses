"use client";

import { useEffect, useMemo, useState } from "react";
import { playSfx } from "./audio";
import { FRIENDS } from "./maps";
import { playNamedMusic, stopMusic } from "./music";
import { drawFriend, drawPlayer, drawSleepingFriend, drawStar } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import {
  ENDING,
  ENDING_ALL_FRIENDS,
  ENDING_FRIENDS_ASLEEP,
  ENDING_MENU_BONUS,
  fill,
} from "./text";
import type { Look } from "./types";

interface Props {
  name: string;
  look: Look;
  friendsMet: boolean[];
  allMenus: boolean;
  sleepCount: number;
  onDone: () => void;
}

export default function EndingScreen({
  name,
  look,
  friendsMet,
  allMenus,
  sleepCount,
  onDone,
}: Props) {
  const met = FRIENDS.filter((_, i) => friendsMet[i] === true).length;

  const lines = useMemo(() => {
    const out = ENDING.map((l) => fill(l, name));
    // 구한 친구들이 한마디씩 한다.
    FRIENDS.forEach((f, i) => {
      if (friendsMet[i] === true) out.push(`${f.name}: "${f.line}"`);
    });
    // 못 구한 친구가 있으면 그 자리가 비어 있다는 걸 말로도 알려 준다 (다시 갈 이유)
    const asleep = FRIENDS.length - met;
    if (asleep > 0) out.push(ENDING_FRIENDS_ASLEEP.replace("{n}", String(asleep)));
    else out.push(fill(ENDING_ALL_FRIENDS, name));
    out.push(`이번 모험에서 ${name}이(가) 잠든 횟수: ${sleepCount}번`);
    if (allMenus) out.push(fill(ENDING_MENU_BONUS, name));
    return out;
  }, [name, friendsMet, allMenus, sleepCount, met]);

  const [step, setStep] = useState(0);

  useEffect(() => {
    playNamedMusic("ending");
    return () => stopMusic();
  }, []);

  useEffect(() => {
    if (step >= lines.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), 2400);
    return () => clearTimeout(id);
  }, [step, lines.length]);

  const done = step >= lines.length;

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 px-6 py-6 text-center"
      onPointerDown={() => {
        if (!done) setStep((s) => s + 1);
      }}
    >
      <h2 className="text-2xl font-extrabold text-amber-200">학교를 구했다!</h2>

      <SpriteCanvas
        width={280}
        height={152}
        animate
        draw={(ctx, w, h) => {
          const t = performance.now();
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "#FFD9C2";
          ctx.fillRect(0, h - 44, w, 44);
          // 자리는 **항상 다섯**이다 — 주인공 1 + 친구 4.
          // 못 구한 친구의 자리를 없애고 가운데로 몰면 아이 눈에는 "버그"로 보이고,
          // 무엇보다 다시 하러 갈 이유가 사라진다 (DESIGN §12-C).
          const SLOTS = 5;
          const gap = w / (SLOTS + 1);
          const row = h - 52;
          drawPlayer(ctx, gap, row, {
            look,
            r: 20,
            walkT: t * 0.004,
            moving: true,
          });
          FRIENDS.forEach((f, i) => {
            const x = gap * (i + 2);
            if (friendsMet[i] === true) drawFriend(ctx, x, row, i, 17, t, false);
            else drawSleepingFriend(ctx, x, row, 15, f.name, t);
          });
          for (let i = 0; i < 3; i++) {
            drawStar(ctx, w / 2 - 40 + i * 40, 24 + Math.sin(t * 0.003 + i) * 4, 12, true);
          }
        }}
      />

      <div className="flex min-h-[170px] w-full max-w-[340px] flex-col justify-start gap-1">
        {lines.slice(0, step).map((l, i) => (
          <p
            key={i}
            className={`toast-pop text-[13px] leading-relaxed ${
              i === step - 1 ? "text-amber-100" : "text-violet-200/70"
            }`}
          >
            {l}
          </p>
        ))}
      </div>

      {done ? (
        <button
          className="rounded-3xl border-2 border-amber-200 bg-amber-300/35 px-8 py-3 text-lg
                     font-extrabold text-amber-100 touch-none select-none active:bg-amber-300/55"
          onPointerDown={(e) => {
            e.preventDefault();
            playSfx("starPop");
            onDone();
          }}
        >
          다시 학교로!
        </button>
      ) : (
        <p className="text-xs text-violet-300/60">화면을 누르면 다음 장면</p>
      )}
    </div>
  );
}
