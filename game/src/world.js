// Prisma: the rules. step() advances one fixed step and returns what happened as flags.
import { BALL, BRICK, CHARGE_FOR_LANCE, COMBO_MAX, CRYSTAL, DROP, FIELD, LIVES, PADDLE, SCORE, SLOW_SCALE, SLOW_SECONDS, WIDE_SECONDS } from './config.js';
import { LEVELS } from './levels.js';

export const EV_PADDLE = 1;
export const EV_BRICK = 2;
export const EV_TOUGH = 4;
export const EV_LANCE = 8;
export const EV_POWER = 16;
export const EV_HIT = 32;
export const EV_CLEAR = 64;
export const EV_OVER = 128;
export const EV_WALL = 256;

export const POWER_WIDE = 0;
export const POWER_MULTI = 1;
export const POWER_SLOW = 2;
export const POWER_LIFE = 3;

export const STATUS_READY = 'ready';
export const STATUS_LIVE = 'live';
export const STATUS_CLEAR = 'clear';
export const STATUS_OVER = 'over';

export const LEVEL_LAST = LEVELS.length;

const TRAIL = 6;
const SPARK_MAX = 360;

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createWorld(random) {
  const cols = BRICK.cols;
  const brickWidth = Math.floor((FIELD.width - BRICK.marginX * 2 - (cols - 1) * BRICK.gapX) / cols);
  const originX = (FIELD.width - (cols * brickWidth + (cols - 1) * BRICK.gapX)) / 2;

  const paddle = { x: 0, y: PADDLE.y, w: PADDLE.width, h: PADDLE.height };
  const balls = [];
  const bricks = [];
  const drops = [];
  const sparks = [];
  const state = {
    status: STATUS_READY, score: 0, lives: LIVES, level: 1, combo: 1, charge: 0,
    slow: 0, wide: 0, shake: 0, beam: 0, beamX: 0, left: 0, peak: 0, time: 0,
  };

  function createBall() {
    const ball = { x: paddle.x + paddle.w / 2, y: paddle.y - BALL.radius - 1, vx: 0, vy: 0, r: BALL.radius, stuck: true, alive: true, trail: [] };
    for (let index = 0; index < TRAIL; index += 1) ball.trail.push({ x: ball.x, y: ball.y });
    balls.push(ball);
    return ball;
  }

  function baseSpeed() {
    return BALL.speed + BALL.speedPerLevel * (state.level - 1);
  }

  function loadLevel(level) {
    state.level = level;
    state.status = STATUS_READY;
    state.combo = 1;
    state.charge = 0;
    state.slow = 0;
    state.wide = 0;
    state.beam = 0;
    state.shake = 0;
    balls.length = 0;
    drops.length = 0;
    sparks.length = 0;
    bricks.length = 0;
    const rows = LEVELS[level - 1];
    for (let row = 0; row < rows.length; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const glyph = rows[row][col];
        if (glyph === undefined || glyph === '.') continue;
        const tough = glyph === '#';
        bricks.push({
          x: originX + col * (brickWidth + BRICK.gapX),
          y: BRICK.marginY + row * (BRICK.height + BRICK.gapY),
          w: brickWidth, h: BRICK.height, tough, hue: tough ? -1 : Number(glyph) - 1,
          hits: tough ? BRICK.toughHits : 1, alive: true, flash: 0,
        });
      }
    }
    state.left = bricks.length;
    paddle.w = PADDLE.width;
    paddle.x = (FIELD.width - paddle.w) / 2;
    createBall();
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.peak = 0;
    state.time = 0;
    loadLevel(1);
  }

  function burst(x, y, hue, count) {
    const color = hue < 0 ? '#c3d4ff' : CRYSTAL[hue];
    for (let index = 0; index < count && sparks.length < SPARK_MAX; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 70 + random() * 300;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, life: 0.3 + random() * 0.4, full: 0.7, color, size: 2 + random() * 3 });
    }
  }

  function spawnDrop(x, y, roll) {
    const kind = roll < DROP.lifeChance ? POWER_LIFE : Math.floor((roll - DROP.lifeChance) / (1 - DROP.lifeChance) * 3);
    drops.push({ x: x - DROP.size / 2, y, w: DROP.size, h: DROP.size, kind, rot: 0 });
  }

  function breakBrick(brick, giveDrop) {
    brick.alive = false;
    state.left -= 1;
    state.score += (brick.tough ? SCORE.tough : SCORE.brick) * state.combo;
    state.combo = Math.min(COMBO_MAX, state.combo + 1);
    state.charge = Math.min(CHARGE_FOR_LANCE, state.charge + 1);
    burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.hue, brick.tough ? 12 : 8);
    if (giveDrop && random() < DROP.chance) spawnDrop(brick.x + brick.w / 2, brick.y + brick.h / 2, random());
    if (state.left <= 0) state.status = STATUS_CLEAR;
  }

  function hitBrick(brick, ball) {
    if (brick.hits > 1) {
      brick.hits -= 1;
      brick.flash = 0.14;
      burst(ball.x, ball.y, -1, 4);
      return EV_TOUGH;
    }
    breakBrick(brick, true);
    return EV_BRICK;
  }

  function launch() {
    let launched = false;
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball.stuck) continue;
      const offset = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
      const angle = offset * BALL.launchAngle;
      const speed = baseSpeed();
      ball.stuck = false;
      ball.vx = speed * Math.sin(angle);
      ball.vy = -Math.abs(speed * Math.cos(angle));
      launched = true;
    }
    if (launched) state.status = STATUS_LIVE;
    return launched;
  }

  function fireLance() {
    if (state.charge < CHARGE_FOR_LANCE) return false;
    state.charge -= CHARGE_FOR_LANCE;
    state.beam = 0.3;
    state.beamX = paddle.x + paddle.w / 2;
    const low = state.beamX - 11;
    const high = state.beamX + 11;
    for (let index = 0; index < bricks.length; index += 1) {
      const brick = bricks[index];
      if (brick.alive && brick.x + brick.w > low && brick.x < high) breakBrick(brick, true);
    }
    burst(state.beamX, paddle.y - 220, 0, 16);
    return true;
  }

  function applyPower(kind) {
    if (kind === POWER_LIFE) state.lives += 1;
    else if (kind === POWER_WIDE) state.wide = WIDE_SECONDS;
    else if (kind === POWER_SLOW) state.slow = SLOW_SECONDS;
    else {
      const room = Math.min(6, BALL.maxCount - balls.length);
      const twins = [];
      for (let index = 0; index < balls.length && twins.length < room; index += 1) {
        const ball = balls[index];
        if (ball.stuck) continue;
        for (let side = -1; side <= 1 && twins.length < room; side += 2) {
          const angle = Math.atan2(ball.vx, -ball.vy) + side * 0.42;
          const speed = Math.hypot(ball.vx, ball.vy);
          const twin = { x: ball.x, y: ball.y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, r: ball.r, stuck: false, alive: true, trail: [] };
          for (let step = 0; step < TRAIL; step += 1) twin.trail.push({ x: ball.x, y: ball.y });
          twins.push(twin);
        }
      }
      for (let index = 0; index < twins.length; index += 1) balls.push(twins[index]);
    }
  }

  function movePaddle(dt, direction, target) {
    if (target !== null && target !== undefined) paddle.x = clamp(target - paddle.w / 2, 0, FIELD.width - paddle.w);
    else if (direction !== 0) paddle.x = clamp(paddle.x + direction * PADDLE.speed * dt, 0, FIELD.width - paddle.w);
    else paddle.x = clamp(paddle.x, 0, FIELD.width - paddle.w);
  }

  function bounceOffPaddle(ball) {
    const u = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
    const speed = Math.hypot(ball.vx, ball.vy);
    const angle = u * BALL.launchAngle;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    const floor = speed * BALL.minSide;
    if (Math.abs(ball.vx) < floor) ball.vx = (u < 0 ? -floor : floor);
    ball.y = paddle.y - ball.r - 0.5;
    state.combo = 1;
  }

  function moveBall(ball, dt) {
    let events = 0;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    const r = ball.r;
    if (ball.x - r < 0) { ball.x = r; ball.vx = Math.abs(ball.vx); events |= EV_WALL; }
    else if (ball.x + r > FIELD.width) { ball.x = FIELD.width - r; ball.vx = -Math.abs(ball.vx); events |= EV_WALL; }
    if (ball.y - r < 0) { ball.y = r; ball.vy = Math.abs(ball.vy); events |= EV_WALL; }

    if (ball.vy > 0 && ball.y + r >= paddle.y && ball.y - r <= paddle.y + paddle.h + 8 && ball.x + r > paddle.x && ball.x - r < paddle.x + paddle.w) {
      bounceOffPaddle(ball);
      events |= EV_PADDLE;
    }

    for (let index = 0; index < bricks.length; index += 1) {
      const brick = bricks[index];
      if (!brick.alive) continue;
      if (ball.x + r <= brick.x || ball.x - r >= brick.x + brick.w) continue;
      if (ball.y + r <= brick.y || ball.y - r >= brick.y + brick.h) continue;
      const overlapX = Math.min(ball.x + r - brick.x, brick.x + brick.w - (ball.x - r));
      const overlapY = Math.min(ball.y + r - brick.y, brick.y + brick.h - (ball.y - r));
      if (overlapX < overlapY) {
        ball.x += ball.vx > 0 ? -overlapX : overlapX;
        ball.vx = -ball.vx;
      } else {
        ball.y += ball.vy > 0 ? -overlapY : overlapY;
        ball.vy = -ball.vy;
      }
      events |= hitBrick(brick, ball);
      ball.vx *= BALL.ramp;
      ball.vy *= BALL.ramp;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > BALL.maxSpeed) { ball.vx = (ball.vx / speed) * BALL.maxSpeed; ball.vy = (ball.vy / speed) * BALL.maxSpeed; }
      break;
    }

    if (ball.y - r > FIELD.height) ball.alive = false;
    return events;
  }

  function updateSparks(dt) {
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.life -= dt;
      if (spark.life <= 0) { sparks.splice(index, 1); continue; }
      spark.vy += 820 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
    }
  }

  function step(dt, direction, target) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.beam > 0) state.beam = Math.max(0, state.beam - dt);
    updateSparks(dt);
    for (let index = 0; index < bricks.length; index += 1) if (bricks[index].flash > 0) bricks[index].flash = Math.max(0, bricks[index].flash - dt);
    if (state.status === STATUS_CLEAR || state.status === STATUS_OVER) {
      if (state.score > state.peak) state.peak = state.score;
      return 0;
    }

    if (state.slow > 0) state.slow = Math.max(0, state.slow - dt);
    if (state.wide > 0) state.wide = Math.max(0, state.wide - dt);
    const wantedWidth = state.wide > 0 ? PADDLE.width * PADDLE.wideScale : PADDLE.width;
    if (wantedWidth !== paddle.w) {
      const centre = paddle.x + paddle.w / 2;
      paddle.w = wantedWidth;
      paddle.x = clamp(centre - paddle.w / 2, 0, FIELD.width - paddle.w);
    }
    movePaddle(dt, direction, target);

    const slow = state.slow > 0 ? SLOW_SCALE : 1;
    for (let index = balls.length - 1; index >= 0; index -= 1) {
      const ball = balls[index];
      if (ball.stuck) {
        ball.x = clamp(paddle.x + paddle.w / 2, ball.r, FIELD.width - ball.r);
        ball.y = paddle.y - ball.r - 1;
      } else {
        const speed = Math.hypot(ball.vx, ball.vy);
        const sub = Math.max(1, Math.min(12, Math.ceil((speed * dt) / (ball.r * 0.9))));
        const slice = (dt * slow) / sub;
        for (let pass = 0; pass < sub && ball.alive; pass += 1) events |= moveBall(ball, slice);
      }
      for (let point = TRAIL - 1; point > 0; point -= 1) {
        ball.trail[point].x = ball.trail[point - 1].x;
        ball.trail[point].y = ball.trail[point - 1].y;
      }
      ball.trail[0].x = ball.x;
      ball.trail[0].y = ball.y;
    }

    for (let index = drops.length - 1; index >= 0; index -= 1) {
      const drop = drops[index];
      drop.y += DROP.fall * dt;
      drop.rot += dt * 2.4;
      if (drop.y > FIELD.height + drop.h) { drops.splice(index, 1); continue; }
      if (drop.x + drop.w > paddle.x && drop.x < paddle.x + paddle.w && drop.y + drop.h > paddle.y && drop.y < paddle.y + paddle.h + 12) {
        applyPower(drop.kind);
        burst(drop.x + drop.w / 2, drop.y + drop.h / 2, 1, 8);
        drops.splice(index, 1);
        events |= EV_POWER;
      }
    }

    let lost = 0;
    for (let index = balls.length - 1; index >= 0; index -= 1) {
      if (!balls[index].alive) { balls.splice(index, 1); lost += 1; }
    }
    if (balls.length === 0 && lost > 0) {
      state.combo = 1;
      state.shake = 0.55;
      state.lives -= 1;
      if (state.lives <= 0) {
        state.lives = 0;
        state.status = STATUS_OVER;
        events |= EV_OVER;
      } else {
        createBall();
        state.status = STATUS_READY;
        events |= EV_HIT;
      }
    }
    if (state.status === STATUS_CLEAR) events |= EV_CLEAR;
    if (state.score > state.peak) state.peak = state.score;
    return events;
  }

  reset();
  return { state, paddle, balls, bricks, drops, sparks, reset, loadLevel, step, launch, fireLance, baseSpeed };
}
