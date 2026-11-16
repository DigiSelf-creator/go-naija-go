/**
 * Menu screens (docs/design.md S2.10): title, hero builder, credits, the challenge road (S3e0), Nigeria's wheel,
 * and in a run: pause, game over, Street cleared and Win. Slice 3 (docs/city.md part 5 (a), (b)):
 * the intro story, Settings, and Lagos from above (the home screen). An HTML layer over the
 * canvas; one screen shows at a time.
 */
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, drawHero, type HeroLook } from '../art/hero';
import { MUSIC_SVG } from '../art/musicIcon';
import { WHEEL_STATES, wheelSvg } from '../art/wheel';
import { readSafeArea } from '../engine/view';
import {
  changeBody,
  fixLook,
  hasSavedLook,
  isOldSave,
  loadSettings,
  saveLook,
  saveSettings,
  wearsFirstLook,
  type FullLook,
  type Settings,
} from '../game/save';
import type { StateProgress } from '../game/progress';
import type { SpotId } from '../art/city';
import type { CityLife } from '../game/cityLife';
import { introDue, introSeen, markIntroSeen, type IntroFrom } from '../game/intro';
import type { Store } from '../storage';
import type { TiltAccess } from '../game/tilt';
import type { SoundName } from '../engine/sound';
import { CityScreen, type CitySound, type Mission } from './city';
import { IntroScreen, loadIntroScene, type IntroMusic } from './intro';
import { button, h } from './dom';
import { wheelFit } from './streets';
import type { RoadOpen, RoadView, StopInfo } from './road';
import { GAME_NAME, OGUN_WORDS, WORDS, WORLD_PART_WORDS } from './words';
import type { StateId } from '../game/states';
import type { WorldLoad, WorldPart } from '../worlds/load';
import type { WorldUi } from '../worlds/ui';
import type { Tune } from '../art/tunes';
import { gateIconSvg } from '../art/gateway';
import { arrivalCard, downloadCard, focusCard, noticeCard, partHeld, travelButtonHtml, travelCard, wheelLine, type DownloadCard, type OgunView } from './travel';
import { isNativeApp } from '../native/is-native';

export type MenuScreen = 'title' | 'builder' | 'credits' | 'road' | 'wheel' | 'pause' | 'gameover' | 'cleared' | 'win' | 'intro' | 'settings' | 'city' | 'ride' | 'ogun' | null;

/** Screens that fill the whole screen (no cream card in the middle). */
const FULL_SCREENS: readonly MenuScreen[] = ['wheel', 'intro', 'city', 'road', 'ride', 'ogun'];

/** Screens that open during play (design.md: Pause, Game over, Street cleared, Win): their buttons ignore taps for 0.4 s. */
const EVENT_SCREENS: readonly MenuScreen[] = ['pause', 'gameover', 'cleared', 'win'];
export const EVENT_SCREEN_GUARD_MS = 400;

/**
 * CO3: the challenge road screen (./road and the card pictures) is its own chunk, so the first
 * load is lighter. The service worker keeps it with every other file, so it opens offline. The
 * city asks for it while idle (preloadRoad), so the road usually builds at once, as before.
 */
type RoadModule = typeof import('./road');
let roadModule: RoadModule | null = null;
let roadLoading: Promise<RoadModule> | null = null;
export function preloadRoad(): Promise<RoadModule> {
  roadLoading ??= import('./road').then(
    (m) => (roadModule = m),
    (err: unknown) => {
      roadLoading = null; // the next try loads afresh
      throw err;
    },
  );
  return roadLoading;
}

/**
 * The second tap of a double tap lands about where the first one did, very soon after.
 * A tap that soon and that close to the tap that opened a screen (or started the run)
 * is ignored; a deliberate tap anywhere else works at once.
 */
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 48;

/** Where the "Play" tap landed (CSS px), so the game can ignore a double tap's second half. */
export interface TapPoint {
  x: number;
  y: number;
}

/** Sounds the menus play (S2.12 sounds 13 and 14). */
export type MenuSound = 'lockedTuk' | 'cogRatchet' | 'cogBell' | CitySound;

/** What the Streets screen and the wheel read (S2.8). */
export interface ProgressView {
  /** Lagos (the one state in version 1). */
  lagos: StateProgress;
  /** Street names in order (from the level files). */
  names: readonly string[];
  /** Street themes in order (the card pictures). */
  themes: readonly string[];
  /** Ids of the states whose cogs turn. */
  working: readonly string[];
}

/** O1b2: what the Travel card, the wheel, the Win screen and Ogun's place read (ogun.md part 1). */
export interface StatesView {
  /** The last city open (saved as `where`). */
  where: StateId;
  /** Ogun's arrival card has been closed once. */
  arrived: boolean;
  /** Lagos's Booming points and whether its cog turns. */
  lagos: { boom: number; turning: boolean };
  /** Ogun: open (Go-Slow Hall won), its Booming points, its cog, King Pothole beaten. */
  ogun: OgunView & { boom: number };
}

/** Where a screen in a run sends the player when the run ends ("Home" is the city, slice 3). */
export type LeaveTo = 'title' | 'road' | 'wheel' | 'city' | 'ogun';

export interface MenuHooks {
  /** "Play" on the title, or "Start running" in the builder. */
  start(at: TapPoint | null): void;
  /** S3e0: a stop card's big button: that stop's run, for the fix it shows (CR-Q1). */
  playStop(stop: StopInfo, at: TapPoint | null): void;
  /** What the challenge road reads (part 8 rule 2: the same records the Streets screen read). */
  roadView(): RoadView;
  /** The road's first-visit hint is due: true once (it is saved as seen). */
  roadHint(): boolean;
  /** A road card opened or closed (the back button's guard). */
  cardChanged?(): void;
  /** The look changed in the builder (already saved). */
  lookChanged(look: HeroLook): void;
  /** Pause: "Keep playing". */
  resume(): void;
  /** "Start again" or "Play again": the level from the start, full lives, 0 kobo. */
  restart(at: TapPoint | null): void;
  /** Street cleared: "Next street", or "Go to Go-Slow Hall" after the last street. */
  next(at: TapPoint | null): void;
  /** Leave the run (saving nothing from it) for the title, the challenge road, or the wheel. */
  leave(to: LeaveTo): void;
  /** The Sound switch changed (title or pause). */
  soundChanged(on: boolean): void;
  /** The Music switch changed (title, pause or the M key). */
  musicChanged(on: boolean): void;
  /** A screen opened or closed (null: back to play, or nothing). Music follows it (O2). */
  screenChanged?(screen: MenuScreen): void;
  progress(): ProgressView;
  playSound(name: MenuSound): void;
  /** The player asked for less motion: the wheel's cogs stand still (S2.11). */
  stillWanted(): boolean;
  /** The live city (city.md (b), 5W): buckets, boards, trays and the hero's place. */
  cityLife: CityLife;
  /** A problem card's big button: the challenge that helps (street 1 for Potholes). */
  runSpot(spot: SpotId, at: TapPoint | null): void;
  /** Street cleared's "Take it home" (5W W5): home to Lagos with Mission complete. */
  takeHome(): void;
  /** city.md a2.6: the moving intro's sounds (any sound name; the Sound switch still rules). */
  introSound?(name: SoundName): void;
  /** city.md a2.6: the moving intro's music (the menu tune's level, restart and pause). */
  introMusic?(m: IntroMusic): void;
  /** O1b2: the states as saved now. */
  states(): StatesView;
  /** O1b2: a later state's part, if it has loaded this visit. */
  worldPart(id: StateId): WorldPart | null;
  /** O1b2: loads a later state's part (never rejects). */
  loadWorld(id: StateId): Promise<WorldLoad>;
  /** O1b2: the city now open, saved as `where` (ogun.md 1.6). */
  setWhere(id: StateId): void;
  /** O1b2: Ogun's arrival card was closed (saved, so it shows once). */
  arrived(): void;
  /** O1b2: the welcome tune as the bus passes under the arch (the Music switch rules). */
  playTune(tune: Tune): void;
  /** O2b: Ogun's place: play Ogun street n (Ota is 1). */
  playOgun(n: number, at: TapPoint | null): void;
  /** O2b: Ogun street n is done (saved under states.ogun). */
  ogunDone(n: number): boolean;
}

/** What the game over and win screens show. */
export interface RunSummary {
  kobo: number;
  lives: number;
  /** Lost in Go-Slow Hall: the hall's game over words (S2.10). */
  hall?: boolean;
  /** O1b2: the first Go-Slow Hall win: the Win screen's big "On to Ogun" (later wins: a small "Go to Ogun"). */
  firstHall?: boolean;
  /** O2b: lost on an Ogun street: "You keep {money} for Ogun..." and no Challenge road. */
  ogun?: boolean;
}

/** What the Street cleared screen shows (S2.10). */
export interface ClearedSummary {
  /** The street's name, e.g. "Computer Village". */
  name: string;
  kobo: number;
  /** The last street of the state: the big button goes to Go-Slow Hall. */
  last: boolean;
  /** Got on the bus with the garri parcel: it is saved for the hall. */
  parcel: boolean;
  /** O2b: an Ogun street: home is Ogun's place; no Challenge road. */
  ogun?: boolean;
  /** O3b: an Ogun street with the next one built (Ota to Abeokuta): "Next street". */
  ogunNext?: boolean;
}

export class Menus {
  private readonly layer: HTMLElement;
  private screen: MenuScreen = null;
  private settings: Settings;
  private previewFrame = 0;
  /** The tap that opened the current screen, if it was a tap. */
  private opener: (TapPoint & { t: number }) | null = null;
  /** The tap on a menu button just now: a screen it opens ignores that double tap's second half. */
  private lastTap: (TapPoint & { t: number }) | null = null;
  private shownAt = 0;
  private summary: RunSummary = { kobo: 0, lives: 0 };
  private cleared: ClearedSummary = { name: '', kobo: 0, last: false, parcel: false };
  private look: FullLook;
  /** Builder: the player tapped a Hair or Outfit chip, so body and age no longer change them (S2.3). */
  private styled = false;
  /** Builder and the wheel's list: watches a scrolling box, to show the fade while more is below. */
  private sideWatch: ResizeObserver | null = null;
  /** Where the wheel's "Back" goes: where it opened from (S2.10 flow). */
  private wheelBack: 'title' | 'city' | 'ogun' = 'city';
  /** Where the challenge road opens (part 4 rule 4). */
  private roadOpen: RoadOpen = {};
  /** Where Settings' "Back" goes: where it opened from. */
  private settingsBack: 'title' | 'city' | 'ogun' = 'title';
  /** O1b2: a card over the screen (Travel, download, arrival), or null. */
  private overlay: HTMLElement | null = null;
  /** O1b2: a card to open over the next screen once it is in the page (the arrival card). */
  private overlayNext: HTMLElement | null = null;
  /** O1b2: the bus ride the 'ride' screen plays. */
  private rideNext: { ui: WorldUi; toLagos: boolean; first: boolean; then: () => void } | null = null;
  /** What follows the intro story (the builder, Play, or back to Settings). */
  private afterIntro: () => void = () => this.show('title');
  /** Stops the screen that is going away (the intro's drawing, the city's listeners). */
  private cleanup: (() => void) | null = null;
  private introScreen: IntroScreen | null = null;
  private cityScreen: CityScreen | null = null;
  /** Mission complete for the next city screen (5W W5), played once. */
  private mission: Mission | null = null;
  /** Lays out the wheel screen again (on resize while it shows). */
  private refit: (() => void) | null = null;
  /** S2.2: the title shows the touch words when the phone buttons are shown, else the key words. */
  touchWords: () => boolean = () => true;
  /** S3f0: the run being played is a lane run (its Pause card has its own buttons). */
  laneRun = false;
  /** O2b: the run is an Ogun street (Pause has no Challenge road; Home is Ogun's place). Set by main. */
  ogunRun = false;
  /** S3f3: the lane Pause card's "So far: ..." line. */
  laneSoFar = '';
  /** S3f0 part 25: can this phone tilt, and what it said (main sets it). Null: no tilt at all. */
  tilt: TiltAccess | null = null;
  /** Part 25.4: does iOS in the store app ask again after a no? (gamedev checks on a real iPhone.) */
  tiltAppAsksAgain = true;

  constructor(
    parent: HTMLElement,
    private readonly store: Store,
    look: HeroLook,
    private readonly hooks: MenuHooks,
  ) {
    this.look = fixLook(look);
    this.settings = loadSettings(store);
    // data-ui: taps inside menus never count as jumps.
    this.layer = h('div', { class: 'screen', 'data-ui': true, hidden: true });
    // A held Enter or Space must not press a focused button again and again.
    this.layer.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
      },
      true,
    );
    parent.append(this.layer);
    window.addEventListener('resize', () => this.refit?.());
  }

  get current(): MenuScreen {
    return this.screen;
  }

  get sound(): boolean {
    return this.settings.sound;
  }

  /** The Music switch (S2.9 rule 5), remembered as gidi-music. */
  get music(): boolean {
    return this.settings.music;
  }

  /** The Music switch and the M key: flips it, saves it, and updates any switch on screen. */
  toggleMusic(): boolean {
    this.settings.music = !this.settings.music;
    saveSettings(this.store, this.settings);
    const w = WORDS.title;
    for (const sw of this.layer.querySelectorAll<HTMLElement>('.music-switch')) {
      const label = sw.querySelector('span');
      if (label) label.textContent = this.settings.music ? w.musicOn : w.musicOff;
      sw.classList.toggle('is-off', !this.settings.music);
    }
    this.hooks.musicChanged(this.settings.music);
    return this.settings.music;
  }

  get gentle(): boolean {
    return this.settings.gentle;
  }

  /** S3f3: the lane run's caught card has its own Gentle mode switch (it counts from the next run). */
  setGentle(on: boolean): void {
    this.settings.gentle = on;
    saveSettings(this.store, this.settings);
  }

  /** S3f0 part 3: "Buttons instead of swipes" in the lane run. */
  get laneButtons(): boolean {
    return this.settings.buttonsInsteadOfSwipes;
  }

  /** S3f0 part 25: "Tilt to steer" is saved on (kept even on a phone with no sensor). */
  get tiltSaved(): boolean {
    return this.settings.tiltToSteer;
  }

  /** Tilt steers now: saved on, a phone that can tilt, and not refused this visit (25.4, 25.5). */
  get laneTilt(): boolean {
    const t = this.tilt;
    return this.settings.tiltToSteer && t !== null && t.canTilt && t.answer !== 'denied';
  }

  /** Turns "Tilt to steer" on or off (saved); any switch on screen follows. */
  setTilt(on: boolean): void {
    this.settings.tiltToSteer = on;
    saveSettings(this.store, this.settings);
    this.syncTilt();
  }

  /** The tilt switches on screen show the phone's state now (found, refused, asked). */
  syncTilt(): void {
    for (const row of this.layer.querySelectorAll<HTMLElement>('.tilt-row')) this.fillTiltRow(row);
  }

  /** The HUD sound button. Remembered on the phone. */
  toggleSound(): boolean {
    this.settings.sound = !this.settings.sound;
    saveSettings(this.store, this.settings);
    return this.settings.sound;
  }

  showGameOver(summary: RunSummary): void {
    this.summary = summary;
    this.show('gameover');
  }

  showCleared(summary: ClearedSummary): void {
    this.cleared = summary;
    this.show('cleared');
  }

  showWin(summary: RunSummary): void {
    this.summary = summary;
    this.show('win');
  }

  /** Opens Nigeria's wheel; its "Back" goes to `back`. */
  showWheel(back: 'title' | 'city' | 'ogun'): void {
    this.wheelBack = back;
    this.show('wheel');
  }

  /** S3e0: the challenge road, on a stop (with its card open from a city card's "See the stop"). */
  showRoad(open: RoadOpen = {}): void {
    this.roadOpen = open;
    this.show('road');
  }

  /** Opens Lagos from above; with a mission, Mission complete plays there first (5W W5). */
  showCity(mission: Mission | null = null): void {
    this.mission = mission;
    this.show('city');
  }

  /** Opens Settings; its "Back" goes to `back`. */
  showSettings(back: 'title' | 'city' | 'ogun'): void {
    this.settingsBack = back;
    this.show('settings');
  }

  /**
   * The intro story when it is due (city.md (a)): before the builder on a first visit, once on the
   * next "Play" for a player who already has a hero, and always from Settings. Then `after`.
   */
  showIntro(from: IntroFrom, after: (by?: MouseEvent) => void, by?: MouseEvent): void {
    if (!introDue(introSeen(this.store), from)) {
      // Straight on, with the tap that got here (the next screen ignores its double tap's second half).
      after(by);
      return;
    }
    this.afterIntro = () => after();
    this.show('intro', by);
  }

  /** The intro screen showing now (tests), or null. */
  get intro(): IntroScreen | null {
    return this.screen === 'intro' ? this.introScreen : null;
  }

  /** The city screen showing now (tests), or null. */
  get city(): CityScreen | null {
    return this.screen === 'city' ? this.cityScreen : null;
  }

  show(screen: MenuScreen, by?: MouseEvent): void {
    const stop = this.cleanup;
    this.cleanup = null;
    stop?.();
    cancelAnimationFrame(this.previewFrame);
    this.sideWatch?.disconnect();
    this.sideWatch = null;
    this.refit = null;
    this.screen = screen;
    this.shownAt = performance.now();
    const at = by ? tapPoint(by) : null;
    this.opener = at ? { ...at, t: performance.now() } : this.lastTap;
    this.lastTap = null;
    this.layer.replaceChildren();
    this.overlay = null;
    this.layer.hidden = screen === null;
    this.layer.classList.toggle('full', FULL_SCREENS.includes(screen));
    this.hooks.screenChanged?.(screen);
    let card: HTMLElement | null = null;
    if (screen === 'title') card = this.title();
    if (screen === 'builder') card = this.builder();
    if (screen === 'credits') card = this.credits();
    if (screen === 'road') card = this.road();
    if (screen === 'wheel') card = this.wheel();
    if (screen === 'pause') card = this.pause();
    if (screen === 'gameover') card = this.gameOver();
    if (screen === 'cleared') card = this.streetCleared();
    if (screen === 'win') card = this.win();
    if (screen === 'intro') card = this.intro_();
    if (screen === 'settings') card = this.settingsCard();
    if (screen === 'city') card = this.cityCard();
    if (screen === 'ride') card = this.rideCard();
    if (screen === 'ogun') card = this.ogunCard();
    if (!card) {
      // O1b2: Ogun's part is not here after all (never expected): Lagos instead.
      if (screen === 'ride' || screen === 'ogun') this.show('city');
      return;
    }
    this.layer.append(card);
    const next = this.overlayNext;
    this.overlayNext = null;
    if (next) this.openOverlay(next);
    if (screen === 'city') this.cityScreen?.start();
    // Set by wheel() just now (TypeScript still thinks it is the null set above).
    (this.refit as (() => void) | null)?.();
    // po M4 bug 4: a card that opens in a run puts focus on its big button, so Space or Enter
    // presses it (after the 0.4 s guard).
    if (EVENT_SCREENS.includes(screen)) card.querySelector<HTMLElement>('.go')?.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- O1b2: the way to Ogun

  /** A card (Travel, download, arrival) is open over the screen. */
  get cardOpen(): boolean {
    return this.overlay !== null;
  }

  private openOverlay(el: HTMLElement): void {
    this.overlay?.remove();
    this.overlay = el;
    this.layer.append(el);
    focusCard(el);
    this.hooks.cardChanged?.();
  }

  private closeOverlay(): void {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
    this.layer.querySelector<HTMLElement>('.go, button')?.focus({ preventScroll: true });
    this.hooks.cardChanged?.();
  }

  /** "Play": the city last used (ogun.md 1.6). Ogun opens only with its part on the phone; else Lagos. */
  openHome(): void {
    const v = this.hooks.states();
    if (v.where !== 'ogun') {
      this.show('city');
      return;
    }
    if (this.hooks.worldPart('ogun')?.ui) {
      this.show('ogun');
      return;
    }
    const from = this.screen;
    void this.hooks.loadWorld('ogun').then((r) => {
      if (this.screen !== from) return;
      this.show(r.ok && r.part.ui ? 'ogun' : 'city');
    });
  }

  /**
   * Go to a state (the Win screen's "On to Ogun", the "To Ogun" stop, the Travel card). Ogun
   * needs its part first (the download card on the web, when it is not on the phone yet); then
   * the bus ride (always the first time, after that only with "Show the bus ride" on), then
   * Ogun's place with the arrival card the first time. Never starts a run.
   */
  travelTo(to: StateId): void {
    const v = this.hooks.states();
    if (to === 'lagos') {
      this.closeOverlay();
      if (this.screen === 'city') return;
      const ui = this.hooks.worldPart('ogun')?.ui;
      const home = (): void => {
        this.hooks.setWhere('lagos');
        this.show('city');
      };
      if (ui && this.settings.busRide && this.screen === 'ogun') {
        this.rideNext = { ui, toLagos: true, first: false, then: home };
        this.show('ride');
      } else home();
      return;
    }
    if (!v.ogun.open) return;
    if (this.screen === 'ogun') {
      this.closeOverlay();
      return;
    }
    void this.withOgun((ui) => {
      const arrive = (): void => {
        this.hooks.setWhere('ogun');
        this.show('ogun');
      };
      const first = !v.arrived;
      if (first || this.settings.busRide) {
        this.rideNext = { ui, toLagos: false, first, then: arrive };
        this.show('ride');
      } else arrive();
    });
  }

  /** Runs `then` with Ogun's part: at once if loaded; else loads it, asking first on the web (ogun.md 9.2). */
  private async withOgun(then: (ui: WorldUi) => void): Promise<void> {
    const have = this.hooks.worldPart('ogun')?.ui;
    if (have) return then(have);
    const from = this.screen;
    const load = async (card: DownloadCard | null): Promise<void> => {
      const r = await this.hooks.loadWorld('ogun');
      // The player left first (another screen, or the card closed by Escape, "Not now" or back):
      // do nothing more. The part may stay on the phone for next time.
      if (this.screen !== from || (card && this.overlay !== card.el)) return;
      if (r.ok && r.part.ui) {
        this.closeOverlay();
        then(r.part.ui);
        return;
      }
      const message = r.ok ? WORLD_PART_WORDS.broken : r.message;
      if (card) card.step(message === OGUN_WORDS.download.noNet ? 'noNet' : 'broken', message);
      else this.openOverlay(noticeCard(message, () => this.closeOverlay()));
    };
    // The store app has the part inside; a web player who already downloaded it is not asked again.
    if (isNativeApp() || (await partHeld('ogun'))) return load(null);
    if (this.screen !== from) return;
    const card = downloadCard(
      () => {
        card.step('loading');
        void load(card);
      },
      () => this.closeOverlay(),
    );
    this.openOverlay(card.el);
  }

  /** The Travel card (ogun.md 1.5) over the city or Ogun's place. */
  private openTravel(): void {
    const v = this.hooks.states();
    const here = this.screen === 'ogun' ? 'ogun' : 'lagos';
    const w = OGUN_WORDS.travel;
    this.openOverlay(
      travelCard(
        [
          { id: 'lagos', name: w.lagos, boom: v.lagos.boom, turning: v.lagos.turning, here: here === 'lagos' },
          { id: 'ogun', name: w.ogun, boom: v.ogun.boom, turning: v.ogun.turning, here: here === 'ogun' },
        ],
        (id) => (id === here ? this.closeOverlay() : this.travelTo(id)),
        () => this.closeOverlay(),
      ),
    );
  }

  /** The city's (and Ogun's) "Travel" button, with its small danfo icon. */
  private travelButton(): HTMLButtonElement {
    const b = this.guarded('', 'minor travel-button', () => this.openTravel());
    b.innerHTML = travelButtonHtml();
    return b;
  }

  /** ogun.md 1.3: the bus ride through the gateway. */
  private rideCard(): HTMLElement | null {
    const r = this.rideNext;
    this.rideNext = null;
    if (!r) return null;
    const w = OGUN_WORDS.busRide;
    const ride = r.ui.busRide({
      look: this.look,
      toLagos: r.toLagos,
      lit: this.hooks.states().ogun.beaten,
      still: this.hooks.stillWanted(),
      first: r.first,
      spoken: r.toLagos ? w.spokenOut : w.spokenIn,
      skip: w.skip,
      tune: () => this.hooks.playTune(r.ui.tune),
      done: () => r.then(),
    });
    this.cleanup = () => ride.close();
    return ride.el;
  }

  /**
   * Ogun's place. Ogun's city comes with O6b and Ota's street play with O2b; until then this is
   * the gateway picture, the words that Ota is next, and Travel, the wheel and Settings.
   */
  private ogunCard(): HTMLElement | null {
    const ui = this.hooks.worldPart('ogun')?.ui;
    if (!ui) return null;
    const v = this.hooks.states();
    const w = OGUN_WORDS.place;
    const pic = h('canvas', { class: 'ogun-pic', 'aria-hidden': 'true' });
    const sound = this.guarded(this.settings.sound ? WORDS.city.soundOn : WORDS.city.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sound.textContent = this.settings.sound ? WORDS.city.soundOn : WORDS.city.soundOff;
      this.hooks.soundChanged(this.settings.sound);
    });
    const el = h(
      'div',
      { class: 'card ogun-screen', role: 'dialog', 'aria-label': w.heading },
      pic,
      h('div', { class: 'ogun-top' }, h('h2', {}, w.heading), h('div', { class: 'minor-row' }, sound, this.guarded(WORDS.city.settings, 'minor', () => this.showSettings('ogun')))),
      // O2b: Ota plays (Ogun's city comes with O6b).
      h(
        'div',
        { class: 'ogun-words' },
        h('p', {}, h('b', {}, w.line)),
        h('p', {}, v.ogun.beaten ? OGUN_WORDS.hall.open : this.hooks.ogunDone(3) ? w.sagamuDone : this.hooks.ogunDone(2) ? w.abeokutaDone : this.hooks.ogunDone(1) ? w.otaDone : w.soon),
        // O3b, O4b: the newest open street is the big button, the ones before it small. O5b: then Pothole Hall.
        ...[4, 3, 2, 1].map((n) => {
          const top = this.hooks.ogunDone(3) ? 4 : this.hooks.ogunDone(2) ? 3 : this.hooks.ogunDone(1) ? 2 : 1;
          return n <= top && this.guarded([w.play, w.playAbeokuta, w.playSagamu, OGUN_WORDS.cleared.toHall][n - 1]!, n === top ? 'go ogun-play' : 'minor ogun-play', (e) => this.hooks.playOgun(n, tapPoint(e)));
        }),
      ),
      h('div', { class: 'ogun-bottom' }, this.travelButton(), this.guarded(WORDS.city.wheel, 'minor two-line', () => this.showWheel('ogun'))),
    );
    this.refit = () => ui.paintHome(pic, { lit: v.ogun.beaten });
    if (!v.arrived) {
      this.overlayNext = arrivalCard(() => {
        this.hooks.arrived();
        this.closeOverlay();
      });
    }
    return el;
  }

  /** A tap that should not count: the second half of a double tap, or too soon after the game opened a screen. */
  private ignoreTap(e: MouseEvent): boolean {
    if (isSecondTap(this.opener, tapPoint(e))) return true;
    return EVENT_SCREENS.includes(this.screen) && performance.now() - this.shownAt < EVENT_SCREEN_GUARD_MS;
  }

  /** A button whose taps go through ignoreTap first. */
  private guarded(label: string, cls: string, onTap: (e: MouseEvent) => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    return button(label, cls, (e) => {
      if (this.ignoreTap(e)) return;
      const at = tapPoint(e);
      this.lastTap = at ? { ...at, t: performance.now() } : null;
      onTap(e);
      this.lastTap = null;
    }, attrs);
  }

  private gentleSwitch(): HTMLButtonElement {
    const sw = button(WORDS.title.gentle, 'minor gentle', (e) => {
      if (this.ignoreTap(e)) return;
      this.settings.gentle = !this.settings.gentle;
      saveSettings(this.store, this.settings);
      sw.setAttribute('aria-checked', String(this.settings.gentle));
    }, { role: 'switch', 'aria-checked': String(this.settings.gentle) });
    return sw;
  }

  /** S3f0 part 3: "Buttons instead of swipes: off" / "...: on" (Settings and the lane Pause card). It counts at once. */
  private laneButtonsSwitch(): HTMLButtonElement {
    const w = WORDS.lane;
    const label = (): string => (this.settings.buttonsInsteadOfSwipes ? w.buttonsOn : w.buttonsOff);
    const sw = this.guarded(label(), 'minor', () => {
      this.settings.buttonsInsteadOfSwipes = !this.settings.buttonsInsteadOfSwipes;
      saveSettings(this.store, this.settings);
      sw.textContent = label();
      sw.setAttribute('aria-checked', String(this.settings.buttonsInsteadOfSwipes));
    }, { role: 'switch', 'aria-checked': String(this.settings.buttonsInsteadOfSwipes) });
    return sw;
  }

  /**
   * S3f0 part 25.1: "Tilt to steer: off" / "...: on", under "Buttons instead of swipes" in Settings
   * and on the lane Pause card, only on a phone that can tilt. On an iPhone, turning it on asks
   * Apple's box from this tap (25.4); a no turns it back off with the two lines under it.
   */
  private tiltRow(where: 'settings' | 'pause'): HTMLElement {
    // Empty and hidden until the phone is found to tilt: a computer gets no switch at all.
    const row = h('div', { class: `tilt-row ${where}`, hidden: true });
    this.fillTiltRow(row);
    return row;
  }

  /** The switch and its lines, made the first time the row can show. */
  private tiltParts(row: HTMLElement): void {
    const w = WORDS.lane;
    const sw = this.guarded(w.tiltOff, 'minor tilt-switch', () => {
      const t = this.tilt;
      if (!t) return;
      if (this.laneTilt) {
        this.setTilt(false);
        return;
      }
      this.setTilt(true);
      if (!t.ios) return;
      // Inside the tap: Safari shows its box only then. "Allow" works at once.
      void t.ask('switch').then((a) => {
        if (a === 'denied') this.setTilt(false);
        else this.syncTilt();
      });
      this.syncTilt();
    }, { role: 'switch', 'aria-label': w.tiltName, 'aria-checked': 'false' });
    row.append(sw, h('p', { class: 'small tilt-lines' }));
  }

  private fillTiltRow(row: HTMLElement): void {
    const w = WORDS.lane;
    const t = this.tilt;
    row.hidden = !t || !t.canTilt;
    if (row.hidden) return;
    if (!row.querySelector('.tilt-switch')) this.tiltParts(row);
    const on = this.laneTilt;
    const sw = row.querySelector('.tilt-switch');
    if (sw) {
      sw.textContent = on ? w.tiltOn : w.tiltOff;
      sw.setAttribute('aria-checked', String(on));
    }
    const lines: string[] = [];
    if (t?.ios && t.answer === 'denied') lines.push(w.tiltDenied, this.tiltAppAsksAgain || !isNativeApp() ? w.tiltRetry : w.tiltRetryApp);
    else {
      if (row.classList.contains('settings')) lines.push(w.tiltPrivacy);
      if (t?.ios && t.answer !== 'granted') lines.push(w.tiltAskFirst);
    }
    const p = row.querySelector('.tilt-lines');
    if (p instanceof HTMLElement) {
      p.replaceChildren(...lines.flatMap((l, i) => (i === 0 ? [l] : [h('br'), l])));
      p.hidden = lines.length === 0;
    }
  }

  /** "Sound: on" / "Sound: off" (title and pause). */
  private soundSwitch(): HTMLButtonElement {
    const w = WORDS.title;
    const sw = this.guarded(this.settings.sound ? w.soundOn : w.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sw.textContent = this.settings.sound ? w.soundOn : w.soundOff;
      this.hooks.soundChanged(this.settings.sound);
    });
    return sw;
  }

  /** "Music: on" / "Music: off" with the note icon (title and pause). */
  private musicSwitch(): HTMLButtonElement {
    const w = WORDS.title;
    const label = h('span', {}, this.settings.music ? w.musicOn : w.musicOff);
    const sw = this.guarded('', 'minor music-switch', () => this.toggleMusic());
    sw.innerHTML = MUSIC_SVG;
    sw.append(label);
    sw.classList.toggle('is-off', !this.settings.music);
    return sw;
  }

  /** O1b2 (ogun.md 1.3): "Show the bus ride: on" / "...: off" (default on). */
  private busRideSwitch(): HTMLButtonElement {
    const w = OGUN_WORDS.busRide;
    const label = (): string => (this.settings.busRide ? w.settingOn : w.settingOff);
    const sw = this.guarded(label(), 'minor', () => {
      this.settings.busRide = !this.settings.busRide;
      saveSettings(this.store, this.settings);
      sw.textContent = label();
      sw.setAttribute('aria-checked', String(this.settings.busRide));
    }, { role: 'switch', 'aria-checked': String(this.settings.busRide) });
    return sw;
  }

  /** S2.10 Pause: four buttons (2 x 2 on small screens), then the two switches in one row. */
  private pause(): HTMLElement {
    const w = WORDS.pause;
    if (this.laneRun) {
      // S3f0 part 14: "Keep playing", "Start again", "Back to Lagos", then Sound, Music and the buttons switch.
      return h(
        'div',
        { class: 'card narrow event pause-card lane-pause-card', role: 'dialog', 'aria-label': w.heading },
        h('h2', {}, w.heading),
        this.laneSoFar ? h('p', { class: 'small' }, this.laneSoFar) : null,
        h(
          'div',
          { class: 'pause-grid' },
          this.guarded(w.keepPlaying, 'go', () => this.hooks.resume()),
          this.guarded(w.restart, 'go secondary', (e) => this.hooks.restart(tapPoint(e))),
          this.guarded(WORDS.lane.pauseHome, 'minor', () => this.hooks.leave('city')),
        ),
        h('div', { class: 'minor-row switches' }, this.soundSwitch(), this.musicSwitch(), this.laneButtonsSwitch()),
        this.tiltRow('pause'),
      );
    }
    return h(
      'div',
      { class: 'card narrow event pause-card', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h(
        'div',
        { class: 'pause-grid' },
        this.guarded(w.keepPlaying, 'go', () => this.hooks.resume()),
        this.guarded(w.restart, 'go secondary', (e) => this.hooks.restart(tapPoint(e))),
        // O2b: the challenge road is Lagos's; from an Ogun street Home is Ogun's place.
        !this.ogunRun && this.guarded(w.road, 'minor', () => this.hooks.leave('road')),
        this.guarded(w.home, 'minor', () => this.hooks.leave('city')),
      ),
      h('div', { class: 'minor-row switches' }, this.soundSwitch(), this.musicSwitch()),
    );
  }

  /** The big button and the small ones: one row on short wide screens (po M4 bug 1). */
  private actions(big: HTMLButtonElement, ...small: HTMLButtonElement[]): HTMLElement {
    return h('div', { class: 'actions' }, big, h('div', { class: 'minor-row' }, ...small));
  }

  private gameOver(): HTMLElement {
    const w = WORDS.gameOver;
    return h(
      'div',
      { class: 'card narrow event over', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, this.summary.hall ? (this.summary.ogun ? OGUN_WORDS.gameOver.hallText : w.hallText) : this.summary.ogun ? OGUN_WORDS.gameOver.text(this.summary.kobo) : w.text(this.summary.kobo)),
      // Gentle mode is offered only while it is off; it counts from the next run (Q15).
      !this.settings.gentle && h('div', { class: 'gentle-row' }, h('p', { class: 'small' }, this.summary.hall ? w.hallGentleOffer : w.gentleOffer), this.gentleSwitch()),
      this.actions(
        this.guarded(w.playAgain, 'go', (e) => this.hooks.restart(tapPoint(e))),
        ...(this.summary.ogun ? [] : [this.guarded(w.road, 'minor', () => this.hooks.leave('road'))]),
        this.guarded(w.home, 'minor', () => this.hooks.leave('city')),
      ),
    );
  }

  /** S2.10 Street cleared, with Tp's line and the parcel line. */
  private streetCleared(): HTMLElement {
    const w = WORDS.cleared;
    const c = this.cleared;
    return h(
      'div',
      { class: 'card narrow event', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(c.name, c.kobo)),
      c.parcel && h('p', { class: 'parcel-line' }, c.ogun ? OGUN_WORDS.cleared.parcel : w.parcel),
      // (c), 5W W5: the big button takes the win home to Lagos; "Next street" becomes small.
      // O2b: from Ogun it goes home to Ogun's place; O3b: Ota's card goes on to Abeokuta.
      this.actions(
        this.guarded(w.takeHome, 'go', () => this.hooks.takeHome()),
        ...(c.ogun
          ? [
              ...(c.ogunNext ? [this.guarded(c.last ? OGUN_WORDS.cleared.toHall : w.next, 'minor', (e) => this.hooks.next(tapPoint(e)))] : []),
              this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))),
            ]
          : [
              this.guarded(c.last ? w.toHall : w.next, 'minor', (e) => this.hooks.next(tapPoint(e))),
              this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))),
              this.guarded(w.road, 'minor', () => this.hooks.leave('road')),
            ]),
      ),
    );
  }

  /** S2.10 Win: lives left (no kobo), the cog line, "See Nigeria's wheel". */
  private win(): HTMLElement {
    const w = WORDS.win;
    if (this.summary.ogun) {
      // O5b (ogun.md 5.5): Pothole Hall's Win screen. Ogun's challenge road comes with its city (O6b).
      const o = OGUN_WORDS.win;
      return h(
        'div',
        { class: 'card narrow event', role: 'dialog', 'aria-label': o.heading },
        h('h2', {}, o.heading),
        h('p', {}, o.line),
        h('p', {}, OGUN_WORDS.win.money(this.summary.kobo)),
        this.actions(this.guarded(o.takeHome, 'go', () => this.hooks.takeHome()), this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e)))),
      );
    }
    const o = OGUN_WORDS.lagosWin;
    const n = this.hooks.progress().working.length;
    // O1b2 (ogun.md 1.2): the road to Ogun is open. The first win's big button is "On to Ogun";
    // after later wins a small "Go to Ogun" stays.
    const first = this.summary.firstHall === true;
    const toOgun = this.guarded(first ? o.onToOgun : o.goToOgun, first ? 'go' : 'minor', () => this.hooks.leave('ogun'));
    const wheel = this.guarded(w.wheel, first ? 'minor' : 'go', () => this.hooks.leave('wheel'));
    const small = [this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))), this.guarded(w.road, 'minor', () => this.hooks.leave('road'))];
    return h(
      'div',
      { class: 'card narrow event', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(this.summary.lives)),
      h('p', {}, w.cog(n)),
      h('p', {}, o.line),
      first ? this.actions(toOgun, wheel, ...small) : this.actions(wheel, toOgun, ...small),
    );
  }

  /**
   * S3e0: the challenge road (src/screens/road.ts). CO3: when its chunk is not in yet, a short
   * "Opening the road..." shows, and the road takes its place as soon as the chunk is in.
   */
  private road(): HTMLElement {
    if (roadModule) return this.roadWith(roadModule);
    const wait = h('section', { class: 'road-opening', role: 'status' });
    wait.textContent = WORDS.city.roadOpening;
    let gone = false;
    this.cleanup = () => (gone = true);
    void preloadRoad().then(
      (m) => {
        if (gone || this.screen !== 'road' || !wait.isConnected) return;
        const el = this.roadWith(m);
        wait.replaceWith(el);
        (this.refit as (() => void) | null)?.();
      },
      () => {
        if (!gone && this.screen === 'road' && wait.isConnected) this.show('city');
      },
    );
    return wait;
  }

  private roadWith(m: RoadModule): HTMLElement {
    const w = WORDS.city;
    const sound = this.guarded('', 'minor road-sound', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      label();
      this.hooks.soundChanged(this.settings.sound);
    });
    const label = (): void => {
      const t = this.settings.sound ? w.soundOn : w.soundOff;
      sound.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M1 6h3l4-4v12l-4-4H1z"/><path d="${this.settings.sound ? 'M10 5q2 3 0 6M12 3q4 5 0 10' : 'M10 5l5 6M15 5l-5 6'}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>${t}</span>`;
      sound.setAttribute('aria-label', t);
    };
    label();
    const screen = m.roadScreen(
      {
        view: () => this.hooks.roadView(),
        look: () => this.look,
        still: () => this.hooks.stillWanted(),
        soundButton: sound,
        home: () => this.show('city'),
        play: (stop, e) => {
          this.hooks.playSound('horn');
          // O1b2: the "To Ogun" stop goes to Ogun (the bus ride), never a run.
          if (stop.id === 'ogun') this.travelTo('ogun');
          else this.hooks.playStop(stop, tapPoint(e));
        },
        locked: () => this.hooks.playSound('lockedTuk'),
        hintDue: () => this.hooks.roadHint(),
        cardChanged: () => this.hooks.cardChanged?.(),
      },
      this.roadOpen,
    );
    this.roadOpen = {};
    this.refit = screen.refit;
    this.cleanup = screen.close;
    return screen.el;
  }

  /**
   * S2.8 Nigeria's wheel: the wheel as tall as the screen, the words in a rail beside it, and
   * "All names" opening the full list. One list in the page, used both ways (screen readers
   * hear it after the count line on the wheel view).
   */
  private wheel(): HTMLElement {
    const w = WORDS.wheel;
    const p = this.hooks.progress();
    const working = new Set(p.working);
    const n = WHEEL_STATES.filter((s) => working.has(s.id)).length;
    // O1b2 (ogun.md 1.7): the rail's line follows the road to Ogun; Ogun open but not turning
    // carries the pennant (on the cog and before "Ogun, next" in the list), never colour alone.
    const ogun = this.hooks.states().ogun;
    const moreLine = wheelLine(n, ogun);
    const next = ogun.open && !ogun.turning && !working.has('ogun') ? 'ogun' : null;

    const pic = h('div', { class: 'wheel-box', 'aria-hidden': 'true' });
    pic.innerHTML = wheelSvg(working, { turn: !this.hooks.stillWanted(), next: next ? [next] : [] });

    const list = h(
      'ul',
      { class: 'names' },
      ...WHEEL_STATES.map((s) => {
        const on = working.has(s.id);
        if (s.id === next) {
          const flag = h('span', { class: 'tick pennant', 'aria-hidden': 'true' });
          flag.innerHTML = gateIconSvg('pennant', 14);
          return h('li', { class: 'next' }, flag, OGUN_WORDS.wheel.listNext, h('span', { class: 'sr-only' }, w.notWorking));
        }
        return h(
          'li',
          { class: on ? 'on' : undefined },
          h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'),
          s.name,
          h('span', { class: 'sr-only' }, on ? w.working : w.notWorking),
        );
      }),
    );
    const listSpot = h('div', { class: 'names-spot sr-only' }, list);
    const allNames = button(w.allNames, 'minor', () => openList());
    const rail = h(
      'div',
      { class: 'wheel-rail' },
      h('h2', {}, w.heading),
      h('p', { class: 'wide-only' }, w.about),
      h('p', { class: 'wide-only' }, h('b', {}, w.count(n)), ' ', moreLine),
      h('p', { class: 'narrow-only count', 'aria-hidden': 'true' }, h('b', {}, w.countShort(n)), h('span', {}, w.cogsTurning)),
      listSpot,
      h('div', { class: 'wheel-buttons' }, allNames, button(w.back, 'minor', () => this.show(this.wheelBack))),
    );

    const heading = h('h2', { tabindex: '-1' }, w.listHeading);
    const bar = h('div', { class: 'side-bar', 'aria-hidden': 'true', hidden: true });
    const box = h('div', { class: 'names-box' }, h('p', {}, w.about), h('p', {}, w.count(n), ' ', moreLine), h('p', {}, w.tickNote));
    const panel = h(
      'div',
      { class: 'names-panel' },
      h('div', { class: 'names-top' }, heading, button(w.close, 'minor', () => closeList())),
      h('div', { class: 'names-wrap' }, box, bar),
    );
    const card = h('div', { class: 'card wheel-card', role: 'dialog', 'aria-label': w.heading }, pic, rail, panel);

    const openList = (): void => {
      card.classList.add('list-open');
      box.append(list);
      this.watchSide(box, bar);
      heading.focus({ preventScroll: true });
    };
    const closeList = (): void => {
      card.classList.remove('list-open');
      this.sideWatch?.disconnect();
      this.sideWatch = null;
      listSpot.append(list);
      allNames.focus({ preventScroll: true });
    };
    // Tapping the wheel picture opens the list too.
    pic.addEventListener('click', () => openList());
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card.classList.contains('list-open')) {
        e.preventDefault();
        e.stopPropagation();
        closeList();
      }
    });

    this.refit = (): void => {
      const safe = readSafeArea();
      const sw = window.innerWidth - safe.left - safe.right;
      // The card's own height: less than the window while the update banner shows above it (U1).
      const sh = card.clientHeight || window.innerHeight - safe.top - safe.bottom;
      const f = wheelFit(sw, sh);
      card.classList.toggle('narrow-rail', f.narrow);
      card.classList.toggle('upright', f.portrait);
      const put = (el: HTMLElement, x: number, y: number, wd: number, ht: number): void => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${wd}px`;
        el.style.height = `${ht}px`;
      };
      put(pic, f.wheelX, f.wheelY, f.w, f.w);
      put(rail, f.railX, f.railY, f.r, f.railH);
    };
    return card;
  }

  private title(): HTMLElement {
    const saved = hasSavedLook(this.store);
    const w = WORDS.title;
    // city.md a2: the moving story is its own chunk; fetch it soon for a player who will see it.
    if (!introSeen(this.store)) window.setTimeout(() => void loadIntroScene().catch(() => undefined), 1500);
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': GAME_NAME },
      h('h1', {}, GAME_NAME),
      h('p', { class: 'tagline' }, w.tagline),
      h('p', {}, this.touchWords() ? w.howTo : w.howToKeys),
      saved
        ? button(w.start, 'go', (e) => {
            const at = tapPoint(e);
            // city.md (a): a player who has a hero but has not seen the story sees it once now.
            this.showIntro('play', () => {
              // S2.3: a slice 1 hero opens the builder once, with the "New!" line.
              if (isOldSave(this.store)) this.show('builder', this.screen === 'intro' ? undefined : e);
              else this.hooks.start(this.screen === 'intro' ? null : at);
            }, e);
          })
        : button(w.makeHero, 'go', (e) => this.showIntro('makeHero', (by) => this.show('builder', by), e)),
      h(
        'div',
        { class: 'minor-row' },
        saved && button(w.changeHero, 'minor', (e) => this.show('builder', e)),
        button(w.wheel, 'minor', () => this.showWheel('title')),
        button(w.credits, 'minor', () => this.show('credits')),
        button(w.settings, 'minor', () => this.showSettings('title')),
        this.soundSwitch(),
        this.musicSwitch(),
      ),
    );
  }

  /** city.md (a) Settings: one column of buttons, each at least 44 px tall. */
  private settingsCard(): HTMLElement {
    const w = WORDS.settings;
    const ogunOpen = this.hooks.states().ogun.open;
    return h(
      'div',
      { class: 'card narrow settings-card', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h(
        'div',
        { class: 'settings-list' },
        this.soundSwitch(),
        this.musicSwitch(),
        this.gentleSwitch(),
        this.laneButtonsSwitch(),
        this.tiltRow('settings'),
        ogunOpen && this.busRideSwitch(),
        button(w.story, 'minor', (e) => this.showIntro('replay', () => this.showSettings(this.settingsBack), e)),
        button(w.back, 'go', () => this.show(this.settingsBack)),
      ),
      ogunOpen && h('p', { class: 'small settings-saved' }, OGUN_WORDS.saved),
    );
  }

  /** city.md (a) The intro story; when it ends or is skipped it is saved as seen. */
  private intro_(): HTMLElement {
    const screen = new IntroScreen({
      look: hasSavedLook(this.store) ? this.look : null,
      still: () => this.hooks.stillWanted(),
      touch: () => this.touchWords(),
      ignoreTap: (e) => this.ignoreTap(e),
      sound: (name) => this.hooks.introSound?.(name),
      music: (m) => this.hooks.introMusic?.(m),
      end: () => {
        markIntroSeen(this.store);
        this.afterIntro();
      },
    });
    this.introScreen = screen;
    this.cleanup = () => screen.close();
    return screen.el;
  }

  /** city.md (b) Lagos from above, the home screen. */
  private cityCard(): HTMLElement {
    const w = WORDS.city;
    const sound = this.guarded(this.settings.sound ? w.soundOn : w.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sound.textContent = this.settings.sound ? w.soundOn : w.soundOff;
      this.hooks.soundChanged(this.settings.sound);
    });
    const mission = this.mission;
    this.mission = null;
    const screen = new CityScreen({
      life: this.hooks.cityLife,
      look: () => this.look,
      sound: (name) => this.hooks.playSound(name),
      gentle: () => this.settings.gentle,
      still: () => this.hooks.stillWanted(),
      touch: () => this.touchWords(),
      mission,
      topRight: [sound, button(w.settings, 'minor', () => this.showSettings('city'))],
      bottom: [
        button(w.road, 'minor two-line', () => this.showRoad()),
        // O1b2 (ogun.md 1.2): "Travel" once Ogun is open.
        ...(this.hooks.states().ogun.open ? [this.travelButton()] : []),
        button(w.hero, 'minor', (e) => this.show('builder', e)),
        button(w.wheel, 'minor two-line', () => this.showWheel('city')),
      ],
      run: (spot, e) => this.hooks.runSpot(spot, tapPoint(e)),
      // S3e0 part 7: the road, scrolled to that stop with its card open, "for" that card's fix.
      seeStop: (spot) => this.showRoad({ at: spot === 'potholes' ? 0 : 'lane', card: true, laneFor: spot === 'lightsOut' ? 'lamps' : spot === 'slowInternet' ? 'mast' : null }),
      cogOn: () => this.hooks.progress().lagos.hall.done,
      ignoreTap: (e) => this.ignoreTap(e),
    });
    this.cityScreen = screen;
    this.cleanup = () => screen.close();
    // CO3: fetch the road's chunk while the city sits idle, so the road opens at once.
    const idle = (window as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 200));
    idle(() => void preloadRoad().catch(() => undefined));
    return screen.el;
  }

  private builder(): HTMLElement {
    const w = WORDS.builder;
    const preview = h('canvas', { class: 'preview', role: 'img', 'aria-label': w.preview });
    // S2.3: a hero that already wears a picked hair or outfit (not the first look) keeps it.
    this.styled = hasSavedLook(this.store) && !wearsFirstLook(this.look);
    const showNew = isOldSave(this.store);

    type Part = keyof FullLook;
    const parts: readonly Part[] = ['body', 'age', 'skin', 'hair', 'outfit'];
    const mark = (): void => {
      for (const part of parts) {
        for (const b of this.layer.querySelectorAll<HTMLButtonElement>(`[data-part="${part}"]`)) {
          b.setAttribute('aria-pressed', String(Number(b.dataset['index']) === this.look[part]));
        }
      }
    };
    const pick = (part: Part, i: number, e: MouseEvent): void => {
      if (this.ignoreTap(e)) return; // the builder opened under the finger
      if (part === 'hair' || part === 'outfit') this.styled = true;
      const next = part === 'body' || part === 'age' ? changeBody(this.look, part, i, this.styled) : { ...this.look, [part]: i };
      this.look = saveLook(this.store, next);
      this.hooks.lookChanged(this.look);
      mark();
    };
    const opt = (part: Part, i: number, label: string, cls: string, style?: string): HTMLButtonElement => {
      return button(cls === 'swatch' ? '' : label, cls, (e) => pick(part, i, e), {
        'data-part': part,
        'data-index': String(i),
        'aria-pressed': String(this.look[part] === i),
        'aria-label': cls === 'swatch' ? label : undefined,
        style,
      });
    };
    const row = (part: Part, label: string, ...items: HTMLElement[]): HTMLElement =>
      h(
        'div',
        { class: `choice-row row-${part}`, role: 'group', 'aria-label': label },
        h('b', {}, label),
        h('div', { class: 'choices' }, ...items),
      );

    const side = h(
      'div',
      { class: 'builder-side' },
      h('h2', {}, w.heading),
      showNew && h('p', { class: 'new-note' }, w.newNote),
      row('body', w.body, ...BODIES.map((o, i) => opt('body', i, o.label, 'chip'))),
      row('age', w.age, ...AGES.map((o, i) => opt('age', i, o.label, 'chip'))),
      row('skin', w.skin, ...SKINS.map((s, i) => opt('skin', i, s.label, 'swatch', `background:${s.base}`))),
      row('hair', w.hair, ...HAIRS.map((o, i) => opt('hair', i, o.label, 'chip'))),
      row('outfit', w.outfit, ...OUTFITS.map((o, i) => opt('outfit', i, o.label, 'chip'))),
      h('p', { class: 'small' }, w.savedNote),
    );
    const bar = h('div', { class: 'side-bar', 'aria-hidden': 'true', hidden: true });
    const start = button(w.start, 'go', (e) => {
      if (this.ignoreTap(e)) return;
      // Starting keeps the look shown, even if nothing was tapped, and always saves body and age.
      this.look = saveLook(this.store, this.look);
      this.hooks.start(tapPoint(e));
    });

    const card = h(
      'div',
      { class: 'card hero-card', role: 'dialog', 'aria-label': w.heading },
      // Heading and rows come first for screen readers and Tab; the CSS puts them on the right.
      h('div', { class: 'builder' }, h('div', { class: 'builder-wrap' }, side, bar), h('div', { class: 'builder-main' }, preview, start)),
    );
    this.watchSide(side, bar);
    this.animatePreview(preview);
    return card;
  }

  /**
   * S2.3: while more of the right column is below, its bottom 24 px fades to the panel colour
   * and our own scroll bar shows whenever there is more to scroll.
   */
  private watchSide(side: HTMLElement, bar: HTMLElement): void {
    const update = (): void => {
      const { scrollHeight: total, clientHeight: seen, scrollTop: top } = side;
      side.classList.toggle('more-below', total - top - seen > 2);
      const scrolls = total > seen + 2 && seen > 0;
      bar.hidden = !scrolls;
      if (scrolls) {
        const h = Math.max(24, (seen * seen) / total);
        bar.style.setProperty('--bar-h', `${h}px`);
        bar.style.setProperty('--bar-top', `${(top / (total - seen)) * (seen - h)}px`);
      }
    };
    side.addEventListener('scroll', update, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.sideWatch = new ResizeObserver(update);
      this.sideWatch.observe(side);
    }
    requestAnimationFrame(update);
  }

  private animatePreview(c: HTMLCanvasElement): void {
    const start = performance.now();
    const frame = (now: number): void => {
      if (this.screen !== 'builder') return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      if (cw > 0 && ch > 0) {
        if (c.width !== Math.round(cw * dpr)) c.width = Math.round(cw * dpr);
        if (c.height !== Math.round(ch * dpr)) c.height = Math.round(ch * dpr);
        const g = c.getContext('2d');
        if (g) {
          const t = (now - start) / 1000;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, c.width, c.height);
          // Fit about 64 u (the gele is the tallest) into the box, feet near the bottom.
          const s = Math.min((ch * dpr * 0.82) / 64, (cw * dpr * 0.9) / 40);
          g.translate(c.width / 2, c.height - ch * dpr * 0.08);
          g.scale(s, s);
          // Ground shadow
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.beginPath();
          g.ellipse(0, 0, 13, 3, 0, 0, Math.PI * 2);
          g.fill();
          drawHero(g, this.look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: t % 3.2 < 0.15, time: t });
        }
      }
      this.previewFrame = requestAnimationFrame(frame);
    };
    this.previewFrame = requestAnimationFrame(frame);
  }

  private credits(): HTMLElement {
    const w = WORDS.credits;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      ...w.lines.map((l) => h('p', {}, l)),
      button(w.back, 'go', () => this.show('title')),
    );
  }
}

function tapPoint(e: MouseEvent): TapPoint | null {
  // Keyboard "clicks" have no position (detail 0).
  return e.detail > 0 ? { x: e.clientX, y: e.clientY } : null;
}

/** True when `tap` is the second half of a double tap that began with `first`. */
export function isSecondTap(first: (TapPoint & { t: number }) | null, tap: TapPoint | null, now = performance.now()): boolean {
  if (!first || !tap) return false;
  return now - first.t < DOUBLE_TAP_MS && Math.hypot(tap.x - first.x, tap.y - first.y) < DOUBLE_TAP_PX;
}
