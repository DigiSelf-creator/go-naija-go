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
  drawBoreholeHall,
  drawBoreholeHallFront,
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
      const { camX, viewW, H, clock, still } = s;
      const gy = BH_HALL.floorY;
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
        people.drawOwn(g, view, camX, H - view.height, BH_DOOR_PEOPLE, BH_DOOR_SCALE, list);
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
        drawValve(g, vx, v === 'shut' ? 'wait' : v, { time: clock, still, freed: at === undefined ? -1 : (f.steps - at) / STEPS, tag: v === 'shut' });
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
        people.say(g, view, BH_DOOR_CHEERS[Math.min(BH_DOOR_CHEERS.length - 1, hits - 1)]!, xs[0]!, gy - 48, s.run.hero, H - view.height);
      }
      // The hit counter: three valve wheels under the HUD row at the right, clear of the valves
      // high in the middle (never read as a fourth valve), each gets a tick.
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawValveCounter(g, view.width - 48 - view.safe.right, 66 + view.safe.top, fin ? 3 : hits);
      return true;
    },
  };
}
