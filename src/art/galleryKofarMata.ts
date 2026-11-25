/**
 * K3a: Kofar Mata's gallery pages (debug only; docs/kano.md 3.3, 3.5, 3.7, 4.1 and 7), shown as
 * ?gallery=kano5 and ?gallery=kano6 (galleryKano.ts adds them to its pages):
 * kano5  Kofar Mata: the dye yards behind the wall, springy cloth and its sign, the dyers, beaters
 *        and traders in place, the cloth up to a roof, 320 x 240 real size, and greyscale;
 * kano6  the pieces: cloth frames (three patterns, the dip), the bounce sign, fura da nono (road,
 *        HUD), the stalls with their traders, the dye pit, the beating log, the tailor, the
 *        groundnut store with its keeper, shelves and parcel, and the whole cast, crisp (style 1.8).
 */
import { drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { drawHero, type HeroLook } from './hero';
import { setInkRatio } from './ink';
import { INK } from './palette';
import {
  BEATING_LOG,
  CLOTH_FRAME,
  DYE_PIT,
  KANO_ROOM,
  KANO_STORE_KEEPER,
  KANO_STORE_KEEPER_SPOT,
  KOFAR_BEATERS,
  KOFAR_BUYER,
  KOFAR_CHILD,
  KOFAR_DYERS,
  KOFAR_MATA_CAST,
  KOFAR_TAILOR,
  KOFAR_TRADER_LOOKS,
  KOFAR_TRADERS,
  clothDip,
  drawBeatingLog,
  drawBounceSign,
  drawClothFrame,
  drawDyePit,
  drawFura,
  drawFuraIcon,
  drawGroundnutSacks,
  drawKanoParcel,
  drawKanoParcelIcon,
  drawKanoTailorTable,
  drawKanoWellRoom,
  drawKofarMataBackdrop,
  drawKofarMataStall,
  drawKofarMataTraderStall,
  drawKuliShelf,
  drawWindSign,
  drawWindStreamers,
  windShow,
  type WindStretch,
} from '../worlds/kano/galleryArt';
import { KANO_WORDS } from '../worlds/kano/words';

type Page = (g: CanvasRenderingContext2D, time: number) => void;
const GY = 300;

/** Kofar Mata's wind, road and cloth as kano-2.json has them (the first part of the street). */
const WIND: readonly WindStretch[] = [[2500, 700, 'back'], [7200, 700, 'face'], [10300, 600, 'back']];
const GROUND: readonly (readonly [number, number])[] = [[-400, 2900], [3000, 6000], [6100, 6720], [6890, 7800]];
const SPRINGS = [1250, 1800, 5700] as const;
const ROOFS: readonly (readonly [number, number])[] = [[1950, 120], [5850, 300]];

const HEROES: readonly HeroLook[] = [
  { skin: 1, hair: 2, outfit: 3, body: 0, age: 1 },
  { skin: 5, hair: 3, outfit: 1, body: 1, age: 0 },
  { skin: 3, hair: 1, outfit: 2, body: 1, age: 2 },
];

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

function hero(g: CanvasRenderingContext2D, look: HeroLook, x: number, y: number, air: boolean, time: number): void {
  g.save();
  g.translate(x, y);
  drawHero(g, look, { phase: (time * 2) % 1, inAir: air, facing: 1, glow: false, standing: false, time });
  g.restore();
}

/** The yard pieces and their people at one spot of the back pavement (feet at y). */
function yard(c: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  drawDyePit(c, x, y, time);
  person(c, KOFAR_DYERS[0], x + DYE_PIT.dyerAt, y, 'stand');
  drawBeatingLog(c, x + 110, y, time);
  person(c, KOFAR_BEATERS[0], x + 110 + BEATING_LOG.beaters[0], y, 'sit');
  person(c, KOFAR_BEATERS[1], x + 110 + BEATING_LOG.beaters[1], y, 'sit', true);
}

interface StreetOpts {
  hero?: readonly [number, number, boolean];
  scene?: (g: CanvasRenderingContext2D) => void;
  grey?: boolean;
}

/** One Kofar Mata view at the game's 420-unit height (road drawn plainly here). */
function street(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, camX: number, time: number, name: string, o: StreetOpts = {}): void {
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
  drawKofarMataBackdrop(g, camX, V, time, 420, GY, false, windShow(WIND, hx));
  g.translate(-camX, 0);
  for (const [a, ww, dir] of WIND) {
    if (a + ww < camX - 60 || a > camX + V + 60) continue;
    drawWindStreamers(g, a, a + ww, GY, dir, time, false, camX - 20, camX + V + 20);
    drawWindSign(g, a, GY, dir, time);
  }
  crisp(() => o.scene?.(g));
  for (const [rx, rw] of ROOFS) drawKofarMataStall(g, rx, GY - 150, rw, GY);
  g.fillStyle = '#3a2a20';
  g.fillRect(camX, GY, V, 120);
  for (const [a, b] of GROUND) {
    if (b < camX || a > camX + V) continue;
    g.fillStyle = '#6e6a66';
    g.fillRect(a, GY, b - a, 120);
    g.fillStyle = '#efe4c8';
    g.fillRect(a, GY, b - a, 4);
  }
  drawBounceSign(g, SPRINGS[0] - 40, GY);
  for (const sx of SPRINGS) drawClothFrame(g, sx, 100, GY, { dip: sx === 1250 ? clothDip(time % 1.2) : 0 });
  if (o.hero) hero(g, HEROES[0]!, o.hero[0], o.hero[1], o.hero[2], time);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (name) label(g, name, x, y + h + 3, 10);
}

const kofarStreet: Page = (g, time) => {
  label(g, 'K3a Kofar Mata: midday at the dye pits. The pits stay behind the low wall (scenery only); cloth frames, hero and food stand out.', 12, 6, 12);
  street(g, 12, 24, 600, 300, 640, time, 'Warm up to the first cloth at 1250: the cloth and fura stalls, a dyer at a pit, the beaters, the bounce sign', {
    hero: [1300, GY - 30 - 40 * Math.abs(Math.sin(time * 2.6)), true],
    scene: (c) => {
      KOFAR_TRADERS.forEach((kind, i) => {
        const sx = 700 + i * 100;
        drawKofarMataTraderStall(c, kind, sx, GY - 8);
        person(c, KOFAR_TRADER_LOOKS[kind], sx - 36, GY - 8, 'call');
      });
      yard(c, 1020, GY - 8, time);
    },
  });
  street(g, 624, 24, 320, 240, 1700, time, '320 x 240 at real size: the cloth at 1800 under its roof', { hero: [1860, GY - 110, true] });
  label(g, 'Springy cloth is never colour alone: the frame', 624, 284, 10);
  label(g, "shape, its sag, the wooden legs and the bounce", 624, 297, 10);
  label(g, 'sign (a springy line and an arrow up, no words).', 624, 310, 10);
  street(g, 12, 350, 462, 260, 5560, time, 'Cloth at 5700 up to the long roof over the wide pit at 6000', {
    hero: [5900, GY - 150, false],
    scene: (c) => {
      drawKanoTailorTable(c, 5640, GY - 8);
      person(c, KOFAR_TAILOR, 5618, GY - 8, 'sit');
      person(c, KOFAR_BUYER, 5560, GY - 8, 'call');
    },
  });
  street(g, 486, 350, 462, 260, 2560, time, 'The tailwind from 2500 over the wide pit at 2900; a child with a parent', {
    hero: [2880, GY - 90, true],
    scene: (c) => {
      person(c, KOFAR_CHILD[0], 2720, GY - 8, 'walk1');
      person(c, KOFAR_CHILD[1], 2700, GY - 8, 'walk0');
    },
  });
  street(g, 12, 636, 300, 76, 1100, time, '', { hero: [1300, GY - 60, true], grey: true, scene: (c) => yard(c, 1100, GY - 8, time) });
  street(g, 324, 636, 300, 76, 5600, time, '', { grey: true });
  label(g, 'Greyscale: the cloth, the sign and the pits read by shape.', 636, 660, 11);
};

/** The whole cast baked at the screen's own pixels (style 1.8 part 5), then copied whole pixel for whole pixel. */
function castRow(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const m = g.getTransform();
  const dpu = m.a * s;
  const step = 37;
  const c = document.createElement('canvas');
  c.width = Math.ceil(KOFAR_MATA_CAST.length * step * dpu);
  c.height = Math.ceil(56 * dpu);
  const cg = c.getContext('2d')!;
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  KOFAR_MATA_CAST.forEach((look, i) => {
    cg.setTransform(dpu, 0, 0, dpu, (i * step + 20) * dpu, 50 * dpu);
    drawFolkFrame(cg, look, i < 3 || i === 8 ? 'call' : i === 12 ? 'wave0' : 'stand');
  });
  setInkRatio(null);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, Math.round(m.e + x * m.a), Math.round(m.f + y * m.d));
  g.setTransform(m);
}

const kofarPieces: Page = (g, time) => {
  label(g, 'K3a pieces: cloth frames (3 patterns; the dip), the bounce sign, fura da nono, stalls, dye pit, beating log, tailor, groundnut store, cast', 12, 6, 12);
  // Cloth frames at 2x: three patterns at rest, then the dip after a landing
  frame(g, 12, 24, 600, 120, '#f3e2bb');
  g.save();
  g.translate(12, 24);
  g.scale(1.6, 1.6);
  for (let k = 0; k < 3; k++) drawClothFrame(g, 10 + k * 116, 100, 64, { look: k });
  g.restore();
  label(g, 'Three own patterns (rings, zigzag, steps) on deep dyed blue; 30 u high', 16, 26, 10);
  frame(g, 624, 24, 324, 120, '#f3e2bb');
  g.save();
  g.translate(624, 24);
  for (let i = 0; i < 4; i++) {
    const since = (i * CLOTH_FRAME.dipS) / 6;
    drawClothFrame(g, 10 + i * 78, 70, 96, { dip: clothDip(since), look: 0 });
    label(g, `${since.toFixed(2)} s`, 30 + i * 78, 100, 9);
  }
  drawBounceSign(g, 300, 96);
  g.restore();
  label(g, 'The dip after a landing; the bounce sign', 628, 26, 10);
  // Fura da nono on the road and in the HUD
  frame(g, 12, 158, 300, 80, '#fbf3df');
  g.save();
  g.translate(56, 198);
  g.scale(1.5, 1.5);
  drawFura(g, 0, 0, time);
  g.restore();
  let ix = 130;
  for (const [sz, bg] of [[0.5, '#2a2a33'], [0.75, '#2a2a33'], [1, '#fff3d6']] as const) {
    g.fillStyle = bg;
    g.beginPath();
    g.arc(ix, 198, 18 * sz + 4, 0, Math.PI * 2);
    g.fill();
    drawFuraIcon(g, ix, 198, sz);
    ix += 48;
  }
  label(g, 'Fura da nono: calabash, nono, fura ball (road; HUD 16, 24, 32)', 16, 226, 9);
  // Stalls with their traders calling
  const calls = KANO_WORDS.folk.traders.kofarMata;
  frame(g, 324, 158, 624, 150, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(324, 158, 624, 150);
  g.clip();
  crisp(() =>
    KOFAR_TRADERS.forEach((kind, i) => {
      const sx = 440 + i * 200;
      g.save();
      g.translate(sx, 300);
      g.scale(1.3, 1.3);
      drawKofarMataTraderStall(g, kind, 0, 0);
      person(g, KOFAR_TRADER_LOOKS[kind], -36, 0, 'call');
      g.restore();
      drawBubble(g, calls[i]!, sx - 46, 186, { tail: 'centre', px: 11 });
    }),
  );
  g.restore();
  // The dye pit (three lift times), the beating log with its beaters, the tailor
  frame(g, 12, 322, 936, 120, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(12, 322, 936, 120);
  g.clip();
  crisp(() => {
    g.save();
    g.translate(12, 430);
    g.scale(1.4, 1.4);
    [0, 0.8, 1.6].forEach((t, i) => {
      drawDyePit(g, 50 + i * 90, 0, t + time);
      person(g, KOFAR_DYERS[i]!, 50 + i * 90 + DYE_PIT.dyerAt, 0, 'stand');
    });
    drawBeatingLog(g, 360, 0, time);
    person(g, KOFAR_BEATERS[0], 360 + BEATING_LOG.beaters[0], 0, 'sit');
    person(g, KOFAR_BEATERS[1], 360 + BEATING_LOG.beaters[1], 0, 'sit', true);
    drawKanoTailorTable(g, 470, 0);
    person(g, KOFAR_TAILOR, 448, 0, 'sit');
    drawBeatingLog(g, 560, 0, 0, true);
    label(g, 'still', 552, 4, 8);
    g.restore();
  });
  g.restore();
  label(g, 'Dyers at the pits (lift), the beaters (tok-tok), the tailor; the pits stay behind the low wall', 16, 324, 10);
  // The groundnut store with its keeper, shelves and the parcel
  const ry = 456;
  frame(g, 12, ry, 420, 160, '#1c1712');
  g.save();
  g.beginPath();
  g.rect(12, ry, 420, 160);
  g.clip();
  g.translate(12, ry);
  const s = 420 / KANO_ROOM.w;
  g.scale(s, s);
  g.translate(0, -100);
  drawKanoWellRoom(g, 0, KANO_ROOM.w, time, 320);
  drawGroundnutSacks(g, 100, 250, 90);
  drawKuliShelf(g, 230, 205, 100);
  drawGroundnutSacks(g, 390, 240, 90);
  drawKanoParcel(g, 280, 181, time);
  const kf: FolkFrame = (['sit', 'wave0', 'wave1', 'clap0', 'clap1'] as const)[Math.floor(time) % 5]!;
  crisp(() => person(g, KANO_STORE_KEEPER, KANO_STORE_KEEPER_SPOT.x, KANO_STORE_KEEPER_SPOT.y, kf));
  g.restore();
  drawBubble(g, KANO_WORDS.folk.storeKeeper, 110, ry + 6, { tail: 'centre', px: 10 });
  frame(g, 444, ry, 120, 160, '#fbf3df');
  g.save();
  g.translate(504, ry + 50);
  g.scale(2, 2);
  drawKanoParcel(g, 0, 0, time);
  g.restore();
  g.fillStyle = '#2a2a33';
  g.beginPath();
  g.arc(480, ry + 120, 16, 0, Math.PI * 2);
  g.fill();
  drawKanoParcelIcon(g, 480, ry + 120, 24);
  drawKanoParcelIcon(g, 530, ry + 120, 16);
  label(g, 'Garri parcel', 448, ry + 140, 10);
  label(g, 'Groundnut store: sacks, kuli-kuli, light through the ceiling;', 576, ry + 4, 10);
  label(g, 'the keeper on her stool (sit, wave, clap)', 576, ry + 20, 10);
  label(g, 'Toast: "Groundnut garri parcel! Shield for the hall."', 576, ry + 36, 10);
  frame(g, 12, 628, 936, 76, '#f3e2bb');
  castRow(g, 14, 632, 1.25);
  label(g, 'Kofar Mata cast, 16 looks, crisp: cloth and fura sellers, 3 dyers, 2 beaters (stools), buyer, head-load seller, tailor, student, child and parent, wheelchair user, elder', 12, 706, 10);
};

export const KOFAR_MATA_PAGES: readonly Page[] = [kofarStreet, kofarPieces];
