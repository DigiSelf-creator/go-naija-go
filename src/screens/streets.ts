/**
 * What the Streets screen and Nigeria's wheel show, worked out with no DOM so it can be unit
 * tested (docs/design.md S2.8, S2.10).
 */
import type { CardPicture, CardState } from '../art/cards';
import { hallOpen, streetOpen, streetRecord, type StateProgress } from '../game/progress';
import { WORDS } from './words';

export type Where = number | 'hall';

export interface CardInfo {
  /** Street index (0 is street 1) or the hall. */
  where: Where;
  state: CardState;
  picture: CardPicture;
  /** The small first line ("Street 2"); empty on the hall card. */
  num: string;
  /** The bold name. */
  name: string;
  /** The one status line. */
  status: string;
  /** Hall card only, when a parcel is saved: "You have a garri parcel." */
  extra: string | null;
}

const PICTURES: readonly CardPicture[] = ['morning', 'market', 'evening'];

/** The four cards for a state: its streets in order, then its hall. */
export function streetCards(s: StateProgress, names: readonly string[], themes: readonly string[] = []): CardInfo[] {
  const w = WORDS.streets;
  const cards: CardInfo[] = names.map((name, i) => {
    const n = i + 1;
    const rec = streetRecord(s, n);
    const state: CardState = rec.done ? 'done' : streetOpen(s, n) ? 'open' : 'locked';
    const theme = themes[i];
    const picture = (PICTURES as readonly string[]).includes(theme ?? '') ? (theme as CardPicture) : (PICTURES[i] ?? 'morning');
    return {
      where: i,
      state,
      picture,
      num: w.num(n),
      name,
      status: state === 'done' ? w.done(rec.best) : state === 'open' ? w.open : w.locked(n - 1),
      extra: null,
    };
  });
  const hallState: CardState = s.hall.done ? 'done' : hallOpen(s, names.length) ? 'open' : 'locked';
  cards.push({
    where: 'hall',
    state: hallState,
    picture: 'hall',
    num: '',
    name: 'Go-Slow Hall',
    status: hallState === 'done' ? w.hallDone : hallState === 'open' ? w.open : w.locked(names.length),
    extra: s.parcel ? w.parcel : null,
  });
  return cards;
}

/** S2.8 "The wheel screen on every size": where the wheel and its rail go (CSS px, inside the safe area). */
export interface WheelFit {
  /** Wheel side. */
  w: number;
  /** Rail width (portrait: the full width under the wheel). */
  r: number;
  /** Narrow rail (R under 200): the short words. */
  narrow: boolean;
  portrait: boolean;
  wheelX: number;
  wheelY: number;
  railX: number;
  railY: number;
  railH: number;
}

/** Biggest wheel, and the widest rail. */
export const WHEEL_MAX = 560;
export const RAIL_MAX = 360;
export const NARROW_RAIL = 200;

/** S2.8 fit rule: SW and SH are the screen inside the safe area, CSS px. */
export function wheelFit(sw: number, sh: number): WheelFit {
  if (sh > sw) {
    // Upright (menus only): wheel on top, the rail under it at full width.
    const w = Math.max(0, Math.floor(Math.min(sw - 16, sh - 200, WHEEL_MAX)));
    const railY = 8 + w + 8;
    return { w, r: sw - 16, narrow: false, portrait: true, wheelX: Math.floor((sw - w) / 2), wheelY: 8, railX: 8, railY, railH: Math.max(0, sh - railY - 8) };
  }
  const w = Math.max(0, Math.floor(Math.min(sh - 8, sw - 100, WHEEL_MAX)));
  const r = Math.max(0, Math.min(sw - w - 20, RAIL_MAX));
  // When the rail is as wide as it gets, the wheel and rail sit together in the middle.
  const left = r >= RAIL_MAX ? Math.floor((sw - (w + 8 + r)) / 2) : 4;
  return { w, r, narrow: r < NARROW_RAIL, portrait: false, wheelX: left, wheelY: Math.floor((sh - w) / 2), railX: left + w + 8, railY: 0, railH: sh };
}
