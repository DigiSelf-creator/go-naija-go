/**
 * The challenge road (docs/design.md S3e0): the Streets screen became a road of Lagos bus stops.
 * stopCards() works out every stop's state, words and what a win is "for", with no DOM, so it is
 * unit tested; roadScreen() lays the road out, scrolls it and opens the stop card.
 * The pictures are art S3e1a's (src/art/road.ts), loaded when the road first opens.
 */
import type { HeroLook } from '../art/hero';
import { drawCardFallback, drawCardOverlay, drawRoadPicture, edgeArrowSvg, nextPennantSvg, roadIconSvg, tickBadgeSvg, type RoadIcon, type StopId as ArtStop } from '../art/road';
import { cardSceneSvg } from '../art/cards';
import type { BuildId } from '../art/payspot';
import { shownBoom } from '../game/boom';
import { BOOM_BUILD, FIRST_BOOM, isBuilt, leftOf, priceOf, type CityState } from '../game/city';
import { formatMoney, spokenMoney } from '../game/money';
import { hallOpen, streetOpen, streetRecord, type StateProgress } from '../game/progress';
import { drawCityCut } from './city';
import { button, h } from './dom';
import { EVENT_SCREEN_GUARD_MS } from './menus';
import { OGUN_WORDS, WORDS } from './words';
import { gateIconSvg } from '../art/gateway';
import { drawOgunBranch, OGUN_STOP_BOX } from '../art/gatewayRoad';

/**
 * CR-Q1 (open for Tp): a win from a stop pays for that stop's fix (answer a). False is answer b:
 * every stop's win is "for nothing" and the three CR-Q1 lines say what the stop earns.
 */
export const STOP_PAYS_FIX = true;

/** Street index (0 is Alausa), the hall, the side road's lane run, the ferry, or the side road to Ogun (O1b2). */
export type StopId = 0 | 1 | 2 | 'hall' | 'lane' | 'ferry' | 'ogun';
export type StopState = 'locked' | 'open' | 'next' | 'done' | 'soon' | 'built';
/** Which cut of the still city the card shows (part 5), or the hall picture. */
export type CutId = 'alausa' | 'cv' | 'ikeja' | 'ferry' | 'hall' | 'ogun';

/** The road picture is 680 x 168 road units (part 4). */
export const ROAD_W = 680;
export const ROAD_H = 168;
/** Each stop's button box in road units, in road order (part 4). */
export const STOP_BOX: Readonly<Record<StopId, readonly [number, number, number, number]>> = {
  0: [8, 92, 112, 64],
  lane: [76, 4, 112, 64],
  1: [144, 92, 112, 64],
  2: [280, 92, 112, 64],
  hall: [416, 92, 112, 64],
  ferry: [552, 92, 112, 64],
  // O1b2 (ogun.md 1.2): up and off the right, between the hall and the Ferry.
  ogun: [OGUN_STOP_BOX.x, OGUN_STOP_BOX.y, OGUN_STOP_BOX.w, OGUN_STOP_BOX.h],
};
/** Road order (and the screen reader list's order). */
export const ROAD_ORDER: readonly StopId[] = [0, 'lane', 1, 2, 'hall', 'ogun', 'ferry'];
/** The card's cut of the city (map x, y, w, h; 4 by 3). */
export const CUTS: Readonly<Record<Exclude<CutId, 'hall' | 'ogun'>, readonly [number, number, number, number]>> = {
  alausa: [0, 335, 240, 180],
  cv: [1163, 301, 320, 240],
  ikeja: [536, 579, 320, 240],
  ferry: [290, 760, 320, 240],
};

export interface RoadView {
  lagos: StateProgress;
  /** Street names in order (from the level files). */
  names: readonly string[];
  city: CityState;
  /** The lane part: best whole metres and goals reached. */
  lane: { best: number; goals: number };
  /** O1b2: King Pothole is beaten (the "To Ogun" arch is bright). */
  ogunLit?: boolean;
}

export interface StopInfo {
  id: StopId;
  state: StopState;
  /** "Stop 1", "Side road", "The ferry". */
  heading: string;
  name: string;
  /** The plate's status line and line 3 ("Best: ₦8.70", "Fixes to go: 3"), or null. */
  status: string;
  line3: string | null;
  /** The hall's parcel icon. */
  parcel: boolean;
  /** What the stop button says to screen readers. */
  spoken: string;
  /** The card's dialog name ("Stop 1: Alausa"). */
  label: string;
  /** The card's lines, in order (empty ones left out). */
  lines: string[];
  /** The card's big button, or null (locked, the ferry). */
  go: string | null;
  /** The fix a win from this stop pays for (CR-Q1), or null. */
  forFix: BuildId | null;
  cut: CutId;
}

/** What is still to pay, in words: "₦10", "Power 4". */
function price(c: CityState, b: BuildId): string {
  const n = leftOf(c, b);
  return b === 'road' ? formatMoney(n) : `${b === 'lamps' ? 'Power' : 'Tech'} ${n}`;
}
const pays = (c: CityState, b: BuildId, name: string): string => WORDS.road.pays(name, price(c, b), leftOf(c, b) < priceOf(b));

/**
 * Every stop in road order (part 2, 3, 5 and 9). `laneFor` is the fix a city card's "See the
 * stop" asked for (the Slow internet card: the Mast, even while the Lamps are not built).
 */
export function stopCards(v: RoadView, laneFor: BuildId | null = null): StopInfo[] {
  const w = WORDS.road;
  const c = v.city;
  const s = v.lagos;
  const n = v.names.length;
  const name = (i: number): string => v.names[i] ?? '';
  const state = (i: number | 'hall'): StopState => {
    const done = i === 'hall' ? s.hall.done : streetRecord(s, i + 1).done;
    return done ? 'done' : (i === 'hall' ? hallOpen(s, n) : streetOpen(s, i + 1)) ? 'open' : 'locked';
  };
  const main: (number | 'hall')[] = [0, 1, 2, 'hall'];
  const states = main.map(state);
  const next = states.indexOf('open');
  if (next >= 0) states[next] = 'next';
  const out: StopInfo[] = [];
  const statusOf = (st: StopState): string => (st === 'locked' ? w.locked : st === 'done' ? w.done : w.open);
  const say = (head: string, nm: string, st: StopState, extra: string): string =>
    `${head ? `${head}, ` : ''}${nm}. ${st === 'next' ? `${w.next}. ${w.open}` : st === 'done' ? 'Done' : statusOf(st)}.${extra}`;
  const road = isBuilt(c, 'road');
  const mast = isBuilt(c, 'mast');
  const lamps = isBuilt(c, 'lamps');
  for (const [k, id] of main.entries()) {
    const st = states[k]!;
    const hall = id === 'hall';
    const nm = hall ? w.hall : name(id);
    const head = w.stop(k + 1);
    const rec = hall ? s.hall : streetRecord(s, id + 1);
    const best = !hall && st === 'done' ? formatMoney(rec.best) : null;
    const forFix = STOP_PAYS_FIX && id === 0 && !road ? 'road' : null;
    const lines =
      id === 0
        ? road
          ? [w.road[1]!, w.earns]
          : [w.road[0]!, forFix ? pays(c, 'road', 'New road') : w.earns]
        : id === 1
          ? mast
            ? [w.cv[1]!, w.earns]
            : [w.cv[0]!, w.cv[2]!]
          : id === 2
            ? lamps
              ? [w.ikeja[1]!, w.earns]
              : [w.ikeja[0]!, w.ikeja[2]!]
            : s.hall.done
              ? [w.hallLines[1]!, w.hallLines[3]!]
              : [w.hallLines[0]!, w.hallLines[2]!];
    const locked = st === 'locked';
    if (locked) lines[1] = w.finish(hall ? name(n - 1) : name((id as number) - 1));
    else if (best) lines.push(w.yourBest(best));
    const parcel = hall && s.parcel;
    if (parcel && !locked) lines.push(w.parcel);
    out.push({
      id: id as StopId,
      state: st,
      heading: head,
      name: nm,
      status: statusOf(st),
      line3: best ? w.best(best) : null,
      parcel,
      spoken: say(head, nm, st, `${locked ? ` ${lines[1]}` : ''}${best ? ` ${w.sayBest(spokenMoney(rec.best))}` : ''}${parcel ? ` ${w.parcel}` : ''}`),
      label: `${head}: ${nm}`,
      lines,
      go: locked ? null : hall ? w.toHall : w.run(nm),
      forFix: locked ? null : forFix,
      cut: id === 0 ? 'alausa' : id === 1 ? 'cv' : id === 2 ? 'ikeja' : 'hall',
    });
  }
  // The side road: always open; for the Lamps, then the Mast (or what a city card asked for).
  const fix: BuildId | null = STOP_PAYS_FIX ? (laneFor && !isBuilt(c, laneFor) ? laneFor : !lamps ? 'lamps' : !mast ? 'mast' : null) : null;
  const showing = fix ?? (!lamps ? 'lamps' : !mast ? 'mast' : null);
  const laneDone = v.lane.goals > 0;
  const metres = laneDone ? w.metres(v.lane.best) : null;
  const laneLines = [
    showing === 'lamps' ? w.ikeja[0]! : showing === 'mast' ? w.cv[0]! : w.bothOn,
    fix ? pays(c, fix, fix === 'lamps' ? 'Lamps' : 'Mast') : w.earnsAll,
  ];
  if (metres) laneLines.push(w.yourBest(metres));
  out.splice(1, 0, {
    id: 'lane',
    state: laneDone ? 'done' : 'open',
    heading: w.side,
    name: w.lane,
    status: laneDone ? w.done : w.open,
    line3: metres ? w.best(metres) : null,
    parcel: false,
    spoken: say(w.side, w.lane, laneDone ? 'done' : 'open', metres ? ` ${w.sayBest(w.sayMetres(v.lane.best))}` : ''),
    label: `${w.side}: ${w.lane}`,
    lines: laneLines,
    go: w.lane,
    forFix: fix,
    cut: showing === 'mast' ? 'cv' : 'ikeja',
  });
  // O1b2 (ogun.md 1.2): "To Ogun", locked until Go-Slow Hall is won; it goes to Ogun, never a run.
  const o = OGUN_WORDS.toOgun;
  const ogunOpen = s.hall.done;
  out.push({
    id: 'ogun',
    state: ogunOpen ? 'open' : 'locked',
    heading: o.stop,
    name: o.stop,
    status: ogunOpen ? o.open : w.locked,
    line3: ogunOpen ? null : o.lockedShort,
    parcel: false,
    spoken: `${o.stop}. ${ogunOpen ? `${o.open}. ${o.line}` : `${w.locked}. ${o.locked}`}`,
    label: o.stop,
    lines: ogunOpen ? [o.line] : [o.locked],
    go: ogunOpen ? o.go : null,
    forFix: null,
    cut: 'ogun',
  });
  // The ferry: "Coming soon" until the first boom, then "Built".
  const boomed = shownBoom(c).boom;
  const toGo = Math.max(1, Math.ceil((FIRST_BOOM - c.boom) / BOOM_BUILD));
  out.push({
    id: 'ferry',
    state: boomed ? 'built' : 'soon',
    heading: w.theFerry,
    name: w.ferry,
    status: boomed ? w.built : w.soon,
    line3: boomed ? w.moreSoon : w.toGo(toGo),
    parcel: false,
    spoken: `${w.ferry}. ${boomed ? w.sayBuilt : w.saySoon(toGo)}`,
    label: w.theFerry,
    lines: boomed ? [w.ferryLines[1]!, w.ferryLines[2]!] : [w.ferryLines[0]!, w.ferryBoom(Math.min(c.boom, FIRST_BOOM))],
    go: null,
    forFix: null,
    cut: 'ferry',
  });
  return out;
}

/**
 * Part 4 "Scale": 1 when the road does not fit across at scale 1 (it scrolls), else the
 * smallest of 2, open width / 680 and open height / 168.
 */
export function roadScale(openW: number, openH: number, rw: number = ROAD_W, rh: number = ROAD_H): number {
  return openW < rw ? 1 : Math.max(0.5, Math.min(2, openW / rw, openH / rh));
}

/** Where the road opens (part 4 rule 4): the stop asked for, else the Next stop, else the start. */
export function openingStop<S extends PlanStop>(stops: readonly S[], at: StopId | string | null | undefined): S | null {
  return stops.find((s) => s.id === at) ?? stops.find((s) => s.state === 'next') ?? null;
}

// ---------- The screen ----------

/**
 * Art S3e1a's road pictures (src/art/road.ts): part of the road screen's own lazy part, never the
 * first page. O6b: imported by name (no module object), so the Ogun part can share src/art/road.ts
 * with this screen without the build making an extra shared chunk.
 */
const ART = { drawRoadPicture, drawCardOverlay, drawCardFallback, edgeArrowSvg, nextPennantSvg, roadIconSvg, tickBadgeSvg };
type Art = typeof ART;
export const roadArt = (): Promise<Art> => Promise.resolve(ART);
/** Our stop ids to art's (the "To Ogun" stop is drawn by src/art/gateway.ts). */
const ART_ID: Record<string, ArtStop> = { 0: 'alausa', 1: 'computerVillage', 2: 'ikeja', hall: 'hall', lane: 'lane', ferry: 'ferry' };
/** The icon each state shows (a shape for every state, part 3). */
const STATE_ICON: Record<StopState, RoadIcon> = { locked: 'padlock', open: 'bus', next: 'bus', done: 'tick', soon: 'ferry', built: 'ferry' };
const ic = (k: string): string => `<i class="road-ic" data-ic="${k}"></i>`;

/** O6b: a stop on another state's road: Lagos's StopInfo with any id, cut and fix. */
export interface PlanStop extends Omit<StopInfo, 'id' | 'cut' | 'forFix'> {
  id: StopId | string;
  cut: string;
  forFix: string | null;
  /** The plate's status icon in place of the state's (the "To Lagos" arch). */
  icon?: 'arch';
}

/**
 * O6b: another state's challenge road from its lazy part (Ogun's, ogun.md 6.5): the same screen
 * and rules with that state's stops, plate boxes (road units), picture and card pictures.
 */
export interface RoadPlan {
  stops: PlanStop[];
  box(id: StopId | string): readonly [number, number, number, number];
  w: number;
  h: number;
  /** The road picture at road units (the Next stop's id, or null). */
  paint(g: CanvasRenderingContext2D, next: StopId | string | null): void;
  /** A stop card's picture into its canvas (device pixels). */
  card(c: HTMLCanvasElement, st: PlanStop): void;
  /** A stop's big button. */
  play(st: PlanStop, e: MouseEvent): void;
}

export interface RoadOpen {
  /** Open on this stop (from a city card, or after that stop's run). */
  at?: StopId | string | null;
  /** With its card open (a city card's "See the stop"). */
  card?: boolean;
  /** The fix that city card was for (the lane run's Lamps or Mast). */
  laneFor?: BuildId | null;
  /** O6b: another state's road (Ogun's), in place of Lagos's. */
  plan?: RoadPlan;
}

export interface RoadHooks {
  view(): RoadView;
  look(): HeroLook;
  still(): boolean;
  /** The top row's Sound button. */
  soundButton: HTMLElement;
  home(): void;
  /** The big button: start that stop's run "for" its fix. */
  play(stop: StopInfo, e: MouseEvent): void;
  /** A locked stop was tapped (lockedTuk). */
  locked(): void;
  /** The first-visit hint is due: true once, and it is saved as seen. */
  hintDue(): boolean;
  /** A card opened or closed (the back button's 0.4 s guard starts again). */
  cardChanged?(): void;
}

export interface RoadScreen {
  el: HTMLElement;
  refit(): void;
  close(): void;
}

export function roadScreen(hooks: RoadHooks, open: RoadOpen = {}): RoadScreen {
  const w = WORDS.road;
  const v = hooks.view();
  const plan = open.plan;
  const stops: PlanStop[] = plan ? plan.stops : stopCards(v, open.laneFor ?? null);
  const boxOf = (id: StopId | string): readonly [number, number, number, number] => (plan ? plan.box(id) : STOP_BOX[id as StopId]);
  const RW = plan ? plan.w : ROAD_W;
  const RH = plan ? plan.h : ROAD_H;
  let s = 1;
  let shownAt = performance.now();
  let fitted = false;
  let cardEl: HTMLElement | null = null;
  let cardStop: PlanStop | null = null;
  let timer = 0;
  let downAt: { x: number; y: number } | null = null;
  let moved = false;
  const soon = (e: MouseEvent): boolean => e.detail > 0 && (moved || performance.now() - shownAt < EVENT_SCREEN_GUARD_MS);

  const btns = stops.map((st) => {
    const [x, y, bw, bh] = boxOf(st.id);
    const b = button('', `road-stop ${st.state}`, (e) => {
      if (soon(e)) return;
      if (st.state === 'locked') hooks.locked();
      openCard(st);
    }, { 'data-where': String(st.id), 'aria-label': st.spoken, 'aria-disabled': st.state === 'locked' ? 'true' : undefined, style: `left:${x}em;top:${y}em;width:${bw}em;height:${bh}em` });
    // The plate inside the button (the button's own box stays still while the Next plate bobs).
    b.innerHTML =
      `<span class="road-plate"><span class="road-name">${st.name}${st.parcel ? ic('parcel') : ''}</span><span class="road-st">${ic((st.id === 'ogun' && st.state === 'open') || st.icon ? 'arch' : STATE_ICON[st.state])}${st.status}</span>` +
      (st.line3 ? `<span class="road-l3">${st.line3}</span>` : '') +
      (st.state === 'next' ? `<span class="road-next" data-ic="next"></span>` : st.state === 'done' || st.state === 'built' ? `<span class="road-tick" data-ic="tick"></span>` : '') +
      '</span>';
    return b;
  });
  const list = h('ol', { class: 'road-stops', 'aria-label': w.list }, ...btns.map((b) => h('li', {}, b)));
  const road = h('div', { class: 'road' }, list);
  const pic = h('canvas', { class: 'road-pic', 'aria-hidden': 'true' });
  road.prepend(pic);
  const next = stops.find((x) => x.state === 'next');
  let painted = '';
  let art: Art | null = null;
  /** The road picture, painted once at s x devicePixelRatio; again only when s changes. */
  const paintRoad = (): void => {
    const k = s * Math.min(window.devicePixelRatio || 1, 2);
    const g = pic.getContext('2d');
    if (!art || !g || painted === String(k)) return;
    painted = String(k);
    pic.width = Math.round(RW * k);
    pic.height = Math.round(RH * k);
    g.setTransform(k, 0, 0, k, 0, 0);
    if (plan) return plan.paint(g, next?.id ?? null);
    art.drawRoadPicture(g, { jetty: shownBoom(v.city).boom ? 'after' : 'before', next: next && ART_ID[String(next.id)] ? ART_ID[String(next.id)]! : null });
    drawOgunBranch(g, v.lagos.hall.done, v.ogunLit === true);
  };
  const scroller = h('div', { class: 'road-scroll' }, road);
  const arrow = (dir: -1 | 1): HTMLButtonElement => {
    const a = button('', `road-arrow ${dir < 0 ? 'l' : 'r'}`, () => scroller.scrollBy({ left: dir * 136 * s, behavior: hooks.still() ? 'auto' : 'smooth' }), { 'aria-hidden': 'true', tabindex: '-1' });
    a.dataset['ic'] = dir < 0 ? 'left' : 'right';
    return a;
  };
  const left = arrow(-1);
  const right = arrow(1);
  const wrap = h('div', { class: 'road-wrap' }, scroller, left, right);
  const home = button('', 'minor road-home', () => hooks.home());
  home.innerHTML = `${ic('house')}<span>${w.home}</span>`;
  const hint = h('p', { class: 'road-hint', hidden: true, 'aria-live': 'polite' });
  const spot = h('div', { class: 'road-dim', hidden: true });
  const el = h('div', { class: 'card road-screen', role: 'region', 'aria-label': w.heading }, h('div', { class: 'road-top' }, home, h('h2', {}, w.heading), hooks.soundButton), hint, wrap, spot);
  void roadArt()
    .then((a) => {
      art = a;
      // The icons, the Next pennant, the tick badges and the edge arrows: art's shapes.
      for (const e of el.querySelectorAll<HTMLElement>('[data-ic]')) {
        const k = e.dataset['ic']!;
        e.innerHTML = k === 'next' ? a.nextPennantSvg() : k === 'tick' ? a.tickBadgeSvg() : k === 'left' || k === 'right' ? a.edgeArrowSvg(k) : k === 'arch' ? gateIconSvg('arch') : a.roadIconSvg(k as RoadIcon);
      }
      paintRoad();
    })
    .catch(() => undefined);

  const arrows = (): void => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    left.hidden = scroller.scrollLeft <= 1;
    right.hidden = scroller.scrollLeft >= max - 1;
  };
  scroller.addEventListener('scroll', arrows, { passive: true });
  // A mouse wheel or trackpad scrolls the road sideways; nothing scrolls up and down.
  scroller.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
  // A finger that moves more than 8 px is a scroll, never a tap on a stop.
  scroller.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    moved = false;
  });
  scroller.addEventListener('pointermove', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) moved = true;
  });
  scroller.addEventListener('scroll', () => {
    if (downAt) moved = true;
  }, { passive: true });
  const up = (): void => {
    downAt = null;
  };
  window.addEventListener('pointerup', up, true);

  const centre = (st: PlanStop): void => {
    const [x, , bw] = boxOf(st.id);
    scroller.scrollLeft = (x + bw / 2) * s - scroller.clientWidth / 2;
  };
  // Focusing a stop scrolls it fully into view with 16 px to spare.
  list.addEventListener('focusin', (e) => {
    const b = e.target as HTMLElement;
    const r = b.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const d = r.left < box.left + 16 ? r.left - box.left - 16 : r.right > box.right - 16 ? r.right - box.right + 16 : 0;
    if (d) scroller.scrollBy({ left: d, behavior: hooks.still() ? 'auto' : 'smooth' });
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (cardEl) closeCard();
      else hooks.home();
      return;
    }
    if (cardEl || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const to = btns[Math.max(0, Math.min(btns.length - 1, i < 0 ? 0 : i + (e.key === 'ArrowLeft' ? -1 : 1)))];
    e.preventDefault();
    to?.focus();
  });

  function openCard(st: PlanStop): void {
    const back = button(w.back, 'minor', (e) => {
      if (!soon(e)) closeCard();
    });
    const go = st.go
      ? button(st.go, 'go', (e) => {
          if (soon(e)) return;
          // O1c-2: "To Ogun" may open the download card over the road; this card closes first,
          // so Android back finds the download card's "Not now", not this card's hidden "Back".
          if (st.id === 'ogun' || plan) closeCard();
          if (plan) plan.play(st, e);
          else hooks.play(st as StopInfo, e);
        })
      : null;
    let picEl: HTMLElement;
    if (plan) picEl = h('canvas', { class: 'road-card-pic', role: 'img', 'aria-label': w.pic(st.name) });
    else if (st.cut === 'ogun') {
      // O1b2: the gateway arch for the "To Ogun" card.
      picEl = h('span', { class: 'road-card-pic road-card-arch', role: 'img', 'aria-label': st.lines[0]! });
      picEl.innerHTML = gateIconSvg('arch', 64);
    } else if (st.cut === 'hall') {
      picEl = h('span', { class: 'road-card-pic', role: 'img', 'aria-label': w.picHall });
      picEl.innerHTML = cardSceneSvg('hall', st.state === 'locked' ? 'locked' : st.state === 'done' ? 'done' : 'open').replace(/opacity="[\d.]+"/, '');
    } else picEl = h('canvas', { class: 'road-card-pic', role: 'img', 'aria-label': w.pic(st.name) });
    const lines = st.lines.map((l, i) => h('p', {}, i === 0 ? h('b', {}, l) : l));
    cardEl = h('div', { class: 'card road-card', role: 'dialog', 'aria-label': st.label }, h('h2', {}, st.heading), h('div', { class: 'road-card-body' }, picEl, h('div', {}, ...lines)), h('div', { class: 'road-card-row' }, go, back));
    cardStop = st;
    spot.replaceChildren(cardEl);
    spot.hidden = false;
    shownAt = performance.now();
    moved = false;
    if (picEl instanceof HTMLCanvasElement) {
      if (plan) {
        const c = picEl;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round((c.clientWidth || 112) * dpr);
        c.height = Math.round((c.clientHeight || 84) * dpr);
        plan.card(c, st);
      } else paintCut(picEl, st as StopInfo);
    }
    (go ?? back).focus({ preventScroll: true });
    hooks.cardChanged?.();
  }
  function closeCard(): void {
    const st = cardStop;
    cardEl = null;
    cardStop = null;
    spot.hidden = true;
    spot.replaceChildren();
    shownAt = performance.now();
    window.clearTimeout(timer);
    if (st) btns[stops.indexOf(st)]?.focus({ preventScroll: true });
    hooks.cardChanged?.();
  }
  /** The cut of the still city, tired or bright as it is now, with the sign, a danfo and your hero. */
  function paintCut(c: HTMLCanvasElement, st: StopInfo): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round((c.clientWidth || 112) * dpr);
    c.height = Math.round((c.clientHeight || 84) * dpr);
    const g = c.getContext('2d');
    if (!g) return;
    const cut = CUTS[st.cut as Exclude<CutId, 'hall' | 'ogun'>];
    void roadArt().then((a) => {
      const over = (): void => a.drawCardOverlay(g, c.width, c.height, { name: st.name, hero: hooks.look(), still: hooks.still(), bus: st.id !== 'ferry' });
      if (!cardEl?.contains(c)) return;
      if (drawCityCut(g, v.city, cut, c.width, c.height, false)) return over();
      // The still city is not painted yet: art's sand picture with the sign, the danfo and the hero first.
      a.drawCardFallback(g, c.width, c.height);
      over();
      timer = window.setTimeout(() => {
        if (cardEl?.contains(c) && drawCityCut(g, v.city, cut, c.width, c.height, true)) over();
      }, 30);
    });
  }

  const refit = (): void => {
    s = roadScale(wrap.clientWidth, wrap.clientHeight, RW, RH);
    road.style.fontSize = `${s}px`;
    paintRoad();
    if (!fitted && wrap.clientWidth > 0) {
      fitted = true;
      const at = openingStop(stops, open.at);
      if (at) centre(at);
      if (at && open.card) openCard(at);
      if (hooks.hintDue()) {
        hint.textContent = w.hint;
        hint.hidden = false;
        timer = window.setTimeout(() => (hint.hidden = true), 3000);
      }
    }
    arrows();
  };
  return {
    el,
    refit,
    close: () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerup', up, true);
    },
  };
}
