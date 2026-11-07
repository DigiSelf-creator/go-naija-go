import './screens/screens.css';
import { Controls, attachControls, type Source } from './engine/input';
import { FixedLoop } from './engine/loop';
import { fitView, readSafeArea, type View } from './engine/view';
import street1Data from './data/levels/lagos-1.json';
import bossLevelData from './data/levels/w1-l1.json';
import { Sound } from './engine/sound';
import { Game, heroScreenX } from './game/game';
import { parseLevel } from './game/level';
import type { RunPhase } from './game/run';
import { loadLook } from './game/save';
import { TouchButtons } from './screens/controls';
import { Hud, Toast } from './screens/hud';
import { WORDS, hintWords } from './screens/words';
import { Menus, isSecondTap, type MenuScreen, type TapPoint } from './screens/menus';
import { createStore } from './storage';
import { registerServiceWorker } from './sw-register';

const el = document.getElementById('game');
if (!(el instanceof HTMLCanvasElement)) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = el;
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D is not available');
const g: CanvasRenderingContext2D = ctx;

let view: View = fitView(1, 1, 1);
const onResize: (() => void)[] = [];
function resize(): void {
  view = fitView(window.innerWidth, window.innerHeight, window.devicePixelRatio, readSafeArea());
  canvas.width = view.pixelW;
  canvas.height = view.pixelH;
  for (const f of onResize) f();
}
window.addEventListener('resize', resize);
resize();

registerServiceWorker();

const query = new URLSearchParams(location.search);
if (query.has('gallery')) {
  // Debug only: every picture at once, for art checks (?gallery, ?gallery=2 for page 2, &t=1.5 to hold the time).
  void import('./art/gallery').then(({ drawGallery }) => {
    const t0 = performance.now();
    const page = Number(query.get('gallery')) || 0;
    const hold = query.has('t') ? Number(query.get('t')) : NaN;
    const frame = (now: number): void => {
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawGallery(g, view.width, view.height, Number.isFinite(hold) ? hold : (now - t0) / 1000, page);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
} else {
  startGame();
}

function startGame(): void {
  const store = createStore();
  // Street 1 by hand (slice 2). The slice 1 boss fight comes after its bus until Go-Slow Hall
  // (piece M). ?level=w1-l1 still plays the whole slice 1 level the old way, running by itself.
  const bossLevel = parseLevel(bossLevelData);
  const oldWay = new URLSearchParams(location.search).get('level') === 'w1-l1';
  const startLevel = oldWay ? bossLevel : parseLevel(street1Data);
  const game = new Game(startLevel);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const buttons = new TouchButtons(document.body, coarse);
  const placeButtons = (): void => buttons.place(window.innerWidth, window.innerHeight, readSafeArea());
  onResize.push(placeButtons, () => game.setView(view));
  placeButtons();
  game.setView(view);
  game.look = loadLook(store);
  const sound = new Sound();

  const loop = new FixedLoop({
    update: (dt) => game.update(dt),
    render: () => {
      game.render(g, view);
      if (playing) {
        hud.update(game.run, menus.sound);
        buttons.pressed(controls.dir, controls.jumpHeld > 0);
      }
    },
  });

  /** In a run (HUD showing), including while paused. */
  let playing = false;
  // The tap that pressed "Start running": a second tap on the same spot right after it is the
  // other half of a double tap, not a jump. A tap anywhere else jumps at once.
  let startTap: (TapPoint & { t: number }) | null = null;
  // Pause when the tab is hidden or the phone turns upright (the "turn sideways" note shows).
  const portrait = window.matchMedia('(orientation: portrait)');

  /** The street or the boss fight is being played (not game over or won). */
  const inPlay = (): boolean => game.run.phase === 'run' || game.run.phase === 'arena';

  /** Pause the run and show the pause screen (button, app switch, or phone upright). */
  function pause(by?: MouseEvent): void {
    if (!playing || game.paused || !inPlay()) return;
    loop.pause();
    game.paused = true;
    controls.releaseAll();
    game.release();
    game.steer(0);
    menus.show('pause', by);
  }
  function resume(): void {
    if (!playing || document.hidden || portrait.matches) return;
    menus.show(null);
    game.paused = false;
    loop.resume();
  }
  function startRun(at: TapPoint | null): void {
    startTap = at ? { ...at, t: performance.now() } : null;
    menus.show(null);
    toast.hide();
    playing = true;
    document.body.classList.add('playing');
    controls.releaseAll();
    game.begin(menus.gentle, startLevel);
    hud.show(true);
    buttons.show(true, game.level.manual);
    loop.resume();
    if (portrait.matches || document.hidden) pause();
  }
  function goHome(): void {
    playing = false;
    document.body.classList.remove('playing');
    hud.show(false);
    buttons.show(false);
    toast.hide();
    loop.pause();
    controls.releaseAll();
    game.reset(startLevel);
    menus.show('title');
  }

  const menus = new Menus(document.body, store, game.look, {
    start: startRun,
    restart: startRun,
    resume,
    home: goHome,
    lookChanged: (look) => {
      game.look = look;
    },
  });
  const hud = new Hud(document.body, {
    pause: (e) => pause(e),
    toggleSound: () => {
      sound.enabled = menus.toggleSound();
      hud.update(game.run, sound.enabled);
    },
  });
  const toast = new Toast(document.body);
  sound.enabled = menus.sound;
  menus.touchWords = () => buttons.touch;

  const W = WORDS.toast;
  game.onEvent = (e) => {
    switch (e.type) {
      case 'kobo':
        sound.play('kobo');
        break;
      case 'food':
        sound.play('food');
        toast.show(W[e.kind], 3200);
        break;
      case 'hint':
        toast.show(hintWords(e.words, controls.lastKind), 2600);
        break;
      case 'bounce':
        sound.play(e.kind === 'goat' ? 'meeh' : 'bounce');
        break;
      case 'smash':
        sound.play(e.kind === 'goat' ? 'meeh' : 'smash');
        break;
      case 'hit':
        sound.play('hit');
        break;
      case 'shieldPop':
        sound.play('shieldPop');
        toast.show(W.shieldUsed);
        break;
      case 'fall':
        sound.play('fall');
        break;
      case 'checkpoint':
        sound.play('checkpoint');
        break;
      case 'wearingOff':
        toast.show(e.kind === 'corn' ? W.cornWearingOff : W.amalaWearingOff);
        break;
      case 'tick':
        sound.play('tick');
        break;
      case 'powerEnd':
        break;
      case 'gameOver':
        sound.play('gameOver');
        controls.releaseAll();
        loop.pause();
        toast.hide();
        menus.showGameOver({ kobo: game.run.kobo, lives: 0 });
        break;
      case 'arena':
        sound.play('arena');
        toast.show(W.bossArrives, 3000);
        break;
      case 'busBoard':
        break;
      case 'busGo':
        // The hero is in: the door hisses shut and our horn sounds as the bus pulls away.
        sound.play('busBoard');
        break;
      case 'runStart':
        sound.play('runStart');
        break;
      case 'skid':
        sound.play('skid');
        break;
      case 'streetCleared':
        // Until Go-Slow Hall (piece M): on to the slice 1 boss fight, lives and kobo carried.
        game.toBoss(bossLevel);
        buttons.show(true, false);
        sound.play('arena');
        toast.show(W.bossArrives, 3000);
        break;
      case 'bossThrow':
        if (e.kind === 'honk') sound.play('honk');
        break;
      case 'bossHit':
        sound.play('greenHit');
        if (e.left > 0) toast.show(W.greenLight(e.left));
        break;
      case 'bossDefeat':
      case 'dust':
        break;
      case 'roadFree':
        sound.play('bossWin');
        toast.show(W.roadFree, 2000);
        break;
      case 'win':
        controls.releaseAll();
        loop.pause();
        toast.hide();
        menus.showWin({ kobo: game.run.kobo, lives: game.run.lives });
        break;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  // Both: the resize event can arrive a frame before the media query change event.
  const checkUpright = (): void => {
    if (portrait.matches) pause();
  };
  portrait.addEventListener('change', checkUpright);
  window.addEventListener('resize', checkUpright);

  // Sound may start only after the player's first tap or key.
  const unlock = (): void => sound.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  const controls = new Controls(
    {
      onJumpPress: (by: Source, at) => {
        if (!playing || game.paused || !inPlay()) return;
        if (isSecondTap(startTap, at)) return;
        const jump = game.press(by);
        if (jump === 'ground') sound.play('jump');
        else if (jump === 'air') sound.play('airJump');
      },
      onJumpRelease: (by) => game.release(by),
      onMove: (dir) => {
        if (playing && !game.paused) game.steer(dir);
        else game.steer(0);
      },
    },
    () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      midX: buttons.layout.midX,
      // Area rules only with the buttons on screen on a player-moved street; else a press anywhere jumps.
      buttons: buttons.touch && game.level.manual,
    }),
    coarse ? 'touch' : 'keys',
  );
  attachControls(window, controls, () => buttons.sawTouch());

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
      const { x, y, vy, vx, grounded, dir, speed, airJump, move, runTime, manual } = game.hero;
      return { x, y, vy, vx, grounded, dir, speed, airJump, move, runTime, manual };
    },
    get input() {
      return {
        dir: controls.dir,
        jumpHeld: controls.jumpHeld,
        fingers: controls.fingerCount,
        lastKind: controls.lastKind,
        buttons: buttons.shown,
        layout: buttons.layout,
      };
    },
    get look() {
      return { ...game.look };
    },
    get screen() {
      return menus.current ?? (playing ? 'play' : null);
    },
    get run() {
      const r = game.run;
      return {
        phase: r.phase,
        lives: r.lives,
        maxLives: r.maxLives,
        kobo: r.kobo,
        time: r.time,
        checkpoint: r.checkpointReached,
        safe: r.safe,
        power: { ...r.power },
        hazards: r.hazards.map((z) => ({ kind: z.kind, x: z.x, mode: z.mode })),
      };
    },
    get level() {
      const level = game.level;
      return {
        id: level.id,
        manual: level.manual,
        gaps: level.ground.slice(1).map((s, i) => [level.ground[i]![1], s[0]] as const),
        checkpoint: level.checkpoint,
        spawnX: level.spawnX,
        startWall: level.startWall,
        end: level.end ? { ...level.end } : null,
        arenaX: level.arena?.x ?? Infinity,
        turnLeftX: level.arena?.turnLeftX ?? Infinity,
        turnRightX: level.arena?.turnRightX ?? Infinity,
        groundY: level.groundY,
        lights: (level.boss?.lights ?? []).map((l) => ({ ...l })),
      };
    },
    get toast() {
      return toast.text;
    },
    get boss() {
      const b = game.run.boss;
      return b
        ? {
            hits: b.hits,
            lit: b.lit,
            litLight: b.litLight ? { ...b.litLight } : null,
            mode: b.mode,
            defeated: b.defeated,
            throws: b.throws.map((t) => ({ kind: t.kind, x: t.x, y: t.y, vx: t.vx })),
          }
        : null;
    },
    get heroScreenX() {
      // Where the hero is drawn across the screen right now (the street camera may lag or
      // stop at the start fence; slice 1 levels keep heroScreenX).
      return game.level.manual ? (game.hero.x - game.camera) / view.width : heroScreenX(view.width);
    },
    get camX() {
      return game.camera;
    },
    get camLook() {
      return game.cameraLook;
    },
    get viewW() {
      return view.width;
    },
    get sound() {
      return { enabled: sound.enabled, started: sound.started };
    },
  };
}

declare global {
  interface Window {
    __game?: {
      readonly paused: boolean;
      readonly steps: number;
      /** Camera left edge (world x) as last drawn. */
      readonly camX: number;
      /** Which way the street camera looks. */
      readonly camLook: 1 | -1;
      /** World width shown. */
      readonly viewW: number;
      readonly hero: {
        readonly x: number;
        readonly y: number;
        readonly vy: number;
        /** Speed across (player-moved), u/s. */
        readonly vx: number;
        readonly grounded: boolean;
        readonly dir: 1 | -1;
        readonly speed: number;
        readonly airJump: boolean;
        /** Direction held (player-moved). */
        readonly move: -1 | 0 | 1;
        readonly runTime: number;
        readonly manual: boolean;
      };
      readonly input: {
        readonly dir: -1 | 0 | 1;
        readonly jumpHeld: number;
        readonly fingers: { readonly dir: number; readonly jump: number };
        readonly lastKind: 'touch' | 'keys';
        readonly buttons: boolean;
        readonly layout: {
          readonly d: number;
          readonly midX: number;
          readonly back: { x: number; y: number; w: number; h: number };
          readonly forward: { x: number; y: number; w: number; h: number };
          readonly jump: { x: number; y: number; w: number; h: number };
        };
      };
      readonly look: { readonly skin: number; readonly hair: number; readonly outfit: number };
      readonly screen: MenuScreen | 'play';
      readonly run: {
        readonly phase: RunPhase;
        readonly lives: number;
        readonly maxLives: number;
        readonly kobo: number;
        readonly time: number;
        readonly checkpoint: boolean;
        readonly safe: number;
        readonly power: { readonly corn: number; readonly amala: number; readonly shield: boolean };
        readonly hazards: readonly { readonly kind: string; readonly x: number; readonly mode: string }[];
      };
      readonly level: {
        readonly id: string;
        readonly manual: boolean;
        readonly spawnX: number;
        readonly startWall: number;
        readonly end: { readonly x: number; readonly wall: number } | null;
        readonly gaps: readonly (readonly [number, number])[];
        readonly checkpoint: number;
        readonly arenaX: number;
        readonly turnLeftX: number;
        readonly turnRightX: number;
        readonly groundY: number;
        readonly lights: readonly { readonly x: number; readonly y: number; readonly w: number }[];
      };
      readonly toast: string;
      readonly boss: {
        readonly hits: number;
        readonly lit: number;
        readonly litLight: { readonly x: number; readonly y: number; readonly w: number } | null;
        readonly mode: string;
        readonly defeated: boolean;
        readonly throws: readonly { readonly kind: string; readonly x: number; readonly y: number; readonly vx: number }[];
      } | null;
      /** Where the hero stands across the screen, 0 to 1. */
      readonly heroScreenX: number;
      readonly sound: { readonly enabled: boolean; readonly started: boolean };
    };
  }
}
