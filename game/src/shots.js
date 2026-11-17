// Prisma: the deterministic screenshot scenes behind ?shot=title|play|clear|over|win.
import { CHARGE_FOR_LANCE, FIELD, STEP } from './config.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { LEVEL_LAST, STATUS_CLEAR, STATUS_OVER, STATUS_READY } from './world.js';

function pilot(world) {
  const paddle = world.paddle;
  let aim = paddle.x + paddle.w / 2;
  let lowest = -1;
  for (let index = 0; index < world.balls.length; index += 1) {
    const ball = world.balls[index];
    if (ball.stuck) continue;
    if (ball.y > lowest) { lowest = ball.y; aim = ball.x; }
  }
  let target = null;
  for (let index = 0; index < world.bricks.length; index += 1) {
    const brick = world.bricks[index];
    if (brick.alive && (target === null || brick.y > target.y)) target = brick;
  }
  if (target !== null) {
    const push = 42 + 24 * Math.sin(world.state.time * 0.73);
    aim -= (target.x + target.w / 2 > aim ? 1 : -1) * push;
  }
  for (let index = 0; index < world.drops.length; index += 1) {
    const drop = world.drops[index];
    const centre = drop.x + drop.w / 2;
    if (drop.y > 360 && Math.abs(centre - aim) < 300) aim = centre;
  }
  return aim;
}

function play(world, seconds, options) {
  const launch = options.launch;
  const lance = options.lance;
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    if (launch && world.state.status === STATUS_READY) world.launch();
    if (lance && world.state.charge >= CHARGE_FOR_LANCE) world.fireLance();
    world.step(STEP, 0, options.pilot ? pilot(world) : null);
    if (world.state.status === STATUS_OVER) break;
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    play(world, 18, { pilot: true, launch: true, lance: true });
    return { screen: SCREEN_PLAY, best: 12400 };
  }
  if (name === 'over') {
    play(world, 24, { pilot: true, launch: true, lance: true });
    world.state.lives = 0;
    world.state.status = STATUS_OVER;
    return { screen: SCREEN_OVER, best: 21800 };
  }
  if (name === 'clear') {
    play(world, 6, { pilot: true, launch: true, lance: false });
    world.state.status = STATUS_CLEAR;
    world.state.left = 0;
    world.state.score = 9600;
    world.bricks.length = 0;
    return { screen: SCREEN_CLEAR, best: 12400 };
  }
  if (name === 'win') {
    play(world, 4, { pilot: true, launch: false, lance: false });
    world.state.level = LEVEL_LAST;
    world.state.score = 68400;
    world.state.lives = 2;
    world.state.status = STATUS_CLEAR;
    world.state.left = 0;
    world.state.charge = 5;
    world.bricks.length = 0;
    world.balls.length = 0;
    world.drops.length = 0;
    return { screen: SCREEN_WIN, best: 52100 };
  }
  play(world, 2, { pilot: false, launch: false, lance: false });
  return { screen: SCREEN_TITLE, best: 52100 };
}

export const FIELD_WIDTH = FIELD.width;
