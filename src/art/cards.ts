/**
 * Streets screen cards and small screen icons (docs/design.md S2.6 "Fit at 320 px", S2.10,
 * S2.12 picture 14). Our own simple drawings, as SVG markup for the HTML screens.
 *
 * A card has three lines of words (gamedev writes them in N2): a small "Street 2", the name
 * in bold, then one status line. The art gives the card its look:
 * - CARD_LOOK: face, edge and word colours for open, done and locked cards.
 * - cardSceneSvg: a pale little picture of the street (or the hall) in the card's lower right,
 *   behind the words. Pale on purpose, so the words always read first.
 * - tickSvg and padlockSvg: the badge in the card's top right corner (done or locked). The
 *   corner sits beside the short first line, so the bold name keeps the card's full width.
 * Never colour alone: done has a tick, locked has a padlock and a dashed edge.
 *
 * Also the music icons for the title and pause screens (S2.9 rule 5), drawn like the HUD's
 * speaker icon (24 x 24, currentColor).
 */

export type CardState = 'open' | 'done' | 'locked';
/** The picture on each card: the three street looks and the hall. */
export type CardPicture = 'morning' | 'market' | 'evening' | 'hall';
export const CARD_PICTURES: readonly CardPicture[] = ['morning', 'market', 'evening', 'hall'];

/**
 * Card colours. Words are always CARD_LOOK.ink or .inkSoft on the face (both well over
 * 4.5 : 1 contrast on every face, a unit test checks).
 */
export const CARD_LOOK = {
  ink: '#1d1a14',
  /** The small "Street 2" line, and every word on a locked card. */
  inkSoft: '#4f493f',
  radius: 12,
  open: { face: '#ffffff', edge: '#1d1a14', edgeStyle: 'solid', shadow: '#d8cfbd' },
  done: { face: '#fff3d6', edge: '#b07a1e', edgeStyle: 'solid', shadow: '#e6cf9c' },
  locked: { face: '#ecebe7', edge: '#9a948a', edgeStyle: 'dashed', shadow: 'transparent' },
  /** Badge size in CSS px (top right corner, 3 px in from each edge, beside the small first line). */
  badge: 20,
  /** On the 2 x 2 grid at 320 x 240. */
  badgeTiny: 18,
} as const;

/** The amber of a working cog, so a done street and a working cog read as one family. */
const AMBER = '#f4a62a';
const AMBER_EDGE = '#7a4e0e';

const svg = (vb: string, body: string, extra = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

/** Done badge: an amber disc with a white tick (24 x 24). */
export function tickSvg(): string {
  return svg(
    '0 0 24 24',
    `<circle cx="12" cy="12" r="10.5" fill="${AMBER}" stroke="${AMBER_EDGE}" stroke-width="1.6"/>` +
      `<path d="M6.6 12.4l3.6 3.6 7.2-7.6" fill="none" stroke="${AMBER_EDGE}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      '<path d="M6.6 12.4l3.6 3.6 7.2-7.6" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  );
}

/** Locked badge: a plain grey padlock with a keyhole (24 x 24). */
export function padlockSvg(): string {
  return svg(
    '0 0 24 24',
    '<path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#4f493f" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#8d877c" stroke="#3b362e" stroke-width="1.4"/>' +
      '<circle cx="12" cy="15" r="1.8" fill="#ecebe7"/><path d="M11.1 15.5h1.8l.5 3.3h-2.8z" fill="#ecebe7"/>',
  );
}

/** The badge for a card state: a tick when done, a padlock when locked, none when open. */
export function cardBadgeSvg(state: CardState): string {
  return state === 'done' ? tickSvg() : state === 'locked' ? padlockSvg() : '';
}

/** Turns a #rrggbb colour into a warm grey of the same lightness (for locked cards). */
export function toGrey(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(l + 4)}${c(l + 2)}${c(l - 3)}`;
}

/** The little pictures, drawn in a 140 x 60 box, mostly in its right half and lower part. */
function scene(kind: CardPicture): string {
  switch (kind) {
    case 'morning':
      // Your street: the sun, two shops with awnings and a sign board, the road
      return (
        '<circle cx="126" cy="14" r="7" fill="#ffd34d"/>' +
        '<rect x="74" y="26" width="32" height="28" rx="2" fill="#f0a35e"/><rect x="106" y="22" width="34" height="32" rx="2" fill="#7fc4a4"/>' +
        '<rect x="78" y="29" width="24" height="6" rx="1" fill="#fff8e6"/><rect x="110" y="25" width="26" height="6" rx="1" fill="#fff8e6"/>' +
        '<path d="M74 37h32v4H74zM106 34h34v4h-34z" fill="#d65a4a"/>' +
        '<rect x="80" y="43" width="7" height="11" fill="#5b4636"/><rect x="113" y="42" width="8" height="12" fill="#5b4636"/>' +
        '<rect x="0" y="54" width="140" height="6" fill="#3e3e42"/><path d="M60 57h10M84 57h10M108 57h10M132 57h8" stroke="#f4f1e6" stroke-width="1.4"/>'
      );
    case 'market':
      // The market: two umbrellas, a stall with a sign, a basket of tomatoes
      return (
        '<path d="M66 32a17 11 0 0 1 34 0z" fill="#f2b632"/><path d="M75 32a8 11 0 0 1 16 0z" fill="#2b6cb0"/><rect x="82.2" y="32" width="1.6" height="22" fill="#6b6b6b"/>' +
        '<rect x="102" y="28" width="38" height="26" rx="1" fill="#e9b98a"/><rect x="104" y="22" width="34" height="7" rx="1" fill="#fff8e6"/>' +
        '<path d="M100 34a6 4 0 0 0 12 0a6 4 0 0 0 12 0a6 4 0 0 0 12 0a6 4 0 0 0 4 0v-4h-40z" fill="#8e5bb5"/>' +
        '<path d="M70 54l3-7h14l3 7z" fill="#b8874f"/><circle cx="76" cy="46" r="3" fill="#d63a2a"/><circle cx="81" cy="45" r="3" fill="#d63a2a"/><circle cx="86" cy="46" r="3" fill="#f07d22"/>' +
        '<rect x="0" y="54" width="140" height="6" fill="#d8c39a"/>'
      );
    case 'evening':
      // The bus park: an evening sky band, the low sun, a lamp post and a parked yellow bus
      return (
        '<rect x="56" y="0" width="84" height="54" fill="#f6b27a"/><rect x="56" y="0" width="84" height="20" fill="#b07ac0"/>' +
        '<circle cx="124" cy="30" r="8" fill="#ffd27a"/>' +
        '<rect x="70" y="16" width="2" height="38" fill="#5d6670"/><rect x="70" y="16" width="10" height="2" fill="#5d6670"/><rect x="75" y="18" width="6" height="3" rx="1" fill="#fff1b8"/>' +
        '<rect x="86" y="34" width="46" height="16" rx="3" fill="#f6c90e"/><path d="M90 37h8v5h-8zM100 37h8v5h-8zM110 37h8v5h-8z" fill="#bfe3f5"/><rect x="86" y="44" width="46" height="1.6" fill="#1d1a14"/>' +
        '<circle cx="95" cy="51" r="3" fill="#222222"/><circle cx="123" cy="51" r="3" fill="#222222"/>' +
        '<rect x="56" y="54" width="84" height="6" fill="#8a7b6a"/>'
      );
    case 'hall':
      // Go-Slow Hall: a roof with a truss, a hanging lamp, and a line of cones on the floor
      return (
        '<path d="M60 22l40-14 40 14v32H60z" fill="#e7dcc4"/><path d="M60 22l40-14 40 14" fill="none" stroke="#7b8792" stroke-width="3"/>' +
        '<path d="M66 22h68M74 22l10-6M100 8v14M126 22l-10-6" stroke="#7b8792" stroke-width="1.4"/>' +
        '<rect x="99.2" y="22" width="1.6" height="6" fill="#5d6670"/><path d="M95 31a5 4 0 0 1 10 0z" fill="#5d6670"/><circle cx="100" cy="32" r="2" fill="#fff1b8"/>' +
        '<path d="M74 54l4-12h2l4 12zM94 54l4-12h2l4 12zM114 54l4-12h2l4 12z" fill="#f07d22"/><path d="M76.4 47h5.2M96.4 47h5.2M116.4 47h5.2" stroke="#ffffff" stroke-width="2"/>' +
        '<rect x="56" y="54" width="84" height="6" fill="#a9a59b"/>'
      );
  }
}

/** How strongly the scene shows behind the words (0 to 1). Pale, so the words read first. */
export const CARD_SCENE_ALPHA = 0.34;

/**
 * A card's background picture. Put it behind the words, filling the card
 * (position: absolute; inset: 0; pointer-events: none). It keeps its lower right corner in
 * view at any card size. Locked cards show it in grey.
 */
export function cardSceneSvg(kind: CardPicture, state: CardState = 'open'): string {
  let body = scene(kind);
  if (state === 'locked') body = body.replace(/#[0-9a-fA-F]{6}/g, (c) => toGrey(c));
  const alpha = state === 'locked' ? CARD_SCENE_ALPHA * 0.8 : CARD_SCENE_ALPHA;
  return svg('0 0 140 60', `<g opacity="${alpha}">${body}</g>`, ' preserveAspectRatio="xMaxYMax slice"');
}

/**
 * Music icons (24 x 24, currentColor), the same build as the HUD speaker: two joined notes.
 * MUSIC_SVG carries both looks: the path with class "off" (a slash) is shown or hidden by CSS,
 * as the speaker's is. musicIconSvg(on) is a fixed picture of one look.
 */
const NOTES =
  '<path d="M9 17.5V6.2l11-2.4v11.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M9 6.2l11-2.4v3.2L9 9.4z" fill="currentColor"/>' +
  '<ellipse cx="6.2" cy="17.8" rx="3.2" ry="2.5" transform="rotate(-20 6.2 17.8)" fill="currentColor"/>' +
  '<ellipse cx="17.2" cy="15.5" rx="3.2" ry="2.5" transform="rotate(-20 17.2 15.5)" fill="currentColor"/>';
const SLASH = '<path class="off" d="M3 3l18 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>';

export const MUSIC_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${NOTES}${SLASH}</svg>`;

export function musicIconSvg(on: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${NOTES}${on ? '' : SLASH}</svg>`;
}
