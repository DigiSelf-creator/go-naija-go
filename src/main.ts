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
import { CORN_GAIN, CORN_LOUD, CornDirector, MusicDirector, cornCount } from './game/music-cue';
import { listenForAudioGestures } from './engine/audio-unlock';
import { AnimalCalls } from './game/animal-calls';
import { BUS_BOARD, END_BUS_BACK, END_BUS_FRONT, busEndAt } from './art/roadside';
import { DUST_TIME, Game, heroScreenX } from './game/game';
import { parseLevel, type Level } from './game/level';
import { STEPS_PER_SECOND, type RunPhase } from './game/run';
import { parseRoom } from './game/well';
import { WELL } from './art/well';
import { ROOM_ROPE_BUCKET_Y } from './art/wellRoom';
import { WELL_UP_KEYS, pauseKeyAction } from './engine/input';
import { hasSavedLook, loadLook } from './game/save';
import { KEY_DASH, LAGOS, Progress, streetRecord, switchedOn } from './game/progress';
import { FIRST_BOOM, HALL_PRIZE, HERO_START, KEY_CITY, addKobo, canFix, isBuilt, leftOf, winPrize, withHint, writeCity } from './game/city';
import { CityLife } from './game/cityLife';
import type { BuildId } from './art/payspot';
import type { Mission } from './screens/city';
import { KOBO_PER_COIN } from './game/money';
import { ThrowButton, TouchButtons, WellButton, hintBarBox, wellButtonBox, type HintBarBox, type WellButtonKind } from './screens/controls';
import { CornCount, Hud, Toast } from './screens/hud';
import { WORDS, hintWords } from './screens/words';
import { Menus, isSecondTap, type LeaveTo, type MenuScreen, type TapPoint } from './screens/menus';
import type { Where } from './screens/streets';
import { IntroScreen } from './screens/intro';
import { createStore } from './storage';
import { registerServiceWorker } from './sw-register';
import { bannerShows } from './update';
import { UpdateBanner } from './screens/update-banner';
import { isNativeApp } from './native/is-native';
import type { NativeApp } from './native/app';
import type { LaneSession } from './lane/session';
import { KEY_LANE, ONE_RUN_BOTH_FIXES, haulWords, readLane, writeLane, type Haul } from './lane/rewards';

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
if (query.get('gallery')?.startsWith('lane')) {
  // Debug only: the lane run's pictures (S3f1): ?gallery=lane, lane2, lane3, lane4; &t=1.5 holds the time.
  void import('./art/galleryLane').then(({ drawLaneGallery }) => {
    const t0 = performance.now();
    const page = Math.max(0, (Number(query.get('gallery')!.slice(4)) || 1) - 1);
    const hold = query.has('t') ? Number(query.get('t')) : NaN;
    const frame = (now: number): void => {
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawLaneGallery(g, view.width, view.height, Number.isFinite(hold) ? hold : (now - t0) / 1000, page);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
} else if (query.has('gallery')) {
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
  // Lagos streets 1 to 3 by hand (S2.6), each loaded from its level file and drawn by its
  // `theme`, then Go-Slow Hall (S2.7, lagos-hall.json). ?level=lagos-2, lagos-3 or lagos-hall
  // makes "Play" start there (for testing).
  const hall = parseLevel(hallData);
  const streets: readonly Level[] = [street1Data, street2Data, street3Data].map((d) => parseLevel(d));
  const asked = new URLSearchParams(location.search).get('level');
  /** S3f2: ?level=lagos-lane makes "Play" start the lane run (for testing). */
  const askedLane = asked === 'lagos-lane';
  const askedAt: Where | null = asked === hall.id ? 'hall' : streets.findIndex((l) => l.id === asked) >= 0 ? streets.findIndex((l) => l.id === asked) : null;
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
      hits: run.boss?.hits ?? 0,
      hidden: document.hidden,
    });
  }

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
      if (menus.current !== 'city' && menus.current !== 'intro') game.render(g, view);
      if (playing) {
        hud.update(game.run, menus.sound);
        buttons.pressed(controls.dir, controls.jumpHeld > 0);
      }
      placeWellButton();
      placeThrowButton();
      syncCorn();
      syncHum();
    },
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

  // U1 (decision 52): "New version ready. Tap to update." on any screen, never in a run: only on
  // Pause, the result cards and the other screens. One tap reloads into the new version.
  const updateBanner = new UpdateBanner(document.body, () => updates?.apply());
  /** A run is being played with no card over it (the finish bus counts: the result card follows). */
  const inRun = (): boolean => (playing || lane !== null) && menus.current === null;
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
    loop.pause();
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
    game.begin(menus.gentle, levelOf(where), where === 'hall' ? { parcel: lagos.parcel } : { parcelSaved: lagos.parcel, dash: dashSaved() });
    // S2.8: once Lagos is switched on its streets show their fixed look.
    game.fixed = where !== 'hall' && switchedOn(lagos);
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
    closeLane();
    playing = false;
    document.body.classList.remove('playing');
    hud.show(false);
    buttons.show(false);
    toast.hide();
    loop.pause();
    controls.releaseAll();
    where = firstStreet;
    game.fixed = false;
    game.reset(startLevel);
    if (to === 'wheel') {
      menus.showWheel('streets');
      // Lagos's cog turns on: a ratchet click, then a small bell (S2.12 sound 13).
      sound.play('cogRatchet');
      window.setTimeout(() => sound.play('cogBell'), 320);
    } else if (to === 'city') {
      if (cityLife.state.at) cityLife.set({ ...cityLife.state, at: { ...HERO_START } });
      menus.showCity(mission);
    } else menus.show(to);
  }

  /** S3f2: the lane run showing now (its code loads the first time one opens), or null. */
  let lane: LaneSession | null = null;
  let laneLoading = false;
  let laneModule: Promise<typeof import('./lane/session')> | null = null;
  /** The fix the lane run was started for (Lights out or Slow internet), or null (part 2). */
  let laneFor: BuildId | null = null;
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
  function startLane(fix: BuildId | null = laneFor): void {
    if (laneLoading) return;
    laneFor = fix === 'lamps' || fix === 'mast' ? fix : null;
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
    loop.pause();
    controls.releaseAll();
    laneLoading = true;
    menus.laneRun = true;
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
          askPause: () => pause(),
          laneSave: () => readLane(progress.raw?.[KEY_LANE]),
          saveLane: (part) => {
            // A broken copy is left alone (the same rule as the city part).
            if (!(progress.broken && progress.raw === null)) progress.savePart(KEY_LANE, writeLane(part));
          },
          bank: (d) => cityLife.set({ ...cityLife.state, kobo: cityLife.state.kobo + d.kobo, power: cityLife.state.power + d.power, tech: cityLife.state.tech + d.tech }),
          flush: () => cityLife.flush(),
          forFix: () => {
            if (!laneFor || isBuilt(cityLife.state, laneFor)) return null;
            return { bucket: laneFor === 'lamps' ? 'power' : 'tech', left: leftOf(cityLife.state, laneFor) };
          },
          setGentle: (on) => menus.setGentle(on),
          home: (r) => laneHome(r.won, r.haul),
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
        });
        lane.start();
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
  function closeLane(): void {
    menus.laneRun = false;
    if (!lane) return;
    lane.close();
    lane = null;
    // The lane run may have drawn with fewer pixels: back to the game's own canvas size.
    resize();
  }

  /** The live city (city.md (b), 5W): the `city` part of gidi-progress, kept in memory while the game runs. */
  const cityLife = new CityLife({
    load: () => progress.raw?.[KEY_CITY],
    // A broken copy is left alone until a street is finished (S2.8): the city lives in memory till then.
    save: (part) => (progress.broken && progress.raw === null ? false : progress.savePart(KEY_CITY, part)),
  });
  const city = () => cityLife.state;
  /** The music dip under the sting or the boom (city.md d7). */
  let musicDip = 0;
  /** The board the challenge being played was for (the Potholes card's "Run Alausa": the New road), or null. */
  let missionFor: BuildId | null = null;
  /** Money the last win brought home (whole kobo), for "Mission complete!". */
  let brought = 0;
  /** This run's money is already home (a hall win pays at the third hit, then 'win' follows). */
  let paidHome = false;
  /** (c) Money from a run goes home to Lagos at once, saved. */
  function payHome(kobo: number): void {
    if (paidHome) return;
    paidHome = true;
    brought = kobo;
    if (kobo > 0) cityLife.set(addKobo(cityLife.state, kobo), true);
  }
  const menus = new Menus(document.body, store, game.look, {
    // city.md (b) flow: "Play" (and the builder's "Start running") opens Lagos from above, the
    // home screen. ?level=lagos-2, lagos-3 or lagos-hall still starts that level (for testing).
    start: (at) => {
      if (askedLane) startLane(null);
      else if (askedAt === null) menus.show('city');
      else startRun(at, firstStreet);
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
      startRun(at, 0);
      missionFor = isBuilt(cityLife.state, 'road') ? null : 'road';
    },
    takeHome: () => leave('city', { build: missionFor, kobo: brought }),
    lane: () => readLane(progress.raw?.[KEY_LANE]),
    playLane: () => startLane(null),
    play: (to, at) => {
      missionFor = null;
      startRun(at, to);
    },
    restart: (at) => (lane ? startLane() : startRun(at)),
    next: (at) => {
      missionFor = null;
      startRun(at, typeof where === 'number' && where + 1 < streets.length ? where + 1 : 'hall');
    },
    resume,
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

  /** Decision 62: the goats' "meeh" and the birds' "hawk hawk", kept from piling up. */
  const animalCalls = new AnimalCalls((n) => sound.play(n));
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
        // S2.16 B2 and B3: amala's deep "gbe-dum"; the garri suit clicks on from the feet up.
        sound.play(e.kind === 'amala' ? 'strongPick' : e.kind === 'garri' ? 'suitOn' : 'food');
        // S2.15: fufu's words say which key or button throws.
        if (e.kind === 'fufu') toast.show(hintWords(game.run.inHall ? W.fufuHall : W.fufu, controls.lastKind), HINT_MS);
        else toast.show(W[e.kind], 3200);
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
        if (e.kind === 'drum') sound.play('drumWake');
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
        loop.pause();
        toast.hide();
        // (c) Losing keeps it all (Tp, question 2): the coins go home to Lagos.
        payHome(game.run.kobo * KOBO_PER_COIN);
        menus.showGameOver({ kobo: game.run.kobo * KOBO_PER_COIN, lives: 0, hall: game.run.inHall });
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
        // S2.8: saved only now, when the bus is boarded (with the parcel, if carried).
        // N1: a coin is 10 kobo; bests and the card's money are whole kobo.
        {
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
        });
        break;
      case 'bossThrow':
        if (e.kind === 'honk') sound.play('honk');
        else if (e.kind === 'highHonk') sound.play('highHonk');
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
        progress.finish({ state: LAGOS, hall: true, kobo: game.run.kobo * KOBO_PER_COIN });
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
        loop.pause();
        toast.hide();
        // S2.8: the hall is won, so Lagos is switched on and its cog turns.
        progress.finish({ state: LAGOS, hall: true, kobo: game.run.kobo * KOBO_PER_COIN });
        menus.showWin({ kobo: game.run.kobo, lives: game.run.lives });
        break;
    }
    // The well room, back up, a hall hit: the tune follows (cheap when nothing changed).
    if (e.type === 'room' || e.type === 'wellBack' || e.type === 'bossHit' || e.type === 'bossDefeat') syncMusic();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      // 5W W4: the trays and the hero's place are saved when the tab is hidden.
      cityLife.flush();
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
        pause: () => pause(),
        home: () => leave('city'),
        city: () => menus.showCity(),
        save: () => cityLife.flush(),
        relayout: () => resize(),
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
        musicAttached = true;
      }
      if (musicAttached) {
        music.unlock();
        cornMusic.unlock();
      }
    },
    () => {
      sound.wake();
      if (musicAttached) {
        music.unlock();
        cornMusic.unlock();
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
  loop.pause();
  menus.show('title');

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
        /** S2.15: fufu balls held, balls about, potholes plugged (left lips). */
        fufu: r.fufu,
        balls: r.balls.map((b) => ({ x: b.x, y: b.y, mode: b.mode, touches: b.touches })),
        plugged: r.plugged.map((p) => [p.a, p.b] as const),
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
    get fixedLook() {
      return game.fixed;
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
      return { on: menus.music, audible: music.enabled, place: music.place, tempo: music.tempoStep, held: music.held, started: musicAttached };
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
        readonly power: { readonly corn: number; readonly amala: number; readonly shield: boolean };
        readonly fufu: number;
        readonly balls: readonly { readonly x: number; readonly y: number; readonly mode: string; readonly touches: number }[];
        readonly plugged: readonly (readonly [number, number])[];
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
      };
      /** Below the street: the well room shows (cheap, for per-frame logs). */
      readonly below: boolean;
      /** The Throw button on screen now (touch box, CSS px) and its spoken label, or null. */
      readonly throwButton: { readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
      /** The Go down / Go up button on screen now (CSS px), or null. */
      readonly wellButton: { readonly kind: 'down' | 'up'; readonly label: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number } | null;
      readonly toast: string;
      /** The street shows its fixed look (Lagos switched on, S2.8). */
      readonly fixedLook: boolean;
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
