/**
 * MS3b: the quick missions in the first load (docs/missions.md part 2): Lagos's five, the goal
 * pictures and the run's goal chip. The board and the cards are their own small chunk
 * (missionBoard.ts), fetched while the city sits idle, as the road is. Ogun's five come with its
 * part. Every picture is drawn once, when its card or chip is made.
 */
import { drawKobo, drawFoodIcon } from '../art/items';
import { drawFufuIcon } from '../art/fufu';
import { drawGoat } from '../art/hazards';
import { drawWell } from '../art/well';
import { drawParcelIcon } from '../art/wellRoom';
import { iconSvg } from '../art/icons';
import type { FoodKind } from '../game/level';
import { starSvg } from '../art/star';
import { coinStars, type MissionDef, type MissionGo, type MissionIcon } from '../game/missions';
import { button, h } from './dom';
import { layer } from './travel';
import { helpFor, perPlace } from '../game/missions';
import { WORDS } from './words';

const W = WORDS.missions;

/** Lagos's five, easiest first (part 1). Coin catch's stars come from Alausa's level file. */
export function lagosMissions(): MissionDef[] {
  const l = W.lagos;
  const d = (id: string, goal: MissionDef['goal'], at: number[], stars: number[], icon: MissionIcon, words: { name: string; line: string }, places: string[], more: Partial<MissionDef> = {}): MissionDef => ({
    id: `lagos-${id}`, state: 'lagos', goal, at, stars, icon, name: words.name, line: words.line, places, ...more,
  });
  return [
    d('coins', 'coins', [1], [], 'coin', l.coins, ['Alausa']),
    d('lunch', 'foods', [1], [1, 2, 3], 'foods', l.lunch, ['Alausa'], { foods: ['corn', 'fufu', 'amala'], thanks: l.lunch.thanks }),
    d('goats', 'goats', [2], [1, 2, 3], 'goat', l.goats, ['Computer Village']),
    d('wells', 'wells', [2, 3], [1, 2], 'well', l.wells, ['Computer Village', 'Ikeja'], { help: l.wells.help }),
    d('bulbs', 'bulbs', [0], [4, 8, 12], 'power', l.bulbs, ['Lane run']),
  ];
}

/** Coin catch's stars, worked out from its street's coins (40, 65 and 85 percent). */
export const withCoins = (defs: readonly MissionDef[], coinsAt: (n: number) => number): MissionDef[] =>
  defs.map((d) => (d.goal === 'coins' && d.stars.length === 0 ? { ...d, stars: coinStars(coinsAt(d.at[0]!)) } : d));

/** What the board's chunk (missionBoard.ts) takes from the first load. */
export const BOARD_KIT = { h, button, layer, goalPic, starSvg, helpFor, perPlace };
export type BoardKit = typeof BOARD_KIT;

/** A later state's own goal pictures (the Ijebu garri parcel, the gravel); false: not one of its own. */
export type OwnIcon = (g: CanvasRenderingContext2D, icon: MissionIcon, size: number) => boolean;

/** A goal's picture, `px` square, drawn once. */
export function goalPic(icon: MissionIcon | FoodKind, px: number, own?: OwnIcon): HTMLElement {
  if (icon === 'power' || icon === 'tech') {
    const s = h('span', { class: `ms-pic ms-${icon}`, 'aria-hidden': 'true' });
    s.innerHTML = iconSvg(icon, px);
    return s;
  }
  const c = h('canvas', { class: 'ms-pic', width: String(px * 2), height: String(px * 2), 'aria-hidden': 'true' });
  c.style.width = c.style.height = `${px}px`;
  const g = c.getContext('2d');
  if (!g) return c;
  g.scale(2, 2);
  if (icon !== 'corn' && icon !== 'amala' && icon !== 'garri' && icon !== 'ikokore' && icon !== 'ofada' && own?.(g, icon, px)) return c;
  const k = px / 32;
  g.scale(k, k);
  if (icon === 'coin') {
    g.translate(16, 16);
    g.scale(1.25, 1.25);
    drawKobo(g, 0, 0, 0);
  } else if (icon === 'foods') {
    for (const [f, x, y] of [['corn', 9, 11], ['amala', 23, 11], ['fufu', 16, 23]] as const) f === 'fufu' ? drawFufuIcon(g, x, y, 15) : drawFoodIcon(g, f, x, y, 0.5);
  } else if (icon === 'corn' || icon === 'amala') drawFoodIcon(g, icon, 16, 16, 0.85);
  else if (icon === 'fufu') drawFufuIcon(g, 16, 16, 26);
  else if (icon === 'goat') {
    g.translate(16, 29);
    g.scale(0.46, 0.46);
    drawGoat(g, 0, 0, 0, 'walk', 1);
  } else if (icon === 'well') {
    g.translate(16, 31);
    g.scale(0.32, 0.32);
    drawWell(g, 0, 0, { kind: 'entrance', arrow: false });
  } else drawParcelIcon(g, 16, 16, 26);
  return c;
}

/**
 * The run's goal chip (part 2, "In the run"): the goal's picture, "{have} / {next star}" and
 * the star slots; after the last star, the number and a tick. DOM only, touched when the count
 * changes. Spoken (polite) when a star fills.
 */
export class MissionChip {
  readonly el: HTMLElement;
  private readonly said: HTMLElement;
  private go: MissionGo | null = null;
  private saved = 0;
  private last = '';
  private foods: HTMLElement[] = [];

  constructor() {
    this.el = h('span', { class: 'ms-chip', hidden: true });
    this.said = h('span', { class: 'sr-only', 'aria-live': 'polite' });
    document.body.append(this.said);
  }

  /** A new go (or none): the chip's picture is drawn now, once. `saved`: stars won before. */
  set(go: MissionGo | null, saved: number, own?: OwnIcon): void {
    this.go = go;
    this.saved = saved;
    this.last = '';
    this.el.hidden = go === null;
    if (!go) return;
    const d = go.def;
    this.foods = d.foods ? d.foods.map((f) => h('span', { class: 'ms-food' }, goalPic(f, 22))) : [];
    this.el.replaceChildren(...(this.foods.length ? this.foods : [goalPic(d.icon, 22, own), h('span', { class: 'ms-n' })]), h('span', { class: 'ms-stars' }));
    this.update();
  }

  /** The count or the stars changed (cheap when nothing did). */
  update(): void {
    const go = this.go;
    if (!go) return;
    const d = go.def;
    const won = Math.min(d.stars.length, Math.max(this.saved, go.stars));
    const next = go.next;
    const key = `${go.shown}|${next}|${won}|${[...go.foods].join()}`;
    if (key === this.last) return;
    this.last = key;
    const n = this.el.querySelector('.ms-n');
    if (n) {
      n.textContent = next === null ? String(go.shown) : `${go.shown} / ${next}`;
      if (next === null) n.insertAdjacentHTML('beforeend', iconSvg('tick', 16));
    }
    d.foods?.forEach((f, i) => this.foods[i]?.classList.toggle('got', go.foods.has(f)));
    this.el.querySelector('.ms-stars')!.innerHTML = Array.from({ length: d.stars.length }, (_, i) => starSvg(i < won, 16)).join('');
    this.el.setAttribute('aria-label', `${d.name}: ${n?.textContent ?? ''}`);
  }

  /** A star filled: it pops once (0.3 s; none with reduced motion, screens.css), and is spoken (polite). */
  star(total: number, of: number): void {
    this.update();
    const s = this.el.querySelector('.ms-stars')?.children[total - 1];
    s?.classList.add('pop');
    this.said.textContent = W.starSpoken(total, of);
  }
}
