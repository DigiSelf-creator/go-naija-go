/**
 * Hero look gallery (debug only, never part of the game build): gallery/hero2.html.
 * Decision 60 (the richer hero) and 61 (the front pose). Drawn at the device pixel ratio.
 *   ?view=sheet&skin=0..4   every body, age, hair and outfit on one skin (150 heroes)
 *   ?view=frames            run, jump and land frames, enlarged
 *   ?view=faces             the faces on every skin, enlarged
 *   ?view=front             the front pose on every body and age
 *   ?view=intro&w=&h=&t=&look=0|1&inset=   one moving-intro frame at that size and time
 */
import { AGES, BODIES, HAIRS, SKINS, drawHero, type HeroLook, type HeroPose } from './hero';
import { drawIntroScene } from './intro-scene';
import { INK } from './palette';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'sheet';
const num = (k: string, d: number): number => {
  const v = Number(q.get(k));
  return q.has(k) && Number.isFinite(v) ? v : d;
};

function canvas(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  document.body.appendChild(c);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.fillStyle = '#fbf3e2';
  g.fillRect(0, 0, w, h);
  return g;
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10, align: CanvasTextAlign = 'center'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function at(g: CanvasRenderingContext2D, x: number, y: number, s: number, look: HeroLook, pose: HeroPose): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawHero(g, look, pose);
  g.restore();
}

function ground(g: CanvasRenderingContext2D, y: number): void {
  g.fillStyle = '#d9cbb0';
  g.fillRect(0, y, 99999, 2);
}

const stand: HeroPose = { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: 0.6 };
/** Extra pose fields, cast so this page also runs on the code from before decision 60. */
const more = (p: Record<string, unknown>): Partial<HeroPose> => p as Partial<HeroPose>;
const BA = BODIES.flatMap((b, body) => AGES.map((a, age) => ({ body, age, name: `${b.label} ${a.label}` })));

if (view === 'sheet') {
  const skin = num('skin', 0);
  const cw = 54;
  const ch = 100;
  const g = canvas(110 + 25 * cw, 44 + 6 * ch);
  label(g, `${SKINS[skin]!.label}: every body, age, hair and outfit (25 x 6 = 150)`, 8, 6, 13, 'left');
  HAIRS.forEach((h, hi) => label(g, h.label, 110 + (hi * 5 + 2.5) * cw, 24, 10));
  BA.forEach((b, row) => {
    const y = 44 + row * ch + ch - 8;
    label(g, b.name, 6, y - 50, 11, 'left');
    ground(g, y);
    for (let hi = 0; hi < 5; hi++)
      for (let oi = 0; oi < 5; oi++) at(g, 110 + (hi * 5 + oi) * cw + cw / 2, y, 1.5, { skin, hair: hi, outfit: oi, body: b.body, age: b.age }, { ...stand, time: hi + oi * 0.3 });
  });
} else if (view === 'frames') {
  const looks: HeroLook[] = [
    { skin: 4, hair: 0, outfit: 0, body: 0, age: 1 },
    { skin: 1, hair: 2, outfit: 1, body: 1, age: 0 },
    { skin: 2, hair: 3, outfit: 3, body: 1, age: 2 },
  ];
  const s = 2.6;
  const cw = 64;
  const g = canvas(40 + 17 * cw, 30 + looks.length * 175);
  label(g, 'Run: 12 steps through one stride. Then jump (rising), top, fall, landing squash, settling.', 8, 6, 13, 'left');
  looks.forEach((look, li) => {
    const y = 30 + li * 175 + 160;
    ground(g, y);
    for (let i = 0; i < 12; i++) at(g, 40 + i * cw, y, s, look, { phase: i / 12, inAir: false, facing: 1, glow: false, time: i * 0.05 });
    const air: HeroPose[] = [
      { phase: 0, inAir: true, facing: 1, glow: false, vy: -320 },
      { phase: 0, inAir: true, facing: 1, glow: false, vy: 0 },
      { phase: 0, inAir: true, facing: 1, glow: false, vy: 320 },
      { phase: 0.1, inAir: false, facing: 1, glow: false, land: 1 },
      { phase: 0.1, inAir: false, facing: 1, glow: false, land: 0.4 },
    ];
    air.forEach((p, i) => at(g, 40 + (12 + i) * cw + 10, y - (p.inAir ? 20 : 0), s, look, p));
  });
} else if (view === 'faces') {
  const moods = ['calm', 'run', 'jump', 'hurt', 'win'];
  const g = canvas(960, 40 + SKINS.length * 130);
  label(g, 'Faces on every skin: calm, run, jump, hurt, win', 8, 6, 13, 'left');
  SKINS.forEach((_, si) => {
    moods.forEach((m, mi) => {
      const x = 96 + mi * 190;
      const top = 40 + si * 130;
      g.save();
      g.beginPath();
      g.rect(x - 92, top, 184, 124);
      g.clip();
      at(g, x - 14, top + 300, 5.6, { skin: si, hair: (si + mi) % 5, outfit: (si + mi * 2) % 5, body: (si + mi) % 2, age: (si + mi) % 3 }, { ...stand, ...more({ face: m }) });
      g.restore();
      if (si === 0) label(g, m, x, 24, 11);
    });
  });
} else if (view === 'front') {
  const g = canvas(1000, 40 + SKINS.length * 112);
  label(g, 'Front pose (decision 61): every body and age, a spread of skins, hairs and outfits', 8, 6, 13, 'left');
  SKINS.forEach((_, si) => {
    const y = 40 + si * 112 + 100;
    ground(g, y);
    for (let i = 0; i < 12; i++) {
      const b = BA[i % 6]!;
      at(g, 45 + i * 80, y, 1.75, { skin: si, hair: (i + si) % 5, outfit: (i * 2 + si) % 5, body: b.body, age: b.age }, { ...stand, time: i * 0.3, ...more({ front: 1 }) });
    }
  });
} else if (view === 'intro') {
  const w = num('w', 320);
  const h = num('h', 240);
  const g = canvas(w, h);
  const look = num('look', 1) ? { skin: 3, hair: 2, outfit: 1, body: 1, age: 1 } : null;
  drawIntroScene(g, w, h, num('t', 38.8), { look, inset: num('inset', 0) });
} else if (view === 'big') {
  // Close-ups: run, stand and front on the lightest and darkest skins
  const g = canvas(1200, 470);
  label(g, 'Close-up, 7x: light and dark skin, run, stand, front', 8, 6, 13, 'left');
  ground(g, 450);
  const looks: HeroLook[] = [
    { skin: 0, hair: 1, outfit: 1, body: 1, age: 0 },
    { skin: 4, hair: 0, outfit: 0, body: 0, age: 1 },
    { skin: 4, hair: 3, outfit: 3, body: 1, age: 2 },
    { skin: 2, hair: 0, outfit: 4, body: 0, age: 2 },
  ];
  looks.forEach((look, i) => at(g, 140 + i * 300, 450, 7, look, i % 2 ? { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0.3 } : { ...stand, ...more({ front: i === 2 ? 1 : 0 }) }));
}
document.title = 'ready';
