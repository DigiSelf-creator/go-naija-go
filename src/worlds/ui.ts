/**
 * O1b2: what a later state's lazy part gives the first load to show (types only, nothing here
 * is built into the first load). The Ogun part (src/worlds/ogun/) fills it: the bus ride through
 * the gateway (docs/ogun.md 1.3), the picture behind Ogun's place screen, and the welcome tune.
 */
import type { HeroLook } from '../art/hero';
import type { Tune } from '../art/tunes';
import type { CityLife } from '../game/cityLife';
import type { StateCity } from '../game/states';
import type { PeopleKit } from '../game/peopleLoad';

/**
 * K6b: the first-load pieces a part that imports only types (Kano, KN-R10) needs for its city
 * and road: the Lagos city's words, pay spots, walker, Booming meter, money words and buttons,
 * and the people kit once it has arrived (asking for it the first time).
 */
export interface CityKit {
  words: typeof import('../screens/words').WORDS;
  pay: Pick<typeof import('../art/payspot'), 'EDGE_ARROW' | 'MAT' | 'PAY' | 'boardWobble' | 'drawEdgeArrow' | 'drawFlyingMoney' | 'drawPayMat' | 'drawPriceBoard' | 'drawTrayBubble' | 'edgeArrowPlace' | 'flyingCount' | 'payTime' | 'priceBoardBox' | 'trayBubbleBox' | 'trayWords'>;
  walk: Pick<typeof import('../art/walker'), 'WALKER' | 'drawCityHero' | 'drawWalkRing' | 'walkDir' | 'walkerSize'>;
  boom: Pick<typeof import('../art/boomMeter'), 'boomBarSvg' | 'boomIconSvg'>;
  icon: typeof import('../art/city').bucketIconSvg;
  money: (kobo: number) => string;
  spoken: typeof import('../game/money').spokenMoney;
  dom: Pick<typeof import('../screens/dom'), 'h' | 'button'>;
  /** The people kit (its walkers, sheets, size and look rule) once it has arrived, else null (it is asked for). */
  people(): PeopleKit | null;
}

export interface RideOptions {
  look: HeroLook;
  /** Ogun to Lagos: under the arch's back ("SAFE JOURNEY"). K1b: on Kano's ride, Kano to Ogun or Lagos (the road the other way). */
  toLagos: boolean;
  /**
   * K1b: draws the hero standing at the bus window, feet at (0, 0), facing +x, and the Skip
   * button: the Kano part imports no value from the first load (KN-R10), so the game passes them.
   */
  rider?(g: CanvasRenderingContext2D): void;
  skipButton?(onTap: (e: MouseEvent) => void): HTMLButtonElement;
  /** King Pothole is beaten: the arch is bright. */
  lit: boolean;
  /** Reduced motion: the end picture only. */
  still: boolean;
  /** The first ride (about 4 s); after that the short one (2 s). */
  first: boolean;
  /** The picture's spoken name, and the Skip button's word. */
  spoken: string;
  skip: string;
  /** The bus is under the arch: the welcome tune (the game checks the Music switch). */
  tune(): void;
  /** The ride is over (its end, Skip, a tap on the end picture, Escape). Called once. */
  done(): void;
}

export interface WorldUi {
  /** The bus ride, a full-screen element; close() stops it without calling done(). */
  busRide(o: RideOptions): { el: HTMLElement; close(): void };
  /** The welcome tune (about 1.5 s, our own). */
  readonly tune: Tune;
}

/** O6b: what a state's city screen (Ogun from above) is given by the first load. */
export interface WorldCityHooks {
  /** The live Lagos city: it holds the one wallet (decision 80) and its tick fills every state's trays. */
  life: CityLife;
  /** This state's own city part (fixes, trays, Booming meter), never the wallet. */
  own: StateCity;
  look(): HeroLook;
  /** Buttons for the top right (Sound, Settings) and the bottom row (Challenge road, Travel, Hero, wheel). */
  topRight: HTMLElement[];
  bottom: HTMLElement[];
  /** A problem card's challenge (Ota for the road; the Expressway for Power and Tech). */
  run(spot: 'potholes' | 'dryTaps' | 'lightsOut' | 'slowInternet' | 'sandyRoad', e: MouseEvent): void;
  /** A problem card's "See the stop": the state's challenge road on that stop. */
  seeStop?(spot: string): void;
  ignoreTap(e: MouseEvent): boolean;
  sound(name: string): void;
  gentle(): boolean;
  still(): boolean;
  touch(): boolean;
  /** The state's cog already turns on Nigeria's wheel (the boom card then has no cog line). */
  cogOn(): boolean;
  /** A line to show as the screen opens ("You brought N12 home."), or null. */
  line: string | null;
  /** OG-R39: the line follows a win: "Mission complete!" over it. */
  won?: boolean;
  /** OG-R37: Pothole Hall has been won (the Bad road pin is fixed, the gate bright). */
  hallWon?: boolean;
  /** OG-R37: the next street to clear (1 Ota, 2 Abeokuta, 3 Sagamu), or 4 once all three are. */
  nextStreet?: number;
  /** OG-R37: plays Ogun street n (4: Pothole Hall). K6b: Kano's too. */
  play?(n: number, e: MouseEvent): void;
  /** K6b: the first-load pieces Kano's city draws with (KN-R10). */
  kit?: CityKit;
}

export interface WorldCity {
  el: HTMLElement;
  /** Once the screen is in the page. */
  start(): void;
  close(): void;
  /** Map draws so far (tests: a still city draws nothing). */
  readonly draws: number;
}
