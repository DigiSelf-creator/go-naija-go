/**
 * MS2 (docs/missions.md part 4): our own mission star, drawn by art. Every star in the game comes
 * from starSvg, so the board, the run chip and the end cards all match.
 *
 * Chunky and friendly: five fat points (inner radius about half the outer) with rounded tips, no
 * face. Recipe (style.md 1.2, 1.8): warm-ink outline drawn on top, flat marigold, one hard-edged
 * shade on the lower right (base 25 percent toward plum) and one highlight stroke on the top point
 * (base 30 percent toward #fff0cc), left out below 24 px where it would be thinner than 2 px.
 * "Not yet" is the outline only, with an empty middle; "won" is filled, so greyscale reads too.
 */

/** Point i of 10 on the 24 x 24 grid: even = tip (outer 10.6), odd = inner corner (5.6). */
const pt = (i: number): [number, number] => {
  const r = i % 2 ? 5.6 : 10.6;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return [12 + r * Math.cos(a), 13 + r * Math.sin(a)];
};
const f = (n: number) => n.toFixed(1);
/** Partway from point a to point b, as "x y" (t 0 is a itself). */
const at = (a: [number, number], b: [number, number], t = 0) => `${f(a[0] + (b[0] - a[0]) * t)} ${f(a[1] + (b[1] - a[1]) * t)}`;

/** From inner corner `from` to inner corner `to`, each tip between them rounded with a curve. */
function edge(from: number, to: number): string {
  let d = '';
  for (let i = from + 1; i < to; i += 2) {
    const o = pt(i);
    d += `L${at(pt(i - 1), o, 0.7)}Q${at(o, o)} ${at(o, pt(i + 1), 0.3)}L${at(pt(i + 1), o)}`;
  }
  return d;
}

const STAR = `M${at(pt(1), pt(1))}${edge(1, 11)}z`;
/** The shade: the middle out to the right and lower-right tips (light comes from the upper left). */
const SHADE = `M12 13L${at(pt(1), pt(1))}${edge(1, 5)}z`;
const INK = '#3a2618';

/** The star as an <svg> string, `size` CSS px square; hidden from screen readers (words say it). */
export function starSvg(filled: boolean, size = 24): string {
  const line = `<path d="${STAR}" fill="none" stroke="${INK}" stroke-width="${filled ? 2.2 : 2.5}" stroke-linejoin="round"/>`;
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="star${filled ? ' won' : ''}">` +
    (filled
      ? `<path d="${STAR}" fill="#f7b733"/><path d="${SHADE}" fill="#c49034"/>` +
        (size >= 24 ? `<path d="M11.6 5.9 10.9 8.5" stroke="#f9c861" stroke-width="2" stroke-linecap="round"/>` : '')
      : '') +
    line +
    `</svg>`
  );
}
