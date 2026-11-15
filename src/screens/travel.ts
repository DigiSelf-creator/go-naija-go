/**
 * O1b2: the way from Lagos to Ogun (docs/ogun.md parts 1 and 8; decisions 72 to 74). The cards
 * that show before Ogun's part is on the phone live here, in the first load, kept small:
 * - the download card (web only): Download, Not now, Downloading..., no internet, broken;
 * - the Travel card: "Where to?", Lagos and Ogun with their Booming lines, "You are here";
 * - the arrival card, once, over Ogun's place screen;
 * - the wheel's rail line (1.7), as a pure function.
 * Each card sits on a dim layer over the screen it opened from; Escape (and Android back) is
 * the card's own way out.
 */
import { gateIconSvg } from '../art/gateway';
import { OGUN_WORDS, WORDS } from './words';
import { button, h } from './dom';
import type { StateId } from '../game/states';

/** One state's button on the Travel card. */
export interface TravelLine {
  id: StateId;
  name: string;
  /** Booming points (shown up to 20, as "n of 20"). */
  boom: number;
  /** Its cog turns (a tick on the line, "Cog turning" to screen readers). */
  turning: boolean;
  /** The city open now ("You are here"). */
  here: boolean;
}

/** What the wheel and the Travel card read about Ogun. */
export interface OgunView {
  open: boolean;
  turning: boolean;
  /** King Pothole is beaten. */
  beaten: boolean;
}

/** ogun.md 1.7: the rail's line under the count. `n` is the number of cogs turning. */
export function wheelLine(n: number, ogun: OgunView): string {
  const w = OGUN_WORDS.wheel;
  if (n === 0) return WORDS.wheel.none;
  if (ogun.beaten) return w.gatewayOpen;
  if (ogun.turning) return w.ogunTurning;
  if (ogun.open) return w.ogunNext;
  return w.lagosOnly;
}

/** The Booming line's number: points up to the first boom (the Travel card says "n of 20"). */
export const boomShown = (points: number): number => Math.max(0, Math.min(20, Math.floor(Number.isFinite(points) ? points : 0)));

/** A card on a dim layer. Escape runs `out`. */
function layer(card: HTMLElement, out: () => void): HTMLElement {
  const dim = h('div', { class: 'travel-dim' }, card);
  dim.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    out();
  });
  return dim;
}

/** Focus the card's first big button once it is in the page. */
export function focusCard(dim: HTMLElement): void {
  dim.querySelector<HTMLElement>('.go, button')?.focus({ preventScroll: true });
}

/** ogun.md 1.5: "Where to?" with a big button per open state. */
export function travelCard(lines: readonly TravelLine[], pick: (id: StateId) => void, back: () => void): HTMLElement {
  const w = OGUN_WORDS.travel;
  const cog = (on: boolean): string =>
    `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="2.2 1.6"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>${on ? '<b aria-hidden="true">✓</b>' : ''}`;
  const pin = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 15C4 10 3 8 3 6a5 5 0 0 1 10 0c0 2-1 4-5 9z" fill="#d65a4a" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.8" fill="#fff"/></svg>';
  const places = lines.map((l) => {
    const b = button('', `travel-place${l.here ? ' here' : ''}`, () => pick(l.id), { 'aria-label': w.spoken(l.name, boomShown(l.boom), l.turning, l.here), 'data-state': l.id });
    b.innerHTML =
      `<span class="travel-name">${l.name}</span>` +
      `<span class="travel-boom"><span class="travel-cog${l.turning ? ' on' : ''}">${cog(l.turning)}</span>${w.booming(boomShown(l.boom), l.turning)}</span>` +
      (l.here ? `<span class="travel-here">${pin}${w.here}</span>` : '');
    return b;
  });
  const card = h(
    'div',
    { class: 'card narrow travel-card', role: 'dialog', 'aria-label': w.heading },
    h('h2', {}, w.heading),
    h('div', { class: 'travel-places' }, ...places),
    h('div', { class: 'actions' }, button(w.back, 'minor', back)),
  );
  return layer(card, back);
}

/** The download card's steps (ogun.md part 8 and 9.2). */
export type DownloadStep = 'ask' | 'loading' | 'noNet' | 'broken';

export interface DownloadCard {
  el: HTMLElement;
  step(s: DownloadStep, message?: string): void;
}

/** "Ogun is ready to download (about 130 KB)." with Download / Not now; then Downloading..., or why it could not. */
export function downloadCard(go: () => void, notNow: () => void): DownloadCard {
  const w = OGUN_WORDS.download;
  const body = h('div', { class: 'travel-body', 'aria-live': 'polite' });
  const row = h('div', { class: 'actions' });
  const card = h('div', { class: 'card narrow travel-card download-card', role: 'dialog', 'aria-label': OGUN_WORDS.travel.ogun }, h('h2', {}, OGUN_WORDS.travel.ogun), body, row);
  const el = layer(card, notNow);
  const step = (s: DownloadStep, message?: string): void => {
    card.dataset['step'] = s;
    if (s === 'ask') {
      body.replaceChildren(h('p', {}, w.line1), h('p', {}, w.line2));
      row.replaceChildren(button(w.go, 'go', go), button(w.notNow, 'minor', notNow));
    } else if (s === 'loading') {
      body.replaceChildren(h('p', { role: 'status' }, w.loading));
      row.replaceChildren();
    } else {
      body.replaceChildren(h('p', {}, s === 'noNet' ? w.noNet : (message ?? '')));
      row.replaceChildren(button(w.ok, 'go', notNow));
    }
    focusCard(el);
  };
  step('ask');
  return { el, step };
}

/** A plain card with one line and OK (the part could not open, where no download card shows). */
export function noticeCard(message: string, ok: () => void): HTMLElement {
  const card = h('div', { class: 'card narrow travel-card', role: 'dialog', 'aria-label': OGUN_WORDS.travel.ogun }, h('p', {}, message), h('div', { class: 'actions' }, button(OGUN_WORDS.download.ok, 'go', ok)));
  return layer(card, ok);
}

/** ogun.md 1.4: the arrival card, first visit only. */
export function arrivalCard(go: () => void): HTMLElement {
  const w = OGUN_WORDS.arrival;
  const card = h(
    'div',
    { class: 'card narrow travel-card arrival-card', role: 'dialog', 'aria-label': w.heading },
    h('h2', {}, w.heading),
    h('p', {}, w.line1),
    h('p', {}, w.line2),
    h('div', { class: 'actions' }, button(w.go, 'go', go)),
  );
  return layer(card, go);
}

/** The city's "Travel" button content: the small danfo icon and the word. */
export function travelButtonHtml(): string {
  return `${gateIconSvg('travel', 16, 'currentColor')}<span>${OGUN_WORDS.travel.button}</span>`;
}

/**
 * The Ogun part is already on this phone (the service worker kept it), so no download card is
 * needed. False when it cannot tell (no Cache Storage): the card then asks.
 */
export async function partHeld(id: string): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    for (const k of await caches.keys()) {
      if (!k.startsWith('gidi-dash-')) continue;
      const reqs = await (await caches.open(k)).keys();
      if (reqs.some((r) => new URL(r.url).pathname.includes(`/worlds/${id}/`))) return true;
    }
  } catch {
    /* blocked storage: ask */
  }
  return false;
}
