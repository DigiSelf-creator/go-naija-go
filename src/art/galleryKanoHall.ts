/**
 * Borehole Hall and Rusty Borehole for qa and Tp (debug only; docs/kano.md 5.1 to 5.5 and 7, art K5a):
 * ?gallery=hall-kano   the hall in the fight at 851 x 393 (one valve open, the next STUCK), at
 *                      320 x 240 real size in a gust, in greyscale, and the finish step by step;
 * ?gallery=hall-kano2  Rusty's looks (grumpy, wheeze, puff, blow, hiccup, gargle, sneeze, clean),
 *                      the valves, the counter, the wash line calm and in a gust, the cans and the
 *                      cart, the door people (crisp, style 1.8) and his words.
 * The springy cloth frames (K3a) and the dust whirl (K4a) are other tasks: shown here as a plain
 * outline and left out. Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time;
 * &still=1 shows the reduced-motion look.
 */
import { drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { drawHero, type HeroLook } from './hero';
import { setInkRatio } from './ink';
import { INK } from './palette';
import {
  BH_CAN_X,
  BH_CART_AHEAD,
  BH_CART_X,
  BH_CHEER_SPOTS,
  BH_DOOR_CHEERS,
  BH_DOOR_PEOPLE,
  BH_DOOR_SCALE,
  BH_DOOR_SPOTS,
  BH_HALL,
  drawBoreholeHall,
  drawBoreholeHallFront,
  drawBoreholeLine,
  drawDustStreaks,
  drawRustyBorehole,
  drawRustyWord,
  drawSneezePuff,
  drawTapWater,
  drawValve,
  drawValveCounter,
  drawWashLine,
  drawWaterCan,
  drawWaterCart,
  rustyFinishAt,
  type RustyLook,
  type ValveState,
} from '../worlds/kano/galleryArt';
import { KANO_WORDS } from '../worlds/kano/words';

type G = CanvasRenderingContext2D;
type Page = (g: G, time: number, still: boolean) => void;

const HERO: HeroLook = { skin: 3, hair: 4, outfit: 4, body: 1, age: 1 };

function label(g: G, text: string, x: number, y: number, size = 11): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function crisp(draw: () => void): void {
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  try {
    draw();
  } finally {
    setInkRatio(null);
  }
}

function person(g: G, look: FolkLook, x: number, y: number, f: FolkFrame = 'stand', s = BH_DOOR_SCALE): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawFolkFrame(g, look, f);
  g.restore();
}

interface Scene {
  open: number;
  rusty: RustyLook;
  gust?: number;
  hero?: readonly [number, number, boolean];
  finish?: number;
  grey?: boolean;
}

/** One view of the hall at the game's 420-unit height, camera as the game sets it. */
function hall(g: G, x: number, y: number, w: number, h: number, time: number, still: boolean, s: Scene, name: string): void {
  const u = h / 420;
  const V = w / u;
  const camX = V >= BH_HALL.w ? (BH_HALL.w - V) / 2 : Math.min(Math.max(0, (s.hero?.[0] ?? 250) - V * 0.4), BH_HALL.w - V);
  const fin = s.finish !== undefined ? rustyFinishAt(s.finish, still) : null;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  if (s.grey) g.filter = 'grayscale(1)';
  g.scale(u, u);
  g.translate(-camX, 0);
  drawBoreholeHall(g, 420);
  if (s.gust) {
    g.save();
    g.translate(camX, 0);
    drawDustStreaks(g, V, 'face', s.gust, time, still);
    g.restore();
  }
  drawWashLine(g, s.gust ?? 0, time, still);
  if (fin) drawTapWater(g, fin.taps, time, still);
  // The door people: in the door, or at the taps once the water flows
  crisp(() => {
    BH_DOOR_PEOPLE.forEach((look, i) => {
      const at = fin?.cheer ? BH_CHEER_SPOTS[i]! : BH_DOOR_SPOTS[i]!;
      const f: FolkFrame = fin?.cheer ? (Math.floor(time * 4 + i) % 2 ? 'cheer1' : 'cheer0') : 'stand';
      person(g, look, at, BH_HALL.floorY - 4, f);
    });
  });
  if (!fin?.cheer) {
    drawWaterCan(g, BH_CAN_X, BH_HALL.floorY - 3);
    drawWaterCart(g, BH_CART_X, BH_HALL.floorY - 2);
  } else drawWaterCart(g, BH_CHEER_SPOTS[1]! + BH_CART_AHEAD, BH_HALL.floorY - 2);
  drawBoreholeLine(g, s.open, fin?.wave ?? 0, time, still);
  BH_HALL.valves.forEach((vx, i) => {
    const st: ValveState = fin || i < s.open ? 'open' : i === s.open ? 'stuck' : 'wait';
    drawValve(g, vx, st, { time, still, freed: i === s.open - 1 ? (time % 2) : -1 });
    // K3a's springy cloth frame stands here: a plain outline in this gallery only
    g.strokeStyle = 'rgba(29,26,20,0.5)';
    g.setLineDash([4, 3]);
    g.lineWidth = 1;
    g.strokeRect(vx - BH_HALL.springW / 2, BH_HALL.floorY - BH_HALL.springH, BH_HALL.springW, BH_HALL.springH);
    g.setLineDash([]);
  });
  drawRustyBorehole(g, BH_HALL.cx, BH_HALL.floorY, fin ? fin.rusty : { ...s.rusty, time, still });
  if (fin) drawSneezePuff(g, fin.puff);
  if (s.hero) {
    const [hx, hy, air] = s.hero;
    g.save();
    g.translate(hx, hy);
    drawHero(g, HERO, { phase: (time * 2) % 1, inAir: air, facing: 1, glow: false, standing: !air, time });
    g.restore();
  }
  drawBoreholeHallFront(g, camX, V, 420);
  if (fin?.say) drawRustyWord(g, KANO_WORDS.hall.rusty[fin.say], BH_HALL.cx - 30, BH_HALL.floorY - 190);
  g.restore();
  g.save();
  g.translate(x, y);
  drawValveCounter(g, w - 40, h - 26, fin ? 3 : s.open);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (name) label(g, name, x, y + h + 3, 10);
}

const fight: Page = (g, time, still) => {
  label(g, 'K5a Borehole Hall: our own water yard. Rusty Borehole is an old pump clogged with dust, a problem, never a person.', 12, 6, 12);
  hall(g, 12, 24, 600, 277, time, still, { open: 1, rusty: { mood: 'grumpy', flakes: 1 }, hero: [250, 160, true] }, '851 x 393 shape: valve 1 open (tick, drip), valve 2 STUCK and shaking, valve 3 waiting; one flake off');
  hall(g, 628, 24, 320, 240, time, still, { open: 2, rusty: { mood: 'blow', flakes: 2 }, gust: 1, hero: [300, 300, false] }, '320 x 240 real size: the gust (cloth streams, streaks)');
  label(g, 'The finish (5.5), 568 x 320 at half size; greyscale last:', 12, 324, 11);
  const steps: [number, string][] = [
    [0.6, '0.6 s gargle, water wave'],
    [1.45, '1.45 s "A... a... ACHOO!"'],
    [2.1, '2.1 s rust falls, clean blue'],
    [3.0, '3.0 s taps run one by one'],
    [4.6, '4.6 s door people fill up'],
  ];
  steps.forEach(([t, name], i) => hall(g, 12 + (i % 3) * 316, 342 + Math.floor(i / 3) * 186, 284, 160, time, still, { open: 3, rusty: {}, finish: still ? 9 : t }, name));
  hall(g, 644, 528, 284, 160, time, still, { open: 1, rusty: { mood: 'wheeze', k: 0.6, flakes: 1 }, hero: [200, 300, false], grey: true }, 'Greyscale: hero, Rusty, STUCK valve by shape');
  label(g, 'Only words painted: BOREHOLE HALL and STUCK. No title, no ruler, nothing holy, no tall green tubes, no marked blocks.', 12, 704, 10);
  label(g, 'Dashed boxes: where the springy cloth frames (K3a) stand.', 628, 290, 10);
};

const MOODS: [RustyLook, string][] = [
  [{ mood: 'grumpy' }, 'grumpy'],
  [{ mood: 'wheeze', k: 0.5 }, 'wheeze (0.5 s)'],
  [{ mood: 'puff', k: 1 }, 'puff (gust warning)'],
  [{ mood: 'blow' }, 'blow (gust)'],
  [{ mood: 'hiccup', k: 0.5, flakes: 1 }, 'hiccup "hic!"'],
  [{ mood: 'gargle', flakes: 3 }, 'gargle'],
  [{ mood: 'sneeze', k: 0.3, flakes: 3 }, 'a... a...'],
  [{ mood: 'sneeze', k: 1, flakes: 3 }, 'ACHOO!'],
  [{ mood: 'clean', fountain: 1 }, 'clean shine'],
];

const pieces: Page = (g, time, still) => {
  label(g, 'K5a Rusty Borehole\'s looks (boss outline: max of 1.6 u and 2 px, hero ink), the valves, the counter, the wash line, the door people', 12, 6, 12);
  g.fillStyle = '#f4d79c';
  g.fillRect(12, 24, 936, 200);
  MOODS.forEach(([look, name], i) => {
    const x = 64 + i * 103;
    g.save();
    g.translate(x, 206);
    g.scale(0.95, 0.95);
    drawRustyBorehole(g, 0, 0, { ...look, time, still });
    g.restore();
    label(g, name, x - 46, 208, 10);
  });
  // Real play size at 320 x 240 (0.57 px per unit)
  g.fillStyle = '#f4d79c';
  g.fillRect(12, 232, 300, 110);
  label(g, 'At 320 x 240 real size (0.57 px/u): grumpy, wheeze, clean', 16, 234, 10);
  [{ mood: 'grumpy' as const, flakes: 1 }, { mood: 'wheeze' as const, k: 0.5 }, { mood: 'clean' as const }].forEach((look, i) => {
    g.save();
    g.translate(70 + i * 90, 334);
    g.scale(0.571, 0.571);
    drawRustyBorehole(g, 0, 0, { ...look, time, still });
    g.restore();
  });
  // Valves
  g.fillStyle = '#f4d79c';
  g.fillRect(324, 232, 380, 110);
  label(g, 'Valves: waiting, STUCK (shakes, puffs dust, tag), open (tick, drip), spinning free', 328, 234, 10);
  (['wait', 'stuck', 'open', 'open'] as ValveState[]).forEach((st, i) => {
    g.save();
    g.translate(350 + i * 92, 254);
    g.translate(-140, -BH_HALL.valveBottom + 60);
    drawValve(g, 140, st, { time, still, freed: i === 3 ? time % 1.5 : -1 });
    g.restore();
  });
  g.fillStyle = '#e8eef2';
  g.fillRect(716, 232, 232, 110);
  label(g, 'Hit counter: 0 to 3 valves open', 720, 234, 10);
  g.fillStyle = '#ffffff';
  for (let n = 0; n <= 3; n++) drawValveCounter(g, 772 + (n % 2) * 110, 256 + Math.floor(n / 2) * 40, n);
  // Wash line
  for (const [i, k] of [[0, 0], [1, 1]] as const) {
    const x = 12 + i * 312;
    g.fillStyle = '#c0704a';
    g.fillRect(x, 350, 300, 90);
    g.save();
    g.translate(x + 6, 300);
    g.scale(0.88, 0.88);
    g.translate(-BH_HALL.posts[0]!, -BH_HALL.washY + 70);
    g.fillStyle = '#7b5a3a';
    for (const px of BH_HALL.posts) g.fillRect(px - 3, BH_HALL.washY - 10, 6, 70);
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(BH_HALL.posts[0]!, BH_HALL.washY);
    g.lineTo(BH_HALL.posts[1]!, BH_HALL.washY);
    g.stroke();
    drawWashLine(g, k, time, still);
    g.restore();
    label(g, k ? 'Wash line in the gust: streams left, flutters' : 'Wash line calm: hangs, sways', x + 4, 426, 10);
  }
  // Cans, cart
  g.fillStyle = '#d6ab74';
  g.fillRect(636, 350, 312, 90);
  g.save();
  g.translate(636, 350);
  g.scale(1.6, 1.6);
  drawWaterCan(g, 20, 48);
  drawWaterCan(g, 38, 48, '#1aa39a');
  drawWaterCart(g, 100, 48, still ? 0 : time * 3);
  g.restore();
  label(g, 'Jerry cans, the water cart (own drawing)', 760, 354, 10);
  // Door people
  g.fillStyle = '#f3e2bb';
  g.fillRect(12, 450, 620, 150);
  label(g, 'Door people, crisp (style 1.8): a woman with a water can, a water cart pusher, an elder (no stick)', 16, 452, 10);
  crisp(() => {
    BH_DOOR_PEOPLE.forEach((look, i) => {
      (['stand', 'cheer0', 'cheer1', 'walk1'] as FolkFrame[]).forEach((f, j) => person(g, look, 48 + i * 200 + j * 44, 586, f, 1.9));
    });
  });
  drawBubble(g, BH_DOOR_CHEERS[0]!, 150, 500, { tail: 'left' });
  drawBubble(g, BH_DOOR_CHEERS[1]!, 350, 500, { tail: 'left' });
  // His words
  g.fillStyle = '#f4d79c';
  g.fillRect(644, 450, 304, 150);
  label(g, "Rusty's words (sounds, never speech)", 648, 452, 10);
  const r = KANO_WORDS.hall.rusty;
  [r.hiccup, r.gargle, r.sneeze, r.hum].forEach((w, i) => drawRustyWord(g, w, 720 + (i % 2) * 150, 490 + Math.floor(i / 2) * 50));
  label(g, 'No arms, clothes, hat or title. Nothing royal, holy or from another game.', 12, 612, 11);
  label(g, 'Sounds: squeak, glug, wheeze, cough, gust, hic, gargle, sneeze, hum, tap splash (all soft and short, Sound switch).', 12, 628, 11);
};

export const KANO_HALL_PAGES: readonly Page[] = [fight, pieces];

export function drawKanoHallGallery(g: G, viewW: number, viewH: number, time: number, page: number, still = false): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  (KANO_HALL_PAGES[page] ?? KANO_HALL_PAGES[0]!)(g, still ? 0 : time, still);
  g.restore();
}
