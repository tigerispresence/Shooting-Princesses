"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PRINCESSES, PLAYER_SPEED } from "./constants";
import { createInitialState, shoot, spawnEnemy, updateGameState, activateSuper } from "./engine";
import {
  drawBackground,
  drawPlayer,
  drawProjectile,
  drawEnemy,
  drawParticle,
  drawPowerUp,
  drawHUD,
  drawGameOver,
  drawWaveTransition,
  drawBattleCry,
  drawSuperAttack,
} from "./renderer";
import CharacterSelect from "./CharacterSelect";
import TouchControls from "./TouchControls";
import { initAudio, playBGM, stopBGM, playSFX, playCharacterShoot, toggleMute, isMuted } from "./audio";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createInitialState());
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastShotRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const animRef = useRef<number>(0);
  const selectedPrincessRef = useRef(0);
  const [screen, setScreen] = useState<"select" | "playing">("select");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [superReady, setSuperReady] = useState(false);
  const prevWaveRef = useRef(1);
  const gameOverSoundRef = useRef(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const customNameRef = useRef("");

  const startGame = useCallback((princessIndex: number, customName?: string) => {
    selectedPrincessRef.current = princessIndex;
    if (customName !== undefined) customNameRef.current = customName;
    const state = createInitialState();
    const princess = { ...PRINCESSES[princessIndex] };
    if (customNameRef.current) princess.name = customNameRef.current;
    state.player.princess = princess;
    state.started = true;
    stateRef.current = state;
    lastSpawnRef.current = 0;
    lastTimeRef.current = 0;
    prevWaveRef.current = 1;
    gameOverSoundRef.current = false;
    initAudio();
    playBGM(1);
    playSFX("battleCry");
    setScreen("playing");
  }, []);

  const handleShoot = useCallback(() => {
    const state = stateRef.current;
    if (!state.started || state.gameOver || state.paused) return;

    const now = Date.now();
    const cooldown = state.rapidFireUntil > now ? 100 : 250;
    if (now - lastShotRef.current < cooldown) return;
    lastShotRef.current = now;

    const newProjectiles = shoot(state);
    state.projectiles.push(...newProjectiles);
    playCharacterShoot(state.player.princess.name);
  }, []);

  const handleSuper = useCallback(() => {
    const state = stateRef.current;
    if (!state.started || state.gameOver || state.paused || !state.superReady) return;
    const particles = activateSuper(state);
    state.particles.push(...particles);
    playSFX("superAttack");
  }, []);

  const handleTouchMove = useCallback((dx: number, dy: number) => {
    const state = stateRef.current;
    if (!state.started || state.gameOver || state.paused) return;
    const { player } = state;
    const speed = PLAYER_SPEED * 1.2;
    player.x = Math.max(player.width / 2, Math.min(CANVAS_WIDTH / 2, player.x + dx * speed));
    player.y = Math.max(player.height / 2 + 45, Math.min(CANVAS_HEIGHT - player.height / 2, player.y + dy * speed));
  }, []);

  useEffect(() => {
    if (screen !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);

      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
      }

      if (e.key === " ") {
        const state = stateRef.current;
        if (state.gameOver) {
          startGame(selectedPrincessRef.current);
          return;
        }
        handleShoot();
      }

      if (e.key === "Escape") {
        const state = stateRef.current;
        if (state.gameOver) {
          setScreen("select");
          return;
        }
      }

      if (e.key === "e" || e.key === "E") {
        handleSuper();
      }

      if (e.key === "p" || e.key === "P") {
        stateRef.current.paused = !stateRef.current.paused;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    const handleClick = () => {
      if (isTouchDevice) return;
      const state = stateRef.current;
      if (state.gameOver) {
        startGame(selectedPrincessRef.current);
        return;
      }
      handleShoot();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleClick);

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;
      frameRef.current++;

      const state = stateRef.current;
      const frame = frameRef.current;

      updateGameState(state, keysRef.current, deltaTime);

      if (state.wave !== prevWaveRef.current) {
        prevWaveRef.current = state.wave;
        playBGM(state.wave);
      }

      if (state.gameOver && !gameOverSoundRef.current) {
        gameOverSoundRef.current = true;
        stopBGM();
        playSFX("gameOver");
      }

      if (state.superReady !== superReady) {
        setSuperReady(state.superReady);
      }

      if (keysRef.current.has(" ") && state.started && !state.gameOver) {
        handleShoot();
      }

      if (state.started && !state.gameOver && !state.waveTransition) {
        const now = Date.now();
        const spawnInterval = Math.max(600, 1500 - state.wave * 100);
        if (now - lastSpawnRef.current > spawnInterval && state.enemiesSpawned < state.enemiesInWave) {
          const enemy = spawnEnemy(state);
          if (enemy) {
            state.enemies.push(enemy);
            state.enemiesSpawned++;
            lastSpawnRef.current = now;
          }
        }
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground(ctx, state.stars, frame);

      for (const pu of state.powerUps) drawPowerUp(ctx, pu, frame);
      for (const proj of state.projectiles) drawProjectile(ctx, proj, frame);
      for (const enemy of state.enemies) drawEnemy(ctx, enemy, frame);
      for (const particle of state.particles) drawParticle(ctx, particle);
      drawPlayer(ctx, state.player, frame);
      drawHUD(ctx, state);

      drawSuperAttack(ctx, state, frame);
      drawBattleCry(ctx, state, frame);
      if (state.waveTransition) drawWaveTransition(ctx, state.wave, frame);
      if (state.gameOver) drawGameOver(ctx, state, frame);

      if (state.paused && !state.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.font = "bold 36px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = "18px Arial";
        ctx.fillText("Press P to resume", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      }

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleClick);
      cancelAnimationFrame(animRef.current);
    };
  }, [screen, handleShoot, handleSuper, startGame, isTouchDevice]);

  if (screen === "select") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <CharacterSelect onSelect={startGame} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 w-full max-w-4xl"
        style={{ touchAction: "none" }}
      />
      <div className="flex gap-4 items-center">
        <button
          onClick={() => {
            cancelAnimationFrame(animRef.current);
            stopBGM();
            setScreen("select");
          }}
          className="text-purple-400/60 text-xs hover:text-purple-300 transition-colors cursor-pointer"
        >
          Back to Character Select
        </button>
        <button
          onClick={() => setMuted(toggleMute())}
          className="text-purple-400/60 text-xs hover:text-purple-300 transition-colors cursor-pointer"
        >
          {muted ? "🔇 Unmute" : "🔊 Sound"}
        </button>
      </div>
      <TouchControls
        onMove={handleTouchMove}
        onShoot={handleShoot}
        onSuper={handleSuper}
        superReady={superReady}
        visible={isTouchDevice && screen === "playing"}
      />
    </div>
  );
}
