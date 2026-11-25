/**
 * Kano's gateway pieces for qa and Tp (debug only; docs/kano.md 1.2 to 1.6, art K1a):
 * ?gallery=kano   the wall and gate: faded, bright (cog turning), bright at night, with the wall
 *                 running off both sides; the small gate, the "To Kano" icon and card; the pennant;
 * ?gallery=kano2  the long ride north (seven frames and a live 5 s loop), the ride back, the
 *                 reduced-motion end picture, and the ride at 320 x 240, 640 x 200 and 851 x 393.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import { drawGateIcon } from './gateway';
import { drawHero, type HeroLook } from './hero';
import { INK } from './palette';
import { drawKanoGate, drawKanoRide, drawKanoWall, KANO_RIDE, type KanoRideOpts } from '../worlds/kano/galleryArt';
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

export const KANO_PAGES: readonly Page[] = [gates, rides];

export function drawKanoGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, page: number): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  (KANO_PAGES[page] ?? KANO_PAGES[0]!)(g, time);
  g.restore();
}
