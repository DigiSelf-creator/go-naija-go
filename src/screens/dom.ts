/** Tiny helper for building screen markup without a framework. */
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

/** A real button (type="button"), so taps on it never reach the jump input. */
export function button(label: string, cls: string, onTap: () => void, attrs: Attrs = {}): HTMLButtonElement {
  const b = h('button', { type: 'button', class: cls, ...attrs }, label);
  b.addEventListener('click', onTap);
  return b;
}
