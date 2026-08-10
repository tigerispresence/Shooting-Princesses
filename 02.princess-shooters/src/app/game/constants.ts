import { Princess, EnemyType } from "./types";

export const PRINCESSES: Princess[] = [
  {
    name: "Aurora",
    mount: "Unicorn",
    color: "#FF69B4",
    sparkleColor: "#FFD700",
    emoji: "👸",
    mountEmoji: "🦄",
    description: "Golden sparkles light up the sky!",
  },
  {
    name: "Luna",
    mount: "Dragon",
    color: "#9B59B6",
    sparkleColor: "#00FFFF",
    emoji: "👸",
    mountEmoji: "🐉",
    description: "Icy breath freezes all foes!",
  },
  {
    name: "Stella",
    mount: "Pegasus",
    color: "#3498DB",
    sparkleColor: "#FF69B4",
    emoji: "👸",
    mountEmoji: "🐴",
    description: "Swift wings dance through clouds!",
  },
  {
    name: "Rose",
    mount: "Phoenix",
    color: "#E74C3C",
    sparkleColor: "#FFA500",
    emoji: "👸",
    mountEmoji: "🔥",
    description: "Flames of courage burn bright!",
  },
  {
    name: "Elara",
    mount: "Swan",
    color: "#F1C40F",
    sparkleColor: "#FFFFFF",
    emoji: "👸",
    mountEmoji: "🦢",
    description: "Graceful feathers cut the wind!",
  },
  {
    name: "Ivy",
    mount: "Wolf",
    color: "#2ECC71",
    sparkleColor: "#98FB98",
    emoji: "👸",
    mountEmoji: "🐺",
    description: "Forest magic guides every shot!",
  },
  {
    name: "Coral",
    mount: "Dolphin",
    color: "#1ABC9C",
    sparkleColor: "#7DF9FF",
    emoji: "👸",
    mountEmoji: "🐬",
    description: "Ocean waves crash upon enemies!",
  },
  {
    name: "Violet",
    mount: "Butterfly",
    color: "#8E44AD",
    sparkleColor: "#DA70D6",
    emoji: "👸",
    mountEmoji: "🦋",
    description: "Enchanted dust sparkles everywhere!",
  },
];

export const ENEMY_CONFIG: Record<
  EnemyType,
  { emoji: string; health: number; speed: number; size: number; points: number }
> = {
  goblin: { emoji: "👺", health: 1, speed: 2, size: 35, points: 10 },
  bat: { emoji: "🦇", health: 1, speed: 3, size: 30, points: 15 },
  troll: { emoji: "👹", health: 3, speed: 1, size: 45, points: 25 },
  darkFairy: { emoji: "🧚", health: 2, speed: 2.5, size: 35, points: 20 },
  dragon: { emoji: "🐲", health: 5, speed: 1.5, size: 55, points: 50 },
};

export const WAVE_ENEMIES: EnemyType[][] = [
  ["goblin", "goblin", "goblin", "bat", "bat"],
  ["goblin", "goblin", "bat", "bat", "bat", "darkFairy"],
  ["goblin", "bat", "bat", "darkFairy", "darkFairy", "troll"],
  ["bat", "bat", "darkFairy", "darkFairy", "troll", "troll"],
  ["darkFairy", "darkFairy", "troll", "troll", "dragon"],
  ["bat", "bat", "darkFairy", "troll", "troll", "dragon", "dragon"],
];

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SPEED = 5;
export const PROJECTILE_SPEED = 8;
export const SPAWN_INTERVAL = 1500;
export const POWERUP_CHANCE = 0.15;
