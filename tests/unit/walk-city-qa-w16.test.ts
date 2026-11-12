/**
 * qa, Walk the city round 3: city.md W16. When a price board must shrink, it drops the bucket
 * icon first, and only then makes the price 12 px bold. Never both unless both are needed. The
 * words never change and are never squeezed below 12 px.
 */
import { describe, expect, it } from 'vitest';
import { BOARD, BUILD_IDS, BUILDS, drawPriceBoard, priceWords } from '../../src/art/payspot';

/** A context that measures bold sans text like a phone does (about 0.5 em a letter, near what Chromium measures for these words) and keeps the font each word was written in. */
function measuring() {
  let font = '';
  const writes: { text: string; x: number; font: string; maxW?: number }[] = [];
  const size = () => Number(/(\d+)px/.exec(font)?.[1] ?? 10);
  const props: Record<string, unknown> = {
    globalAlpha: 1,
    lineWidth: 1,
    measureText: (t: string) => ({ width: t.length * size() * 0.5 }),
    fillText: (text: string, x: number, _y: number, maxW?: number) => writes.push({ text, x, font, maxW }),
  };
  const g = new Proxy(props, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (key.startsWith('create') && key.endsWith('Gradient')) return () => ({ addColorStop: () => undefined });
      return () => undefined;
    },
    set(target, key, value) {
      if (key === 'font') font = String(value);
      if (typeof key === 'string') target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, writes };
}

const ICON = BOARD.icon + 3;
const width = (text: string, px: number) => text.length * px * 0.5;

describe('W16: a board that must shrink drops its icon first, then goes to 12 px bold', () => {
  for (const short of [false, true]) {
    const room = (short ? BOARD.tightW : BOARD.maxW) - 12;
    for (const id of BUILD_IDS) {
      const { bucket, price } = BUILDS[id];
      for (let left = price; left >= 1; left--) {
        const top = left < price ? `${priceWords(bucket, left)} left` : priceWords(bucket, left);
        it(`${short ? 'short' : 'full'} ${id} "${top}"`, () => {
          const want = width(top, 14) + ICON <= room ? { px: 14, icon: true } : width(top, 14) <= room ? { px: 14, icon: false } : { px: 12, icon: false };
          const { g, writes } = measuring();
          drawPriceBoard(g, 0, 100, id, left, { short });
          const line1 = writes.find((w) => w.text === top);
          expect(line1, 'the price words are written unchanged').toBeTruthy();
          expect(line1!.font).toBe(`bold ${want.px}px sans-serif`);
          // With no icon the words start at the left of the centred line; with it they start one icon in.
          const tw = width(top, want.px);
          expect(line1!.x).toBeCloseTo(-(tw + (want.icon ? ICON : 0)) / 2 + (want.icon ? ICON : 0), 3);
          // Never squeezed: the width it may use is at least its own width.
          expect(line1!.maxW ?? Infinity).toBeGreaterThanOrEqual(tw);
        });
      }
    }
  }
});
