/**
 * K5b: Borehole Hall's look in play (docs/kano.md 5.2 to 5.5 and 7). Gamedev's glue between the
 * game (Game.renderHall calls StreetSkin.hall) and art's K5a pieces in boreholeHall.ts, in the
 * pattern of Pothole Hall's (ogun/potholeHallSkin.ts). It only draws and reads the run and the
 * fight; it never changes them.
 *
 * Draw order (art's hookup notes): the hall's back, the gust's dust streaks (screen space), the
 * wash line and the running taps, the door people with the can and the cart, the water line and
 * the valves, the cloth frames, Rusty Borehole and his sneeze puff, the whirls, the hero, the
 * hall's front walls and his word, then the valve counter at the top of the screen.
 *
 * K5c, short screens: the HUD row (lives and the parcel chip at the left, Sound and Pause at the
 * right) must never cover a valve, its tag or the counter. Where it would (320 x 240), the hall is
 * drawn a little smaller about the floor line, so its top comes down below the HUD row and the
 * floor stays where it was, above the buttons; a tag that would run under Sound hangs left; the
 * counter sits just under Sound and Pause. Every other screen draws exactly as before.
 *
 * The door people: this part draws no person itself (KN-R10), so the game's people (GamePeople
 * drawOwn and say) bake them once and copy them 1:1, and put up their cheer.
 */
import type { SkinEvent, SkinNow, StreetSkin } from '../../game/skin';
import type { FolkFrame } from '../../art/folk';
import {
  BH_CAN_X,
  BH_CART_AHEAD,
  BH_CART_X,
  BH_CHEER_SPOTS,
  BH_DOOR_CHEERS,
  BH_DOOR_PEOPLE,
  BH_DOOR_SCALE,
  BH_DOOR_SPOTS,
  BH_HALL,
  BOREHOLE_HALL_TUNE,
  BH_TAG,
  drawBoreholeHall,
  drawBoreholeHallFront,
  drawBoreholeRoofAbove,
  drawBoreholeLine,
  drawPipeDust,
  drawRustyBorehole,
  drawRustyWord,
  drawSneezePuff,
  drawTapWater,
  drawValve,
  drawValveCounter,
  drawWashLine,
  drawWaterCan,
  drawWaterCart,
  rustyFinishAt,
  type RustyLook,
} from './boreholeHall';
import { clothDip, drawClothFrame } from './cloth';
import { drawDustStreaks } from './wind';
import { drawDustWhirl, whirlPuffK } from './whirl';
import { KANO_WORDS } from './words';
import type { RustyFight } from './rustyFight';
import type { View } from '../../engine/view';

const STEPS = 60;

/** The look's own timings, s. */
export const BH_LOOK = {
  /** Rusty's hiccup after a hit; his "hic!", the valve's "SQUEAK... GLUG!" and the door cheer. */
  hiccup: 0.4,
  word: 1.0,
  doorCheer: 1.0,
  /** The gust's streaks fade in and out over this long. */
  streakFade: 0.3,
  /** At the finish the door people walk in from the toast, at this speed (u/s). */
  walkSpeed: 110,
  /** The soft "fff" again this often while a whirl is on screen. */
  fff: 0.5,
  /** KN-R14: the dust puff runs along the pipe to the valve over this long as it shakes loose, s. */
  pipeDust: 0.5,
} as const;

/**
 * The HUD row as screens.css lays it out (CSS px, measured in the hall): the lives chip and the
 * parcel/shield chip from the left edge (widest with its word: 157 px), 41 px down with the lip;
 * Sound and Pause, 44 px buttons, 110 px from the right edge and 50 px down. A little room more.
 */
export const BH_HUD = { leftW: 160, leftH: 41, rightW: 112, rightH: 50, gap: 3, smallest: 0.6 } as const;

export interface BhRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How the hall is drawn on this screen (boreholeFit). */
export interface BhFit {
  /** The hall's size on screen: 1 normally, below 1 on a short screen. */
  z: number;
  /** World x at the screen's left, world width shown, world y at the screen's top and bottom. */
  camX: number;
  viewW: number;
  top: number;
  bottom: number;
  /** Each valve's tag hangs left (true) or right. */
  tagLeft: boolean[];
  /** The valve counter (screen world u, as drawValveCounter takes it: the middle wheel's x, top y). */
  counter: { x: number; y: number };
  /** For qa: CSS px boxes of each valve, each valve's tag, the pipe between the valves, and the counter. */
  seen: { valves: BhRect[]; tags: BhRect[]; pipe: BhRect; counter: BhRect };
}

const overlaps = (a: BhRect, b: BhRect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * K5c: the largest size (1 or less) at which the valves, the shown tag's side and the pipe between
 * the valves are all clear of the HUD row, the floor line staying where it is on screen. camX and
 * lift are the game's (world x at the left, world y at the top); `valves` the hall file's x.
 */
export function boreholeFit(view: Pick<View, 'width' | 'height' | 'scale' | 'ratio' | 'safe'>, camX: number, lift: number, valves: readonly number[] = BH_HALL.valves): BhFit {
  const H = BH_HALL;
  const W = view.width;
  // World u per CSS px.
  const c = (view.ratio ?? 1) / view.scale;
  const safe = view.safe;
  const topPad = Math.max(6 * c, safe.top);
  const hud = [
    { x: -1e4, y: -1e4, w: 1e4 + Math.max(10 * c, safe.left) + (BH_HUD.leftW - 10) * c, h: 1e4 + topPad + (BH_HUD.leftH - 6 + BH_HUD.gap) * c },
    { x: W - Math.max(10 * c, safe.right) - (BH_HUD.rightW - 10) * c, y: -1e4, w: 2e4, h: 1e4 + topPad + (BH_HUD.rightH - 6 + BH_HUD.gap) * c },
  ];
  const clear = (r: BhRect): boolean => !hud.some((z) => overlaps(r, z));
  const floorS = H.floorY - lift;
  const px = camX + W / 2;
  const vb = H.valveBottom;
  const r = H.valveR;
  const T = BH_TAG;
  let z = 1;
  let fit: { tagLeft: boolean[]; valves: BhRect[]; tags: BhRect[]; pipe: BhRect } | null = null;
  for (let i = 0; ; i++) {
    z = Math.max(BH_HUD.smallest, 1 - i * 0.005);
    const sx = (x: number): number => W / 2 + (x - px) * z;
    const sy = (y: number): number => floorS + (y - H.floorY) * z;
    const box = (x0: number, y0: number, x1: number, y1: number): BhRect => ({ x: sx(x0), y: sy(y0), w: (x1 - x0) * z, h: (y1 - y0) * z });
    const vs = valves.map((x) => box(x - r, vb - 2 * r, x + r, vb));
    const right = valves.map((x) => box(x + T.dx0, vb + T.dy0, x + T.dx1, vb + T.dy1));
    const left = valves.map((x) => box(x - T.dx1, vb + T.dy0, x - T.dx0, vb + T.dy1));
    const tagLeft = valves.map((_, k) => !clear(right[k]!) && clear(left[k]!));
    const tags = valves.map((_, k) => (tagLeft[k] ? left[k]! : right[k]!));
    const pipe = box(valves[0]! - r, H.lineY - 8, valves[valves.length - 1]! + r, H.lineY + 8);
    fit = { tagLeft, valves: vs, tags, pipe };
    if (z <= BH_HUD.smallest || [...vs, ...tags, pipe].every(clear)) break;
  }
  // The counter: under Sound and Pause (never in the HUD row), as before on a roomy screen.
  const counter = { x: W - 48 - safe.right, y: Math.max(66 + safe.top, hud[1]!.y + hud[1]!.h + 2) };
  const css = (b: BhRect): BhRect => ({ x: b.x / c, y: b.y / c, w: b.w / c, h: b.h / c });
  return {
    z,
    camX: px - W / 2 / z,
    viewW: W / z,
    top: H.floorY - floorS / z,
    bottom: H.floorY + (view.height - floorS) / z,
    tagLeft: fit.tagLeft,
    counter,
    seen: {
      valves: fit.valves.map(css),
      tags: fit.tags.map(css),
      pipe: css(fit.pipe),
      counter: css({ x: counter.x - 24 - 9, y: counter.y - 3, w: 66, h: 21 }),
    },
  };
}

let lastFit: BhFit | null = null;
let lastFitKey = '';
/** The fit the hall was last drawn with (qa reads it through the fight's peek). */
export function boreholeHallSeen(): BhFit | null {
  return lastFit;
}

/** Rusty's look now (kano.md 5.4; the finish has its own): hiccup, blow, puff, wheeze or grumpy. */
export function rustyLook(f: RustyFight, clock: number, still: boolean): RustyLook {
  const flakes = f.hits;
  const last = f.hitAt[f.hitAt.length - 1];
  const since = last === undefined ? Infinity : (f.steps - last) / STEPS;
  const base = { flakes, time: clock, still };
  if (since < BH_LOOK.hiccup) return { ...base, mood: 'hiccup', k: since / BH_LOOK.hiccup };
  if (f.gusting) return { ...base, mood: 'blow' };
  const w = f.warn;
  if (w >= 0) return { ...base, mood: f.nextKind === 'gust' ? 'puff' : 'wheeze', k: w };
  return { ...base, mood: 'grumpy' };
}

/** The wash line's gust (0 to 1): fluttering as he puffs, streaming while it blows. */
export function gustLook(f: RustyFight): number {
  if (f.gusting) {
    const lasts = f.data.gust.lasts;
    const k = f.gustK;
    return Math.min(1, (k * lasts) / BH_LOOK.streakFade, ((1 - k) * lasts) / BH_LOOK.streakFade);
  }
  return f.nextKind === 'gust' && f.warn >= 0 ? 0.3 * f.warn : 0;
}

/** A fresh Borehole Hall look for one try. */
export function boreholeHallSkin(): StreetSkin {
  const landed = new Map<number, number>();
  let fffAt = -Infinity;
  return {
    tune: BOREHOLE_HALL_TUNE,
    backdrop() {
      // The hall draws all of itself in hall().
    },
    hear(events: readonly SkinEvent[], s: SkinNow) {
      for (const e of events) if (e.type === 'spring') landed.set(e.x, s.clock);
    },
    sound(s) {
      if (s.clock - fffAt < BH_LOOK.fff) return null;
      if (!s.run.hazards.some((z) => z.kind === 'whirl' && z.mode === 'move')) return null;
      fffAt = s.clock;
      return 'whirlFff';
    },
    restart() {
      landed.clear();
      fffAt = -Infinity;
    },
    hall(g, s, hero, view) {
      const f = s.run.arena as RustyFight | null;
      if (!f) return false;
      const { clock, still } = s;
      const gy = BH_HALL.floorY;
      // K5c: the hall's size and place on this screen (1 and as before, except on a short screen).
      const fitKey = `${view.width}|${view.height}|${view.scale}|${view.ratio}|${view.safe.top}|${view.safe.left}|${view.safe.right}|${s.camX}|${s.H}|${f.data.valves.x.join()}`;
      if (fitKey !== lastFitKey || !lastFit) lastFit = boreholeFit(view, s.camX, s.H - view.height, f.data.valves.x);
      lastFitKey = fitKey;
      const fit = lastFit;
      const { camX, viewW, z } = fit;
      const H = fit.bottom;
      const lift = fit.top;
      const zv: View = z === 1 ? view : { ...view, scale: view.scale * z };
      const k = view.scale * z;
      g.setTransform(k, 0, 0, k, -camX * k, -lift * k);
      if (lift < 0) drawBoreholeRoofAbove(g, camX - 2, camX + viewW + 2, lift);
      const t = still ? 0 : clock;
      const fin = f.defeated ? rustyFinishAt(f.finishT, still) : null;
      const hits = f.hits;
      const last = f.hitAt[hits - 1];
      const sinceHit = last === undefined ? Infinity : (f.steps - last) / STEPS;
      drawBoreholeHall(g, H);
      const gk = fin ? 0 : gustLook(f);
      if (f.gusting) {
        g.save();
        g.translate(camX, 0);
        drawDustStreaks(g, viewW, 'face', gk, t, still, camX);
        g.restore();
      }
      drawWashLine(g, gk, t, still);
      if (fin) drawTapWater(g, fin.taps, t, still);
      // The door people: in the left door, cheering each glug; at the finish they walk in to the taps.
      const ft = f.finishT;
      const walking = fin !== null && fin.cheer;
      const xs = BH_DOOR_PEOPLE.map((_, i) => {
        const at = BH_DOOR_SPOTS[i]!;
        if (!walking) return at;
        const to = BH_CHEER_SPOTS[i]!;
        return still ? to : Math.min(to, at + (ft - f.data.finish.toast) * BH_LOOK.walkSpeed);
      });
      const cheering = walking || sinceHit < BH_LOOK.doorCheer;
      const people = s.people;
      if (people) {
        const list = xs.map((x, i) => {
          const moving = walking && x < BH_CHEER_SPOTS[i]!;
          const frame: FolkFrame = moving ? (`walk${Math.floor(ft / 0.15) % 4}` as FolkFrame) : cheering ? (still || Math.floor(clock / 0.25 + i) % 2 ? 'cheer0' : 'cheer1') : 'stand';
          return { look: i, frame, x, y: gy - 4, flip: false };
        });
        people.drawOwn(g, zv, camX, lift, BH_DOOR_PEOPLE, BH_DOOR_SCALE, list);
      }
      if (walking) drawWaterCan(g, xs[0]! + BH_CAN_X - BH_DOOR_SPOTS[0]!, gy - 3);
      else drawWaterCan(g, BH_CAN_X, gy - 3);
      drawWaterCart(g, walking ? xs[1]! + BH_CART_AHEAD : BH_CART_X, gy - 2, walking && !still ? ft * 4 : 0);
      // The water line and the valves: done ones tick and drip, the stuck one shakes with its tag;
      // KN-R14: shut tight it waits, still, tagged WAIT, until his whirl's dust runs along the pipe.
      drawBoreholeLine(g, fin ? 3 : hits, fin?.wave ?? 0, t, still);
      const loose = (f.steps - f.readyAt) / STEPS;
      if (!fin && !still && f.stuck >= 0 && loose >= 0 && loose <= BH_LOOK.pipeDust) drawPipeDust(g, f.data.valves.x[f.stuck]!, loose / BH_LOOK.pipeDust);
      f.data.valves.x.forEach((vx, i) => {
        const at = f.hitAt[i];
        const v = fin ? 'open' : f.valveState(i);
        drawValve(g, vx, v === 'shut' ? 'wait' : v, { time: clock, still, freed: at === undefined ? -1 : (f.steps - at) / STEPS, tag: v === 'shut', side: fit.tagLeft[i] ? 'left' : 'right' });
        const fx = vx - BH_HALL.springW / 2;
        drawClothFrame(g, fx, BH_HALL.springW, gy, { dip: clothDip(clock - (landed.get(fx) ?? -Infinity), still) });
      });
      drawRustyBorehole(g, BH_HALL.cx, gy, fin ? fin.rusty : rustyLook(f, clock, still));
      if (fin) drawSneezePuff(g, fin.puff);
      for (const z of f.whirls) {
        if (z.mode === 'puff') {
          const k = whirlPuffK(z.t / STEPS);
          if (k !== null) drawDustWhirl(g, z.x, gy, clock, { still, puff: k });
        } else drawDustWhirl(g, z.x, gy, clock, { still });
      }
      hero();
      drawBoreholeHallFront(g, camX, viewW, H);
      // His words: "hic!" after a hit, his finish words; the valve's "SQUEAK... GLUG!".
      const W = KANO_WORDS.hall;
      if (fin?.say) drawRustyWord(g, W.rusty[fin.say], BH_HALL.cx - 30, gy - 190);
      else if (sinceHit < BH_LOOK.word) drawRustyWord(g, W.rusty.hiccup, BH_HALL.cx - 30, gy - 190);
      if (!fin && sinceHit < BH_LOOK.word && last !== undefined) {
        const vx = f.data.valves.x[hits - 1]!;
        drawRustyWord(g, W.glug, vx - 6, f.data.valves.bottom + 36);
      }
      // The door people's cheer on each glug ("Yauwa!", then "Well done!").
      if (people && !fin && sinceHit < BH_LOOK.doorCheer && hits > 0) {
        people.say(g, zv, BH_DOOR_CHEERS[Math.min(BH_DOOR_CHEERS.length - 1, hits - 1)]!, xs[0]!, gy - 48, s.run.hero, lift);
      }
      // The hit counter: three valve wheels under the HUD row at the right, clear of the valves
      // high in the middle (never read as a fourth valve), each gets a tick.
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawValveCounter(g, fit.counter.x, fit.counter.y, fin ? 3 : hits);
      return true;
    },
  };
}
