import './screens/screens.css';
import { Controls, attachControls, type Source } from './engine/input';
import { FixedLoop } from './engine/loop';
import { fitView, readSafeArea, type View } from './engine/view';
import street1Data from './data/levels/lagos-1.json';
import street2Data from './data/levels/lagos-2.json';
import street3Data from './data/levels/lagos-3.json';
import hallData from './data/levels/lagos-hall.json';
import wellRoomData from './data/levels/lagos-well.json';
import { Sound, soundLength } from './engine/sound';
import { Music } from './engine/music';
import { TUNES } from './art/tunes';
import { CORN_GAIN, CORN_LOUD, CornDirector, MusicDirector, cornCount, musicAudible } from './game/music-cue';
import { listenForAudioGestures } from './engine/audio-unlock';
import { AnimalCalls, TkGate } from './game/animal-calls';
import { BUS_BOARD, END_BUS_BACK, END_BUS_FRONT, busEndAt } from './art/roadside';
import { DUST_TIME, Game, heroScreenX } from './game/game';
import { parseLevel, type Level } from './game/level';
import { STEPS_PER_SECOND, type RunPhase } from './game/run';
import { parseRoom } from './game/well';
import { WELL } from './art/well';
import { ROOM_ROPE_BUCKET_Y } from './art/wellRoom';
import { drawFufuIcon } from './art/fufu';
import { drawGoat } from './art/hazards';
import { drawFoodIcon, drawKobo } from './art/items';
import { WELL_UP_KEYS, pauseKeyAction } from './engine/input';
import { hasSavedLook, loadLook } from './game/save';
import { KEY_DASH, LAGOS, Progress, streetOpen, streetRecord, switchedOn } from './game/progress';
import { FIRST_BOOM, HALL_PRIZE, HERO_START, KEY_CITY, addKobo, canFix, isBuilt, leftOf, winPrize, withHint, writeCity } from './game/city';
import { CityLife } from './game/cityLife';
import { KANO, OGUN, OGUN_TRAYS, StateCity, arrived, openStates, statePart, stateOpen, stateProgress, wallet, whereNow } from './game/states';
import { WorldParts } from './worlds/load';
import type { BuildId } from './art/payspot';
import type { Mission } from './screens/city';
import { KOBO_PER_COIN, formatMoney } from './game/money';
import { ThrowButton, TouchButtons, WellButton, hintBarBox, wellButtonBox, type HintBarBox, type WellButtonKind } from './screens/controls';
import { CornCount, Hud, Toast } from './screens/hud';
import { KANO_WORDS, OGUN_WORDS, WORDS, WORLD_PART_WORDS, hintWords } from './screens/words';
import { Menus, boardNow, isSecondTap, type BoardModule, type LeaveTo, type MenuScreen, type TapPoint } from './screens/menus';
import type { Where } from './screens/streets';
import type { StopId } from './screens/road';
import { h } from './screens/dom';
import { firstStreetOf } from './art/firstLook';
/** S3e0 part 6: each street's first screen follows its city spot's fix. */
const FIRST_FIX = { alausa: 'road', computerVillage: 'mast', ikeja: 'lamps' } as const;
import { IntroScreen } from './screens/intro';
import { createStore } from './storage';
import { loadPeople, onPeople } from './game/peopleLoad';
import { registerServiceWorker } from './sw-register';
import { bannerShows, inAttempt } from './update';
import { UpdateBanner } from './screens/update-banner';
import { isNativeApp } from './native/is-native';
import type { NativeApp } from './native/app';
import type { LaneSession } from './lane/session';
import { KEY_LANE, ONE_RUN_BOTH_FIXES, haulWords, readLane, writeLane, type Haul, type LaneSave } from './lane/rewards';
import { TILT_APP_ASKS_AGAIN, TiltAccess } from './game/tilt';
import type { MissionBook, MissionDef, MissionGo } from './game/missions';
import type { MissionChip } from './screens/missions';
/** A mission's place for the state's lane run (game/missions.ts LANE: that file loads with the board). */
const LANE: (typeof import('./game/missions'))['LANE'] = 0;
import type { GameEvent } from './game/game';

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

/** U1: set by startGame; called when a new version of the game is ready. */
let updateReady = (): void => {};
// ST1a, decision 55: the store app carries its files inside it and updates through the store,
// so no service worker and no update prompt there.
const updates = isNativeApp() ? null : registerServiceWorker(() => updateReady());

const query = new URLSearchParams(location.search);
if (query.has('gallery')) {
  // Debug only: the art galleries (?gallery, ?gallery=lane, ogun-city, hall-ogun ...; &t=1.5 holds the time,
  // &still=1 the reduced-motion look). The list is in src/art/galleries.ts; built outside the offline cache.
  void import('./art/galleries').then(({ openGallery }) => openGallery(query, g, () => view));
} else if (query.has('sounds')) {
  // Debug only: a board of every code-made sound, the goat's "meeh" and the birds' "hawk hawk" first (decision 62).
  void import('./screens/soundBoard').then(({ showSoundBoard }) => showSoundBoard(document.body));
} else {
  startGame();
}

function startGame(): void {
  const store = createStore();
  /** The store app's extras (ST1a); null on the web. */
  let nativeApp: NativeApp | null = null;
  /** S2.8: streets done, best kobo, the saved parcel and the hall, under gidi-progress. */
  const progress = new Progress(store);
  /** O1b1: later states' lazy parts (docs/ogun.md 9.2). Ogun's files are fetched only when asked for. */
  // K1b: Kano's part the same way (it loads and plays without Ogun's, KN-R10).
  const worlds = new WorldParts({ ogun: () => import('./worlds/ogun'), kano: () => import('./worlds/kano') }, () => navigator.onLine !== false);
  /** S3f0 part 25.5: can this phone tilt (a quiet 1.5 s check on Android; iPhones know at once). */
  const tilt = new TiltAccess();
  // Lagos streets 1 to 3 by hand (S2.6), each loaded from its level file and drawn by its
  // `theme`, then Go-Slow Hall (S2.7, lagos-hall.json). ?level=lagos-2, lagos-3 or lagos-hall
  // makes "Play" start there (for testing).
  const hall = parseLevel(hallData);
  const streets: readonly Level[] = [street1Data, street2Data, street3Data].map((d) => parseLevel(d));
  const asked = new URLSearchParams(location.search).get('level');
  /** S3f2: ?level=lagos-lane makes "Play" start the lane run (for testing). */
  const askedLane = asked === 'lagos-lane';
  const askedAt: Where | null = asked === hall.id ? 'hall' : streets.findIndex((l) => l.id === asked) >= 0 ? streets.findIndex((l) => l.id === asked) : null;
  /** O2b: ?level=ogun-1 makes "Play" load the Ogun part and start Ota (for testing); O5b: ogun-hall, Pothole Hall. */
  const askedOgun = /^ogun-([1-3]|hall)$/.exec(asked ?? '');
  /** K2b: ?level=kano-1 makes "Play" load the Kano part and start Kurmi (for testing). */
  const askedKano = asked === 'kano-1';
  const firstStreet: Where = askedAt ?? 0;
  /** The street being played (index into streets), or 'hall' for Go-Slow Hall after street 3. */
  let where: Where = firstStreet;
  const levelOf = (w: Where): Level => (w === 'hall' ? hall : streets[w]!);
  const startLevel = levelOf(firstStreet);
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
  const barBox = (): HintBarBox => hintBarBox(window.innerWidth, window.innerHeight, readSafeArea(), buttons.layout, buttons.which, throwButton.shown);
  /** S2.15: Throw (button or X): one fufu ball, only while playing. */
  function throwFufu(): void {
    if (!playing || game.paused || menus.current || !inPlay()) return;
    game.throwFufu();
  }
  const throwButton = new ThrowButton(document.body, throwFufu);
  onResize.push(placeButtons, () => game.setView(view), () => lane?.resize());
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
  // O2, S2.9: the music player shares the sound's AudioContext (one context is lighter on a
  // phone). It schedules its own notes on a 25 ms timer, 0.1 s ahead: the game never waits.
  const music = new Music();
  const director = new MusicDirector(music);
  // S2.9 corn tune: its own player and output (0.8) on the same context, over the street tune.
  const cornMusic = new Music({ gain: CORN_GAIN });
  /** O1b2: Ogun's welcome tune (from its part), once, as the bus passes under the arch. */
  const gateMusic = new Music();
  const corn = new CornDirector({
    start: () => {
      cornMusic.setLevel(1, 0);
      cornMusic.restart('corn', 0);
    },
    step: (st) => {
      cornMusic.setTempoSoon(st);
      cornMusic.setLevel(CORN_LOUD[st] ?? 0.1, 0.15);
      cornMusic.accent(); // one agogo note on each new number
    },
    stop: (fade) => cornMusic.stop(fade),
    pause: () => cornMusic.pause(),
    resume: () => cornMusic.resume(),
    // One setting each: the street (or well) tune and every sound effect.
    duck: (level, ramp) => {
      music.setLevel(level, ramp);
      sound.setEffectsLevel(level, ramp);
    },
  });
  /** The corn ran out by itself (not cut short by a lost life or replaced): "Corn is done". */
  let cornRanOut = false;
  /** The corn tune and the 5, 4, 3, 2, 1 follow the corn timer (cheap every frame). */
  function syncCorn(): void {
    const run = game.run;
    const active = playing && where !== 'hall' && (run.phase === 'run' || run.below || run.phase === 'wellDown');
    corn.update({
      corn: run.power.corn,
      active,
      audible: sound.enabled && menus.music,
      held: game.paused || document.hidden || menus.current === 'pause',
    });
    // The count shows even with Music or Sound off (Tp 3a); it takes the hint bar's place.
    const n = active ? cornCount(run.power.corn) : 0;
    count.set(n, cornRanOut);
    cornRanOut = false;
    toast.hold(n > 0);
  }
  /** True inside startRun: the old run's state must not pick a tune; the new run picks it at the end. */
  let startingRun = false;
  /** Music follows what shows now: the screen, the street, the well room, hall hits, a hidden page. */
  function syncMusic(): void {
    if (startingRun) return;
    // S3f3: a lane run drives its own tune (LaneHooks.music); only a hidden page stops it here.
    if (lane || laneLoading) {
      if (document.hidden) {
        music.pause();
        sound.setCloseHum(false);
      }
      return;
    }
    syncCorn();
    const run = game.run;
    director.update({
      screen: menus.current ?? (playing ? 'play' : null),
      where,
      below: run.below,
      hits: run.arena?.tempo ?? run.boss?.hits ?? 0,
      hidden: document.hidden,
    });
  }

  /** The street was drawn last on the game canvas (the city and the intro paint it over once). */
  let streetUnder = true;
  const loop = new FixedLoop({
    update: (dt) => {
      game.update(dt);
      // 5W W3: Lagos's working places fill while a challenge is being played (not paused, tab in front).
      if (playing && !game.paused && !document.hidden && inPlay()) cityLife.tick(dt);
    },
    render: () => {
      // S3f2: a lane run draws itself with its own loop.
      if (lane || laneLoading) return;
      // The city fills the whole screen and draws itself: the street under it is not drawn
      // (on a slow phone that was a second full-screen picture every frame while walking).
      // The intro story covers the whole screen too (city.md a2.9).
      if (menus.current !== 'city' && menus.current !== 'intro' && menus.current !== 'ride' && menus.current !== 'ogun' && menus.current !== 'kano') {
        game.render(g, view);
        streetUnder = true;
      } else if (streetUnder) {
        // Tp's phone: the street's last frame must not show anywhere round them (the camera
        // cutout strip, ST0 part 4), so the canvas is painted over once.
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#0f1a12';
        g.fillRect(0, 0, canvas.width, canvas.height);
        streetUnder = false;
      }
      if (playing) {
        hud.update(game.run, menus.sound);
        buttons.pressed(controls.dir, controls.jumpHeld > 0);
      }
      placeWellButton();
      placeThrowButton();
      syncCorn();
      syncHum();
      syncCrowd();
    },
  });

  /**
   * S3g1b (design.md "People everywhere" part 12): the crowd murmur plays, very quietly, while 5
   * or more people are on screen; never over a warning sound (the drum's roll, the high honk) or
   * the corn tune, never paused or hidden. The Sound switch silences it inside sound.ts (PE-R6).
   * Frame times also feed the people's backing off (part 11).
   */
  let warnUntil = 0;
  let lastFrameAt = 0;
  /** The loop stops (a card, the menus, a pause): the murmur stops with it. */
  function pauseLoop(): void {
    loop.pause();
    murmuring = false;
    sound.setMurmur(false);
    lastFrameAt = 0;
  }
  const warned = (name: 'drumWake' | 'highHonk'): void => {
    warnUntil = Math.max(warnUntil, performance.now() + soundLength(name) * 1000 + 150);
  };
  const crowdQuiet = (): boolean => performance.now() < warnUntil || game.run.power.corn > 0;
  function syncCrowd(): void {
    const now = performance.now();
    const live = playing && !game.paused && !menus.current && !document.hidden && inPlay();
    const p = game.people;
    if (p && live && lastFrameAt > 0) p.frame(now - lastFrameAt);
    if (p && live) p.endFrame();
    lastFrameAt = live ? now : 0;
    const murmur = live && (p?.seen ?? 0) >= 5 && !crowdQuiet();
    if (murmur !== murmuring) {
      murmuring = murmur;
      sound.setMurmur(murmur);
    }
  }
  let murmuring = false;
  // The people's chunk loads on its own (peopleLoad.ts); until it arrives the streets have none.
  onPeople((kit) => {
    const p = new kit.GamePeople();
    /** A cheer (at most one every 4 s: the people's own rule), never over a warning or the corn tune. */
    p.onSound = (name) => {
      if (!crowdQuiet()) sound.play(name);
    };
    game.people = p;
  });

  /**
   * S2.16 B3: the tech suit hums while it is worn in play; never while paused, on a card, with
   * the tab hidden or with Sound off (the Sound switch stops it inside sound.ts).
   */
  function syncHum(): void {
    sound.setHum(playing && !game.paused && !menus.current && !document.hidden && inPlay() && game.run.power.shield);
  }
  /** S2.16 B4: the dash is on once street 2's dash hint was reached (saved), or street 2 is done. */
  const dashSaved = (): boolean => progress.raw?.[KEY_DASH] === true || streetRecord(progress.state(LAGOS), 2).done;
  /** In a run (HUD showing), including while paused. */
  let playing = false;
  // The tap that pressed "Start running": a second tap on the same spot right after it is the
  // other half of a double tap, not a jump. A tap anywhere else jumps at once.
  let startTap: (TapPoint & { t: number }) | null = null;
  // Pause when the tab is hidden or the phone turns upright (the "turn sideways" note shows).
  const portrait = window.matchMedia('(orientation: portrait)');

  /** The street, the well and its room, or the hall fight is being played (not a finish, game over or won). */
  const inPlay = (): boolean => game.run.inPlay;

  // U1 (decision 52): "New version ready. Tap to update." One tap reloads into the new version.
  // Decision 68: never in a run and never on its Pause (a street, the well room, Go-Slow Hall or
  // a lane run), since the reload would quietly start the attempt again. Only on the result cards
  // and the other screens.
  const updateBanner = new UpdateBanner(document.body, () => updates?.apply());
  /** A run is being played or paused (the finish bus counts: the result card follows). */
  // The lane run's own result cards (bus stop, caught) count as result cards: the win and pickups are saved.
  const inRun = (): boolean => inAttempt(playing || (lane !== null && lane.stage !== 'card'), menus.current);
  const syncUpdate = (): void => updateBanner.set(bannerShows(updates?.state.ready ?? false, inRun()));
  updateReady = () => {
    syncUpdate();
    // Cheap, and only once an update is ready: follows the screens (a run ends, Pause opens).
    window.setInterval(syncUpdate, 250);
  };

  /** Pause the run and show the pause screen (button, app switch, or phone upright). */
  function pause(): void {
    if (lane) {
      if (!lane.running) return;
      lane.pause();
      menus.laneSoFar = lane.soFar;
      toast.hide();
      menus.show('pause');
      syncUpdate();
      return;
    }
    if (!playing || game.paused || !inPlay()) return;
    pauseLoop();
    game.paused = true;
    syncHum();
    toast.hide();
    controls.releaseAll();
    game.release();
    game.steer(0);
    menus.show('pause');
    syncUpdate();
  }
  function resume(): void {
    if (lane) {
      if (document.hidden || portrait.matches) return;
      menus.show(null);
      lane.resume();
      syncUpdate();
      return;
    }
    if (!playing || document.hidden || portrait.matches) return;
    menus.show(null);
    game.paused = false;
    loop.resume();
    syncUpdate();
  }
  /**
   * O2b: the Ogun street being played (Ota; its level from the Ogun part), or null for Lagos.
   * Its progress saves under states.ogun (decision 80: the one wallet, Ogun's own streets).
   */
  let ogunPlay: { level: Level; n: number } | null = null;
  /** O3b, O4b: the Ogun streets built so far (Ota, Abeokuta, Sagamu); "Next street" stops at the last one. */
  const OGUN_BUILT = 3;
  /** O5b: Pothole Hall, after Sagamu (ogunPlay.n). */
  const OGUN_HALL = 4;
  /** O5b: Go-Slow Hall's tune; an Ogun hall's tune stands in for it while that hall is played. */
  const lagosHallTune = TUNES.hall;
  /** K2b: a Kano street (Kurmi so far) being played, or null. */
  let kanoPlay: { level: Level; n: number } | null = null;
  /** K2b: the Lagos street tune; a later state's street tune (Kurmi's) stands in for it while that street is played. */
  const lagosStreetTune = TUNES.street;
  /** O2b: a Lagos street or hall from its start (an Ogun run ends here). */
  function lagosRun(at: TapPoint | null, to: Where): void {
    ogunPlay = null;
    kanoPlay = null;
    startRun(at, to);
  }
  /** K2b: Kano street n from its start (its part must have loaded; Kurmi so far). */
  function kanoRun(at: TapPoint | null, n: number): void {
    let level: Level | null = null;
    try {
      const raw = worlds.get(KANO)?.levels[`kano-${n}`];
      level = raw === undefined ? null : parseLevel(raw);
    } catch (err) {
      console.warn(err);
    }
    if (!level) {
      toast.show(KANO_WORDS.broken, 4000);
      return;
    }
    ogunPlay = null;
    kanoPlay = { level, n };
    missionFor = null;
    ogunFor = null;
    startRun(at, n - 1);
  }
  /** O2b: Ogun street n from its start (its part must have loaded; Ota and Abeokuta so far). */
  function ogunRun(at: TapPoint | null, n: number): void {
    const part = worlds.get(OGUN);
    const hall = n === OGUN_HALL;
    const raw = hall && !part?.hall ? undefined : part?.levels[hall ? 'ogun-hall' : `ogun-${n}`];
    let level: Level | null = null;
    try {
      level = raw === undefined ? null : parseLevel(raw);
      // O3b: Ogun's well room (the Ijebu garri store), from the Ogun part, beside Lagos's.
      const room = part?.levels['ogun-well'];
      if (level && room !== undefined && !game.rooms.has('ogun-well')) {
        const r = parseRoom(room);
        game.rooms = new Map([...game.rooms, [r.id, r]]);
      }
    } catch (err) {
      console.warn(err);
    }
    if (!level) {
      toast.show(WORLD_PART_WORDS.broken, 4000);
      return;
    }
    ogunPlay = { level, n };
    kanoPlay = null;
    if (hall) part?.hall?.newVisit?.(); // QA-O2-1: a new visit shows the first-try hints again (Play again does not come here)
    missionFor = null; // Lagos's fixes are never an Ogun street's mission
    ogunFor = null;
    startRun(at, hall ? 'hall' : n - 1);
  }
  /** Plays a street (or the hall) from its start: full lives, 0 kobo. */
  function startRun(at: TapPoint | null, to: Where = where): void {
    if (to !== where) missionFor = null;
    where = to;
    paidHome = false;
    startingRun = true;
    director.restart();
    const lagos = progress.state(LAGOS);
    startTap = at ? { ...at, t: performance.now() } : null;
    menus.show(null);
    toast.hide();
    playing = true;
    document.body.classList.add('playing');
    controls.releaseAll();
    // The hall's start words come from the run's first step ('hallStart', 'parcelShield').
    // S2.5 gift rules 5 and 6: with a saved parcel every hall try starts with the shield on, and
    // well rooms show 5 kobo instead of a second parcel.
    void loadPeople().catch(() => undefined); // S3g1b: in case the title's early fetch was missed
    const og = ogunPlay;
    const kp = kanoPlay;
    const own = og ? progress.state(OGUN) : kp ? progress.state(KANO) : lagos;
    // O2b: an Ogun street brings its own look from the Ogun part (set before begin: it restarts it).
    // K2b: a Kano street from the Kano part, with its own tune.
    game.skin = og ? (worlds.get(OGUN)?.street?.(og.level) ?? null) : kp ? (worlds.get(KANO)?.street?.(kp.level) ?? null) : null;
    TUNES.street = game.skin?.tune ?? lagosStreetTune;
    menus.ogunRun = og !== null;
    menus.kanoRun = kp !== null;
    if (og) for (const f of ['ikokore', 'ofada'] as const) hud.setIcon(f, (g) => game.skinDo((k) => k.icon?.(g, f, 16, 16, 0.85)));
    if (kp) hud.setIcon('kilishi', (g) => game.skinDo((k) => k.icon?.(g, 'kilishi', 16, 16, 0.85)));
    // O3b: the parcel chip shows the state's own parcel (Ijebu garri in Ogun).
    const parcelIcon = game.skin?.parcelIcon;
    hud.setParcelIcon(parcelIcon ? (g) => game.skinDo((k) => k.parcelIcon?.(g, 16, 16, 26)) : null);
    // O5b: Pothole Hall's fight and tune come from the Ogun part (the parcel is Ogun's own).
    const ogHall = og && where === 'hall' ? worlds.get(OGUN)?.hall : undefined;
    TUNES.hall = ogHall?.tune ?? lagosHallTune;
    // MS3c: in Garri for the mill the room always gives the parcel (still one saved at most: progress.ts).
    game.begin(menus.gentle, og ? og.level : kp ? kp.level : levelOf(where), where === 'hall' ? { parcel: own.parcel, arena: ogHall?.arena } : { parcelSaved: own.parcel && missionPlay?.goal !== 'garri', dash: dashSaved() });
    beginGo(og ? og.n : kp ? kp.n : typeof where === 'number' ? where + 1 : -1);
    const mk = ms();
    if (mk) hud.setChip(mk.chip.el);
    // S2.8: once Lagos (or Ogun, for its streets) is switched on its streets show their fixed look.
    game.fixed = where !== 'hall' && switchedOn(own);
    // S3e0 part 6 (W17 C): the first screen is tired or bright to match the street's city spot.
    // Scenery only: the level and the run are the same either way.
    const street = og || kp ? null : firstStreetOf(game.level.id);
    const fix = street ? FIRST_FIX[street] : null;
    game.firstLook = street && fix ? { street, look: isBuilt(cityLife.state, fix) ? 'bright' : 'tired', still: reduceMotion.matches } : null;
    if (game.firstLook) {
      runSaid.textContent = '';
      runSaid.textContent = game.level.name;
    }
    hud.show(true);
    buttons.show(true, game.level.manual);
    loop.resume();
    startingRun = false;
    syncMusic();
    syncUpdate();
    if (portrait.matches || document.hidden) pause();
  }
  /**
   * Leaves the run (saving nothing from it) for the city ("Home"), the title, Streets or Nigeria's
   * wheel. Home: the hero stands at the bus park, or Mission complete brings them by bus (5W W5).
   */
  function leave(to: LeaveTo, mission: Mission | null = null): void {
    // S3e0 part 7: the road opens on the stop just played (the hall's after a win).
    const at: StopId | null = lane ? 'lane' : where === 'hall' ? 'hall' : where === 0 || where === 1 || where === 2 ? where : null;
    // S3f3 part 2: leaving a lane run early ("Back to Lagos", LR-Q1 a) keeps its pickups and says so.
    if (lane && to === 'city' && mission === null) {
      const h = lane.haul;
      if (h.kobo > 0 || h.power > 0 || h.tech > 0) mission = { build: null, kobo: h.kobo, plain: true, line: WORDS.lane.broughtHome(haulWords(h)) };
    }
    // O6b, OG-R35: from an Ogun run, Home (and Take it home) go back to Ogun's city (from the first
    // visit), with the money brought home, and its road on the stop just played. OG-R39: a win
    // ("Take it home", a lane run won) puts "Mission complete!" over the line.
    const fromOgun = ogunPlay !== null || (lane !== null && laneOgun);
    // K2b: from a Kano street, Home goes back to Kano's home (Kano has no road or city yet, K6b).
    const fromKano = kanoPlay !== null;
    const ogunAt = lane ? 'expressway' : ogunPlay ? (['ota', 'abeokuta', 'sagamu', 'hall'][ogunPlay.n - 1] ?? null) : null;
    // MS3c: back home after a star in a helper's mission, the helper says thank you (once it is built).
    const go = missionGo;
    const built = fromOgun ? ((ogunCity.own['built'] as unknown[] | undefined) ?? []).includes('mill') : cityLife.state.built.includes('buka');
    const thanks = go && go.won > 0 && go.def.thanks && built ? go.def.thanks : null;
    endGo();
    missionPlay = null;
    if (thanks && to === 'city' && !fromOgun) mission = mission ? { ...mission, after: mission.after ? `${thanks} ${mission.after}` : thanks } : { build: null, kobo: 0, plain: true, line: thanks };
    closeLane();
    ogunPlay = null;
    kanoPlay = null;
    ogunFor = null;
    laneOgun = false;
    game.skin = null;
    TUNES.street = lagosStreetTune;
    menus.ogunRun = false;
    menus.kanoRun = false;
    playing = false;
    document.body.classList.remove('playing');
    hud.show(false);
    buttons.show(false);
    toast.hide();
    pauseLoop();
    controls.releaseAll();
    where = firstStreet;
    game.fixed = false;
    game.reset(startLevel);
    // OG-R39: Out of lives keeps the money (paid home at once): Home says so, with no heading.
    const lostLine = !mission && ogunAt !== 'expressway' && paidHome && brought > 0 ? WORDS.city.mission.brought(formatMoney(brought)) : null;
    const ogunLine = mission ? (mission.line ?? WORDS.city.mission.brought(formatMoney(mission.kobo))) : lostLine;
    if (fromKano && (to === 'city' || to === 'road')) menus.show('kano');
    else if (fromOgun && (to === 'city' || to === 'road')) menus.ogunHome(to, thanks ? (ogunLine ? `${ogunLine} ${thanks}` : thanks) : ogunLine, ogunAt, mission !== null && mission.plain !== true);
    else if (to === 'wheel') {
      menus.showWheel(fromKano ? 'kano' : fromOgun ? 'ogun' : 'city');
      // Lagos's cog turns on: a ratchet click, then a small bell (S2.12 sound 13).
      sound.play('cogRatchet');
      window.setTimeout(() => sound.play('cogBell'), 320);
    } else if (to === 'city') {
      if (cityLife.state.at) cityLife.set({ ...cityLife.state, at: { ...HERO_START } });
      menus.showCity(mission);
    } else if (to === 'road') menus.showRoad({ at });
    else if (to === 'ogun') {
      // O1b2: the Win screen's "On to Ogun": from Lagos (where "Not now" leaves the player), by bus.
      menus.showCity();
      menus.travelTo(OGUN);
    } else if (to === 'kano') {
      // K1b: Pothole Hall's "On to Kano": from Ogun's city (where "Not now" leaves the player), by bus.
      menus.ogunHome('city');
      menus.travelTo(KANO);
    } else menus.show(to);
  }

  /** S3f2: the lane run showing now (its code loads the first time one opens), or null. */
  let lane: LaneSession | null = null;
  let laneLoading = false;

  /**
   * ST-H3 (style 1.8 part 6 rule 2): the hero's run steps, jump and fall are made ahead in idle
   * moments while no run is played (a card, the city, the menus), so a run's first seconds never
   * draw the hero live. Once per look and screen size; looked at twice a second.
   */
  let warming = false;
  const idle: (f: (d: { timeRemaining(): number }) => void) => void = window.requestIdleCallback?.bind(window) ?? ((f) => window.setTimeout(() => f({ timeRemaining: () => 4 }), 60));
  const warm = (d: { timeRemaining(): number }): void => {
    warming = !playing && !lane && !laneLoading && !document.hidden && !game.prewarmHero(view, Math.min(6, d.timeRemaining() - 1));
    if (warming) idle(warm);
  };
  window.setInterval(() => {
    if (warming) return;
    warming = true;
    idle(warm);
  }, 500);
  let laneModule: Promise<typeof import('./lane/session')> | null = null;
  /** The fix the lane run was started for (Lights out or Slow internet), or null (part 2). */
  let laneFor: BuildId | null = null;
  /** O6b: the lane run is Ogun's Expressway (its level, look and save from the Ogun part). */
  let laneOgun = false;
  /** The corn count's place in the lane run (part 11); the streets put it back in their hint bar after. */
  let laneCountAt: HintBarBox | null = null;
  /** Part 25.4: the phone said no while the lane run's code was still loading. */
  let tiltNoPending = false;
  /**
   * S3f3 part 2, "Bringing it home": a win for a fix not built yet plays Mission complete at that
   * spot; any other end goes back to Lagos with "You brought ... home." (LR-Q2: and the other pin's hint).
   */
  function laneHome(won: boolean, haul: Haul): void {
    const st = cityLife.state;
    const build = won && laneFor && !isBuilt(st, laneFor) ? laneFor : null;
    const other: BuildId | null = laneFor === 'lamps' ? 'mast' : laneFor === 'mast' ? 'lamps' : null;
    const otherSpot = other === 'lamps' ? 'lightsOut' : 'slowInternet';
    let after: string | undefined;
    if (ONE_RUN_BOTH_FIXES && won && other && !isBuilt(st, other) && canFix(st, otherSpot) && !st.hints.includes('laneBoth')) {
      after = other === 'mast' ? WORDS.lane.alsoMast : WORDS.lane.alsoLamps;
      cityLife.set(withHint(st, 'laneBoth'), true);
    }
    const line = WORDS.lane.broughtHome(haulWords(haul));
    leave('city', build ? { build, kobo: haul.kobo, ...(after ? { after } : {}) } : { build: null, kobo: haul.kobo, plain: true, line, ...(after ? { after } : {}) });
  }
  /** Starts a lane run from 0 m ("3, 2, 1" first). Loads the lane run's code the first time. */
  function startLane(fix: BuildId | null = laneFor, ogun = laneOgun): void {
    if (laneLoading) return;
    const xw = ogun ? worlds.get(OGUN)?.lane : undefined;
    if (ogun && !xw) {
      toast.show(WORLD_PART_WORDS.broken, 4000);
      return;
    }
    askTiltOnRun();
    laneFor = fix === 'lamps' || fix === 'mast' ? fix : null;
    if (lane && laneOgun !== ogun) closeLane();
    laneOgun = ogun;
    if (lane) {
      menus.show(null);
      lane.start();
      syncUpdate();
      return;
    }
    missionFor = null;
    menus.show(null);
    toast.hide();
    hud.show(false);
    buttons.show(false);
    pauseLoop();
    controls.releaseAll();
    laneLoading = true;
    menus.laneRun = true;
    menus.ogunRun = ogun;
    ogunPlay = null;
    laneModule ??= import('./lane/session');
    laneModule
      .then(({ LaneSession }) => {
        laneLoading = false;
        if (!menus.laneRun) return; // left while it loaded
        lane = new LaneSession({
          canvas,
          g,
          look: () => game.look,
          gentle: () => menus.gentle,
          still: () => reduceMotion.matches,
          buttonsOn: () => menus.laneButtons,
          safe: readSafeArea,
          sound: (name) => sound.play(name),
          touch: () => buttons.touch,
          tiltOn: () => menus.laneTilt,
          tiltReady: () => tilt.ready,
          tiltAsks: () => tilt.ios && tilt.answer !== 'granted',
          askTilt: askTiltOnRun,
          tiltOffer: () => tilt.canTilt && !menus.tiltSaved && !readLane(progress.raw?.[KEY_LANE]).tiltOffered,
          tiltOffered: () => saveTiltMarks({ tiltOffered: true }),
          tryTilt: () => {
            menus.setTilt(true);
            if (tilt.ios) void tilt.ask('switch');
          },
          askPause: () => pause(),
          soundOn: () => sound.enabled,
          toggleSound: () => {
            sound.enabled = menus.toggleSound();
            director.switches(sound.enabled, menus.music);
          },
          // O6b: the Expressway's best and goals save under states.ogun.lane (the tilt marks stay Lagos's).
          laneSave: () => readLane(ogun ? statePart(progress.raw, OGUN)['lane'] : progress.raw?.[KEY_LANE]),
          saveLane: (part) => {
            // A broken copy is left alone (the same rule as the city part). The tilt marks are
            // main's (saveTiltMarks): the run's copy never writes over them.
            if (progress.broken && progress.raw === null) return;
            const now = readLane(progress.raw?.[KEY_LANE]);
            const out = writeLane({ ...part, tiltOffered: now.tiltOffered, tiltNoes: now.tiltNoes });
            if (ogun) progress.saveStatePart(OGUN, 'lane', out);
            else progress.savePart(KEY_LANE, out);
          },
          ...(xw ? { level: xw.level, laneLook: xw.look } : {}),
          bank: (d) => cityLife.set({ ...cityLife.state, kobo: cityLife.state.kobo + d.kobo, power: cityLife.state.power + d.power, tech: cityLife.state.tech + d.tech }),
          flush: () => cityLife.flush(),
          forFix: () => {
            if (xw) {
              const f = xw.forFix(ogunCity.own, cityLife.state);
              return f ? { bucket: f.bucket, left: f.left } : null;
            }
            if (!laneFor || isBuilt(cityLife.state, laneFor)) return null;
            return { bucket: laneFor === 'lamps' ? 'power' : 'tech', left: leftOf(cityLife.state, laneFor) };
          },
          setGentle: (on) => menus.setGentle(on),
          // MS3b: the goal chip in the top row; Power or Tech as it comes; the end cards' star line.
          missionChip: ms()?.chip.el ?? null,
          started: () => beginGo(LANE),
          gained: (power, tech) => {
            const go = missionGo;
            if (!go) return;
            go.count(go.def.goal === 'chips' ? tech : go.def.goal === 'bulbs' ? power : 0);
            msMade?.chip.update();
          },
          starLine,
          // OG-R39: a win says "Mission complete!" over the line; a loss says the line only if something came home.
          home: (r) => (ogun ? leave('city', r.won || r.haul.kobo > 0 || r.haul.power > 0 || r.haul.tech > 0 ? { build: null, kobo: r.haul.kobo, plain: !r.won, line: WORDS.lane.broughtHome(haulWords(r.haul)) } : null) : laneHome(r.won, r.haul)),
          changed: () => {
            syncUpdate();
            nativeApp?.screenChanged();
          },
          // Part 17: the lane tune (art's `lane`), 1 BPM faster each 100 m after the goal; the
          // guitar drops out under 15 m. The street director picks up again once the run closes.
          music: (m) => {
            if (!m) {
              if (music.place === 'lane') music.stop();
              director.restart();
              return;
            }
            music.setLayer('guitar', m.guitar);
            if (m.held || document.hidden) music.pause();
            else if (music.place !== 'lane') music.play('lane', m.tempo);
            else {
              music.resume();
              music.setTempo(m.tempo);
            }
          },
          closeHum: (on) => sound.setCloseHum(on && !document.hidden),
          murmur: (on) => sound.setMurmur(on && !document.hidden),
          // Part 11: the corn tune and its 5, 4, 3, 2, 1 count in the lane run, as on the streets
          // (S2.9): the lane tune and the effects turn down under it; the count shows in the hint
          // bar's place even with Music or Sound off.
          corn: (c) => {
            const steps = c ? Math.ceil(c.left * 60) : 0;
            corn.update({ corn: steps, active: c !== null, audible: sound.enabled && menus.music, held: c !== null && (c.held || document.hidden) });
            if (c && c.box !== laneCountAt) {
              laneCountAt = c.box;
              count.place(c.box, window.innerHeight);
            }
            count.set(c ? cornCount(steps) : 0, c !== null);
          },
        });
        lane.start();
        if (tiltNoPending) {
          tiltNoPending = false;
          lane.tiltDenied();
        }
        syncMusic();
        syncUpdate();
        if (portrait.matches || document.hidden) pause();
      })
      .catch(() => {
        // Offline before the lane run was ever cached: back to the city.
        laneLoading = false;
        laneModule = null;
        menus.laneRun = false;
        menus.showCity();
      });
  }
  /**
   * S3f0 part 25.4: a run's start or resume tap. With tilt on and an iPhone not asked this visit,
   * Apple's box asks now, inside the tap (never on load or a timer).
   */
  function askTiltOnRun(): void {
    if (menus.tiltSaved && tilt.needsAsk) void tilt.ask('run');
  }
  /** The `lane` save's tilt marks (25.1, 25.4): only these and the switch are kept, never an angle. */
  function saveTiltMarks(m: Partial<Pick<LaneSave, 'tiltOffered' | 'tiltNoes'>>): void {
    if (progress.broken && progress.raw === null) return;
    progress.savePart(KEY_LANE, writeLane({ ...readLane(progress.raw?.[KEY_LANE]), ...m }));
  }
  function closeLane(): void {
    menus.laneRun = false;
    if (!lane) return;
    lane.close();
    lane = null;
    murmuring = false;
    sound.setMurmur(false);
    // The lane run may have drawn with fewer pixels: back to the game's own canvas size.
    resize();
    // The corn count goes back to the streets' hint bar.
    laneCountAt = null;
    placeBar();
  }

  /** The live city (city.md (b), 5W): the `city` part of gidi-progress, kept in memory while the game runs. */
  const cityLife = new CityLife({
    load: () => progress.raw?.[KEY_CITY],
    // A broken copy is left alone until a street is finished (S2.8): the city lives in memory till then.
    save: (part) => (progress.broken && progress.raw === null ? false : progress.savePart(KEY_CITY, part)),
  });
  const city = () => cityLife.state;
  /** O6b: Ogun's own city part (fixes, trays, Booming meter) in memory; its trays fill with Lagos's (OG-R8). */
  const ogunCity = new StateCity(
    () => statePart(progress.raw, OGUN)['city'],
    (own) => {
      if (!(progress.broken && progress.raw === null)) progress.saveStatePart(OGUN, 'city', own);
    },
    OGUN_TRAYS,
  );
  cityLife.also = (dt) => void ogunCity.tick(dt);
  /** K1b: Kano's own city part (`states.kano.city`, never the wallet); no trays until Kano's city (K6b). */
  const kanoCity = new StateCity(
    () => statePart(progress.raw, KANO)['city'],
    (own) => {
      if (!(progress.broken && progress.raw === null)) progress.saveStatePart(KANO, 'city', own);
    },
    {},
  );
  /** O6b: the Ogun city spot a run from Ogun's city or road is for (its win brings what is left), or null. */
  let ogunFor: string | null = null;
  /** The music dip under the sting or the boom (city.md d7). */
  let musicDip = 0;
  /** The board the challenge being played was for (the Potholes card's "Run Alausa": the New road), or null. */
  let missionFor: BuildId | null = null;
  /** Money the last win brought home (whole kobo), for "Mission complete!". */
  let brought = 0;
  /** This run's money is already home (a hall win pays at the third hit, then 'win' follows). */
  let paidHome = false;
  /** O1b2: this hall win is the first one (set at the third hit, before it is saved). */
  let firstHallWin = false;
  // ---------------------------------------------------------------- MS3: quick missions
  /**
   * qa MS4: all a mission needs comes with the board's chunk (menus.ts preloadBoard, fetched while
   * the city sits idle), not the first load. Made once it is in: the `gidi-missions` save
   * (docs/missions.md part 3), Lagos's five (coin catch's stars from Alausa's level file; the unit
   * test checks the same) and the run's goal chip. A mission is only played from its card.
   */
  let msMade: { m: BoardModule; book: MissionBook; lagosDefs: MissionDef[]; chip: MissionChip } | null = null;
  function ms(): typeof msMade {
    const m = msMade ? null : boardNow();
    if (m) m.useArt({ kobo: drawKobo, food: drawFoodIcon, fufu: drawFufuIcon, goat: drawGoat });
    if (m) msMade = { m, book: new m.MissionBook(store), lagosDefs: m.withCoins(m.lagosMissions(), (n) => streets[n - 1]?.coins.length ?? 0), chip: new m.MissionChip() };
    return msMade;
  }
  let ogunDefsMade: MissionDef[] | null = null;
  /** Ogun's five, from its part once it has loaded (coin catch's stars from ogun-1.json). */
  const ogunDefs = (m: BoardModule): MissionDef[] => {
    if (ogunDefsMade) return ogunDefsMade;
    const part = worlds.get(OGUN);
    if (!part?.missions) return [];
    // A street's laid coins: each `kobo` row is [x, y, count] (the level file's own shape).
    const coinsAt = (n: number): number => {
      const rows = (part.levels[`ogun-${n}`] as { kobo?: unknown } | undefined)?.kobo;
      return Array.isArray(rows) ? rows.reduce((t: number, r) => t + (Number((r as unknown[])[2]) || 0), 0) : 0;
    };
    return (ogunDefsMade = m.withCoins(part.missions.list, coinsAt));
  };
  const defsOf = (k: NonNullable<typeof msMade>, state: string): MissionDef[] => (state === OGUN ? ogunDefs(k.m) : k.lagosDefs);
  /** The mission chosen on its card: it carries on through Play again, ends on leaving the run. */
  let missionPlay: MissionDef | null = null;
  /** This go at it (a new one at each start), or null. */
  let missionGo: MissionGo | null = null;
  const ownIcon = (d: MissionDef) => (d.state === OGUN ? worlds.get(OGUN)?.missions?.icon : undefined);
  /** MS3a: a go starts at `place` (a street number, or LANE): the chip shows its goal. */
  function beginGo(place: number): void {
    missionGo?.end();
    const k = ms();
    const d = k ? missionPlay : null;
    missionGo =
      k && d
        ? new k.m.MissionGo(d, place, k.book, (n, total) => {
            // MS-R2, MS-R3: kept the moment it fills, ₦2 each the first time (saved at once).
            cityLife.set(addKobo(cityLife.state, n * k.m.STAR_KOBO), true);
            starKobo += n * k.m.STAR_KOBO;
            sound.play('checkpoint');
            toast.show(k.m.BOARD_WORDS.star, 1000);
            runSaid.textContent = k.chip.star(total, d.stars.length);
          })
        : null;
    starKobo = 0;
    k?.chip.set(missionGo, k && d ? k.book.stars(d.id) : 0, d ? ownIcon(d) : undefined);
  }
  /** Money from this go's new stars (already in the wallet), for the "You brought ... home" line. */
  let starKobo = 0;
  /** The go is over or left: its best is kept; the chip goes. */
  function endGo(): void {
    missionGo?.end();
    missionGo = null;
    msMade?.chip.set(null, 0);
  }
  /** "You got a star!" for the end cards, or null when this go won none. */
  const starLine = (): string | null => (missionGo && msMade && missionGo.won > 0 ? msMade.m.BOARD_WORDS.got(missionGo.won, missionGo.stars, missionGo.def.stars.length) : null);
  /** The run's events that a mission counts (part 7: kobo, food, goatEat, room, busBoard, fufuPlug, crumble). */
  function feedGo(e: GameEvent): void {
    const go = missionGo;
    if (!go) return;
    const goal = go.def.goal;
    if (goal === 'coins') go.count(game.run.kobo);
    else if (goal === 'foods' && e.type === 'food') go.food(e.kind);
    else if ((goal === 'goats' && e.type === 'goatEat') || (goal === 'potholes' && e.type === 'fufuPlug') || (goal === 'gravel' && e.type === 'crumble')) go.add();
    else if ((goal === 'wells' && e.type === 'room') || (goal === 'garri' && e.type === 'busBoard' && game.run.parcel)) go.found();
    msMade?.chip.update();
  }
  /** A mission card's Play: its place (the first not done, for the wells and the garri). */
  function playMission(d: MissionDef, at: TapPoint | null): void {
    const k = ms();
    if (!k) return;
    const ogun = d.state === OGUN;
    const place = k.m.placeToPlay(d, k.book.save, (n) => n === LANE || streetOpen(progress.state(ogun ? OGUN : LAGOS), n));
    if (place === null) return;
    missionPlay = d;
    if (place === LANE) startLane(null, ogun);
    else if (ogun) ogunRun(at, place);
    else lagosRun(at, (place - 1) as Where);
  }
  /** (c) Money from a run goes home to Lagos at once, saved. */
  function payHome(kobo: number): void {
    if (paidHome) return;
    paidHome = true;
    brought = kobo;
    if (kobo > 0) cityLife.set(addKobo(cityLife.state, kobo), true);
  }
  /** S3e0 part 6 rule 4: the street's name, said once as its run starts. */
  const runSaid = h('div', { class: 'run-said', 'aria-live': 'polite' });
  document.body.append(runSaid);
  const menus = new Menus(document.body, store, game.look, {
    // city.md (b) flow: "Play" (and the builder's "Start running") opens Lagos from above, the
    // home screen. ?level=lagos-2, lagos-3 or lagos-hall still starts that level (for testing).
    start: (at) => {
      if (askedLane) startLane(null);
      else if (askedOgun) {
        const n = askedOgun[1] === 'hall' ? OGUN_HALL : Number(askedOgun[1]);
        void worlds.load(OGUN).then((r) => (r.ok ? ogunRun(at, n) : toast.show(r.message, 4000)));
      } else if (askedKano) void worlds.load(KANO).then((r) => (r.ok ? kanoRun(at, 1) : toast.show(r.message, 4000)));
      // O1b2 (ogun.md 1.6): the game opens on the city last used.
      else if (askedAt === null) menus.openHome();
      else lagosRun(at, firstStreet);
    },
    cityLife,
    // The Potholes card's "Run Alausa" starts street 1, for the New road. The lane run (step (f)) comes later.
    runSpot: (spot, at) => {
      // S3f3: the Lights out and Slow internet cards (and their Not enough cards) start a lane run for that fix.
      if (spot === 'lightsOut' || spot === 'slowInternet') {
        startLane(spot === 'lightsOut' ? 'lamps' : 'mast');
        return;
      }
      if (spot !== 'potholes') return;
      lagosRun(at, 0);
      missionFor = isBuilt(cityLife.state, 'road') ? null : 'road';
    },
    takeHome: () => leave('city', { build: missionFor, kobo: brought }),
    // S3e0: a stop's big button, for the fix its card shows (CR-Q1 a: STOP_PAYS_FIX).
    playStop: (stop, at) => {
      if (stop.id === 'lane') startLane(stop.forFix);
      else if (stop.id !== 'ferry' && stop.id !== 'ogun') {
        lagosRun(at, stop.id);
        missionFor = stop.forFix;
      }
    },
    roadView: () => {
      const l = readLane(progress.raw?.[KEY_LANE]);
      return { lagos: progress.state(LAGOS), names: streets.map((x) => x.name), city: cityLife.state, lane: { best: l.best, goals: l.goals }, ogunLit: stateProgress(progress.raw, OGUN).hall.done };
    },
    roadHint: () => {
      if (cityLife.state.hints.includes('road')) return false;
      cityLife.set(withHint(cityLife.state, 'road'), true);
      return true;
    },
    cardChanged: () => nativeApp?.screenChanged(),
    restart: (at) => (lane ? startLane() : startRun(at)),
    next: (at) => {
      missionFor = null;
      endGo();
      missionPlay = null;
      // K2b: Kurmi is the only Kano street so far (its card has no "Next street").
      if (kanoPlay) return;
      // O3b, O4b: Ota's card goes on to Abeokuta, Abeokuta's to Sagamu.
      if (ogunPlay) {
        // O5b: Sagamu's card goes on to Pothole Hall.
        if (ogunPlay.n <= OGUN_BUILT) ogunRun(at, ogunPlay.n + 1);
        return;
      }
      startRun(at, typeof where === 'number' && where + 1 < streets.length ? where + 1 : 'hall');
    },
    resume: () => {
      // "Keep playing" in a lane run is a resume tap (25.4).
      if (lane) askTiltOnRun();
      resume();
    },
    leave,
    lookChanged: (look) => {
      game.look = look;
    },
    soundChanged: (on) => {
      sound.enabled = on;
      director.switches(on, menus.music);
    },
    musicChanged: (on) => director.switches(menus.sound, on),
    screenChanged: () => {
      syncMusic();
      // O1c-4: the banner follows a new screen at once (the bus ride hides it), not 250 ms later.
      syncUpdate();
      nativeApp?.screenChanged();
    },
    progress: () => ({
      lagos: progress.state(LAGOS),
      names: streets.map((l) => l.name),
      themes: streets.map((l) => l.theme),
      // city.md (d) d4: the first boom also turns Lagos's cog (a cog the hall turned stays turned).
      working: [...new Set([...progress.working(), ...(cityLife.state.boomSeen >= FIRST_BOOM ? [LAGOS] : [])])],
    }),
    playSound: (name) => {
      sound.play(name);
      // city.md d7: the music dips to half while the sting or the boom plays.
      if ((name === 'sting' || name === 'boom') && sound.enabled) {
        music.setLevel(0.5, 0.1);
        window.clearTimeout(musicDip);
        musicDip = window.setTimeout(() => music.setLevel(1, 0.3), soundLength(name) * 1000);
      }
    },
    stillWanted: () => reduceMotion.matches,
    introSound: (name) => sound.play(name),
    // city.md a2.6: the menu tune follows the story (it is already playing for this screen).
    introMusic: (m) => {
      if (m.kind === 'level') music.setLevel(m.level, m.ramp);
      else if (m.kind === 'restart') {
        music.setLevel(m.level, 0);
        music.restart('menu');
      } else if (m.kind === 'hold') music.pause();
      else if (!document.hidden) music.resume();
    },
    // O1b2: the way to Ogun (docs/ogun.md part 1).
    states: () => {
      const raw = progress.raw;
      const lagosTurning = progress.working().includes(LAGOS) || cityLife.state.boomSeen >= FIRST_BOOM;
      // O6b: Ogun's Booming points as they are now (fixes and collects in its city).
      const own = ogunCity.own;
      const ogunBoom = typeof own['boom'] === 'number' ? own['boom'] : 0;
      const ogunSeen = typeof own['boomSeen'] === 'number' ? own['boomSeen'] : 0;
      const beaten = stateProgress(raw, OGUN).hall.done;
      // K1b (kano.md 1.6): Kano's cog turns at its first boom or its first Borehole Hall win.
      const kOwn = kanoCity.own;
      const kanoBeaten = stateProgress(raw, KANO).hall.done;
      const num = (x: unknown): number => (typeof x === 'number' ? x : 0);
      return {
        where: whereNow(raw),
        arrived: arrived(raw),
        lagos: { boom: cityLife.state.boom, turning: lagosTurning },
        ogun: { open: stateOpen(raw, OGUN), boom: ogunBoom, turning: beaten || ogunSeen >= FIRST_BOOM, beaten },
        kano: { open: stateOpen(raw, KANO), boom: num(kOwn['boom']), turning: kanoBeaten || num(kOwn['boomSeen']) >= FIRST_BOOM, beaten: kanoBeaten, arrived: arrived(raw, KANO) },
      };
    },
    kanoCity,
    worldPart: (id) => worlds.get(id),
    loadWorld: (id) => worlds.load(id),
    setWhere: (id) => {
      if (whereNow(progress.raw) !== id) progress.savePart('where', id);
    },
    arrived: (id = OGUN) => {
      progress.saveStatePart(id, 'arrived', true);
    },
    playTune: (tune) => {
      if (!musicAudible(menus.sound, menus.music) || document.hidden) return;
      gateMusic.playTune(tune);
    },
    // O2b, OG-R37: Ogun's Bad road card ("Run Ota" ... "Go to Pothole Hall").
    playOgun: (n, at) => ogunRun(at, n),
    playKano: (n, at) => kanoRun(at, n),
    ogunDone: (n) => streetRecord(progress.state(OGUN), n).done,
    // O6b: Ogun's city and its challenge road.
    ogunCity,
    runOgunSpot: (spot, at) => {
      if (spot === 'potholes') {
        ogunRun(at, 1);
        ogunFor = 'potholes';
      } else startLane(null, true);
    },
    playOgunStop: (stop, at) => {
      const n = ['ota', 'abeokuta', 'sagamu', 'hall'].indexOf(String(stop.id));
      if (stop.id === 'expressway') startLane(null, true);
      else if (n >= 0) {
        ogunRun(at, n === 3 ? OGUN_HALL : n + 1);
        ogunFor = stop.forFix;
      }
    },
    // MS3b: the Missions board, shown once Lagos has had its first Mission complete (Ogun: always).
    hasMissions: (state) => (state === OGUN ? (worlds.get(OGUN)?.missions?.list.length ?? 0) > 0 : cityLife.state.fixed.length > 0),
    missions: (state) => {
      const ogun = state === OGUN;
      const k = ms();
      if (!k || (!ogun && cityLife.state.fixed.length === 0)) return null;
      const defs = defsOf(k, state);
      if (defs.length === 0) return null;
      const p = progress.state(ogun ? OGUN : LAGOS);
      return { state, defs, save: k.book.save, open: (n: number) => n === LANE || streetOpen(p, n), ...(ogun && worlds.get(OGUN)?.missions?.icon ? { own: worlds.get(OGUN)!.missions!.icon! } : {}) };
    },
    playMission: (d, at) => playMission(d, at),
    everyDue: (state) => {
      const k = ms();
      if (!k) return false;
      const [n, of] = k.book.total(defsOf(k, state));
      if (!of || k.book.save.helper[state] || n < of) return false;
      k.book.put({ helper: { [state]: 1 } }, true);
      return true;
    },
    ogunRoadView: () => {
      const l = readLane(statePart(progress.raw, OGUN)['lane']);
      return { progress: progress.state(OGUN), own: ogunCity.own, wallet: cityLife.state, lane: { best: l.best, goals: l.goals }, kanoLit: stateProgress(progress.raw, KANO).hall.done };
    },
  });
  const hud = new Hud(document.body, {
    pause: () => pause(),
    toggleSound: () => {
      sound.enabled = menus.toggleSound();
      director.switches(sound.enabled, menus.music);
      hud.update(game.run, sound.enabled);
    },
  });
  const toast = new Toast(document.body);
  const count = new CornCount(document.body);
  // po M4 bug 2: in the hall the chips stay left of the hit circles (drawn 32 u each side of the
  // middle, at the top; see drawHitCounter).
  hud.limit = () => (game.run.inHall ? window.innerWidth / 2 - (34 * canvas.getBoundingClientRect().width) / view.width : Infinity);

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
  const placeBar = (): void => {
    const box = barBox();
    toast.place(box, window.innerHeight);
    count.place(box, window.innerHeight);
  };
  /** The Throw button while balls are held (S2.15); the hint bar moves when it comes and goes. */
  function placeThrowButton(): void {
    const was = throwButton.shown;
    const show = playing && !game.paused && !menus.current && buttons.shown && game.run.canThrow;
    throwButton.update(show, game.run.fufu, buttons.layout.throwTouch);
    if (throwButton.shown !== was) placeBar();
  }
  buttons.onChange = placeBar;
  placeBar();
  sound.enabled = menus.sound;
  director.switches(menus.sound, menus.music);
  menus.touchWords = () => buttons.touch;
  menus.tilt = tilt;
  menus.tiltAppAsksAgain = TILT_APP_ASKS_AGAIN;
  tilt.onFound(() => menus.syncTilt());
  // Part 25.4: every answer from Apple's box. A no from a run's start tap plays with swipes and
  // says so; two noes in a row turn the switch off. A yes starts the count again.
  tilt.onAnswer((a, from) => {
    const noes = a === 'granted' ? 0 : Math.min(2, readLane(progress.raw?.[KEY_LANE]).tiltNoes + 1);
    saveTiltMarks({ tiltNoes: noes });
    if (a === 'denied') {
      if (from === 'switch') menus.setTilt(false);
      else if (noes >= 2) menus.setTilt(false);
      if (lane) {
        if (lane.stage !== 'paused') lane.tiltDenied();
      } else if (laneLoading) tiltNoPending = true;
    }
    menus.syncTilt();
  });

  /** Decision 62: the goats' "meeh" and the birds' "hawk hawk", kept from piling up. */
  const animalCalls = new AnimalCalls((n) => sound.play(n));
  const W = WORDS.toast;
  /** S2.2: a level hint shows 3.5 s in the hint bar. */
  const HINT_MS = 3500;
  /** O2b: the next mud step is the B sound. */
  let mudB = false;
  /** OG-R15: the gravel "tk" on screen only, one for two close landings. */
  const gravelTk = new TkGate();
  /** O5b: the state whose hall is being played. */
  const hallState = (): string => (ogunPlay ? OGUN : LAGOS);
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
        // S2.16 B2 and B3: amala's deep "gbe-dum"; the garri suit clicks on from the feet up.
        sound.play(e.kind === 'amala' ? 'strongPick' : e.kind === 'garri' ? 'suitOn' : 'food');
        // S2.15: fufu's words say which key or button throws.
        if (e.kind === 'fufu') toast.show(hintWords(game.run.inHall ? W.fufuHall : W.fufu, controls.lastKind), HINT_MS);
        else toast.show(e.kind === 'ikokore' || e.kind === 'ofada' ? OGUN_WORDS.toast[e.kind] : e.kind === 'kilishi' ? KANO_WORDS.street.kilishi : W[e.kind], 3200);
        break;
      case 'fufuToss':
        sound.play('fufuToss');
        break;
      case 'fufuPlop':
        sound.play(e.hop ? 'fufuHop' : 'fufuPlop');
        break;
      case 'fufuRoll':
        sound.play('fufuRoll');
        break;
      case 'fufuPlug':
        sound.play('fufuPlug');
        if (e.first) toast.show(W.plugged, HINT_MS);
        break;
      case 'fufuFarPlop':
        sound.play('fufuFarPlop');
        break;
      case 'fufuKnock':
        sound.play('fufuBonk');
        break;
      case 'goatEat':
        sound.play('goatChew');
        break;
      case 'goatMeeh':
      case 'goatBump':
        animalCalls.hear(e);
        break;
      case 'fufuPop':
      case 'fufuJam':
        sound.play('fufuPff');
        break;
      case 'fufuBowl':
        sound.play('cratePop');
        break;
      case 'hint':
        toast.show(hintWords(e.words, controls.lastKind), HINT_MS);
        break;
      case 'wake':
        if (e.kind === 'drum') {
          sound.play('drumWake');
          warned('drumWake');
        }
        break;
      case 'bounce':
        // Decision 62: a goat's "meeh" (at most one each 0.5 s; a plain boing if it just spoke).
        if (!(e.kind === 'goat' && animalCalls.hear(e))) sound.play(e.kind === 'drum' ? 'drumBounce' : 'bounce');
        break;
      case 'smash':
        // S2.16 B2: a hearty "gbam" (goats trot off unhurt with their "meeh").
        sound.play(game.run.power.amala > 0 ? 'strongSmash' : 'smash');
        animalCalls.hear(e);
        break;
      case 'strongStep':
        sound.play('strongStep');
        break;
      case 'birdOff':
        // S2.16 B1 and decision 62: "hawk hawk" (at most one call each 1.5 s) and the wings;
        // a bounce on it bounces.
        animalCalls.hear(e);
        sound.play('birdFlap');
        if (e.why === 'stomp') sound.play('bounce');
        break;
      case 'pileKobo':
        sound.play('kobo');
        break;
      case 'weedsDry':
        sound.play('weedsFsss');
        if (e.first) toast.show(W.weedsDried, HINT_MS);
        break;
      case 'weedsTrample':
        sound.play('strongSmash');
        break;
      case 'dashOn':
        // S2.16 B4: saved at once, so the dash stays on for every later play.
        progress.savePart(KEY_DASH, true);
        break;
      case 'dashStart':
        sound.play('dashStart');
        break;
      case 'dashSteps':
        sound.play('dashSteps');
        break;
      case 'dashReady':
        sound.play('dashReady');
        break;
      case 'dashTired':
        if (e.first) toast.show(W.dashTired, HINT_MS);
        break;
      case 'hit':
        toast.hide(); // a lost life: the bar hides at once (S2.2)
        sound.play('hit');
        break;
      case 'shieldPop':
        sound.play('suitBreak');
        toast.show(W.shieldUsed);
        break;
      case 'fall':
        toast.hide();
        sound.play('fall');
        break;
      case 'climbOut':
        // Gentle mode (S2.13 part 5): back just before the pit, with a word on the jump it needs.
        toast.show(WORDS.climbOut[e.kind], HINT_MS);
        break;
      case 'checkpoint':
        sound.play('checkpoint');
        break;
      case 'wearingOff':
        // S2.9: corn's ending is the 5, 4, 3, 2, 1 count now; amala keeps its toast.
        if (e.kind === 'amala') toast.show(W.amalaWearingOff);
        else if (e.kind === 'ikokore') toast.show(OGUN_WORDS.toast.ikokoreWearingOff);
        else if (e.kind === 'ofada') toast.show(OGUN_WORDS.toast.ofadaWearingOff);
        else if (e.kind === 'kilishi') toast.show(KANO_WORDS.street.kilishiWearingOff);
        break;
      case 'crackOpen':
        // O3b (ogun.md 3.3): the low "krrk" as a crack rumbles open.
        sound.play('crackRumble');
        break;
      case 'gravelHop':
        // O4b (ogun.md 3.3): the hopping gravel's "tk" as it lands, and its crumble. OG-R15: only
        // for a landing on screen, and one "tk" for two landings within 0.1 s.
        if (gravelTk.due(e.x, game.camera, view.width, game.clock)) sound.play('gravelTk');
        break;
      case 'cue':
        // O5b: Pothole Hall asks for its own sounds and words (ogun.md 5.3 to 5.5).
        if (e.sound) sound.play(e.sound);
        if (e.say) toast.show(e.say, e.ms ?? HINT_MS);
        break;
      case 'crumble':
        sound.play('gravelCrumble');
        break;
      case 'arch':
        // O2b (ogun.md 1.4): under the gateway arch on Ota.
        toast.show(OGUN_WORDS.toast.arch, HINT_MS);
        break;
      case 'gate':
        // K2b (kano.md 3.4): through the gate in the old wall on Kurmi.
        toast.show(KANO_WORDS.street.gate, HINT_MS);
        break;
      case 'whoosh':
        // K2b (kano.md 3.3): the soft whoosh in a wind stretch (its recipe comes with the Kano part).
        sound.play('windWhoosh');
        break;
      case 'mudStep':
        // O2b (ogun.md 3.3): the soft "splosh", A, B, A, B.
        sound.play(mudB ? 'mudStepB' : 'mudStepA');
        mudB = !mudB;
        break;
      case 'tick':
        sound.play('tick');
        break;
      case 'powerEnd':
        if (e.kind === 'corn') cornRanOut = true;
        break;
      case 'gameOver':
        sound.play('gameOver');
        controls.releaseAll();
        pauseLoop();
        toast.hide();
        // (c) Losing keeps it all (Tp, question 2): the coins go home to the one wallet (decision 80).
        payHome(game.run.kobo * KOBO_PER_COIN);
        // MS-R3: a star won in this go is kept, and the card says so.
        missionGo?.end();
        menus.showGameOver({ kobo: game.run.kobo * KOBO_PER_COIN, lives: 0, hall: game.run.inHall, ogun: ogunPlay !== null, kano: kanoPlay !== null, stars: starLine() });
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
        toast.show(ogunPlay ? OGUN_WORDS.toast.parcel : W.parcel, HINT_MS);
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
        pauseLoop();
        toast.hide();
        // S2.8: saved only now, when the bus is boarded (with the parcel, if carried).
        // N1: a coin is 10 kobo; bests and the card's money are whole kobo.
        if (kanoPlay) {
          // K2b: a Kano street saves under states.kano; the money goes to the one wallet (decision 80).
          const coins = game.run.kobo * KOBO_PER_COIN;
          progress.finish({ state: KANO, street: kanoPlay.n, kobo: coins, parcel: game.run.parcel });
          payHome(coins);
        } else if (ogunPlay) {
          // O2b: an Ogun street saves under states.ogun; the money goes to the one wallet (decision 80).
          const coins = game.run.kobo * KOBO_PER_COIN;
          progress.finish({ state: OGUN, street: ogunPlay.n, kobo: coins, parcel: game.run.parcel });
          // O6b: a win from Ogun's Potholes card or the Ota stop brings home what is left on the New road.
          const left = ogunFor ? (worlds.get(OGUN)?.left?.(ogunCity.own, ogunFor) ?? 0) : 0;
          payHome(coins + winPrize(coins, { left }));
        } else {
          const coins = game.run.kobo * KOBO_PER_COIN;
          // 5W W5: a win brings home at least what is left of the fix it was for; the first street 1
          // win from the Potholes card brings ₦14 (road ₦10, Mama Put ₦4).
          const first = where === 0 && missionFor === 'road' && !streetRecord(progress.state(LAGOS), 1).done;
          const left = missionFor ? leftOf(cityLife.state, missionFor) : 0;
          if (typeof where === 'number') progress.finish({ state: LAGOS, street: where + 1, kobo: coins, parcel: game.run.parcel });
          payHome(coins + winPrize(coins, { left, first }));
        }
        menus.showCleared({
          name: game.level.name,
          kobo: brought,
          last: typeof where === 'number' && where + 1 >= streets.length,
          parcel: game.run.parcel,
          ogun: ogunPlay !== null,
          ogunNext: ogunPlay !== null && ogunPlay.n <= OGUN_BUILT,
          kano: kanoPlay !== null,
          stars: starLine(),
        });
        missionGo?.end();
        break;
      case 'bossThrow':
        if (e.kind === 'honk') sound.play('honk');
        else if (e.kind === 'highHonk') {
          sound.play('highHonk');
          warned('highHonk');
        }
        break;
      case 'bossHit':
        sound.play('greenHit');
        if (e.left > 0) toast.show(W.greenLight(e.left));
        break;
      case 'bossPhase':
        // S2.14: the "PEEP!" hint shows as the phase with high honks starts.
        if (e.highHonks) toast.show(W.highHonks, HINT_MS);
        break;
      case 'bossLight':
        sound.play('lightDing');
        if (e.first) toast.show(W.lightOn, HINT_MS);
        break;
      case 'bossLightTick':
        sound.play('lightTick');
        break;
      case 'bossLightOff':
        sound.play('lightClunk');
        if (e.first) toast.show(W.lightMissed, HINT_MS);
        break;
      case 'bossDefeat':
        // S2.8: the hall is won at the third hit. Saved now, so leaving or reloading during the
        // 6 s kind finish never loses it (qa N3). The same save uses the garri parcel up (po ruling
        // d). 'win' saves the same again (merge, never lower).
        // O1b2: the first win sends the player on to Ogun with a big button (ogun.md 1.2).
        firstHallWin = !progress.state(hallState()).hall.done;
        progress.finish({ state: hallState(), hall: true, kobo: game.run.kobo * KOBO_PER_COIN });
        // (c) The hall win adds ₦15 to Lagos.
        payHome(game.run.kobo * KOBO_PER_COIN + HALL_PRIZE);
        // P2 (po N4): no fight hint ("PEEP!") stays up over the kind finish.
        toast.hide();
        break;
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
        pauseLoop();
        toast.hide();
        // S2.8: the hall is won, so Lagos (O5b: or Ogun) is switched on and its cog turns.
        progress.finish({ state: hallState(), hall: true, kobo: game.run.kobo * KOBO_PER_COIN });
        menus.showWin({ kobo: ogunPlay ? brought : game.run.kobo, lives: game.run.lives, firstHall: firstHallWin, ogun: ogunPlay !== null });
        firstHallWin = false;
        break;
    }
    feedGo(e);
    // The well room, back up, a hall hit: the tune follows (cheap when nothing changed).
    if (e.type === 'room' || e.type === 'wellBack' || e.type === 'bossHit' || e.type === 'bossDefeat' || e.type === 'cue') syncMusic();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      // 5W W4: the trays and the hero's place are saved when the tab is hidden.
      cityLife.flush();
      ogunCity.flush();
    }
    syncHum();
    // S2.9 rule 4: no music while the page is hidden; on the way back it carries on from the
    // same bar (in a run it waits for "Keep playing").
    syncMusic();
  });
  // Both: the resize event can arrive a frame before the media query change event.
  const checkUpright = (): void => {
    if (portrait.matches) pause();
  };
  portrait.addEventListener('change', checkUpright);
  window.addEventListener('resize', checkUpright);

  // S2.2 Keys: P and Escape pause in play (the streets, the well room and the hall) and resume
  // from Pause. They do nothing in the finish or on any other card. On the wheel's list,
  // Escape closes the list (menus.ts).
  window.addEventListener('keydown', (e) => {
    // S2.2 Keys: M switches the music on or off, anywhere.
    if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      menus.toggleMusic();
      return;
    }
    const act = pauseKeyAction(e.code, e.repeat, menus.current, (playing && !game.paused && inPlay()) || (lane?.running ?? false));
    if (!act) return;
    e.preventDefault();
    if (act === 'pause') pause();
    else resume();
  });

  // ST1a, ST0: the store app's back button, background pause, safe edges, screen awake and
  // splash. Only the app build has this code (MODE is fixed at build time, so the web build
  // drops it, and Capacitor with it).
  if (import.meta.env.MODE === 'app' && isNativeApp()) {
    void import('./native/app').then(({ startNativeApp }) => {
      nativeApp = startNativeApp({
        running: () => (playing && !game.paused && !menus.current && inPlay()) || (lane?.running === true && !menus.current),
        screen: () => menus.current,
        hall: () => where === 'hall',
        lane: () => lane !== null,
        heroSaved: () => hasSavedLook(store),
        card: () => menus.cardOpen,
        pause: () => pause(),
        home: () => leave('city'),
        city: () => menus.showCity(),
        save: () => {
          cityLife.flush();
          ogunCity.flush();
        },
        // Every screen that fits itself (the intro, the city, the wheel) hears it, not only the canvas.
        relayout: () => window.dispatchEvent(new Event('resize')),
      });
    });
  }

  let musicAttached = false;
  // Sound may start only after the player's first tap or key. iOS Safari counts only the end of
  // a touch (or a click or key) as the tap that can start audio, and stops it on an app switch
  // or screen lock, so every tap tries, for as long as the game is open (audio-unlock.ts).
  listenForAudioGestures(
    window,
    document,
    () => {
      sound.unlock();
      // The same tap starts the music (iOS lets only a tap start audio). Music shares the
      // sound's context once it exists; unlock() then starts the tune asked for so far.
      const ac = sound.context;
      if (ac && !musicAttached) {
        music.attach(ac);
        cornMusic.attach(ac);
        gateMusic.attach(ac);
        musicAttached = true;
      }
      if (musicAttached) {
        music.unlock();
        cornMusic.unlock();
        gateMusic.unlock();
      }
    },
    () => {
      sound.wake();
      if (musicAttached) {
        music.unlock();
        cornMusic.unlock();
        gateMusic.unlock();
      }
    },
  );

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
      // S2.16 B4: double tap and hold a direction to dash (where the dash is on).
      onDash: (dir) => {
        if (playing && !game.paused && !menus.current && inPlay()) game.run.dash(dir);
      },
      onMove: (dir) => {
        if (playing && !game.paused) game.steer(dir);
        else game.steer(0);
      },
      // S2.2 Keys: at a well Down, S, Enter or E go down; under the room's rope Enter or E go up.
      onThrow: () => throwFufu(),
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
  pauseLoop();
  menus.show('title');
  // S3g1b: the people's chunk, fetched right after the title shows.
  window.setTimeout(() => void loadPeople().catch(() => undefined), 200);

  // S3f2: the lane run's hooks for end to end tests (null outside a lane run).
  Object.defineProperty(window, '__lane', { configurable: true, get: () => (lane ? lane.testHook() : null) });

  // Read-only hooks for end to end tests.
  window.__game = {
    get paused() {
      return game.paused;
    },
    get update() {
      return { ready: updates?.state.ready ?? false, shown: updateBanner.shown };
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
    /** S3g1b: the people drawn last frame (world units), the bubble, backing off, the murmur. */
    get people() {
      const p = game.people;
      if (!p) return null;
      return {
        on: p.on,
        drawn: p.drawn.map((d) => ({ x: d.x, y: d.y, frame: d.frame, size: d.size })),
        seen: p.seen,
        bubble: p.bubbleBox ? { ...p.bubbleBox } : null,
        backOff: p.watch.level,
        ms: { avg: p.costMs, max: p.costMax, bake: p.bakeMs },
        murmur: sound.murmuring,
        plan: p.street ? { stands: p.street.plan.stands.length, walkers: p.street.plan.walkers.length, zones: p.street.plan.zones.map((z) => [z.a, z.b]) } : null,
      };
    },
    /** S3g1b qa: force backing off (part 11: 1 drops the walkers, 2 half the standing people too). */
    forceBackOff(level: number) {
      game.people?.watch.force(level);
    },
    /** S3g1b qa: people on or off (the run is the same either way), to measure what they cost. */
    setPeople(on: boolean) {
      if (game.people) game.people.on = on;
    },
    get look() {
      return { ...game.look };
    },
    get anim() {
      return { gait: game.gait, skid: game.skid, dust: game.dustAge < DUST_TIME };
    },
    get screen() {
      return menus.current ?? (playing || lane ? 'play' : null);
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
        /** O2b: feet in mud now, and slowed by it (no ikokore). */
        mud: r.inMud,
        slowed: r.slowed,
        /** S2.15: fufu balls held, balls about, potholes plugged (left lips). */
        fufu: r.fufu,
        balls: r.balls.map((b) => ({ x: b.x, y: b.y, mode: b.mode, touches: b.touches })),
        plugged: r.plugged.map((p) => [p.a, p.b] as const),
        /** O3b: each crack's state (shut, opening, open, sealed). */
        cracks: r.cracks.map((c) => ({ x: c.x, w: c.w, state: c.state })),
        hazards: r.hazards.map((z) => ({ kind: z.kind, x: z.x, y: z.y, mode: z.mode, fufu: z.fufu })),
        /** S2.16 B5: the gutters and their weeds; B4: the dash. */
        gutters: r.gutters.map((q) => ({ x: q.x, w: q.w, state: q.state })),
        dash: { on: r.dashOn, dashing: r.dashing, resting: r.resting, left: r.hero.dash, rest: r.hero.rest },
        hum: sound.humming,
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
        gutters: level.gutters.map((q) => ({ ...q })),
        piles: [...level.piles],
        dashFrom: level.dashFrom,
        /** O3b: cracks [left lip, right lip] (they open into potholes) and water potholes' left lips. */
        cracks: level.cracks.map((c) => [c.x, c.x + c.w] as const),
        waterPits: [...level.waterPits],
      };
    },
    get below() {
      // Cheap: below the street (the well room shows), for per-frame logs.
      return game.run.below;
    },
    get throwButton() {
      // S2.15: the Throw button on screen now (its touch box, CSS px) and its spoken label, or null.
      if (!throwButton.shown) return null;
      const r = throwButton.el.getBoundingClientRect();
      return { label: throwButton.el.getAttribute('aria-label') ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
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
    // O1b1, for tests: the saved state list, and a way to load the Ogun part (players use the Travel card, O1b2).
    get states() {
      const raw = progress.raw;
      return { where: whereNow(raw), open: openStates(raw), ogun: stateProgress(raw, OGUN), arrived: arrived(raw), wallet: wallet(raw), ogunLoaded: worlds.get(OGUN) !== null, kano: stateProgress(raw, KANO), kanoArrived: arrived(raw, KANO), kanoLoaded: worlds.get(KANO) !== null };
    },
    loadOgun: async () => {
      const r = await worlds.load(OGUN);
      if (r.ok) return { ok: true as const, levels: Object.keys(r.part.levels).sort() };
      toast.show(r.message, 4000);
      return { ok: false as const, why: r.why, message: r.message };
    },
    get fixedLook() {
      return game.fixed;
    },
    /** O2b: an Ogun street's own look is on (a fault turns it off; the Lagos look stands in). */
    get skin() {
      return game.skin !== null;
    },
    /** O5b: a later state's fight (King Pothole), as its part shows it, or null. */
    get arena() {
      return (game.run.arena as { peek?: () => Record<string, unknown> } | null)?.peek?.() ?? null;
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
    get music() {
      // O2: the Music switch, whether music may sound (Music and Sound both on), the tune asked for.
      // K2b: `tune` is the name of the tune a place plays now (Kurmi's stands in for the street's).
      return { on: menus.music, audible: music.enabled, place: music.place, tempo: music.tempoStep, held: music.held, started: musicAttached, tune: music.place ? TUNES[music.place].name : null };
    },
    get corn() {
      // S2.9 corn tune: the count showing, the tune (place, tempo step, loudness), the turn-down
      // of the street tune and of the effects, and what screen readers were last told.
      return {
        count: count.value,
        countBox: (() => {
          const r = count.element.getBoundingClientRect();
          return count.value > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height, font: parseFloat(getComputedStyle(count.element).fontSize) } : null;
        })(),
        on: corn.on,
        step: corn.step,
        place: cornMusic.place,
        tempo: cornMusic.tempoStep,
        level: cornMusic.outLevel,
        musicLevel: music.outLevel,
        effectsLevel: sound.effectsLevel,
        spoken: count.spoken,
        waiting: toast.pending,
      };
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
        for (const f of r.foods) if (!f.taken) add('food', f.x - 20, f.y - 22, f.x + 20, f.y + 22);
        for (const q of r.balls) add('fufu ball', q.x - 9, q.y - 14, q.x + 9, q.y + 2);
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
      for (const q of r.balls) if (q.y <= gy + 2) add('fufu ball', q.x - 9, q.y - 14, q.x + 9, q.y + 2);
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
    get introDraws() {
      // city.md a2.9: every intro picture drawn so far (none after Skip or "Let's go").
      return IntroScreen.drawsTotal;
    },
    get intro() {
      // city.md (a): the story frame showing, its time, paused, the caption and the hint.
      const s = menus.intro;
      if (!s) return null;
      // a2: moving, the frame is the beat (1 to 6), time is story time and beat 6 is the hold.
      const m = s.scene;
      return {
        mode: s.mode,
        frame: m ? Math.min(6, m.beat + 1) : s.flow.frame,
        time: m ? m.t : s.flow.time,
        paused: m ? m.paused : s.flow.paused,
        beat: m ? m.beat : -1,
        hold: m ? m.inHold : false,
        jumps: m ? m.jumps : 0,
        draws: s.draws,
        ratio: s.ratioCap,
        played: [...s.played],
        log: [...s.el.querySelectorAll('.intro-log p')].map((p) => p.textContent ?? ''),
        caption: s.mode === 'moving' ? '' : (s.el.querySelector('.intro-caption')?.textContent ?? ''),
        hint: s.el.querySelector('.intro-hint')?.textContent ?? '',
        // a2.12: the subtitle strip's line and its opacity (moving only)
        sub: s.mode === 'moving' ? (s.el.querySelector('.intro-sub')?.textContent ?? '') : '',
        subAlpha: Number((s.el.querySelector('.intro-sub') as HTMLElement | null)?.style.opacity || 0),
      };
    },
    /** O6b: Ogun from above now (its draws, hero and test boxes), or null. */
    /** K1b: Kano's home now (its draws), or null. */
    get kanoHome() {
      return menus.kanoScreen;
    },
    get ogunCity() {
      return menus.ogunScreen;
    },
    get city() {
      // city.md (b): the camera, how many times the map was drawn, each pin's tap area (CSS px,
      // in the map), the open card and the saved buckets.
      const c = menus.city;
      if (!c) return null;
      return {
        cam: { ...c.cam },
        draws: c.draws,
        pins: c.pinBoxes(),
        boards: c.boardBoxes(),
        bubbles: c.bubbleBoxes(),
        arrows: c.arrows(),
        open: c.open,
        hero: { x: c.hero.x, y: c.hero.y, moving: c.hero.moving, dir: c.hero.dir },
        mission: c.missionPhase,
        paying: c.paying,
        writes: cityLife.writes,
        // city.md (d): the moment, the boom, people walking in, the danfo, the coming-soon pins, what is bright.
        watch: c.watch,
        // The city part as it would be saved now (plain JSON).
        saved: writeCity(city()) as never,
      };
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
    /** S3f2: the lane run now, or null. */
    readonly __lane?: import('./lane/session').LaneTestHook | null;
    __game?: {
      readonly paused: boolean;
      readonly people: null | {
        on: boolean;
        drawn: { x: number; y: number; frame: string; size: number }[];
        seen: number;
        bubble: { x: number; y: number; w: number; h: number } | null;
        backOff: number;
        ms: { avg: number; max: number; bake: number };
        murmur: boolean;
        plan: { stands: number; walkers: number; zones: number[][] } | null;
      };
      forceBackOff(level: number): void;
      setPeople(on: boolean): void;
      /** U1: a new version is ready; the banner shows. */
      readonly update: { ready: boolean; shown: boolean };
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
        readonly power: { readonly corn: number; readonly amala: number; readonly ikokore: number; readonly ofada: number; readonly kilishi: number; readonly shield: boolean };
        readonly mud: boolean;
        readonly slowed: boolean;
        readonly fufu: number;
        readonly balls: readonly { readonly x: number; readonly y: number; readonly mode: string; readonly touches: number }[];
        readonly plugged: readonly (readonly [number, number])[];
        readonly cracks: readonly { readonly x: number; readonly w: number; readonly state: string }[];
        readonly hazards: readonly { readonly kind: string; readonly x: number; readonly y: number; readonly mode: string; readonly fufu: boolean }[];
        readonly gutters: readonly { readonly x: number; readonly w: number; readonly state: string }[];
        readonly dash: { readonly on: boolean; readonly dashing: boolean; readonly resting: boolean; readonly left: number; readonly rest: number };
        /** S2.16 B3: the suit's hum is playing. */
        readonly hum: boolean;
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
        readonly gutters: readonly { readonly x: number; readonly w: number }[];
        readonly piles: readonly number[];
        readonly dashFrom: number | null;
        readonly cracks: readonly (readonly [number, number])[];
        readonly waterPits: readonly number[];
      };
      /** Below the street: the well room shows (cheap, for per-frame logs). */
      readonly below: boolean;
      /** The Throw button on screen now (touch box, CSS px) and its spoken label, or null. */
      readonly throwButton: { readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
      /** The Go down / Go up button on screen now (CSS px), or null. */
      readonly wellButton: { readonly kind: 'down' | 'up'; readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
      readonly toast: string;
      /** O1b1: the saved state list (dev and tests). */
      readonly states: {
        where: string;
        open: string[];
        ogun: import('./game/progress').StateProgress;
        arrived: boolean;
        wallet: { kobo: number; power: number; tech: number };
        ogunLoaded: boolean;
        kano: import('./game/progress').StateProgress;
        kanoArrived: boolean;
        kanoLoaded: boolean;
      };
      /** O1b1: loads the Ogun part (dev only until O1b2); a failure shows its plain words on the toast. */
      loadOgun(): Promise<{ ok: true; levels: string[] } | { ok: false; why: 'missing' | 'broken'; message: string }>;
      /** The street shows its fixed look (Lagos switched on, S2.8). */
      readonly fixedLook: boolean;
      readonly skin: boolean;
      readonly corn: {
        readonly count: number;
        readonly countBox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly font: number } | null;
        readonly on: boolean;
        readonly step: number;
        readonly place: string | null;
        readonly tempo: number;
        readonly level: number;
        readonly musicLevel: number;
        readonly effectsLevel: number;
        readonly spoken: string;
        readonly waiting: string;
      };
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
      /** O5b: a later state's fight (King Pothole) as its part shows it (potholeFight.ts peek), or null. */
      readonly arena: Record<string, unknown> | null;
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
      readonly music: {
        readonly on: boolean;
        readonly audible: boolean;
        readonly place: string | null;
        readonly tempo: number;
        readonly held: boolean;
        readonly started: boolean;
        readonly tune: string | null;
      };
      /** Intro pictures drawn so far by every intro screen (city.md a2.9). */
      readonly introDraws: number;
      /** The intro story now, or null when it is not showing. */
      readonly intro: {
        /** 'still' (six frames), 'loading' (the moving scene's chunk) or 'moving' (a2). */
        readonly mode: 'still' | 'loading' | 'moving';
        readonly frame: number;
        readonly time: number;
        readonly paused: boolean;
        /** Moving: 0 to 5, 6 in the hold; -1 otherwise. */
        readonly beat: number;
        readonly hold: boolean;
        readonly jumps: number;
        /** Pictures drawn so far. */
        readonly draws: number;
        /** The canvas pixel ratio cap: 2, or 1.5 on a phone that drew the moving scene slowly (a2.9). */
        readonly ratio: number;
        /** The moving intro's cues played, "t sound" or "t music level", in order. */
        readonly played: string[];
        /** The hidden log's lines (a2.5). */
        readonly log: string[];
        readonly caption: string;
        readonly hint: string;
        /** a2.12: the subtitle strip's line now ('' outside the moving intro) and its opacity. */
        readonly sub: string;
        readonly subAlpha: number;
      } | null;
      /** O6b: Ogun from above now, or null. */
      readonly ogunCity: import('./worlds/ui').WorldCity | null;
      /** K1b: Kano's home now, or null. */
      readonly kanoHome: import('./worlds/ui').WorldCity | null;
      /** Lagos from above now, or null when it is not showing. */
      readonly city: {
        readonly cam: { readonly zoom: 'far' | 'near'; readonly x: number; readonly y: number };
        readonly draws: number;
        readonly pins: Readonly<Record<string, { readonly x: number; readonly y: number; readonly w: number; readonly h: number }>>;
        readonly open: string | null;
        readonly boards: Readonly<Record<string, { readonly x: number; readonly y: number; readonly w: number; readonly h: number }>>;
        readonly bubbles: Readonly<Record<string, { readonly x: number; readonly y: number; readonly w: number; readonly h: number }>>;
        readonly arrows: readonly { readonly icon: string; readonly x: number; readonly y: number; readonly tap: number }[];
        readonly hero: { readonly x: number; readonly y: number; readonly moving: boolean; readonly dir: string };
        readonly mission: string | null;
        readonly paying: boolean;
        readonly writes: number;
        readonly watch: {
          readonly moment: { readonly build: string | null; readonly t: number } | null;
          readonly boom: { readonly mark: number; readonly t: number } | null;
          readonly walkers: number;
          readonly standing: number;
          readonly danfo: { readonly x: number; readonly y: number } | null;
          readonly soon: Readonly<Record<string, { readonly x: number; readonly y: number; readonly w: number; readonly h: number }>>;
          readonly soonHidden: readonly string[];
          readonly bright: readonly string[];
        };
        readonly saved: {
          readonly kobo: number;
          readonly power: number;
          readonly tech: number;
          readonly fixed: readonly string[];
          readonly fixes: number;
          readonly at?: { readonly x: number; readonly y: number };
          readonly paid: Readonly<Record<string, number>>;
          readonly built: readonly string[];
          readonly trays: Readonly<Record<string, number>>;
          readonly boom: number;
          readonly boomCollect: number;
          readonly hints: readonly string[];
          readonly boomSeen?: number;
        };
      } | null;
      /** The "BUS PARK" board's drawn box on screen, CSS px; null when the level has no bus park. */
      readonly busBoard: { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
    };
  }
}
