/**
 * O4b: Sagamu's street look (Ogun street 3; docs/ogun.md 3.3, 3.6, 3.7 and 7). Gamedev's glue
 * between the game (src/game/skin.ts) and art's Sagamu pieces (sagamu.ts). Lives in the lazy Ogun
 * part; it only draws and reads the run, never changes it.
 *
 * - The evening interchange backdrop, the kola shades as roofs.
 * - The two roads: the flyover deck and its steps (plain one-way platforms in the file, O0a3),
 *   found from the platforms (flyoverOf), with the low road under the deck: its back wall,
 *   pillars and lamps behind the mud, the gravel and the secret well.
 * - Hopping gravel: its hop frames, a dust puff at each landing, the crumble (bounced on, amala,
 *   ikokore) and the flip away when fufu knocks it.
 * - Mud and cracks as on Ota and Abeokuta; ikokore, Ijebu garri and the Ogun well room shared.
 * - Sagamu's people: its own cast of 16, the three traders at their stalls calling their lines.
 */
import type { FolkLook } from '../../art/folk';
import type { StreetCast } from '../../game/crowd';
import type { Level } from '../../game/level';
import type { HazardState } from '../../game/run';
import type { SkinNow, StreetSkin } from '../../game/skin';
import { OGUN_WORDS } from './partWords';
import {
  SAGAMU_CAST,
  SAGAMU_TRADERS,
  SAGAMU_TRADER_LOOKS,
  drawFlyoverDeck,
  drawFlyoverStep,
  drawGravel,
  drawGravelCrumble,
  drawGravelDust,
  drawGravelKnocked,
  drawLowRoad,
  drawSagamuBackdrop,
  drawSagamuStall,
  drawSagamuTraderStall,
  gravelHop,
  type SagamuTrader,
} from './sagamu';
import { STEPS, drawCracks, mudMarks, ogunCrate, ogunFood, ogunIcon, ogunKeeper, ogunRoom } from './ogunLook';

type G = CanvasRenderingContext2D;

/** Each trader's stall stands this far to the right of where they stand (as on Ota). */
const STALL_RIGHT = 40;

/**
 * The look's own numbers: a platform this wide or wider is a flyover deck; a platform whose end
 * comes within `chain` u of the deck (or of a step already found) is one of its steps; a landing
 * puff lasts `dust` s, a crumble `crumble` s, a fufu knock `knock` s (FUFU_RULES.knockSteps).
 */
export const SAGAMU_LOOK = { deckMin: 600, chain: 60, dust: 0.25, crumble: 0.35, knock: 0.4, puffs: 8 } as const;

const TRADER_OF = new Map<FolkLook, SagamuTrader>(SAGAMU_TRADERS.map((k) => [SAGAMU_TRADER_LOOKS[k], k]));

/** Sagamu's people (part 7), and the store keeper in the well room (3.7). */
export function sagamuCast(): StreetCast {
  const calls = OGUN_WORDS.folk.traders.sagamu;
  return {
    name: 'sagamu',
    looks: SAGAMU_CAST,
    // As Alausa: the counts start after the first screen.
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[SAGAMU_TRADERS.indexOf(k)] : undefined;
    },
    keeper: ogunKeeper(),
  };
}

/** A flyover: its deck and the steps up to it and down from it. */
export interface Flyover {
  readonly deck: { readonly x: number; readonly y: number; readonly w: number };
  readonly steps: readonly { readonly x: number; readonly y: number; readonly w: number }[];
}

/**
 * The flyovers in a level (ogun.md 3.3 "Two roads"). The file has plain platforms (O0a3), so the
 * look finds them: each platform at least SAGAMU_LOOK.deckMin wide is a deck, and the platforms
 * chained to its ends (each within SAGAMU_LOOK.chain u of the one before) are its steps.
 */
export function flyoversOf(level: Pick<Level, 'terrain'>): Flyover[] {
  const all = level.terrain.platforms;
  const out: Flyover[] = [];
  for (const deck of all) {
    if (deck.w < SAGAMU_LOOK.deckMin) continue;
    const steps: Flyover['steps'][number][] = [];
    let left = deck.x;
    let right = deck.x + deck.w;
    for (let found = true; found; ) {
      found = false;
      for (const p of all) {
        if (p === deck || steps.includes(p) || p.w >= SAGAMU_LOOK.deckMin) continue;
        const end = p.x + p.w;
        if (end <= left && left - end <= SAGAMU_LOOK.chain) left = p.x;
        else if (p.x >= right && p.x - right <= SAGAMU_LOOK.chain) right = end;
        else continue;
        steps.push(p);
        found = true;
      }
    }
    out.push({ deck, steps: steps.sort((a, b) => a.x - b.x) });
  }
  return out;
}

/** World space: one gravel in its mode (false: not gravel, the game draws it). */
export function drawGravelNow(g: G, z: HazardState, s: SkinNow): boolean {
  if (z.kind !== 'gravel') return false;
  const gy = s.level.groundY;
  if (z.mode === 'knocked') drawGravelKnocked(g, z.x, z.y, z.t / (SAGAMU_LOOK.knock * STEPS));
  else if (z.mode === 'falling') drawGravel(g, z.x, z.y, 'fall', z.y, z.x0);
  else {
    // Its height is the run's (z.y); the frame follows the same clock (z.t steps since it woke).
    const f = z.mode === 'move' ? gravelHop(z.t / STEPS, s.still).frame : 'sit';
    drawGravel(g, z.x, z.y, f, gy, z.x0);
  }
  return true;
}

interface Puff {
  x: number;
  at: number;
  crumble: boolean;
}

/** A fresh Sagamu look for one play of the street. */
export function sagamuSkin(): StreetSkin {
  const mud = mudMarks();
  /** The flyovers, worked out once a level; their platforms by x and top y. */
  let of: Level | null = null;
  let flyovers: Flyover[] = [];
  const kinds = new Map<string, 'deck' | 'step'>();
  /** Landing puffs and crumbles (a handful at most). */
  const puffs: Puff[] = [];
  const look = (level: Level): void => {
    if (of === level) return;
    of = level;
    flyovers = flyoversOf(level);
    kinds.clear();
    for (const f of flyovers) {
      kinds.set(`${f.deck.x}|${f.deck.y}`, 'deck');
      for (const p of f.steps) kinds.set(`${p.x}|${p.y}`, 'step');
    }
  };
  return {
    cast: sagamuCast(),
    backdrop(g, camX, viewW, time, viewH, groundY, still) {
      drawSagamuBackdrop(g, camX, viewW, time, viewH, groundY, still);
    },
    back(g, s) {
      for (const t of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(t.look);
        const x = t.x + STALL_RIGHT;
        if (kind && x + 40 > s.L && x - 40 < s.R) drawSagamuTraderStall(g, kind, x, t.feetY, s.still ? 0 : s.clock);
      }
    },
    ground(g, s) {
      look(s.level);
      // The low road's wall, pillars and lamps first, then the mud and cracks on the road.
      for (const { deck } of flyovers) {
        if (deck.x + deck.w > s.L && deck.x < s.R) drawLowRoad(g, deck.x, deck.x + deck.w, deck.y, s.level.groundY, s.clock, s.still);
      }
      mud.ground(g, s);
      drawCracks(g, s);
    },
    stall(g, x, topY, w, groundY) {
      const k = kinds.get(`${x}|${topY}`);
      if (k === 'deck') drawFlyoverDeck(g, x, topY, w);
      else if (k === 'step') drawFlyoverStep(g, x, topY, w, groundY);
      else drawSagamuStall(g, x, topY, w, groundY);
    },
    hazard: drawGravelNow,
    food: ogunFood,
    crate: ogunCrate,
    icon: ogunIcon,
    front(g, s) {
      mud.front(g, s);
      if (s.still) return;
      const gy = s.level.groundY;
      for (const p of puffs) {
        if (p.x < s.L || p.x > s.R) continue;
        if (p.crumble) drawGravelCrumble(g, p.x, gy, (s.clock - p.at) / SAGAMU_LOOK.crumble);
        else drawGravelDust(g, p.x, gy, (s.clock - p.at) / SAGAMU_LOOK.dust);
      }
    },
    hear(events, s) {
      mud.hear(events, s);
      for (const e of events) {
        if (e.type === 'gravelHop') puffs.push({ x: e.x, at: s.clock, crumble: false });
        else if (e.type === 'crumble') puffs.push({ x: e.x, at: s.clock, crumble: true });
      }
      // Faded or too many: gone.
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]!;
        if (s.clock - p.at >= (p.crumble ? SAGAMU_LOOK.crumble : SAGAMU_LOOK.dust)) puffs.splice(i, 1);
      }
      if (puffs.length > SAGAMU_LOOK.puffs) puffs.splice(0, puffs.length - SAGAMU_LOOK.puffs);
    },
    restart() {
      mud.restart();
      puffs.length = 0;
    },
    ...ogunRoom,
  };
}
