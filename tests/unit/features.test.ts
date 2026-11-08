/**
 * Pieces in the level data before their rules exist (src/game/features.ts). Crates come in J2:
 * until then street 1 draws no crate and never shows a hint about crates, but the crate data
 * stays in lagos-1.json, and switching crates on brings both back.
 */
import { afterEach, describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import { fitView } from '../../src/engine/view';
import { FEATURES } from '../../src/game/features';
import { Game } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { Run, type RunEvent } from '../../src/game/run';
import { recorder } from './recorder';

const DT = 1 / 60;
const L1 = parseLevel(structuredClone(lagos1));
const CRATE_WORDS = /crate/i;

afterEach(() => {
  FEATURES.crates = false;
});

/** Every hint shown while the hero is carried along the street from x0 to x1. */
function hintsAlong(x0: number, x1: number): string[] {
  const run = new Run(L1);
  const words: string[] = [];
  for (let x = x0; x <= x1; x += 20) {
    Object.assign(run.hero, { x, y: L1.groundY, vy: 0 });
    for (const e of run.step(DT) as RunEvent[]) if (e.type === 'hint') words.push(e.words);
  }
  return words;
}

/** Calls that draw a crate's body (32 by 28, see drawCratePlaceholder) near this x. */
function crateDrawsAt(x: number): number {
  const game = new Game(L1);
  game.begin(false);
  Object.assign(game.hero, { x });
  (game as unknown as { snapCamera(): void }).snapCamera();
  const r = recorder();
  game.render(r.g, fitView(851, 393, 1));
  return r.calls.filter((c) => c.name === 'fillRect' && c.args[2] === 32 && c.args[3] === 28).length;
}

describe('crates switch (off until J2)', () => {
  it('is off now', () => {
    expect(FEATURES.crates).toBe(false);
  });

  it('keeps the crate data and tags the two crate hints in lagos-1, and the roof crate hint in lagos-2', () => {
    expect(L1.crates.map((c) => c.x)).toEqual([2000, 2150, 6500, 7670]);
    const tagged = L1.hints.filter((h) => h.needs === 'crates');
    expect(tagged.map((h) => h.x)).toEqual([1880, 6380]);
    // Every hint that talks about crates is tagged, so none can slip through.
    for (const h of L1.hints) expect(h.needs === 'crates', h.words).toBe(CRATE_WORDS.test(h.words));
    const L2 = parseLevel(structuredClone(lagos2));
    for (const h of L2.hints) expect(h.needs === 'crates', h.words).toBe(CRATE_WORDS.test(h.words));
  });

  it('rejects a hint tagged with a piece that does not exist', () => {
    const bad = structuredClone(lagos1) as Record<string, unknown>;
    bad['hints'] = [[100, 'Hello', 'rockets']];
    expect(() => parseLevel(bad)).toThrow('Level lagos-1: hints[0][2] should be one of crates');
    bad['hints'] = [[100, 'Hello', 'crates', 'more']];
    expect(() => parseLevel(bad)).toThrow('Level lagos-1: hints[0] should have 2 items');
  });

  it('off: no crate hint along the whole street, the other hints still show', () => {
    const words = hintsAlong(L1.spawnX, 10500);
    expect(words.filter((w) => CRATE_WORDS.test(w))).toEqual([]);
    expect(words).toContain('Pothole! Jump over it.');
    expect(words).toHaveLength(L1.hints.length - 2);
  });

  it('on: both crate hints show again', () => {
    FEATURES.crates = true;
    const words = hintsAlong(L1.spawnX, 10500);
    expect(words.filter((w) => CRATE_WORDS.test(w))).toHaveLength(2);
    expect(words).toHaveLength(L1.hints.length);
  });

  it('off: no crate is drawn; on: the crates over the road are drawn', () => {
    expect(crateDrawsAt(2000)).toBe(0);
    FEATURES.crates = true;
    expect(crateDrawsAt(2000)).toBe(2); // 2000 and 2150 are both on screen
  });
});
