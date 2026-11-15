/**
 * Lagos from above's people, drawn (task S3g1b; design.md "People everywhere" part 9). Loaded
 * with the people's chunk (peopleKit.ts); the city screen asks for it and draws without people
 * until it has arrived. The rules are in cityFolk.ts.
 */
import { folkFramesFor } from '../art/folkBake';
import { CITY_CAST, CITY_FOLK_SCALE, MAMA_PUT_COOK, MAMA_PUT_QUEUE, MARKET_SHOPPERS, isHeroLook } from '../art/folkCasts';
import type { FolkFrame, FolkLook } from '../art/folk';
import type { HeroLook } from '../art/hero';
import { CastSheet } from './crowdDraw';
import { CITY_FOLK, CityWalkers, ambientCount, busParkWaiting, cityWalkerAt, mamaPutQueue, marketShoppers, missionCrowd, type CityPerson } from './cityFolk';
import type { Pt } from './walkGrid';

type G = CanvasRenderingContext2D;
const COOK = CITY_CAST.length;
const QUEUE = COOK + 1;
const SHOP = QUEUE + MAMA_PUT_QUEUE.length;

/** What the city tells its people each step. */
export interface CityPeopleStep {
  state: { fixed: readonly string[]; built: readonly string[]; boom: number };
  bright: ReadonlySet<string>;
  hero: Pt;
  /** The map draws every frame now (else everyone holds still: W10). */
  walking: boolean;
  /** A moment or a boom is playing: everyone stops to watch. */
  watch: boolean;
  /** Mission complete: seconds since the bus arrived (negative before), or null. */
  missionSince: number | null;
}

export class CityPeople {
  private readonly walkers: CityWalkers;
  private readonly sheet = new CastSheet((l, i) => (i === COOK ? ['stand', 'sit', 'wave0', 'wave1'] : [...folkFramesFor(l).filter((f) => f !== 'call' || i >= SHOP), 'call']));
  private looks: FolkLook[] = [];
  private lookKey = '';
  private cheered = false;
  /** Played by the screen: the big cheer as the hero steps off the bus (part 10). */
  onCheer: () => void = () => {};

  constructor(keepClear: readonly Pt[]) {
    this.walkers = new CityWalkers(keepClear);
  }

  get count(): number {
    return this.walkers.list.length;
  }

  step(dt: number, n: CityPeopleStep): void {
    this.walkers.fill(ambientCount(n.state), n.bright, CITY_CAST.length);
    this.walkers.step(dt, n.hero, n.bright, n.walking, n.watch);
    if (n.missionSince !== null && n.missionSince >= 0 && !this.cheered) {
      this.cheered = true;
      this.onCheer();
    }
    if (n.missionSince === null) this.cheered = false;
  }

  /** The sheet at the still picture's pixel scale (a little more of it baked each frame). */
  ready(hero: HeroLook, pxPerMapUnit: number): void {
    const key = `${hero.skin},${hero.hair},${hero.outfit}`;
    if (key !== this.lookKey) {
      this.lookKey = key;
      // Never the player's own look: a matching one wears another skin.
      this.looks = [...CITY_CAST, MAMA_PUT_COOK, ...MAMA_PUT_QUEUE, ...MARKET_SHOPPERS].map((l) => (isHeroLook(l, hero) ? { ...l, skin: (l.skin + 1) % 7 } : l));
    }
    this.sheet.ready(this.looks, pxPerMapUnit * CITY_FOLK_SCALE, `city|${key}`);
  }

  /** One person (map units), unless under 6 px tall on screen. */
  private person(g: G, p: CityPerson, s: number, dx = 0, dy = 0): void {
    if (37 * CITY_FOLK_SCALE * s < CITY_FOLK.minPx) return;
    const a = p.alpha ?? 1;
    if (a <= 0) return;
    if (a < 1) g.globalAlpha = a;
    this.sheet.draw(g, { look: p.look, frame: p.frame, x: p.x + dx, y: p.y + dy, flip: p.flip, size: CITY_FOLK_SCALE });
    if (a < 1) g.globalAlpha = 1;
  }

  /** The Mama Put's cook, for drawMamaPut's `cook`: she waves as the hero collects the tray. */
  cook(s: number, time: number, still: boolean, waving: boolean): (c: G, x: number, y: number, resting: boolean) => void {
    return (c, x, y, resting) => {
      const frame: FolkFrame = waving ? (still ? 'wave0' : Math.floor(time / 0.25) % 2 ? 'wave1' : 'wave0') : resting ? 'sit' : 'stand';
      this.person(c, { look: COOK, frame, x, y: y + 2, flip: false }, s);
    };
  }

  /** The queue of 3 at the Mama Put whose front is (x, y). */
  queue(g: G, x: number, y: number, s: number, clock: number, served: number, still: boolean, full: boolean): void {
    for (const p of mamaPutQueue(clock, served, still, full)) this.person(g, { ...p, look: QUEUE + p.look }, s, x, y);
  }

  /** The Market's 5 shoppers at the market whose front is (x, y). */
  shoppers(g: G, x: number, y: number, s: number, time: number, still: boolean): void {
    for (const p of marketShoppers(time, still)) this.person(g, { ...p, look: SHOP + p.look }, s, x, y);
  }

  /**
   * The walkers (stopping to watch a moment, cheering at its sting), the bus park's waiting
   * people and Mission complete's crowd, as items sorted with the city's other standing things.
   */
  items(add: (y: number, draw: () => void) => void, g: G, s: number, o: { still: boolean; sting: number; boomed: boolean; mission: { bus: Pt; since: number } | null }): void {
    const { still, sting } = o;
    for (const w of this.walkers.list) {
      const at = cityWalkerAt(w);
      let frame: FolkFrame = 'stand';
      if (sting >= 0 && sting < 1) frame = still ? 'cheer0' : Math.floor(sting / 0.25) % 2 ? 'cheer1' : 'cheer0';
      else if (w.stop > 0) frame = still ? 'wave0' : Math.floor(w.stop / 0.25) % 2 ? 'wave1' : 'wave0';
      else if (w.idle < 0.15 && !still) frame = `walk${Math.floor(w.d / 9) % 4}` as FolkFrame;
      const side = w.stop > 0 ? CITY_FOLK.stepAside : 0;
      const p: CityPerson = { look: w.look, frame, x: at.x - at.dy * side, y: at.y + at.dx * side, flip: at.dx < 0 };
      add(at.y, () => this.person(g, p, s));
    }
    busParkWaiting(o.boomed).forEach((q, i) => add(q.y, () => this.person(g, { look: (i * 5 + 4) % CITY_CAST.length, frame: 'stand', x: q.x, y: q.y, flip: i % 2 === 1 }, s)));
    if (o.mission) for (const p of missionCrowd(o.mission.bus, o.mission.since, still)) add(p.y, () => this.person(g, p, s));
  }
}
