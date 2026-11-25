/**
 * O1b1: the Ogun part (docs/ogun.md 9.1). Everything under src/worlds/ogun/ and every file it
 * alone imports is built into dist/worlds/ogun/ (vite.config.ts), never into the first load.
 *
 * Room for the team, no code change needed here:
 * - designer: Ogun's level files go in src/data/levels/ as ogun-*.json (ogun-1, ogun-2, ogun-3,
 *   ogun-well, ogun-hall, ogun-lane). Each one found is picked up below by name.
 * - art and gamedev (O2b onward): Ogun's own art, rules, tunes and the city go in this folder
 *   (or are imported only from it), so they stay in the Ogun part, 150 KB gzip at most
 *   (scripts/check-size.mjs).
 */
import { addSounds } from '../../engine/sound';
import type { WorldPart } from '../load';
import { ABEOKUTA_SOUNDS } from './abeokuta';
import { OTA_SOUNDS } from './ota';
import { SAGAMU_SOUNDS } from './sagamu';
import { POTHOLE_HALL_TUNE, POTHOLE_SOUNDS } from './hall';
import { ogunStreet } from './otaStreet';
import { newHallVisit, parsePotholeHall, potholeArena } from './potholeFight';
import { potholeHallSkin } from './potholeHallSkin';
import { ui } from './ride';
import { ogunCity } from './cityScreen';
import { ogunRoad, expresswayFor } from './roadPlan';
import { EXPRESSWAY_LOOK } from './laneLook';
import { OGUN_PRICES, leftOn, readOgunCity, readWallet } from './cityRules';
import { OGUN_MISSIONS, ogunMissionIcon } from './missions';

const files = import.meta.glob<unknown>('../../data/levels/ogun-*.json', { eager: true, import: 'default' });

const levels: Record<string, unknown> = {};
for (const [path, data] of Object.entries(files)) {
  const name = /([^/]+)\.json$/.exec(path)?.[1];
  if (name) levels[name] = data;
}

// O2b: Ota's mud steps ("splosh"); O3b: Abeokuta's crack rumble; O4b: Sagamu's gravel "tk" and
// crumble. Playable once this part has loaded.
addSounds(OTA_SOUNDS);
addSounds(ABEOKUTA_SOUNDS);
addSounds(SAGAMU_SOUNDS);
// O5b: Pothole Hall's plop, gulp, hmph, giggle, yawn, bag lift, cone tok, mud splat and toot.
addSounds(POTHOLE_SOUNDS);

/** O5b: King Pothole's fight from ogun-hall.json (a broken file leaves the part with no hall). */
function hall(): WorldPart['hall'] {
  try {
    return { arena: potholeArena(parsePotholeHall(levels['ogun-hall'])), tune: POTHOLE_HALL_TUNE, newVisit: newHallVisit };
  } catch (err) {
    console.warn(err);
    return undefined;
  }
}

// O1b2: the bus ride, the place picture and the welcome tune ride along in this part.
// O2b: each street's own look (Ota; Abeokuta from O3b; Sagamu from O4b).
// O5b: Pothole Hall's fight, look and tune.
const ogunHall = hall();
export const part: WorldPart = {
  id: 'ogun',
  version: 1,
  levels,
  ui,
  street: (level) => (level.id === 'ogun-hall' ? potholeHallSkin() : ogunStreet(level)),
  ...(ogunHall ? { hall: ogunHall } : {}),
  // O6b: Ogun's city (after Pothole Hall), its challenge road and the Expressway run.
  city: ogunCity,
  road: (v, play, still) => ogunRoad({ ogun: v.progress, city: readOgunCity(v.own), wallet: readWallet(v.wallet), lane: v.lane }, play, still),
  lane: {
    level: levels['ogun-lane'],
    look: EXPRESSWAY_LOOK,
    forFix: (own) => {
      const c = readOgunCity(own);
      const fix = expresswayFor(c);
      return fix ? { fix, bucket: OGUN_PRICES[fix].bucket === 'tech' ? 'tech' : 'power', left: leftOn(c, fix) } : null;
    },
  },
  left: (own, spot) => (spot in OGUN_PRICES ? leftOn(readOgunCity(own), spot as keyof typeof OGUN_PRICES) : 0),
  // MS3c: Ogun's five quick missions.
  missions: { list: OGUN_MISSIONS, icon: ogunMissionIcon },
};

/** O6b: the debug galleries read the part's art from here (see galleryArt.ts). */
export * from './galleryArt';
