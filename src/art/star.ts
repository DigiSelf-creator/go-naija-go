/**
 * MS (docs/missions.md part 4): the missions' star, a placeholder until art draws our own (MS2).
 * Kept in this one file so art can replace it (or move it into icons.ts as 'star') without any
 * other change: every star in the game comes from starSvg.
 *
 * Five rounded points and a small round dot in the middle; no face, no eyes. The two looks
 * differ in shape, not only colour (greyscale reads): "not yet" is an outline with an empty
 * middle, "won" is solid gold with a cream dot.
 */

/** The star's points on the 24 x 24 grid (outer 10.5, inner 4.6, a little low so it sits level). */
const PTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 4.6 : 10.5;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(1)} ${(12.8 + r * Math.sin(a)).toFixed(1)}`;
}).join('L');

/** The star as an <svg> string, `size` CSS px square; hidden from screen readers (words say it). */
export function starSvg(filled: boolean, size = 24): string {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="star${filled ? ' won' : ''}">` +
    `<path d="M${PTS}z" fill="${filled ? '#f6c34a' : 'none'}" stroke="#3a2618" stroke-width="${filled ? 1.8 : 2.2}" stroke-linejoin="round"/>` +
    `<circle cx="12" cy="12.8" r="${filled ? 1.9 : 1.3}" fill="${filled ? '#fff8e6' : '#3a2618'}"/></svg>`
  );
}
