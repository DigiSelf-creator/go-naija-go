/**
 * po M4 bug 1: the cards that open in a run fit short screens (320 x 240, 480 x 200, 640 x 200)
 * with no scrolling, the small buttons in one row, every button at least 44 px tall.
 */
import { expect, type Page } from '@playwright/test';

export const SHORT_SIZES = [
  { width: 320, height: 240 },
  { width: 480, height: 200 },
  { width: 640, height: 200 },
] as const;

/**
 * style.md 1.2 rule 4: no button's words are under 15 px, short screens included. Returns every
 * shown text in a shown button under `sel` with its font size (CSS px); `skip` leaves out buttons
 * (by selector) that a note keeps smaller on purpose.
 */
export async function buttonWordSizes(page: Page, sel: string, skip = ''): Promise<{ text: string; px: number }[]> {
  return page.evaluate(
    ({ sel, skip }) => {
      const out: { text: string; px: number }[] = [];
      for (const root of document.querySelectorAll(sel)) {
        if (root.getClientRects().length === 0) continue;
        for (const b of root.querySelectorAll('button')) {
          if (b.getClientRects().length === 0 || (skip && b.matches(skip))) continue;
          const walk = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const text = (n.textContent ?? '').trim();
            const el = n.parentElement!;
            if (!text || el.getClientRects().length === 0 || getComputedStyle(el).visibility === 'hidden') continue;
            out.push({ text, px: parseFloat(getComputedStyle(el).fontSize) });
          }
          // Words drawn by CSS (a switch's "(off)" / "(on)") are button words too.
          const after = getComputedStyle(b, '::after');
          if (after.content && after.content !== 'none' && after.content !== 'normal') out.push({ text: `${(b.textContent ?? '').trim()} ::after`, px: parseFloat(after.fontSize) });
        }
      }
      return out;
    },
    { sel, skip },
  );
}

/** Fails on any button words under 15 px under `sel` (style.md 1.2 rule 4). */
export async function expectButtonWords15(page: Page, sel: string, at: string, skip = ''): Promise<void> {
  const sizes = await buttonWordSizes(page, sel, skip);
  expect(sizes.length, `${at}: some button words found`).toBeGreaterThan(0);
  expect(sizes.filter((s) => s.px < 14.95).map((s) => `"${s.text}" ${s.px}px`), `${at}: button words at least 15 px`).toEqual([]);
}

/** Lays out the card now showing and returns what a check needs (CSS px). */
export async function cardLayout(page: Page) {
  return page.evaluate(() => {
    const screen = document.querySelector<HTMLElement>('.screen')!;
    const card = screen.querySelector<HTMLElement>('.card')!;
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, text: (e.textContent ?? '').trim() };
    };
    return {
      card: { scrollH: card.scrollHeight, clientH: card.clientHeight, scrollW: card.scrollWidth, clientW: card.clientWidth },
      screen: { scrollH: screen.scrollHeight, clientH: screen.clientHeight },
      buttons: [...card.querySelectorAll('button')].map(box),
      small: [...card.querySelectorAll('.actions .minor-row button')].map(box),
      lines: [...card.querySelectorAll('h2, p')].map(box),
      vw: window.innerWidth,
      vh: window.innerHeight,
      focused: (document.activeElement?.textContent ?? '').trim(),
    };
  });
}

/** Checks the card now showing at each short size, then puts the old size back. */
export async function checkCardFits(page: Page, big: string, shoot?: (name: string) => Promise<unknown>): Promise<void> {
  const before = page.viewportSize()!;
  for (const size of SHORT_SIZES) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const l = await cardLayout(page);
    const at = `${size.width}x${size.height}`;
    expect(l.card.scrollH, `${at}: the card does not scroll`).toBeLessThanOrEqual(l.card.clientH + 1);
    expect(l.card.scrollW, `${at}: nothing off the side`).toBeLessThanOrEqual(l.card.clientW + 1);
    expect(l.screen.scrollH, `${at}: the page does not scroll`).toBeLessThanOrEqual(l.screen.clientH + 1);
    for (const b of [...l.buttons, ...l.lines]) {
      expect(b.y, `${at}: "${b.text}" top in sight`).toBeGreaterThanOrEqual(0);
      expect(b.y + b.h, `${at}: "${b.text}" bottom in sight`).toBeLessThanOrEqual(size.height + 0.5);
      expect(b.x + b.w, `${at}: "${b.text}" inside the width`).toBeLessThanOrEqual(size.width + 0.5);
    }
    for (const b of l.buttons) expect(b.h, `${at}: "${b.text}" at least 44 px tall`).toBeGreaterThanOrEqual(44);
    expect(l.small.length, `${at}: small buttons`).toBeGreaterThanOrEqual(2);
    const top = l.small[0]!.y;
    for (const b of l.small) expect(Math.abs(b.y - top), `${at}: "${b.text}" in one row with the others`).toBeLessThanOrEqual(1);
    expect(l.focused, `${at}: focus stays on the big button`).toBe(big);
    await expectButtonWords15(page, '.screen .card', at);
    if (shoot) await shoot(at);
  }
  await page.setViewportSize(before);
}
