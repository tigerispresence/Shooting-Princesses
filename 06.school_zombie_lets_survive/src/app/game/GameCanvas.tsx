"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx, setupAudioUnlock } from "./audio";
import { COLORS, MINIMAP_H, MINIMAP_W, VIEW_H, VIEW_W } from "./constants";
import {
  createGame,
  placeAlarm,
  pressInteract,
  releaseInteract,
  restartFromCheckpoint,
  setAim,
  setMove,
  skipCutscene,
  throwChalk,
  toHud,
  toggleTorch,
  update,
} from "./engine";
import { INGREDIENTS, STAGES } from "./maps";
import { playClearFanfare, playMusic, stopMusic } from "./music";
import PauseMenu from "./PauseMenu";
import { drawFullMap, drawStars, isDarkHere, render } from "./renderer";
import * as sprites from "./sprites";
import { drawIngredient, drawPauseIcon, drawSoundIcon } from "./sprites";
import SpriteCanvas from "./SpriteCanvas";
import TouchControls from "./TouchControls";
import type { GameState, HudState, Look, StageScore } from "./types";

export interface ClearResult {
  stageId: number;
  stars: number;
  score: number;
  menuPieces: boolean[];
  friendsMet: boolean[];
  sleeps: number;
}

interface Props {
  stageId: number;
  look: Look;
  playerName: string;
  menuPieces: boolean[];
  practice: number | null;
  bgmOn: boolean;
  sfxOn: boolean;
  onBgm: (v: boolean) => void;
  onSfx: (v: boolean) => void;
  onClear: (r: ClearResult) => void;
  onExit: () => void;
  onNext: (() => void) | null;
}

const EMPTY_HUD: HudState = {
  phase: "playing",
  section: "",
  score: 0,
  menus: 0,
  ingredients: new Array(8).fill(false),
  alarms: 0,
  torch: false,
  canTorch: false,
  canChalk: false,
  canAlarm: false,
  sleepLine: "",
  canSkip: false,
  showRestart: false,
  broadcast: 0,
  showBroadcast: false,
  stars: 0,
  scoreBoard: null,
  sleeps: 0,
  stageId: 1,
  hasIngredientA: false,
  hasIngredientB: false,
  inDark: false,
};

export default function GameCanvas({
  stageId,
  look,
  playerName,
  menuPieces,
  practice,
  bgmOn,
  sfxOn,
  onBgm,
  onSfx,
  onClear,
  onExit,
  onNext,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const hudKeyRef = useRef("");
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [box, setBox] = useState({ w: 360, h: 480 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const clearedRef = useRef(false);
  const clearTimeRef = useRef(0);

  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];

  const withState = useCallback((fn: (s: GameState) => void) => {
    const s = stateRef.current;
    if (s) fn(s);
  }, []);

  // iOS는 진짜 터치/클릭 안에서만 오디오가 열린다
  useEffect(() => setupAudioUnlock(), []);

  // 게임 만들기 + 루프. 상태는 ref에만 둔다 (게임 루프 안에서 React state 금지).
  useEffect(() => {
    stateRef.current = createGame({
      stageId,
      playerName,
      menuPieces,
      practiceZombies: practice,
    });
    clearedRef.current = false;
    hudKeyRef.current = "";

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__zombie = stateRef;
      // 흑백 실루엣 테스트(DESIGN §12-A)를 자동으로 돌리기 위한 개발 전용 훅
      (window as unknown as Record<string, unknown>).__sprites = sprites;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    let chaseHold = 0;

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const s = stateRef.current;
      if (s) {
        const k = keysRef.current;
        const kx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        const ky = (k.down ? 1 : 0) - (k.up ? 1 : 0);
        if (kx || ky) setMove(s, kx, ky);
        else if (!s.padActive) setMove(s, 0, 0);

        update(s, dt);
        render(ctx, s, look);

        // 음악 — 추격이 잠깐 끊겨도 곡이 덜덜거리지 않게 붙잡아 둔다
        const chasing = s.zombies.some((z) => z.state === "chase");
        chaseHold = chasing ? 1500 : Math.max(0, chaseHold - dt);
        if (s.phase === "playing" || s.phase === "ritual") {
          playMusic({
            stageId: s.stageId,
            chase: chaseHold > 0,
            dark: isDarkHere(s),
            boss: !!s.boss?.active,
            speech: s.boss?.active && s.boss.phase === "speech",
          });
        }

        const next = toHud(s);
        const key = JSON.stringify(next);
        if (key !== hudKeyRef.current) {
          hudKeyRef.current = key;
          setHud(next);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // look은 그리기에만 쓰여서 다시 만들 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, playerName, practice]);

  useEffect(() => () => stopMusic(), []);

  // 캔버스는 남는 자리에 3:4로 꽉 채운다. 크기를 JS로 재야 미니맵 탭 영역을 정확히 얹을 수 있다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      // 데스크톱에서는 화면 높이에 맞춰 키우되 1.6배까지만 (그 이상은 그림이 뭉갠다)
      const k = Math.min(el.clientWidth / VIEW_W, el.clientHeight / VIEW_H, 1.6);
      setBox({ w: Math.floor(VIEW_W * k), h: Math.floor(VIEW_H * k) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 세로 전용 — 눕히면 안내만 띄우고 게임은 멈춘다
  useEffect(() => {
    const check = () => {
      setRotate(window.innerWidth > window.innerHeight && window.innerHeight < 560);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    withState((s) => {
      s.paused = paused || rotate;
      s.mapOpen = mapOpen;
      if (paused || rotate || mapOpen) {
        keysRef.current = { up: false, down: false, left: false, right: false };
        setMove(s, 0, 0);
        releaseInteract(s);
      }
    });
  }, [paused, rotate, mapOpen, withState]);

  // 클리어
  useEffect(() => {
    if (hud.phase !== "stageClear" || clearedRef.current) return;
    clearedRef.current = true;
    clearTimeRef.current = performance.now();
    stopMusic();
    playClearFanfare(hud.stars);
    const s = stateRef.current;
    if (!s) return;
    onClear({
      stageId,
      stars: hud.stars,
      score: hud.score,
      menuPieces: s.gotMenus.slice(),
      friendsMet: s.friends.map((f) => f.state === "follow"),
      sleeps: s.sleeps,
    });
  }, [hud.phase, hud.stars, hud.score, stageId, onClear]);

  const doRestart = useCallback(() => {
    // 버튼을 누른 순간부터 조작 가능해지기까지 300ms 이내 — 상태만 제자리에서 리셋한다
    withState((s) => restartFromCheckpoint(s));
  }, [withState]);

  // 키보드
  useEffect(() => {
    const dirOf = (key: string): keyof typeof keysRef.current | null => {
      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          return "up";
        case "ArrowDown":
        case "s":
        case "S":
          return "down";
        case "ArrowLeft":
        case "a":
        case "A":
          return "left";
        case "ArrowRight":
        case "d":
        case "D":
          return "right";
        default:
          return null;
      }
    };

    const onDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.repeat) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setMapOpen(false);
        setPaused((p) => !p);
        playSfx("uiTap");
        return;
      }
      if (s.phase === "sleeping") {
        e.preventDefault();
        if (s.sleepT >= 3000) doRestart();
        else skipCutscene(s);
        return;
      }
      if (s.phase === "ritual") {
        e.preventDefault();
        skipCutscene(s);
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMapOpen((v) => !v);
        return;
      }
      if (paused || mapOpen) return;

      const dir = dirOf(e.key);
      if (dir) {
        e.preventDefault();
        keysRef.current[dir] = true;
        return;
      }
      if (e.key === " " || e.key === "e" || e.key === "E" || e.key === "Enter") {
        e.preventDefault();
        pressInteract(s);
        return;
      }
      if (e.key === "Shift") {
        e.preventDefault();
        setAim(s, null);
        throwChalk(s);
        return;
      }
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        placeAlarm(s);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleTorch(s);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const dir = dirOf(e.key);
      if (dir) keysRef.current[dir] = false;
      if (e.key === " " || e.key === "e" || e.key === "E" || e.key === "Enter") {
        releaseInteract(s);
      }
    };

    const onBlur = () => {
      keysRef.current = { up: false, down: false, left: false, right: false };
      const s = stateRef.current;
      if (s) {
        setMove(s, 0, 0);
        releaseInteract(s);
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mapOpen]);

  // 마우스로 분필 던지기 — 커서 방향
  const aimFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    if (e.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / VIEW_W;
    const scale = s.stage.renderScale;
    const psx = (s.player.x - s.camera.x) * scale * k + rect.left;
    const psy = (s.player.y - s.camera.y) * scale * k + rect.top;
    setAim(s, Math.atan2(e.clientY - psy, e.clientX - psx));
  }, []);

  const clearBoard: StageScore | null = hud.scoreBoard;
  const ingredientNames = stage.ingredients;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#151129]">
      {/* 상단 띠 — 정보 3개만. 넓은 화면에서 화면 끝으로 흩어지지 않게 캔버스 폭에 맞춰 가운데 정렬한다. */}
      <div
        className="mx-auto flex h-[52px] w-full shrink-0 items-center justify-between px-3 text-white"
        style={{ maxWidth: box.w }}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] text-violet-300/70">점수</span>
          <span className="text-lg font-extrabold tabular-nums text-amber-200">
            {hud.score}
          </span>
        </div>
        <div className="text-[13px] font-bold text-violet-100">
          급식표 {hud.menus}/10
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              const next = !(bgmOn || sfxOn);
              onBgm(next);
              onSfx(next);
            }}
            aria-label="소리 한 번에 끄기"
          >
            <SpriteCanvas
              width={26}
              height={26}
              redraw={`${bgmOn || sfxOn}`}
              draw={(ctx, w) => drawSoundIcon(ctx, w / 2, w / 2, w * 0.9, bgmOn || sfxOn)}
            />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 touch-none select-none active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              playSfx("uiTap");
              setPaused(true);
            }}
            aria-label="일시정지"
          >
            <SpriteCanvas
              width={24}
              height={24}
              draw={(ctx, w) => drawPauseIcon(ctx, w / 2, w / 2, w)}
            />
          </button>
        </div>
      </div>

      {/* 게임 화면 */}
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-start justify-center">
        <div className="relative" style={{ width: box.w, height: box.h }}>
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            onPointerMove={aimFromEvent}
            onPointerDown={(e) => {
              const s = stateRef.current;
              if (!s) return;
              if (s.phase === "ritual") {
                skipCutscene(s);
                return;
              }
              if (s.phase === "sleeping") {
                if (s.sleepT >= 3000) doRestart();
                else skipCutscene(s);
                return;
              }
              if (e.pointerType === "mouse" && e.button === 0) {
                aimFromEvent(e);
                throwChalk(s);
              }
            }}
          />

          {/* 미니맵을 탭하면 전체 지도 + 일시정지 */}
          <button
            className="absolute touch-none select-none"
            style={{
              left: 0,
              top: 0,
              width: ((MINIMAP_W + 16) * box.w) / VIEW_W,
              height: ((MINIMAP_H + 16) * box.h) / VIEW_H,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playSfx("uiTap");
              setMapOpen((v) => !v);
            }}
            aria-label="전체 지도 보기"
          />

        </div>

        {!paused && !rotate && !mapOpen && hud.phase === "playing" && (
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2"
            style={{ width: box.w }}
          >
            <TouchControls
              onMove={(x, y) =>
                withState((s) => {
                  s.padActive = x !== 0 || y !== 0;
                  setMove(s, x, y);
                })
              }
              onInteractDown={() => withState((s) => pressInteract(s))}
              onInteractUp={() => withState((s) => releaseInteract(s))}
              onChalk={() => withState((s) => throwChalk(s))}
              onAlarm={() => withState((s) => placeAlarm(s))}
              onTorch={() => withState((s) => toggleTorch(s))}
              showChalk={hud.canChalk}
              showAlarm={hud.canAlarm}
              showTorch={hud.canTorch}
              alarms={hud.alarms}
              torchOn={hud.torch}
              disabled={hud.phase !== "playing"}
            />
          </div>
        )}

        {/* 잠들었다 — 종 치고 다시! */}
        {hud.phase === "sleeping" && hud.showRestart && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
            <button
              className="pointer-events-auto rounded-3xl border-2 border-amber-200 bg-amber-300/90 px-8 py-4
                         text-xl font-extrabold text-[#2B2540] shadow-lg touch-none select-none
                         active:scale-95 bell-pop"
              onPointerDown={(e) => {
                e.preventDefault();
                playSfx("bell");
                doRestart();
              }}
            >
              종 치고 다시!
            </button>
          </div>
        )}
        {hud.phase === "sleeping" && !hud.showRestart && hud.canSkip && (
          <p className="pointer-events-none absolute inset-x-0 bottom-8 z-20 text-center text-xs text-white/60">
            아무 데나 눌러서 건너뛰기
          </p>
        )}

        {/* 전체 지도 */}
        {mapOpen && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#151129]/92 p-4">
            <h3 className="text-lg font-extrabold text-amber-200">학교 지도</h3>
            <SpriteCanvas
              width={330}
              height={330}
              animate
              draw={(ctx, w, h) => {
                const s = stateRef.current;
                if (s) drawFullMap(ctx, s, w, h);
              }}
            />
            <button
              className="rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-8 py-3 text-base
                         font-bold text-amber-100 touch-none select-none active:bg-amber-300/50"
              onPointerDown={(e) => {
                e.preventDefault();
                playSfx("uiBack");
                setMapOpen(false);
              }}
            >
              닫기
            </button>
          </div>
        )}

        {paused && !rotate && (
          <PauseMenu
            bgmOn={bgmOn}
            sfxOn={sfxOn}
            onBgm={onBgm}
            onSfx={onSfx}
            sectionLabel={hud.section}
            onResume={() => {
              playSfx("uiTap");
              setPaused(false);
            }}
            onRestart={() => {
              setPaused(false);
              doRestart();
            }}
            onExit={() => {
              stopMusic();
              onExit();
            }}
          />
        )}

        {rotate && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#151129] p-6 text-center">
            <p className="text-2xl font-extrabold text-amber-200">폰을 세워 주세요</p>
            <p className="text-sm text-violet-200/80">이 게임은 세로로 하는 게 제일 재밌어!</p>
          </div>
        )}

        {/* 클리어 */}
        {hud.phase === "stageClear" && clearBoard && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-[#151129]/92 p-5 text-center">
            <h2 className="text-2xl font-extrabold text-amber-200">{stage.title} 통과!</h2>
            <SpriteCanvas
              width={220}
              height={64}
              animate
              draw={(ctx, w, h) =>
                drawStars(ctx, w, h, clearBoard.stars, performance.now() - clearTimeRef.current)
              }
            />
            <div className="w-full max-w-[300px] space-y-1 text-[13px] text-violet-100">
              <Row label="재료" value={clearBoard.ingredients} />
              <Row label="급식표" value={clearBoard.menus} />
              {clearBoard.friends > 0 && <Row label="친구 구출" value={clearBoard.friends} />}
              <Row label="클리어" value={clearBoard.clear} />
              <Row label="시간 보너스" value={clearBoard.time} />
              {clearBoard.stealth > 0 && <Row label="들키지 않았어!" value={clearBoard.stealth} />}
              {clearBoard.fresh > 0 && <Row label="쌩쌩해요!" value={clearBoard.fresh} />}
              {clearBoard.nearMiss > 0 && <Row label="아슬아슬" value={clearBoard.nearMiss} />}
              <div className="mt-1 flex justify-between border-t border-white/20 pt-1 text-base font-extrabold text-amber-200">
                <span>합계</span>
                <span className="tabular-nums">{clearBoard.total}</span>
              </div>
              <p className="pt-1 text-xs text-violet-300/70">
                이번에 잔 횟수 {hud.sleeps}번
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {onNext && (
                <button
                  className="rounded-2xl border-2 border-amber-200/60 bg-amber-300/30 px-6 py-3 text-base
                             font-bold text-amber-100 touch-none select-none active:bg-amber-300/50"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playSfx("uiTap");
                    onNext();
                  }}
                >
                  다음 스테이지
                </button>
              )}
              <button
                className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-base
                           text-violet-100 touch-none select-none active:bg-white/25"
                onPointerDown={(e) => {
                  e.preventDefault();
                  playSfx("uiBack");
                  onExit();
                }}
              >
                스테이지 고르기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 띠 — 재료 8칸 + 구역 이름. 상단 띠와 같은 폭·같은 중심선. */}
      <div
        className="mx-auto flex h-[40px] w-full shrink-0 items-center justify-between gap-2 px-3"
        style={{ maxWidth: box.w }}
      >
        <div className="flex items-center gap-[2px]">
          {INGREDIENTS.map((ing, i) => {
            // 아직 못 얻은 칸도 **색은 그대로** 두고 흐리게만 한다.
            // 회색 실루엣으로 만들면 30px에서 뭘 더 모아야 하는지 안 읽힌다 (graphic-designer).
            const got = hud.ingredients[i];
            return (
              <div
                key={ing.name}
                className={`relative flex h-[34px] w-[32px] items-center justify-center rounded-lg
                            ${got ? "border border-amber-200/50 bg-amber-200/10" : "border border-dashed border-white/30"}`}
                title={ing.name}
                style={{ opacity: got ? 1 : 0.45 }}
              >
                <SpriteCanvas
                  width={28}
                  height={28}
                  redraw={`${got}`}
                  draw={(ctx, w) => drawIngredient(ctx, w / 2, w / 2, i, 0, 20)}
                />
                {got && (
                  <span className="absolute -right-[1px] -top-[2px] text-[10px] font-bold leading-none text-emerald-300">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* 지도는 미니맵을 탭하거나 M 키로 연다 — 여기 버튼을 두면 손 버튼과 겹친다 */}
        <span className="pointer-events-none text-[12px] font-bold text-violet-200/85">
          {hud.section}
        </span>
      </div>
      <span className="hidden">{ingredientNames.join(",")}</span>
      <span className="hidden">{COLORS.itemGlow}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-violet-200/80">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
