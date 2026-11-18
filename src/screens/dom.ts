/** Tiny helper for building screen markup without a framework. */
import { ICON_DISC, iconSvg, type IconName } from '../art/icons';

export type { IconName };
type Attrs = Record<string, string | boolean | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/**
 * ST-A2 (style.md 1.2): a button's icon disc, its job's colour, the icon in warm ink. A picture
 * only: hidden from screen readers, so the button's spoken name stays its words.
 */
export function disc(name: IconName): HTMLElement {
  const d = h('span', { class: 'ic', 'aria-hidden': 'true' });
  d.style.background = ICON_DISC[name];
  d.innerHTML = iconSvg(name);
  return d;
}

/**
 * A real button (type="button"), so taps on it never reach the jump input. With an icon (ST-A2)
 * the disc goes before the words; the words are in their own span (see `say`).
 */
export function button(label: string, cls: string, onTap: (e: MouseEvent) => void, attrs: Attrs = {}, icon?: IconName): HTMLButtonElement {
  const b = h('button', { type: 'button', class: cls, ...attrs }, ...(icon ? [disc(icon), h('span', { class: 'w' }, label)] : [label]));
  b.addEventListener('click', onTap);
  return b;
}

/** New words for a button (its icon disc stays), and a new icon when given. */
export function say(b: HTMLElement, label: string, icon?: IconName): void {
  const w = b.querySelector('.w');
  if (!w) {
    b.textContent = label;
    return;
  }
  w.textContent = label;
  if (icon) b.querySelector('.ic')?.replaceWith(disc(icon));
}
