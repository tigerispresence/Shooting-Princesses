# 03.games

Web games built for two 10-year-old girls. One directory per game, one git repo at this root.

## Games

| Directory | Status |
|---|---|
| `01.princess_maker` | empty — not started |
| `02.princess-shooters` | live; Next.js 16; princesses riding fairytale mounts, wave shooter with 3-stage boss |
| `_03.flash_maze` | live; Next.js 16; memorize a maze in 5 seconds, then escape in the dark |
| `04.escape_room` | live; Next.js 16; top-down escape room, 5 puzzle rooms per stage (stage 1 「달빛 성」 done) |

Git: repo root is `~/Projects/03.games`, remote `origin`, branch `main`. Each game deploys separately to Vercel from its own directory.

## Audience

10-year-old girls. Everything is written for them:

- Age-appropriate always — villains are comical or misguided, never genuinely menacing
- Nothing scary, dark, or suggestive
- Stories end on a positive, empowering note
- Playable without a tutorial; understandable by looking at the screen

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Rendering**: HTML5 Canvas for gameplay, React components for menus and UI
- **State**: refs-based game state — never React state inside the game loop (performance)
- **Deploy**: GitHub → Vercel

### Next.js 16 caveat

This Next.js version has breaking changes from what's in training data — APIs, conventions, and file structure may all differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.

## Conventional Layout

Game code sits under `src/app/game/`:

- `types.ts` — TypeScript interfaces
- `constants.ts` — character data, enemy config, canvas dimensions, game settings
- `engine.ts` — game logic (state updates, collisions, spawning)
- `renderer.ts` — canvas drawing (background, HUD, enemies, particles, effects)
- `sprites.ts` — canvas-drawn character sprites
- `audio.ts` — Web Audio BGM and SFX
- `GameCanvas.tsx` — main game component (game loop, input handling)
- `TouchControls.tsx` — mobile touch controls

Follow this layout in new games. In existing ones, read what is actually there first — not every game matches.

## Hard Rules

- **No external assets.** All art is drawn with the Canvas 2D API; all sound is generated with the Web Audio API. No image, font, or audio files.
- **Read `constants.ts` for dimensions.** Canvas and sprite sizes vary per game — never assume.
- **Both input methods work.** Keyboard and mouse on desktop, touch on phone. Every action must be reachable on both.
- **Verify iPhone portrait.** Buttons have been unreachable in portrait before. Check 390x844 specifically.
- **iOS audio.** AudioContext starts suspended and must be resumed from inside a real user gesture (native `touchend`/`click`). This has broken twice.
- **Run `npx next build`** after changes to catch TypeScript errors.

## Subagents

Defined in `.claude/agents/`. Rough flow:

`game-designer` (spec) → `game-builder` (implementation) → `graphic-designer` / `musician` / `story-builder` (content) → `playtester` (bugs) → `audience` (is it fun?)

`playtester` finds bugs; `audience` judges fun. They are not the same check.
