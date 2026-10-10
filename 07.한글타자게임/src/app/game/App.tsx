"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FAMILY_CARD_MS, MIN_H, MIN_W, STAGE_H, STAGE_W, STICKERS, STICKER_CARD_MS } from "./constants";
import { loadSave, writeSave, type Save } from "./progress";
import { setMuted, unlockAudio } from "./audio";
import { drawSmiley } from "./sprites";
import { AppCtx, Art, StickerArt, type AppApi, type Screen, type Toast, type ToastInput } from "./ui/common";
import { JariSelect, MainMenu, ProfileCreate, ProfileSelect, RainSelect, RecordBoard, Shop, StickerBook, WordSelect } from "./ui/menus";
import { PracticeScreen } from "./practice/PracticeScreen";
import GameCanvas from "./GameCanvas";

export default function App() {
  const [save, setSave] = useState<Save | null>(null);
  const saveRef = useRef<Save | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "profiles" });
  const [nonce, setNonce] = useState(0);
  const [scale, setScale] = useState(1);
  const [tooSmall, setTooSmall] = useState(false);
  const [touchOnly, setTouchOnly] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  // load once on the client
  useEffect(() => {
    const s = loadSave();
    saveRef.current = s;
    setMuted(!s.sound);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave(s);
    setTouchOnly(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  // stage scaling (letterbox)
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(Math.min(w / STAGE_W, h / STAGE_H));
      setTooSmall(w < MIN_W || h < MIN_H);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // AudioContext must be resumed inside a real user gesture
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("click", unlock, true);
    window.addEventListener("touchend", unlock, true);
    return () => {
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchend", unlock, true);
    };
  }, []);

  const commit = useCallback((fn: (d: Save) => void) => {
    const cur = saveRef.current;
    if (!cur) return;
    const draft = structuredClone(cur);
    fn(draft);
    saveRef.current = draft;
    setMuted(!draft.sound);
    writeSave(draft);
    setSave(draft);
  }, []);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    setNonce((n) => n + 1);
  }, []);

  const toast = useCallback((t: ToastInput) => {
    const id = toastId.current++;
    const full = { ...t, id } as Toast;
    setToasts((ts) => [...ts, full]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), full.kind === "sticker" ? STICKER_CARD_MS + 400 : FAMILY_CARD_MS + 400);
  }, []);

  const profile = useMemo(() => save?.profiles.find((p) => p.id === save.lastProfileId) ?? null, [save]);

  const api: AppApi | null = useMemo(
    () => (save ? { save, profile, commit, go, toast, stageScale: scale } : null),
    [save, profile, commit, go, toast, scale],
  );

  // screens that need a profile fall back to the profile picker
  const needsProfile = screen.name !== "profiles" && screen.name !== "create";
  const effective: Screen = needsProfile && !profile ? { name: "profiles" } : screen;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F6E9F5]">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
      >
        {/* commit/toast read refs only when called from handlers, never during render */}
        {/* eslint-disable react-hooks/refs */}
        {api && touchOnly ? (
          <AppCtx.Provider value={api}>
            <TouchOnlyNotice />
          </AppCtx.Provider>
        ) : (
          api && (
            <AppCtx.Provider value={api}>
              <ScreenSwitch key={nonce} screen={effective} />
              <ToastLayer toasts={toasts} />
              {tooSmall && <TooSmall />}
            </AppCtx.Provider>
          )
        )}
        {/* eslint-enable react-hooks/refs */}
      </div>
    </div>
  );
}

function ScreenSwitch({ screen }: { screen: Screen }) {
  switch (screen.name) {
    case "profiles":
      return <ProfileSelect />;
    case "create":
      return <ProfileCreate />;
    case "menu":
      return <MainMenu />;
    case "jariSelect":
      return <JariSelect />;
    case "wordSelect":
      return <WordSelect />;
    case "practice":
      return <PracticeScreen mode={screen.mode} level={screen.level} />;
    case "rainSelect":
      return <RainSelect />;
    case "rain":
      return <GameCanvas level={screen.level} />;
    case "stickers":
      return <StickerBook />;
    case "records":
      return <RecordBoard />;
    case "shop":
      return <Shop />;
  }
}

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-6 z-50 flex flex-col items-center gap-3">
      {toasts.map((t) =>
        t.kind === "sticker" ? (
          <div key={t.id} className="sticker-fly flex items-center gap-4 rounded-[28px] bg-white px-6 py-3 shadow-2xl ring-4 ring-[#FFD1E3]">
            <StickerArt id={t.sticker} size={72} earned />
            <div>
              <div className="text-lg font-extrabold text-[#FF6F91]">새 스티커!</div>
              <div className="text-2xl font-black text-[#6b4f7a]">{STICKERS.find((s) => s.id === t.sticker)?.name}</div>
            </div>
          </div>
        ) : (
          <div key={t.id} className="sticker-fly max-w-[760px] rounded-[28px] bg-[#FFF6C8] px-8 py-4 text-center text-2xl font-extrabold text-[#8a6100] shadow-2xl ring-4 ring-[#FFD43B]">
            {t.text}
          </div>
        ),
      )}
    </div>
  );
}

function TooSmall() {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center gap-6 bg-[#FFF0F7]/95">
      <Art
        w={120}
        h={120}
        draw={(ctx) => {
          ctx.translate(60, 60);
          drawSmiley(ctx, 110);
        }}
      />
      <div className="text-5xl font-extrabold text-[#6b4f7a]">창을 조금 더 크게 해 주세요</div>
    </div>
  );
}

function TouchOnlyNotice() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#FFF0F7] to-[#EAF6FF]">
      <Art
        w={160}
        h={160}
        draw={(ctx) => {
          ctx.translate(80, 80);
          drawSmiley(ctx, 150);
        }}
      />
      <div className="text-6xl font-black text-[#FF6F91]">타닥타닥 타자교실</div>
      <div className="text-4xl font-extrabold text-[#6b4f7a]">이 게임은 키보드가 있는 컴퓨터에서 할 수 있어요</div>
    </div>
  );
}
