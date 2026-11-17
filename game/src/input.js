// Prisma: mouse and keyboard in one place.
export const ACT_PRIMARY = 1;
export const ACT_PAUSE = 2;
export const ACT_LANCE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const PRIMARY = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const LANCE = new Set(['KeyE']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let actions = 0;
  let pointer = null;
  let wakeOnGesture = () => {};

  function toField(event) {
    const box = canvas.getBoundingClientRect();
    return ((event.clientX - box.left) / box.width) * canvas.width;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (PRIMARY.has(event.code)) {
      if (!event.repeat) actions |= ACT_PRIMARY;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACT_PAUSE;
    } else if (LANCE.has(event.code)) {
      if (!event.repeat) actions |= ACT_LANCE;
    } else return;
    pointer = null;
    event.preventDefault();
    wakeOnGesture();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    pointer = toField(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toField(event);
    actions |= event.button === 2 ? ACT_LANCE : ACT_PRIMARY;
    event.preventDefault();
    wakeOnGesture();
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    onGesture(listener) {
      wakeOnGesture = listener;
    },
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    target() {
      return pointer;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
