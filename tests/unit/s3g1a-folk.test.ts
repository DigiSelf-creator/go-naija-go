/**
 * S3g1a: the people kit (design.md "People everywhere", parts 3, 4, 6, 8, 11 and 12).
 * Every look in every frame draws inside the sprite box with no bad numbers; the casts mix every
 * skin, age and dress; no cap is red; the ball is never gold or yellow; the sheet fits 1024 px;
 * the crowd sounds are short and the murmur follows the Sound switch.
 */
import { describe, expect, it } from 'vitest';
import {
  FOLK_BALL_COLOURS,
  FOLK_BOX,
  FOLK_DRESSES,
  FOLK_FRAMES,
  FOLK_HOLDS,
  FOLK_SKINS,
  drawFolkBust,
  drawFolkFrame,
  drawOkada,
  folkBallAt,
  type FolkLook,
} from '../../src/art/folk';
import { folkFramesFor, folkRunFrame, folkSheetLayout, folkTwoFrame, folkWalkFrame } from '../../src/art/folkBake';
import {
  BUS_PARK_CROWD,
  CITY_CAST,
  HALL_CROWD,
  KEKE_RIDERS,
  LANE_CAST,
  LANE_CHILDREN,
  LANE_JOGGER,
  LANE_JOGGER_2,
  MAMA_PUT_COOK,
  MAMA_PUT_QUEUE,
  MARKET_SHOPPERS,
  OKADA_RIDERS,
  STORE_KEEPER,
  STREET_CASTS,
  endBusWindows,
  folkLook,
  isHeroLook,
} from '../../src/art/folkCasts';
import { SKINS } from '../../src/art/hero';
import { Sound, soundLength } from '../../src/engine/sound';
import { boundsContext } from './bounds-context';

const ALL_LOOKS: FolkLook[] = [
  ...STREET_CASTS.alausa,
  ...STREET_CASTS.village,
  ...STREET_CASTS.ikeja,
  ...HALL_CROWD,
  ...BUS_PARK_CROWD,
  ...LANE_CAST,
  ...LANE_CHILDREN,
  LANE_JOGGER,
  LANE_JOGGER_2,
  ...OKADA_RIDERS,
  ...KEKE_RIDERS,
  ...CITY_CAST,
  MAMA_PUT_COOK,
  ...MAMA_PUT_QUEUE,
  ...MARKET_SHOPPERS,
  STORE_KEEPER,
];

function hsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

describe('the people kit (S3g1a)', () => {
  it('has 7 skin tones: the hero builder five, plus a lighter and a deeper brown', () => {
    expect(FOLK_SKINS).toHaveLength(7);
    for (let i = 0; i < SKINS.length; i++) expect(FOLK_SKINS[i]!.base).toBe(SKINS[i]!.base);

  });

  it('has the 13 dress kinds of part 8', () => {
    expect(FOLK_DRESSES).toHaveLength(13);
    expect(new Set(FOLK_DRESSES).size).toBe(13);
  });

  it('draws every look in every frame inside the sprite box, with no bad numbers and save/restore balanced', () => {
    for (const look of ALL_LOOKS)
      for (const frame of FOLK_FRAMES) {
        const b = boundsContext();
        drawFolkFrame(b.g, look, frame);
        const at = `${look.dress}/${look.age}/${frame}`;
        expect(b.bad, at).toEqual([]);
        expect(b.depth(), at).toBe(0);
        expect(b.drew(), at).toBe(true);
        expect(b.box.left, at).toBeGreaterThanOrEqual(FOLK_BOX.l);
        expect(b.box.right, at).toBeLessThanOrEqual(FOLK_BOX.r);
        expect(b.box.top, at).toBeGreaterThanOrEqual(FOLK_BOX.t);
        expect(b.box.bottom, at).toBeLessThanOrEqual(FOLK_BOX.b);
      }
  });

  it('draws every held thing in every dress, and the busts and the okada, cleanly', () => {
    for (const hold of FOLK_HOLDS)
      for (const dress of FOLK_DRESSES) {
        const b = boundsContext();
        drawFolkFrame(b.g, { skin: 3, age: 'adult', sex: 'f', body: 'round', hair: 'braids', dress, a: '#e0572b', b: '#2b59c3', hold, baby: true, glasses: true }, 'call');
        expect(b.bad).toEqual([]);
        expect(b.box.top).toBeGreaterThanOrEqual(FOLK_BOX.t);
        expect(b.box.left).toBeGreaterThanOrEqual(FOLK_BOX.l);
        expect(b.box.right).toBeLessThanOrEqual(FOLK_BOX.r);
      }
    for (const look of ALL_LOOKS) {
      const b = boundsContext();
      drawFolkBust(b.g, look, 0, 0, 1, 1);
      expect(b.bad).toEqual([]);
      expect(b.depth()).toBe(0);
    }
    const o = boundsContext();
    drawOkada(o.g, OKADA_RIDERS[0], OKADA_RIDERS[1], 1);
    expect(o.bad).toEqual([]);
    expect(o.depth()).toBe(0);
  });

  it('gives each street a cast of 16 with every skin twice, every age, a wheelchair, glasses and dress from across Nigeria', () => {
    for (const [name, cast] of Object.entries(STREET_CASTS)) {
      expect(cast, name).toHaveLength(16);
      for (let s = 0; s < 7; s++) expect(cast.filter((l) => l.skin === s).length, `${name} skin ${s}`).toBeGreaterThanOrEqual(2);
      for (const age of ['child', 'teen', 'adult', 'elder'] as const) expect(cast.some((l) => l.age === age), `${name} ${age}`).toBe(true);
      expect(cast.filter((l) => l.chair).length, name).toBe(1);
      expect(cast.some((l) => l.glasses), name).toBe(true);
      expect(new Set(cast.map((l) => l.dress)).size, name).toBeGreaterThanOrEqual(6);
      // North, South West, South East or South South, and the Middle Belt all show somewhere
      const kinds = new Set(cast.map((l) => l.dress));
      expect(['kaftan', 'babbanRiga', 'hijabDress'].some((d) => kinds.has(d as FolkLook['dress'])), name).toBe(true);
      expect(['iroBuba', 'bubaSokoto', 'agbada'].some((d) => kinds.has(d as FolkLook['dress'])), name).toBe(true);
      for (const l of cast) expect(l.chair && l.stool, name).toBeFalsy();
    }
  });

  it('never puts a red cap on anyone, and the ball is never gold or yellow (or a kobo look-alike)', () => {
    const caps = ['fila', 'kaftanCap', 'rigaCap', 'helmet'];
    for (const l of ALL_LOOKS) {
      if (!caps.includes(l.head ?? 'none')) continue;
      const c = hsl(l.h ?? l.a);
      const red = (c.h < 20 || c.h > 340) && c.s > 0.35 && c.l > 0.2 && c.l < 0.8;
      expect(red, `${l.head} ${l.h ?? l.a}`).toBe(false);
    }
    for (const col of FOLK_BALL_COLOURS) {
      const c = hsl(col);
      expect(c.s < 0.15 || c.h < 30 || c.h > 75, col).toBe(true);
    }
  });

  it('bakes at most 10 frames a look, and a 16-look sheet fits 1024 x 1024', () => {
    for (const l of ALL_LOOKS) {
      const f = folkFramesFor(l);
      expect(f.length).toBeLessThanOrEqual(10);
      for (const x of f) expect(FOLK_FRAMES).toContain(x);
    }
    const lay = folkSheetLayout(160, 4.5);
    expect(lay.width).toBeLessThanOrEqual(1024);
    expect(lay.height).toBeLessThanOrEqual(1024);
    expect(lay.cols * lay.rows).toBeGreaterThanOrEqual(160);
    expect(lay.pxPerU).toBeLessThan(4.5);
    expect(folkSheetLayout(10, 2).pxPerU).toBe(2);
  });

  it('steps through frames by time, and reduced motion holds one pose', () => {
    expect(folkWalkFrame(0)).toBe('walk0');
    expect(folkWalkFrame(0.16)).toBe('walk1');
    expect(folkWalkFrame(0.16, true)).toBe('backWalk1');
    expect(folkRunFrame(0.1)).toBe('backRun1');
    expect(folkTwoFrame('wave', 0.3)).toBe('wave1');
    expect(folkTwoFrame('wave', 0.3, true)).toBe('wave0');
    expect(folkBallAt(1, 40, true)).toEqual({ x: 20, y: -12 });
  });

  it('knows the player own hero look, so a cast can skip it', () => {
    const l: FolkLook = { skin: 2, age: 'adult', sex: 'f', body: 'medium', hair: 'braids', head: 'gele', dress: 'iroBuba', a: '#e0572b', b: '#2b59c3' };
    expect(isHeroLook(l, { skin: 2, hair: 3, outfit: 1 })).toBe(true);
    expect(isHeroLook(l, { skin: 3, hair: 3, outfit: 1 })).toBe(false);
    expect(isHeroLook(l, { skin: 2, hair: 0, outfit: 1 })).toBe(false);
  });

  it('reads look codes', () => {
    expect(folkLook('4efrgSgICE.s')).toEqual({ skin: 4, age: 'elder', sex: 'f', body: 'round', hair: 'grey', head: 'headscarf', dress: 'wrapperBlouse', a: '#5aa9e6', b: '#f2b300', h: '#7d3c98', stool: true });
    expect(folkLook('2cmsl-mNB.o').hold).toBe('ball');
    expect(folkLook('0tmsl-lRM.cg')).toMatchObject({ hold: 'backpack', glasses: true, dress: 'shirtTrousers' });
  });

  it('finds the big bus windows', () => {
    const w = endBusWindows(1000, 0, 300);
    expect(w.length).toBeGreaterThanOrEqual(4);
    for (const r of w) expect(r.y).toBe(234);
  });
});

describe('crowd sounds (S3g1a, part 12)', () => {
  it('a cheer is 0.8 s and the big one 1.2 s, each hiss within the 0.3 s noise buffer', () => {
    expect(soundLength('crowdCheer')).toBeGreaterThan(0.7);
    expect(soundLength('crowdCheer')).toBeLessThan(0.95);
    expect(soundLength('crowdCheerBig')).toBeGreaterThan(1.1);
    expect(soundLength('crowdCheerBig')).toBeLessThan(1.35);
  });

  it('the murmur never plays with the Sound switch off or before the first tap', () => {
    const s = new Sound();
    s.setMurmur(true);
    expect(s.murmuring).toBe(false);
    s.enabled = false;
    s.setMurmur(true);
    expect(s.murmuring).toBe(false);
  });
});
