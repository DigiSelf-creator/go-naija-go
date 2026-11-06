import { attachInput } from './engine/input';
import { FixedLoop } from './engine/loop';
import { fitView, readSafeArea, type View } from './engine/view';
import { Game } from './game/game';
import { registerServiceWorker } from './sw-register';

const el = document.getElementById('game');
if (!(el instanceof HTMLCanvasElement)) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = el;
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D is not available');
const g: CanvasRenderingContext2D = ctx;

let view: View = fitView(1, 1, 1);
function resize(): void {
  view = fitView(window.innerWidth, window.innerHeight, window.devicePixelRatio, readSafeArea());
  canvas.width = view.pixelW;
  canvas.height = view.pixelH;
}
window.addEventListener('resize', resize);
resize();

const game = new Game();
const loop = new FixedLoop({
  update: (dt) => game.update(dt),
  render: () => game.render(g, view),
});

function pause(): void {
  loop.pause();
  game.paused = true;
}
function resume(): void {
  if (document.hidden || portrait.matches) return;
  loop.resume();
  game.paused = false;
}

// Pause when the tab is hidden or the phone turns upright (the "turn sideways" note shows).
const portrait = window.matchMedia('(orientation: portrait) and (max-width: 700px)');
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
portrait.addEventListener('change', () => {
  if (portrait.matches) pause();
});
if (portrait.matches) pause();

attachInput(window, {
  onPress: () => {
    if (game.paused) resume();
    // A5: jump goes here.
  },
  onRelease: () => {
    // A5: end of a held jump goes here.
  },
});

loop.start();
registerServiceWorker();

// Read-only hooks for end to end tests.
declare global {
  interface Window {
    __gidi?: { readonly paused: boolean; readonly steps: number };
  }
}
window.__gidi = {
  get paused() {
    return game.paused;
  },
  get steps() {
    return loop.stepCount;
  },
};
