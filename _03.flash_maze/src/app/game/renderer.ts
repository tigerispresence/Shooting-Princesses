import {
  BUMP_FADE_MS,
  CANVAS_H,
  CANVAS_W,
  CELL,
  COLORS,
  PAD,
} from "./constants";
import { isRevealed } from "./engine";
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

function drawWinPath(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  state.path.forEach((i, n) => {
    const c = i % state.maze.cols;
    const r = Math.floor(i / state.maze.cols);
    const x = centerX(c);
    const y = centerY(r);
    if (n === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
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
    drawWinPath(ctx, state);
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
    drawPrincess(
      ctx,
      centerX(state.player.c),
      centerY(state.player.r),
      CELL * 0.62,
      now,
    );
  }
}
