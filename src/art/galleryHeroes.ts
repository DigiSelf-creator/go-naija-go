/**
 * Gallery pages for I1 (debug only): male and female heroes as Teen, Adult and Elder.
 * Each page draws in the same fixed 960 x 720 layout as the other gallery pages.
 */
import { AGES, BODIES, FIRST_LOOKS, HAIRS, OUTFITS, SKINS, drawHero, type HeroLook, type HeroPose } from './hero';
import { INK } from './palette';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 9): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function title(g: CanvasRenderingContext2D, text: string): void {
  g.fillStyle = INK;
  g.font = 'bold 14px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, 12, 6);
}

function hero(g: CanvasRenderingContext2D, x: number, y: number, look: HeroLook, pose: HeroPose, scale = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  drawHero(g, look, pose);
  g.restore();
}

function ground(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  g.fillStyle = '#d9cbb0';
  g.fillRect(x, y, w, 3);
}

const stand = (time: number, blink = false): HeroPose => ({ phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink, time });

/** The six bodies in builder order: Male Teen, Adult, Elder, then Female Teen, Adult, Elder. */
const BODY_AGES: readonly { body: number; age: number; name: string }[] = BODIES.flatMap((b, body) =>
  AGES.map((a, age) => ({ body, age, name: `${b.label} ${a.label}` })),
);

/** Page 6 (I1): every body on every skin in its first look, and every hair on elders. */
const lineUp: Page = (g, time) => {
  title(g, 'I1: Male and Female, Teen, Adult, Elder on all 5 skins (first looks). Right: every hair on elders (grey)');
  BODY_AGES.forEach((b, i) => label(g, b.name, 40 + i * 72, 26, 9));
  HAIRS.forEach((h, i) => label(g, h.label, 520 + i * 88 + 20, 26, 9));
  for (let s = 0; s < SKINS.length; s++) {
    const y = 132 + s * 134;
    ground(g, 4, y, 952);
    BODY_AGES.forEach((b, i) => {
      const first = FIRST_LOOKS[b.body]![b.age]!;
      hero(g, 40 + i * 72, y, { skin: s, hair: first.hair, outfit: first.outfit, body: b.body, age: b.age }, stand(time + i * 0.4 + s), 1.6);
    });
    HAIRS.forEach((_, h) => {
      for (let body = 0; body < 2; body++) {
        const outfit = body === 0 ? (h + s) % OUTFITS.length : (h + s + 1) % OUTFITS.length;
        hero(g, 520 + h * 88 + body * 40, y, { skin: s, hair: h, outfit, body, age: 2 }, stand(time + h * 0.3 + body), 1.45);
      }
    });
  }
};

const RUN_PHASES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
const MOVES: readonly [string, HeroPose][] = [
  ['walk', { phase: 0.3, inAir: false, facing: 1, glow: false, gait: 'walk', time: 0.3 }],
  ['skid', { phase: 0.2, inAir: false, facing: 1, glow: false, skid: 1, time: 0.4 }],
  ['jump', { phase: 0, inAir: true, facing: 1, glow: false, vy: -300 }],
  ['fall', { phase: 0, inAir: true, facing: 1, glow: false, vy: 300 }],
  ['land', { phase: 0.1, inAir: false, facing: 1, glow: false, land: 1 }],
  ['rope', { phase: 0, inAir: false, facing: 1, glow: false, rope: true }],
];

/** Page 7 (I1): the run cycle for every body, then walk, skid, jump, fall, land and rope. */
const runCycles: Page = (g, time) => {
  title(g, 'I1: run cycle (8 frames) for every body, then walk, skid, jump, fall, land, rope. Same hitbox, same moves');
  RUN_PHASES.forEach((p, i) => label(g, `run ${p}`, 100 + i * 60, 26, 9));
  MOVES.forEach(([n], i) => label(g, n, 600 + i * 60, 26, 9));
  BODY_AGES.forEach((b, r) => {
    const y = 128 + r * 112;
    ground(g, 4, y, 952);
    label(g, b.name, 36, y - 40, 9);
    const skin = (r * 2 + 1) % SKINS.length;
    const first = FIRST_LOOKS[b.body]![b.age]!;
    const look: HeroLook = { skin, hair: first.hair, outfit: (first.outfit + (r > 2 ? 0 : 0)) % OUTFITS.length, body: b.body, age: b.age };
    RUN_PHASES.forEach((phase, i) => hero(g, 100 + i * 60, y, look, { phase, inAir: false, facing: 1, glow: false, time: phase }, 1.3));
    MOVES.forEach(([, pose], i) => hero(g, 600 + i * 60, pose.inAir ? y - 14 : y, look, pose, 1.3));
  });
  // The live run, for watching it move
  void time;
};

/** Page 8 (I1): close-up of elder faces on every skin, and teens below. */
const elderFaces: Page = (g, time) => {
  title(g, 'I1: elder faces on all 5 skins (grey hair, smile lines, beard on men; lash and studs on women). Bottom: teens');
  const rows: readonly { body: number; age: number; hair: number; outfit: number; name: string }[] = [
    { body: 0, age: 2, hair: 0, outfit: 3, name: 'Elder male, Low cut' },
    { body: 1, age: 2, hair: 3, outfit: 1, name: 'Elder female, Gele' },
    { body: 1, age: 2, hair: 2, outfit: 4, name: 'Elder female, Braids' },
    { body: 0, age: 2, hair: 4, outfit: 4, name: 'Elder male, Headscarf' },
    { body: 1, age: 0, hair: 1, outfit: 2, name: 'Teen female, Afro' },
  ];
  const S = 4.6;
  rows.forEach((row, r) => {
    const cy = 92 + r * 134;
    label(g, row.name, 60, cy - 6, 10);
    for (let s = 0; s < SKINS.length; s++) {
      const cx = 200 + s * 168;
      g.save();
      g.beginPath();
      g.rect(cx - 80, cy - 64, 160, 128);
      g.clip();
      g.fillStyle = '#efe2c4';
      g.fillRect(cx - 80, cy - 64, 160, 128);
      // Head centre sits about 42 u above the feet; put it in the middle of the cell
      hero(g, cx - 4 * S, cy + (row.age === 0 ? 38 : 41) * S, { skin: s, hair: row.hair, outfit: row.outfit, body: row.body, age: row.age }, stand(time, false), S);
      g.restore();
      if (r === 0) label(g, SKINS[s]?.label ?? '', cx, 24, 10);
    }
  });
};

/**
 * Page 9 (I1): every body x hair x outfit on one skin at game size. The skin changes
 * every 2 seconds (hold it with &t=0, 2, 4, 6 or 8).
 */
const everyCombo: Page = (g, time) => {
  const skin = Math.floor(time / 2) % SKINS.length;
  title(g, `I1: every body, hair and outfit on ${SKINS[skin]?.label ?? ''} (skin changes every 2 s; &t=0, 2, 4, 6, 8 holds one)`);
  const cw = 37.5;
  BODY_AGES.forEach((b, r) => {
    const y = 104 + r * 104;
    ground(g, 4, y, 952);
    label(g, b.name, 60, y + 6, 9);
    for (let h = 0; h < HAIRS.length; h++)
      for (let o = 0; o < OUTFITS.length; o++) {
        const i = h * OUTFITS.length + o;
        hero(g, 20 + cw * i, y, { skin, hair: h, outfit: o, body: b.body, age: b.age }, stand(time + i * 0.17), 1);
      }
  });
  HAIRS.forEach((h, i) => label(g, h.label, 20 + cw * (i * 5 + 2), 28, 9));
};

export const HERO_PAGES: Page[] = [lineUp, runCycles, elderFaces, everyCombo];
