/**
 * O2b: Ota's street look (Ogun street 1; docs/ogun.md 1.4, 3.3, 3.4, 4.1 and 7). Gamedev's glue
 * between the game (src/game/skin.ts) and art's Ota pieces (ota.ts, ogunGate.ts). Lives in the
 * lazy Ogun part; it only draws and reads the run, never changes it.
 *
 * - The backdrop, the shade roofs, the gateway arch at the street's `arch` x (faded until King
 *   Pothole is beaten, then bright with its cog turning; still under reduced motion).
 * - Mud with footprints that fill in behind the hero and a little splash at each step.
 * - Ikokore on the road and in the HUD; garri as Ijebu garri (the crate and its food).
 * - Ota's people: its own cast of 16, the three traders at their stalls calling their own lines,
 *   the travellers by the arch saying welcome.
 */
import { drawGateArch } from '../../art/ogunGate';
import { OGUN_WORDS } from './partWords';
import type { StreetSkin } from '../../game/skin';
import type { StreetCast } from '../../game/crowd';
import type { FolkLook } from '../../art/folk';
import { OTA_CAST, OTA_TRADERS, OTA_TRADER_LOOKS, OTA_TRAVELLERS, drawOtaBackdrop, drawOtaStall, drawOtaTraderStall, type OtaTrader } from './ota';
import { abeokutaSkin } from './abeokutaStreet';
import { sagamuSkin } from './sagamuStreet';
import { mudMarks, ogunCrate, ogunFood, ogunIcon } from './ogunLook';

export { MUD_LOOK } from './ogunLook';

/** Each trader's stall stands this far to the right of where they stand (they stand beside it). */
const STALL_RIGHT = 40;

const TRADER_OF = new Map<FolkLook, OtaTrader>(OTA_TRADERS.map((k) => [OTA_TRADER_LOOKS[k], k]));

/** Ota's people (part 7), for the people system. `arch`: the arch's x. */
export function otaCast(arch: number): StreetCast {
  const calls = OGUN_WORDS.folk.traders.ota;
  return {
    name: 'ota',
    looks: OTA_CAST,
    // As Alausa: the counts start after the first screen (the arch and the travellers).
    from: 760,
    calls,
    callOf: (look) => {
      const k = TRADER_OF.get(look);
      return k ? calls[OTA_TRADERS.indexOf(k)] : undefined;
    },
    // By the arch: "Welcome!", "Ẹ káàbọ̀!", "Barka da zuwa!", "Nnọọ!", "You don land!".
    welcome: { to: arch + 400, lines: OGUN_WORDS.folk.welcome },
    // Three travellers just arrived, looking up at the arch.
    extras: OTA_TRAVELLERS.map((look, i) => ({ x: arch + 110 + i * 30, look, flip: i === 1 })),
  };
}

/** A fresh Ota look for one play of the street. */
export function otaSkin(arch: number): StreetSkin {
  const mud = mudMarks();
  return {
    cast: otaCast(arch),
    backdrop(g, camX, viewW, time, viewH, groundY, still) {
      drawOtaBackdrop(g, camX, viewW, time, viewH, groundY, still);
    },
    back(g, s) {
      // The traders' stalls, behind the traders on the back pavement (never something to touch).
      for (const t of s.people?.traders() ?? []) {
        const kind = TRADER_OF.get(t.look);
        const x = t.x + STALL_RIGHT;
        if (kind && x + 40 > s.L && x - 40 < s.R) drawOtaTraderStall(g, kind, x, t.feetY, s.still ? 0 : s.clock);
      }
    },
    ground(g, s) {
      mud.ground(g, s);
      const a = s.level.arch;
      if (a !== null && a + 120 > s.L && a - 120 < s.R) drawGateArch(g, a, s.level.groundY, 1, { lit: s.fixed, time: s.clock, still: s.still });
    },
    stall(g, x, topY, w, groundY) {
      drawOtaStall(g, x, topY, w, groundY);
    },
    food: ogunFood,
    crate: ogunCrate,
    icon: ogunIcon,
    front: mud.front,
    hear: mud.hear,
    restart: mud.restart,
  };
}

/** The Ogun part's street looks by level id (load.ts WorldPart.street). */
export function ogunStreet(level: { readonly id: string; readonly arch: number | null }): StreetSkin | null {
  if (level.id === 'ogun-1') return otaSkin(level.arch ?? 200);
  if (level.id === 'ogun-2') return abeokutaSkin();
  if (level.id === 'ogun-3') return sagamuSkin();
  return null;
}
