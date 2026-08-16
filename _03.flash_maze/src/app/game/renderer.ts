import {
  BUMP_FADE_MS,
  CANVAS_H,
  CANVAS_W,
  CELEBRATE_MS,
  CELL,
  COLORS,
  CONFETTI_GRAVITY,
  PAD,
} from "./constants";
import { isCelebrating, isRevealed, playerVisual } from "./engine";
import { idx } from "./maze";
import { drawExitDoor, drawPrincess, drawStartMarker } from "./sprites";
import type { Dir, GameState, Maze } from "./types";

const cellX = (c: number) => PAD + c * CELL;
const cellY = (r: number) => PAD + r * CELL;
const centerX = (c: number) => cellX(c) + CELL / 2;
const centerY = (r: number) => cellY(r) + CELL / 2;

function wallSegment(c: number, r: number, dir: Dir) {
  const x = cellX(c);
  const y = cellY(r);
  switch (dir) {
    case "up":
      return { x1: x, y1: y, x2: x + CELL, y2: y };
    case "down":
      return { x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL };
    case "left":
      return { x1: x, y1: y, x2: x, y2: y + CELL };
    case "right":
      return { x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL };
  }
}

function strokeWall(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  dir: Dir,
  width: number,
) {
  const { x1, y1, x2, y2 } = wallSegment(c, r, dir);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  g.addColorStop(0, COLORS.bg0);
  g.addColorStop(1, COLORS.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

/** The outer box stays faintly visible always — you always know the maze is a box. */
function drawBorder(ctx: CanvasRenderingContext2D, maze: Maze, bright: boolean) {
  ctx.save();
  ctx.strokeStyle = bright ? COLORS.wall : COLORS.wallDim;
  if (bright) {
    ctx.shadowColor = COLORS.wallGlow;
    ctx.shadowBlur = 12;
  }
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.strokeRect(PAD, PAD, maze.cols * CELL, maze.rows * CELL);
  ctx.restore();
}

function drawAllWalls(ctx: CanvasRenderingContext2D, maze: Maze) {
  ctx.save();
  ctx.strokeStyle = COLORS.wall;
  ctx.shadowColor = COLORS.wallGlow;
  ctx.shadowBlur = 10;
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const { walls } = maze.cells[idx(maze, c, r)];
      // Only draw up/left per cell (plus the outer border) so shared walls
      // aren't stroked twice — double strokes read as thicker walls.
      if (walls.up) strokeWall(ctx, c, r, "up", 6);
      if (walls.left) strokeWall(ctx, c, r, "left", 6);
      if (r === maze.rows - 1 && walls.down) strokeWall(ctx, c, r, "down", 6);
      if (c === maze.cols - 1 && walls.right) strokeWall(ctx, c, r, "right", 6);
    }
  }
  ctx.restore();
}

/** In the dark, only walls the player has walked into are shown. */
function drawDiscoveredWalls(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.strokeStyle = COLORS.wallDim;
  state.discovered.forEach((key) => {
    const [c, r, dir] = key.split(",");
    strokeWall(ctx, Number(c), Number(r), dir as Dir, 5);
  });
  ctx.restore();
}

function drawBumpFlashes(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  now: number,
) {
  ctx.save();
  ctx.strokeStyle = COLORS.bump;
  ctx.shadowColor = COLORS.bump;
  ctx.shadowBlur = 16;
  state.bumpMarks.forEach((b) => {
    const age = now - b.t;
    if (age > BUMP_FADE_MS) return;
    ctx.globalAlpha = 1 - age / BUMP_FADE_MS;
    strokeWall(ctx, b.c, b.r, b.dir, 7);
  });
  ctx.restore();
}

/** Breadcrumbs: cells already stood on stay dimly lit. */
function drawTrail(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.fillStyle = COLORS.trail;
  state.visited.forEach((i) => {
    const c = i % state.maze.cols;
    const r = Math.floor(i / state.maze.cols);
    ctx.fillRect(cellX(c) + 4, cellY(r) + 4, CELL - 8, CELL - 8);
  });
  ctx.restore();
}

/**
 * The route she actually walked, drawn on the win screen. During the victory
 * lap it traces itself from start to exit, so you watch your own path replay.
 */
function drawWinPath(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  now: number,
) {
  if (state.path.length < 2) return;

  const points = state.path.map((i) => ({
    x: centerX(i % state.maze.cols),
    y: centerY(Math.floor(i / state.maze.cols)),
  }));

  // Trace over the first 70% of the celebration, then hold the full path.
  const elapsed = now - state.finishedAt;
  const reveal = Math.min(1, elapsed / (CELEBRATE_MS * 0.7));

  let total = 0;
  const segments = points.slice(1).map((p, n) => {
    const len = Math.hypot(p.x - points[n].x, p.y - points[n].y);
    total += len;
    return len;
  });
  let budget = total * reveal;

  ctx.save();
  ctx.strokeStyle = COLORS.path;
  ctx.shadowColor = COLORS.exit;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([10, 8]);
  // Crawling dashes make the trace read as motion rather than a static line.
  ctx.lineDashOffset = -elapsed / 22;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let n = 0; n < segments.length && budget > 0; n++) {
    const from = points[n];
    const to = points[n + 1];
    const f = Math.min(1, budget / segments[n]);
    ctx.lineTo(from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f);
    budget -= segments[n];
  }
  ctx.stroke();
  ctx.restore();
}

/** Confetti thrown from the exit, on a plain ballistic arc. */
function drawConfetti(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  now: number,
) {
  if (state.confetti.length === 0) return;
  const t = (now - state.finishedAt) / 1000;
  const fadeStart = (CELEBRATE_MS / 1000) * 0.75;
  const alpha = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / 0.9);
  if (alpha <= 0) return;

  ctx.save();
  state.confetti.forEach((p) => {
    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t + 0.5 * CONFETTI_GRAVITY * t * t;
    if (y > CANVAS_H + p.size) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(p.rot + p.vrot * t);
    ctx.fillStyle = p.color;
    if (p.round) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Squash on the spin axis so the strips look like tumbling paper.
      ctx.fillRect(
        -p.size * 0.5,
        -p.size * 0.28,
        p.size,
        p.size * 0.56 * Math.abs(Math.cos(p.vrot * t)),
      );
    }
    ctx.restore();
  });
  ctx.restore();
}

/** Rings of light punching outward from the door. */
function drawBurstRings(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  now: number,
) {
  const t = (now - state.finishedAt) / 1000;
  const ox = centerX(state.exit.c);
  const oy = centerY(state.exit.r);

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.exit;
  ctx.shadowColor = COLORS.exit;
  ctx.shadowBlur = 14;
  [0, 0.16, 0.32].forEach((delay) => {
    const age = t - delay;
    if (age < 0 || age > 0.7) return;
    const p = age / 0.7;
    // Ease out so the ring leaps away from the door then slows.
    const eased = 1 - (1 - p) * (1 - p);
    ctx.globalAlpha = (1 - p) * 0.6;
    ctx.lineWidth = 6 * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(ox, oy, eased * CELL * 2.2, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  now: number,
): void {
  const revealed = isRevealed(state, now);

  drawBackground(ctx);

  if (state.phase !== "ready") {
    drawTrail(ctx, state);
  }

  if (revealed) {
    drawAllWalls(ctx, state.maze);
  } else {
    drawBorder(ctx, state.maze, false);
    drawDiscoveredWalls(ctx, state);
  }

  drawBumpFlashes(ctx, state, now);

  if (state.phase === "won") {
    drawWinPath(ctx, state, now);
    drawBurstRings(ctx, state, now);
  }

  if (revealed) {
    drawStartMarker(ctx, centerX(state.start.c), centerY(state.start.r), CELL);
  }

  drawExitDoor(
    ctx,
    centerX(state.exit.c),
    centerY(state.exit.r),
    CELL,
    now,
    revealed,
  );

  if (state.phase !== "ready") {
    // Float cell coords → pixels, so she walks between cells rather than
    // jumping a whole cell per keypress.
    const at = playerVisual(state, now);
    drawPrincess(
      ctx,
      PAD + (at.x + 0.5) * CELL,
      PAD + (at.y + 0.5) * CELL,
      CELL * 0.74,
      now,
      {
        facing: state.facing,
        walking: at.walking,
        progress: at.progress,
        stepParity: state.stepParity,
        cheering: isCelebrating(state, now),
      },
    );
  }

  // Confetti falls in front of everything, including her.
  if (state.phase === "won") {
    drawConfetti(ctx, state, now);
  }
}
