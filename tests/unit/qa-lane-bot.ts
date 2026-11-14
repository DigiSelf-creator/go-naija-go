/**
 * qa: a simple human-like player for the lane run (docs/design.md S3f0 part 10 and 24 check 1).
 * It sees a thing in its lane once it is 1.5 s away, reacts after a human delay, times jumps and
 * slides by eye (with some error), and now and then makes a mistake: it freezes, picks the wrong
 * move or reacts late. Seeded, so a result can be played again.
 */
import { SIZE, isDodge, type ThingKind } from '../../src/lane/level';
import { HERO_DEPTH } from '../../src/lane/level';
import { LaneSim, seeded, type LaneMove } from '../../src/lane/sim';
import type { LaneLevel } from '../../src/lane/level';

export interface BotSkill {
  /** Chance of a mistake on each thing to dodge. */
  mistake: number;
  /** Reaction delay, mean and spread, seconds. */
  react: number;
  reactSd: number;
  /** Jump and slide timing error (spread), seconds. */
  timingSd: number;
  /** Chance to go for pickups and coins when it looks (every 0.3 s). */
  greed: number;
}

export interface TryResult {
  won: boolean;
  dist: number;
  stumbles: number;
  power: number;
  tech: number;
  kobo: number;
  gapAtGoal: number | null;
  /** Seconds from the start to the bus stop. */
  time: number;
}

interface Plan {
  at: number;
  move: LaneMove;
  /** The thing this answers (jump and slide are dropped if the hero is no longer in its lane). */
  lane: number;
  second?: LaneMove;
}

const DT = 1 / 60;

function gauss(r: () => number): number {
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function playOnce(level: LaneLevel, skill: BotSkill, seed: number, gentle = false, endlessTo = 0, log?: string[]): TryResult {
  const r = seeded(seed);
  const sim = new LaneSim(level, { gentle, rng: seeded(seed ^ 0x55) });
  const seen = new Set<string>();
  const plans: Plan[] = [];
  let t = 0;
  let stumbles = 0;
  let gapAtGoal: number | null = null;
  let goalTime = 0;
  let nextLook = 0;
  // "3, 2, 1" then the fresh 1.5 s, as in the game.
  sim.fresh(1.5);
  for (let i = 0; i < 60 * 600; i++) {
    t += DT;
    // Run the plans that are due.
    for (let p = plans.length - 1; p >= 0; p--) {
      const pl = plans[p]!;
      if (pl.at > t) continue;
      plans.splice(p, 1);
      if ((pl.move === 'jump' || pl.move === 'slide') && sim.lane !== pl.lane) continue;
      sim.press(pl.move);
      if (pl.second) plans.push({ at: t + 0.2 + Math.abs(gauss(r)) * 0.05, move: pl.second, lane: -1 });
    }
    sim.step(DT);
    for (const e of sim.events) {
      if (e.type === 'stumble') {
        stumbles++;
        log?.push(`seed ${seed} stumble on ${e.kind} at ${sim.dist.toFixed(1)} m lane ${sim.lane} speed ${sim.speed.toFixed(1)} chunks ${sim.chunksUsed.slice(-2).join(',')}`);
      }
      if (e.type === 'goal') {
        gapAtGoal = sim.gap;
        goalTime = sim.time;
      }
    }
    if (sim.phase === 'goal' && endlessTo > 0) {
      sim.keepRunning();
      sim.fresh(1.5);
    }
    if (endlessTo > 0 && sim.dist >= endlessTo) return { won: true, dist: sim.dist, stumbles, power: sim.power, tech: sim.tech, kobo: sim.kobo, gapAtGoal, time: sim.time };
    if (sim.phase === 'goal') return { won: true, dist: sim.dist, stumbles, power: sim.power, tech: sim.tech, kobo: sim.kobo, gapAtGoal, time: goalTime };
    if (sim.phase === 'over') return { won: false, dist: sim.dist, stumbles, power: sim.power, tech: sim.tech, kobo: sim.kobo, gapAtGoal, time: sim.time };
    // Like a real player: go for the bulbs, chips, food and coins coming up (and back to the middle).
    if (plans.length === 0 && !sim.changing && t >= nextLook) {
      nextLook = t + 0.3;
      const score = [0, 0.2, 0];
      for (const s of sim.things) if (s.used && s.pickup && s.state === 'idle' && s.d > sim.dist + 8 && s.d < sim.dist + 30) score[s.lane]! += 3;
      for (const c of sim.coins) if (c.used && !c.taken && c.d > sim.dist + 8 && c.d < sim.dist + 30) score[c.lane]! += 1;
      let best = sim.lane;
      for (let l = 0; l < 3; l++) if (score[l]! > score[best]! + 0.5) best = l;
      if (best !== sim.lane && r() < skill.greed) plans.push({ at: t + Math.max(0.2, skill.react + gauss(r) * skill.reactSd), move: best < sim.lane ? 'left' : 'right', lane: -1 });
    }
    // Look at what is coming in the lane the hero is in (or moving to).
    const lane = sim.lane;
    for (const s of sim.things) {
      if (!s.used || s.pickup || s.state !== 'idle' || s.lane !== lane) continue;
      const kind = s.kind as ThingKind;
      if (!isDodge(kind)) continue;
      const front = s.d - SIZE[kind].len / 2 - HERO_DEPTH / 2;
      if (front <= sim.dist) continue;
      const arrive = (front - sim.dist) / Math.max(1, sim.speed);
      if (arrive > 1.5) continue;
      const key = `${s.d}:${s.lane}:${kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let react = Math.max(0.2, skill.react + gauss(r) * skill.reactSd);
      // What a careful player does.
      let move: LaneMove;
      let second: LaneMove | undefined;
      if (kind === 'danfo') {
        // The nearest lane with no dodge thing in this row.
        const row = sim.things.filter((x) => x.used && !x.pickup && x.state === 'idle' && isDodge(x.kind as ThingKind) && Math.abs(x.d - s.d) < 3);
        const free = [0, 1, 2].filter((l) => !row.some((x) => x.lane === l));
        free.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || r() - 0.5);
        const to = free[0] ?? (lane === 1 ? 0 : 1);
        move = to < lane ? 'left' : 'right';
        if (Math.abs(to - lane) === 2) second = move;
      } else move = kind === 'barrier' ? 'slide' : 'jump';
      let at = t + react;
      if (move === 'jump' || move === 'slide') {
        // Timed by eye: feet highest (or body lowest) as the thing arrives.
        const want = t + arrive - (move === 'jump' ? 0.3 : 0.25) + gauss(r) * skill.timingSd;
        at = Math.max(at, want);
      }
      // Mistakes.
      if (r() < skill.mistake) {
        const k = r();
        if (k < 0.4) continue; // froze
        if (k < 0.7) {
          // the wrong move
          move = move === 'jump' ? 'slide' : move === 'slide' ? 'jump' : 'jump';
          second = undefined;
        } else at += 0.5; // late
      }
      plans.push({ at, move, lane, ...(second ? { second } : {}) });
      react = 0;
    }
  }
  return { won: false, dist: sim.dist, stumbles, power: sim.power, tech: sim.tech, kobo: sim.kobo, gapAtGoal, time: sim.time };
}

/** A first-timer's tries: each try a little better (mistakes times `learn`). */
export function firstTimer(level: LaneLevel, skill: BotSkill, seed: number, tries = 3, learn = 0.7, gentle = false): { reachedOn: number | null; results: TryResult[] } {
  const results: TryResult[] = [];
  for (let k = 0; k < tries; k++) {
    const s = { ...skill, mistake: skill.mistake * Math.pow(learn, k) };
    const res = playOnce(level, s, seed * 7919 + k * 104729, gentle);
    results.push(res);
    if (res.won) return { reachedOn: k + 1, results };
  }
  return { reachedOn: null, results };
}
