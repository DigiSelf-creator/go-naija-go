/**
 * Debug only: ?gallery=style-people (ST-H2, docs/style.md 1.8). The characters before and after
 * the crisp characters recipe, each baked at the run's real pixels and shown at real size and
 * blown up with no smoothing (as qa checks them):
 *   style-people    the run hero, every skin, at 851 x 393 and 320 x 240, at 1x and 2x
 *   style-people2   street people (the people kit), the same four sizes
 *   style-people3   the lane hero (back view) and the builder preview size
 * "Before" is the old drawing, kept in src/art/before/ for this page only.
 */
import * as oldFolk from './before/folk';
import * as oldHero from './before/hero';
import * as oldLane from './before/lane-hero';
import { drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { LANE_CHILDREN, STREET_CASTS } from './folkCasts';
import { drawHero, type HeroLook, type HeroPose } from './hero';
import { setInkRatio } from './ink';
import { drawLaneHero } from './lane-hero';
import { WORLD_H } from '../engine/view';

/** Screen sizes: 1 unit is this many screen px in the run. */
const SIZES = [
  { name: '851 x 393', sppu: 393 / WORLD_H },
  { name: '320 x 240', sppu: 240 / WORLD_H },
] as const;
const RATIOS = [1, 2] as const;

const WALL = '#e8c28e';
const PAGE = '#f4ead2';
const TEXT = '#3a2618';

const LOOKS: readonly HeroLook[] = [
  { skin: 0, hair: 0, outfit: 0, body: 0, age: 1 },
  { skin: 1, hair: 3, outfit: 1, body: 1, age: 1 },
  { skin: 2, hair: 2, outfit: 2, body: 1, age: 0 },
  { skin: 3, hair: 1, outfit: 4, body: 0, age: 2 },
  { skin: 4, hair: 4, outfit: 3, body: 1, age: 2 },
  { skin: 4, hair: 0, outfit: 0, body: 0, age: 0 },
  { skin: 3, hair: 3, outfit: 3, body: 1, age: 1 },
];
const POSES: readonly HeroPose[] = [
  { phase: 0.1, inAir: false, facing: 1, glow: false, time: 0.1 },
  { phase: 0.35, inAir: false, facing: 1, glow: false, time: 0.35 },
  { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 0 },
  { phase: 0.6, inAir: false, facing: 1, glow: false, time: 0.6 },
  { phase: 0.3, inAir: true, facing: 1, glow: false, vy: -100, time: 0.3 },
  { phase: 0.85, inAir: false, facing: 1, glow: false, time: 0.85 },
  { phase: 0, inAir: false, facing: -1, glow: false, standing: true, time: 0 },
];

const FOLK: readonly [FolkLook, FolkFrame][] = [
  ...STREET_CASTS.alausa.slice(0, 7).map((l, i): [FolkLook, FolkFrame] => [l, i % 2 ? 'walk1' : 'stand']),
  ...STREET_CASTS.ikeja.slice(0, 4).map((l, i): [FolkLook, FolkFrame] => [l, i % 2 ? 'stand' : 'walk2']),
  [LANE_CHILDREN[0], 'wave0'],
  [LANE_CHILDREN[1], 'walk0'],
];

type Ver = 'before' | 'after';
interface Scene {
  w: number;
  h: number;
  draw: (g: CanvasRenderingContext2D, v: Ver) => void;
}

const HEROES: Scene = {
  w: LOOKS.length * 40 + 10,
  h: 66,
  draw: (g, v) => {
    LOOKS.forEach((look, i) => {
      g.save();
      g.translate(25 + i * 40, 60);
      (v === 'before' ? oldHero.drawHero : drawHero)(g, look, POSES[i]!);
      g.restore();
    });
  },
};

const PEOPLE: Scene = {
  w: FOLK.length * 26 + 10,
  h: 56,
  draw: (g, v) => {
    FOLK.forEach(([look, frame], i) => {
      g.save();
      g.translate(18 + i * 26, 52);
      if (v === 'before') oldFolk.drawFolkFrame(g, look as oldFolk.FolkLook, frame);
      else drawFolkFrame(g, look, frame);
      g.restore();
    });
  },
};

const LANE: Scene = {
  w: 4 * 64 + 10,
  h: 84,
  draw: (g, v) => {
    const poses = [{ move: 'run', frame: 0 }, { move: 'run', frame: 2 }, { move: 'jump' }, { move: 'wave', frame: 1 }] as const;
    poses.forEach((pose, i) => {
      g.save();
      g.translate(36 + i * 64, 78);
      (v === 'before' ? oldLane.drawLaneHero : drawLaneHero)(g, LOOKS[i + 1]!, pose);
      g.restore();
    });
  },
};

const BUILDER: Scene = {
  w: 3 * 44 + 10,
  h: 66,
  draw: (g, v) => {
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(26 + i * 44, 62);
      (v === 'before' ? oldHero.drawHero : drawHero)(g, LOOKS[[0, 4, 1][i]!]!, POSES[2]!);
      g.restore();
    }
  },
};

const CACHE = new Map<string, HTMLCanvasElement>();

/** Bakes a scene at `sppu` screen px per unit and the screen ratio `dpr`, as the game would. */
function baked(s: Scene, key: string, v: Ver, sppu: number, dpr: number): HTMLCanvasElement {
  const k = `${key}:${v}:${sppu}:${dpr}`;
  let c = CACHE.get(k);
  if (c) return c;
  const dpu = sppu * dpr;
  c = document.createElement('canvas');
  c.width = Math.ceil(s.w * dpu);
  c.height = Math.ceil(s.h * dpu);
  const g = c.getContext('2d')!;
  g.fillStyle = WALL;
  g.fillRect(0, 0, c.width, c.height);
  setInkRatio(dpr);
  g.setTransform(dpu, 0, 0, dpu, 0, 0);
  s.draw(g, v);
  setInkRatio(null);
  CACHE.set(k, c);
  return c;
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, px: number): void {
  g.fillStyle = TEXT;
  g.font = `bold ${px}px Verdana, sans-serif`;
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

/** One row: before and after, each at real size, then blown up with no smoothing. */
function row(g: CanvasRenderingContext2D, s: Scene, key: string, sppu: number, dpr: number, y: number, W: number, title: string, fs: number): number {
  const before = baked(s, key, 'before', sppu, dpr);
  const after = baked(s, key, 'after', sppu, dpr);
  label(g, title, 8, y, fs);
  y += fs + 4;
  const half = (W - 24) / 2;
  const zoom = Math.max(1, Math.floor(half / before.width));
  g.imageSmoothingEnabled = false;
  let x = 8;
  for (const [name, c] of [['before', before], ['after', after]] as const) {
    label(g, name, x, y, fs * 0.85);
    g.drawImage(c, x + fs * 4, y);
    g.drawImage(c, x, y + c.height + 4, c.width * zoom, c.height * zoom);
    x += half + 8;
  }
  return y + before.height + 8 + before.height * zoom;
}

export function drawStylePeopleGallery(g: CanvasRenderingContext2D, page: number): void {
  const W = g.canvas.width;
  const H = g.canvas.height;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = PAGE;
  g.fillRect(0, 0, W, H);
  const fs = Math.max(11, Math.round(H / 60));
  let y = 6;
  if (page === 2) {
    label(g, 'Style 1.8 crisp characters: lane hero (back view) and the builder preview size', 8, y, fs);
    y += fs + 6;
    y = row(g, LANE, 'lane', 1, 1, y, W, 'Lane hero, near, 851 x 393 at 1x', fs);
    y = row(g, LANE, 'lane', 1, 2, y, W, 'Lane hero, near, 851 x 393 at 2x', fs);
    row(g, BUILDER, 'builder', 2.1, 1, y, W, 'Builder preview (head over 20 px: fine face detail)', fs);
  } else {
    const s = page === 1 ? PEOPLE : HEROES;
    const key = page === 1 ? 'people' : 'heroes';
    label(g, `Style 1.8 crisp characters: ${page === 1 ? 'street people' : 'the run hero'}, before and after (real size, then blown up, no smoothing)`, 8, y, fs);
    y += fs + 6;
    for (const sz of SIZES) for (const r of RATIOS) y = row(g, s, key, sz.sppu, r, y, W, `${sz.name} at ${r}x`, fs);
  }
  g.restore();
}
