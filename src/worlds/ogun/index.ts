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
import { OTA_SOUNDS } from './ota';
import { ogunStreet } from './otaStreet';
import { ui } from './ride';

const files = import.meta.glob<unknown>('../../data/levels/ogun-*.json', { eager: true, import: 'default' });

const levels: Record<string, unknown> = {};
for (const [path, data] of Object.entries(files)) {
  const name = /([^/]+)\.json$/.exec(path)?.[1];
  if (name) levels[name] = data;
}

// O2b: Ota's mud steps ("splosh"), playable once this part has loaded.
addSounds(OTA_SOUNDS);

// O1b2: the bus ride, the place picture and the welcome tune ride along in this part.
// O2b: each street's own look (Ota now; Abeokuta and Sagamu with O3b and O4b).
export const part: WorldPart = { id: 'ogun', version: 1, levels, ui, street: ogunStreet };
