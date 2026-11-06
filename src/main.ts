import './screens/screens.css';
import { attachInput } from './engine/input';
import { FixedLoop } from './engine/loop';
import { fitView, readSafeArea, type View } from './engine/view';
import { Game } from './game/game';
import { loadLook } from './game/save';
import { Menus, type MenuScreen } from './screens/menus';
import { createStore } from './storage';
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

registerServiceWorker();

if (new URLSearchParams(location.search).has('gallery')) {
  // Debug only: every picture at once, for art checks (?gallery).
  void import('./art/gallery').then(({ drawGallery }) => {
    const t0 = performance.now();
    const frame = (now: number): void => {
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawGallery(g, view.width, view.height, (now - t0) / 1000);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
} else {
  startGame();
}

function startGame(): void {
  const store = createStore();
  const game = new Game();
  game.look = loadLook(store);

  const loop = new FixedLoop({
    update: (dt) => game.update(dt),
    render: () => game.render(g, view),
  });

  let playing = false;
  // Pause when the tab is hidden or the phone turns upright (the "turn sideways" note shows).
  const portrait = window.matchMedia('(orientation: portrait) and (max-width: 700px)');

  function pause(): void {
    if (!playing) return;
    loop.pause();
    game.paused = true;
  }
  function resume(): void {
    if (!playing || document.hidden || portrait.matches) return;
    loop.resume();
    game.paused = false;
  }

  const menus = new Menus(document.body, store, game.look, {
    start: () => {
      menus.show(null);
      playing = true;
      document.body.classList.add('playing');
      game.begin();
      loop.resume();
      if (portrait.matches || document.hidden) pause();
    },
    lookChanged: (look) => {
      game.look = look;
    },
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  // Both: the resize event can arrive a frame before the media query change event.
  const checkUpright = (): void => {
    if (portrait.matches) pause();
  };
  portrait.addEventListener('change', checkUpright);
  window.addEventListener('resize', checkUpright);

  attachInput(window, {
    onPress: () => {
      if (!playing) return;
      if (game.paused) resume(); // the tap that ends a pause does not jump
      else game.press();
    },
    onRelease: () => game.release(),
  });

  // Menus first; the street stands still behind them.
  loop.start();
  loop.pause();
  menus.show('title');

  // Read-only hooks for end to end tests.
  window.__game = {
    get paused() {
      return game.paused;
    },
    get steps() {
      return loop.stepCount;
    },
    get hero() {
      const { x, y, vy, grounded } = game.hero;
      return { x, y, vy, grounded };
    },
    get look() {
      return { ...game.look };
    },
    get screen() {
      return playing ? 'play' : menus.current;
    },
  };
}

declare global {
  interface Window {
    __game?: {
      readonly paused: boolean;
      readonly steps: number;
      readonly hero: { readonly x: number; readonly y: number; readonly vy: number; readonly grounded: boolean };
      readonly look: { readonly skin: number; readonly hair: number; readonly outfit: number };
      readonly screen: MenuScreen | 'play';
    };
  }
}
