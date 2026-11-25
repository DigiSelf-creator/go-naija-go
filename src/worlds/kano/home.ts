/**
 * K1b: Kano's home until Kano's city is built (K6b): the old wall and the gate (art K1a, ./gate)
 * under a soft gold sky, the heading "Kano", the line that Kurmi is just through the gate, and the city's
 * own buttons from the first load (Sound and Settings at the top; Travel, Hero and the wheel at
 * the bottom). It uses the Lagos city's page classes; its few own rules (HOME_STYLE) ride in this
 * part, never the first load's style sheet (kano.md 9.1). It imports no value from outside this
 * folder (KN-R10).
 *
 * The picture is drawn once as the screen opens and again only on a resize: a still screen draws
 * nothing (kano.md 9.1).
 *
 * K1c fix: the words panel never covers the gate board ("WELCOME TO KANO" / "CENTRE OF
 * COMMERCE") or the buttons. Where it would (short screens), it moves under or beside the board
 * (see place()).
 */
import type { WorldCity, WorldCityHooks } from '../ui';
import { KANO_GATE, drawKanoGate, drawKanoWall } from './gate';
import { KANO_WORDS } from './words';

/** Where the wall's foot and the gate's scale sit in Kano's home picture (w x h). */
function homeFrame(w: number, h: number): { foot: number; s: number } {
  // The wall and gate fill about half the height, never wider than the screen.
  return { foot: h * 0.72, s: Math.min(h * 0.0055, w / 260) };
}

/** The gate board's box in Kano's home picture (w x h), in picture pixels (the cog above it left out). */
export function kanoHomeBoard(w: number, h: number): { x: number; y: number; w: number; h: number } {
  const { foot, s } = homeFrame(w, h);
  const { boardW, boardH, boardY } = KANO_GATE;
  return { x: w / 2 + (-58 - boardW / 2) * s, y: foot + (boardY - boardH) * s, w: boardW * s, h: boardH * s };
}

/** Kano's home picture at (0, 0, w, h): the sky, the dry gold ground, the wall and the gate in the middle. */
export function paintKanoHome(g: CanvasRenderingContext2D, w: number, h: number, lit: boolean): void {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, lit ? '#8fcbea' : '#a9cde0');
  sky.addColorStop(1, '#f6dca4');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const { foot, s } = homeFrame(w, h);
  g.fillStyle = '#d8bb7e';
  g.fillRect(0, foot, w, h - foot);
  g.fillStyle = '#c9774a';
  g.fillRect(0, foot + h * 0.08, w, h);
  drawKanoWall(g, 0, w, foot, s, lit);
  drawKanoGate(g, w / 2, foot, s, { lit, still: true });
}

/**
 * Kano's home's own style, put in the page once as the home first opens.
 * K3b: two streets' Play buttons share one row; K4b: three in one row, tighter sides, so "Play
 * Kofar Mata" takes two lines, not three. K1c fix: the words panel a little smaller where it must
 * sit beside the gate board.
 */
export const HOME_STYLE = `.city-buttons .go-pair{display:flex;gap:8px;width:100%}
.city-buttons .go-pair .go{flex:1 1 0;width:auto;min-width:0}
.city-buttons .go-three .go{padding:4px 6px}
@media (max-width:400px){.city-buttons .go-three .go{font-size:15px;line-height:1.1;min-height:48px}}
.screen .city-banner.tight{padding:3px 8px 4px}
.screen .city-banner.tight p{font-size:12px;line-height:1.2}`;

function addHomeStyle(): void {
  if (document.getElementById('kano-home-style')) return;
  const st = document.createElement('style');
  st.id = 'kano-home-style';
  st.textContent = HOME_STYLE;
  document.head.append(st);
}

export function kanoHome(hooks: WorldCityHooks): WorldCity {
  addHomeStyle();
  const w = KANO_WORDS.place;
  const el = document.createElement('div');
  el.className = 'card city-card kano-city';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', w.heading);
  const pic = document.createElement('canvas');
  pic.className = 'city-map';
  pic.setAttribute('role', 'img');
  pic.setAttribute('aria-label', w.pic);
  const stage = document.createElement('div');
  stage.className = 'city-stage';
  stage.style.cursor = 'default';
  stage.append(pic);
  const head = document.createElement('h2');
  head.className = 'city-head';
  head.textContent = w.heading;
  const right = document.createElement('div');
  right.className = 'city-top-right';
  right.append(...hooks.topRight);
  const top = document.createElement('div');
  top.className = 'city-top';
  top.append(head, right);
  const words = document.createElement('div');
  words.className = 'city-banner';
  words.style.top = 'calc(var(--safe-top, 0px) + 56px)';
  for (const [k, line] of [w.line, w.soon].entries()) {
    const p = document.createElement('p');
    if (k === 0) {
      const b = document.createElement('b');
      b.textContent = line;
      p.append(b);
    } else p.textContent = line;
    words.append(p);
  }
  const row = document.createElement('div');
  row.className = 'city-buttons';
  row.append(...hooks.bottom);
  const bottom = document.createElement('div');
  bottom.className = 'city-bottom';
  bottom.append(row);
  el.append(stage, top, words, bottom);

  /**
   * Keep the words panel off the gate board and the buttons (K1c fix). It tries, in order: its
   * usual place, under the board, then beside the board or the buttons, first at its usual size
   * and then a little smaller. The first place that covers nothing wins.
   */
  type Box = { left: number; right: number; top: number; bottom: number };
  const hit = (a: Box, b: Box): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const place = (): void => {
    const st = words.style;
    const set = (left: number | null, top: number | null, tight: boolean): void => {
      st.top = top === null ? 'calc(var(--safe-top, 0px) + 56px)' : `${top}px`;
      st.left = left === null ? '' : `${left}px`;
      st.transform = left === null ? '' : 'none';
      st.maxWidth = left === null ? '' : `calc(100% - ${left}px - max(12px, var(--safe-right, 0px)))`;
      words.classList.toggle('tight', tight);
    };
    set(null, null, false);
    const p = pic.getBoundingClientRect();
    const base = el.getBoundingClientRect();
    if (p.width === 0 || p.height === 0 || base.height === 0) return;
    const b = kanoHomeBoard(p.width, p.height);
    const board: Box = { left: p.left + b.x - 4, right: p.left + b.x + b.w + 4, top: p.top + b.y - 4, bottom: p.top + b.y + b.h + 4 };
    const things: Box[] = [board, ...[...el.querySelectorAll('button, .city-head')].filter((e) => !stage.contains(e)).map((e) => e.getBoundingClientRect()).filter((q) => q.width > 0)];
    const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
    const room: Box = { left: base.left + 4, right: base.right - 4, top: base.top, bottom: base.bottom - Math.max(4, edge) };
    const fits = (): boolean => {
      const r = words.getBoundingClientRect();
      return r.left >= room.left && r.right <= room.right && r.top >= room.top && r.bottom <= room.bottom && !things.some((t) => hit(r, t));
    };
    if (fits()) return;
    const lefts = [null, ...things.map((t) => t.right + 6 - base.left).sort((x, y) => x - y)];
    for (const tight of [false, true])
      for (const left of lefts)
        for (const top of [null, board.bottom + 4 - base.top]) {
          set(left, top, tight);
          if (fits()) return;
        }
    // Nothing covers nothing: beside the board, small, covering no words on the board.
    set(board.right + 6 - base.left, null, true);
  };

  let draws = 0;
  let lit = false;
  const draw = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = pic.clientWidth || window.innerWidth;
    const ch = pic.clientHeight || window.innerHeight;
    pic.width = Math.round(cw * dpr);
    pic.height = Math.round(ch * dpr);
    const g = pic.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintKanoHome(g, cw, ch, lit);
    place();
    draws++;
  };
  return {
    el,
    start: () => {
      lit = hooks.hallWon === true;
      draw();
      window.addEventListener('resize', draw);
      // Words can change size once the page's fonts are in: place the panel again then.
      void document.fonts?.ready.then(place, () => undefined);
    },
    close: () => window.removeEventListener('resize', draw),
    get draws() {
      return draws;
    },
  };
}
