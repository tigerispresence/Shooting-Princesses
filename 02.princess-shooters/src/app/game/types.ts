export interface Princess {
  name: string;
  mount: string;
  color: string;
  sparkleColor: string;
  emoji: string;
  mountEmoji: string;
  description: string;
  hairColor: string;
  skinColor: string;
  dressColor: string;
  dressAccent: string;
  crownColor: string;
  crownGem: string;
  hairStyle: "long" | "ponytail" | "buns" | "short" | "braids" | "wavy" | "curly" | "twintail";
  mountColors: { body: string; accent: string; detail: string };
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  princess: Princess;
  lives: number;
  invincibleUntil: number;
  shieldActive: boolean;
  shieldUntil: number;
  fireAnim: number;
}

export interface Projectile {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  type: EnemyType;
  sinOffset: number;
  sinSpeed: number;
  baseY: number;
}

export type EnemyType = "goblin" | "bat" | "troll" | "darkFairy" | "dragon";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: "heart" | "shield" | "rapidFire" | "tripleShot";
  speed: number;
  bobOffset: number;
}

export interface GameState {
  player: Player;
  projectiles: Projectile[];
  enemies: Enemy[];
  particles: Particle[];
  stars: Star[];
  powerUps: PowerUp[];
  score: number;
  wave: number;
  enemiesInWave: number;
  enemiesSpawned: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  rapidFireUntil: number;
  tripleShotUntil: number;
  highScore: number;
  waveTransition: boolean;
  waveTransitionTimer: number;
}
