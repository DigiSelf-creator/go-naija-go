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
import { WORLD_PART_WORDS } from '../screens/words';
import type { StreetSkin } from '../game/skin';
import type { ArenaRules, Run } from '../game/run';
import type { Tune } from '../art/tunes';
import type { WorldUi } from './ui';

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
  readonly street?: (level: { readonly id: string; readonly arch: number | null }) => StreetSkin | null;
  /**
   * O5b: the state's boss hall (its level file is `<id>-hall`): its fight, made fresh for each try,
   * and its tune (it stands in for the hall tune while that hall is played). Optional.
   */
  readonly hall?: { readonly arena: (run: Run) => ArenaRules; readonly tune: Tune };
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
    const run: Promise<WorldLoad> = new Promise<unknown>((done) => done(importer ? importer() : Promise.reject(new Error(`no part ${id}`)))).then(
      (mod): WorldLoad => {
        const part = checkPart(mod, id);
        if (!part) return { ok: false, why: 'broken', message: WORLD_PART_WORDS.broken };
        this.loaded.set(id, part);
        return { ok: true, part };
      },
      (): WorldLoad => ({ ok: false, why: 'missing', message: this.online() ? WORLD_PART_WORDS.broken : WORLD_PART_WORDS.noInternet }),
    );
    this.loading.set(id, run);
    // A failed try is forgotten, so the next tap tries again.
    void run.then(() => this.loading.delete(id));
    return run;
  }
}
