/**
 * qa MS4 (docs/missions.md part 8 check 2): star 1 of every one of the ten quick missions is won
 * on one gentle go by a sloppy first-timer bot. The street bot is the S2.16 sloppy bot (every
 * press and release up to 100 ms late, seeded), in Gentle mode, never dashing; on top it does
 * only what the mission's card asks a child to do, the first time it can:
 * - Goat friends: a fufu ball thrown when a goat is ahead on the road.
 * - Fill the potholes: a fufu ball thrown when a pothole or an opened crack is just ahead.
 * - Secret wells and Garri for the mill: "Go down" tapped at the well the street shows; in the
 *   room, a held jump under the parcel on the middle shelf, a walk to the rope, then "Go up".
 * The lane run uses qa's human-like lane bot (40 percent mistakes, 0.6 s reactions) with little
 * greed for pickups, in Gentle mode, one go. Each mission must give star 1 in at least 7 of 8
 * seeds (a 5 year old's star 1 must be easy); the counts are printed for the report.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosLane from '../../src/data/levels/lagos-lane.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import ogun1 from '../../src/data/levels/ogun-1.json';
import ogun2 from '../../src/data/levels/ogun-2.json';
import ogun3 from '../../src/data/levels/ogun-3.json';
import ogunLane from '../../src/data/levels/ogun-lane.json';
import ogunWell from '../../src/data/levels/ogun-well.json';
import { FEATURES } from '../../src/game/features';
import { FUFU_RULES } from '../../src/game/fufu';
import { parseLevel, type Level } from '../../src/game/level';
import { LANE, type MissionDef } from '../../src/game/missions';
import { Run, type RunEvent } from '../../src/game/run';
import { parseRoom } from '../../src/game/well';
import { parseLane } from '../../src/lane/level';
import { lagosMissions, withCoins } from '../../src/screens/missions';
import { OGUN_MISSIONS } from '../../src/worlds/ogun/missions';
import { playOnce } from './qa-lane-bot';

const DT = 1 / 60;
const LEVELS: Record<string, Level> = Object.fromEntries(
  [lagos1, lagos2, lagos3, ogun1, ogun2, ogun3].map((d) => {
    const l = parseLevel(structuredClone(d));
    return [l.id, l];
  }),
);
const ROOMS = new Map([lagosWell, ogunWell].map((r) => {
  const room = parseRoom(structuredClone(r));
  return [room.id, room] as const;
}));
const coinsAt = (state: string) => (n: number) => LEVELS[`${state}-${n}`]!.coins.length;
const ALL: MissionDef[] = [...withCoins(lagosMissions(), coinsAt('lagos')), ...withCoins(OGUN_MISSIONS, coinsAt('ogun'))];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface Go {
  coins: number;
  foods: Set<string>;
  goats: number;
  plugs: number;
  crumbles: number;
  wells: number;
  garri: boolean;
  phase: string;
  lives: number;
}

/** The room: a jump under the parcel on the middle shelf, then the rope, Go up. */
function playRoom(run: Run, ev: RunEvent[]): void {
  // Way points: under the parcel, a held jump up through the shelf to it, then to the rope.
  const plan: [number, boolean][] = [[285, false], [285, true], [500, false]];
  let k = 0;
  let holding = 0;
  for (let i = 0; i < 60 * 40 && run.phase !== 'run'; i++) {
    const h = run.hero;
    if (run.phase === 'room') {
      if (run.parcel && k < 2) k = 2;
      if (k < plan.length) {
        const [x, jump] = plan[k]!;
        if (jump && h.grounded && holding === 0 && Math.abs(h.x - plan[k - 1]![0]) < 12) {
          run.press();
          holding = 24;
        }
        run.steer(h.x < x - 4 ? 1 : h.x > x + 4 ? -1 : 0);
        if (Math.abs(h.x - x) <= 4 && h.grounded) k++;
      } else {
        run.steer(0);
        if (run.underRope) run.goUp();
      }
      if (holding > 0 && --holding === 0) run.release();
    }
    ev.push(...run.step(DT));
  }
}

function streetGo(level: Level, d: MissionDef, seed: number): Go {
  const run = new Run(level, { gentle: true, dash: true, rooms: ROOMS });
  const rand = rng(seed);
  const late = (): number => Math.floor(rand() * 7);
  const go: Go = { coins: 0, foods: new Set(), goats: 0, plugs: 0, crumbles: 0, wells: 0, garri: false, phase: '', lives: 0 };
  const wellWanted = d.goal === 'wells' || d.goal === 'garri';
  let holding = false;
  let second = false;
  let pressIn = -1;
  let releaseIn = -1;
  run.steer(1);
  for (let i = 0; i < 60 * 400 && run.phase !== 'bus' && run.phase !== 'over' && run.phase !== 'cleared'; i++) {
    const h = run.hero;
    run.viewLeft = h.x - 747 * 0.3;
    run.viewRight = run.viewLeft + 747;
    const ev: RunEvent[] = [];
    if (run.phase === 'run' && wellWanted && go.wells === 0 && run.wellHere && !holding) {
      if (run.goDown()) {
        for (let j = 0; j < 60 * 5 && (run.phase as string) !== 'room'; j++) ev.push(...run.step(DT));
        playRoom(run, ev);
        holding = false;
        pressIn = releaseIn = -1;
      }
    }
    const g = run.terrain.ground;
    const gaps = g.slice(1).map((s, k) => [g[k]!.x1, s.x0] as const);
    if (pressIn === 0) {
      run.press();
      holding = true;
    }
    if (releaseIn === 0) {
      run.release();
      holding = false;
      if (second && !h.grounded) {
        pressIn = late();
        second = false;
        if (pressIn === 0) {
          run.press();
          holding = true;
        }
      }
    }
    if (pressIn >= 0) pressIn--;
    if (releaseIn >= 0) releaseIn--;
    if (holding && releaseIn < 0 && (h.vy >= 0 || h.grounded)) releaseIn = late();
    else if (!holding && pressIn < 0 && releaseIn < 0 && h.grounded) {
      const big = gaps.find(([a, b]) => b - a >= 160 && a - h.x > -4 && a - h.x < 10 + h.speed * 0.03);
      const gap = big ?? gaps.find(([a, b]) => b - a < 160 && a - h.x > -4 && a - h.x < 32);
      const hazard = run.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 0 && z.x - h.x < 80);
      const weeds = run.gutters.find((q) => q.state === 'weeds' && q.x - h.x > 0 && q.x - h.x < 30);
      if (gap || hazard || weeds) {
        pressIn = late();
        second = !!gap && gap[1] - gap[0] > 90;
      }
    }
    // What the card asks: a ball for a goat ahead, or for a pothole or opened crack just ahead.
    if (run.phase === 'run' && run.fufu > 0) {
      if (d.goal === 'goats' && run.hazards.some((z) => z.kind === 'goat' && (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 60 && z.x - h.x < 260)) run.throwFufu();
      if (d.goal === 'potholes') {
        const pit = gaps.some(([a, b]) => b - a >= FUFU_RULES.plugMin && b - a <= FUFU_RULES.plugMax && a - h.x > 50 && a - h.x < 140);
        const crack = run.cracks.some((c) => c.state === 'open' && c.x - h.x > 50 && c.x - h.x < 140);
        if (pit || crack) run.throwFufu();
      }
    }
    ev.push(...run.step(DT));
    for (const e of ev) {
      if (e.type === 'food') go.foods.add(e.kind);
      else if (e.type === 'goatEat') go.goats++;
      else if (e.type === 'fufuPlug') go.plugs++;
      else if (e.type === 'crumble') go.crumbles++;
      else if (e.type === 'room') go.wells++;
      else if (e.type === 'busBoard' && run.parcel) go.garri = true;
    }
    run.steer(1);
  }
  go.coins = run.kobo;
  go.phase = run.phase;
  go.lives = run.lives;
  return go;
}

/** The count star 1 asks for, from one go. */
function have(d: MissionDef, g: Go): number {
  switch (d.goal) {
    case 'coins': return g.coins;
    case 'foods': return d.foods!.filter((f) => g.foods.has(f)).length;
    case 'goats': return g.goats;
    case 'wells': return g.wells > 0 ? 1 : 0;
    case 'potholes': return g.plugs;
    case 'garri': return g.garri ? 1 : 0;
    case 'gravel': return g.crumbles;
    default: return 0;
  }
}

const LANES = { lagos: parseLane(lagosLane), ogun: parseLane(ogunLane) };
/** A sloppy 5 year old: many mistakes, slow, rarely goes for a pickup. */
const CHILD = { mistake: 0.4, react: 0.6, reactSd: 0.15, timingSd: 0.1, greed: 0.3 };

describe('qa MS4: star 1 of every mission on one gentle go by a sloppy first-timer', () => {
  const was = FEATURES.wells;
  it.each(ALL.map((d) => [d.id, d] as const))('%s', (_id, d) => {
    FEATURES.wells = true;
    const lines: string[] = [];
    let ok = 0;
    for (const seed of SEEDS) {
      let n: number;
      let note: string;
      if (d.at[0] === LANE) {
        const r = playOnce(LANES[d.state as 'lagos' | 'ogun'], CHILD, seed, true);
        n = d.goal === 'bulbs' ? r.power : r.tech;
        note = `${r.won ? 'bus stop' : 'caught'} at ${r.dist.toFixed(0)} m`;
      } else {
        // Per place missions: the first street on the card (Play goes there first).
        const g = streetGo(LEVELS[`${d.state}-${d.at[0]}`]!, d, seed);
        n = have(d, g);
        note = `${g.phase}, lives ${g.lives}, coins ${g.coins}, wells ${g.wells}, foods ${[...g.foods].join("+")}`;
      }
      if (n >= d.stars[0]!) ok++;
      lines.push(`seed ${seed}: ${n} (star 1 at ${d.stars[0]}) ${note}`);
    }
    FEATURES.wells = was;
    console.log(`${d.id}: star 1 in ${ok} of ${SEEDS.length}\n${lines.join('\n')}`);
    expect(ok, lines.join('\n')).toBeGreaterThanOrEqual(7);
  }, 60_000);
});
