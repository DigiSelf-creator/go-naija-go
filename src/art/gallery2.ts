/**
 * Slice 2 gallery pages (debug only): ?gallery=1, ?gallery=2 and so on.
 * Each page draws in the same fixed 960 x 720 layout as page 0.
 * Add &t=1.5 to the address to hold the time, for still review pictures.
 */
import { CONTROL_ASPECT, drawControl, type ControlKind } from './controls';
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroPose } from './hero';
import { INK } from './palette';
import { BUS_END, busEndAt, drawBigPitCones, drawBusPark, drawCone, drawEndBus, drawEndBusInside, drawPavement, drawStartFence } from './roadside';
import { GROUND_Y, drawRoad, drawShopRow, drawSky, drawSkyline } from './street';

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

function hero(g: CanvasRenderingContext2D, x: number, y: number, look: { skin: number; hair: number; outfit: number }, pose: HeroPose, scale = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  drawHero(g, look, pose);
  g.restore();
}

/** Page 1 (H5): buttons, the pavement strip, cones, the start fence and the bus park. */
const controlsAndStreet: Page = (g, time) => {
  title(g, 'H5: phone buttons (top: up, below: pressed), street start, big pit cones, bus park');
  // A mini street behind the buttons, so the see-through look is judged on road and pavement.
  g.fillStyle = '#6fc2f0';
  g.fillRect(0, 24, 960, 30);
  g.fillStyle = '#3e3e42';
  g.fillRect(0, 54, 960, 70);
  g.fillStyle = '#4d4943';
  g.fillRect(0, 124, 960, 110);
  const kinds: ControlKind[] = ['back', 'forward', 'jump', 'down', 'up'];
  const D = 80;
  let x = 20;
  for (const k of kinds) {
    const w = CONTROL_ASPECT[k] * D;
    drawControl(g, k, x + w / 2, 84, D, false);
    drawControl(g, k, x + w / 2, 180, D, true);
    x += w + 16;
  }
  // Computer wording on a well button
  drawControl(g, 'down', 880, 84, 56, false, 'Go down (↓)');
  drawControl(g, 'up', 880, 180, 56, true, 'Go up (Enter)');

  // A whole street at half size: start fence, a big pit with cones, the bus park.
  g.save();
  g.translate(0, 244);
  g.beginPath();
  g.rect(0, 0, 960, 210);
  g.clip();
  g.scale(0.5, 0.5);
  const camX = -40;
  const w = 1920;
  drawSky(g, camX, w, time, 420);
  drawSkyline(g, camX, w);
  drawShopRow(g, camX, w);
  g.translate(-camX, 0);
  const ground: [number, number][] = [
    [-60, 600],
    [770, 1900],
  ];
  drawRoad(g, camX, w, ground, GROUND_Y, 420);
  drawPavement(g, camX, w, ground);
  drawStartFence(g, 0);
  drawBigPitCones(g, 600, 770);
  const endX = 1560;
  const cycle = time % 4;
  const f = busEndAt(cycle);
  drawBusPark(g, endX, 1800);
  drawEndBusInside(g, endX, f);
  const look = { skin: 2, hair: 0, outfit: 0 };
  hero(g, 60, GROUND_Y, { skin: 4, hair: 2, outfit: 1 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  if (f.heroShown) {
    const hx = endX - 60 + f.hop * 60;
    const hy = GROUND_Y - Math.sin(f.hop * Math.PI) * 22;
    hero(g, hx, hy, look, cycle < BUS_END.doorOpen ? { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time } : { phase: 0, inAir: true, facing: 1, glow: false, vy: (f.hop - 0.5) * 400 });
  }
  drawEndBus(g, endX, f);
  // A hero walking up to the pit, and one mid run-up with the dust puff
  hero(g, 380, GROUND_Y, { skin: 1, hair: 3, outfit: 3 }, { phase: (time * 1.1) % 1, inAir: false, facing: 1, glow: false, gait: 'walk', time });
  hero(g, 520, GROUND_Y, { skin: 3, hair: 1, outfit: 4 }, { phase: (time * 1.6) % 1, inAir: false, facing: 1, glow: false, dust: (time % 1.2) / 0.6, time });
  g.restore();
  label(g, 'street start (fence, parked bus), a walk, a run with dust, big pit cones, bus park, bus door and pull-away (loops)', 480, 456);

  // Close-ups at full size, feet on the line y = 690
  g.save();
  g.translate(0, 690 - GROUND_Y);
  drawStartFence(g, 110);
  label(g, 'start fence', 70, GROUND_Y + 4);
  g.save();
  g.translate(260, GROUND_Y);
  g.scale(2, 2);
  drawCone(g, -12, 0);
  drawCone(g, 12, 0);
  g.restore();
  label(g, 'cones x2', 260, GROUND_Y + 4);
  drawEndBusInside(g, 400, { door: 1 });
  hero(g, 340, GROUND_Y, { skin: 0, hair: 4, outfit: 2 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  drawEndBus(g, 400, { door: 1 });
  label(g, 'bus, door open', 450, GROUND_Y + 4);
  drawEndBus(g, 660, { door: 0 });
  label(g, 'door shut', 710, GROUND_Y + 4);
  g.restore();
};

const POSE_COLS: [string, (t: number) => HeroPose][] = [
  ['stand', (t) => ({ phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: t })],
  ['stand, left', (t) => ({ phase: 0, inAir: false, facing: -1, glow: false, standing: true, time: t })],
  ['walk 0', () => ({ phase: 0, inAir: false, facing: 1, glow: false, gait: 'walk' })],
  ['walk .25', () => ({ phase: 0.25, inAir: false, facing: 1, glow: false, gait: 'walk' })],
  ['walk .5', () => ({ phase: 0.5, inAir: false, facing: 1, glow: false, gait: 'walk' })],
  ['walk, left', (t) => ({ phase: (t * 1.1) % 1, inAir: false, facing: -1, glow: false, gait: 'walk', time: t })],
  ['run 0', () => ({ phase: 0, inAir: false, facing: 1, glow: false })],
  ['run .25', () => ({ phase: 0.25, inAir: false, facing: 1, glow: false })],
  ['run + dust', () => ({ phase: 0.6, inAir: false, facing: 1, glow: false, dust: 0.25 })],
  ['skid (turn)', (t) => ({ phase: 0.2, inAir: false, facing: 1, glow: false, skid: 1, time: t })],
];

/** Extra pose columns added by later pages of work (the rope pose, L1). */
export const EXTRA_POSES: [string, (t: number) => HeroPose][] = [];

/** Page 2 (H5): every new pose on all five skins, large. Same face and pose on every skin. */
const poses: Page = (g, time) => {
  const cols = [...POSE_COLS, ...EXTRA_POSES];
  title(g, 'Hero poses on all 5 skins (same face, same pose, same size)');
  const cw = 940 / cols.length;
  cols.forEach(([name], c) => label(g, name, 20 + cw * (c + 0.5), 28, 10));
  for (let r = 0; r < SKINS.length; r++) {
    const y = 128 + r * 132;
    g.fillStyle = '#d9cbb0';
    g.fillRect(10, y, 940, 3);
    const look = { skin: r, hair: (r * 2) % HAIRS.length, outfit: (r * 3 + 1) % OUTFITS.length };
    label(g, SKINS[r]?.label ?? '', 52, y + 6, 10);
    cols.forEach(([, pose], c) => hero(g, 20 + cw * (c + 0.5), y, look, pose(time), 1.75));
  }
};

/** Slice 2 pages in order. Later pieces of work push their pages onto this list. */
export const SLICE2_PAGES: Page[] = [controlsAndStreet, poses];
