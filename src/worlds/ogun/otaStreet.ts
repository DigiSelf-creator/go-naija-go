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
import { OGUN_WORDS } from '../../screens/words';
import type { SkinEvent, SkinNow, StreetSkin } from '../../game/skin';
import type { StreetCast } from '../../game/crowd';
import type { FolkLook } from '../../art/folk';
import {
  OTA_CAST,
  OTA_TRADERS,
  OTA_TRADER_LOOKS,
  OTA_TRAVELLERS,
  drawIjebuGarriCrate,
  drawIjebuGarriIcon,
  drawIkokore,
  drawIkokoreIcon,
  drawMud,
  drawMudPrint,
  drawMudSplash,
  drawOtaBackdrop,
  drawOtaStall,
  drawOtaTraderStall,
  type OtaTrader,
} from './ota';

type G = CanvasRenderingContext2D;

/** Footprints fill in over this long (s); a splash lasts this long; at most this many of each. */
export const MUD_LOOK = { printFill: 2.4, splash: 0.3, prints: 24, splashes: 4 } as const;

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

interface Mark {
  x: number;
  at: number;
  up: boolean;
}

/** A fresh Ota look for one play of the street. */
export function otaSkin(arch: number): StreetSkin {
  const prints: Mark[] = [];
  const splashes: Mark[] = [];
  let up = false;
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
      const gy = s.level.groundY;
      for (const m of s.level.mud) if (m.x + m.w + 8 > s.L && m.x - 8 < s.R) drawMud(g, m.x, m.w, gy, s.clock, s.still);
      // Fresh prints fill in behind the hero.
      for (const p of prints) {
        const k = (s.clock - p.at) / MUD_LOOK.printFill;
        if (p.x > s.L && p.x < s.R) drawMudPrint(g, p.x, gy, k, p.up);
      }
      const a = s.level.arch;
      if (a !== null && a + 120 > s.L && a - 120 < s.R) drawGateArch(g, a, gy, 1, { lit: s.fixed, time: s.clock, still: s.still });
    },
    stall(g, x, topY, w, groundY) {
      drawOtaStall(g, x, topY, w, groundY);
    },
    food(g, kind, x, y, time) {
      if (kind === 'ikokore') drawIkokore(g, x, y, time);
      else if (kind === 'garri') ijebuOnRoad(g, x, y, time);
      else return false;
      return true;
    },
    crate(g, c, look) {
      // Ogun's garri crates are Ijebu garri (4.1): the same shield and words.
      if (c.contents !== 'garri') return false;
      drawIjebuGarriCrate(g, c.x, c.bottomY, look);
      return true;
    },
    icon(g, kind, x, y, size) {
      if (kind === 'ikokore') drawIkokoreIcon(g, x, y, size);
      else if (kind === 'garri') drawIjebuGarriIcon(g, x, y, size);
      else return false;
      return true;
    },
    front(g, s) {
      if (s.still) return; // reduced motion: no splash drops
      for (const p of splashes) drawMudSplash(g, p.x, s.level.groundY, (s.clock - p.at) / MUD_LOOK.splash);
    },
    hear(events: readonly SkinEvent[], s: SkinNow) {
      for (const e of events) {
        if (e.type !== 'mudStep') continue;
        up = !up;
        prints.push({ x: e.x + (up ? -3 : 3), at: s.clock, up });
        splashes.push({ x: e.x, at: s.clock, up });
      }
      // Filled in or landed: gone (and never more than a handful kept).
      while (prints.length > MUD_LOOK.prints || (prints.length && s.clock - prints[0]!.at >= MUD_LOOK.printFill)) prints.shift();
      while (splashes.length > MUD_LOOK.splashes || (splashes.length && s.clock - splashes[0]!.at >= MUD_LOOK.splash)) splashes.shift();
    },
    restart() {
      prints.length = 0;
      splashes.length = 0;
    },
  };
}

/** Ijebu garri on the road (a crate's drop), bobbing on a soft halo as every food. */
function ijebuOnRoad(g: G, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 4) * 2;
  g.fillStyle = 'rgba(255,248,220,0.7)';
  g.beginPath();
  g.arc(x, y + bob, 18, 0, Math.PI * 2);
  g.fill();
  drawIjebuGarriIcon(g, x, y + bob, 1);
}

/** The Ogun part's street looks by level id (load.ts WorldPart.street). */
export function ogunStreet(level: { readonly id: string; readonly arch: number | null }): StreetSkin | null {
  return level.id === 'ogun-1' ? otaSkin(level.arch ?? 200) : null;
}
