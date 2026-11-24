// Maps a standard-layout gamepad to keyboard events, so the library (and the page) only deal with keys.
const BUTTONS: Record<number, string> = {
  12: 'ArrowUp',
  13: 'ArrowDown',
  14: 'ArrowLeft',
  15: 'ArrowRight',
  0: 'Enter', // A
  1: 'Escape', // B
  9: 'm', // Start → quick menu
};
const REPEAT_DELAY = 400;
const REPEAT_RATE = 120;
const held = new Map<string, number>(); // key → time of next auto-repeat
let polling = false;

const press = (key: string) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));

function poll(now: number) {
  const pads = navigator.getGamepads().filter((p) => p !== null);
  const down = new Set<string>();
  for (const pad of pads) {
    for (const [i, key] of Object.entries(BUTTONS)) if (pad.buttons[+i]?.pressed) down.add(key);
    const [x = 0, y = 0] = pad.axes; // left stick
    if (x < -0.5) down.add('ArrowLeft');
    if (x > 0.5) down.add('ArrowRight');
    if (y < -0.5) down.add('ArrowUp');
    if (y > 0.5) down.add('ArrowDown');
  }
  for (const key of down) {
    const next = held.get(key);
    if (next === undefined) {
      press(key);
      held.set(key, now + REPEAT_DELAY);
    } else if (now >= next && key.startsWith('Arrow')) {
      press(key);
      held.set(key, now + REPEAT_RATE);
    }
  }
  for (const key of held.keys()) if (!down.has(key)) held.delete(key);
  polling = pads.length > 0;
  if (polling) requestAnimationFrame(poll);
}

window.addEventListener('gamepadconnected', () => {
  if (!polling) requestAnimationFrame(poll);
  polling = true;
});
