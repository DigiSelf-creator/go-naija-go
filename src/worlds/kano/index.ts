/**
 * K1b: the Kano part (docs/kano.md 9.1). Everything under src/worlds/kano/ is built into
 * dist/worlds/kano/ (vite.config.ts), never into the first load, 150 KB gzip at most
 * (scripts/check-size.mjs). It loads and plays without the Ogun part (KN-R10): no file in this
 * folder imports a value from outside it (tests/unit/k1a-kano-gate-art.test.ts); the game passes
 * in what it needs (the hero at the bus window, the buttons).
 *
 * Room for the team, no code change needed here:
 * - designer: Kano's level files are src/data/levels/kano-*.json (kano-1, kano-2, kano-3,
 *   kano-well, kano-hall, kano-lane). Each one found is picked up below by name.
 * - gamedev (K2b onward): each street's look (`street`), Borehole Hall (`hall`), the city, road
 *   and Harmattan Road join `part` as Ogun's did.
 */
import type { WorldPart } from '../load';
import { ui } from './ride';
import { kanoHome } from './home';

const files = import.meta.glob<unknown>('../../data/levels/kano-*.json', { eager: true, import: 'default' });

const levels: Record<string, unknown> = {};
for (const [path, data] of Object.entries(files)) {
  const name = /([^/]+)\.json$/.exec(path)?.[1];
  if (name) levels[name] = data;
}

// The long ride north and its welcome tune; Kano's home (the wall and gate) until its city (K6b).
export const part: WorldPart = { id: 'kano', version: 1, levels, ui, city: kanoHome };

/** The debug galleries read the part's art from here (see galleryArt.ts). */
export * from './galleryArt';
