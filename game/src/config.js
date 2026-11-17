// Prisma: every tuning number and colour, in one place.
export const FIELD = { width: 960, height: 720 };
export const STEP = 1 / 60;
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const PADDLE = { width: 120, height: 18, y: 636, speed: 820, wideScale: 1.7 };

export const BALL = { radius: 9, speed: 430, speedPerLevel: 30, ramp: 1.006, maxSpeed: 800, launchAngle: 1.05, minSide: 0.17, maxCount: 8 };

export const LIVES = 3;

export const BRICK = { cols: 11, height: 30, marginX: 48, marginY: 96, gapX: 6, gapY: 8, toughHits: 2 };

export const SCORE = { brick: 100, tough: 250, clear: 500, life: 2000 };

export const COMBO_MAX = 5;
export const CHARGE_FOR_LANCE = 8;

export const DROP = { chance: 0.22, lifeChance: 0.05, fall: 235, size: 32 };

export const SLOW_SCALE = 0.7;
export const SLOW_SECONDS = 8;
export const WIDE_SECONDS = 12;

export const CRYSTAL = ['#39e7ff', '#ff4fd8', '#ffc94d', '#7bff8f'];

export const PALETTE = {
  deep: '#04050c',
  sky: '#0b1026',
  grid: '#16203c',
  edge: '#3d5c94',
  paddle: '#eaf3ff',
  ball: '#ffffff',
  text: '#eef4ff',
  muted: '#8ea3c9',
  panel: '#0a1224',
  tough: '#5a6b93',
};

export const BEST_KEY = 'prisma.best';
