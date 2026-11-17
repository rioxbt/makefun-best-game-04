// Prisma: boot, the screens and the fixed-step loop.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { ACT_LANCE, ACT_PAUSE, ACT_PRIMARY, createInput } from './input.js';
import { createRandom } from './random.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { EV_BRICK, EV_CLEAR, EV_HIT, EV_OVER, EV_PADDLE, EV_POWER, EV_TOUGH, EV_WALL, LEVEL_LAST, STATUS_READY, createWorld } from './world.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const wanted = Number.parseFloat(params.get('q') ?? '');
  const quality = Number.isFinite(wanted) ? wanted : 0.62;
  const asked = Number.parseInt(params.get('w') ?? '', 10);
  const width = Number.isInteger(asked) && asked >= 480 ? asked : canvas.width;
  const target = width === canvas.width ? canvas : document.createElement('canvas');
  target.width = width;
  target.height = Math.round((width * FIELD.height) / FIELD.width);
  const painter = target === canvas ? renderer : createRenderer(target);
  let painted = 0;
  function paint() {
    painter.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) {
      requestAnimationFrame(paint);
      return;
    }
    window.__shotData = target.toDataURL('image/jpeg', quality);
    window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  input.onGesture(() => audio.wake());
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function keepBest() {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function startRun() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Sector 1. Three lives.');
  }

  function fireLance() {
    if (world.fireLance()) {
      audio.lance();
      announce('Prism lance fired.');
    }
  }

  function advance() {
    if (world.state.level < LEVEL_LAST) {
      world.loadLevel(world.state.level + 1);
      screen = SCREEN_PLAY;
      announce(`Sector ${world.state.level}.`);
      return;
    }
    keepBest();
    screen = SCREEN_WIN;
    audio.clear();
    announce(`Vault opened. Final score ${world.state.score}. Best ${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACT_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACT_PRIMARY) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startRun();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_CLEAR) advance();
      else if (screen === SCREEN_PLAY) {
        if (world.state.status === STATUS_READY) world.launch();
        else fireLance();
      }
    }
    if (actions & ACT_LANCE && screen === SCREEN_PLAY) fireLance();
  }

  function step() {
    const events = world.step(STEP, input.direction(), input.target());
    if (events & EV_WALL) audio.wall();
    if (events & EV_PADDLE) audio.paddle();
    if (events & EV_BRICK) audio.brick(world.state.combo);
    if (events & EV_TOUGH) audio.tough();
    if (events & EV_POWER) audio.power();
    if (events & EV_HIT) audio.life();
    if (events & EV_OVER) {
      keepBest();
      screen = SCREEN_OVER;
      audio.over();
      announce(`Pulse lost. Score ${world.state.score}. Best ${best}.`);
    } else if (events & EV_CLEAR) {
      keepBest();
      screen = SCREEN_CLEAR;
      audio.clear();
      announce(`Sector ${world.state.level} cleared. Score ${world.state.score}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(input.takeActions());
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Prisma. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
