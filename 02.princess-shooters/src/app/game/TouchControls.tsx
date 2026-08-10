"use client";

import { useRef, useEffect, useCallback } from "react";

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onShoot: () => void;
  visible: boolean;
}

export default function TouchControls({ onMove, onShoot, visible }: TouchControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const moveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDir = useRef({ dx: 0, dy: 0 });
  const shootInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const JOYSTICK_RADIUS = 50;

  const updateKnob = useCallback((dx: number, dy: number) => {
    if (!knobRef.current) return;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;
    knobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    if (dist > 8) {
      currentDir.current = {
        dx: (clampedX / JOYSTICK_RADIUS),
        dy: (clampedY / JOYSTICK_RADIUS),
      };
    } else {
      currentDir.current = { dx: 0, dy: 0 };
    }
  }, []);

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    currentDir.current = { dx: 0, dy: 0 };
  }, []);

  useEffect(() => {
    if (!visible) return;

    moveInterval.current = setInterval(() => {
      const { dx, dy } = currentDir.current;
      if (dx !== 0 || dy !== 0) {
        onMove(dx, dy);
      }
    }, 16);

    return () => {
      if (moveInterval.current) clearInterval(moveInterval.current);
    };
  }, [visible, onMove]);

  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    updateKnob(0, 0);
  }, [updateKnob]);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        const dx = touch.clientX - joystickCenter.current.x;
        const dy = touch.clientY - joystickCenter.current.y;
        updateKnob(dx, dy);
      }
    }
  }, [updateKnob]);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        resetKnob();
      }
    }
  }, [resetKnob]);

  const handleFireTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShoot();
    shootInterval.current = setInterval(onShoot, 150);
  }, [onShoot]);

  const handleFireTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shootInterval.current) {
      clearInterval(shootInterval.current);
      shootInterval.current = null;
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end p-4 pb-6 pointer-events-none z-50"
      style={{ touchAction: "none" }}
    >
      {/* Joystick - left side */}
      <div
        ref={joystickRef}
        className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full pointer-events-auto"
        style={{
          background: "radial-gradient(circle, rgba(147,51,234,0.3) 0%, rgba(147,51,234,0.1) 70%, transparent 100%)",
          border: "2px solid rgba(147,51,234,0.4)",
        }}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        {/* Direction indicators */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute top-2 text-purple-400/40 text-lg">&#9650;</span>
          <span className="absolute bottom-2 text-purple-400/40 text-lg">&#9660;</span>
          <span className="absolute left-2 text-purple-400/40 text-lg">&#9664;</span>
          <span className="absolute right-2 text-purple-400/40 text-lg">&#9654;</span>
        </div>
        {/* Knob */}
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 -mt-[20px] -ml-[20px] w-[40px] h-[40px] sm:-mt-[22px] sm:-ml-[22px] sm:w-[44px] sm:h-[44px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.8) 0%, rgba(147,51,234,0.6) 100%)",
            border: "2px solid rgba(255,255,255,0.5)",
            boxShadow: "0 0 15px rgba(236,72,153,0.4)",
            transition: "transform 0.05s ease-out",
          }}
        />
      </div>

      {/* Fire button - right side */}
      <div
        className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
        style={{
          background: "radial-gradient(circle, rgba(234,179,8,0.6) 0%, rgba(234,88,12,0.4) 100%)",
          border: "3px solid rgba(255,215,0,0.6)",
          boxShadow: "0 0 25px rgba(255,215,0,0.3)",
        }}
        onTouchStart={handleFireTouchStart}
        onTouchEnd={handleFireTouchEnd}
        onTouchCancel={handleFireTouchEnd}
      >
        <span className="text-3xl sm:text-4xl select-none">&#10022;</span>
      </div>
    </div>
  );
}
