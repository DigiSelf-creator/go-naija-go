/**
 * O1b1: loads a later state's lazy part (docs/ogun.md 9.1, 9.2; brief Tech: later worlds load
 * only when reached). In the first load; keep it tiny.
 *
 * - Web: the part's files are built to dist/worlds/<id>/ and fetched only the first time the
 *   player goes there. The service worker keeps them after that fetch, so the state plays offline
 *   from then on (src/sw/sw.js).
 * - Store app: the same files are inside the app; the same import reads them from the phone.
 * - Missing (no internet on the first visit, or a file not there) or broken (the wrong shape):
 *   the promise never rejects. It resolves with `ok: false` and plain words to show, and the next
 *   try loads afresh. The game never crashes on it.
 */
import { KANO_WORDS, WORLD_PART_WORDS, addShortToasts } from '../screens/words';
import type { StreetSkin } from '../game/skin';
import type { ArenaRules, Run, StreetRules } from '../game/run';
import type { Tune } from '../art/tunes';
import type { CityKit, WorldCity, WorldCityHooks, WorldUi } from './ui';
import type { HarmattanKit } from './kano/laneLook';
import type { RoadPlan, PlanStop } from '../screens/road';
import type { LaneLook } from '../lane/view';
import type { Obj, StateProgress } from '../game/progress';
import type { MissionDef, MissionIcon } from '../game/missions';
import type { Level } from '../game/level';
import { addSounds, type Recipe, type SoundName } from '../engine/sound';

/**
 * K-size (kano.md 9.1): a part's own words that the first load shows only once the part is in
 * (Kano's, so they ride in its part, not the first load). The part imports no value from the
 * first load (KN-R10), so money comes in as words the game has already written.
 */
export interface PartWords {
  /** Toasts on its streets by name: a timed food's pick up (`kilishi`) and end (`kilishiWearingOff`), `gate`, `parcel`. */
  readonly toast: Readonly<Record<string, string>>;
  /** A timed food's HUD chip words, by food ("Kilishi 9"). */
  readonly hud: Readonly<Record<string, (s: number) => string>>;
  /** Short words for its toasts on a narrow bar (added to SHORT_TOAST when the part loads). */
  readonly short: Readonly<Record<string, string>>;
  /** Out of lives on its street (K5b: and in its hall). */
  readonly gameOver: { readonly text: (money: string) => string; readonly hallText?: string };
  /** Street cleared, carrying the parcel (K5b: and the last street's button to its hall). */
  readonly cleared: { readonly parcel: string; readonly toHall?: string };
  /** K5b: its hall's Win screen. */
  readonly win?: { readonly heading: string; readonly line: string; readonly money: (money: string) => string; readonly takeHome: string; readonly playAgain: string; readonly road?: string };
  /** K6b: its lane run's Pause card button ("Back to Kano"). */
  readonly laneHome?: string;
  /** Its arrival card, first visit only. */
  readonly arrival: { readonly heading: string; readonly line1: string; readonly line2: string; readonly go: string };
  /** The ride's spoken name, going and coming back. */
  readonly ride: { readonly spokenIn: string; readonly spokenOut: string };
  /** Its home's Play buttons, one per street, opening in order. */
  readonly place: { readonly plays: readonly string[] };
}

/** The shape every lazy state part exports (src/worlds/<id>/index.ts). Bump when it changes. */
export const WORLD_PART_VERSION = 1;

export interface WorldPart {
  readonly id: string;
  readonly version: number;
  /** The state's level files as JSON values, by file name without ".json" ("ogun-1", "ogun-hall", ...). */
  readonly levels: Readonly<Record<string, unknown>>;
  /** O1b2: the bus ride, the place picture and the welcome tune (optional in the shape check). */
  readonly ui?: WorldUi;
  /**
   * O2b: a street's own look (skin.ts) by level id, made fresh for each play, or null when the
   * part has none for it yet. Optional in the shape check.
   */
  readonly street?: (level: Level) => StreetSkin | null;
  /** K-size: the part's own street rules for each play (Kano's wind, gate and dust whirls). Optional. */
  readonly rules?: (run: Run) => StreetRules;
  /** K2b: the part's own sound recipes (a part that imports only types cannot add them itself). Optional. */
  readonly sounds?: Readonly<Partial<Record<SoundName, Recipe>>>;
  /** K-size (kano.md 9.1): the words the first load's toasts, chips and cards show once the part is in. Optional. */
  readonly words?: PartWords;
  /**
   * O5b: the state's boss hall (its level file is `<id>-hall`): its fight, made fresh for each try,
   * and its tune (it stands in for the hall tune while that hall is played). Optional.
   * newVisit: the hall is entered from a card (not Play again), so its first-try hints show again.
   */
  readonly hall?: { readonly arena: (run: Run) => ArenaRules; readonly tune: Tune; readonly newVisit?: () => void };
  /** O6b: the state's city from above (opens once its hall is won). Optional. */
  readonly city?: (hooks: WorldCityHooks) => WorldCity;
  /** O6b: the state's challenge road, for the road screen. Optional. */
  readonly road?: (v: WorldRoadView, play: (st: PlanStop, e: MouseEvent) => void, still: () => boolean) => RoadPlan | null;
  /** O6b: the state's lane run (its level file, look, and the fix a win is for). Optional. */
  readonly lane?: {
    readonly level: unknown;
    /** K6b: or made from the lane pieces the game passes in (a part that imports only types). */
    readonly look: LaneLook | ((kit: HarmattanKit) => LaneLook);
    /** The fix a win is for now (`fix`: the city's spot id), what bucket pays it and what is left, or null. */
    forFix(own: Readonly<Obj>, wallet: { kobo: number; power: number; tech: number }): { fix: string; bucket: 'power' | 'tech'; left: number } | null;
  };
  /** O6b: what is left to pay on a city spot (own units: kobo for Naira), for a win's prize. */
  readonly left?: (own: Readonly<Obj>, spot: string) => number;
  /**
   * MS3c: the state's quick missions (coin catch's stars left empty: the first load works them
   * out from the level file) and the goal pictures only the part draws (false: not one of its own).
   */
  readonly missions?: { readonly list: readonly MissionDef[]; icon?(g: CanvasRenderingContext2D, icon: MissionIcon, size: number): boolean };
}

/** O6b: what a state's challenge road reads (its own streets, city part, the wallet and its lane best). */
export interface WorldRoadView {
  progress: StateProgress;
  own: Readonly<Obj>;
  wallet: { kobo: number; power: number; tech: number };
  lane: { best: number; goals: number };
  /** K1b: Rusty Borehole is beaten (Ogun's "To Kano" stop shows the bright gate). */
  kanoLit?: boolean;
  /** K6b: the first-load pieces Kano's road draws with (KN-R10). */
  kit?: CityKit;
}

export type WorldLoad = { ok: true; part: WorldPart } | { ok: false; why: 'missing' | 'broken'; message: string };

/** Each state's part, as a dynamic import: Vite turns each into its own lazy files. */
export type WorldImporters = Readonly<Record<string, () => Promise<unknown>>>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The module's `part` export, if it has the shape this game reads. */
export function checkPart(mod: unknown, id: string): WorldPart | null {
  const part = isRecord(mod) ? mod['part'] : undefined;
  if (!isRecord(part) || part['id'] !== id || part['version'] !== WORLD_PART_VERSION || !isRecord(part['levels'])) return null;
  return part as unknown as WorldPart;
}

export class WorldParts {
  private readonly loaded = new Map<string, WorldPart>();
  private readonly loading = new Map<string, Promise<WorldLoad>>();

  constructor(
    private readonly importers: WorldImporters,
    /** False when the phone says it is offline (navigator.onLine), for the right words. */
    private readonly online: () => boolean = () => true,
  ) {}

  /** The part, once it has loaded this visit. */
  get(id: string): WorldPart | null {
    return this.loaded.get(id) ?? null;
  }

  /** Loads a state's part (once; later calls share the answer). Never rejects. */
  load(id: string): Promise<WorldLoad> {
    const have = this.loaded.get(id);
    if (have) return Promise.resolve({ ok: true, part: have });
    const busy = this.loading.get(id);
    if (busy) return busy;
    const importer = this.importers[id];
    // K1b: Kano's own words (Lagos and Ogun still work); every other part says Ogun's.
    const w = id === 'kano' ? { broken: KANO_WORDS.broken, noInternet: KANO_WORDS.download.noNet } : WORLD_PART_WORDS;
    const run: Promise<WorldLoad> = new Promise<unknown>((done) => done(importer ? importer() : Promise.reject(new Error(`no part ${id}`)))).then(
      (mod): WorldLoad => {
        const part = checkPart(mod, id);
        if (!part) return { ok: false, why: 'broken', message: w.broken };
        if (part.sounds) addSounds(part.sounds);
        if (part.words) addShortToasts(part.words.short);
        this.loaded.set(id, part);
        return { ok: true, part };
      },
      (): WorldLoad => ({ ok: false, why: 'missing', message: this.online() ? w.broken : w.noInternet }),
    );
    this.loading.set(id, run);
    // A failed try is forgotten, so the next tap tries again.
    void run.then(() => this.loading.delete(id));
    return run;
  }
}
