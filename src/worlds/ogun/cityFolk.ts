/**
 * O6b2 (OG-R43 a; ogun.md part 7, "The city from above: walkers as Lagos"; decision 72): people
 * walking about Ogun from above. The walkers are Lagos's (the people's kit, src/game/cityFolk.ts
 * CityWalkers through peopleKit.ts): the same count rule (3, plus 1 a fix or place, plus 2 a
 * Booming step, at most 12), bright blocks 3 times as often, stopping to wave when the hero comes
 * close (never by a mat, a door or a pin), and holding still while the map is not drawing every
 * frame (a still city draws nothing). Only the ground (Ogun's blocks and walk grid) and the cast
 * (Ogun's own street people, no children walking alone) are Ogun's, kept here in the Ogun part.
 * The kit arrives on its own (peopleLoad.ts); the city shows without people until then, and an
 * error in their code switches them off for the visit (cityScreen.ts), as Lagos's city does.
 */
import type { FolkFrame, FolkLook } from '../../art/folk';
import { CITY_FOLK_SCALE, isHeroLook } from '../../art/folkCasts';
import type { HeroLook } from '../../art/hero';
import type { PeopleKit } from '../../game/peopleLoad';
import { ABEOKUTA_CAST } from './abeokuta';
import { OGUN_BLOCKS } from './city';
import { OTA_CAST } from './ota';
import { SAGAMU_CAST } from './sagamu';
import { ogunNearest, ogunPath, type Pt } from './walk';

type G = CanvasRenderingContext2D;
type Walker = InstanceType<PeopleKit['CityWalkers']>['list'][number];

/** Who walks: Ogun's street casts in turn (Ota, Abeokuta, Sagamu), 16 looks, no child alone, nobody seated. */
export const OGUN_CITY_CAST: readonly FolkLook[] = (() => {
  const ok = (l: FolkLook): boolean => l.age !== 'child' && !l.chair && !l.stool;
  const lists = [OTA_CAST, ABEOKUTA_CAST, SAGAMU_CAST].map((c) => c.filter(ok));
  const out: FolkLook[] = [];
  for (let i = 0; out.length < 16 && i < 32; i++) for (const c of lists) if (out.length < 16 && c[i]) out.push(c[i]!);
  return out;
})();

/** Each block's three doors (its front, on walkable ground), worked out once. */
const FRONTS: ReadonlyMap<string, readonly Pt[]> = new Map(OGUN_BLOCKS.map((b) => [b.id, [0, 1, 2].map((k) => ogunNearest({ x: b.x + (b.w * (k + 1)) / 4, y: b.y + b.d - 6 }))]));
const IDS = OGUN_BLOCKS.map((b) => b.id);

/** Ogun's ground for the kit's walkers: a block's door (bright blocks 3 times as often), the way by Ogun's grid. */
export const OGUN_GROUND = {
  pick(bright: ReadonlySet<string>, r: () => number): Pt {
    const w = IDS.map((id) => (bright.has(id) ? 3 : 1));
    let u = r() * w.reduce((a, b) => a + b, 0);
    let id = IDS[IDS.length - 1]!;
    for (let i = 0; i < IDS.length; i++) {
      u -= w[i]!;
      if (u < 0) {
        id = IDS[i]!;
        break;
      }
    }
    return FRONTS.get(id)![Math.floor(r() * 3)]!;
  },
  path: (a: Pt, b: Pt): Pt[] => ogunPath(a, b),
};

export class OgunCityFolk {
  private readonly walkers: InstanceType<PeopleKit['CityWalkers']>;
  private readonly sheet: InstanceType<PeopleKit['CastSheet']>;
  private looks: FolkLook[] = [];
  private lookKey = '';

  constructor(
    private readonly kit: PeopleKit,
    keepClear: readonly Pt[],
  ) {
    this.walkers = new kit.CityWalkers(keepClear, OGUN_GROUND);
    this.sheet = new kit.CastSheet();
  }

  get count(): number {
    return this.walkers.list.length;
  }

  /** The sheet is still being baked (the city keeps drawing a little until it is done). */
  get baking(): boolean {
    return !this.sheet.done;
  }

  step(dt: number, state: { fixed: readonly string[]; built: readonly string[]; boom: number }, bright: ReadonlySet<string>, hero: Pt, walking: boolean): void {
    this.walkers.fill(this.kit.ambientCount(state), bright, OGUN_CITY_CAST.length);
    this.walkers.step(dt, hero, bright, walking, false);
  }

  /** The sheet at the still picture's pixel scale (a little more baked each frame). Never the player's own look. */
  ready(hero: HeroLook, pxPerMapUnit: number): void {
    const key = `${hero.skin},${hero.hair},${hero.outfit}`;
    if (key !== this.lookKey) {
      this.lookKey = key;
      this.looks = OGUN_CITY_CAST.map((l) => (isHeroLook(l, hero) ? { ...l, skin: (l.skin + 1) % 7 } : l));
    }
    this.sheet.ready(this.looks, pxPerMapUnit * CITY_FOLK_SCALE, `ogun|${key}`);
  }

  /** Each walker as an item to sort with the city's other standing things (map units; `s` CSS px a unit). */
  items(add: (y: number, draw: () => void) => void, g: G, s: number, still: boolean): void {
    if (37 * CITY_FOLK_SCALE * s < this.kit.CITY_FOLK.minPx) return;
    const side = this.kit.CITY_FOLK.stepAside;
    for (const w of this.walkers.list as Walker[]) {
      const at = this.kit.cityWalkerAt(w);
      let frame: FolkFrame = 'stand';
      if (w.stop > 0) frame = still ? 'wave0' : Math.floor(w.stop / 0.25) % 2 ? 'wave1' : 'wave0';
      else if (w.idle < 0.15 && !still) frame = `walk${Math.floor(w.d / 9) % 4}` as FolkFrame;
      const k = w.stop > 0 ? side : 0;
      const x = at.x - at.dy * k;
      const y = at.y + at.dx * k;
      add(y, () => this.sheet.draw(g, { look: w.look, frame, x, y, flip: at.dx < 0, size: CITY_FOLK_SCALE }));
    }
  }
}
