import {
  GameState,
  Player,
  Projectile,
  Enemy,
  Particle,
  Star,
  PowerUp,
  EnemyType,
  Boss,
  EnemyProjectile,
} from "./types";
import {
  PRINCESSES,
  ENEMY_CONFIG,
  WAVE_ENEMIES,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PROJECTILE_SPEED,
  POWERUP_CHANCE,
} from "./constants";
import { playSFX } from "./audio";

export function createInitialState(): GameState {
  const princess = PRINCESSES[Math.floor(Math.random() * PRINCESSES.length)];
  return {
    player: {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: PLAYER_SPEED,
      princess,
      lives: 3,
      invincibleUntil: 0,
      shieldActive: false,
      shieldUntil: 0,
      fireAnim: 0,
    },
    projectiles: [],
    enemies: [],
    particles: [],
    stars: createStars(),
    powerUps: [],
    score: 0,
    wave: 1,
    enemiesInWave: 5,
    enemiesSpawned: 0,
    gameOver: false,
    paused: false,
    started: false,
    rapidFireUntil: 0,
    tripleShotUntil: 0,
    highScore: loadHighScore(),
    waveTransition: false,
    waveTransitionTimer: 0,
    startedAt: Date.now(),
    superCharge: 0,
    superReady: false,
    superActive: false,
    superActiveUntil: 0,
    superAnimFrame: 0,
    stage: 1,
    boss: null,
    bossActive: false,
    enemyProjectiles: [],
    stageClearing: false,
    stageClearTimer: 0,
    victory: false,
  };
}

function createStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("princessShooterHighScore") || "0", 10);
}

function saveHighScore(score: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem("princessShooterHighScore", score.toString());
}

export function shoot(state: GameState): Projectile[] {
  const { player } = state;
  player.fireAnim = 10;
  const newProjectiles: Projectile[] = [];

  const createProjectile = (offsetY: number, angleOffset: number) => ({
    x: player.x + player.width / 2,
    y: player.y + offsetY,
    speed: PROJECTILE_SPEED,
    size: 5,
    color: player.princess.sparkleColor,
    trail: [] as { x: number; y: number }[],
    angle: angleOffset,
  });

  if (state.tripleShotUntil > Date.now()) {
    newProjectiles.push(
      createProjectile(0, 0),
      createProjectile(-15, -0.15),
      createProjectile(15, 0.15)
    );
  } else {
    newProjectiles.push(createProjectile(0, 0));
  }

  return newProjectiles;
}

export function spawnEnemy(state: GameState): Enemy | null {
  if (state.waveTransition) return null;

  const waveIndex = Math.min(state.wave - 1, WAVE_ENEMIES.length - 1);
  const possibleTypes = WAVE_ENEMIES[waveIndex];
  const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
  const config = ENEMY_CONFIG[type];

  return {
    x: CANVAS_WIDTH + config.size,
    y: 50 + Math.random() * (CANVAS_HEIGHT - 100),
    width: config.size,
    height: config.size,
    speed: config.speed + (state.wave - 1) * 0.2,
    health: config.health,
    maxHealth: config.health,
    type,
    sinOffset: Math.random() * Math.PI * 2,
    sinSpeed: 0.02 + Math.random() * 0.03,
    baseY: 0,
  };
}

export function createExplosionParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  const count = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  return particles;
}

export function spawnPowerUp(x: number, y: number): PowerUp | null {
  if (Math.random() > POWERUP_CHANCE) return null;
  const types: PowerUp["type"][] = ["heart", "shield", "rapidFire", "tripleShot"];
  return {
    x,
    y,
    type: types[Math.floor(Math.random() * types.length)],
    speed: 1.5,
    bobOffset: Math.random() * Math.PI * 2,
  };
}

export function activateSuper(state: GameState): Particle[] {
  if (!state.superReady || state.superActive) return [];
  state.superReady = false;
  state.superActive = true;
  state.superActiveUntil = Date.now() + 4000;
  state.superCharge = 0;
  state.superAnimFrame = 0;

  const particles: Particle[] = [];
  const { player } = state;
  const color = player.princess.sparkleColor;

  for (const enemy of state.enemies) {
    enemy.health -= 5;
    particles.push(...createExplosionParticles(enemy.x, enemy.y, color));
  }
  state.enemies = state.enemies.filter((e) => e.health > 0);

  if (state.boss && state.bossActive) {
    state.boss.health -= 8;
    particles.push(...createExplosionParticles(state.boss.x, state.boss.y, color));
  }

  const deadCount = particles.length / 15;
  state.score += Math.floor(deadCount) * 50 * state.wave;

  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40;
    const speed = 3 + Math.random() * 4;
    particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60 + Math.random() * 30,
      maxLife: 90,
      color,
      size: 3 + Math.random() * 4,
    });
  }

  return particles;
}

const WAVES_PER_STAGE = 2;
const TOTAL_STAGES = 3;

const BOSS_CONFIG = [
  { health: 30, size: 140, speed: 1.5, shotInterval: 1200, color: "#5B8C3E" },
  { health: 50, size: 130, speed: 1.8, shotInterval: 900, color: "#4B0082" },
  { health: 80, size: 150, speed: 2.0, shotInterval: 700, color: "#8B0000" },
];

export function getStageForWave(wave: number): number {
  return Math.min(Math.ceil(wave / WAVES_PER_STAGE), TOTAL_STAGES);
}

export function isBossWave(wave: number): boolean {
  return wave % WAVES_PER_STAGE === 0 && getStageForWave(wave) <= TOTAL_STAGES;
}

export function spawnBoss(state: GameState): Boss {
  const stageIndex = state.stage - 1;
  const config = BOSS_CONFIG[Math.min(stageIndex, BOSS_CONFIG.length - 1)];
  return {
    x: CANVAS_WIDTH + config.size,
    y: CANVAS_HEIGHT / 2,
    width: config.size,
    height: config.size,
    health: config.health,
    maxHealth: config.health,
    stageIndex,
    lastShot: 0,
    phase: 0,
    enterAnim: 0,
  };
}

function updateBoss(state: GameState, dt: number): void {
  const boss = state.boss;
  if (!boss) return;

  const stageIndex = boss.stageIndex;
  const config = BOSS_CONFIG[Math.min(stageIndex, BOSS_CONFIG.length - 1)];

  // Enter animation: slide in from right
  if (boss.enterAnim < 60) {
    boss.enterAnim += dt;
    const t = Math.min(1, boss.enterAnim / 60);
    boss.x = CANVAS_WIDTH + config.size - t * (config.size + CANVAS_WIDTH * 0.3);
    return;
  }

  // Movement: hover on right side with sine pattern
  const targetX = CANVAS_WIDTH * 0.75;
  boss.x += (targetX - boss.x) * 0.02 * dt;
  boss.y += Math.sin(Date.now() * 0.002) * config.speed * dt;
  boss.y = Math.max(boss.height / 2 + 50, Math.min(CANVAS_HEIGHT - boss.height / 2, boss.y));

  // Rage phase when low health
  boss.phase = boss.health < boss.maxHealth * 0.5 ? 1 : 0;

  // Shoot projectiles at player
  const now = Date.now();
  const interval = boss.phase === 1 ? config.shotInterval * 0.6 : config.shotInterval;
  if (now - boss.lastShot > interval) {
    boss.lastShot = now;
    const { player } = state;
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 4 + stageIndex;

    state.enemyProjectiles.push({
      x: boss.x - boss.width / 3,
      y: boss.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      size: 6,
      color: config.color,
    });

    // Rage mode: extra spread shots
    if (boss.phase === 1) {
      const spread = 0.3;
      state.enemyProjectiles.push({
        x: boss.x - boss.width / 3,
        y: boss.y - 20,
        vx: (dx / dist) * speed * Math.cos(spread) - (dy / dist) * speed * Math.sin(spread),
        vy: (dx / dist) * speed * Math.sin(spread) + (dy / dist) * speed * Math.cos(spread),
        size: 5,
        color: config.color,
      });
      state.enemyProjectiles.push({
        x: boss.x - boss.width / 3,
        y: boss.y + 20,
        vx: (dx / dist) * speed * Math.cos(-spread) - (dy / dist) * speed * Math.sin(-spread),
        vy: (dx / dist) * speed * Math.sin(-spread) + (dy / dist) * speed * Math.cos(-spread),
        size: 5,
        color: config.color,
      });
    }
  }
}

export function applyPowerUp(state: GameState, powerUp: PowerUp) {
  playSFX("powerUp");
  switch (powerUp.type) {
    case "heart":
      state.player.lives = Math.min(state.player.lives + 1, 5);
      break;
    case "shield":
      state.player.shieldActive = true;
      state.player.shieldUntil = Date.now() + 8000;
      playSFX("shieldActivate");
      break;
    case "rapidFire":
      state.rapidFireUntil = Date.now() + 6000;
      break;
    case "tripleShot":
      state.tripleShotUntil = Date.now() + 8000;
      break;
  }
}

function checkCollision(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    ay - ah / 2 < by + bh / 2 &&
    ay + ah / 2 > by - bh / 2
  );
}

export function updateGameState(
  state: GameState,
  keys: Set<string>,
  deltaTime: number
): GameState {
  if (!state.started || state.gameOver || state.paused) return state;

  const { player } = state;
  const dt = deltaTime / 16;

  // Player movement
  if (keys.has("ArrowUp") || keys.has("w")) {
    player.y = Math.max(player.height / 2 + 45, player.y - player.speed * dt);
  }
  if (keys.has("ArrowDown") || keys.has("s")) {
    player.y = Math.min(CANVAS_HEIGHT - player.height / 2, player.y + player.speed * dt);
  }
  if (keys.has("ArrowLeft") || keys.has("a")) {
    player.x = Math.max(player.width / 2, player.x - player.speed * dt);
  }
  if (keys.has("ArrowRight") || keys.has("d")) {
    player.x = Math.min(CANVAS_WIDTH / 2, player.x + player.speed * dt);
  }

  // Fire animation decay
  if (player.fireAnim > 0) {
    player.fireAnim = Math.max(0, player.fireAnim - dt);
  }

  // Shield expiry
  if (player.shieldActive && player.shieldUntil < Date.now()) {
    player.shieldActive = false;
  }

  // Super attack expiry & animation frame
  if (state.superActive) {
    state.superAnimFrame++;
    if (state.superActiveUntil < Date.now()) {
      state.superActive = false;
      state.superAnimFrame = 0;
    }
  }

  // Update stars
  for (const star of state.stars) {
    star.x -= star.speed * dt;
    if (star.x < 0) {
      star.x = CANVAS_WIDTH;
      star.y = Math.random() * CANVAS_HEIGHT;
    }
  }

  // Update projectiles
  for (const proj of state.projectiles) {
    proj.trail.push({ x: proj.x, y: proj.y });
    if (proj.trail.length > 6) proj.trail.shift();
    proj.x += proj.speed * dt;
    const angle = (proj as unknown as { angle?: number }).angle || 0;
    proj.y += Math.sin(angle) * proj.speed * dt;
  }
  state.projectiles = state.projectiles.filter((p) => p.x < CANVAS_WIDTH + 20);

  // Update enemies
  for (const enemy of state.enemies) {
    enemy.x -= enemy.speed * dt;
    enemy.y += Math.sin(enemy.sinOffset) * enemy.sinSpeed * 30 * dt;
    enemy.sinOffset += enemy.sinSpeed;
    enemy.y = Math.max(50, Math.min(CANVAS_HEIGHT - 50, enemy.y));
  }
  state.enemies = state.enemies.filter((e) => e.x > -e.width);

  // Update power-ups
  for (const p of state.powerUps) {
    p.x -= p.speed * dt;
  }
  state.powerUps = state.powerUps.filter((p) => p.x > -30);

  // Update particles
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  // Projectile-enemy collisions
  const newParticles: Particle[] = [];
  const newPowerUps: PowerUp[] = [];

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      if (checkCollision(proj.x, proj.y, proj.size * 2, proj.size * 2, enemy.x, enemy.y, enemy.width * 0.7, enemy.height * 0.7)) {
        state.projectiles.splice(i, 1);
        enemy.health--;
        newParticles.push(...createExplosionParticles(proj.x, proj.y, proj.color));
        playSFX("enemyHit");

        if (enemy.health <= 0) {
          const config = ENEMY_CONFIG[enemy.type];
          state.score += config.points * state.wave;
          newParticles.push(...createExplosionParticles(enemy.x, enemy.y, "#FFD700"));
          playSFX("enemyDefeat");
          state.superCharge++;
          if (state.superCharge >= 10 && !state.superReady && !state.superActive) {
            state.superReady = true;
            playSFX("superReady");
          }
          const pu = spawnPowerUp(enemy.x, enemy.y);
          if (pu) newPowerUps.push(pu);
          state.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  state.particles.push(...newParticles);
  state.powerUps.push(...newPowerUps);

  // Player-enemy collision
  if (player.invincibleUntil < Date.now()) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (checkCollision(player.x, player.y, player.width * 0.5, player.height * 0.5, enemy.x, enemy.y, enemy.width * 0.5, enemy.height * 0.5)) {
        if (player.shieldActive) {
          state.particles.push(...createExplosionParticles(enemy.x, enemy.y, "#00FFFF"));
          state.enemies.splice(i, 1);
          state.score += 5;
          playSFX("enemyDefeat");
        } else {
          player.lives--;
          player.invincibleUntil = Date.now() + 2000;
          state.particles.push(...createExplosionParticles(player.x, player.y, "#FF6B6B"));
          state.enemies.splice(i, 1);
          playSFX("playerHit");

          if (player.lives <= 0) {
            state.gameOver = true;
            if (state.score > state.highScore) {
              state.highScore = state.score;
              saveHighScore(state.score);
            }
          }
        }
        break;
      }
    }
  }

  // Player-powerup collision
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const pu = state.powerUps[i];
    if (checkCollision(player.x, player.y, player.width * 0.7, player.height * 0.7, pu.x, pu.y, 28, 28)) {
      applyPowerUp(state, pu);
      state.particles.push(...createExplosionParticles(pu.x, pu.y, "#FFD700"));
      state.powerUps.splice(i, 1);
    }
  }

  // Update boss
  if (state.bossActive && state.boss) {
    updateBoss(state, dt);
  }

  // Update enemy projectiles
  for (const ep of state.enemyProjectiles) {
    ep.x += ep.vx * dt;
    ep.y += ep.vy * dt;
  }
  state.enemyProjectiles = state.enemyProjectiles.filter(
    (ep) => ep.x > -20 && ep.x < CANVAS_WIDTH + 20 && ep.y > -20 && ep.y < CANVAS_HEIGHT + 20
  );

  // Enemy projectile-player collision
  if (player.invincibleUntil < Date.now()) {
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = state.enemyProjectiles[i];
      if (checkCollision(player.x, player.y, player.width * 0.4, player.height * 0.4, ep.x, ep.y, ep.size * 2, ep.size * 2)) {
        state.enemyProjectiles.splice(i, 1);
        if (player.shieldActive) {
          state.particles.push(...createExplosionParticles(ep.x, ep.y, "#00FFFF"));
        } else {
          player.lives--;
          player.invincibleUntil = Date.now() + 2000;
          state.particles.push(...createExplosionParticles(player.x, player.y, "#FF6B6B"));
          playSFX("playerHit");
          if (player.lives <= 0) {
            state.gameOver = true;
            if (state.score > state.highScore) {
              state.highScore = state.score;
              saveHighScore(state.score);
            }
          }
        }
        break;
      }
    }
  }

  // Projectile-boss collision
  if (state.bossActive && state.boss) {
    const boss = state.boss;
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      if (checkCollision(proj.x, proj.y, proj.size * 2, proj.size * 2, boss.x, boss.y, boss.width * 0.8, boss.height * 0.8)) {
        state.projectiles.splice(i, 1);
        boss.health--;
        state.particles.push(...createExplosionParticles(proj.x, proj.y, proj.color));
        playSFX("enemyHit");

        if (boss.health <= 0) {
          state.score += 500 * state.stage;
          state.particles.push(...createExplosionParticles(boss.x, boss.y, "#FFD700"));
          state.particles.push(...createExplosionParticles(boss.x - 30, boss.y - 20, "#FF69B4"));
          state.particles.push(...createExplosionParticles(boss.x + 30, boss.y + 20, "#9B59B6"));
          playSFX("enemyDefeat");
          state.bossActive = false;
          state.boss = null;
          state.enemyProjectiles = [];

          if (state.stage >= TOTAL_STAGES) {
            state.victory = true;
            state.stageClearing = true;
            state.stageClearTimer = 4000;
          } else {
            state.stageClearing = true;
            state.stageClearTimer = 3000;
          }
          break;
        }
      }
    }
  }

  // Stage clearing transition
  if (state.stageClearing) {
    state.stageClearTimer -= deltaTime;
    if (state.stageClearTimer <= 0) {
      state.stageClearing = false;
      if (state.victory) {
        state.gameOver = true;
        if (state.score > state.highScore) {
          state.highScore = state.score;
          saveHighScore(state.score);
        }
      } else {
        state.stage++;
        state.wave++;
        state.enemiesInWave = 5 + state.wave * 2;
        state.enemiesSpawned = 0;
        state.waveTransition = true;
        state.waveTransitionTimer = 2000;
        playSFX("waveComplete");
      }
    }
    return state;
  }

  // Wave transition
  if (state.waveTransition) {
    state.waveTransitionTimer -= deltaTime;
    if (state.waveTransitionTimer <= 0) {
      state.waveTransition = false;
    }
    return state;
  }

  // Check wave completion
  if (state.enemies.length === 0 && state.enemiesSpawned >= state.enemiesInWave && !state.bossActive) {
    if (isBossWave(state.wave)) {
      state.boss = spawnBoss(state);
      state.bossActive = true;
      playSFX("waveComplete");
    } else {
      state.wave++;
      state.enemiesInWave = 5 + state.wave * 2;
      state.enemiesSpawned = 0;
      state.waveTransition = true;
      state.waveTransitionTimer = 2000;
      playSFX("waveComplete");
    }
  }

  return state;
}
