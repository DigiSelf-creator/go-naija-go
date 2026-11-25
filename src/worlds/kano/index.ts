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
import { kanoCity } from './cityScreen';
import { kanoRoad } from './roadPlan';
import { harmattanLook } from './laneLook';
import { KANO_PRICES, laneFix, leftOn, readKanoCity, type KanoBoard } from './cityRules';
import { kanoStreet } from './kurmiStreet';
import { KANO_WIND_SOUNDS } from './wind';
import { KANO_CLOTH_SOUNDS } from './cloth';
import { KANO_WHIRL_SOUNDS } from './whirl';
import { KANO_WORDS } from './words';
import { BOREHOLE_HALL_TUNE, RUSTY_SOUNDS } from './boreholeHall';
import { newRustyVisit, parseRustyHall, rustyArena } from './rustyFight';

const files = import.meta.glob<unknown>('../../data/levels/kano-*.json', { eager: true, import: 'default' });

const levels: Record<string, unknown> = {};
for (const [path, data] of Object.entries(files)) {
  const name = /([^/]+)\.json$/.exec(path)?.[1];
  if (name) levels[name] = data;
}

// The long ride north and its welcome tune. K6b: Kano's city replaces the still home. K2b: Kurmi's look, tune and whoosh. K3b: Kofar Mata's look and tune, the
// groundnut store, the cloth's boing and the beaters' tok. K4b: Dawanau's look and tune, the whirl's fff and pff.
// K-size: the words the first load shows once the part is in (toasts, chips, cards, home buttons).
// K5b: Borehole Hall's fight, look (kurmiStreet.ts kanoStreet), sounds and tune.
export const part: WorldPart = {
  id: 'kano',
  version: 1,
  levels,
  ui,
  street: kanoStreet,
  sounds: { ...KANO_WIND_SOUNDS, ...KANO_CLOTH_SOUNDS, ...KANO_WHIRL_SOUNDS, ...RUSTY_SOUNDS },
  words: KANO_WORDS,
  // K6b: Kano from above (its home, from the first visit), its challenge road and Harmattan Road.
  city: kanoCity,
  road: (v, play) => kanoRoad(v, play),
  lane: {
    level: levels['kano-lane'],
    look: harmattanLook,
    forFix: (own) => {
      const c = readKanoCity(own);
      const fix = laneFix(c);
      return fix ? { fix, bucket: fix === 'slowInternet' ? 'tech' : 'power', left: leftOn(c, fix) } : null;
    },
  },
  left: (own, spot) => (spot in KANO_PRICES ? leftOn(readKanoCity(own), spot as KanoBoard) : 0),
  ...hall(),
};

/** K5b: Rusty Borehole's fight from kano-hall.json (a broken file leaves the part with no hall). */
function hall(): Pick<WorldPart, 'hall'> {
  try {
    return { hall: { arena: rustyArena(parseRustyHall(levels['kano-hall'])), tune: BOREHOLE_HALL_TUNE, newVisit: newRustyVisit } };
  } catch (err) {
    console.warn(err);
    return {};
  }
}

/** The debug galleries read the part's art from here (see galleryArt.ts). */
export * from './galleryArt';
