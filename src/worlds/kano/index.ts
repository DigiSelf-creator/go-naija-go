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
 *   and Harmattan Road join `part` as Ogun's did. K2b: Kurmi's look and tune (kurmiStreet.ts),
 *   K3b: Kofar Mata's (kofarMataStreet.ts), K4b: Dawanau's (dawanauStreet.ts) and the whirl's sounds,
 *   and the wind's whoosh (`sounds`: the first load adds them, since this part imports only types).
 */
import type { WorldPart } from '../load';
import { ui } from './ride';
import { kanoHome } from './home';
import { kanoStreet } from './kurmiStreet';
import { KANO_WIND_SOUNDS } from './wind';
import { KANO_CLOTH_SOUNDS } from './cloth';
import { KANO_WHIRL_SOUNDS } from './whirl';
import { KANO_WORDS } from './words';

const files = import.meta.glob<unknown>('../../data/levels/kano-*.json', { eager: true, import: 'default' });

const levels: Record<string, unknown> = {};
for (const [path, data] of Object.entries(files)) {
  const name = /([^/]+)\.json$/.exec(path)?.[1];
  if (name) levels[name] = data;
}

// The long ride north and its welcome tune; Kano's home (the wall and gate, and Kurmi's button)
// until its city (K6b). K2b: Kurmi's look, tune and whoosh. K3b: Kofar Mata's look and tune, the
// groundnut store, the cloth's boing and the beaters' tok. K4b: Dawanau's look and tune, the whirl's fff and pff.
// K-size: the words the first load shows once the part is in (toasts, chips, cards, home buttons).
export const part: WorldPart = { id: 'kano', version: 1, levels, ui, city: kanoHome, street: kanoStreet, sounds: { ...KANO_WIND_SOUNDS, ...KANO_CLOTH_SOUNDS, ...KANO_WHIRL_SOUNDS }, words: KANO_WORDS };

/** The debug galleries read the part's art from here (see galleryArt.ts). */
export * from './galleryArt';
