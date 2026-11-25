/**
 * Kano's gateway pieces for qa and Tp (debug only; docs/kano.md 1.2 to 1.6, art K1a):
 * ?gallery=kano   the wall and gate: faded, bright (cog turning), bright at night, with the wall
 *                 running off both sides; the small gate, the "To Kano" icon and card; the pennant;
 * ?gallery=kano2  the long ride north (seven frames and a live 5 s loop), the ride back, the
 *                 reduced-motion end picture, and the ride at 320 x 240, 640 x 200 and 851 x 393;
 * ?gallery=kano3  Kurmi (K2a): the street calm, in the tailwind, at the kilishi and headwind, at
 *                 320 x 240 real size, and the wind's look in greyscale;
 * ?gallery=kano4  Kurmi's pieces: wind signs, streamers, dust streaks, kilishi, the stalls, the
 *                 hoop and the whole cast, crisp (style 1.8).
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import { drawGateIcon } from './gateway';
import { drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { drawHero, type HeroLook } from './hero';
import { setInkRatio } from './ink';
import { INK } from './palette';
import {
  drawDustStreaks,
  drawHoop,
  drawKanoGate,
  drawKanoRide,
  drawKanoWall,
  drawKilishi,
  drawKilishiIcon,
  drawKurmiBackdrop,
  drawKurmiStall,
  drawKurmiTraderStall,
  drawWindSign,
  drawWindStreamers,
  KANO_RIDE,
  KURMI_CAST,
  KURMI_HOOP,
  KURMI_READER,
  KURMI_TRADER_LOOKS,
  KURMI_TRADERS,
  windShow,
  type KanoRideOpts,
  type WindStretch,
} from '../worlds/kano/galleryArt';
import { KANO_WORDS } from '../worlds/kano/words';
import { drawKanoGateIcon, drawMiniKanoGate, drawToKanoCard } from '../worlds/ogun/toKano';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

const HEROES: readonly HeroLook[] = [
  { skin: 4, hair: 3, outfit: 1, body: 1, age: 1 },
  { skin: 0, hair: 0, outfit: 0, body: 0, age: 0 },
  { skin: 2, hair: 1, outfit: 2, body: 1, age: 0 },
  { skin: 3, hair: 4, outfit: 4, body: 1, age: 2 },
  { skin: 1, hair: 2, outfit: 3, body: 0, age: 1 },
];

/** The hero at the coach window, as the game will pass it in (the Kano part imports no hero code). */
const rider = (look: HeroLook, time: number) => (g: CanvasRenderingContext2D) =>
  drawHero(g, look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });

const gates: Page = (g, time) => {
  label(g, 'K1a the old wall and our own gate: no real gate, crest, script or palace. Faded before Rusty Borehole (cog still), bright after (lamps, fresh doors, cog turns).', 12, 6, 12);
  const cells: [string, string, boolean, boolean][] = [
    ['Faded', '#f3dfae', false, false],
    ['Bright (cog turns)', '#f3dfae', true, false],
    ['Bright, night (lamps glow)', '#2c3557', true, true],
  ];
  cells.forEach(([name, bg, lit, night], i) => {
    const x = 12 + i * 312;
    const y = 28;
    frame(g, x, y, 300, 236, bg);
    g.fillStyle = '#d8bb7e';
    g.fillRect(x, y + 206, 300, 30);
    g.save();
    g.beginPath();
    g.rect(x, y, 300, 236);
    g.clip();
    drawKanoGate(g, x + 168, y + 208, 1.35, { lit, night, time, wings: 120 });
    g.restore();
    label(g, name, x + 4, y + 240);
  });
  // Street 1's start: the wall running off both edges at play size, the gate at x 200 (kano.md 3.4)
  const sy = 284;
  frame(g, 12, sy, 624, 150, '#f6dca4');
  g.save();
  g.beginPath();
  g.rect(12, sy, 624, 150);
  g.clip();
  drawKanoWall(g, 8, 650, sy + 120, 1, false);
  drawKanoGate(g, 212, sy + 120, 1, { boardX: 70 });
  g.fillStyle = '#c9774a';
  g.fillRect(12, sy + 120, 624, 30);
  g.restore();
  g.save();
  g.translate(300, sy + 124);
  drawHero(g, HEROES[0]!, { phase: (time * 2) % 1, inAir: false, facing: 1, glow: false, standing: false, time });
  g.restore();
  label(g, 'Street 1 start, play size, board to the right of the gateway (boardX 70); the hero stands out from the wall', 12, sy + 154);
  // The small gate, the "To Kano" icon and card
  const mx = 648;
  frame(g, mx, sy, 300, 150, '#f4ead2');
  label(g, 'Small gate ("To Kano" stop): faded, bright, 0.7x', mx + 4, sy + 4);
  drawMiniKanoGate(g, mx + 50, sy + 90, 1.6, false);
  drawMiniKanoGate(g, mx + 140, sy + 90, 1.6, true);
  drawMiniKanoGate(g, mx + 205, sy + 90, 0.7, false);
  drawMiniKanoGate(g, mx + 250, sy + 90, 0.7, true);
  drawKanoGateIcon(g, mx + 20, sy + 112, 16);
  drawKanoGateIcon(g, mx + 46, sy + 106, 24);
  g.fillStyle = INK;
  g.fillRect(mx + 80, sy + 102, 32, 32);
  drawKanoGateIcon(g, mx + 84, sy + 106, 24, '#fffaf0');
  g.fillStyle = '#f6c90e';
  g.fillRect(mx + 120, sy + 102, 32, 32);
  drawKanoGateIcon(g, mx + 124, sy + 106, 24);
  // Stop card pictures, and the pennant (Ogun's mark, reused for "Kano, next")
  const cy = 470;
  for (const [k, lit] of [[0, false], [1, true]] as const) {
    const x = 12 + k * 250;
    g.save();
    g.translate(x, cy);
    drawToKanoCard(g, 224, 140, lit);
    g.restore();
    g.strokeStyle = INK;
    g.strokeRect(x - 0.5, cy - 0.5, 225, 141);
    label(g, lit ? '"To Kano" card, bright' : '"To Kano" card, faded', x, cy + 144);
  }
  frame(g, 524, cy, 200, 60, '#fbf3df');
  g.save();
  g.translate(532, cy + 22);
  drawGateIcon(g, 'pennant', 0, 0, 16);
  g.fillStyle = INK;
  g.font = '12px sans-serif';
  g.textBaseline = 'top';
  g.fillText('Kano, next (same pennant)', 22, 2);
  g.restore();
  label(g, 'Gate words only: WELCOME TO KANO / CENTRE OF COMMERCE. No Arabic or Ajami script, no crest, no palace.', 12, 690, 11);
};

function ride(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, o: KanoRideOpts, name: string): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  drawKanoRide(g, w, h, p, o);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  label(g, name, x, y + h + 3, 10);
}

const rides: Page = (g, time) => {
  label(g, 'K1a the long ride north (568 x 320 at half size): Ogun arch, palms, bridge, grassland, Harmattan haze, the wall and gate', 12, 6, 12);
  [0, 0.12, 0.3, 0.5, 0.7, 0.85, 1].forEach((p, i) => {
    const x = 12 + (i % 3) * 312;
    const y = 26 + Math.floor(i / 3) * 176;
    ride(g, x, y, 284, 160, p, { time: p * KANO_RIDE.first, rider: rider(HEROES[i % 5]!, time) }, `p = ${p}`);
  });
  const lp = Math.min(1, (time % (KANO_RIDE.first + 1)) / KANO_RIDE.first);
  ride(g, 324, 378, 284, 160, lp, { time, rider: rider(HEROES[3]!, time) }, 'Live (loops every 6 s)');
  ride(g, 636, 378, 284, 160, 1, { back: true, lit: true, time, rider: rider(HEROES[1]!, time) }, 'Back to Ogun, p = 1 (bright)');
  ride(g, 12, 560, 160, 120, 1, { still: true, rider: rider(HEROES[2]!, 0) }, 'Reduced motion, 320 x 240 half');
  ride(g, 186, 560, 320, 100, 1, { lit: true, time, rider: rider(HEROES[4]!, time) }, '640 x 200 half, bright');
  ride(g, 520, 560, 340, 157, 0.4, { back: true, time, rider: rider(HEROES[0]!, time) }, '851 x 393 at 0.4, back, p = 0.4');
};

// ---------- K2a: Kurmi (kano.md 2.2, 3.3, 3.4, 4.1, 7) ----------

/** Kurmi's wind stretches and road as kano-1.json has them (the first part of the street). */
const KURMI_WIND: readonly WindStretch[] = [[2200, 800, 'back'], [3600, 600, 'face'], [6800, 800, 'face'], [10000, 600, 'back']];
const KURMI_GROUND: readonly (readonly [number, number])[] = [[-400, 1100], [1140, 1450], [1510, 2700], [2800, 3900], [3940, 6000], [6170, 7400], [7440, 8800]];
const GY = 300;

/** People drawn with the screen's ratio set, as the game's bake (style 1.8; ink.ts). */
function crisp(draw: () => void): void {
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  try {
    draw();
  } finally {
    setInkRatio(null);
  }
}

function person(g: CanvasRenderingContext2D, look: FolkLook, x: number, y: number, f: FolkFrame = 'stand', flip = false, s = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);
  drawFolkFrame(g, look, f);
  g.restore();
}

interface StreetOpts {
  hero?: readonly [number, number, boolean];
  scene?: (g: CanvasRenderingContext2D) => void;
  grey?: boolean;
}

/** One Kurmi view at the game's 420-unit height, as the run would draw it (road drawn plainly here). */
function kurmi(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, camX: number, time: number, name: string, o: StreetOpts = {}): void {
  const u = h / 420;
  const V = w / u;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  if (o.grey) g.filter = 'grayscale(1)';
  g.scale(u, u);
  const hx = o.hero?.[0] ?? camX + V * 0.3;
  drawKurmiBackdrop(g, camX, V, time, 420, GY, false, windShow(KURMI_WIND, hx));
  g.translate(-camX, 0);
  for (const [a, ww, dir] of KURMI_WIND) {
    if (a + ww < camX - 60 || a > camX + V + 60) continue;
    drawWindStreamers(g, a, a + ww, GY, dir, time, false, camX - 20, camX + V + 20);
    drawWindSign(g, a, GY, dir, time);
  }
  crisp(() => o.scene?.(g));
  g.fillStyle = '#3a2a20';
  g.fillRect(camX, GY, V, 120);
  for (const [a, b] of KURMI_GROUND) {
    if (b < camX || a > camX + V) continue;
    g.fillStyle = '#6e6a66';
    g.fillRect(a, GY, b - a, 120);
    g.fillStyle = '#efe4c8';
    g.fillRect(a, GY, b - a, 4);
  }
  if (o.hero) {
    const [px, py, air] = o.hero;
    g.save();
    g.translate(px, py);
    drawHero(g, HEROES[2]!, { phase: (time * 2) % 1, inAir: air, facing: 1, glow: false, standing: false, time });
    g.restore();
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (name) label(g, name, x, y + h + 3, 10);
}

const kurmiStreet: Page = (g, time) => {
  label(g, 'K2a Kurmi: morning inside the old wall. Gold haze on the far rooftops only; near row, play line, hero and food clear.', 12, 6, 12);
  kurmi(g, 12, 24, 600, 300, 40, time, 'Arrival (gate at 200): leather, sandals and kosai stalls; the reader; the hoop', {
    hero: [330, GY, false],
    scene: (c) => {
      drawKanoGate(c, 200, GY, 1, { boardX: 70, time });
      const stalls: [number, number][] = [[560, 0], [680, 1], [800, 2]];
      for (const [sx, k] of stalls) {
        const kind = KURMI_TRADERS[k]!;
        drawKurmiTraderStall(c, kind, sx, GY - 8, time);
        person(c, KURMI_TRADER_LOOKS[kind], sx - 36, GY - 8, 'call');
      }
      person(c, KURMI_READER, 440, GY - 8, 'stand');
      drawHoop(c, 905 + ((time * 12) % 30), GY - 8, time);
      person(c, KURMI_HOOP[0], 888, GY - 8, 'walk1');
      person(c, KURMI_HOOP[1], 870, GY - 8, 'walk3');
      person(c, KURMI_HOOP[2], 848, GY - 8, 'walk0');
    },
  });
  kurmi(g, 624, 24, 320, 240, 2330, time, '320 x 240 at real size: tailwind, streaks and pennants', { hero: [2440, GY - 60, true] });
  label(g, "Wind is never colour alone: the sign's arrow, pennant tips,", 624, 284, 10);
  label(g, "the cloth's lifted end and the streaks' heads all point the", 624, 297, 10);
  label(g, 'way it blows. Streaks stay in the sky (y 22 to 108).', 624, 310, 10);
  kurmi(g, 12, 350, 462, 260, 2120, time, 'Tailwind from 2200 ("back", arrow to the right); the wide pit at 2700', { hero: [2700, GY - 92, true] });
  kurmi(g, 486, 350, 462, 260, 6480, time, 'Kilishi at 6600, then the headwind from 6800 ("face", arrow to the left)', {
    hero: [6540, GY, false],
    scene: (c) => drawKilishi(c, 6600, 276, time),
  });
  kurmi(g, 12, 636, 300, 76, 2120, time, '', { hero: [2700, GY - 92, true], grey: true });
  kurmi(g, 324, 636, 300, 76, 6700, time, '', { grey: true });
  label(g, 'Greyscale: the wind reads by shape (K2c).', 636, 660, 11);
};

/** The whole cast baked at the screen's own pixels (style 1.8 part 5), then copied whole pixel for whole pixel. */
function castRow(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const m = g.getTransform();
  const dpu = m.a * s;
  const step = 37;
  const c = document.createElement('canvas');
  c.width = Math.ceil(KURMI_CAST.length * step * dpu);
  c.height = Math.ceil(56 * dpu);
  const cg = c.getContext('2d')!;
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  KURMI_CAST.forEach((look, i) => {
    cg.setTransform(dpu, 0, 0, dpu, (i * step + 20) * dpu, 50 * dpu);
    drawFolkFrame(cg, look, i < 3 && !look.chair ? 'call' : i === 9 || i === 10 ? 'wave0' : 'stand');
  });
  setInkRatio(null);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, Math.round(m.e + x * m.a), Math.round(m.f + y * m.d));
  g.setTransform(m);
}

const kurmiPieces: Page = (g, time) => {
  label(g, 'K2a Kurmi pieces: wind signs (frame 0, frame 1), the same in greyscale; streamers, streaks, kilishi, stalls, the cast', 12, 6, 12);
  const signs: [WindStretch[2], number][] = [['back', 0], ['back', 0.11], ['face', 0], ['face', 0.11]];
  for (const grey of [false, true])
    signs.forEach(([dir, t], i) => {
      const x = 12 + (grey ? 476 : 0) + i * 116;
      frame(g, x, 24, 108, 150, '#f6dca4');
      g.save();
      g.beginPath();
      g.rect(x, 24, 108, 150);
      g.clip();
      if (grey) g.filter = 'grayscale(1)';
      g.translate(x + 54, 168);
      g.scale(1.6, 1.6);
      drawWindSign(g, 0, 0, dir, t);
      g.restore();
      label(g, `${dir === 'back' ? 'Behind you' : 'In your face'}${grey ? ', grey' : ''}`, x + 2, 26, 10);
    });
  (['back', 'face'] as const).forEach((dir, i) => {
    const x = 12 + i * 316;
    frame(g, x, 192, 304, 130, '#f6dca4');
    g.save();
    g.beginPath();
    g.rect(x, 192, 304, 130);
    g.clip();
    g.translate(x + 6, 192 + 118);
    g.scale(0.9, 0.9);
    drawWindStreamers(g, 0, 320, 0, dir, time);
    g.restore();
    label(g, `Streamers, ${dir === 'back' ? 'behind you' : 'in your face'}`, x + 4, 194, 10);
  });
  frame(g, 644, 192, 304, 130, '#cfe0e6');
  g.save();
  g.beginPath();
  g.rect(644, 192, 304, 130);
  g.clip();
  g.translate(644, 186);
  drawDustStreaks(g, 304, 'back', 1, time);
  g.translate(0, 46);
  drawDustStreaks(g, 304, 'face', 0.6, time);
  g.restore();
  label(g, 'Dust streaks: behind you (top), in your face at k 0.6', 648, 194, 10);
  // Stalls with their traders calling, and the roof platform with the hero on it
  const calls = KANO_WORDS.folk.traders.kurmi;
  frame(g, 12, 340, 640, 150, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(12, 340, 640, 150);
  g.clip();
  crisp(() =>
    KURMI_TRADERS.forEach((kind, i) => {
      const sx = 130 + i * 200;
      g.save();
      g.translate(sx, 478);
      g.scale(1.3, 1.3);
      drawKurmiTraderStall(g, kind, 0, 0, time);
      person(g, KURMI_TRADER_LOOKS[kind], -36, 0, 'call');
      g.restore();
      drawBubble(g, calls[i]!, sx - 46, 372, { tail: 'centre', px: 11 });
    }),
  );
  g.restore();
  frame(g, 664, 340, 284, 150, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(664, 340, 284, 150);
  g.clip();
  g.translate(700, 484);
  drawKurmiStall(g, 0, -55, 120, 0);
  g.translate(60, -55);
  drawHero(g, HEROES[0]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  g.restore();
  label(g, 'Roof platform: a leather shade; its top edge is the landing line', 668, 342, 10);
  // Kilishi on the road and its HUD icons; the hoop
  frame(g, 12, 506, 440, 70, '#fbf3df');
  g.save();
  g.translate(56, 542);
  g.scale(1.5, 1.5);
  drawKilishi(g, 0, 0, time);
  g.restore();
  let ix = 128;
  for (const [sz, bg] of [[0.5, '#2a2a33'], [0.75, '#2a2a33'], [1, '#fff3d6']] as const) {
    g.fillStyle = bg;
    g.beginPath();
    g.arc(ix, 541, 18 * sz + 4, 0, Math.PI * 2);
    g.fill();
    drawKilishiIcon(g, ix, 541, sz);
    ix += 48;
  }
  label(g, 'Kilishi: thin dark spiced strips', 280, 520, 10);
  label(g, 'folded in paper (road; HUD 16, 24, 32)', 280, 534, 10);
  frame(g, 464, 506, 484, 70, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(464, 506, 484, 70);
  g.clip();
  crisp(() => {
    drawHoop(g, 622 + ((time * 14) % 40), 568, time);
    person(g, KURMI_HOOP[0], 604, 568, 'run1');
    person(g, KURMI_HOOP[1], 582, 568, 'run3');
    person(g, KURMI_HOOP[2], 552, 568, 'walk0');
  });
  g.restore();
  label(g, 'Hoop: two children, a parent close by', 700, 520, 10);
  frame(g, 12, 592, 936, 100, '#f3e2bb');
  castRow(g, 14, 610, 1.55);
  label(g, 'Kurmi cast, 16 looks, crisp (style 1.8): sellers, reader, shopper, students, traders from other states, children, parent, elders (no stick), wheelchair user', 12, 696, 10);
};

export const KANO_PAGES: readonly Page[] = [gates, rides, kurmiStreet, kurmiPieces];

export function drawKanoGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, page: number): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  (KANO_PAGES[page] ?? KANO_PAGES[0]!)(g, time);
  g.restore();
}
