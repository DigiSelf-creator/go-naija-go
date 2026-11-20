/**
 * ST-A1 (docs/style.md 1.2, 2.2): the button icon set. Pins the list of icons, each disc colour
 * from the style.md disc table, the picture rules, and the size (1.5 KB gzip, minified as built).
 */
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { ICON_DISC, ICON_NAMES, iconSvg } from '../../src/art/icons';

/** Typed out by hand, so an icon added or lost is a choice, not a slip. */
const LIST =
  'play go next road naira power tech sound soundOff music musicOff settings travel hero wheel back close retry gentle zoomIn zoomOut download skip home pin lock tick'.split(' ');

/** style.md 1.2, the icon disc table. */
const DISC: Record<string, string> = {
  play: '#ffe066', go: '#ffe066', next: '#ffe066', road: '#ffe066', retry: '#ffe066', power: '#ffe066',
  naira: '#f6c34a', tech: '#7fd3c7', sound: '#9fd0ff', soundOff: '#9fd0ff', music: '#9fd0ff', musicOff: '#9fd0ff',
  settings: '#ead9b5', travel: '#f6c90e', hero: '#f3b38a', wheel: '#8fd17a', back: '#ead9b5', close: '#ead9b5',
  gentle: '#f9c6d3', zoomIn: '#ead9b5', zoomOut: '#ead9b5', download: '#ead9b5', skip: '#ead9b5', home: '#ead9b5',
  pin: '#ead9b5', lock: '#ead9b5', tick: '#ead9b5',
};

describe('ST-A1 button icons', () => {
  it('has exactly the agreed icons, in order', () => {
    expect(ICON_NAMES).toEqual(LIST);
  });

  it('puts each icon on its style.md disc colour', () => {
    for (const n of ICON_NAMES) expect(ICON_DISC[n], n).toBe(DISC[n]);
  });

  it('draws every icon as a small, hidden, ink-coloured SVG with only allowed colours', () => {
    const allowed = new Set(['currentcolor', 'none', '#7a4a2e', '#fff8e6']);
    for (const n of ICON_NAMES) {
      const svg = iconSvg(n, 21);
      expect(svg.startsWith('<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">'), n).toBe(true);
      expect(svg.endsWith('</g></svg>'), n).toBe(true);
      expect(svg, n).not.toMatch(/<(script|image|use|text|foreignObject)|href|https?:|filter|blur/i);
      // Tags balance (every open tag is closed or self-closed).
      const opens = (svg.match(/<[a-z]+[^>]*[^/]>/gi) ?? []).length;
      const closes = (svg.match(/<\/[a-z]+>/gi) ?? []).length;
      expect(opens, n).toBe(closes);
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) expect(allowed.has(c!.toLowerCase()), `${n}: ${c}`).toBe(true);
      expect(svg.length, n).toBeLessThan(900);
    }
  });

  it('shows the hero face in the mid skin tone style.md names', () => {
    expect(iconSvg('hero')).toContain('fill="#7a4a2e"');
  });

  it('stays within its 1.5 KB gzip share of phase 1 (style.md 2.2), minified as the game is built', async () => {
    const out = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: true,
        // The same minifier as the game's build; the exports kept, as a screen importing them would.
        rollupOptions: {
          input: fileURLToPath(new URL('../../src/art/icons.ts', import.meta.url)),
          preserveEntrySignatures: 'exports-only',
          // The music notes are already in the first load (the menus use them).
          external: [/musicIcon/],
        },
      },
    });
    const chunk = (Array.isArray(out) ? out[0]! : out) as { output: { type: string; code?: string }[] };
    const code = chunk.output.find((o) => o.type === 'chunk')!.code!;
    expect(gzipSync(code, { level: 9 }).length).toBeLessThanOrEqual(1500);
  }, 30_000);
});
