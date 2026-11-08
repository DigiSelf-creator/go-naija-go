/**
 * The hint bar (docs/design.md S2.2, "The hint bar"): where it goes on the screens qa tests,
 * the short toast words for narrow bars, and every level hint 35 characters or fewer.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import { parseLevel } from '../../src/game/level';
import { buttonLayout, hintBarBox, type ButtonsShown } from '../../src/screens/controls';
import { NARROW_BAR, SHORT_AT, SHORT_TOAST, WORDS, barWords, hintWords } from '../../src/screens/words';

const NO_SAFE = { top: 0, right: 0, bottom: 0, left: 0 };

describe('hint bar place (S2.2 table, CSS px, rounded)', () => {
  // [w, h, home bar, buttons, x0, x1, top, bottom, size]
  const rows: [number, number, number, ButtonsShown, number, number, number, number, string][] = [
    [320, 240, 0, 'all', 140, 218, 178, 236, 'small'],
    [640, 200, 0, 'all', 140, 538, 138, 196, 'small'],
    [568, 230, 0, 'all', 140, 466, 169, 226, 'small'],
    [480, 270, 0, 'all', 158, 364, 201, 266, 'small'],
    [568, 320, 0, 'all', 186, 432, 238, 312, 'mid'],
    [667, 375, 0, 'all', 188, 529, 279, 367, 'mid'],
    [851, 393, 21, 'all', 210, 690, 292, 372, 'mid'],
    [1024, 768, 0, 'all', 297, 777, 571, 760, 'big'],
    [1280, 720, 0, 'none', 400, 880, 535, 712, 'big'],
  ];
  for (const [w, h, home, shown, x0, x1, top, bottom, size] of rows) {
    it(`${w}x${h}${home ? `, home bar ${home}` : ''}${shown === 'none' ? ', keys only' : ''}`, () => {
      const safe = { ...NO_SAFE, bottom: home };
      const b = hintBarBox(w, h, safe, buttonLayout(w, h, safe), shown);
      // The design table rounds to whole px (a 118.5 px Jump, a centre at .5): within 1 px.
      expect(Math.abs(b.x - x0)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.x + b.w - x1)).toBeLessThanOrEqual(1);
      expect(Math.round(b.top)).toBe(top);
      expect(Math.round(b.bottom)).toBe(bottom);
      expect(b.size).toBe(size);
      expect(b.w).toBeLessThanOrEqual(480);
    });
  }

  it('never over a button: right of Forward and left of Jump, 6 px clear, below the road line', () => {
    for (const [w, h] of [[320, 240], [568, 230], [640, 200], [667, 375], [851, 393], [932, 430]] as const) {
      const l = buttonLayout(w, h);
      const b = hintBarBox(w, h, NO_SAFE, l, 'all');
      expect(b.x).toBeGreaterThanOrEqual(l.forward.x + l.forward.w + 6);
      expect(b.x + b.w).toBeLessThanOrEqual(l.jump.x - 6);
      expect(b.bottom).toBeGreaterThan(b.top);
      // Its top is world y 312 or lower.
      const perPx = Math.max(420 / h, 480 / w);
      expect(b.top * perPx + l.lift).toBeGreaterThanOrEqual(312 - 1e-9);
    }
  });

  it('the slice 1 boss fight (Jump only) keeps the bar clear of Jump and centred', () => {
    const l = buttonLayout(667, 375);
    const b = hintBarBox(667, 375, NO_SAFE, l, 'jump');
    expect(b.x + b.w).toBeLessThanOrEqual(l.jump.x - 6);
    expect(b.x + b.w / 2).toBeCloseTo(667 / 2, 6);
  });
});

describe('hint bar words', () => {
  it('every toast longer than 35 characters has short words of 35 or fewer', () => {
    const toasts = [WORDS.toast.corn, WORDS.toast.garri, WORDS.toast.amala, WORDS.toast.cornWearingOff, WORDS.toast.amalaWearingOff, WORDS.toast.shieldUsed, WORDS.toast.greenLight(2),
      // S2.7 Go-Slow Hall (piece M2)
      WORDS.toast.hallStart, WORDS.toast.parcelShield, WORDS.toast.highHonks, WORDS.toast.hallClear, WORDS.toast.switchedOn, WORDS.toast.greenLight(1)];
    for (const t of toasts) {
      if (t.length <= SHORT_AT) continue;
      expect(SHORT_TOAST[t], t).toBeDefined();
    }
    for (const short of Object.values(SHORT_TOAST)) expect(short.length, short).toBeLessThanOrEqual(SHORT_AT);
  });

  it('short words only on a bar under 160 px wide', () => {
    expect(barWords(WORDS.toast.corn, NARROW_BAR - 1)).toBe('Roasted corn! You run faster!');
    expect(barWords(WORDS.toast.corn, NARROW_BAR)).toBe(WORDS.toast.corn);
    expect(barWords('Pothole! Jump over it.', 78)).toBe('Pothole! Jump over it.');
  });

  it('every level hint is 35 characters or fewer with the markers filled in, touch and keys', () => {
    // Read from the files as written (the hall and well rooms are not playable levels yet).
    let n = 0;
    for (const data of [lagos1, lagos2, lagos3, lagosHall, lagosWell] as { id: string; hints?: unknown[][] }[]) {
      for (const [x, raw] of data.hints ?? []) {
        for (const kind of ['touch', 'keys'] as const) {
          const words = hintWords(String(raw), kind);
          expect(words.length, `${data.id} x ${String(x)}: "${words}"`).toBeLessThanOrEqual(35);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(30);
  });

  it('the new hint words, as designer wrote them', () => {
    const l1 = parseLevel(lagos1);
    const touch = l1.hints.map((h) => hintWords(h.words, 'touch'));
    expect(touch).toContain('Hold → to walk. Hold on to run.');
    expect(touch).toContain('In the air, press Jump again.');
    expect(l1.hints.map((h) => hintWords(h.words, 'keys'))).toContain('Wider pothole! Hold Space.');
    const l2 = parseLevel(lagos2);
    expect(l2.hints.map((h) => hintWords(h.words, 'keys'))).toContain('A well! Stand by it. Press ↓.');
    expect(l2.hints.map((h) => hintWords(h.words, 'touch'))).toContain('A well! Stand by it. Press Go down.');
  });
});
