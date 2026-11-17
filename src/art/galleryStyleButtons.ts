/**
 * Debug only: ?gallery=style-buttons (ST-A1, docs/style.md 1.2). Every button icon on its disc at
 * 1x and 2x, the icons alone (light), the icons on buttons made with the button recipe (plain and
 * pressed, on and off, big green, status chips, round zoom), a grey copy (never meaning by colour
 * alone) and a numbered set without words (the 10 year old test).
 * The page is plain HTML laid over the game canvas; the canvas only gets the page colour.
 */
import { ICON_DISC, ICON_NAMES, iconSvg, type IconName } from './icons';

const INK = '#3a2618';
const CREAM = '#fff8e6';
const GREEN = '#0e7a3e';

/** The word each icon goes with (the gallery's own labels; the real words stay in words.ts). */
const WORD: Readonly<Record<IconName, string>> = {
  play: 'Play', go: 'Go', next: 'Next street', road: 'Challenge road', naira: '₦ 1,250', power: 'Power',
  tech: 'Tech', sound: 'Sound', soundOff: 'Sound', music: 'Music', musicOff: 'Music', settings: 'Settings',
  travel: 'Travel', hero: 'Hero', wheel: 'Nigeria’s wheel', back: 'Back', close: 'Close', retry: 'Try again',
  gentle: 'Gentle mode', zoomIn: 'Zoom in', zoomOut: 'Zoom out', download: 'Download', skip: 'Skip',
  home: 'Home', pin: 'See stop', lock: 'Locked', tick: 'On',
};

/** A warm grey of the same lightness. */
function grey(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = Math.round(0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255));
  return `rgb(${l},${l},${l})`;
}

function disc(name: IconName, px: number, fill = ICON_DISC[name], edge = 2): string {
  return `<span class="disc" style="width:${px}px;height:${px}px;background:${fill};border-width:${edge}px">${iconSvg(name, Math.round(px * 0.7))}</span>`;
}

type Kind = 'normal' | 'big' | 'chip';
const DISC_PX: Record<Kind, number> = { normal: 30, big: 36, chip: 26 };

function button(name: IconName, kind: Kind, opts: { green?: boolean; pressed?: boolean; on?: boolean; greyed?: boolean } = {}): string {
  const fill = opts.greyed ? grey(ICON_DISC[name]) : ICON_DISC[name];
  const cls = ['btn', kind, opts.green ? 'green' : '', opts.pressed ? 'pressed' : '', opts.on ? 'on' : ''].join(' ');
  const word = opts.on === undefined ? WORD[name] : `${WORD[name]} ${opts.on ? 'on' : 'off'}`;
  const face = opts.greyed && opts.green ? 'style="background:#555"' : '';
  const tick = opts.on ? `<span class="tick">${iconSvg('tick', 16)}</span>` : '';
  return `<span class="${cls}" ${face}>${disc(name, DISC_PX[kind], fill)}<span class="w">${word}</span>${tick}</span>`;
}

const CSS = `
.sb{position:fixed;inset:0;overflow:auto;background:#f4ead2;color:${INK};font:13px 'Trebuchet MS',Verdana,sans-serif;padding:12px 16px;z-index:10}
.sb h2{font-size:15px;margin:14px 0 6px}
.sb .grid{display:flex;flex-wrap:wrap;gap:8px}
.sb .cell{background:#fffaf0;border:1px solid #d9c9a6;border-radius:8px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:84px}
.sb .cell .row{display:flex;align-items:center;gap:6px}
.sb .cell small{font-size:10px;opacity:.8}
.sb .disc{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid ${INK};color:${INK};box-sizing:border-box;flex:none}
.sb .bare{color:${INK};display:inline-flex}
.sb .btn{display:inline-flex;align-items:center;gap:8px;background:${CREAM};border:2.5px solid ${INK};border-radius:999px;box-shadow:0 3px 0 ${INK},0 6px 8px rgba(58,38,24,.22);font-weight:800;font-size:15px;color:${INK};padding:4px 14px 4px 4px;min-height:44px;box-sizing:border-box;margin:0 6px 10px 0}
.sb .btn.big{font-size:16px;min-height:52px;padding:4px 16px 4px 4px}
.sb .btn.chip{min-height:34px;padding:3px 13px 3px 3px;gap:6px}
.sb .btn.green{background:${GREEN};color:#fff;text-shadow:0 1.5px 0 rgba(0,0,0,.35)}
.sb .btn.pressed{transform:translateY(3px);box-shadow:0 0 0 ${INK}}
.sb .btn.on{border-width:3.5px}
.sb .btn .tick{display:inline-flex;color:${GREEN}}
.sb .round{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:${CREAM};border:2.5px solid ${INK};box-shadow:0 3px 0 ${INK},0 6px 8px rgba(58,38,24,.22);box-sizing:border-box;color:${INK};margin-right:8px}
.sb .round.pressed{transform:translateY(3px);box-shadow:0 0 0 ${INK}}
.sb .dark{background:#2f2a24;padding:8px;border-radius:8px;display:inline-flex;gap:8px}
`;

function page(): string {
  const cells = ICON_NAMES.map(
    (n) =>
      `<div class="cell"><b>${n}</b><div class="row">${disc(n, 26)}${disc(n, 30)}${disc(n, 36)}</div>` +
      `<div class="row">${disc(n, 52, ICON_DISC[n], 4)}${disc(n, 60, ICON_DISC[n], 4)}</div><small>${WORD[n]}</small></div>`,
  ).join('');
  const light = ICON_NAMES.map((n) => `<span class="cell"><span class="bare">${iconSvg(n, 18)}</span><span class="bare">${iconSvg(n, 36)}</span></span>`).join('');
  const normal = (['back', 'close', 'settings', 'travel', 'hero', 'wheel', 'road', 'download', 'skip', 'home', 'pin', 'gentle'] as const)
    .map((n) => button(n, 'normal'))
    .join('');
  const pressed = (['back', 'travel', 'hero', 'settings'] as const).map((n) => button(n, 'normal', { pressed: true })).join('');
  const big = (['play', 'go', 'next', 'retry'] as const).map((n) => button(n, 'big', { green: true })).join('') + button('go', 'big', { green: true, pressed: true }) + button('back', 'big');
  const switches =
    button('sound', 'normal', { on: true }) + button('soundOff', 'normal', { on: false }) + button('music', 'normal', { on: true }) + button('musicOff', 'normal', { on: false }) +
    button('gentle', 'normal', { on: true }) + button('gentle', 'normal', { on: false });
  const chips = (['naira', 'power', 'tech'] as const).map((n) => button(n, 'chip')).join('') + button('lock', 'chip');
  const zoom = `<span class="round">${iconSvg('zoomIn', 24)}</span><span class="round">${iconSvg('zoomOut', 24)}</span><span class="round pressed">${iconSvg('zoomIn', 24)}</span>`;
  const greyRow = ICON_NAMES.map((n) => disc(n, 30, grey(ICON_DISC[n]))).join(' ') +
    '<br><br>' + button('play', 'big', { green: true, greyed: true }) + button('travel', 'normal', { greyed: true }) + button('sound', 'normal', { on: true, greyed: true }) + button('soundOff', 'normal', { on: false, greyed: true });
  const quiz = ICON_NAMES.map((n, i) => `<span class="cell">${disc(n, 30)}<small>${i + 1}</small></span>`).join('');
  const dark = `<span class="dark">${(['sound', 'music', 'settings', 'hero'] as const).map((n) => disc(n, 30)).join('')}</span>`;
  return (
    `<div class="sb"><h2>Gbese! button icons (ST-A1): ${ICON_NAMES.length} icons, our own, warm ink on the style.md 1.2 discs</h2>` +
    `<h2>Each icon on its disc: 26, 30, 36 px (chip, normal, big) and 2x (52, 60)</h2><div class="grid">${cells}</div>` +
    `<h2>Light: the icons alone at 18 and 36 px</h2><div class="grid">${light}</div>` +
    `<h2>Button recipe: normal buttons</h2><div>${normal}</div>` +
    `<h2>Pressed</h2><div>${pressed}</div>` +
    `<h2>Big buttons, one green per screen (pressed 5th)</h2><div>${big}</div>` +
    `<h2>Switches: on (tick, word "on", 3.5 px edge) and off</h2><div>${switches}</div>` +
    `<h2>Status chips (not buttons) and a locked chip</h2><div>${chips}</div>` +
    `<h2>Zoom + and − (round, 44 px; plain, plain, pressed)</h2><div>${zoom}</div>` +
    `<h2>On a dark edge</h2>${dark}` +
    `<h2>Grey copy: every disc and some buttons (meaning never by colour alone)</h2><div>${greyRow}</div>` +
    `<h2>Without words (the 10 year old test: what does each number do?)</h2><div class="grid">${quiz}</div></div>`
  );
}

let mounted = false;

export function drawStyleButtonsGallery(g: CanvasRenderingContext2D, w: number, h: number): void {
  if (!mounted && typeof document !== 'undefined') {
    mounted = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.innerHTML = page();
    document.body.append(root.firstElementChild!);
  }
  g.fillStyle = '#f4ead2';
  g.fillRect(0, 0, w, h);
}
