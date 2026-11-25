/**
 * K4a: Dawanau's gallery pages (debug only; docs/kano.md 2.2, 3.3, 3.6 and 7), shown as
 * ?gallery=kano7 and ?gallery=kano8 (galleryKano.ts adds them to its pages):
 * kano7  Dawanau: the evening grain market, the first whirl and the hint spot, the sack steps,
 *        the fura row of whirls, the secret well behind its front stack, 320 x 240 real size, and
 *        greyscale;
 * kano8  the pieces: the dust whirl (spin, sway, puff apart, still, on the road, pavement and hall
 *        floor at real size, greyscale), sack steps, the front stack, the groundnut pyramid (faded,
 *        bright), the stalls with their traders, grain sacks, oil table, tea box, porters, and the
 *        whole cast, crisp (style 1.8).
 */
import { drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { drawHero, type HeroLook } from './hero';
import { setInkRatio } from './ink';
import { INK } from './palette';
import { drawWell } from './well';
import {
  BH,
  DAWANAU,
  DAWANAU_CAST,
  DAWANAU_DRIVER,
  DAWANAU_FAMILY,
  DAWANAU_MEASURERS,
  DAWANAU_OIL_SELLER,
  DAWANAU_PORTERS,
  DAWANAU_TRADER_LOOKS,
  DAWANAU_TRADERS,
  GRAIN_SPOT,
  WHIRL,
  drawDawanauBackdrop,
  drawDawanauStall,
  drawDawanauTraderStall,
  drawDustWhirl,
  drawFura,
  drawGrainSack,
  drawGroundnutPyramid,
  drawHeadSack,
  drawOilTable,
  drawSackFront,
  drawSackSteps,
  drawTeaBox,
  drawWhirlIcon,
  whirlPuffK,
  type GrainKind,
} from '../worlds/kano/galleryArt';
import { KANO_WORDS } from '../worlds/kano/words';

type Page = (g: CanvasRenderingContext2D, time: number) => void;
const GY = 300;

/** Dawanau's road, sacks and whirls as kano-3.json has them. */
const GROUND: readonly (readonly [number, number])[] = [[-400, 3500], [3540, 6600], [6660, 7600]];
const SACKS: readonly (readonly [number, number, number])[] = [[2800, 100, 50], [2930, 100, 100], [3060, 100, 150], [6100, 100, 60], [6230, 100, 120]];
const WHIRLS = [1500, 2200, 4300, 4600, 4900] as const;
const WELL_X = 5150;

const HEROES: readonly HeroLook[] = [
  { skin: 6, hair: 2, outfit: 1, body: 1, age: 1 },
  { skin: 2, hair: 3, outfit: 3, body: 0, age: 0 },
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

/** A whirl drifting left at 50 u/s from its level x, looping over 2 s (as the game moves it). */
const drift = (x: number, time: number): number => x - ((time * 50) % 100);

/** The market pieces and their people at one spot of the back pavement (feet at y). */
function market(c: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  DAWANAU_TRADERS.forEach((kind, i) => {
    const sx = x + i * 96;
    drawDawanauTraderStall(c, kind, sx, y);
    person(c, DAWANAU_TRADER_LOOKS[kind], sx - 36, y, 'call');
  });
  drawGrainSack(c, x + 310, y, 'millet', time);
  person(c, DAWANAU_MEASURERS[0], x + 310 + GRAIN_SPOT.trader, y, 'stand');
}

interface StreetOpts {
  hero?: readonly [number, number, boolean];
  scene?: (g: CanvasRenderingContext2D) => void;
  grey?: boolean;
}

/** One Dawanau view at the game's 420-unit height (road drawn plainly here). */
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
  drawDawanauBackdrop(g, camX, V, time, 420, GY);
  g.translate(-camX, 0);
  crisp(() => o.scene?.(g));
  if (WELL_X > camX - 80 && WELL_X < camX + V + 80) drawWell(g, WELL_X, GY, { kind: 'entrance', time });
  g.fillStyle = '#3a2a20';
  g.fillRect(camX, GY, V, 120);
  for (const [a, b] of GROUND) {
    if (b < camX || a > camX + V) continue;
    g.fillStyle = '#6e6a66';
    g.fillRect(a, GY, b - a, 120);
    g.fillStyle = '#efe4c8';
    g.fillRect(a, GY, b - a, 4);
  }
  for (const [sx, sw, sh] of SACKS) drawSackSteps(g, sx, sw, sh, GY);
  drawDawanauStall(g, 9850, GY - 150, 120, GY);
  for (const wx of WHIRLS) drawDustWhirl(g, drift(wx, time), GY, time);
  if (o.hero) hero(g, HEROES[0]!, o.hero[0], o.hero[1], o.hero[2], time);
  drawSackFront(g, WELL_X, GY);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (name) label(g, name, x, y + h + 3, 10);
}

const dawanauStreet: Page = (g, time) => {
  label(g, 'K4a Dawanau: evening at the grain market, gold haze far off only (the pyramid). Whirls, sacks, hero and food stand out.', 12, 6, 12);
  street(g, 12, 24, 600, 300, 1080, time, 'The first whirl at 1500 alone (hint 1100), the traders and a grain trader with his bowl', {
    hero: [1420, GY - 70 * Math.abs(Math.sin(time * 2.2)), true],
    scene: (c) => market(c, 1120, GY - 8, time),
  });
  street(g, 624, 24, 320, 240, 1420, time, '320 x 240 at real size: the whirl at 1500', { hero: [1470, GY - 60, true] });
  label(g, 'The whirl is never colour alone: the stacked', 624, 284, 10);
  label(g, 'rings with their ink outline, the spinning streaks,', 624, 297, 10);
  label(g, 'the turning leaves, and its soft "fff".', 624, 310, 10);
  street(g, 12, 350, 462, 260, 2700, time, 'Sack steps 50, 100, 150 high (rocks under another look), kobo on top', {
    hero: [2960, GY - 100, false],
    scene: (c) => {
      person(c, DAWANAU_PORTERS[0], 2760, GY - 8, 'walk1');
      drawHeadSack(c, 2760, GY - 8);
    },
  });
  street(g, 486, 350, 462, 260, 4560, time, 'The fura row (4300 to 4900), then the secret well behind its front stack; the arrow peeks over', {
    hero: [4700, GY - 30, true],
    scene: (c) => drawFura(c, 4640, GY - 28, time),
  });
  street(g, 12, 636, 300, 76, 1300, time, '', { hero: [1400, GY - 60, true], grey: true });
  street(g, 324, 636, 300, 76, 2760, time, '', { grey: true });
  label(g, 'Greyscale: the whirl, the sacks and the stalls read by shape.', 636, 660, 11);
};

/** The whole cast baked at the screen's own pixels (style 1.8 part 5), then copied whole pixel for whole pixel. */
function castRow(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const m = g.getTransform();
  const dpu = m.a * s;
  const step = 37;
  const c = document.createElement('canvas');
  c.width = Math.ceil(DAWANAU_CAST.length * step * dpu);
  c.height = Math.ceil(60 * dpu);
  const cg = c.getContext('2d')!;
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  DAWANAU_CAST.forEach((look, i) => {
    cg.setTransform(dpu, 0, 0, dpu, (i * step + 20) * dpu, 56 * dpu);
    drawFolkFrame(cg, look, i < 4 ? 'call' : i === 7 ? 'wave0' : 'stand');
    if (i === 5 || i === 6) drawHeadSack(cg, 0, 0);
  });
  setInkRatio(null);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, Math.round(m.e + x * m.a), Math.round(m.f + y * m.d));
  g.setTransform(m);
}

/** One whirl on a strip of ground at a scale (u to px), optionally greyscale. */
function whirlOn(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: number, ground: string, back: string, time: number, grey = false): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  if (grey) g.filter = 'grayscale(1)';
  g.fillStyle = back;
  g.fillRect(x, y, w, h);
  g.fillStyle = ground;
  g.fillRect(x, y + h - 14, w, 14);
  g.translate(x + w / 2, y + h - 14);
  g.scale(s, s);
  drawDustWhirl(g, 0, 0, time);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

const dawanauPieces: Page = (g, time) => {
  label(g, 'K4a pieces: the dust whirl (30 x 50; also Borehole Hall), sack steps, the front stack, the groundnut pyramid, stalls, cast', 12, 6, 12);
  // The whirl at 2x: spin frames, then puffing apart, then still
  frame(g, 12, 24, 600, 132, '#f3e2bb');
  g.save();
  g.translate(12, 24);
  for (let i = 0; i < 5; i++) {
    g.save();
    g.translate(40 + i * 58, 122);
    g.scale(2, 2);
    drawDustWhirl(g, 0, 0, time + i * 0.14, { seed: 0 });
    g.restore();
  }
  for (let i = 0; i < 3; i++) {
    const since = (i + 0.5) * (WHIRL.puffS / 3);
    g.save();
    g.translate(350 + i * 70, 122);
    g.scale(2, 2);
    drawDustWhirl(g, 0, 0, time, { puff: whirlPuffK(since) });
    g.restore();
    label(g, `puff ${since.toFixed(2)} s`, 324 + i * 70, 4, 9);
  }
  g.save();
  g.translate(568, 122);
  g.scale(2, 2);
  drawDustWhirl(g, 0, 0, time, { still: true });
  g.restore();
  label(g, 'spinning, swaying (2x)', 4, 4, 9);
  label(g, 'still', 556, 4, 9);
  g.restore();
  // Real size at 320 x 240 (0.571 px per u) on the three grounds it meets, colour and greyscale
  label(g, 'At 320 x 240 real size: Dawanau road, pavement, Borehole Hall floor; then greyscale', 624, 24, 10);
  const grounds: [string, string][] = [['#6e6a66', DAWANAU.pave], [DAWANAU.pave, DAWANAU.skyLow], [BH.floor, BH.wall]];
  grounds.forEach(([gr, bk], i) => {
    whirlOn(g, 624 + i * 54, 40, 46, 48, 0.571, gr, bk, time);
    whirlOn(g, 624 + i * 54, 100, 46, 48, 0.571, gr, bk, time, true);
  });
  whirlOn(g, 790, 40, 70, 108, 1.4, BH.floor, BH.wall, time);
  label(g, 'hall floor 1.4x', 790, 150, 9);
  for (const [sz, bg] of [[16, '#2a2a33'], [24, '#fff3d6'], [32, '#fff3d6']] as const) {
    const ix = sz === 16 ? 884 : sz === 24 ? 910 : 936;
    g.fillStyle = bg;
    g.beginPath();
    g.arc(ix, 70, sz / 2 + 3, 0, Math.PI * 2);
    g.fill();
    drawWhirlIcon(g, ix, 70, sz);
  }
  label(g, 'icon', 900, 96, 9);
  // Sack steps, the front stack with the well and its arrow, the pyramid faded and bright
  frame(g, 12, 168, 936, 150, '#f8d9a2');
  g.save();
  g.beginPath();
  g.rect(12, 168, 936, 150);
  g.clip();
  g.translate(12, 168);
  g.scale(0.8, 0.8);
  g.fillStyle = '#6e6a66';
  g.fillRect(0, 170, 1170, 20);
  drawSackSteps(g, 20, 100, 50, 170);
  drawSackSteps(g, 150, 100, 100, 170);
  drawSackSteps(g, 280, 100, 150, 170);
  drawSackSteps(g, 400, 100, 60, 170);
  drawSackSteps(g, 520, 100, 120, 170);
  drawWell(g, 720, 170, { kind: 'entrance', time });
  crisp(() => hero(g, HEROES[1]!, 704, 170, false, time));
  drawSackFront(g, 720, 170);
  drawGroundnutPyramid(g, 900, 170, 1);
  drawGroundnutPyramid(g, 1060, 170, 1, true);
  g.restore();
  label(g, 'Sack steps 50, 100, 150, 60, 120 (top = landing line)', 16, 170, 10);
  label(g, 'Front stack: hero walks behind, arrow peeks over', 520, 170, 10);
  label(g, 'Pyramid: faded, bright (city build)', 700, 304, 10);
  // Stalls with their traders calling
  const calls = KANO_WORDS.folk.traders.dawanau;
  frame(g, 12, 330, 624, 150, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(12, 330, 624, 150);
  g.clip();
  crisp(() =>
    DAWANAU_TRADERS.forEach((kind, i) => {
      const sx = 130 + i * 200;
      g.save();
      g.translate(sx, 472);
      g.scale(1.3, 1.3);
      drawDawanauTraderStall(g, kind, 0, 0);
      person(g, DAWANAU_TRADER_LOOKS[kind], -36, 0, 'call');
      g.restore();
      drawBubble(g, calls[i]!, sx - 46, 372, { tail: 'centre', px: 11 });
    }),
  );
  g.restore();
  // The roof platform
  frame(g, 648, 330, 300, 150, '#f8d9a2');
  g.save();
  g.beginPath();
  g.rect(648, 330, 300, 150);
  g.clip();
  g.translate(648, 330);
  g.scale(0.9, 0.9);
  g.fillStyle = '#6e6a66';
  g.fillRect(0, 160, 340, 10);
  drawDawanauStall(g, 40, 10, 120, 160);
  crisp(() => hero(g, HEROES[0]!, 100, 160, false, time));
  g.restore();
  label(g, 'Roof platform (top = landing line); bags hang above the head', 652, 466, 9);
  // Grain sacks with the measurers, the oil seller, the driver's tea, porters, the family
  frame(g, 12, 492, 936, 130, '#f3e2bb');
  g.save();
  g.beginPath();
  g.rect(12, 492, 936, 130);
  g.clip();
  crisp(() => {
    g.save();
    g.translate(12, 612);
    g.scale(1.4, 1.4);
    (['millet', 'sorghum', 'maize', 'beans', 'groundnut'] as GrainKind[]).forEach((k, i) => drawGrainSack(g, 40 + i * 30, 0, k, time));
    person(g, DAWANAU_MEASURERS[0], 40 + GRAIN_SPOT.trader, 0, 'stand');
    person(g, DAWANAU_MEASURERS[1], 160 + 26, 0, 'sit', true);
    drawOilTable(g, 260, 0);
    person(g, DAWANAU_OIL_SELLER, 236, 0, 'stand');
    drawTeaBox(g, 340, 0, time);
    const wf: FolkFrame = Math.floor(time * 3) % 2 ? 'wave1' : 'wave0';
    person(g, DAWANAU_DRIVER, 322, 0, wf);
    DAWANAU_PORTERS.forEach((p, i) => {
      const wk = (['walk0', 'walk1', 'walk2', 'walk3'] as const)[Math.floor(time * 6 + i * 2) % 4]!;
      person(g, p, 400 + i * 30, 0, wk);
      drawHeadSack(g, 400 + i * 30, 0);
    });
    person(g, DAWANAU_FAMILY[0], 500, 0, 'walk0');
    person(g, DAWANAU_FAMILY[2], 516, 0, 'walk1');
    person(g, DAWANAU_FAMILY[1], 534, 0, 'walk2');
    drawDawanauTraderStall(g, 'beans', 590, 0);
    person(g, DAWANAU_TRADER_LOOKS.beans, 560, 0, 'call', true);
    g.restore();
  });
  g.restore();
  label(g, 'Grain sacks and bowls (millet, sorghum, maize, beans, groundnut), grain traders, oil seller, the driver resting with tea (a flask), porters with head pads, a family buying beans', 16, 494, 10);
  frame(g, 12, 632, 936, 76, '#f3e2bb');
  castRow(g, 14, 634, 1.2);
  label(g, 'Dawanau cast, 16 looks, crisp: 3 sellers, 2 grain traders, 2 porters, driver, oil seller, family of 3, student, wheelchair user, elder (no stick), man on his phone', 12, 708, 10);
};

export const DAWANAU_PAGES: readonly Page[] = [dawanauStreet, dawanauPieces];
