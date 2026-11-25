/**
 * K3b: Kofar Mata's street look (Kano street 2; docs/kano.md 3.3, 3.5, 3.7 and 7). Gamedev's glue
 * between the game (src/game/skin.ts) and art's K3a pieces (kofarMata.ts, cloth.ts, fura.ts,
 * store.ts), in the pattern of Kurmi's (kurmiStreet.ts). It only draws and reads the run; the
 * springy cloth's bounce lives with the physics (src/engine/physics.ts, Platform.spring).
 *
 * - The backdrop (the dust streaks follow the hero into a wind stretch, as on Kurmi), the wind
 *   signs and streamers, the traders' stalls, and the dye yard: the dye pits with their dyers, the
 *   beating log with its two beaters, the tailor's table with the tailor (all scenery behind the
 *   walking line, KN-R4, 120 u or more from the well).
 * - Each springy cloth frame (the platform loop hands them in as roofs), dipping as it is landed
 *   on; the bounce sign before the first. The beaters' "tok" only while their log is on screen.
 * - The groundnut store under the well (its sacks and kuli-kuli shelf, Kano's garri parcel, the
 *   keeper), the parcel's HUD chip. Kofar Mata's cast and tune.
 *
 * Like every file in this folder it imports no value from outside src/worlds/kano/ (KN-R10).
 */
import type { StreetSkin } from '../../game/skin';
import type { StreetCast } from '../../game/crowd';
import type { FolkLook } from '../../art/folk';
import type { Level } from '../../game/level';
import { clothDip, drawBounceSign, drawClothFrame } from './cloth';
import { drawFura, drawFuraIcon } from './fura';
import {
  BEATING_LOG,
  DYE_PIT,
  KOFAR_BEATERS,
  KOFAR_DYERS,
  KOFAR_MATA_CAST,
  KOFAR_MATA_TUNE,
  KOFAR_TAILOR,
  KOFAR_TRADERS,
  KOFAR_TRADER_LOOKS,
  drawBeatingLog,
  drawDyePit,
  drawKanoTailorTable,
  drawKofarMataBackdrop,
  drawKofarMataStall,
  drawKofarMataTraderStall,
  type KofarTrader,
} from './kofarMata';
import { KANO_STORE_KEEPER, KANO_STORE_KEEPER_SPOT, drawGroundnutSacks, drawKanoParcel, drawKanoParcelIcon, drawKanoWellRoom, drawKuliShelf } from './store';
import { drawWindSign, drawWindStreamers, windShow, type WindStretch } from './wind';
import { KANO_WORDS } from './words';

/** Each trader's stall stands this far to the right of where they stand (as Kurmi's). */
const STALL_RIGHT = 40;
const SIGN_HALF = 50;
/** The bounce sign stands this far before the first frame (cloth.ts). */
const SIGN_BEFORE = 40;
/** The cloth frame's height (cloth.ts CLOTH_FRAME.h; level.ts SPRING.h). */
const FRAME_H = 30;
/** People's feet stand this far up the back pavement (crowd.ts CROWD.feetUp). */
const FEET_UP = 8;

/**
 * K3b: the dye yard along Kofar Mata (world x), kept 120 u or more from the wells at 3600 and
 * 4800 and off the cloth frames: three dye pits (a dyer at each), the beating log and the tailor.
 */
export const KOFAR_YARD = { pits: [1020, 4300, 10150], log: 1130, tailor: 5640 } as const;
/** The tailor sits this far left of the table (kofarMata.ts drawKanoTailorTable). */
const TAILOR_AT = -22;

const TRADER_OF = new Map<FolkLook, KofarTrader>(KOFAR_TRADERS.map((k) => [KOFAR_TRADER_LOOKS[k], k]));

/** Kofar Mata's people (part 7) at their own spots, and the store keeper in the well room (3.7). */
export function kofarMataCast(): StreetCast {
  const calls = KANO_WORDS.folk.traders.kofarMata;
  const [b0, b1] = BEATING_LOG.beaters;
  return {
    name: 'kofarMata',
    looks: KOFAR_MATA_CAST,
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[KOFAR_TRADERS.indexOf(k)] : undefined;
    },
    isTrader: (look) => TRADER_OF.has(look),
    extras: [
      ...KOFAR_YARD.pits.map((x, i) => ({ x: x + DYE_PIT.dyerAt, look: KOFAR_DYERS[i]! })),
      { x: KOFAR_YARD.log + b0, look: KOFAR_BEATERS[0], stool: true },
      { x: KOFAR_YARD.log + b1, look: KOFAR_BEATERS[1], flip: true, stool: true },
      { x: KOFAR_YARD.tailor + TAILOR_AT, look: KOFAR_TAILOR, stool: true },
    ],
    keeper: KANO_KEEPER,
  };
}

/** A fresh Kofar Mata look for one play of the street. */
export function kofarMataSkin(level: Level): StreetSkin {
  const winds: WindStretch[] = level.wind.map((w) => [w.x, w.w, w.dir]);
  const frames = new Set(level.springs.map((s) => s.x));
  const first = level.springs[0]?.x ?? null;
  /** The game clock at each frame's last bounce, by its x (for the dip). */
  const landed = new Map<number, number>();
  /** What back() last saw (stall() is handed only the roof). */
  let now = 0;
  let still = false;
  /** The beat the last "tok" was for. */
  let lastBeat = -1;
  return {
    cast: kofarMataCast(),
    tune: KOFAR_MATA_TUNE,
    backdrop(g, camX, viewW, time, viewH, groundY, st, s) {
      drawKofarMataBackdrop(g, camX, viewW, time, viewH, groundY, st, windShow(winds, s.run.hero.x));
    },
    back(g, s) {
      now = s.clock;
      still = s.still;
      const t = s.still ? 0 : s.clock;
      const gy = s.level.groundY;
      for (const [a, w, dir] of winds) {
        if (a + w + 20 < s.L || a - SIGN_HALF > s.R) continue;
        drawWindStreamers(g, a, a + w, gy, dir, t, s.still, s.L, s.R);
        if (a + SIGN_HALF > s.L) drawWindSign(g, a, gy, dir, t, s.still);
      }
      const fy = gy - FEET_UP;
      const near = (x: number): boolean => x + 40 > s.L && x - 40 < s.R;
      for (const x of KOFAR_YARD.pits) if (near(x)) drawDyePit(g, x, fy, t, s.still);
      if (near(KOFAR_YARD.log)) drawBeatingLog(g, KOFAR_YARD.log, fy, t, s.still);
      if (near(KOFAR_YARD.tailor)) drawKanoTailorTable(g, KOFAR_YARD.tailor, fy);
      for (const tr of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(tr.look);
        const x = tr.x + STALL_RIGHT;
        if (kind && near(x)) drawKofarMataTraderStall(g, kind, x, tr.feetY);
      }
    },
    ground(g, s) {
      if (first !== null && first - SIGN_BEFORE + 20 > s.L && first - SIGN_BEFORE - 20 < s.R) drawBounceSign(g, first - SIGN_BEFORE, s.level.groundY);
    },
    stall(g, x, topY, w, groundY) {
      if (topY === groundY - FRAME_H && frames.has(x)) drawClothFrame(g, x, w, groundY, { dip: clothDip(now - (landed.get(x) ?? -Infinity), still) });
      else drawKofarMataStall(g, x, topY, w, groundY);
    },
    hear(events, s) {
      for (const e of events) if (e.type === 'spring') landed.set(e.x, s.clock);
    },
    sound(s) {
      // The beaters' two taps a beat (art's drawBeatingLog), only while their log is on screen.
      const beat = Math.floor(s.clock / BEATING_LOG.beat);
      if (beat === lastBeat) return null;
      lastBeat = beat;
      const x = KOFAR_YARD.log;
      return !s.still && x + 20 > s.camX && x - 20 < s.camX + s.viewW ? 'beaterTok' : null;
    },
    restart() {
      landed.clear();
      lastBeat = -1;
    },
    ...FURA_LOOK,
    ...KANO_STORE,
  };
}

/** K3b: the groundnut store under a Kano well (kano.md 3.7), its parcel and the parcel's HUD chip. K4b: Dawanau's too. */
export const KANO_STORE: Pick<StreetSkin, 'room' | 'gift' | 'parcelIcon'> = {
  room(g, room, camX, viewW, time, viewH, st) {
    drawKanoWellRoom(g, camX, viewW, time, viewH, st);
    // The shelves in file order: groundnut sacks, the kuli-kuli shelf (the parcel's), groundnut sacks.
    room.terrain.platforms.forEach((p, i) => {
      if (i === 1) drawKuliShelf(g, p.x, p.y, p.w);
      else drawGroundnutSacks(g, p.x, p.y, p.w);
    });
    return true;
  },
  gift(g, x, y, time) {
    drawKanoParcel(g, x, y, time);
    return true;
  },
  parcelIcon(g, x, y, size) {
    drawKanoParcelIcon(g, x, y, size);
  },
};

/** K4b: fura da nono on the road and in the HUD (any Kano street that holds it; Dawanau first). */
export const FURA_LOOK: Pick<StreetSkin, 'food' | 'icon'> = {
  food(g, kind, x, y, time) {
    if (kind !== 'fura') return false;
    drawFura(g, x, y, time);
    return true;
  },
  icon(g, kind, x, y, size) {
    if (kind !== 'fura') return false;
    drawFuraIcon(g, x, y, size);
    return true;
  },
};

/** K4b: the store keeper in a Kano well room (kano.md 3.7), for a street's cast. */
export const KANO_KEEPER = { look: KANO_STORE_KEEPER, x: KANO_STORE_KEEPER_SPOT.x, words: KANO_WORDS.folk.storeKeeper } as const;
