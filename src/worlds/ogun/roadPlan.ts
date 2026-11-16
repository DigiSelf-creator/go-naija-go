/**
 * O6b: Ogun's challenge road (docs/ogun.md 6.5; design.md S3e0): the Lagos road screen
 * (src/screens/road.ts) with Ogun's stops, plates, picture (art O6a, ./road.ts) and card pictures.
 * ogunStops() works out every stop's state, words and what a win is "for", with no DOM, so it is
 * unit tested; ogunRoad() hands the screen the plan.
 *
 * - "To Lagos" (start) is a link, not a challenge: it travels back to Lagos.
 * - Ota pays for the New road while it is not built; the Expressway (the lane run) pays for the
 *   pump, then the lamps, then the mast (CR-Q1 a, as Lagos's side road).
 * - Abeokuta opens once Ota is done, Sagamu once Abeokuta is; Pothole Hall once Sagamu is. The
 *   road is open from the first visit (OG-R35), so any stop may still be locked.
 * - "The way on" and "Border market" are "Coming soon" and cannot be played.
 */
import type { PlanStop, RoadPlan, StopState } from '../../screens/road';
import { WORDS, OGUN_WORDS } from '../../screens/words';
import { formatMoney, spokenMoney } from '../../game/money';
import { streetOpen, streetRecord, type StateProgress } from '../../game/progress';
import { OGUN_CARD_CUTS, OGUN_ROAD, OGUN_STOP_BOX, drawOgunCardCut, drawOgunCardPicture, drawOgunRoadPicture, type OgunStopId } from './road';
import { makeOgunCityCanvas } from './city';
import { OGUN_CITY_WORDS } from './cityWords';
import { OGUN_PRICES, leftOn, ogunBright, ogunLooks, boomed, type OgunCityState, type OgunFixId, type Wallet } from './cityRules';

export interface OgunRoadView {
  ogun: StateProgress;
  city: OgunCityState;
  wallet: Wallet;
  /** The Expressway's best whole metres and goals reached. */
  lane: { best: number; goals: number };
}

const price = (c: OgunCityState, b: OgunFixId): string => {
  const n = leftOn(c, b);
  const bucket = OGUN_PRICES[b].bucket;
  return bucket === 'naira' ? formatMoney(n) : `${bucket === 'power' ? 'Power' : 'Tech'} ${n}`;
};
const pays = (c: OgunCityState, b: OgunFixId): string => WORDS.road.pays(OGUN_CITY_WORDS.board[b], price(c, b), leftOn(c, b) < OGUN_PRICES[b].price);

/** Every stop in road order (the screen reader's list). */
export function ogunStops(v: OgunRoadView): PlanStop[] {
  const w = WORDS.road;
  const o = OGUN_CITY_WORDS.road;
  const names = OGUN_WORDS.streets;
  const s = v.ogun;
  const c = v.city;
  const statusOf = (st: StopState): string => (st === 'locked' ? w.locked : st === 'done' ? w.done : st === 'soon' ? w.soon : w.open);
  const say = (head: string, nm: string, st: StopState, extra: string): string => `${head ? `${head}, ` : ''}${nm}. ${st === 'next' ? `${w.next}. ${w.open}` : st === 'done' ? 'Done' : statusOf(st)}.${extra}`;
  const main: StopState[] = [1, 2, 3].map((n) => (streetRecord(s, n).done ? 'done' : streetOpen(s, n) ? 'open' : 'locked'));
  main.push(s.hall.done ? 'done' : streetRecord(s, 3).done ? 'open' : 'locked');
  const nextAt = main.indexOf('open');
  if (nextAt >= 0) main[nextAt] = 'next';
  const out: PlanStop[] = [];
  out.push({
    id: 'toLagos',
    state: 'open',
    heading: o.toLagos,
    name: o.toLagos,
    status: w.open,
    line3: null,
    parcel: false,
    spoken: `${o.toLagos}. ${o.toLagosLine}`,
    label: o.toLagos,
    lines: [o.toLagosLine],
    go: o.goLagos,
    forFix: null,
    cut: 'toLagos',
    icon: 'arch',
  });
  const road = c.fixed.includes('potholes');
  const streetLines = [o.otaLines, o.abeokutaLines, o.sagamuLines];
  for (let k = 0; k < 4; k++) {
    const st = main[k]!;
    const hall = k === 3;
    const nm = hall ? OGUN_WORDS.hall.name : names[k]!;
    const head = w.stop(k + 1);
    const rec = hall ? s.hall : streetRecord(s, k + 1);
    const best = !hall && st === 'done' ? formatMoney(rec.best) : null;
    const forFix: OgunFixId | null = k === 0 && !road ? 'potholes' : null;
    // OG-R42: the hall's lines follow Lagos's hall (never the wheel's "Ogun is turning..." line).
    const won = s.hall.done ? 1 : 0;
    const lines: string[] = hall ? [o.hallLines[won]!, o.hallLines[2 + won]!] : [streetLines[k]![st === 'done' ? 1 : 0]!, forFix ? pays(c, forFix) : o.earns];
    const locked = st === 'locked';
    if (locked) lines[1] = w.finish(hall ? names[2]! : names[k - 1]!);
    else if (best) lines.push(w.yourBest(best));
    const parcel = hall && s.parcel;
    if (parcel && !locked) lines.push(OGUN_WORDS.cleared.parcel);
    out.push({
      id: (['ota', 'abeokuta', 'sagamu', 'hall'] as const)[k]!,
      state: st,
      heading: head,
      name: nm,
      status: statusOf(st),
      line3: best ? w.best(best) : null,
      parcel,
      spoken: say(head, nm, st, `${locked ? ` ${lines[1]}` : ''}${best ? ` ${w.sayBest(spokenMoney(rec.best))}` : ''}`),
      label: `${head}: ${nm}`,
      lines,
      go: locked ? null : hall ? OGUN_WORDS.cleared.toHall : w.run(nm),
      forFix: locked ? null : forFix,
      cut: (['ota', 'abeokuta', 'sagamu', 'hall'] as const)[k]!,
      ...(hall ? { pic: o.picHall } : {}),
    });
    // The Expressway's side road leaves between Ota and Abeokuta.
    if (k === 0) out.push(expressway(v));
  }
  out.push(soon('wayOn', o.wayOn, o.wayOnLine, o.moreOfNigeria), soon('border', o.border, o.borderLine, w.moreSoon));
  return out;
}

/** The fix a win on the Expressway is for: the pump, then the lamps, then the mast (6.5), or null. */
export function expresswayFor(c: OgunCityState): 'dryTaps' | 'lightsOut' | 'slowInternet' | null {
  return (['dryTaps', 'lightsOut', 'slowInternet'] as const).find((f) => !c.fixed.includes(f)) ?? null;
}

function expressway(v: OgunRoadView): PlanStop {
  const w = WORDS.road;
  const o = OGUN_CITY_WORDS.road;
  const fix = expresswayFor(v.city);
  const done = v.lane.goals > 0;
  const metres = done ? w.metres(v.lane.best) : null;
  const lines = [fix ? o.expresswayLines[fix] : o.expresswayLines.none, fix ? pays(v.city, fix) : w.earnsAll];
  if (metres) lines.push(w.yourBest(metres));
  return {
    id: 'expressway',
    state: done ? 'done' : 'open',
    heading: w.side,
    name: o.expressway,
    status: done ? w.done : w.open,
    line3: metres ? w.best(metres) : null,
    parcel: false,
    spoken: `${w.side}, ${o.expressway}. ${done ? 'Done' : w.open}.${metres ? ` ${w.sayBest(w.sayMetres(v.lane.best))}` : ''}`,
    label: `${w.side}: ${o.expressway}`,
    lines,
    go: o.expresswayGo,
    forFix: fix,
    cut: fix === 'lightsOut' ? 'interchange' : fix === 'slowInternet' ? 'estate' : 'waterPoint',
  };
}

/** "The way on" and "Border market": a coming-soon stop, spoken "{name}. {line} Coming soon." (OG-R42). */
function soon(id: 'wayOn' | 'border', name: string, line: string, line3: string): PlanStop {
  const w = WORDS.road;
  return { id, state: 'soon', heading: name, name, status: w.soon, line3, parcel: false, spoken: `${name}. ${line} ${w.soon}.`, label: name, lines: [line, w.soon], go: null, forFix: null, cut: id };
}

/** The still city for the card cuts, painted once per look (half a pixel a map unit). */
let cityPic: { key: string; img: HTMLCanvasElement | null } | null = null;
function cityFor(c: OgunCityState, wallet: Wallet, hallWon: boolean): HTMLCanvasElement | null {
  const looks = ogunLooks(c, wallet, hallWon);
  const bright = ogunBright(c, hallWon);
  const key = `${Object.values(looks).join(',')}|${bright.join(',')}|${c.built.join(',')}|${boomed(c)}`;
  if (cityPic?.key !== key) cityPic = { key, img: makeOgunCityCanvas(looks, 0.5, 2048, { bright, built: c.built, boom: boomed(c) }) };
  return cityPic.img;
}

const CUT_OF: Readonly<Record<string, keyof typeof OGUN_CARD_CUTS>> = { ota: 'ota', abeokuta: 'abeokuta', sagamu: 'sagamu', waterPoint: 'waterPoint', interchange: 'interchange', estate: 'estate' };

/** The plan the road screen draws (`play` is the stop's big button: a run, the Expressway, or the ride to Lagos). */
export function ogunRoad(v: OgunRoadView, play: (st: PlanStop, e: MouseEvent) => void, still: () => boolean): RoadPlan {
  return {
    stops: ogunStops(v),
    w: OGUN_ROAD.w,
    h: OGUN_ROAD.h,
    box: (id) => {
      const b = OGUN_STOP_BOX[id as OgunStopId];
      return [b.x, b.y, b.w, b.h];
    },
    paint: (g, next) => drawOgunRoadPicture(g, { lit: v.ogun.hall.done, next: next === null ? null : (String(next) as OgunStopId) }),
    card: (c, st) => {
      const g = c.getContext('2d');
      if (!g) return;
      const cut = CUT_OF[st.cut];
      if (st.cut === 'toLagos' || st.cut === 'wayOn' || st.cut === 'border') drawOgunCardPicture(g, st.cut, c.width, c.height, 0, still());
      else if (cut) {
        const city = cityFor(v.city, v.wallet, v.ogun.hall.done);
        if (city) drawOgunCardCut(g, city, 0.5, OGUN_CARD_CUTS[cut], c.width, c.height);
      } else {
        // Pothole Hall: its part of the road picture (lit once won).
        const b = OGUN_STOP_BOX.hall;
        const k = c.width / 152;
        g.save();
        g.scale(k, k);
        g.translate(-(b.x + b.w / 2 - 76), -24);
        drawOgunRoadPicture(g, { lit: v.ogun.hall.done, next: null });
        g.restore();
      }
    },
    play,
  };
}
