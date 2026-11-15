/**
 * docs/city.md W18 (decision 71): the tray money is explained as tax. Only the words change: the
 * exact lines, their capitals, the spoken forms, the one-time explanation, the gallery samples,
 * the rules for tax words, and the money numbers staying as they were.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUBBLE, BUBBLE_COMPACT, trayBubbleBox, trayWords } from '../../src/art/payspot';
import { BOOM_COLLECT, PLACES, TRAY_MIN, collectTray, emptyCity, withHint } from '../../src/game/city';
import { formatMoney, spokenMoney } from '../../src/game/money';
import { TAX_HINT } from '../../src/screens/city';
import { WORDS } from '../../src/screens/words';

const w = WORDS.city;
const name = (p: keyof typeof PLACES) => PLACES[p].name;

describe('W18 words, exact', () => {
  it('the tray bubble: "Tax " before the bare amount; trayWords stays the bare amount', () => {
    expect(trayWords(80)).toBe('80 kobo');
    expect(trayWords(120)).toBe('₦1.20');
    expect(w.trayLabel(trayWords(80))).toBe('Tax 80 kobo');
    expect(w.trayLabel(trayWords(120))).toBe('Tax ₦1.20');
    expect(w.trayLabel(trayWords(150))).toBe('Tax ₦1.50');
    expect(w.trayLabel(trayWords(80))).toHaveLength(11);
    expect(w.trayLabel(trayWords(120))).toHaveLength(9);
  });

  it('the bubble, spoken: "Tax from Mama Put: 1 naira 20 kobo. Full." (the market lower case mid-line)', () => {
    expect(w.traySpoken(name('buka'), spokenMoney(120), true)).toBe('Tax from Mama Put: 1 naira 20 kobo. Full.');
    expect(w.traySpoken(name('buka'), spokenMoney(120), false)).toBe('Tax from Mama Put: 1 naira 20 kobo.');
    expect(w.traySpoken(name('market'), spokenMoney(240), false)).toBe('Tax from the market: 2 naira 40 kobo.');
  });

  it('the collect line starts with a capital: "Mama Put paid ₦1.20 tax!", "The market paid ₦2.40 tax!"', () => {
    expect(w.collectLine(formatMoney(120), name('buka'))).toBe('Mama Put paid ₦1.20 tax!');
    expect(w.collectLine(formatMoney(240), name('market'))).toBe('The market paid ₦2.40 tax!');
    expect(w.collectLine(formatMoney(120), name('buka'))).toHaveLength(24);
    expect(w.collectLine(formatMoney(240), name('market'))).toHaveLength(26);
  });

  it('the collect, spoken, in money words then the Naira chip', () => {
    expect(w.collectSpoken(spokenMoney(120), name('buka'))).toBe('Mama Put paid 1 naira 20 kobo tax.');
    expect(w.collectSpoken(spokenMoney(240), name('market'))).toBe('The market paid 2 naira 40 kobo tax.');
    expect(`${w.collectSpoken(spokenMoney(120), name('buka'))} ${w.spokenNaira(spokenMoney(600))}.`).toBe('Mama Put paid 1 naira 20 kobo tax. Naira: 6 naira.');
  });

  it('the first hint and the one-time explanation', () => {
    expect(w.hintCollect).toBe('Mama Put pays a small tax! Walk over to collect it.');
    expect(w.hintCollect).toHaveLength(51);
    expect(w.hintTax).toBe('Busy shops pay a small tax. Lagos uses it to fix more.');
    expect(w.hintTax).toHaveLength(54);
  });

  it('the lines W18 keeps stay as they are', () => {
    expect(w.builtLine.mamaPut).toBe('Mama Put is open! Food for the queue.');
    expect(w.builtLine.market).toBe('The market is open! Danfos come for goods.');
    expect(w.mission.line.mamaPut).toBe('Mama Put is open here.');
    expect(w.mission.line.market).toBe('The market is open here.');
    expect(w.earnRun).toBe('Run Alausa to earn more.');
    expect(w.stepLine).toBe('Lagos is getting brighter!');
  });
});

describe('W18 rules for tax words', () => {
  const src = readFileSync(new URL('../../src/screens/words.ts', import.meta.url), 'utf8');
  const gallery = readFileSync(new URL('../../src/art/galleryWalk.ts', import.meta.url), 'utf8');
  const taxLines = [w.trayLabel('₦1.20'), w.traySpoken('Mama Put', '1 naira', true), w.collectLine('₦1', 'the suya spot'), w.collectSpoken('1 naira', 'Mama Put'), w.hintCollect, w.hintTax];

  it('the old lines are gone from words.ts and the gallery', () => {
    // qa's search words; "Tax from Mama Put: ..." (the new spoken bubble) is the one allowed match,
    // and the garri shield line's "for you" is not a city line.
    const city = src.slice(src.indexOf('  city: {'), src.indexOf('    mission: {'));
    expect(city.length).toBeGreaterThan(500);
    for (const old of ['made money', 'for you', 'from Mama Put', 'from the market']) {
      expect(city.split('Tax from Mama Put').join('').split('Tax from ${name}').join(''), old).not.toContain(old);
      expect(gallery, old).not.toContain(old);
    }
    expect(src).not.toMatch(/\+\$\{money\} from|has \$\{money\} for you/);
  });

  it('the gallery samples use the new words', () => {
    expect(gallery).toContain('Mama Put paid ₦1.20 tax!');
    expect(gallery).toContain('The market paid ₦2.40 tax!');
    expect(gallery).toContain('`Tax ${trayWords(');
  });

  it('warm, never heavy: no "must pay", "owe", "fine", "debt", "or else", rates, percentages or VAT', () => {
    for (const line of taxLines) {
      expect(line).not.toMatch(/must pay|\bowe|\bfine\b|debt|or else|penalty|late|%|\bVAT\b|rate/i);
      expect(line).toMatch(/tax/i);
    }
  });

  it('a later place uses the same words with its own name', () => {
    expect(w.collectLine(formatMoney(100), 'the suya spot')).toBe('The suya spot paid ₦1 tax!');
  });
});

describe('W18 shown once, timing, money unchanged', () => {
  it('the explanation stays at least 4 s and goes by 8 s', () => {
    expect(TAX_HINT).toEqual({ min: 4, max: 8 });
  });

  it('saved once under the hint id "tax"', () => {
    const once = withHint(emptyCity(), 'tax');
    expect(once.hints).toEqual(['tax']);
    expect(withHint(once, 'tax')).toBe(once);
  });

  it('the money numbers do not change: rates, caps, the collect amount and its Booming point', () => {
    expect(PLACES.buka).toMatchObject({ every: 6, each: 10, cap: 150 });
    expect(PLACES.market).toMatchObject({ every: 15, each: 30, cap: 240 });
    expect(TRAY_MIN).toBe(10);
    const c = { ...emptyCity(), kobo: 450, built: ['buka' as const], trays: { buka: 150 }, boom: 8 };
    const r = collectTray(c, 'buka')!;
    expect(r).toMatchObject({ amount: 150, full: true });
    expect(r.next.kobo).toBe(600);
    expect(r.next.trays.buka).toBe(0);
    expect(r.next.boom).toBe(8 + BOOM_COLLECT);
  });

  it('the bubble grows by about the width of "Tax "; the tighter one for the smallest screens takes less', () => {
    // A measuring stand-in: 0.6 of the font size for each letter (the bubble's own fallback).
    const g = { save() {}, restore() {}, font: '' } as unknown as CanvasRenderingContext2D;
    const bare = trayBubbleBox(g, 0, 0, '₦1.50', true).w;
    const tax = trayBubbleBox(g, 0, 0, 'Tax ₦1.50', true).w;
    const tight = trayBubbleBox(g, 0, 0, 'Tax ₦1.50', true, true);
    expect(tax - bare).toBeGreaterThanOrEqual(20);
    expect(tax - bare).toBeLessThanOrEqual(35);
    expect(tight.w).toBeLessThan(tax);
    expect(Math.min(tight.w, tight.h)).toBeGreaterThanOrEqual(48);
    expect(BUBBLE_COMPACT.text).toBeGreaterThanOrEqual(11);
  });

  it('the bubble keeps its width cap and tap height', () => {
    expect(BUBBLE.maxW).toBe(120);
    expect(BUBBLE.minW).toBeGreaterThanOrEqual(48);
  });
});
