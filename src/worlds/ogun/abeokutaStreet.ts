/**
 * O3b: Abeokuta's street look (Ogun street 2; docs/ogun.md 3.3, 3.5, 3.7, 4.1 and 7) and the Ogun
 * well room, the Ijebu garri store. Gamedev's glue between the game (src/game/skin.ts) and art's
 * Abeokuta pieces (abeokuta.ts). Lives in the lazy Ogun part; it only draws and reads the run.
 *
 * - The adire yards backdrop, the dyers' drying sheds as roofs, the rock steps (never Olumo,
 *   decision 77) with the long ledge open over its pothole.
 * - Water in the potholes the file names, cracks that rumble open (the run says when) with their
 *   sign 120 u before the left lip, mud as on Ota.
 * - Ofada on the road and in the HUD; ikokore and Ijebu garri as on Ota.
 * - Abeokuta's people: its own cast of 16, the three traders at their stalls calling their lines.
 * - The well room: the store, its shelves (sacks, a plank shelf, sacks), the Ijebu garri parcel,
 *   and the store keeper by the back wall with his own words.
 */
import type { FolkLook } from '../../art/folk';
import type { StreetCast } from '../../game/crowd';
import type { Level } from '../../game/level';
import type { StreetSkin } from '../../game/skin';
import { OGUN_WORDS } from '../../screens/words';
import {
  ABEOKUTA_CAST,
  ABEOKUTA_TRADERS,
  ABEOKUTA_TRADER_LOOKS,
  drawAbeokutaBackdrop,
  drawAbeokutaStall,
  drawAbeokutaTraderStall,
  drawOfada,
  drawOfadaIcon,
  drawRock,
  drawWaterPothole,
  type AbeokutaTrader,
} from './abeokuta';
import { drawCracks, mudMarks, ogunCrate, ogunFood, ogunIcon, ogunKeeper, ogunRoom } from './ogunLook';

/** O4b: moved to ogunLook.ts (Sagamu has cracks too); still here for older callers. */
export { crackOpen } from './ogunLook';

/** Each trader's stall stands this far to the right of where they stand (as on Ota). */
const STALL_RIGHT = 40;

const TRADER_OF = new Map<FolkLook, AbeokutaTrader>(ABEOKUTA_TRADERS.map((k) => [ABEOKUTA_TRADER_LOOKS[k], k]));

/** Abeokuta's people (part 7), and the store keeper in the well room (3.7). */
export function abeokutaCast(): StreetCast {
  const calls = OGUN_WORDS.folk.traders.abeokuta;
  return {
    name: 'abeokuta',
    looks: ABEOKUTA_CAST,
    // As Alausa: the counts start after the first screen.
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[ABEOKUTA_TRADERS.indexOf(k)] : undefined;
    },
    keeper: ogunKeeper(),
  };
}

/** The road gaps under a rock, for drawRock's open body (the ledge over its pothole). */
export function gapUnder(level: Pick<Level, 'ground'>, x: number, w: number): readonly [number, number] | undefined {
  const gr = level.ground;
  for (let i = 1; i < gr.length; i++) {
    const a = gr[i - 1]![1];
    const b = gr[i]![0];
    if (a > x && b < x + w) return [a, b];
  }
  return undefined;
}

/** A fresh Abeokuta look for one play of the street. */
export function abeokutaSkin(): StreetSkin {
  const mud = mudMarks();
  /** Rocks by x and top y (the platform loop hands them in as roofs), with their gap. */
  let rocksOf: Level | null = null;
  const rocks = new Map<string, { h: number; gap: readonly [number, number] | undefined }>();
  return {
    cast: abeokutaCast(),
    backdrop(g, camX, viewW, time, viewH, groundY, still) {
      drawAbeokutaBackdrop(g, camX, viewW, time, viewH, groundY, still);
    },
    back(g, s) {
      for (const t of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(t.look);
        const x = t.x + STALL_RIGHT;
        if (kind && x + 40 > s.L && x - 40 < s.R) drawAbeokutaTraderStall(g, kind, x, t.feetY, s.still ? 0 : s.clock);
      }
    },
    ground(g, s) {
      const { level } = s;
      const gy = level.groundY;
      if (rocksOf !== level) {
        // Worked out once a level: the roofs the platform loop hands to stall() that are rocks.
        rocksOf = level;
        rocks.clear();
        for (const r of level.rocks) rocks.set(`${r.x}|${gy - r.h}`, { h: r.h, gap: gapUnder(level, r.x, r.w) });
      }
      mud.ground(g, s);
      // Water potholes (look only): the same hole, holding brown water.
      for (const x of level.waterPits) {
        if (x + 120 < s.L || x - 20 > s.R) continue;
        const span = level.ground.find(([a]) => a > x);
        if (span) drawWaterPothole(g, x, span[0], gy, s.H, s.clock, s.still);
      }
      drawCracks(g, s);
    },
    stall(g, x, topY, w, groundY) {
      const k = rocks.get(`${x}|${topY}`);
      if (k) drawRock(g, x, w, k.h, groundY, k.gap);
      else drawAbeokutaStall(g, x, topY, w, groundY);
    },
    food(g, kind, x, y, time) {
      if (kind === 'ofada') {
        drawOfada(g, x, y, time);
        return true;
      }
      return ogunFood(g, kind, x, y, time);
    },
    crate: ogunCrate,
    icon(g, kind, x, y, size) {
      if (kind === 'ofada') {
        drawOfadaIcon(g, x, y, size);
        return true;
      }
      return ogunIcon(g, kind, x, y, size);
    },
    front: mud.front,
    hear: mud.hear,
    restart: mud.restart,
    ...ogunRoom,
  };
}
