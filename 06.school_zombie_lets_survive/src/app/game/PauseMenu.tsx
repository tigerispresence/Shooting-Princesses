"use client";

import { drawSoundIcon } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";

/**
 * 일시정지 — 음악/효과음을 따로 끈다.
 * 이 게임은 소리가 정보를 나르기 때문에 "음악만 끄고 효과음은 켜기"가 권장 조합이다.
 */
interface Props {
  bgmOn: boolean;
  sfxOn: boolean;
  onBgm: (v: boolean) => void;
  onSfx: (v: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  sectionLabel: string;
}

export default function PauseMenu({
  bgmOn,
  sfxOn,
  onBgm,
  onSfx,
  onResume,
  onRestart,
  onExit,
  sectionLabel,
}: Props) {
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <button
      className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-base
                  font-bold touch-none select-none
                  ${on ? "border-amber-200/70 bg-amber-300/25 text-amber-100" : "border-white/20 bg-white/5 text-white/50"}`}
      onPointerDown={(e) => {
        e.preventDefault();
        set(!on);
      }}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <SpriteCanvas
          width={26}
          height={26}
          redraw={`${on}`}
          draw={(ctx, w) => drawSoundIcon(ctx, w / 2, w / 2, w * 0.9, on)}
        />
        <span className="text-sm">{on ? "켜짐" : "꺼짐"}</span>
      </span>
    </button>
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#151129]/88 p-6 text-center">
      <h2 className="text-2xl font-extrabold text-amber-200">잠깐 쉬는 중</h2>
      <p className="text-sm text-violet-200/80">{sectionLabel}</p>
      <div className="mt-2 flex w-full max-w-[300px] flex-col gap-2">
        {toggle("음악", bgmOn, onBgm)}
        {toggle("효과음", sfxOn, onSfx)}
      </div>
      <p className="max-w-[300px] text-xs leading-relaxed text-violet-300/70">
        하품 소리가 좀비 위치를 알려줘. 소리를 다 꺼도 미니맵이랑 눈빛으로 다 깰 수 있어!
      </p>
      <div className="mt-2 flex w-full max-w-[300px] flex-col gap-2">
        <button
          className="rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-6 py-3 text-lg
                     font-bold text-amber-100 touch-none select-none active:bg-amber-300/50"
          onPointerDown={(e) => {
            e.preventDefault();
            onResume();
          }}
        >
          계속하기
        </button>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm
                       text-violet-100 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              onRestart();
            }}
          >
            구역 처음부터
          </button>
          <button
            className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm
                       text-violet-100 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              onExit();
            }}
          >
            스테이지 고르기
          </button>
        </div>
      </div>
    </div>
  );
}
