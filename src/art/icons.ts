/**
 * Our own button icons (ST-A1, docs/style.md 1.2): one small picture per button job, drawn on a
 * 24 x 24 grid in currentColor (warm ink #3a2618 on the disc; the hero face keeps its own skin).
 * Simple, generic shapes, hand-written here; nothing from any other game, app or brand.
 *
 *   iconSvg('travel')        the <svg> string, aria-hidden (the button's word says what it does)
 *   ICON_DISC.travel         the disc colour for that job (style.md 1.2, the disc table)
 *
 * Each icon is one string, "lines|fills|more": the lines path (2.4 wide, round ends), the filled
 * path, then any markup written out in full (drawn last, on top). Kept this short on purpose (style.md 2.2: 1.5 KB gzip).
 * The music notes are today's (src/art/musicIcon.ts), so the menus keep one look.
 */
import { NOTES, SLASH } from './musicIcon';

const SPEAKER = '|M3 9h4l5-4v14l-5-4H3z';
const MUSIC = `||<g stroke="none">${NOTES}</g>`;

const ICONS = {
  /** Play: a running shoe (cream sole line) with two speed lines. */
  play: 'M1.5 10.5H4M1 14.5h3|M6 18.5V11l4.5-5H14l1.6 4c3.2.8 5.4 2 6 4 .5 1.5-.3 4.5-1.8 4.5z|<path d="M7 15.6h14.4" stroke="#fff8e6" stroke-width="1.4"/>',
  /** Go: a bold arrow right. */
  go: 'M4 12h15M13 5.5l6.5 6.5-6.5 6.5',
  /** Next street: an arrow right, up to a post (the next stop). */
  next: 'M3 12h11M9 6.5l5.5 5.5L9 17.5|M19 4h2v16h-2z',
  /** Challenge road: a road going away, with lane lines. */
  road: 'M2.5 21l6-18M21.5 21l-6-18M12 4v2.5m0 3.5v3m0 3.5v4',
  /** Money: the naira sign. */
  naira: 'M7.5 20V4l9 16V4M4 10h16M4 14h16',
  /** Power: a lightning shape. */
  power: '|M13.5 2L5 13.5h6L9.5 22 19 9.5h-6.2z',
  /** Tech: a small chip with legs. */
  tech: 'M7 7h10v10H7zm3-4v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4|M10 10h4v4h-4z',
  /** Sound on: a speaker with two waves. */
  sound: `M15.5 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12${SPEAKER}`,
  /** Sound off: a speaker with a cross. */
  soundOff: `M15.5 9.5l5 5m0-5l-5 5${SPEAKER}`,
  /** Music on and off: today's two notes, with today's slash for off. */
  music: MUSIC,
  musicOff: MUSIC + SLASH,
  /** Settings: a cog (8 teeth from a dashed ring, round a ring with a hole). */
  settings: '||<circle cx="12" cy="12" r="8.6" stroke-width="3.4" stroke-dasharray="3.4 3.36" stroke-linecap="butt"/><circle cx="12" cy="12" r="5.6" stroke-width="3.6"/>',
  /** Travel: a bus front, windscreen, lamps and wheels. */
  travel: 'M4 18V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13zm2.5-12h11v5h-11zm1 8.5h1m8 0h1|M6 18h3v3H6zm9 0h3v3h-3z',
  /** Hero: a round smiling face, mid-brown skin (style.md 1.2), short hair, a cream smile. */
  hero:
    '||<circle cx="12" cy="12.5" r="8.5" fill="#7a4a2e"/><path fill="currentColor" stroke-width="1" d="M4.4 10C5 5.6 8 4 12 4s7 1.6 7.6 6c-3-1.6-12.2-1.6-15.2 0z"/>' +
    '<path d="M9 12.4h0m6 0h0" stroke-width="3"/><path d="M8.6 15.6q3.4 2.9 6.8 0" stroke="#fff8e6" stroke-width="1.7"/>',
  /** Nigeria's wheel: a rim, eight spokes and a hub. */
  wheel: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4|M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  /** Back and Not now: an arrow left. */
  back: 'M20 12H5m6-6.5L4.5 12l6.5 6.5',
  /** Close: a cross. */
  close: 'M6 6l12 12M18 6L6 18',
  /** Try again: a round arrow. */
  retry: 'M19 12.5a7 7 0 1 1-7-7|M11.5 1.8l5.6 3.7-5.6 3.7z',
  /** Gentle mode: a heart. */
  gentle: '|M12 20.5S3.5 15.5 3.5 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5c0 6-8.5 11-8.5 11z',
  /** Zoom in and out: plus and minus. */
  zoomIn: 'M5 12h14M12 5v14',
  zoomOut: 'M5 12h14',
  /** Download: an arrow down into a tray. */
  download: 'M12 3v11M7 9.5l5 5 5-5M4 15.5V20h16v-4.5',
  /** Skip: two triangles and a bar. */
  skip: 'M21 6v12|M3 6l8 6-8 6zm8.5 0l7.5 6-7.5 6z',
  /** Home and the city: a house with a door. */
  home: 'M3 11.5L12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20',
  /** See stop: a map pin. */
  pin: 'M12 21.5S5.5 15.5 5.5 10a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11.5-6.5 11.5z|M10 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  /** Locked: a padlock. */
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M5 11h14v9.5H5zm7 3.5V17',
  /** A switch that is on: a tick. */
  tick: 'M4.5 12.5l5 5 10-10.5',
};

export type IconName = keyof typeof ICONS;

/** Every icon, in the order the gallery shows them. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** The disc colour for each job (style.md 1.2). Tick and lock sit on whatever button holds them (sand). */
export const ICON_DISC = {} as Readonly<Record<IconName, string>>;
for (const row of 'ffe066 play go next road retry power,f6c34a naira,7fd3c7 tech,f6c90e travel,f3b38a hero,8fd17a wheel,f9c6d3 gentle,9fd0ff sound soundOff music musicOff'.split(',')) {
  const [hex, ...names] = row.split(' ');
  for (const n of names) (ICON_DISC as Record<string, string>)[n] = `#${hex}`;
}
for (const n of ICON_NAMES) (ICON_DISC as Record<string, string>)[n] ??= '#ead9b5';

/** The <svg> string for one icon, `size` CSS px square (the disc's 70 percent is the caller's). */
export function iconSvg(name: IconName, size = 24): string {
  const [lines, fills, more = ''] = ICONS[name].split('|');
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">` +
    `<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
    (lines ? `<path d="${lines}"/>` : '') +
    (fills ? `<path fill="currentColor" stroke-width="1" d="${fills}"/>` : '') +
    `${more}</g></svg>`
  );
}
