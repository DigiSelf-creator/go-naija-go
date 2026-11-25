/**
 * K3a: Kano's well room, the groundnut store (docs/kano.md 3.7; kano-well.json): a cool store room
 * under the market, earth walls, a timber beam, light through two holes in the ceiling (no
 * flame), sacks of groundnuts and baskets of kuli-kuli. The shelves in file order: groundnut
 * sacks, the plank shelf (the parcel's), groundnut sacks. The gift is the garri parcel with Kano's
 * look (KN-R11): garri, sugar and groundnuts tied in our own strip-woven cloth. The store keeper,
 * an elder woman in a wrapper and head shawl, sits on a low stool by the back wall.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { FolkLook } from '../../art/folk';
import { KANO, KANO_INK as INK } from './gate';
import { box, disc, look } from './kurmi';

type G = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** The room (room units, as the Lagos and Ogun rooms: floor 300, beam 116, ropes at 60 and 500). */
export const KANO_ROOM = { w: 560, floorY: 300, beamY: 116, arriveX: 60, exitX: 500 } as const;

/** The store keeper (3.7): an elder woman in a wrapper and head shawl on a low stool. Frames: sit, wave0/1, clap0/1. */
export const KANO_STORE_KEEPER: FolkLook = look(5, 'e', 'f', 'medium', 'grey', 'headscarf', 'wrapperBlouse', '#1aa39a', '#f2b300', { h: '#f4ead2', stool: true });
/** Where she sits (room units): by the back wall, well away from the rope's hang at 60. */
export const KANO_STORE_KEEPER_SPOT = { x: 92, y: 292 } as const;

const R = {
  deep: '#1c1712',
  wall: '#a8785a',
  wallLight: '#bb8c6c',
  wallDark: '#8c6248',
  ceiling: '#5a4232',
  beam: '#6b4a2b',
  beamLight: '#8a6440',
  shaft: 'rgba(255,240,200,0.16)',
  floor: '#7a5a40',
  floorTop: '#96704e',
  sack: '#d9bd8a',
  sackDark: '#b89a66',
  nut: '#c98d4e',
  kuli: '#9a5a2a',
  plank: '#a77a4a',
  plankDark: '#7b5a3a',
} as const;

/** A groundnut: two round lobes, a pinched middle. */
function nut(g: G, x: number, y: number, r = 1.6): void {
  disc(g, x - r * 0.7, y, r, R.nut);
  disc(g, x + r * 0.7, y, r, R.nut);
}

/** One tied sack (its bottom middle at x, base), with a painted groundnut of our own on its face. */
function sack(g: G, x: number, base: number, w: number, h: number): void {
  g.fillStyle = R.sack;
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(x - w / 2, base);
  g.quadraticCurveTo(x - w / 2 - 2, base - h * 0.6, x - w / 2 + 3, base - h);
  g.lineTo(x + w / 2 - 3, base - h);
  g.quadraticCurveTo(x + w / 2 + 2, base - h * 0.6, x + w / 2, base);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = R.sackDark;
  g.fillRect(x - w / 2 + 3, base - h + 3, w - 6, 1.4);
  if (w > 16 && h > 14) nut(g, x, base - h * 0.45, 2.2);
}

/** Room units: groundnut sacks stacked as a shelf, w wide, top exactly at y (a one-way platform). */
export function drawGroundnutSacks(g: G, x: number, y: number, w: number, floorY: number = KANO_ROOM.floorY): void {
  const rows = Math.max(1, Math.round((floorY - y) / 24));
  const rh = (floorY - y) / rows;
  for (let r = 0; r < rows; r++) {
    const n = Math.max(1, Math.round(w / 38) - (r % 2));
    const sw = w / n;
    const off = r % 2 ? (w - sw * n) / 2 : 0;
    for (let i = 0; i < n; i++) sack(g, x + off + sw * i + sw / 2, floorY - r * rh, sw - 1, rh + (r < rows - 1 ? 1 : 0));
  }
  // A few loose nuts on top, then the landing line
  for (let i = 0; i < 3; i++) nut(g, x + 14 + i * (w - 28) / 2, y + 2, 1.4);
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x + 3, y);
  g.lineTo(x + w - 3, y);
  g.stroke();
}

/** A round basket of kuli-kuli rings (our own groundnut snack drawing), its bottom middle at (x, base). */
function kuliBasket(g: G, x: number, base: number, w: number): void {
  g.fillStyle = R.kuli;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(x - w * 0.3 + (i * w * 0.6) / 3, base - 9 - (i % 2) * 2, 3.4, 2.4, 0, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#e8c58c';
  for (let i = 0; i < 4; i++) g.fillRect(x - w * 0.3 + (i * w * 0.6) / 3 - 1, base - 10 - (i % 2) * 2, 2, 1.2);
  g.fillStyle = '#c99b55';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(x, base - 8, w / 2, 3, 0, 0, Math.PI);
  g.lineTo(x - w / 2 + 3, base);
  g.lineTo(x + w / 2 - 3, base);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = '#8a6634';
  g.beginPath();
  g.moveTo(x - w / 2 + 2, base - 4);
  g.lineTo(x + w / 2 - 2, base - 4);
  g.stroke();
}

/** Room units: a plank shelf on two legs (a one-way platform), top exactly at y, with kuli-kuli baskets on its low rail. */
export function drawKuliShelf(g: G, x: number, y: number, w: number, floorY: number = KANO_ROOM.floorY): void {
  const rail = y + (floorY - y) * 0.6;
  g.fillStyle = R.plankDark;
  g.fillRect(x + 8, y + 6, 5, floorY - y - 6);
  g.fillRect(x + w - 13, y + 6, 5, floorY - y - 6);
  g.fillRect(x + 8, rail, w - 16, 3);
  kuliBasket(g, x + w * 0.32, rail, 24);
  kuliBasket(g, x + w * 0.68, rail, 24);
  box(g, x, y, w, 7, R.plank);
  g.fillStyle = R.plankDark;
  g.fillRect(x + 2, y + 4, w - 4, 1);
}

/**
 * The groundnut store behind everything (room units): earth walls, the beam and posts, the two
 * light shafts with slow dust, a high shelf of folded indigo cloth, groundnut sacks and kuli-kuli
 * along the back wall. Pass the camera so dark earth fills a wide screen. Still: the dust holds.
 */
export function drawKanoWellRoom(g: G, camX: number, viewW: number, time: number, viewH = 420, still = false): void {
  const t = still || !Number.isFinite(time) ? 0 : time;
  const { w: W, floorY: F, beamY: B } = KANO_ROOM;
  g.fillStyle = R.deep;
  g.fillRect(camX - 10, 0, viewW + 20, viewH);
  // Smooth earth walls with a lighter band and a low darker skirt
  g.fillStyle = R.wall;
  g.fillRect(0, 0, W, F);
  g.fillStyle = R.wallLight;
  g.fillRect(0, 150, W, 22);
  g.fillStyle = R.wallDark;
  g.fillRect(0, F - 34, W, 34);
  // Our own raised zigzag band along the wall
  g.strokeStyle = R.wallLight;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(30, F - 40);
  for (let x = 36, i = 1; x < W - 30; x += 6, i++) g.lineTo(x, F - (i % 2 ? 46 : 40));
  g.stroke();
  // Ceiling and the light from the two holes
  g.fillStyle = R.ceiling;
  g.fillRect(0, 0, W, B - 12);
  for (const x of [KANO_ROOM.arriveX, KANO_ROOM.exitX]) {
    g.fillStyle = R.shaft;
    g.beginPath();
    g.moveTo(x - 12, 0);
    g.lineTo(x + 12, 0);
    g.lineTo(x + 32, F);
    g.lineTo(x - 32, F);
    g.closePath();
    g.fill();
    g.fillStyle = '#f7eecd';
    g.beginPath();
    g.ellipse(x, B - 14, 14, 3, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,248,220,0.8)';
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.05 + i / 4 + ((x * 7 + i * 13) % 10) / 10) % 1;
      g.fillRect(x - 10 + i * 6 + Math.sin(t + i) * 3, B + p * (F - B - 20), 1.5, 1.5);
    }
  }
  g.fillStyle = R.beam;
  g.fillRect(0, B - 12, W, 12);
  g.fillStyle = R.beamLight;
  g.fillRect(0, B - 12, W, 3);
  for (const x of [0, W - 30]) {
    g.fillStyle = R.wallDark;
    g.fillRect(x, 0, 30, F);
    g.fillStyle = R.beam;
    g.fillRect(x + (x ? 6 : 22), B - 12, 8, F - B + 12);
  }
  // The high wall shelf: folded indigo cloth and measuring bowls (scenery, out of reach)
  box(g, 150, 160, 120, 5, R.plank, 1);
  for (const [fx, n] of [[158, 4], [192, 3], [226, 5]] as const)
    for (let i = 0; i < n; i++) box(g, fx, 160 - (i + 1) * 4, 28, 4, i % 2 ? '#35509e' : KANO.indigo, 0.8);
  box(g, 330, 168, 90, 5, R.plank, 1);
  for (const bx of [344, 364]) {
    g.fillStyle = '#c98a3e';
    g.beginPath();
    g.ellipse(bx, 166, 7, 4, 0, 0, Math.PI, true);
    g.fill();
  }
  sack(g, 400, 168, 22, 22);
  // Packed earth floor
  g.fillStyle = R.floor;
  g.fillRect(0, F, W, viewH - F);
  g.fillStyle = R.floorTop;
  g.fillRect(0, F, W, 4);
  // Along the back wall: kuli-kuli baskets, an open sack of groundnuts, sacks
  kuliBasket(g, 40, F, 26);
  kuliBasket(g, 186, F, 26);
  sack(g, 470, F, 26, 22);
  g.fillStyle = R.nut;
  g.beginPath();
  g.ellipse(470, F - 22, 11, 3.5, 0, Math.PI, TAU);
  g.fill();
  sack(g, 522, F, 26, 30);
  sack(g, 530, F - 30, 22, 22);
}

/** The parcel centred on (0, 0), about 24 x 22: a garri sack tied in our own strip-woven cloth, groundnuts and sugar at the top. */
function parcel(g: G, line: number): void {
  g.strokeStyle = INK;
  g.lineWidth = line;
  g.fillStyle = '#efe2c0';
  g.beginPath();
  g.moveTo(-9, 10);
  g.quadraticCurveTo(-12, 0, -7, -6);
  g.lineTo(7, -6);
  g.quadraticCurveTo(12, 0, 9, 10);
  g.closePath();
  g.fill();
  g.stroke();
  // The woven cloth round its middle: narrow strips of indigo, cream and gold, side by side
  g.save();
  g.beginPath();
  g.moveTo(-11, -1);
  g.quadraticCurveTo(0, 2, 11, -1);
  g.lineTo(10.5, 6);
  g.quadraticCurveTo(0, 9, -10.5, 6);
  g.closePath();
  g.fillStyle = KANO.indigo;
  g.fill();
  g.clip();
  for (let i = 0; i < 6; i++) {
    g.fillStyle = [KANO.cream, KANO.gold][i % 2]!;
    g.fillRect(-10 + i * 4, -2, 1.6, 12);
  }
  g.restore();
  g.beginPath();
  g.moveTo(-11, -1);
  g.quadraticCurveTo(0, 2, 11, -1);
  g.lineTo(10.5, 6);
  g.quadraticCurveTo(0, 9, -10.5, 6);
  g.closePath();
  g.stroke();
  // Garri and sugar at the top, groundnuts beside them, and the cloth knot
  g.fillStyle = '#f6efd8';
  g.beginPath();
  g.ellipse(-1, -6, 6, 2, 0, 0, TAU);
  g.fill();
  nut(g, 3.5, -7, 1.3);
  nut(g, -3.5, -7.5, 1.2);
  g.fillStyle = KANO.indigo;
  g.beginPath();
  g.ellipse(-4, -10, 3.4, 2, -0.5, 0, TAU);
  g.ellipse(4, -10, 3.4, 2, 0.5, 0, TAU);
  g.fill();
  g.stroke();
  box(g, -2, -9.5, 4, 4, KANO.gold, line * 0.8);
}

/** Room units: Kano's garri parcel on its shelf, centred on (x, y); it bobs and glints, so it reads as a gift. */
export function drawKanoParcel(g: G, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  g.save();
  g.translate(x, y + Math.sin(t * 2.4) * 1.5);
  parcel(g, 1.3);
  const k = (t % 2) / 2;
  if (k < 0.25) {
    g.globalAlpha = 1 - k / 0.25;
    g.strokeStyle = '#fff6c2';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(9, -10);
    g.lineTo(9, -16);
    g.moveTo(6, -13);
    g.lineTo(12, -13);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
}

/** Small still parcel for the HUD, centred on (x, y), about `size` across. */
export function drawKanoParcelIcon(g: G, x: number, y: number, size = 24): void {
  const s = (Number.isFinite(size) ? size : 24) / 26;
  g.save();
  g.translate(x, y + s);
  g.scale(s, s);
  parcel(g, 1.6);
  g.restore();
}
