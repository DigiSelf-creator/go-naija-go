/**
 * O2b: Ota's street look and people (src/worlds/ogun/otaStreet.ts; docs/ogun.md 3.4, 7). The look
 * only reads the run; its people are Ota's own cast through the people system, the three traders
 * calling the words on their own stalls, the travellers by the arch saying welcome.
 */
import { describe, expect, it } from 'vitest';
import ogun1 from '../../src/data/levels/ogun-1.json';
import { crowdSpots, isTrader, ownCast } from '../../src/game/crowd';
import { parseLevel } from '../../src/game/level';
import { OGUN_WORDS } from '../../src/screens/words';
import { OTA_CAST, OTA_STALL_WORDS, OTA_TRADERS, OTA_TRADER_LOOKS, OTA_TRAVELLERS } from '../../src/worlds/ogun/ota';
import { MUD_LOOK, ogunStreet, otaCast, otaSkin } from '../../src/worlds/ogun/otaStreet';
import type { SkinNow } from '../../src/game/skin';

const OTA = parseLevel(structuredClone(ogun1));

describe("Ota's people (ogun.md part 7)", () => {
  const cast = otaCast(200);

  it('its own 16 looks; exactly the three traders are traders, each calling the words on their stall', () => {
    expect(cast.looks).toBe(OTA_CAST);
    expect(OTA_CAST.filter(isTrader)).toEqual(OTA_TRADERS.map((k) => OTA_TRADER_LOOKS[k]));
    OTA_TRADERS.forEach((k, i) => {
      const call = cast.callOf!(OTA_TRADER_LOOKS[k])!;
      expect(call).toBe(OGUN_WORDS.folk.traders.ota[i]);
      // "Ofada rice dey!" at OFADA RICE, "Fresh bread!" at FRESH BREAD, "Recharge card dey!" at RECHARGE CARD.
      expect(call.toUpperCase()).toContain(OTA_STALL_WORDS[k].split(' ')[0]!);
    });
    expect(cast.callOf!(OTA_CAST[0]!)).toBeUndefined();
  });

  it('the travellers stand by the arch and greet with the welcome words', () => {
    expect(cast.extras!.map((e) => e.look)).toEqual([...OTA_TRAVELLERS]);
    for (const e of cast.extras!) expect(e.x).toBeGreaterThan(200);
    expect(cast.welcome!.lines).toBe(OGUN_WORDS.folk.welcome);
    expect(cast.extras!.every((e) => e.x < cast.welcome!.to)).toBe(true);
  });

  it('the plan for Ota: traders stand (one at least), the driver on his stool sits, nobody before the first screen ends', () => {
    const own = ownCast(cast, null);
    for (const look of ['tired', 'bright', 'fixed'] as const) {
      const plan = crowdSpots(OTA, look, own.looks, own.park, cast.from);
      expect(plan.stands.some((s) => s.kind === 'trader')).toBe(true);
      for (const s of plan.stands) {
        expect(s.x).toBeGreaterThanOrEqual(cast.from);
        if (own.looks[s.look]!.stool) expect(s.kind).toBe('sit');
      }
    }
  });
});

describe("Ota's look (skin.ts)", () => {
  it('only Ota has one so far; it has the cast and every drawing part', () => {
    expect(ogunStreet({ id: 'ogun-2', arch: null })).toBeNull();
    const k = ogunStreet({ id: 'ogun-1', arch: 200 })!;
    expect(k.cast?.name).toBe('ota');
    for (const part of ['backdrop', 'back', 'ground', 'stall', 'food', 'crate', 'icon', 'front', 'hear', 'restart'] as const) expect(typeof k[part]).toBe('function');
  });

  it('a mud step leaves a print and a splash; they go when filled in or landed, and on a fresh play', () => {
    const k = otaSkin(200);
    const now = { level: OTA, clock: 0 } as unknown as SkinNow;
    const drawn: number[] = [];
    const g = new Proxy({} as Record<string, unknown>, {
      get: (_t, p) => (p === 'ellipse' ? (x: number) => drawn.push(x) : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    k.hear!([{ type: 'mudStep', x: 2150, y: 300 }], now);
    k.hear!([{ type: 'mudStep', x: 2170, y: 300 }], now);
    // drawMud draws its own old prints with ellipse too: count the fresh ones by their x.
    const fresh = (): number => drawn.filter((x) => x === 2147 || x === 2173).length;
    const s = { ...now, L: 2000, R: 2400, still: true, fixed: false, people: null } as SkinNow;
    k.ground!(g, s);
    expect(fresh()).toBe(2);
    drawn.length = 0;
    k.hear!([], { ...now, clock: MUD_LOOK.printFill + 0.01 } as SkinNow);
    k.ground!(g, { ...s, clock: MUD_LOOK.printFill + 0.01 });
    expect(fresh()).toBe(0);
    k.hear!([{ type: 'mudStep', x: 2150, y: 300 }], now);
    k.restart!();
    drawn.length = 0;
    k.ground!(g, s);
    expect(fresh()).toBe(0);
  });

  it('ikokore and garri are drawn as Ogun\'s own; other foods and crates are the game\'s', () => {
    const k = otaSkin(200);
    const g = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
    expect(k.food!(g, 'ikokore', 0, 0, 0)).toBe(true);
    expect(k.food!(g, 'garri', 0, 0, 0)).toBe(true);
    expect(k.food!(g, 'corn', 0, 0, 0)).toBe(false);
    expect(k.icon!(g, 'ikokore', 16, 16, 1)).toBe(true);
    const crate = (contents: string) => ({ x: 0, bottomY: 200, contents }) as never;
    expect(k.crate!(g, crate('garri'), { open: false, angle: 0 })).toBe(true);
    expect(k.crate!(g, crate('kobo'), { open: false, angle: 0 })).toBe(false);
  });
});
