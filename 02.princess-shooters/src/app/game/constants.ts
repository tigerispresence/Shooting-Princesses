import { Princess, EnemyType, Difficulty } from "./types";

export const PRINCESSES: Princess[] = [
  {
    name: "Aurora",
    mount: "Unicorn",
    color: "#FF69B4",
    sparkleColor: "#FFD700",
    emoji: "👸",
    mountEmoji: "🦄",
    description: "Golden sparkles light up the sky!",
    hairColor: "#F5DEB3",
    skinColor: "#FDDCB5",
    dressColor: "#FF69B4",
    dressAccent: "#FF1493",
    crownColor: "#FFD700",
    crownGem: "#FF69B4",
    hairStyle: "long",
    mountColors: { body: "#FFFFFF", accent: "#E8D5F5", detail: "#FFD700" },
  },
  {
    name: "Luna",
    mount: "Dragon",
    color: "#9B59B6",
    sparkleColor: "#00FFFF",
    emoji: "👸",
    mountEmoji: "🐉",
    description: "Icy breath freezes all foes!",
    hairColor: "#1C1C3A",
    skinColor: "#F0D5C8",
    dressColor: "#9B59B6",
    dressAccent: "#6C3483",
    crownColor: "#C0C0C0",
    crownGem: "#00FFFF",
    hairStyle: "ponytail",
    mountColors: { body: "#4A0E8F", accent: "#7D3AC1", detail: "#00FFFF" },
  },
  {
    name: "Stella",
    mount: "Pegasus",
    color: "#3498DB",
    sparkleColor: "#FF69B4",
    emoji: "👸",
    mountEmoji: "🐴",
    description: "Swift wings dance through clouds!",
    hairColor: "#C19A6B",
    skinColor: "#F5D6C3",
    dressColor: "#3498DB",
    dressAccent: "#2176AE",
    crownColor: "#C0C0C0",
    crownGem: "#FF69B4",
    hairStyle: "braids",
    mountColors: { body: "#F0F0FF", accent: "#B8C6DB", detail: "#87CEEB" },
  },
  {
    name: "Rose",
    mount: "Phoenix",
    color: "#E74C3C",
    sparkleColor: "#FFA500",
    emoji: "👸",
    mountEmoji: "🔥",
    description: "Flames of courage burn bright!",
    hairColor: "#CC2200",
    skinColor: "#FDDCB5",
    dressColor: "#E74C3C",
    dressAccent: "#C0392B",
    crownColor: "#FFD700",
    crownGem: "#FF4500",
    hairStyle: "wavy",
    mountColors: { body: "#FF4500", accent: "#FF6B35", detail: "#FFD700" },
  },
  {
    name: "Elara",
    mount: "Swan",
    color: "#F1C40F",
    sparkleColor: "#FFFFFF",
    emoji: "👸",
    mountEmoji: "🦢",
    description: "Graceful feathers cut the wind!",
    hairColor: "#FAF0BE",
    skinColor: "#FFE4C9",
    dressColor: "#F1C40F",
    dressAccent: "#D4AC0D",
    crownColor: "#E8E8E8",
    crownGem: "#FFFFFF",
    hairStyle: "buns",
    mountColors: { body: "#FFFFFF", accent: "#F5F5DC", detail: "#FFA500" },
  },
  {
    name: "Ivy",
    mount: "Wolf",
    color: "#2ECC71",
    sparkleColor: "#98FB98",
    emoji: "👸",
    mountEmoji: "🐺",
    description: "Forest magic guides every shot!",
    hairColor: "#2D5A27",
    skinColor: "#D2B48C",
    dressColor: "#2ECC71",
    dressAccent: "#1A9850",
    crownColor: "#8B4513",
    crownGem: "#98FB98",
    hairStyle: "short",
    mountColors: { body: "#808080", accent: "#A0A0A0", detail: "#2ECC71" },
  },
  {
    name: "Coral",
    mount: "Dolphin",
    color: "#1ABC9C",
    sparkleColor: "#7DF9FF",
    emoji: "👸",
    mountEmoji: "🐬",
    description: "Ocean waves crash upon enemies!",
    hairColor: "#40E0D0",
    skinColor: "#F0D5C8",
    dressColor: "#1ABC9C",
    dressAccent: "#16A085",
    crownColor: "#FFD700",
    crownGem: "#7DF9FF",
    hairStyle: "curly",
    mountColors: { body: "#4682B4", accent: "#87CEEB", detail: "#7DF9FF" },
  },
  {
    name: "Violet",
    mount: "Butterfly",
    color: "#8E44AD",
    sparkleColor: "#DA70D6",
    emoji: "👸",
    mountEmoji: "🦋",
    description: "Enchanted dust sparkles everywhere!",
    hairColor: "#9370DB",
    skinColor: "#FDDCB5",
    dressColor: "#8E44AD",
    dressAccent: "#6C3483",
    crownColor: "#DA70D6",
    crownGem: "#FFD700",
    hairStyle: "twintail",
    mountColors: { body: "#9370DB", accent: "#DA70D6", detail: "#FFD700" },
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
export const PLAYER_WIDTH = 120;
export const PLAYER_HEIGHT = 120;
export const PLAYER_SPEED = 5;
export const PROJECTILE_SPEED = 8;
export const SPAWN_INTERVAL = 1500;
export const POWERUP_CHANCE = 0.15;

export interface DifficultyConfig {
  label: string;
  emoji: string;
  color: string;
  description: string;
  lives: number;
  maxLives: number;
  enemySpeedMult: number;
  spawnIntervalMult: number;
  waveSizeMult: number;
  bossHealthMult: number;
  bossShotIntervalMult: number;
  bossProjectileSpeedMult: number;
  powerUpChance: number;
  superChargeNeeded: number;
  invincibleMs: number;
  scoreMult: number;
  enemyTierOffset: number;
  shootCooldownMs: number;
}

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "hard"];
export const DEFAULT_DIFFICULTY: Difficulty = "normal";

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    emoji: "🌸",
    color: "#7FE3A0",
    description: "Slow foes, lots of hearts — a gentle sky ride",
    lives: 5,
    maxLives: 6,
    enemySpeedMult: 0.65,
    spawnIntervalMult: 1.5,
    waveSizeMult: 0.7,
    bossHealthMult: 0.6,
    bossShotIntervalMult: 1.8,
    bossProjectileSpeedMult: 0.65,
    powerUpChance: 0.3,
    superChargeNeeded: 6,
    invincibleMs: 3000,
    scoreMult: 0.8,
    enemyTierOffset: -1,
    shootCooldownMs: 200,
  },
  normal: {
    label: "Normal",
    emoji: "⭐",
    color: "#FFD700",
    description: "The classic fairytale battle",
    lives: 3,
    maxLives: 5,
    enemySpeedMult: 1,
    spawnIntervalMult: 1,
    waveSizeMult: 1,
    bossHealthMult: 1,
    bossShotIntervalMult: 1,
    bossProjectileSpeedMult: 1,
    powerUpChance: POWERUP_CHANCE,
    superChargeNeeded: 10,
    invincibleMs: 2000,
    scoreMult: 1,
    enemyTierOffset: 0,
    shootCooldownMs: 250,
  },
  hard: {
    label: "Hard",
    emoji: "👑",
    color: "#FF6B6B",
    description: "Fast foes, fierce bosses — for true queens!",
    lives: 3,
    maxLives: 5,
    enemySpeedMult: 1.3,
    spawnIntervalMult: 0.85,
    waveSizeMult: 1.2,
    bossHealthMult: 1.2,
    bossShotIntervalMult: 0.9,
    bossProjectileSpeedMult: 1.15,
    powerUpChance: 0.15,
    superChargeNeeded: 12,
    invincibleMs: 2000,
    scoreMult: 1.3,
    enemyTierOffset: 1,
    shootCooldownMs: 250,
  },
};
