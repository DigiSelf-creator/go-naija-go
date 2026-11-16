/**
 * O6b: Ogun's city rules (docs/ogun.md 6.2 to 6.4; decision 80, one wallet; OG-R8, trays fill
 * anywhere), its walk grid, its challenge road (6.5) and the Expressway's part hooks (6.6).
 */
import { describe, expect, it } from 'vitest';
import { KEY_PROGRESS, Progress, type Obj } from '../../src/game/progress';
import { CityLife } from '../../src/game/cityLife';
import { FIRST_BOOM, KEY_CITY, readCity } from '../../src/game/city';
import { OGUN, OGUN_TRAYS, StateCity, WALLET_KEYS, statePart, stateProgress } from '../../src/game/states';
import { createStore } from '../../src/storage';
import { part as ogunPart } from '../../src/worlds/ogun';
import {
  OGUN_BOARDS,
  OGUN_PRICES,
  OGUN_TAX,
  addOgunBoom,
  collectOgunTray,
  emptyOgunCity,
  leftOn,
  ogunBoards,
  ogunBoomDue,
  ogunBright,
  ogunEarning,
  ogunLooks,
  payOgunBoard,
  readOgunCity,
  readWallet,
  writeOgunCity,
  type OgunCityState,
  type Wallet,
} from '../../src/worlds/ogun/cityRules';
import { OGUN_DOORS, OGUN_MATS } from '../../src/worlds/ogun/cityScreen';
import { OGUN_HOME, ogunLineClear, ogunNearest, ogunPath, ogunWalkable } from '../../src/worlds/ogun/walk';
import { OGUN_SPOTS, OGUN_PLACES } from '../../src/worlds/ogun/city';
import { expresswayFor, ogunStops } from '../../src/worlds/ogun/roadPlan';
import { OGUN_STOP_BOX } from '../../src/worlds/ogun/road';
import { OGUN_CITY_WORDS } from '../../src/worlds/ogun/cityWords';
import { EXPRESSWAY_LOOK } from '../../src/worlds/ogun/laneLook';
import { EXPRESSWAY_SCENERY, expresswayVehicleAt, vehicleKey } from '../../src/worlds/ogun/expressway';
import { ROLL_OUT } from '../../src/worlds/ogun/hall';

const W = (kobo = 0, power = 0, tech = 0): Wallet => ({ kobo, power, tech });
const DONE = { done: true, best: 120 };

function fakeStorage(seed: Record<string, string> = {}): { storage: Storage; data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

describe('O6b: one wallet, Ogun keeps its own fixes (decision 80)', () => {
  it('the part copy of the tax places is the first load copy (pinned: the trays fill before the part loads)', () => {
    for (const [p, t] of Object.entries(OGUN_TAX)) expect(OGUN_TRAYS[p], p).toEqual([t.every, t.each, t.cap, t.needs ?? '']);
    expect(Object.keys(OGUN_TRAYS).sort()).toEqual(Object.keys(OGUN_TAX).sort());
  });

  it('6.2 and 6.3 numbers: road ₦12, adire ₦6, pump Power 10, lamps Power 8, mast Tech 6, mill ₦8, kola ₦10; trays 10 kobo / 8 s cap ₦1.20, 30 / 15 s cap ₦2.40, 20 / 12 s cap ₦1.20', () => {
    expect(OGUN_PRICES).toEqual({
      potholes: { bucket: 'naira', price: 1200 },
      adire: { bucket: 'naira', price: 600 },
      dryTaps: { bucket: 'power', price: 10 },
      lightsOut: { bucket: 'power', price: 8 },
      slowInternet: { bucket: 'tech', price: 6 },
      mill: { bucket: 'naira', price: 800 },
      kola: { bucket: 'naira', price: 1000 },
    });
    expect(OGUN_TAX.adire).toEqual({ every: 8, each: 10, cap: 120, needs: null });
    expect(OGUN_TAX.mill).toEqual({ every: 15, each: 30, cap: 240, needs: 'potholes' });
    expect(OGUN_TAX.kola).toEqual({ every: 12, each: 20, cap: 120, needs: null });
    // W3's cap rule: all of Ogun's trays together are under half a street win (₦4.80 < ₦5 x 2 / 2 is not it: under ₦5).
    expect(Object.values(OGUN_TAX).reduce((a, t) => a + t.cap, 0)).toBe(480);
  });

  it('the own part never holds the wallet; an odd part reads leniently', () => {
    const c = readOgunCity({ kobo: 999, power: 50, fixed: ['potholes', 'nope', 'potholes'], built: ['adire', 'x'], paid: { dryTaps: 4, potholes: 300 }, trays: { adire: 500, mill: 30 }, at: { x: 2000, y: 5 }, hints: [3, 'walk'] });
    expect(c.fixed).toEqual(['potholes']);
    expect(c.built).toEqual(['adire']);
    // A part payment on something done is dropped; trays only for built places, capped.
    expect(c.paid).toEqual({ dryTaps: 4 });
    expect(c.trays).toEqual({ adire: 120 });
    expect(c.at).toBeNull();
    expect(c.hints).toEqual(['walk']);
    expect(c.boom).toBe(8);
    const out = writeOgunCity(c);
    for (const k of WALLET_KEYS) expect(out).not.toHaveProperty(k);
    expect(readOgunCity('broken')).toEqual(emptyOgunCity());
  });

  it('paying takes only the right bucket of the one wallet; a part pay waits on the board; a full pay fixes and fills the meter by 4', () => {
    const c = emptyOgunCity();
    const part = payOgunBoard(c, W(700, 3, 9), 'potholes')!;
    expect(part.amount).toBe(700);
    expect(part.done).toBe(false);
    expect(part.wallet).toEqual(W(0, 3, 9));
    expect(part.city.paid.potholes).toBe(700);
    expect(leftOn(part.city, 'potholes')).toBe(500);
    const full = payOgunBoard(part.city, W(800, 3, 9), 'potholes')!;
    expect(full.done).toBe(true);
    expect(full.wallet).toEqual(W(300, 3, 9));
    expect(full.city.fixed).toEqual(['potholes']);
    expect(full.city.paid.potholes).toBeUndefined();
    expect(full.city.boom).toBe(4);
    // Power pays the pump, never Naira.
    expect(payOgunBoard(c, W(5000, 0, 9), 'dryTaps')).toBeNull();
    const pump = payOgunBoard(c, W(5000, 12, 9), 'dryTaps')!;
    expect(pump.wallet).toEqual(W(5000, 2, 9));
    expect(pump.city.fixed).toEqual(['dryTaps']);
    // Nothing to pay once done.
    expect(payOgunBoard(full.city, W(5000, 0, 0), 'potholes')).toBeNull();
  });

  it('boards: everything at once except the garri mill (after the new road) and the kola market (after the first boom)', () => {
    const c = emptyOgunCity();
    expect(ogunBoards(c)).toEqual(['potholes', 'adire', 'dryTaps', 'lightsOut', 'slowInternet']);
    const road: OgunCityState = { ...c, fixed: ['potholes'] };
    expect(ogunBoards(road)).toContain('mill');
    expect(ogunBoards(road)).not.toContain('kola');
    expect(ogunBoards({ ...road, boom: 20, boomSeen: FIRST_BOOM })).toContain('kola');
    // 6.4: 24 points of fixes before the first boom, so 20 is always reachable.
    const before = OGUN_BOARDS.filter((b) => b !== 'kola').length * 4;
    expect(before).toBe(24);
    expect(before).toBeGreaterThanOrEqual(FIRST_BOOM);
  });

  it('pins: ready when the wallet holds enough, fixed once paid; Bad road is the problem until the hall is won (OG-R37)', () => {
    const c = emptyOgunCity();
    expect(ogunLooks(c, W(0, 0, 0))).toEqual({ potholes: 'problem', dryTaps: 'problem', lightsOut: 'problem', slowInternet: 'problem', badRoad: 'problem' });
    expect(ogunLooks(c, W(1200, 8, 6))).toEqual({ potholes: 'ready', dryTaps: 'problem', lightsOut: 'ready', slowInternet: 'ready', badRoad: 'problem' });
    expect(ogunLooks(c, W(1200, 8, 6), true).badRoad).toBe('fixed');
    expect(ogunLooks({ ...c, fixed: ['potholes'] }, W()).potholes).toBe('fixed');
    // No wallet ever makes Bad road "ready": only the hall fixes it.
    expect(ogunLooks(c, W(99999, 99, 99)).badRoad).toBe('problem');
  });

  it('OG-R37: Bad road earns no Booming points; the gate and verge stay tired until the hall is won', () => {
    expect(OGUN_BOARDS).not.toContain('badRoad');
    expect(ogunBright(emptyOgunCity())).not.toEqual(expect.arrayContaining(['gate']));
    expect(ogunBright(emptyOgunCity())).not.toEqual(expect.arrayContaining(['verge']));
    expect(ogunBright(emptyOgunCity(), true)).toEqual(expect.arrayContaining(['gate', 'verge']));
    const w = OGUN_CITY_WORDS;
    expect(w.badRoad.line1).toBe('King Pothole is blocking the gateway.');
    expect(w.badRoad.clear).toBe('Clear Ota, Abeokuta and Sagamu to reach Pothole Hall.');
    expect([1, 2, 3].map(w.badRoad.run)).toEqual(['Run Ota', 'Run Abeokuta', 'Run Sagamu']);
    expect(w.badRoad.toHall).toBe('Go to Pothole Hall.');
    expect(w.badRoad.hall).toBe('Go to Pothole Hall');
    expect(w.built.badRoad).toBe('The gateway is open. The road is smooth.');
    expect(w.fixedName.badRoad).toBe('The gateway');
  });

  it('collect: the tray goes into the one wallet; a full tray fills the meter by 1, at most 4 from collecting each boom', () => {
    let c: OgunCityState = { ...emptyOgunCity(), built: ['adire'], trays: { adire: 120 } };
    const r = collectOgunTray(c, W(50, 1, 1), 'adire')!;
    expect(r.amount).toBe(120);
    expect(r.full).toBe(true);
    expect(r.wallet).toEqual(W(170, 1, 1));
    expect(r.city.trays.adire).toBe(0);
    expect(r.city.boom).toBe(c.boom + 1);
    expect(collectOgunTray({ ...c, trays: { adire: 5 } }, W(), 'adire')).toBeNull();
    for (let i = 0; i < 6; i++) c = addOgunBoom(c, 1, true);
    expect(c.boom).toBe(4);
    expect(c.boomCollect).toBe(4);
  });

  it('the boom card is due once at 20; the first boom lights all of Ogun', () => {
    let c = emptyOgunCity();
    for (let i = 0; i < 5; i++) c = addOgunBoom(c, 4);
    expect(c.boom).toBe(20);
    expect(ogunBoomDue(c)).toBe(20);
    expect(ogunBright(c)).not.toBeUndefined();
    const seen = { ...c, boomSeen: 20 };
    expect(ogunBoomDue(seen)).toBe(0);
    expect(ogunBright(seen)).toBeUndefined();
    // Before it: the gateway (once the hall is won) is bright, plus each fix's own part.
    expect(ogunBright(emptyOgunCity(), true)).toEqual(['gate', 'verge']);
    expect(ogunBright(emptyOgunCity())).toEqual([]);
    expect(ogunBright({ ...emptyOgunCity(), fixed: ['dryTaps'] })).toEqual(expect.arrayContaining(['water', 'motorPark']));
  });

  it('the garri mill earns only once the new road is built (6.2)', () => {
    const c: OgunCityState = { ...emptyOgunCity(), built: ['mill'] };
    expect(ogunEarning(c, 'mill')).toBe(false);
    expect(ogunEarning({ ...c, fixed: ['potholes'] }, 'mill')).toBe(true);
  });
});

describe('O6b: trays fill anywhere, saved under states.ogun.city (OG-R8)', () => {
  it('StateCity fills in steps up to the cap, the mill only with the road; it saves at most every 10 s, never the wallet', () => {
    const saves: Obj[] = [];
    let saved: unknown = { built: ['adire', 'mill'], trays: {}, kobo: 4000 };
    const sc = new StateCity(() => saved, (own) => (saves.push(own), (saved = own)), OGUN_TRAYS);
    expect(sc.own).not.toHaveProperty('kobo');
    expect(sc.tick(7.9)).toEqual([]);
    expect(sc.tick(0.2)).toEqual(['adire']);
    expect((sc.own['trays'] as Obj)['adire']).toBe(10);
    // Saved only after 10 s of play (W10).
    expect(saves).toHaveLength(0);
    sc.tick(2);
    expect(saves).toHaveLength(1);
    // 200 s more: capped at ₦1.20; the mill never filled (no road).
    for (let i = 0; i < 200; i++) sc.tick(1);
    expect((sc.own['trays'] as Obj)['adire']).toBe(120);
    expect((sc.own['trays'] as Obj)['mill']).toBeUndefined();
    expect(saves.length).toBeLessThanOrEqual(22);
    sc.set({ ...sc.own, fixed: ['potholes'], power: 9 }, true);
    expect(saves.at(-1)).not.toHaveProperty('power');
    sc.tick(15);
    expect((sc.own['trays'] as Obj)['mill']).toBe(30);
  });

  it('Lagos\'s CityLife tick (city screen, a run) ticks Ogun\'s trays in the same play time', () => {
    let saved: unknown = {};
    const life = new CityLife({ load: () => saved, save: (p) => ((saved = p), true) });
    const ogun = new StateCity(() => ({ built: ['kola'] }), () => undefined, OGUN_TRAYS);
    life.also = (dt) => void ogun.tick(dt);
    life.tick(12);
    expect((ogun.own['trays'] as Obj)['kola']).toBe(20);
  });

  it('Progress keeps Lagos\'s city and money apart from Ogun\'s own city part', () => {
    const { storage, data } = fakeStorage({
      [`gidi-${KEY_PROGRESS}`]: JSON.stringify({ v: 2, states: { lagos: { streets: { 1: DONE }, hall: DONE }, ogun: { hall: DONE } }, [KEY_CITY]: { kobo: 3000, power: 12, tech: 4, fixed: ['potholes', 'lightsOut'], fixes: 2 } }),
    });
    const p = new Progress(createStore(() => storage));
    const life = new CityLife({ load: () => p.raw?.[KEY_CITY], save: (part) => p.savePart(KEY_CITY, part) });
    const own = new StateCity(() => statePart(p.raw, OGUN)['city'], (o) => void p.saveStatePart(OGUN, 'city', o), OGUN_TRAYS);
    const r = payOgunBoard(readOgunCity(own.own), readWallet(life.state), 'potholes')!;
    life.set({ ...life.state, kobo: r.wallet.kobo, power: r.wallet.power, tech: r.wallet.tech }, true);
    own.set(writeOgunCity(r.city), true);
    const s = JSON.parse(data.get(`gidi-${KEY_PROGRESS}`)!) as Obj;
    const lagos = readCity(s[KEY_CITY]);
    expect(lagos.kobo).toBe(1800);
    expect(lagos.fixed).toEqual(['potholes', 'lightsOut']);
    expect(lagos.power).toBe(12);
    const og = (s['states'] as Obj)['ogun'] as Obj;
    expect((og['city'] as Obj)['fixed']).toEqual(['potholes']);
    expect(og['city']).not.toHaveProperty('kobo');
    expect(stateProgress(s, OGUN).hall.done).toBe(true);
  });
});

describe('O6b: walking Ogun from above', () => {
  it('the motor park, every mat and every place front are walkable and can be walked to from the motor park', () => {
    expect(ogunWalkable(OGUN_HOME)).toBe(true);
    for (const [k, m] of [...Object.entries(OGUN_MATS), ...Object.entries(OGUN_DOORS)]) {
      expect(ogunWalkable(m), k).toBe(true);
      const path = ogunPath(OGUN_HOME, m);
      expect(path.length, k).toBeGreaterThan(0);
      const end = path.at(-1)!;
      expect(Math.hypot(end.x - m.x, end.y - m.y), k).toBeLessThan(1);
      let at = OGUN_HOME as { x: number; y: number };
      for (const p of path) {
        expect(ogunLineClear(at, p), `${k} leg`).toBe(true);
        at = p;
      }
    }
  });

  it('a tap on a roof walks to the nearest open ground; the rocks along the top are scenery', () => {
    expect(ogunWalkable({ x: 600, y: 50 })).toBe(false);
    const n = ogunNearest({ x: 600, y: 50 });
    expect(ogunWalkable(n)).toBe(true);
    // Each mat stands by its pin or place.
    for (const s of ['potholes', 'dryTaps', 'lightsOut', 'slowInternet'] as const) expect(Math.hypot(OGUN_MATS[s].x - OGUN_SPOTS[s].pin.x, OGUN_MATS[s].y - OGUN_SPOTS[s].pin.y), s).toBeLessThan(240);
    for (const p of ['adire', 'mill', 'kola'] as const) expect(Math.hypot(OGUN_MATS[p].x - OGUN_PLACES[p].x, OGUN_MATS[p].y - OGUN_PLACES[p].y), p).toBeLessThan(60);
  });
});

describe('O6b: Ogun\'s challenge road (6.5)', () => {
  const view = (streets: number, hall: boolean, c: OgunCityState = emptyOgunCity(), goals = 0) => ({
    ogun: { streets: Object.fromEntries(Array.from({ length: streets }, (_, i) => [String(i + 1), DONE])), parcel: false, hall: hall ? DONE : { done: false, best: 0 } },
    city: c,
    wallet: W(),
    lane: { best: goals ? 640 : 0, goals },
  });

  it('every stop in road order, with plates in OGUN_STOP_BOX', () => {
    const stops = ogunStops(view(3, true));
    expect(stops.map((s) => s.id)).toEqual(['toLagos', 'ota', 'expressway', 'abeokuta', 'sagamu', 'hall', 'wayOn', 'border']);
    for (const s of stops) expect(OGUN_STOP_BOX[s.id as keyof typeof OGUN_STOP_BOX], String(s.id)).toBeDefined();
  });

  it('To Lagos is a link; the way on and the border market cannot be played', () => {
    const s = ogunStops(view(3, true));
    const to = s.find((x) => x.id === 'toLagos')!;
    expect(to.go).toBe(OGUN_CITY_WORDS.road.goLagos);
    expect(to.forFix).toBeNull();
    for (const id of ['wayOn', 'border']) {
      const x = s.find((y) => y.id === id)!;
      expect(x.state).toBe('soon');
      expect(x.go).toBeNull();
    }
    expect(s.find((y) => y.id === 'wayOn')!.line3).toBe('More of Nigeria');
    expect(s.find((y) => y.id === 'border')!.line3).toBe('Later');
  });

  it('streets open in order; Ota pays for the new road while it is not built', () => {
    const s = ogunStops(view(1, false));
    expect(s.find((x) => x.id === 'ota')!.state).toBe('done');
    expect(s.find((x) => x.id === 'abeokuta')!.state).toBe('next');
    expect(s.find((x) => x.id === 'sagamu')!.state).toBe('locked');
    expect(s.find((x) => x.id === 'sagamu')!.go).toBeNull();
    expect(s.find((x) => x.id === 'ota')!.forFix).toBe('potholes');
    expect(s.find((x) => x.id === 'ota')!.lines[1]).toBe('A win pays for the New road (₦12).');
    const built = ogunStops(view(3, true, { ...emptyOgunCity(), fixed: ['potholes'] }));
    expect(built.find((x) => x.id === 'ota')!.forFix).toBeNull();
  });

  it('the Expressway is for the pump, then the lamps, then the mast', () => {
    const c = emptyOgunCity();
    expect(expresswayFor(c)).toBe('dryTaps');
    expect(expresswayFor({ ...c, fixed: ['dryTaps'] })).toBe('lightsOut');
    expect(expresswayFor({ ...c, fixed: ['dryTaps', 'lightsOut'] })).toBe('slowInternet');
    expect(expresswayFor({ ...c, fixed: ['dryTaps', 'lightsOut', 'slowInternet'] })).toBeNull();
    const x = ogunStops(view(3, true, { ...c, paid: { dryTaps: 4 } })).find((y) => y.id === 'expressway')!;
    expect(x.forFix).toBe('dryTaps');
    expect(x.lines[1]).toBe('A win pays for the Water pump (Power 6 left).');
    const done = ogunStops(view(3, true, c, 2)).find((y) => y.id === 'expressway')!;
    expect(done.state).toBe('done');
    expect(done.line3).toBe('Best: 640 m');
  });
});

describe('O6b: the Ogun part gives the city, the road and the Expressway', () => {
  it('the part has a city, a road and a lane run (ogun-lane.json, theme expressway)', () => {
    expect(typeof ogunPart.city).toBe('function');
    expect(typeof ogunPart.road).toBe('function');
    const lane = ogunPart.lane!;
    expect((lane.level as Obj)['theme']).toBe('expressway');
    expect((lane.level as Obj)['id']).toBe('ogun-lane');
    expect(lane.look).toBe(EXPRESSWAY_LOOK);
    expect(lane.forFix({}, W(0, 3, 0))).toEqual({ fix: 'dryTaps', bucket: 'power', left: 10 });
    expect(lane.forFix({ fixed: ['dryTaps', 'lightsOut'] }, W())).toEqual({ fix: 'slowInternet', bucket: 'tech', left: 6 });
    expect(lane.forFix({ fixed: ['dryTaps', 'lightsOut', 'slowInternet'] }, W())).toBeNull();
    expect(ogunPart.left!({ paid: { potholes: 500 } }, 'potholes')).toBe(700);
  });

  it('the Expressway look: each danfo spot keeps one of the three vehicle looks; its scenery keys are art\'s', () => {
    for (let d = 40; d < 900; d += 37)
      for (const lane of [0, 1, 2]) {
        const k = EXPRESSWAY_LOOK.danfo(d, lane, 1);
        expect(k).toBe(vehicleKey(expresswayVehicleAt(d, lane), 1));
        expect(EXPRESSWAY_LOOK.danfo(d, lane, 1)).toBe(k);
      }
    expect(EXPRESSWAY_LOOK.sceneryKeys).toBe(EXPRESSWAY_SCENERY);
  });

  it('Pothole Hall\'s finish: the danfo leads the tipper out of the doors', () => {
    expect(ROLL_OUT.speed).toBeGreaterThan(0);
    expect(ROLL_OUT.gap).toBeGreaterThan(0);
  });
});
