import type { Cell, Dir, Maze } from "./types";

export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const DELTA: Record<Dir, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export function idx(maze: Maze, c: number, r: number): number {
  return r * maze.cols + c;
}

export function inBounds(maze: Maze, c: number, r: number): boolean {
  return c >= 0 && c < maze.cols && r >= 0 && r < maze.rows;
}

/**
 * Recursive-backtracker generation. Produces a "perfect" maze — exactly one
 * path between any two cells, so it is always solvable and never has loops
 * that would make guessing pay off.
 */
export function generateMaze(cols: number, rows: number): Maze {
  const cells: Cell[] = Array.from({ length: cols * rows }, () => ({
    walls: { up: true, down: true, left: true, right: true },
  }));
  const maze: Maze = { cols, rows, cells };

  const seen = new Uint8Array(cols * rows);
  const stack: number[] = [0];
  seen[0] = 1;

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const c = cur % cols;
    const r = Math.floor(cur / cols);

    const options: { next: number; dir: Dir }[] = [];
    (Object.keys(DELTA) as Dir[]).forEach((dir) => {
      const nc = c + DELTA[dir].dc;
      const nr = r + DELTA[dir].dr;
      if (!inBounds(maze, nc, nr)) return;
      const next = nr * cols + nc;
      if (!seen[next]) options.push({ next, dir });
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const pick = options[Math.floor(Math.random() * options.length)];
    cells[cur].walls[pick.dir] = false;
    cells[pick.next].walls[OPPOSITE[pick.dir]] = false;
    seen[pick.next] = 1;
    stack.push(pick.next);
  }

  return maze;
}

/** True if the player can step from (c,r) in `dir` without hitting a wall. */
export function canMove(maze: Maze, c: number, r: number, dir: Dir): boolean {
  if (maze.cells[idx(maze, c, r)].walls[dir]) return false;
  const nc = c + DELTA[dir].dc;
  const nr = r + DELTA[dir].dr;
  return inBounds(maze, nc, nr);
}
