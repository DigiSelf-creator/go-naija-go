/**
 * The small Gateway pieces that show before Ogun's own part is fetched (docs/ogun.md 1.2, 1.5,
 * 1.7; art O1a). Keep this file tiny: it may sit in the first load or with the road screen.
 *
 *  - The gateway's two colour looks. The "To Ogun" road branch and the small arch are in
 *    ./gatewayRoad (they load with the road screen, not the first page).
 *  - Three 16 px icons, each as SVG for HTML buttons and on a canvas: 'arch' (the "To Ogun"
 *    plate once open), 'travel' (the city's Travel button: a danfo under a two-way arrow) and
 *    'pennant' (Ogun's cog and its "Ogun, next" line on the wheel; wheelSvg draws it on the cog).
 *
 * Our own gateway: two round indigo-and-white pillars and a wide brown beam. Never the real
 * gantry's shape or colours, and no crest, emblem, seal, flag or state logo. Nothing here moves.
 */
import { INK } from './palette';

const CREAM = '#fffaf0';
const AMBER = '#f4a62a';

/** The gateway's two looks: before King Pothole (warm, a little faded, cog still) and after (bright). */
export interface GateColours {
  pillar: string;
  cloth: string;
  beam: string;
  words: string;
  cog: string;
  cogEdge: string;
  cap: string;
}
export const GATE_COLOURS: Readonly<Record<'bright' | 'faded', GateColours>> = {
  bright: { pillar: '#27378a', cloth: '#ffffff', beam: '#7a4526', words: '#fff1c9', cog: AMBER, cogEdge: '#7a4e0e', cap: '#f3e2bd' },
  faded: { pillar: '#6c74a6', cloth: '#ece6da', beam: '#9c7a63', words: '#efe3c8', cog: '#cdb994', cogEdge: '#8a7a5c', cap: '#e6dccb' },
};

// ---------- Icons (16 px): SVG for HTML, Path2D for a canvas ----------

export type GateIcon = 'arch' | 'travel' | 'pennant';
export const GATE_ICONS: readonly GateIcon[] = ['arch', 'travel', 'pennant'];

/** [path, fill or '', stroke width]; strokes and INK fills take the button's ink. */
type Part = readonly [string, string, number];
const PARTS: Readonly<Record<GateIcon, readonly Part[]>> = {
  arch: [
    ['M1 2.5H15V6.5H1ZM2.5 6.5H5.2V15H2.5ZM10.8 6.5H13.5V15H10.8Z', INK, 0],
    ['M2.5 9H5.2V9.9H2.5ZM2.5 12H5.2V12.9H2.5ZM10.8 9H13.5V9.9H10.8ZM10.8 12H13.5V12.9H10.8Z', CREAM, 0],
    ['M8 3.2A1.3 1.3 0 1 1 7.99 3.2Z', AMBER, 0],
    ['M8 9.5V11M8 13V14.5', '', 1.3],
  ],
  travel: [
    ['M1 8.2Q1 7 2.2 7H11.5Q12.8 7 13.4 8.6L14.6 11.2V14H1Z', INK, 0],
    ['M2.4 8.3H4.8V10.3H2.4ZM5.9 8.3H8.3V10.3H5.9ZM9.4 8.3H11.8L12.6 10.3H9.4Z', CREAM, 0],
    ['M4.3 13.3A1.6 1.6 0 1 1 4.29 13.3ZM11.4 13.3A1.6 1.6 0 1 1 11.39 13.3Z', INK, 0],
    ['M3 3.3H13M10.8 1.2L13 3.3L10.8 5.4M5.2 1.2L3 3.3L5.2 5.4', '', 1.4],
  ],
  pennant: [
    ['M3.6 1.6H14L10.4 5.4L14 9.2H3.6Z', AMBER, 1.2],
    ['M3 1.2V15', '', 1.8],
  ],
};

/** The icon as SVG markup (aria-hidden: the words beside it are spoken). */
export function gateIconSvg(icon: GateIcon, size = 16, ink: string = INK): string {
  const p = PARTS[icon]
    .map(([d, fill, sw]) => `<path d="${d}" fill="${fill === INK ? ink : fill || 'none'}"${sw ? ` stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false">${p}</svg>`;
}

/** The icon on a canvas, top left at (x, y), `size` units square. Needs Path2D. */
export function drawGateIcon(g: CanvasRenderingContext2D, icon: GateIcon, x: number, y: number, size = 16, ink: string = INK): void {
  if (typeof Path2D === 'undefined') return;
  g.save();
  g.translate(x, y);
  g.scale(size / 16, size / 16);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [d, fill, sw] of PARTS[icon]) {
    const p = new Path2D(d);
    if (fill) {
      g.fillStyle = fill === INK ? ink : fill;
      g.fill(p);
    }
    if (sw) {
      g.strokeStyle = ink;
      g.lineWidth = sw;
      g.stroke(p);
    }
  }
  g.restore();
}

/**
 * The pennant on a wheel cog, as SVG markup in wheel units: a short pole from the cog towards
 * the hub with the amber flag at its end. (x, y) is the cog centre, deg its angle in degrees.
 */
export function cogPennantSvg(x: number, y: number, deg: number): string {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(deg + 180).toFixed(1)})" class="gdw-pennant"><path d="M9 0H24" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M15.5 -0.8H24L19.8 -10.5Z" fill="${AMBER}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}
