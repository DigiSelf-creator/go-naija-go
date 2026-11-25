/**
 * K4b: Dawanau's street look (Kano street 3; docs/kano.md 3.3, 3.6, 3.7 and 7). Gamedev's glue
 * between the game (src/game/skin.ts) and art's K4a pieces (dawanau.ts, sacks.ts, whirl.ts), in
 * the pattern of Kofar Mata's (kofarMataStreet.ts). It only draws and reads the run; the whirl
 * and fura rules live with the run (src/game/run.ts), the sacks are rocks (src/game/level.ts).
 *
 * - The evening backdrop (the dust streaks follow the hero into the tailwind), the wind sign and
 *   streamers, the traders' stalls, the grain sacks with their measurers, the oil table, the
 *   driver's tea box, the family buying beans and the people at the bus stop (all scenery behind
 *   the walking line, 120 u or more from the wells).
 * - The sack steps, the cloth frame and the grain sellers' mat roofs (the platform loop hands
 *   them all in as roofs). A sack on each porter's head pad, drawn after the people.
 * - Each dust whirl, spinning and swaying, then puffing apart; its soft "fff" only while one is on
 *   screen. Fura da nono on the road and in the HUD.
 * - The front stack of sacks before the secret well, in front of the hero (seen through while
 *   the hero is behind it). The groundnut store under it, as Kofar Mata's.
 *
 * Like every file in this folder it imports no value from outside src/worlds/kano/ (KN-R10).
 */
import type { StreetSkin } from '../../game/skin';
import type { StreetCast } from '../../game/crowd';
import type { FolkLook } from '../../art/folk';
import type { Level } from '../../game/level';
import { clothDip, drawClothFrame } from './cloth';
import {
  DAWANAU_BUS_STOP,
  DAWANAU_CAST,
  DAWANAU_DRIVER,
  DAWANAU_FAMILY,
  DAWANAU_MEASURERS,
  DAWANAU_OIL_SELLER,
  DAWANAU_PORTERS,
  DAWANAU_TRADERS,
  DAWANAU_TRADER_LOOKS,
  DAWANAU_TUNE,
  GRAIN_SPOT,
  drawDawanauBackdrop,
  drawDawanauStall,
  drawDawanauTraderStall,
  drawGrainSack,
  drawHeadSack,
  drawOilTable,
  drawTeaBox,
  type DawanauTrader,
  type GrainKind,
} from './dawanau';
import { FURA_LOOK, KANO_KEEPER, KANO_STORE } from './kofarMataStreet';
import { SACK_FRONT, drawSackFront, drawSackSteps } from './sacks';
import { WHIRL, drawDustWhirl, whirlPuffK } from './whirl';
import { drawWindSign, drawWindStreamers, windShow, type WindStretch } from './wind';
import { KANO_WORDS } from './words';

const STALL_RIGHT = 40;
const SIGN_HALF = 50;
const FRAME_H = 30;
const FEET_UP = 8;
/** The game's fixed step (run.ts STEPS_PER_SECOND), for a whirl's puff clock. */
const STEPS = 60;
/** The soft "fff" plays again this often while a whirl is on screen (its recipe is 0.5 s). */
const FFF_EVERY = 0.5;
/** The front stack shows the hero through it while the hero is this near the well. */
const BEHIND = SACK_FRONT.w / 2 + 8;
const SEEN_THROUGH = 0.5;

/**
 * K4b: Dawanau's scenery spots (world x), kept 120 u or more from the wells at 5150 and 5480:
 * open grain sacks (a measurer at the first two, the elder sitting), the oil table, the tea box,
 * the family by the beans and the people waiting at the bus stop (5600).
 */
export const DAWANAU_YARD = {
  grain: [
    [700, 'millet'],
    [2480, 'sorghum'],
    [7250, 'maize'],
    [10850, 'groundnut'],
  ] as readonly (readonly [number, GrainKind])[],
  oil: 4020,
  tea: 6960,
  family: 10520,
  stop: 5660,
} as const;
/** The oil seller stands, and the driver sits, this far left of their table and box (dawanau.ts). */
const OIL_AT = -24;
const TEA_AT = -18;

const TRADER_OF = new Map<FolkLook, DawanauTrader>(DAWANAU_TRADERS.map((k) => [DAWANAU_TRADER_LOOKS[k], k]));
const PORTERS = new Set<FolkLook>(DAWANAU_PORTERS);

/** Dawanau's people (part 7) at their own spots, and the store keeper in the well room (3.7). */
export function dawanauCast(): StreetCast {
  const calls = KANO_WORDS.folk.traders.dawanau;
  const [g0, g1] = DAWANAU_YARD.grain;
  const [p, child, q] = [DAWANAU_FAMILY[0], DAWANAU_FAMILY[2], DAWANAU_FAMILY[1]];
  return {
    name: 'dawanau',
    looks: DAWANAU_CAST,
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[DAWANAU_TRADERS.indexOf(k)] : undefined;
    },
    isTrader: (look) => TRADER_OF.has(look),
    extras: [
      { x: g0![0] + GRAIN_SPOT.trader, look: DAWANAU_MEASURERS[0] },
      { x: g1![0] + GRAIN_SPOT.trader, look: DAWANAU_MEASURERS[1], stool: true },
      { x: DAWANAU_YARD.oil + OIL_AT, look: DAWANAU_OIL_SELLER },
      { x: DAWANAU_YARD.tea + TEA_AT, look: DAWANAU_DRIVER, stool: true },
      { x: DAWANAU_YARD.family - 22, look: p },
      { x: DAWANAU_YARD.family, look: child },
      { x: DAWANAU_YARD.family + 20, look: q, flip: true },
      ...DAWANAU_BUS_STOP.map((look, i) => ({ x: DAWANAU_YARD.stop + i * 28, look, flip: i === 2 })),
    ],
    keeper: KANO_KEEPER,
  };
}

/** A fresh Dawanau look for one play of the street. */
export function dawanauSkin(level: Level): StreetSkin {
  const winds: WindStretch[] = level.wind.map((w) => [w.x, w.w, w.dir]);
  const sacks = new Set(level.sacks.map((k) => `${k.x}|${level.groundY - k.h}`));
  const frames = new Set(level.springs.map((k) => k.x));
  const well = level.wells[0]?.x ?? null;
  const landed = new Map<number, number>();
  let now = 0;
  let still = false;
  /** The clock at the last "fff". */
  let fffAt = -Infinity;
  return {
    cast: dawanauCast(),
    tune: DAWANAU_TUNE,
    backdrop(g, camX, viewW, time, viewH, groundY, st, s) {
      drawDawanauBackdrop(g, camX, viewW, time, viewH, groundY, st, windShow(winds, s.run.hero.x));
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
      for (const [x, kind] of DAWANAU_YARD.grain) if (near(x)) drawGrainSack(g, x, fy, kind, t, s.still);
      if (near(DAWANAU_YARD.oil)) drawOilTable(g, DAWANAU_YARD.oil, fy);
      if (near(DAWANAU_YARD.tea)) drawTeaBox(g, DAWANAU_YARD.tea, fy, t, s.still);
      for (const tr of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(tr.look);
        const x = tr.x + STALL_RIGHT;
        if (kind && near(x)) drawDawanauTraderStall(g, kind, x, tr.feetY);
      }
    },
    ground(g, s) {
      // A sack on each porter's head pad, over the person just drawn (the 'box' hold steadies it).
      const people = s.people;
      if (!people) return;
      for (const d of people.drawn) {
        const look = people.lookOf(d.look);
        if (!look || !PORTERS.has(look) || d.x < s.L || d.x > s.R) continue;
        const bob = d.frame === 'walk1' || d.frame === 'walk3' ? -0.6 : 0;
        g.save();
        g.translate(d.x, d.y);
        g.scale(d.size, d.size);
        drawHeadSack(g, 0, 0, 'adult', bob);
        g.restore();
      }
    },
    stall(g, x, topY, w, groundY) {
      if (sacks.has(`${x}|${topY}`)) drawSackSteps(g, x, w, groundY - topY, groundY);
      else if (topY === groundY - FRAME_H && frames.has(x)) drawClothFrame(g, x, w, groundY, { dip: clothDip(now - (landed.get(x) ?? -Infinity), still) });
      else drawDawanauStall(g, x, topY, w, groundY);
    },
    hazard(g, z, s) {
      if (z.kind !== 'whirl') return false;
      const gy = s.level.groundY;
      const seed = z.x0 * 0.37;
      if (z.mode === 'puff') {
        const k = whirlPuffK(z.t / STEPS);
        if (k !== null) drawDustWhirl(g, z.x, gy, s.clock, { still: s.still, seed, puff: k });
      } else drawDustWhirl(g, z.x, gy, s.clock, { still: s.still, seed });
      return true;
    },
    front(g, s) {
      if (well === null || well + SACK_FRONT.w < s.L || well - SACK_FRONT.w > s.R) return;
      const behind = Math.abs(s.run.hero.x - well) < BEHIND;
      drawSackFront(g, well, s.level.groundY, behind ? SEEN_THROUGH : 1);
    },
    hear(events, s) {
      for (const e of events) if (e.type === 'spring') landed.set(e.x, s.clock);
    },
    sound(s) {
      // The soft "fff" (0.5 s, again while it lasts), only while a whirl is on screen (kano.md 8).
      if (s.clock - fffAt < FFF_EVERY) return null;
      const L = s.camX - WHIRL.w / 2;
      const R = s.camX + s.viewW + WHIRL.w / 2;
      if (!s.run.hazards.some((z) => z.kind === 'whirl' && (z.mode === 'wait' || z.mode === 'move') && z.x > L && z.x < R)) return null;
      fffAt = s.clock;
      return 'whirlFff';
    },
    restart() {
      landed.clear();
      fffAt = -Infinity;
    },
    ...FURA_LOOK,
    ...KANO_STORE,
  };
}
