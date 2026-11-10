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
    if (shoot) await shoot(at);
  }
  await page.setViewportSize(before);
}
