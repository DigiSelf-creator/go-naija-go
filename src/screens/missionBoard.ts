/**
 * MS3b: the Missions board, a mission's card and the "Every Lagos star!" card (docs/missions.md
 * part 2). Its own chunk, like the road (CO3): menus.ts fetches it while the city sits idle, and
 * the service worker keeps it, so it opens offline. Everything else a mission needs comes with
 * it (qa MS4: the first load stays light): the save, a go's count, Lagos's five, the goal
 * pictures, the run's chip and their words. A mission is only played from its card, so they are
 * always in by then.
 */
import './missionBoard.css';
import { iconSvg } from '../art/icons';
import { starSvg } from '../art/star';
import { helpFor, perPlace, type MissionDef, type MissionSave } from '../game/missions';
import { button, h } from './dom';
import { goalPic, type OwnIcon } from './missions';
import { layer } from './travel';
import { BOARD_WORDS as W } from './boardWords';

export { MissionBook, MissionGo, STAR_KOBO, placeToPlay } from '../game/missions';
export { MissionChip, lagosMissions, useArt, withCoins } from './missions';
export { BOARD_WORDS } from './boardWords';

export interface BoardView {
  /** The state's name for the helper card ("Lagos"). */
  state: string;
  defs: readonly MissionDef[];
  save: Readonly<MissionSave>;
  /** A place is open on the road (LANE always). */
  open(n: number): boolean;
  own?: OwnIcon;
  play(d: MissionDef, e: MouseEvent): void;
  close(): void;
  /** Reduced motion: no bob (the glow stays). */
  still: boolean;
}

const wonOf = (d: MissionDef, save: Readonly<MissionSave>): number => Math.min(d.stars.length, save.stars[d.id] ?? 0);

/** The Missions board (a card on a dim layer); a tile opens that mission's card in its place. */
export function missionBoard(v: BoardView): HTMLElement {
  const starRow = (of: number, won: number, px: number): HTMLElement => {
    const row = h('span', { class: 'ms-stars', 'aria-hidden': 'true' });
    row.innerHTML = Array.from({ length: of }, (_, i) => starSvg(i < won, px)).join('');
    return row;
  };
  const card = h('div', { class: 'card narrow travel-card ms-card', role: 'dialog', 'aria-label': W.heading });
  const dim = layer(card, v.close);
  const total = v.defs.reduce((n, d) => n + wonOf(d, v.save), 0);
  const of = v.defs.reduce((n, d) => n + d.stars.length, 0);
  const helper = total >= of && of > 0;
  const board = (): void => {
    card.setAttribute('aria-label', W.heading);
    const next = v.defs.find((d) => d.at.some(v.open) && wonOf(d, v.save) < d.stars.length);
    const tiles = v.defs.map((d) => {
      const locked = !d.at.some(v.open);
      const won = wonOf(d, v.save);
      const t = button('', `ms-tile${locked ? ' locked' : ''}${d === next ? ' next' : ''}${v.still ? ' still' : ''}`, (e) => (locked ? undefined : mission(d, e)), {
        'aria-label': locked ? W.tileLocked(d.name, d.places[0]!) : W.tile(d.name, d.places.join(', '), won, d.stars.length),
        'data-mission': d.id,
      });
      t.append(
        locked ? h('span', { class: 'ms-pic ms-lock', 'aria-hidden': 'true' }) : goalPic(d.icon, 32, v.own),
        h('span', { class: 'ms-words' }, h('b', {}, d.name), h('small', {}, locked ? W.locked(d.places[0]!) : d.places.join(', '))),
        starRow(d.stars.length, won, 18),
      );
      const lock = t.querySelector('.ms-lock');
      if (lock) lock.innerHTML = iconSvg('lock', 28);
      return t;
    });
    const head = h('h2', {}, W.heading);
    if (helper) head.insertAdjacentHTML('afterbegin', starSvg(true, 28));
    card.replaceChildren(
      h('div', { class: 'ms-head' }, head, helper ? h('p', { class: 'ms-helper' }, W.helper) : null, h('p', { class: 'small ms-sub' }, W.sub)),
      h('div', { class: 'ms-tiles' }, ...tiles),
      h('div', { class: 'ms-foot' }, h('p', { class: 'ms-total' }, W.total(total, of)), button(W.back, 'minor', v.close, {}, 'back')),
    );
  };
  const mission = (d: MissionDef, e: MouseEvent): void => {
    e.stopPropagation();
    const won = wonOf(d, v.save);
    const best = v.save.best[d.id];
    const stars = h('div', { class: 'ms-goal' });
    d.stars.forEach((n, i) => {
      const s = h('span', { class: 'ms-goal-star' });
      s.innerHTML = starSvg(i < won, 30);
      s.append(h('span', {}, perPlace(d) ? d.places[i] ?? '' : d.goal === 'foods' ? String(i + 1) : String(n)));
      stars.append(s);
    });
    const helps = perPlace(d) ? d.at.map((n) => helpFor(d, v.save, n)).filter((x): x is string => x !== null) : [];
    card.setAttribute('aria-label', d.name);
    card.replaceChildren(
      h('div', { class: 'ms-mhead' }, goalPic(d.icon, 40, v.own), h('h2', {}, d.name)),
      h('p', {}, d.line),
      stars,
      !perPlace(d) && best ? h('p', { class: 'small' }, W.best(best)) : '',
      ...helps.map((t) => {
        const p = h('p', { class: 'ms-help' }, t);
        p.insertAdjacentHTML('afterbegin', iconSvg('back', 20));
        return p;
      }),
      h('div', { class: 'actions' }, button(W.play, 'go', (ev) => v.play(d, ev), {}, 'play'), button(W.back, 'minor', () => {
        board();
        card.querySelector<HTMLElement>(`[data-mission="${d.id}"]`)?.focus({ preventScroll: true });
      }, {}, 'back')),
    );
    card.querySelector<HTMLElement>('.go')?.focus({ preventScroll: true });
  };
  board();
  return dim;
}

/** "Every Lagos star!" / "You are a Lagos star helper." / OK (part 2). */
export function everyCard(state: string, ok: () => void): HTMLElement {
  const head = h('h2', {}, W.every(state));
  head.insertAdjacentHTML('afterbegin', starSvg(true, 30));
  return layer(h('div', { class: 'card narrow travel-card ms-card', role: 'dialog', 'aria-label': W.every(state) }, head, h('p', {}, W.everyLine(state)), h('div', { class: 'actions' }, button(W.ok, 'go', ok, {}, 'go'))), ok);
}

