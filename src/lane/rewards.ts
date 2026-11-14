/**
 * S3f3: what a lane run brings home (docs/design.md S3f0 parts 2, 9, 14 and 20). Pure, so the
 * money sums are unit tested. Lives in the main bundle (main.ts pays the city with it), so keep it
 * small and free of the lane run's own code.
 */
import { formatMoney } from '../game/money';

/** The `lane` part of gidi-progress (part 20). */
export const KEY_LANE = 'lane';

/**
 * LR-Q2 (open for Tp, built on the recommended answer a): one run may pay for both fixes; the
 * other pin then shows Ready and one hint points to it. Answer b turns the hint off here (and
 * designer lowers Tech in lagos-lane.json).
 */
export const ONE_RUN_BOTH_FIXES = true;

export interface LaneSave {
  /** Best distance, whole metres. */
  best: number;
  goals: number;
  runs: number;
  /** Hints seen (passed), by key. */
  hints: string[];
}

export interface Haul {
  /** Whole kobo. */
  kobo: number;
  power: number;
  tech: number;
}

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** A missing or broken part starts at zeros and never touches the rest of the save. */
export function readLane(v: unknown): LaneSave {
  const o = typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const hints = Array.isArray(o['hints']) ? o['hints'].filter((h): h is string => typeof h === 'string') : [];
  return { best: count(o['best']), goals: count(o['goals']), runs: count(o['runs']), hints: [...new Set(hints)] };
}

export function writeLane(s: LaneSave): Record<string, unknown> {
  return { best: s.best, goals: s.goals, runs: s.runs, hints: [...s.hints] };
}

export const addHaul = (a: Haul, b: Haul): Haul => ({ kobo: a.kobo + b.kobo, power: a.power + b.power, tech: a.tech + b.tech });
export const subHaul = (a: Haul, b: Haul): Haul => ({ kobo: a.kobo - b.kobo, power: a.power - b.power, tech: a.tech - b.tech });
export const NO_HAUL: Readonly<Haul> = { kobo: 0, power: 0, tech: 0 };

/**
 * The win prize (part 9), grown by the decision 45 top-up when the run was for a fix: the run
 * plus the prize brings home at least what is left to pay on that fix.
 */
export function lanePrize(run: Haul, prize: Haul, fix: { bucket: 'power' | 'tech'; left: number } | null): Haul {
  const out = { ...prize };
  if (fix) out[fix.bucket] = Math.max(prize[fix.bucket], fix.left - run[fix.bucket]);
  return out;
}

/** "₦6.20, Power 12 and Tech 7" (a bucket with 0 is left out; money stays when all are 0). */
export function haulWords(h: Haul): string {
  const parts: string[] = [];
  if (h.kobo > 0) parts.push(formatMoney(h.kobo));
  if (h.power > 0) parts.push(`Power ${h.power}`);
  if (h.tech > 0) parts.push(`Tech ${h.tech}`);
  if (parts.length === 0) parts.push(formatMoney(0));
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
