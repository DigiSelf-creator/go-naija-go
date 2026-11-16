/**
 * O3b: the street look pieces every Ogun street shares (gamedev's glue, lazy Ogun part): mud with
 * its footprints and splashes, ikokore, and garri as Ijebu garri (ogun.md 3.3, 4.1). Ota's,
 * Abeokuta's and Sagamu's skins (otaStreet.ts, abeokutaStreet.ts, sagamuStreet.ts) are built
 * from these. O4b: the cracks with their signs and the Ogun well room (the Ijebu garri store, its
 * parcel and keeper) moved here from Abeokuta's skin, since Sagamu has both too.
 */
import type { CrateLook } from '../../art/crate';
import type { CrateState } from '../../game/crates';
import type { StreetCast } from '../../game/crowd';
import type { FoodKind } from '../../game/level';
import type { CrackState } from '../../game/run';
import type { SkinEvent, SkinNow, StreetSkin } from '../../game/skin';
import { OGUN_WORDS } from './partWords';
import { CRACK, OGUN_STORE_KEEPER, OGUN_STORE_KEEPER_SPOT, drawCrack, drawCrackSign, drawIjebuParcel, drawIjebuParcelIcon, drawOgunShelf, drawOgunWellRoom, drawSackStack } from './abeokuta';
import { drawIjebuGarriCrate, drawIjebuGarriIcon, drawIkokore, drawIkokoreIcon, drawMud, drawMudPrint, drawMudSplash } from './ota';

type G = CanvasRenderingContext2D;

/** Footprints fill in over this long (s); a splash lasts this long; at most this many of each. */
export const MUD_LOOK = { printFill: 2.4, splash: 0.3, prints: 24, splashes: 4 } as const;

interface Mark {
  x: number;
  at: number;
  up: boolean;
}

/** Mud patches with footprints that fill in behind the hero and a little splash at each step. */
export function mudMarks() {
  const prints: Mark[] = [];
  const splashes: Mark[] = [];
  let up = false;
  return {
    /** World space, right after the road: the patches and the prints. */
    ground(g: G, s: SkinNow): void {
      const gy = s.level.groundY;
      for (const m of s.level.mud) if (m.x + m.w + 8 > s.L && m.x - 8 < s.R) drawMud(g, m.x, m.w, gy, s.clock, s.still);
      for (const p of prints) {
        const k = (s.clock - p.at) / MUD_LOOK.printFill;
        if (p.x > s.L && p.x < s.R) drawMudPrint(g, p.x, gy, k, p.up);
      }
    },
    /** World space, in front of the hero: the splashes (none under reduced motion). */
    front(g: G, s: SkinNow): void {
      if (s.still) return;
      for (const p of splashes) drawMudSplash(g, p.x, s.level.groundY, (s.clock - p.at) / MUD_LOOK.splash);
    },
    hear(events: readonly SkinEvent[], s: SkinNow): void {
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
    restart(): void {
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

/** Ikokore and Ijebu garri on the road. False: the game draws its own. */
export function ogunFood(g: G, kind: FoodKind, x: number, y: number, time: number): boolean {
  if (kind === 'ikokore') drawIkokore(g, x, y, time);
  else if (kind === 'garri') ijebuOnRoad(g, x, y, time);
  else return false;
  return true;
}

/** Ogun's garri crates are Ijebu garri (4.1): the same shield and words. */
export function ogunCrate(g: G, c: CrateState, look: Omit<CrateLook, 'stamp'>): boolean {
  if (c.contents !== 'garri') return false;
  drawIjebuGarriCrate(g, c.x, c.bottomY, look);
  return true;
}

/** The HUD chip icons for ikokore and Ijebu garri. */
export function ogunIcon(g: G, kind: FoodKind, x: number, y: number, size: number): boolean {
  if (kind === 'ikokore') drawIkokoreIcon(g, x, y, size);
  else if (kind === 'garri') drawIjebuGarriIcon(g, x, y, size);
  else return false;
  return true;
}

/** Run steps a second (run.ts STEPS_PER_SECOND; not imported, so the first load splits no chunk). */
export const STEPS = 60;
/** The crack sign's post stands this far before the left lip (pits.ts SIGN_BEFORE, the pothole sign's). */
const SIGN_BEFORE = 120;

/** How far open a crack is now: 0 shut, 0 to 1 rumbling open, 1 a pothole. */
export function crackOpen(c: CrackState, steps: number): number {
  if (c.state === 'open') return 1;
  if (c.state !== 'opening') return 0;
  // Held just short of open while the hero stands over it (it never opens under the feet).
  return Math.min(0.99, (steps - c.at) / (CRACK.openTime * STEPS));
}

/** World space: the street's cracks (the run says when each opens) and their signs. */
export function drawCracks(g: G, s: SkinNow): void {
  const { run } = s;
  const gy = s.level.groundY;
  for (const c of run.cracks) {
    if (c.x + c.w + 20 < s.L || c.x - SIGN_BEFORE - 30 > s.R) continue;
    drawCrackSign(g, c.x - SIGN_BEFORE, gy);
    drawCrack(g, c.x, c.w, gy, s.H, crackOpen(c, run.steps), s.clock, s.still);
  }
}

/** The Ogun well room's keeper (3.7): his look, his spot by the back wall and his words. */
export function ogunKeeper(): NonNullable<StreetCast['keeper']> {
  return { look: OGUN_STORE_KEEPER, x: OGUN_STORE_KEEPER_SPOT.x, words: OGUN_WORDS.folk.storeKeeper };
}

/** The Ogun well room, the Ijebu garri store (3.7): its back and shelves, the parcel and its HUD chip. */
export const ogunRoom: Pick<StreetSkin, 'room' | 'gift' | 'parcelIcon'> = {
  room(g, room, camX, viewW, time, viewH, still) {
    drawOgunWellRoom(g, camX, viewW, time, viewH, still);
    // The shelves in file order: sacks, the plank shelf (the parcel's), sacks (the room floor is OGUN_ROOM.floorY).
    room.terrain.platforms.forEach((p, i) => {
      if (i === 1) drawOgunShelf(g, p.x, p.y, p.w);
      else drawSackStack(g, p.x, p.y, p.w);
    });
    return true;
  },
  gift(g, x, y, time) {
    drawIjebuParcel(g, x, y, time);
    return true;
  },
  parcelIcon(g, x, y, size) {
    drawIjebuParcelIcon(g, x, y, size);
  },
};
