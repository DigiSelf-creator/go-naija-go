/**
 * K6b: Kano's challenge road (docs/kano.md 6.4; the shape of ogun.md 6.5 and Ogun's roadPlan.ts):
 * the Lagos road screen (src/screens/road.ts) with Kano's stops, plates, picture and card pictures.
 * kanoStops() works out every stop's state, words and what a win is "for", with no DOM, so it is
 * unit tested; kanoRoad() hands the screen the plan.
 *
 * - "To Ogun" (start) is a link, not a challenge: it travels back to Ogun.
 * - Kurmi (always) pays for the Clean road while it is not built; the side road Harmattan Road
 *   (the lane run, always) pays for the lamps, then the mast.
 * - Kofar Mata opens once Kurmi is done, Dawanau once Kofar Mata is, Borehole Hall once Dawanau is
 *   ("A win brings ₦15 and gets the water flowing.").
 * - "The way on" is "Coming soon", "More of Nigeria", and cannot be played.
 * The picture is our own: the old wall and gate at the left, the savanna in gold haze, baobabs,
 * Kurmi's leather shades, Kofar Mata's dye pits behind a low wall, Dawanau's sacks, the water
 * yard's tank at the hall, and the road going on north past the works. Painted once.
 */
import type { PlanStop, RoadPlan, StopState } from '../../screens/road';
import type { CityKit } from '../ui';
import type { WorldRoadView } from '../load';
import { KANO, drawKanoGate, drawKanoWall } from './gate';
import { box, disc } from './kurmi';
import { drawCityDyePit, drawKanoShade, makeKanoCityCanvas } from './city';
import { sack } from './sacks';
import { KANO_CITY_WORDS } from './cityWords';
import { KANO_WORDS } from './words';
import { KANO_PRICES, boomed, kanoBright, kanoLooks, laneFix, leftOn, readKanoCity, readWallet, type KanoCityState, type KanoFixId, type Wallet } from './cityRules';

type G = CanvasRenderingContext2D;
type Words = CityKit['words'];

export const KANO_ROAD = { w: 816, h: 168 } as const;
/** Plate boxes (road units), as Lagos's and Ogun's: 112 x 64, main stops on y 92, the side stop on y 4. */
export const KANO_STOP_BOX: Readonly<Record<string, readonly [number, number, number, number]>> = {
  toOgun: [8, 92, 112, 64],
  lane: [76, 4, 112, 64],
  kurmi: [144, 92, 112, 64],
  kofarMata: [280, 92, 112, 64],
  dawanau: [416, 92, 112, 64],
  hall: [552, 92, 112, 64],
  wayOn: [688, 92, 112, 64],
};
const STREET_IDS = ['kurmi', 'kofarMata', 'dawanau'] as const;
/** Where the side road leaves the main road. */
const SIDE_X = 132;

export interface KanoRoadView {
  words: Words;
  money: (kobo: number) => string;
  spoken: (kobo: number) => string;
  /** Kano's streets and hall (states.kano). */
  kano: WorldRoadView['progress'];
  city: KanoCityState;
  wallet: Wallet;
  /** Harmattan Road's best whole metres and goals reached. */
  lane: { best: number; goals: number };
}

/** Every stop in road order (the screen reader's list). */
export function kanoStops(v: KanoRoadView): PlanStop[] {
  const w = v.words.road;
  const o = KANO_CITY_WORDS.road;
  const s = v.kano;
  const c = v.city;
  const rec = (n: number): { done: boolean; best: number } => s.streets[String(n)] ?? { done: false, best: 0 };
  const price = (b: KanoFixId): string => (KANO_PRICES[b].bucket === 'naira' ? v.money(leftOn(c, b)) : `${KANO_PRICES[b].bucket === 'power' ? 'Power' : 'Tech'} ${leftOn(c, b)}`);
  const pays = (b: KanoFixId): string => w.pays(KANO_CITY_WORDS.board[b], price(b), leftOn(c, b) < KANO_PRICES[b].price);
  const statusOf = (st: StopState): string => (st === 'locked' ? w.locked : st === 'done' ? w.done : st === 'soon' ? w.soon : w.open);
  const main: StopState[] = [1, 2, 3].map((n) => (rec(n).done ? 'done' : n <= 1 || rec(n - 1).done ? 'open' : 'locked'));
  main.push(s.hall.done ? 'done' : rec(3).done ? 'open' : 'locked');
  const nextAt = main.indexOf('open');
  if (nextAt >= 0) main[nextAt] = 'next';
  const link: PlanStop = { id: 'toOgun', state: 'open', heading: o.toOgun, name: o.toOgun, status: w.open, line3: null, parcel: false, spoken: `${o.toOgun}. ${o.toOgunLine}`, label: o.toOgun, lines: [o.toOgunLine], go: o.goOgun, forFix: null, cut: 'toOgun' };
  const out: PlanStop[] = [link];
  for (let k = 0; k < 4; k++) {
    const st = main[k]!;
    const hall = k === 3;
    const nm = hall ? KANO_WORDS.hall.name : KANO_WORDS.streets[k]!;
    const head = w.stop(k + 1);
    const r = hall ? s.hall : rec(k + 1);
    const best = !hall && st === 'done' ? v.money(r.best) : null;
    const forFix: KanoFixId | null = k === 0 && !c.fixed.includes('sandyRoad') ? 'sandyRoad' : null;
    const won = s.hall.done ? 1 : 0;
    const lines: string[] = hall ? [o.hallLines[won]!, o.hallLines[2 + won]!] : [o.streetLines[k]![st === 'done' ? 1 : 0]!, forFix ? pays(forFix) : o.earns];
    const locked = st === 'locked';
    if (locked) lines[1] = w.finish(KANO_WORDS.streets[hall ? 2 : k - 1]!);
    else if (best) lines.push(w.yourBest(best));
    const id = hall ? 'hall' : STREET_IDS[k]!;
    out.push({
      id,
      state: st,
      heading: head,
      name: nm,
      status: statusOf(st),
      line3: best ? w.best(best) : null,
      parcel: hall && s.parcel,
      spoken: `${head}, ${nm}. ${st === 'next' ? `${w.next}. ${w.open}` : st === 'done' ? 'Done' : statusOf(st)}.${locked ? ` ${lines[1]}` : ''}${best ? ` ${w.sayBest(v.spoken(r.best))}` : ''}`,
      label: `${head}: ${nm}`,
      lines,
      go: locked ? null : hall ? KANO_WORDS.cleared.toHall : w.run(nm),
      forFix: locked ? null : forFix,
      cut: id,
      ...(hall ? { pic: o.picHall } : {}),
    });
    // Harmattan Road's side road leaves between Kurmi and Kofar Mata.
    if (k === 0) {
      const fix = laneFix(c);
      const done = v.lane.goals > 0;
      const metres = done ? w.metres(v.lane.best) : null;
      const ll = [fix ? o.laneLines[fix] : o.laneLines.none, fix ? pays(fix) : w.earnsAll, ...(metres ? [w.yourBest(metres)] : [])];
      out.push({ id: 'lane', state: done ? 'done' : 'open', heading: w.side, name: o.lane, status: done ? w.done : w.open, line3: metres ? w.best(metres) : null, parcel: false, spoken: `${w.side}, ${o.lane}. ${done ? 'Done' : w.open}.${metres ? ` ${w.sayBest(w.sayMetres(v.lane.best))}` : ''}`, label: `${w.side}: ${o.lane}`, lines: ll, go: o.laneGo, forFix: fix, cut: 'lane' });
    }
  }
  out.push({ id: 'wayOn', state: 'soon', heading: o.wayOn, name: o.wayOn, status: w.soon, line3: o.wayOnLine, parcel: false, spoken: `${o.wayOn}. ${o.wayOnLine}. ${w.soon}.`, label: o.wayOn, lines: [o.wayOnLine, w.soon], go: null, forFix: null, cut: 'wayOn' });
  return out;
}

function baobab(g: G, x: number, y: number, s: number): void {
  box(g, x - 3 * s, y - 14 * s, 6 * s, 14 * s, '#9a7a5a', 0.8);
  for (const [dx, dy, r] of [[-6, -16, 5], [0, -19, 6], [6, -16, 5]] as const) disc(g, x + dx * s, y + dy * s, r * s, '#7f9a44', 0.8);
}

/** A small yellow bus seen from the side, at the Next stop (no writing). */
function bus(g: G, x: number, y: number): void {
  box(g, x - 22, y - 16, 44, 16, KANO.yellow, 1.2);
  for (let k = 0; k < 4; k++) box(g, x - 18 + k * 10, y - 13, 7, 6, '#cfe9f5', 0.6);
  for (const wx of [x - 13, x + 13]) disc(g, wx, y, 4, '#2a2a2a', 0.8);
}

/** The road picture at road units (816 x 168), painted once (and again when the Next stop or `lit` changes). */
export function drawKanoRoadPicture(g: G, lit: boolean, next: string | null): void {
  const { w, h } = KANO_ROAD;
  g.save();
  g.lineJoin = 'round';
  const sky = g.createLinearGradient(0, 0, 0, 90);
  sky.addColorStop(0, '#9fc6dc');
  sky.addColorStop(1, '#f6e2b0');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e1c787';
  g.fillRect(0, 70, w, h - 70);
  // Gold haze on the far plain (never grey, KN-R6), baobabs and far cattle
  g.fillStyle = 'rgba(246,226,176,0.5)';
  g.fillRect(0, 58, w, 14);
  for (const [x, s] of [[230, 1], [470, 0.8], [640, 1.1], [790, 0.7]] as const) baobab(g, x, 74, s);
  // The side road up to Harmattan Road
  g.fillStyle = '#6a645c';
  g.fillRect(SIDE_X - 8, 60, 16, 76);
  // Kurmi's leather shades, Kofar Mata's dye pits behind a low wall, Dawanau's sacks, the water tank
  for (let k = 0; k < 3; k++) drawKanoShade(g, 150 + k * 34, 88, 28, 8, ['#8a4b2a', KANO.red, '#b8742f'][k]!, KANO.cream);
  box(g, 290, 80, 92, 6, '#c8784a', 1);
  for (let k = 0; k < 3; k++) drawCityDyePit(g, 304 + k * 30, 74);
  for (let k = 0; k < 5; k++) sack(g, 424 + k * 18, 74 - (k % 2) * 4, 16, 14, ['#3f8f4a', KANO.indigo, KANO.red][k % 3]!);
  g.strokeStyle = '#6f6a62';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(596, 88);
  g.lineTo(600, 52);
  g.moveTo(620, 88);
  g.lineTo(616, 52);
  g.stroke();
  box(g, 588, 30, 40, 24, '#3b6fa8', 1.2);
  if (lit) for (let k = 0; k < 3; k++) box(g, 594 + k * 12, 54, 2, 30, '#5fbfe0', 0);
  // Cones at the works where the road goes on north
  for (const cx of [740, 770]) {
    g.fillStyle = '#f07a2b';
    g.beginPath();
    g.moveTo(cx - 5, 96);
    g.lineTo(cx, 80);
    g.lineTo(cx + 5, 96);
    g.closePath();
    g.fill();
  }
  // The main road: kerb, tarmac, dashes
  box(g, 0, 132, w, h - 132, '#5f5c62', 0);
  box(g, 0, 130, w, 3, '#f4efe0', 0);
  g.fillStyle = '#f4f1e6';
  for (let x = 4; x < w - 16; x += 22) g.fillRect(x, 160, 11, 2.5);
  // The old wall and our gate at the start ("To Ogun" leaves through it)
  drawKanoWall(g, 0, 52, 132, 0.42, lit);
  drawKanoGate(g, 64, 132, 0.42, { lit, still: true });
  const b = next ? KANO_STOP_BOX[next] : undefined;
  if (b) bus(g, b[0] + 30, b[1] < 50 ? 60 : 93);
  g.restore();
}

/** A stop card's drawn picture ("To Ogun", "The way on"): the road narrowing to the horizon, the gate or the works. */
function drawCardPicture(g: G, id: string, w: number, h: number, lit: boolean): void {
  const u = w / 112;
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#9fc6dc');
  sky.addColorStop(1, '#f6e2b0');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e1c787';
  g.fillRect(0, h * 0.58, w, h * 0.42);
  g.fillStyle = '#5f5c62';
  g.beginPath();
  g.moveTo(w * 0.47, h * 0.58);
  g.lineTo(w * 0.53, h * 0.58);
  g.lineTo(w * 0.9, h);
  g.lineTo(w * 0.1, h);
  g.closePath();
  g.fill();
  baobab(g, w * 0.12, h * 0.72, 1.4 * u);
  if (id === 'toOgun') drawKanoGate(g, w / 2, h * 0.8, 0.4 * u, { lit, still: true });
  else for (const cx of [w * 0.36, w * 0.64]) box(g, cx - 3 * u, h * 0.82, 6 * u, 8 * u, '#f07a2b', 0);
}

/** The still city for the card cuts, painted once per look (half a pixel a map unit). */
let cityPic: { key: string; img: HTMLCanvasElement | null } | null = null;
/** Cuts of the still city (map units, 4 by 3) for the stops that have a place on the map. */
const CUTS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  kurmi: [120, 560, 320, 240],
  kofarMata: [560, 100, 320, 240],
  dawanau: [1160, 360, 320, 240],
  lane: [800, 460, 320, 240],
  hall: [1160, 100, 320, 240],
};

/** The plan the road screen draws (`play` is the stop's big button: a run, Harmattan Road, or the ride to Ogun). */
export function kanoRoad(view: WorldRoadView, play: (st: PlanStop, e: MouseEvent) => void): RoadPlan | null {
  const kit = view.kit;
  if (!kit) return null;
  const city = readKanoCity(view.own);
  const lit = view.progress.hall.done;
  const v: KanoRoadView = { words: kit.words, money: kit.money, spoken: kit.spoken, kano: view.progress, city, wallet: readWallet(view.wallet), lane: view.lane };
  return {
    stops: kanoStops(v),
    w: KANO_ROAD.w,
    h: KANO_ROAD.h,
    box: (id) => KANO_STOP_BOX[String(id)] ?? [0, 0, 0, 0],
    paint: (g, next) => drawKanoRoadPicture(g, lit, next === null ? null : String(next)),
    card: (c, st) => {
      const g = c.getContext('2d');
      if (!g) return;
      const cut = CUTS[st.cut];
      if (!cut) return drawCardPicture(g, st.cut, c.width, c.height, lit);
      const looks = kanoLooks(city, v.wallet, lit);
      const bright = kanoBright(city, lit);
      const key = `${Object.values(looks)}|${bright}|${city.built}|${boomed(city)}|${lit}`;
      if (cityPic?.key !== key) cityPic = { key, img: makeKanoCityCanvas(looks, 0.5, 2048, { bright, built: city.built, boom: boomed(city), lit }) };
      if (cityPic.img) g.drawImage(cityPic.img, cut[0] * 0.5, cut[1] * 0.5, cut[2] * 0.5, cut[3] * 0.5, 0, 0, c.width, c.height);
    },
    play,
  };
}
