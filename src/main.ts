import './screens/screens.css';
import { Controls, attachControls, type Source } from './engine/input';
import { FixedLoop } from './engine/loop';
import { fitView, readSafeArea, type View } from './engine/view';
import street1Data from './data/levels/lagos-1.json';
import street2Data from './data/levels/lagos-2.json';
import street3Data from './data/levels/lagos-3.json';
import hallData from './data/levels/lagos-hall.json';
import wellRoomData from './data/levels/lagos-well.json';
import { Sound } from './engine/sound';
import { BUS_BOARD, END_BUS_BACK, END_BUS_FRONT, busEndAt } from './art/roadside';
import { DUST_TIME, Game, heroScreenX } from './game/game';
import { parseLevel, type Level } from './game/level';
import { STEPS_PER_SECOND, type RunPhase } from './game/run';
import { parseRoom } from './game/well';
import { WELL } from './art/well';
import { ROOM_ROPE_BUCKET_Y } from './art/wellRoom';
import { WELL_UP_KEYS } from './engine/input';
import { loadLook } from './game/save';
import { TouchButtons, WellButton, hintBarBox, wellButtonBox, type HintBarBox, type WellButtonKind } from './screens/controls';
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
  // Lagos streets 1 to 3 by hand (S2.6), each loaded from its level file and drawn by its
  // `theme`, then Go-Slow Hall (S2.7, lagos-hall.json). ?level=lagos-2, lagos-3 or lagos-hall
  // starts there (for testing).
  const hall = parseLevel(hallData);
  const streets: readonly Level[] = [street1Data, street2Data, street3Data].map((d) => parseLevel(d));
  const asked = new URLSearchParams(location.search).get('level');
  const firstStreet: number | 'hall' = asked === hall.id ? 'hall' : Math.max(0, streets.findIndex((l) => l.id === asked));
  /** The street being played (index into streets), or 'hall' for Go-Slow Hall after street 3. */
  let where: number | 'hall' = firstStreet;
  const levelOf = (w: number | 'hall'): Level => (w === 'hall' ? hall : streets[w]!);
  const startLevel = levelOf(firstStreet);
  /**
   * S2.5 gift rules 4 and 5: a street finished while carrying the garri parcel keeps it for
   * Lagos, and every hall try then starts with the shield on. Saving it on the phone is N2's
   * (gidi-progress); until then it lasts while the page is open.
   */
  let parcelForHall = false;
  const game = new Game(startLevel);
  // Well rooms by file id (S2.5); both Lagos wells use lagos-well.
  const room = parseRoom(wellRoomData);
  game.rooms = new Map([[room.id, room]]);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const buttons = new TouchButtons(document.body, coarse);
  const placeButtons = (): void => {
    buttons.place(window.innerWidth, window.innerHeight, readSafeArea());
    // A very short screen: raise the road line clear of the buttons (0 almost always).
    game.lift = buttons.layout.lift;
  };
  /** The hint bar sits between the buttons shown now (S2.2, "The hint bar"). */
  const barBox = (): HintBarBox => hintBarBox(window.innerWidth, window.innerHeight, readSafeArea(), buttons.layout, buttons.which);
  onResize.push(placeButtons, () => game.setView(view));
  placeButtons();
  game.setView(view);
  game.look = loadLook(store);
  // Reduced motion: crates hang still and crate kobo do not fly (S2.4).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  game.still = reduceMotion.matches;
  reduceMotion.addEventListener('change', () => {
    game.still = reduceMotion.matches;
  });
  const sound = new Sound();

  const loop = new FixedLoop({
    update: (dt) => game.update(dt),
    render: () => {
      game.render(g, view);
      if (playing) {
        hud.update(game.run, menus.sound);
        buttons.pressed(controls.dir, controls.jumpHeld > 0);
      }
      placeWellButton();
    },
  });

  /** In a run (HUD showing), including while paused. */
  let playing = false;
  // The tap that pressed "Start running": a second tap on the same spot right after it is the
  // other half of a double tap, not a jump. A tap anywhere else jumps at once.
  let startTap: (TapPoint & { t: number }) | null = null;
  // Pause when the tab is hidden or the phone turns upright (the "turn sideways" note shows).
  const portrait = window.matchMedia('(orientation: portrait)');

  /** The street, the well and its room, or the hall fight is being played (not game over or won). */
  const PLAY_PHASES: ReadonlySet<RunPhase> = new Set(['run', 'arena', 'wellDown', 'roomIn', 'room', 'wellUp']);
  const inPlay = (): boolean => PLAY_PHASES.has(game.run.phase);

  /** Pause the run and show the pause screen (button, app switch, or phone upright). */
  function pause(by?: MouseEvent): void {
    if (!playing || game.paused || !inPlay()) return;
    loop.pause();
    game.paused = true;
    toast.hide();
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
  /** Plays a street (or the hall) from its start: full lives, 0 kobo. */
  function startRun(at: TapPoint | null, to: number | 'hall' = where): void {
    where = to;
    startTap = at ? { ...at, t: performance.now() } : null;
    menus.show(null);
    toast.hide();
    playing = true;
    document.body.classList.add('playing');
    controls.releaseAll();
    // The hall's start words come from the run's first step ('hallStart', 'parcelShield').
    game.begin(menus.gentle, levelOf(where), where === 'hall' ? { parcel: parcelForHall } : {});
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
    where = firstStreet;
    game.reset(startLevel);
    menus.show('title');
  }

  const menus = new Menus(document.body, store, game.look, {
    // The title always starts at street 1 for now (saved progress comes in piece N2).
    start: (at) => startRun(at, firstStreet),
    restart: (at) => startRun(at),
    next: (at) => startRun(at, typeof where === 'number' && where + 1 < streets.length ? where + 1 : 'hall'),
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

  /** Go down at an entrance well, or Go up the room's rope (S2.5): the controls lock. */
  function useWell(kind: WellButtonKind): void {
    if (!playing || game.paused) return;
    const done = kind === 'down' ? game.goDown() : game.goUp();
    if (done) controls.releaseAll();
  }
  const wellButton = new WellButton(document.body, useWell);
  /** The Go down / Go up button over the well or the room's rope, where it is on screen now. */
  function placeWellButton(): void {
    const run = game.run;
    const kind: WellButtonKind | null = !playing || game.paused || menus.current ? null : run.wellHere ? 'down' : run.underRope ? 'up' : null;
    if (kind === null) {
      wellButton.update(null, '', null);
      return;
    }
    // World place: the crank top over the well, or the room's bucket handle.
    const wx = kind === 'down' ? run.wellHere!.x : run.room!.room.exitX;
    const wy = kind === 'down' ? game.level.groundY - WELL.frameH : ROOM_ROPE_BUCKET_Y - 6;
    const k = canvas.getBoundingClientRect().width / view.width;
    const box = wellButtonBox({ x: (wx - game.camera) * k, y: (wy - game.lift) * k }, window.innerWidth, buttons.layout, readSafeArea());
    const touch = buttons.touch;
    const label = kind === 'down' ? (touch ? WORDS.well.down : WORDS.well.downKeys) : touch ? WORDS.well.up : WORDS.well.upKeys;
    wellButton.update(kind, label, box);
  }
  const placeBar = (): void => toast.place(barBox(), window.innerHeight);
  buttons.onChange = placeBar;
  placeBar();
  sound.enabled = menus.sound;
  menus.touchWords = () => buttons.touch;

  const W = WORDS.toast;
  /** S2.2: a level hint shows 3.5 s in the hint bar. */
  const HINT_MS = 3500;
  game.onEvent = (e) => {
    switch (e.type) {
      case 'kobo':
        sound.play('kobo');
        break;
      case 'crate': {
        sound.play('crateHit');
        if (e.contents === 'kobo') {
          sound.play('crateKobo');
          // The three kobo fly to the counter: where it is on screen now, in world units.
          const r = document.querySelector('.hud-kobo')?.getBoundingClientRect();
          const k = canvas.getBoundingClientRect().width / view.width;
          if (r && r.width > 0 && k > 0) game.koboTarget = { x: (r.x + r.width / 2) / k, y: (r.y + r.height / 2) / k };
        } else sound.play('cratePop');
        break;
      }
      case 'crateEmpty':
        sound.play('crateEmpty');
        break;
      case 'food':
        sound.play('food');
        toast.show(W[e.kind], 3200);
        break;
      case 'hint':
        toast.show(hintWords(e.words, controls.lastKind), HINT_MS);
        break;
      case 'wake':
        if (e.kind === 'drum') sound.play('drumWake');
        break;
      case 'bounce':
        sound.play(e.kind === 'goat' ? 'meeh' : e.kind === 'drum' ? 'drumBounce' : 'bounce');
        break;
      case 'smash':
        sound.play(e.kind === 'goat' ? 'meeh' : 'smash');
        break;
      case 'hit':
        toast.hide(); // a lost life: the bar hides at once (S2.2)
        sound.play('hit');
        break;
      case 'shieldPop':
        sound.play('shieldPop');
        toast.show(W.shieldUsed);
        break;
      case 'fall':
        toast.hide();
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
        menus.showGameOver({ kobo: game.run.kobo, lives: 0, hall: game.run.inHall });
        break;
      case 'parcelShield':
        // S2.7 t = 0 with a parcel: the shield is on; the boss words follow.
        sound.play('arena');
        toast.show(W.parcelShield, 3000);
        break;
      case 'hallStart':
        if (!game.run.parcelShield) sound.play('arena');
        toast.show(W.hallStart, 3000);
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
      case 'wellDown':
        sound.play('wellDown');
        break;
      case 'room':
        sound.play('roomThump');
        toast.show(W.roomArrive, HINT_MS);
        break;
      case 'parcel':
        sound.play('parcel');
        toast.show(W.parcel, HINT_MS);
        break;
      case 'wellUp':
        sound.play('wellUp');
        break;
      case 'wellBack':
        toast.show(W.backOnStreet);
        break;
      case 'streetCleared':
        // S2.10 Street cleared: "Next street", or after street 3 "Go to Go-Slow Hall".
        controls.releaseAll();
        loop.pause();
        toast.hide();
        if (game.run.parcel) parcelForHall = true;
        menus.showCleared({ name: game.level.name, kobo: game.run.kobo, last: typeof where === 'number' && where + 1 >= streets.length });
        break;
      case 'bossThrow':
        if (e.kind === 'honk') sound.play('honk');
        else if (e.kind === 'highHonk') sound.play('highHonk');
        break;
      case 'bossHit':
        sound.play('greenHit');
        if (e.left > 0) toast.show(W.greenLight(e.left));
        break;
      case 'bossLight':
        // S2.7: before the phase with high honks starts.
        if (e.highHonks) toast.show(W.highHonks, HINT_MS);
        break;
      case 'bossDefeat':
      case 'dust':
        break;
      case 'hallClear':
        sound.play('bossWin');
        toast.show(W.hallClear, 2000);
        break;
      case 'lamp':
        sound.play('hallLamp');
        break;
      case 'switchedOn':
        toast.show(W.switchedOn, 3000);
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
      // S2.2 Keys: at a well Down, S, Enter or E go down; under the room's rope Enter or E go up.
      onWellKey: (code) => {
        if (!playing || game.paused || menus.current) return;
        if (game.run.wellHere) useWell('down');
        else if (game.run.underRope && WELL_UP_KEYS.has(code)) useWell('up');
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
    get anim() {
      return { gait: game.gait, skid: game.skid, dust: game.dustAge < DUST_TIME };
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
        busTime: r.phase === 'bus' || r.phase === 'cleared' ? r.endSteps / STEPS_PER_SECOND : 0,
        checkpoint: r.checkpointReached,
        safe: r.safe,
        power: { ...r.power },
        hazards: r.hazards.map((z) => ({ kind: z.kind, x: z.x, mode: z.mode })),
        /** Kobo picked up one by one (not from crates or smashes). */
        coinsTaken: r.coins.reduce((n, c) => n + (c.taken ? 1 : 0), 0),
        /** S2.5: carrying the garri parcel; below the street; how dark the screen is. */
        parcel: r.parcel,
        below: r.below,
        fade: r.fade,
        atWell: r.wellHere ? r.wellHere.x : null,
        underRope: r.underRope,
        /** The room being visited (null on the street). */
        room: r.room
          ? {
              id: r.room.room.id,
              exitX: r.room.room.exitX,
              entryX: r.room.room.entryX,
              coins: r.room.coins.map((c) => ({ x: c.x, y: c.y, taken: c.taken })),
              crates: r.room.crates.map((c) => ({ x: c.x, bottomY: c.bottomY, contents: c.contents, open: c.open })),
              gift: r.room.gift ? { x: r.room.gift.x, y: r.room.gift.y, taken: r.room.gift.taken } : null,
              platforms: r.room.room.terrain.platforms.map((p) => ({ ...p })),
            }
          : null,
        crates: r.crates.map((c) => ({
          x: c.x,
          bottomY: c.bottomY,
          contents: c.contents,
          open: c.open,
          angle: game.crateAngle(c),
          food: c.food ? { kind: c.food.kind, y: c.food.y, landed: c.food.landed, taken: c.food.taken } : null,
        })),
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
        hall: level.hall ? { ...level.hall } : null,
        groundY: level.groundY,
        lights: (level.boss?.lights ?? []).map((l) => ({ ...l })),
        platforms: level.terrain.platforms.map((p) => ({ ...p })),
        wells: level.wells.map((w) => ({ ...w })),
      };
    },
    get below() {
      // Cheap: below the street (the well room shows), for per-frame logs.
      return game.run.below;
    },
    get wellButton() {
      // The Go down / Go up button (S2.5) on screen now: which, its words, its box (CSS px).
      const s = wellButton.shown;
      if (!s) return null;
      const r = wellButton.el.getBoundingClientRect();
      return { kind: s.kind, label: s.label, x: r.x, y: r.y, w: r.width, h: r.height };
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
            aim: b.aim,
            /** Seconds in this mode (in 'defeat': since the third hit). */
            modeTime: b.modeTime,
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
    get hintBar() {
      // The hint bar as laid out now, CSS px, and whether its words fit uncut (S2.2).
      const el = document.querySelector<HTMLElement>('.toast')!;
      const r = el.getBoundingClientRect();
      return {
        words: toast.text,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        font: parseFloat(getComputedStyle(el).fontSize),
        fits: el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth,
        limits: barBox(),
      };
    },
    get drawn() {
      // Drawn boxes (CSS px, generous) of everything on screen the player collects or reacts to,
      // for the S2.2 check that the hint bar never covers any of them.
      const k = canvas.getBoundingClientRect().width / view.width;
      const cam = game.camera;
      const lift = game.lift;
      const out: { what: string; x: number; y: number; w: number; h: number }[] = [];
      const add = (what: string, x0: number, y0: number, x1: number, y1: number): void => {
        const x = (x0 - cam) * k;
        const w = (x1 - x0) * k;
        if (x + w < 0 || x > window.innerWidth) return;
        out.push({ what, x, y: (y0 - lift) * k, w, h: (y1 - y0) * k });
      };
      const r = game.run;
      const level = game.level;
      const gy = level.groundY;
      const b = r.boss;
      if (b) {
        // Go-Slow Hall: the go lights (with the lit one's arrow), every throw, and the hero.
        for (const l of level.boss!.lights) add('light', l.x, l.y - 52, l.x + l.w, l.y + 15);
        for (const t of b.throws) {
          if (t.kind === 'tyre') add('tyre', t.x - 13, t.y - 25, t.x + 13, t.y + 2);
          else if (t.kind === 'honk') add('honk', t.x - 30, t.y - 20, t.x + 30, t.y + 20);
          else add('high honk', t.x - 30, t.y - 15, t.x + 30, t.y + 15);
        }
        const hh = game.hero;
        add('hero', hh.x - 20, hh.y - 58, hh.x + 20, hh.y + 2);
        return out;
      }
      if (r.room) {
        // Below the street: the room's kobo, crate, gift, the rope's bucket and the hero.
        const play = r.room;
        for (const c of play.coins) if (!c.taken) add('kobo', c.x - 11, c.y - 11, c.x + 11, c.y + 11);
        for (const c of play.crates) add('crate', c.x - 20, c.bottomY - 90, c.x + 20, c.bottomY + 1);
        if (play.gift && !play.gift.taken) add('parcel', play.gift.x - 15, play.gift.y - 15, play.gift.x + 15, play.gift.y + 15);
        add('rope bucket', play.room.exitX - 9, ROOM_ROPE_BUCKET_Y - 8, play.room.exitX + 9, ROOM_ROPE_BUCKET_Y + 12);
        const hh = game.hero;
        add('hero', hh.x - 20, hh.y - 58, hh.x + 20, hh.y + 2);
        return out;
      }
      for (const c of r.coins) if (!c.taken) add('kobo', c.x - 11, c.y - 11, c.x + 11, c.y + 11);
      for (const f of r.foods) if (!f.taken) add('food', f.x - 20, f.y - 22, f.x + 20, f.y + 22);
      if (r.hazardFade < 1) {
        for (const z of r.hazards) {
          if (z.mode === 'gone') continue;
          if (z.kind === 'goat') add('goat', z.x - 32, z.y - 52, z.x + 32, z.y + 3);
          else add(z.kind, z.x - 18, z.y - 40, z.x + 18, z.y + 4);
        }
      }
      for (const c of r.crates) {
        // The crate swings about the point where its rope meets the line, 88 u above its bottom.
        const a = game.crateAngle(c);
        const dx = Math.sin(a) * 88;
        add('crate', c.x - 17 + Math.min(0, dx), c.bottomY - 90, c.x + 17 + Math.max(0, dx), c.bottomY + 1);
        const f = c.food;
        if (f && !f.taken) add('food', c.x - 20, f.y - 22, c.x + 20, f.y + 22);
      }
      for (const w of level.wells) for (const x of [w.x, w.exitX]) add('well', x - 19, gy - 31, x + 19, gy + 1);
      for (let i = 1; i < level.ground.length; i++) {
        const a = level.ground[i - 1]![1];
        const b = level.ground[i]![0];
        add('pit lip', a - 6, gy - 2, a + 6, gy + 12);
        add('pit lip', b - 6, gy - 2, b + 6, gy + 12);
      }
      const h = game.hero;
      // A hero falling into a pit may pass behind the bar (S2.2 qa check 2).
      if (h.y <= gy + 2 && !r.boarded) add('hero', h.x - 20, h.y - 58, h.x + 20, h.y + 2);
      const end = level.end;
      if (end) {
        const atBus = r.phase === 'bus' || r.phase === 'cleared';
        const dx = busEndAt(atBus ? r.endSteps / STEPS_PER_SECOND : 0).dx ?? 0;
        add('bus', end.x + END_BUS_BACK + dx, gy - 80, end.x + END_BUS_FRONT + dx, gy + 2);
        add('BUS PARK board', end.x + BUS_BOARD.dx, gy + BUS_BOARD.dy, end.x + BUS_BOARD.dx + BUS_BOARD.w, gy + BUS_BOARD.dy + BUS_BOARD.h);
      }
      return out;
    },
    get busBoard() {
      // The "BUS PARK" board as drawn on screen right now, CSS px (null on a level with no bus park).
      const end = game.level.end;
      if (!end) return null;
      const k = canvas.getBoundingClientRect().width / view.width;
      const gy = game.level.groundY;
      return {
        x: (end.x + BUS_BOARD.dx - game.camera) * k,
        y: (gy + BUS_BOARD.dy - game.lift) * k,
        w: BUS_BOARD.w * k,
        h: BUS_BOARD.h * k,
      };
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
          /** World units the picture is raised on a very short screen. */
          readonly lift: number;
        };
      };
      readonly look: { readonly skin: number; readonly hair: number; readonly outfit: number };
      /** How the hero is drawn: walk or run, skid (0 to 1), dust puff showing. */
      readonly anim: { readonly gait: 'walk' | 'run'; readonly skid: number; readonly dust: boolean };
      readonly screen: MenuScreen | 'play';
      readonly run: {
        readonly phase: RunPhase;
        readonly lives: number;
        readonly maxLives: number;
        readonly kobo: number;
        readonly time: number;
        /** Seconds since the hero reached the bus door (0 before). */
        readonly busTime: number;
        readonly checkpoint: boolean;
        readonly safe: number;
        readonly power: { readonly corn: number; readonly amala: number; readonly shield: boolean };
        readonly hazards: readonly { readonly kind: string; readonly x: number; readonly mode: string }[];
        readonly coinsTaken: number;
        readonly parcel: boolean;
        readonly below: boolean;
        readonly fade: number;
        /** The entrance well x the hero stands at (Go down shows), or null. */
        readonly atWell: number | null;
        readonly underRope: boolean;
        readonly room: {
          readonly id: string;
          readonly exitX: number;
          readonly entryX: number;
          readonly coins: readonly { readonly x: number; readonly y: number; readonly taken: boolean }[];
          readonly crates: readonly { readonly x: number; readonly bottomY: number; readonly contents: string; readonly open: boolean }[];
          readonly gift: { readonly x: number; readonly y: number; readonly taken: boolean } | null;
          readonly platforms: readonly { readonly x: number; readonly y: number; readonly w: number }[];
        } | null;
        /** Hanging crates (S2.4): open or full, swing in radians, the food popped out of a food crate. */
        readonly crates: readonly {
          readonly x: number;
          readonly bottomY: number;
          readonly contents: string;
          readonly open: boolean;
          readonly angle: number;
          readonly food: { readonly kind: string; readonly y: number; readonly landed: boolean; readonly taken: boolean } | null;
        }[];
      };
      readonly level: {
        readonly id: string;
        readonly manual: boolean;
        readonly spawnX: number;
        readonly startWall: number;
        readonly end: { readonly x: number; readonly wall: number } | null;
        readonly gaps: readonly (readonly [number, number])[];
        readonly checkpoint: number;
        /** Go-Slow Hall's size and the hero's limits, or null on a street. */
        readonly hall: { readonly width: number; readonly leftLimit: number; readonly rightLimit: number } | null;
        readonly groundY: number;
        readonly lights: readonly { readonly x: number; readonly y: number; readonly w: number }[];
        /** Roofs and other one-way platforms: top y, from x to x + w. */
        readonly platforms: readonly { readonly x: number; readonly y: number; readonly w: number }[];
        readonly wells: readonly { readonly x: number; readonly exitX: number; readonly room: string }[];
      };
      /** Below the street: the well room shows (cheap, for per-frame logs). */
      readonly below: boolean;
      /** The Go down / Go up button on screen now (CSS px), or null. */
      readonly wellButton: { readonly kind: 'down' | 'up'; readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
      readonly toast: string;
      /** The hint bar now (CSS px): words showing, its box, font size, whether the words fit, and its limits. */
      readonly hintBar: {
        readonly words: string;
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
        readonly font: number;
        readonly fits: boolean;
        readonly limits: HintBarBox;
      };
      /** Drawn boxes (CSS px) of every kobo, food, hazard, crate, well, pit lip, the hero, the bus and its board on screen; in the hall the lights, the throws and the hero. */
      readonly drawn: readonly { readonly what: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
      readonly boss: {
        readonly hits: number;
        readonly lit: number;
        readonly litLight: { readonly x: number; readonly y: number; readonly w: number } | null;
        readonly mode: string;
        readonly aim: 'low' | 'high';
        readonly modeTime: number;
        readonly defeated: boolean;
        readonly throws: readonly { readonly kind: string; readonly x: number; readonly y: number; readonly vx: number }[];
      } | null;
      /** Where the hero stands across the screen, 0 to 1. */
      readonly heroScreenX: number;
      readonly sound: { readonly enabled: boolean; readonly started: boolean };
      /** The "BUS PARK" board's drawn box on screen, CSS px; null when the level has no bus park. */
      readonly busBoard: { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
    };
  }
}
