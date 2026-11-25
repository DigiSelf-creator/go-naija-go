/**
 * K1b: Kano's home until Kano's city is built (K6b): the old wall and the gate (art K1a, ./gate)
 * under a soft gold sky, the heading "Kano", the line that Kurmi is coming next, and the city's
 * own buttons from the first load (Sound and Settings at the top; Travel, Hero and the wheel at
 * the bottom). It uses the Lagos city's page classes, so it needs no new first-load style, and it
 * imports no value from outside this folder (KN-R10).
 *
 * The picture is drawn once as the screen opens and again only on a resize: a still screen draws
 * nothing (kano.md 9.1).
 */
import type { WorldCity, WorldCityHooks } from '../ui';
import { drawKanoGate, drawKanoWall } from './gate';
import { KANO_WORDS } from './words';

/** Kano's home picture at (0, 0, w, h): the sky, the dry gold ground, the wall and the gate in the middle. */
export function paintKanoHome(g: CanvasRenderingContext2D, w: number, h: number, lit: boolean): void {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, lit ? '#8fcbea' : '#a9cde0');
  sky.addColorStop(1, '#f6dca4');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const foot = h * 0.72;
  g.fillStyle = '#d8bb7e';
  g.fillRect(0, foot, w, h - foot);
  g.fillStyle = '#c9774a';
  g.fillRect(0, foot + h * 0.08, w, h);
  // The wall and gate fill about half the height, never wider than the screen.
  const s = Math.min(h * 0.0055, w / 260);
  drawKanoWall(g, 0, w, foot, s, lit);
  drawKanoGate(g, w / 2, foot, s, { lit, still: true });
}

export function kanoHome(hooks: WorldCityHooks): WorldCity {
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
    draws++;
  };
  return {
    el,
    start: () => {
      lit = hooks.hallWon === true;
      draw();
      window.addEventListener('resize', draw);
    },
    close: () => window.removeEventListener('resize', draw),
    get draws() {
      return draws;
    },
  };
}
