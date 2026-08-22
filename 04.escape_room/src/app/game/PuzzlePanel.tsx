"use client";

import type { ModalState } from "./types";

type PuzzleModal = Exclude<ModalState, { kind: "inspect" }>;

interface Props {
  modal: PuzzleModal;
  foundDigits: (string | null)[];
  onAnswer: (index: number) => void;
  onKey: (ch: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"];

export default function PuzzlePanel({
  modal,
  foundDigits,
  onAnswer,
  onKey,
  onSubmit,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
      <div
        className="panel-pop max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-3xl
                   border border-violet-300/25 bg-[#1c1030]/97 p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      >
        {modal.kind === "quiz" ? (
          <>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-violet-50">
              {modal.question}
            </p>
            <div className="mt-4 grid gap-2">
              {modal.choices.map((c, i) => (
                <button
                  key={c}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left
                             text-base text-violet-50 active:bg-amber-300/30 hover:bg-white/20
                             touch-none select-none"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onAnswer(i);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-violet-300/80 active:text-violet-100"
              onPointerDown={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              나중에 다시 풀기
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-[15px] text-violet-50">
              문에 달린 숫자 자물쇠
            </p>

            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: modal.length }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-bold
                    ${
                      modal.wrong
                        ? "border-rose-400/70 bg-rose-500/15 text-rose-200"
                        : "border-amber-200/50 bg-black/40 text-amber-100"
                    }`}
                >
                  {modal.entry[i] ?? ""}
                </div>
              ))}
            </div>

            <p className="mt-2 text-center text-xs text-violet-300/80">
              {modal.wrong
                ? "삐— 틀렸어! 숫자를 다시 확인해 봐."
                : `찾은 숫자: ${foundDigits.map((d) => d ?? "?").join(" ")}`}
            </p>

            <div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2">
              {KEYS.map((k) => {
                const label = k === "del" ? "←" : k === "ok" ? "✓" : k;
                const tone =
                  k === "ok"
                    ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                    : k === "del"
                      ? "border-white/15 bg-white/10 text-violet-200"
                      : "border-white/15 bg-white/10 text-violet-50";
                return (
                  <button
                    key={k}
                    className={`h-14 w-[4.2rem] rounded-xl border text-xl font-bold active:brightness-150
                                touch-none select-none ${tone}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (k === "ok") onSubmit();
                      else onKey(k);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-violet-300/80 active:text-violet-100"
              onPointerDown={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
