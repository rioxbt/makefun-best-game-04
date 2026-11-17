// Prisma: drawing. The field in, pixels out, plus the HUD and every menu panel.
import { CHARGE_FOR_LANCE, COMBO_MAX, CRYSTAL, FIELD, FONT, PALETTE } from './config.js';
import { SECTOR_NAMES } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const POWER_GLYPH = ['W', 'M', 'S', '+'];
const POWER_COLOR = ['#7bff8f', '#39e7ff', '#ff4fd8', '#ffc94d'];

function group(value) {
  const digits = String(value);
  let out = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) out += ',';
    out += digits[index];
  }
  return out;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const fonts = new Map();

  function font(size) {
    let built = fonts.get(size);
    if (built === undefined) {
      built = `${size}px ${FONT}`;
      fonts.set(size, built);
    }
    return built;
  }

  function text(value, x, y, size, color, align, weight) {
    context.font = weight ? `bold ${font(size)}` : font(size);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.fillText(value, x, y);
  }

  function bar(x, y, w, h, radius) {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
    context.fill();
  }

  function drawBackdrop() {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.sky);
    sky.addColorStop(0.55, '#070a18');
    sky.addColorStop(1, PALETTE.deep);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    context.fillStyle = PALETTE.grid;
    context.fillRect(0, 300, FIELD.width, 2);
    context.fillRect(0, 560, FIELD.width, 2);
  }

  function drawBricks(bricks) {
    for (let index = 0; index < bricks.length; index += 1) {
      const brick = bricks[index];
      if (!brick.alive) continue;
      if (brick.tough) {
        context.fillStyle = brick.flash > 0 ? '#a9bdf0' : PALETTE.tough;
        bar(brick.x, brick.y, brick.w, brick.h, 5);
        context.fillStyle = 'rgba(255,255,255,0.30)';
        bar(brick.x + 3, brick.y + 3, brick.w - 6, 6, 3);
        context.fillStyle = PALETTE.panel;
        bar(brick.x + brick.w / 2 - 2, brick.y + 6, 4, brick.h - 12, 2);
      } else {
        const hue = CRYSTAL[brick.hue];
        context.fillStyle = hue;
        bar(brick.x, brick.y, brick.w, brick.h, 5);
        context.fillStyle = 'rgba(255,255,255,0.42)';
        bar(brick.x + 3, brick.y + 3, brick.w - 6, 7, 3);
        context.fillStyle = 'rgba(0,0,0,0.22)';
        bar(brick.x + 3, brick.y + brick.h - 6, brick.w - 6, 3, 2);
      }
    }
  }

  function drawBeam(state) {
    if (state.beam <= 0) return;
    const alpha = Math.min(1, state.beam * 4);
    const beam = context.createLinearGradient(0, 0, 0, FIELD.height);
    beam.addColorStop(0, `rgba(120,255,255,0)`);
    beam.addColorStop(1, `rgba(180,255,255,${0.5 * alpha})`);
    context.fillStyle = beam;
    context.fillRect(state.beamX - 16, 0, 32, FIELD.height);
    context.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
    context.fillRect(state.beamX - 3, 0, 6, FIELD.height);
  }

  function drawDrops(drops) {
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      const cx = drop.x + drop.w / 2;
      const cy = drop.y + drop.h / 2;
      context.save();
      context.translate(cx, cy);
      context.rotate(Math.sin(drop.rot) * 0.4);
      context.fillStyle = POWER_COLOR[drop.kind];
      bar(-drop.w / 2, -drop.h / 2, drop.w, drop.h, 8);
      context.restore();
      text(POWER_GLYPH[drop.kind], cx, cy + 8, 20, '#05070f', 'center', true);
    }
  }

  function drawSparks(sparks) {
    for (let index = 0; index < sparks.length; index += 1) {
      const spark = sparks[index];
      context.globalAlpha = Math.max(0, Math.min(1, spark.life / spark.full));
      context.fillStyle = spark.color;
      context.fillRect(spark.x, spark.y, spark.size, spark.size);
    }
    context.globalAlpha = 1;
  }

  function drawPaddle(paddle, state, chargeReady) {
    const shell = context.createLinearGradient(0, paddle.y, 0, paddle.y + paddle.h);
    shell.addColorStop(0, PALETTE.paddle);
    shell.addColorStop(1, '#7fa6d8');
    context.fillStyle = shell;
    bar(paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
    context.fillStyle = chargeReady ? CRYSTAL[0] : PALETTE.edge;
    bar(paddle.x + 8, paddle.y + paddle.h - 5, paddle.w - 16, 3, 2);
    if (state.wide > 0) {
      context.strokeStyle = CRYSTAL[3];
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(paddle.x - 2, paddle.y - 2, paddle.w + 4, paddle.h + 4, paddle.h / 2);
      context.stroke();
    }
  }

  function drawBalls(balls) {
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      for (let point = ball.trail.length - 1; point >= 1; point -= 1) {
        context.globalAlpha = (1 - point / ball.trail.length) * 0.28;
        context.fillStyle = CRYSTAL[0];
        context.beginPath();
        context.arc(ball.trail[point].x, ball.trail[point].y, ball.r * (1 - point / (ball.trail.length + 2)), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      const halo = context.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.r * 3.4);
      halo.addColorStop(0, 'rgba(255,255,255,0.55)');
      halo.addColorStop(1, 'rgba(120,220,255,0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(ball.x, ball.y, ball.r * 3.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.ball;
      context.beginPath();
      context.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'alphabetic';
    text('SCORE', 30, 34, 18, PALETTE.muted);
    text(group(state.score), 30, 66, 34, PALETTE.text, 'left', true);

    text(`SECTOR ${state.level}  ·  ${SECTOR_NAMES[state.level - 1]}`, FIELD.width / 2, 40, 24, PALETTE.text, 'center', true);
    text(`combo ×${state.combo}  ·  crystals left ${Math.max(0, state.left)}`, FIELD.width / 2, 66, 20, PALETTE.muted, 'center');

    text('LIVES', FIELD.width - 30, 34, 18, PALETTE.muted, 'right');
    for (let life = 0; life < Math.max(0, state.lives); life += 1) {
      context.fillStyle = PALETTE.paddle;
      bar(FIELD.width - 44 - life * 30, 48, 24, 9, 4);
    }

    const meterX = 30;
    const meterY = 92;
    for (let slot = 0; slot < CHARGE_FOR_LANCE; slot += 1) {
      context.fillStyle = slot < state.charge ? (state.charge >= CHARGE_FOR_LANCE ? CRYSTAL[0] : PALETTE.edge) : '#1b2946';
      bar(meterX + slot * 22, meterY, 16, 10, 3);
    }
    text(state.charge >= CHARGE_FOR_LANCE ? 'LANCE READY — press E or click' : 'charge', meterX + CHARGE_FOR_LANCE * 22 + 8, meterY + 10, 17, state.charge >= CHARGE_FOR_LANCE ? CRYSTAL[0] : PALETTE.muted);

    if (state.slow > 0) text('SLOW', FIELD.width - 30, 100, 18, CRYSTAL[2], 'right', true);
    if (state.wide > 0) text('WIDE', FIELD.width - 92, 100, 18, CRYSTAL[3], 'right', true);
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const line = 42;
    const height = 210 + lines.length * line;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2 + 10;
    context.fillStyle = 'rgba(6,10,22,0.94)';
    bar(x, y, width, height, 18);
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x + 1, y + 1, width - 2, height - 2, 17);
    context.stroke();
    context.globalAlpha = 0.10;
    context.fillStyle = accent;
    bar(x + 2, y + 2, width - 4, 92, 16);
    context.globalAlpha = 1;
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 66, 46, accent, 'center', true);
    for (let index = 0; index < lines.length; index += 1) text(lines[index], FIELD.width / 2, y + 136 + index * line, 24, PALETTE.text, 'center');
    text(prompt, FIELD.width / 2, y + height - 38, 26, accent, 'center', true);
  }

  function drawTitle(best) {
    context.textBaseline = 'alphabetic';
    text('PRISMA', FIELD.width / 2, 172, 96, PALETTE.text, 'center', true);
    text('Crystal Breaker', FIELD.width / 2, 214, 28, CRYSTAL[0], 'center');
    const rowWidth = 7 * 66 + 6 * 8;
    for (let index = 0; index < 7; index += 1) {
      context.fillStyle = CRYSTAL[index % CRYSTAL.length];
      bar(FIELD.width / 2 - rowWidth / 2 + index * 74, 248, 66, 22, 6);
    }
    context.fillStyle = 'rgba(5,8,18,0.97)';
    bar(FIELD.width / 2 - 400, 320, 800, 232, 16);
    text('Shatter every crystal with the pulse.', FIELD.width / 2, 372, 26, PALETTE.text, 'center', true);
    text('Move: mouse or ← →    ·    Launch: click or Space', FIELD.width / 2, 420, 22, PALETTE.muted, 'center');
    text('Charge 8, then E or right-click for the Prism Lance', FIELD.width / 2, 456, 22, PALETTE.muted, 'center');
    text('Clear all five sectors to open the vault.', FIELD.width / 2, 492, 22, PALETTE.muted, 'center');
    text(`Best ${group(best)}`, FIELD.width / 2, 530, 20, CRYSTAL[2], 'center');
    text('Click or press Space to start', FIELD.width / 2, 640, 32, CRYSTAL[0], 'center', true);
  }

  function draw(world, screen, best) {
    const state = world.state;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.deep;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / FIELD.width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.shake > 0 && screen === SCREEN_PLAY) {
      context.translate((Math.random() - 0.5) * state.shake * 18, (Math.random() - 0.5) * state.shake * 18);
    }
    drawBackdrop();
    const ready = state.charge >= CHARGE_FOR_LANCE;
    drawBricks(world.bricks);
    drawBeam(state);
    drawDrops(world.drops);
    drawPaddle(world.paddle, state, ready);
    drawBalls(world.balls);
    drawSparks(world.sparks);

    if (screen === SCREEN_TITLE) { drawTitle(best); return; }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The crystals hold their breath.'], 'Press P to resume', CRYSTAL[2]);
    else if (screen === SCREEN_CLEAR) drawPanel(`Sector ${state.level} cleared`, [`Score ${group(state.score)}`, 'The next field is deeper.'], 'Click or press Space for the next sector', CRYSTAL[3]);
    else if (screen === SCREEN_OVER) drawPanel('Pulse lost', [`Score ${group(state.score)}`, `Reached sector ${state.level}  ·  Best ${group(best)}`], 'Click or press Space to play again', CRYSTAL[1]);
    else if (screen === SCREEN_WIN) drawPanel('Vault opened', [`All ${state.level} sectors broken.`, `Final score ${group(state.score)}`, `Best ${group(best)}`], 'Click or press Space to play again', CRYSTAL[3]);
  }

  return { draw };
}
