/**
 * Slice 3 steps (a) and (b) (docs/city.md part 5): the intro flow rules, Naira money words and
 * the save move (N1 to N4), the city's buckets and fixes, pin tap areas, and the camera limits.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CITY_BLOCKS, CITY_MAP, CITY_SPOTS, SPOT_WORDS, pinHitBox } from '../../src/art/city';
import { FIX_COST, canFix, emptyCity, payFix, readCity, spotLook, spotLooks } from '../../src/game/city';
import {
  EDGE,
  blockAt,
  camScale,
  centreOn,
  clampCam,
  panCam,
  pinTapBox,
  pinchStep,
  startCam,
  toMap,
  toScreen,
  zoomCam,
  type CityView,
} from '../../src/game/cityCamera';
import { FADE, HINT_AFTER, IntroFlow, KEY_INTRO, introDue, introSeen, markIntroSeen } from '../../src/game/intro';
import { KOBO_PER_COIN, formatMoney, setNairaSign, spokenMoney } from '../../src/game/money';
import { KEY_PROGRESS, Progress, PROGRESS_VERSION, migrate } from '../../src/game/progress';
import { WORDS } from '../../src/screens/words';
import { createStore } from '../../src/storage';

function fakeStorage(seed: Record<string, string> = {}): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

describe('the intro flow (city.md (a))', () => {
  it('plays by itself until seen; Settings always plays it', () => {
    expect(introDue(false, 'makeHero')).toBe(true);
    expect(introDue(false, 'play')).toBe(true); // a player with a hero who has not seen it
    expect(introDue(true, 'makeHero')).toBe(false);
    expect(introDue(true, 'play')).toBe(false);
    expect(introDue(true, 'replay')).toBe(true);
    expect(introDue(false, 'replay')).toBe(true);
  });

  it('is saved as gidi-intro "seen"; storage blocked still works this visit', () => {
    const { storage, data } = fakeStorage();
    const store = createStore(() => storage);
    expect(introSeen(store)).toBe(false);
    markIntroSeen(store);
    expect(data.get(`gidi-${KEY_INTRO}`)).toBe('"seen"');
    expect(introSeen(createStore(() => storage))).toBe(true);
    // A broken value is not "seen".
    expect(introSeen(createStore(() => fakeStorage({ 'gidi-intro': '"maybe"' }).storage))).toBe(false);
    const blocked = createStore(() => {
      throw new Error('blocked');
    });
    markIntroSeen(blocked);
    expect(introSeen(blocked)).toBe(true);
  });

  it('six frames, no frame moves on by itself, a tap goes on, the last tap ends it', () => {
    const f = new IntroFlow();
    expect(f.frame).toBe(1);
    f.tick(60);
    expect(f.frame).toBe(1); // still waiting after a minute
    for (let n = 2; n <= 6; n++) {
      expect(f.next()).toBe(false);
      expect(f.frame).toBe(n);
      expect(f.time).toBe(0);
    }
    expect(f.last).toBe(true);
    expect(f.next()).toBe(true);
    expect(f.done).toBe(true);
  });

  it('Skip ends it from the first frame', () => {
    const f = new IntroFlow();
    f.skip();
    expect(f.done).toBe(true);
    expect(f.next()).toBe(true);
  });

  it('"Tap to go on" after 1.5 s on a frame, never on frame 6', () => {
    const f = new IntroFlow();
    f.tick(HINT_AFTER - 0.01);
    expect(f.hintShown).toBe(false);
    f.tick(0.02);
    expect(f.hintShown).toBe(true);
    while (!f.last) f.next();
    f.tick(10);
    expect(f.hintShown).toBe(false);
  });

  it('a 0.3 s cross-fade, a plain cut with reduced motion, none on frame 1', () => {
    const f = new IntroFlow();
    expect(f.fade(false)).toBe(1);
    f.next();
    expect(f.fade(false)).toBe(0);
    f.tick(FADE / 2);
    expect(f.fade(false)).toBeCloseTo(0.5);
    expect(f.fade(true)).toBe(1);
    f.tick(FADE);
    expect(f.fade(false)).toBe(1);
  });

  it('paused (hidden page or phone upright): time stops, and that frame starts again after', () => {
    const f = new IntroFlow();
    f.next();
    f.next();
    f.tick(2);
    expect(f.hintShown).toBe(true);
    f.pause();
    f.tick(5);
    expect(f.time).toBe(2);
    f.resume();
    expect(f.frame).toBe(3);
    expect(f.time).toBe(0);
    expect(f.hintShown).toBe(false);
    expect(f.fade(false)).toBe(1); // no fade on the restart
  });

  it('six captions, word for word as Tp confirmed (caption 2 from 10 Nov)', () => {
    expect(WORDS.intro.captions).toHaveLength(6);
    expect(WORDS.intro.captions[1]).toBe('The Wheel turned, and Lagos grew. More people came, and they need more roads, more light and more buses.');
    expect(WORDS.intro.captions[5]).toBe('Your journey starts now. Build up Lagos. Get Nigeria working.');
    expect([WORDS.intro.skip, WORDS.intro.go, WORDS.intro.tapOn, WORDS.intro.keysOn]).toEqual(['Skip', "Let's go", 'Tap to go on', 'Press Space to go on']);
    expect(WORDS.title.tagline).toBe('Build up Lagos. Get Nigeria working.');
  });
});

describe('Naira and kobo (N1 to N4)', () => {
  afterEach(() => setNairaSign(null));

  it('a coin is 10 kobo', () => {
    expect(KOBO_PER_COIN).toBe(10);
  });

  it.each([
    [0, '₦0', '0 naira'],
    [10, '10 kobo', '10 kobo'],
    [80, '80 kobo', '80 kobo'],
    [99, '99 kobo', '99 kobo'],
    [100, '₦1', '1 naira'],
    [340, '₦3.40', '3 naira 40 kobo'],
    [305, '₦3.05', '3 naira 5 kobo'],
    [1200, '₦12', '12 naira'],
    [12450, '₦124.50', '124 naira 50 kobo'],
    [125000, '₦1,250', '1250 naira'],
  ])('%i kobo shows as %s and is read as %s', (k, shown, spoken) => {
    setNairaSign('₦');
    expect(formatMoney(k)).toBe(shown);
    expect(spokenMoney(k)).toBe(spoken);
  });

  it('"N" stands in where the font has no ₦', () => {
    setNairaSign('N');
    expect(formatMoney(340)).toBe('N3.40');
    expect(formatMoney(0)).toBe('N0');
    expect(formatMoney(80)).toBe('80 kobo');
  });

  it('odd amounts never show as money from nothing', () => {
    expect(formatMoney(-5, '₦')).toBe('₦0');
    expect(formatMoney(Number.NaN, '₦')).toBe('₦0');
    expect(formatMoney(345.9, '₦')).toBe('₦3.45');
  });

  it('the city and card words', () => {
    expect(WORDS.city.cards.potholes.line2(formatMoney(FIX_COST.potholes.amount, '₦'))).toBe('Fixing it costs ₦10.');
    expect(WORDS.city.cards.potholes.fix('₦10')).toBe('Fix it (₦10)');
    expect(WORDS.city.spokenNaira(spokenMoney(340))).toBe('Naira: 3 naira 40 kobo');
    expect(WORDS.city.power(6)).toBe('Power 6');
    expect(WORDS.city.tech(2)).toBe('Tech 2');
  });
});

describe('moving old saves to Naira (N3 a)', () => {
  const v1 = {
    v: 1,
    keep: 'me',
    states: {
      lagos: { streets: { 1: { done: true, best: 87 }, 2: { done: true, best: 0 }, 3: { done: false, best: 'x' } }, parcel: true, hall: { done: true, best: 3 } },
      kano: 'odd',
    },
  };

  it('every best times 10, once, marked v: 2; nothing else changes', () => {
    const m = migrate(v1);
    expect(m).toEqual({
      v: 2,
      keep: 'me',
      states: {
        lagos: { streets: { 1: { done: true, best: 870 }, 2: { done: true, best: 0 }, 3: { done: false, best: 'x' } }, parcel: true, hall: { done: true, best: 30 } },
        kano: 'odd',
      },
    });
    expect(migrate(m)).toBe(m); // never twice
    expect(v1.states.lagos.streets[1].best).toBe(87); // pure
    expect(PROGRESS_VERSION).toBe(2);
  });

  it('a copy with no version counts as version 1', () => {
    expect(migrate({ states: { lagos: { streets: { 1: { done: true, best: 5 } } } } })).toMatchObject({ v: 2, states: { lagos: { streets: { 1: { best: 50 } } } } });
  });

  it('on load the move is written at once; the purse starts at ₦0', () => {
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify({ ...v1, states: { lagos: v1.states.lagos } }) });
    const p = new Progress(createStore(() => storage));
    expect(p.state('lagos').streets['1']).toEqual({ done: true, best: 870 });
    expect(JSON.parse(data.get(`gidi-${KEY_PROGRESS}`)!)).toMatchObject({ v: 2, states: { lagos: { streets: { 1: { best: 870 } } } } });
    // A second load does not move it again.
    expect(new Progress(createStore(() => storage)).state('lagos').streets['1']!.best).toBe(870);
    expect(readCity(p.raw?.['city'])).toEqual(emptyCity());
  });

  it('a broken copy is not moved or written', () => {
    const { storage, data } = fakeStorage({ 'gidi-progress': '{"v":1,"states":[' });
    const p = new Progress(createStore(() => storage));
    expect(p.broken).toBe(true);
    expect(data.get('gidi-progress')).toBe('{"v":1,"states":[');
  });
});

describe('the city part of the save (city.md (b))', () => {
  it('missing or broken reads as zeros', () => {
    for (const v of [undefined, null, 7, 'x', [], { kobo: -3, power: 'lots', tech: Number.NaN, fixed: 'potholes', fixes: -1 }]) expect(readCity(v)).toEqual(emptyCity());
    expect(readCity({ kobo: 340.7, power: 6, tech: 2, fixed: ['potholes', 'nope', 'potholes'], fixes: 0 })).toEqual({ kobo: 340, power: 6, tech: 2, fixed: ['potholes'], fixes: 1 });
  });

  it('saved as a part, merged into the newest copy, never overwriting the streets', () => {
    const start = { v: 2, states: { lagos: { streets: { 1: { done: true, best: 900 } }, parcel: false, hall: { done: false, best: 0 } } }, later: 1 };
    const { storage, data } = fakeStorage({ 'gidi-progress': JSON.stringify(start) });
    const p = new Progress(createStore(() => storage));
    p.savePart('city', { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1 });
    const saved = JSON.parse(data.get('gidi-progress')!) as Record<string, unknown>;
    expect(saved).toEqual({ ...start, city: { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1 } });
    // A street finish afterwards keeps the city part.
    p.finish({ state: 'lagos', street: 2, kobo: 500, parcel: false });
    expect(JSON.parse(data.get('gidi-progress')!)).toMatchObject({ city: { fixed: ['potholes'] } });
  });

  it('each fix costs its own bucket: Potholes ₦10, Lights out Power 10, Slow internet Tech 6', () => {
    expect(FIX_COST).toEqual({ potholes: { bucket: 'naira', amount: 1000 }, lightsOut: { bucket: 'power', amount: 10 }, slowInternet: { bucket: 'tech', amount: 6 } });
    const c = { ...emptyCity(), kobo: 999, power: 10, tech: 5 };
    expect(spotLooks(c)).toEqual({ potholes: 'problem', lightsOut: 'ready', slowInternet: 'problem' });
    expect(payFix(c, 'potholes')).toBeNull();
    const paid = payFix(c, 'lightsOut')!;
    expect(paid).toEqual({ kobo: 999, power: 0, tech: 5, fixed: ['lightsOut'], fixes: 1 });
    expect(spotLook(paid, 'lightsOut')).toBe('fixed');
    expect(canFix(paid, 'lightsOut')).toBe(false); // never twice
    expect(c.power).toBe(10); // pure
    const rich = payFix({ ...emptyCity(), kobo: 1250 }, 'potholes')!;
    expect(rich.kobo).toBe(250);
  });
});

describe('pin tap areas (city.md (b) "Pins")', () => {
  it('at least 48 x 56 px, holding the round sign and the whole word', () => {
    for (const spot of Object.keys(SPOT_WORDS) as (keyof typeof SPOT_WORDS)[]) {
      for (const word of [SPOT_WORDS[spot], 'Ready']) {
        const b = pinTapBox(200, 300, word);
        expect(b.w).toBeGreaterThanOrEqual(48);
        expect(b.h).toBeGreaterThanOrEqual(56);
        // Centred over the foot; the foot and the sign above it are inside.
        expect(b.x + b.w / 2).toBeCloseTo(200);
        expect(b.y + b.h).toBeGreaterThanOrEqual(300);
        expect(b.y).toBeLessThanOrEqual(300 - 18 * 2 - 16 - 10);
        // The word tag (bold 12 px, about 7 px a letter, 12 px of padding) fits across.
        expect(b.w).toBeGreaterThanOrEqual(word.length * 7 + 12);
        // Never smaller than art's own hit box.
        const art = pinHitBox(200, 300);
        expect(b.w).toBeGreaterThanOrEqual(art.w);
        expect(b.y).toBeLessThanOrEqual(art.y);
      }
    }
  });

  it('the three pins never overlap at far on the smallest screen', () => {
    const v: CityView = { w: 320, h: 240 };
    const cam = startCam(v);
    const boxes = Object.values(CITY_SPOTS).map((s) => {
      const at = toScreen(cam, v, s.pin);
      return pinTapBox(at.x, at.y, SPOT_WORDS[s.id]);
    });
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${i} ${j}`).toBe(true);
      }
  });
});

describe('looking around: pan and zoom limits (city.md (b) "Size", "Look around")', () => {
  const views: CityView[] = [
    { w: 320, h: 240 },
    { w: 851, h: 393 },
    { w: 393, h: 851 },
    { w: 1280, h: 720 },
  ];

  it('far fits the map height; near is 2 times as big; it starts at far', () => {
    for (const v of views) {
      expect(CITY_MAP.h * camScale('far', v)).toBeCloseTo(v.h);
      expect(camScale('near', v)).toBeCloseTo(2 * camScale('far', v));
      expect(startCam(v).zoom).toBe('far');
    }
  });

  it('a drag never takes the map more than 40 px past an edge; a smaller map stays centred', () => {
    for (const v of views) {
      for (const zoom of ['far', 'near'] as const) {
        const s = camScale(zoom, v);
        const mw = CITY_MAP.w * s;
        const mh = CITY_MAP.h * s;
        for (const [dx, dy] of [[1e5, 1e5], [-1e5, -1e5], [1e5, -1e5], [-1e5, 1e5]] as const) {
          const c = panCam({ zoom, x: 0, y: 0 }, v, dx, dy);
          if (mw <= v.w) expect(c.x).toBeCloseTo((v.w - mw) / 2);
          else {
            expect(c.x).toBeLessThanOrEqual(EDGE);
            expect(c.x + mw).toBeGreaterThanOrEqual(v.w - EDGE);
          }
          if (mh <= v.h) expect(c.y).toBeCloseTo((v.h - mh) / 2);
          else {
            expect(c.y).toBeLessThanOrEqual(EDGE);
            expect(c.y + mh).toBeGreaterThanOrEqual(v.h - EDGE);
          }
        }
      }
    }
  });

  it('a small drag moves the map by just that much', () => {
    const v = { w: 851, h: 393 };
    const c = zoomCam(startCam(v), v, 'near');
    const moved = panCam(c, v, -30, 12);
    expect(moved.x - c.x).toBeCloseTo(-30);
    expect(moved.y - c.y).toBeCloseTo(12);
  });

  it('zoom keeps the point under the fingers (or the middle) where it is', () => {
    const v = { w: 851, h: 393 };
    const c = startCam(v);
    const at = { x: 400, y: 200 };
    const m = toMap(c, v, at);
    const near = zoomCam(c, v, 'near', at);
    expect(near.zoom).toBe('near');
    const back = toScreen(near, v, m);
    expect(back.x).toBeCloseTo(at.x);
    expect(back.y).toBeCloseTo(at.y);
    expect(zoomCam(near, v, 'far').zoom).toBe('far');
    expect(clampCam(zoomCam(near, v, 'far'), v)).toEqual(zoomCam(near, v, 'far'));
  });

  it('pinch snaps between the two steps', () => {
    expect(pinchStep('far', 1.1)).toBe('far');
    expect(pinchStep('far', 1.25)).toBe('near');
    expect(pinchStep('near', 0.9)).toBe('near');
    expect(pinchStep('near', 0.8)).toBe('far');
    expect(pinchStep('far', 0.5)).toBe('far');
    expect(pinchStep('near', 3)).toBe('near');
    expect(pinchStep('far', Number.NaN)).toBe('far');
  });

  it('double tap on a block: near, centred on it', () => {
    const v = { w: 851, h: 393 };
    const b = CITY_BLOCKS[5]!;
    const mid = { x: b.x + b.w / 2, y: b.y + b.d / 2 };
    expect(blockAt(mid)?.id).toBe(b.id);
    expect(blockAt({ x: 5, y: 990 })).toBeNull(); // the lagoon
    const c = centreOn(mid, 'near', v);
    expect(c.zoom).toBe('near');
    const on = toScreen(c, v, mid);
    expect(on.x).toBeCloseTo(v.w / 2, 0);
    expect(on.y).toBeCloseTo(v.h / 2, 0);
  });
});
