/**
 * K2b: Kurmi's street look (Kano street 1; docs/kano.md 1.4, 3.3, 3.4, 4.1 and 7). Gamedev's glue
 * between the game (src/game/skin.ts) and art's Kurmi pieces (kurmi.ts, wind.ts, gate.ts). It only
 * draws and reads the run; the wind rules themselves live with the run (src/game/run.ts).
 *
 * - The backdrop, with the dust streaks following the hero into (and out of) a wind stretch.
 * - Each wind stretch: its sign at the start and the streamers along it (behind the people).
 * - Our own gate in the old wall at the level's `gate` x (bright once Kano is switched on).
 * - The leather sellers' mat roofs, kilishi on the road and in the HUD.
 * - Kurmi's people: its cast of 16, the three traders at their stalls calling their own lines,
 *   the welcome by the gate. Kurmi's street tune.
 *
 * Like every file in this folder it imports no value from outside src/worlds/kano/ (KN-R10).
 */
import type { StreetSkin } from '../../game/skin';
import type { StreetCast } from '../../game/crowd';
import type { FolkLook } from '../../art/folk';
import type { Level } from '../../game/level';
import { drawKanoGate } from './gate';
import { KURMI_CAST, KURMI_TRADERS, KURMI_TRADER_LOOKS, KURMI_TUNE, drawKilishi, drawKilishiIcon, drawKurmiBackdrop, drawKurmiStall, drawKurmiTraderStall, type KurmiTrader } from './kurmi';
import { drawWindSign, drawWindStreamers, windShow, type WindStretch } from './wind';
import { KANO_WORDS } from './words';
import { kofarMataSkin } from './kofarMataStreet';
import { dawanauSkin } from './dawanauStreet';
import { boreholeHallSkin } from './boreholeHallSkin';

/** Each trader's stall stands this far to the right of where they stand (as Ota's). */
const STALL_RIGHT = 40;
/** The sign stands at a stretch's start; it is drawn while any of it can be on screen. */
const SIGN_HALF = 50;

const TRADER_OF = new Map<FolkLook, KurmiTrader>(KURMI_TRADERS.map((k) => [KURMI_TRADER_LOOKS[k], k]));

/** Kurmi's people (part 7), for the people system. `gate`: the gate's x. */
export function kurmiCast(gate: number): StreetCast {
  const calls = KANO_WORDS.folk.traders.kurmi;
  return {
    name: 'kurmi',
    looks: KURMI_CAST,
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[KURMI_TRADERS.indexOf(k)] : undefined;
    },
    // Kurmi's traders hold up their goods (a bag, sandals, a plate of kosai), not a trader's tray.
    isTrader: (look) => TRADER_OF.has(look),
    // By the gate: "Welcome!", "Barka da zuwa!", "Ẹ káàbọ̀!", "Nnọọ!", "You don land!".
    welcome: { to: gate + 400, lines: KANO_WORDS.folk.welcome },
  };
}

/** A fresh Kurmi look for one play of the street. */
export function kurmiSkin(level: Level): StreetSkin {
  const winds: WindStretch[] = level.wind.map((w) => [w.x, w.w, w.dir]);
  const gate = level.gate;
  return {
    cast: kurmiCast(gate ?? 200),
    tune: KURMI_TUNE,
    backdrop(g, camX, viewW, time, viewH, groundY, still, s) {
      drawKurmiBackdrop(g, camX, viewW, time, viewH, groundY, still, windShow(winds, s.run.hero.x));
    },
    back(g, s) {
      const t = s.still ? 0 : s.clock;
      const gy = s.level.groundY;
      for (const [a, w, dir] of winds) {
        if (a + w + 20 < s.L || a - SIGN_HALF > s.R) continue;
        drawWindStreamers(g, a, a + w, gy, dir, t, s.still, s.L, s.R);
        if (a + SIGN_HALF > s.L) drawWindSign(g, a, gy, dir, t, s.still);
      }
      // The traders' stalls, behind the traders on the back pavement (never something to touch).
      for (const tr of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(tr.look);
        const x = tr.x + STALL_RIGHT;
        if (kind && x + 40 > s.L && x - 40 < s.R) drawKurmiTraderStall(g, kind, x, tr.feetY, t);
      }
    },
    ground(g, s) {
      if (gate !== null && gate + 120 > s.L && gate - 120 < s.R) drawKanoGate(g, gate, s.level.groundY, 1, { lit: s.fixed, time: s.clock, still: s.still, boardX: 70 });
    },
    stall(g, x, topY, w, groundY) {
      drawKurmiStall(g, x, topY, w, groundY);
    },
    food(g, kind, x, y, time) {
      if (kind !== 'kilishi') return false;
      drawKilishi(g, x, y, time);
      return true;
    },
    icon(g, kind, x, y, size) {
      if (kind !== 'kilishi') return false;
      drawKilishiIcon(g, x, y, size);
      return true;
    },
  };
}

/** The Kano part's street looks by level id (load.ts WorldPart.street): Kurmi, K3b Kofar Mata, K4b Dawanau, K5b Borehole Hall. */
export function kanoStreet(level: Level): StreetSkin | null {
  const id = level.id;
  return id === 'kano-1' ? kurmiSkin(level) : id === 'kano-2' ? kofarMataSkin(level) : id === 'kano-3' ? dawanauSkin(level) : id === 'kano-hall' ? boreholeHallSkin() : null;
}
