/**
 * Slice 2 gallery pages (debug only): ?gallery=1, ?gallery=2 and so on.
 * Each page draws in the same fixed 960 x 720 layout as page 0.
 * Add &t=1.5 to the address to hold the time, for still review pictures.
 */
import { CONTROL_ASPECT, drawControl, type ControlKind } from './controls';
import { CRATE_STAMPS, crateAngle, crateLineY, crateTopY, drawCrate, drawCrateLine, foodPopAt, koboFanAt } from './crate';
import { drawFood, drawKobo } from './items';
import { WELL, clipWellMouth, drawFade, drawWell, drawWellBack, drawWellFront, wellDownAt } from './well';
import { ROOM, ROOM_ROPE_BUCKET_Y, drawGarriParcel, drawParcelIcon, drawRoomRope, drawShelf, drawWellRoom } from './wellRoom';
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroPose } from './hero';
import { HERO_PAGES } from './galleryHeroes';
import { HALL_PAGES } from './galleryHall';
import { P2_PAGES } from './galleryP2';
import { FIXED_PAGES, STREET_PAGES } from './galleryStreets';
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
export const EXTRA_POSES: [string, (t: number) => HeroPose][] = [['rope (well)', () => ({ phase: 0, inAir: false, facing: 1, glow: false, rope: true })]];

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

/** Page 3 (J1): hanging market crates, full, knocked, kobo fan, food pop, and open. */
const crates: Page = (g, time) => {
  title(g, 'J1: hanging market crates. Row 1: full (4 stamps), knocked, kobo fan, food pop. Row 2: open and empty, a hero knocking one from below');
  const S = 1.6;
  const rowY = [24, 372];
  const bottom = 204;
  for (let row = 0; row < 2; row++) {
    g.save();
    g.translate(0, rowY[row]!);
    g.scale(S, S);
    g.translate(0, -(crateLineY(bottom) - 16));
    g.fillStyle = '#efe2c4';
    g.fillRect(0, crateLineY(bottom) - 16, 600, GROUND_Y - crateLineY(bottom) + 16);
    g.fillStyle = '#3e3e42';
    g.fillRect(0, GROUND_Y, 600, 12);
    drawCrateLine(g, 14, 586, crateLineY(bottom), GROUND_Y);
    const xs = [56, 126, 196, 266, 346, 426, 516];
    if (row === 0) {
      CRATE_STAMPS.forEach((stamp, i) => {
        drawCrate(g, xs[i]!, bottom, { stamp, open: false, angle: crateAngle({ time: time + i * 0.7 }) });
        label(g, stamp, xs[i]!, GROUND_Y - 30, 7);
      });
      // Knocked from below (loops every 1.6 s)
      const k = time % 1.6;
      drawCrate(g, xs[4]!, bottom, { stamp: 'corn', open: false, angle: crateAngle({ time, sinceKnock: k, knock: 'hit' }) });
      label(g, 'knocked (swing)', xs[4]!, GROUND_Y - 30, 7);
      // Kobo fan out of the top
      const f = (time % 1) * 0.5;
      drawCrate(g, xs[5]!, bottom, { stamp: 'kobo', open: true, angle: crateAngle({ time, sinceKnock: f, knock: 'hit' }), lid: Math.min(1, f / 0.15) });
      for (const p of koboFanAt(Math.min(f, 0.35))) {
        g.save();
        g.translate(xs[5]! + p.x, crateTopY(bottom) + p.y);
        g.scale(0.7, 0.7);
        drawKobo(g, 0, 0, time);
        g.restore();
      }
      label(g, 'kobo fan', xs[5]!, GROUND_Y - 30, 7);
      // Food pop and drop to the road
      const ft = time % 2.2;
      drawCrate(g, xs[6]!, bottom, { stamp: 'bowl', open: true, angle: crateAngle({ time, sinceKnock: ft, knock: 'hit' }) });
      drawFood(g, 'amala', xs[6]!, foodPopAt(ft, bottom, 272).y, time);
      label(g, 'food pop', xs[6]! + 30, GROUND_Y - 30, 7);
    } else {
      CRATE_STAMPS.forEach((stamp, i) => {
        drawCrate(g, xs[i]!, bottom, { stamp, open: true, angle: crateAngle({ time: time + i * 0.7 }) });
        label(g, `${stamp}, empty`, xs[i]!, GROUND_Y - 30, 7);
      });
      // A hero jumps and knocks a crate with their head
      const t = time % 1.4;
      const up = t < 0.5 ? Math.sin((t / 0.5) * (Math.PI / 2)) : t < 0.9 ? 1 - ((t - 0.5) / 0.4) ** 2 : 0;
      const feet = GROUND_Y - up * (GROUND_Y - 44 - bottom);
      const sinceKnock = t >= 0.5 ? t - 0.5 : undefined;
      drawCrate(g, xs[5]!, bottom, { stamp: 'cup', open: false, angle: crateAngle({ time, sinceKnock, knock: 'hit' }) });
      g.save();
      g.translate(xs[5]!, feet);
      drawHero(g, { skin: 3, hair: 1, outfit: 0 }, { phase: 0, inAir: up > 0.01, facing: 1, glow: false, vy: t < 0.5 ? -300 : 200 });
      g.restore();
      label(g, 'head knock from below', xs[5]!, GROUND_Y + 2, 7);
      drawCrate(g, xs[6]!, bottom, { stamp: 'kobo', open: true, angle: crateAngle({ time, sinceKnock: (time + 0.4) % 1.6, knock: 'hit' }) });
      label(g, 'empty, knocked', xs[6]!, GROUND_Y - 30, 7);
    }
    g.restore();
  }
};

/** Draws a hero going down a well at time t of the 1.2 s sequence (back, clipped hero, front). */
function wellDescent(g: CanvasRenderingContext2D, x: number, t: number, look: { skin: number; hair: number; outfit: number }): void {
  const m = wellDownAt(t);
  drawWellBack(g, x, GROUND_Y, { kind: 'entrance', drop: m.drop, crank: m.crank });
  g.save();
  clipWellMouth(g, x, GROUND_Y);
  const hx = x - 26 + m.toRope * 26;
  hero(g, hx, GROUND_Y + m.heroDy, look, m.toRope < 1 ? { phase: 0.2, inAir: false, facing: 1, glow: false, gait: 'walk' } : { phase: 0, inAir: false, facing: 1, glow: false, rope: true });
  g.restore();
  drawWellFront(g, x, GROUND_Y);
}

/** Page 4 (L1): the village well on the street, going down, and the fade. */
const wellPage: Page = (g, time) => {
  title(g, 'L1: village well. Entrance (bucket, arrow, Go down button), exit (no bucket), going down (loops)');
  g.save();
  g.translate(0, 34);
  g.scale(1.6, 1.6);
  g.translate(0, -126);
  g.beginPath();
  g.rect(0, 126, 600, 254);
  g.clip();
  drawSky(g, 0, 600, time, 420);
  drawSkyline(g, 0, 600);
  drawShopRow(g, 0, 600);
  drawRoad(g, 0, 600, [[-20, 620]], GROUND_Y, 420);
  drawPavement(g, 0, 600, [[-20, 620]]);
  drawWell(g, 110, GROUND_Y, { kind: 'entrance', time });
  hero(g, 140, GROUND_Y, { skin: 2, hair: 3, outfit: 1 }, { phase: 0, inAir: false, facing: -1, glow: false, standing: true, time });
  // The Go down button sits 8 px above the crank top (here in world units, for the look)
  drawControl(g, 'down', 110, GROUND_Y - WELL.frameH - 34 - 30, 36);
  drawWell(g, 300, GROUND_Y, { kind: 'exit', time });
  label(g, 'exit well', 300, GROUND_Y + 40, 9);
  wellDescent(g, 480, (time % 2) * 0.75, { skin: 4, hair: 0, outfit: 2 });
  label(g, 'going down', 480, GROUND_Y + 40, 9);
  g.restore();
  // Frames of the 1.2 s descent
  const frames = [0, 0.15, 0.3, 0.6, 0.9, 1.15];
  frames.forEach((t, i) => {
    g.save();
    const fx = 80 + i * 160;
    g.translate(0, 470);
    g.beginPath();
    g.rect(fx - 78, 0, 156, 210);
    g.clip();
    g.fillStyle = '#cdb98f';
    g.fillRect(fx - 78, 0, 156, 160);
    g.fillStyle = '#3e3e42';
    g.fillRect(fx - 78, 160, 156, 50);
    g.translate(0, 160 - GROUND_Y);
    wellDescent(g, fx, t, { skin: i % 5, hair: (i + 2) % 5, outfit: (i + 1) % 5 });
    g.restore();
    g.save();
    g.translate(fx - 78, 470);
    drawFade(g, 156, 210, wellDownAt(t).fade);
    g.restore();
    label(g, `t = ${t} s`, fx, 684, 10);
  });
};

/** Page 5 (L1): the lamp-lit store room under the well, with the parcel and the way back up. */
const roomPage: Page = (g, time) => {
  title(g, 'L1: the store room under the well (shelves, lamps, pots, baskets, kobo crate, garri parcel, rope back up)');
  g.save();
  g.translate(0, 26);
  g.scale(1.6, 1.6);
  g.translate(20, -0);
  g.beginPath();
  g.rect(-20, 0, 600, 430);
  g.clip();
  drawWellRoom(g, -20, 600, time);
  for (const [x, y, w] of [
    [120, 250, 80],
    [250, 200, 90],
    [400, 240, 80],
  ] as const) drawShelf(g, x, y, w);
  for (const [x, y] of [
    [80, 272],
    [140, 228],
    [160, 228],
    [195, 200],
    [220, 180],
    [420, 218],
    [440, 218],
    [460, 218],
    [420, 272],
    [440, 272],
  ] as const) drawKobo(g, x, y, time);
  drawCrate(g, 370, 204, { stamp: 'kobo', open: false, angle: crateAngle({ time }) });
  drawGarriParcel(g, 295, 176, time);
  // Arriving: the hero holds the rope as the bucket comes down at x 60
  const arrive = 40 + ((time * 60) % 220);
  drawRoomRope(g, ROOM.arriveX, Math.min(arrive, 289), time * 0);
  hero(g, ROOM.arriveX, Math.min(arrive, 289) + 9, { skin: 1, hair: 4, outfit: 3 }, { phase: 0, inAir: false, facing: 1, glow: false, rope: true });
  drawRoomRope(g, ROOM.exitX, ROOM_ROPE_BUCKET_Y, time);
  hero(g, ROOM.exitX + 12, ROOM.floorY, { skin: 4, hair: 1, outfit: 0 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  g.restore();
  // HUD icon at a few sizes
  g.fillStyle = 'rgba(29,26,20,0.75)';
  g.fillRect(840, 620, 110, 90);
  drawParcelIcon(g, 870, 645, 24);
  drawParcelIcon(g, 915, 645, 36);
  g.fillStyle = '#ffffff';
  g.font = 'bold 14px sans-serif';
  g.textAlign = 'center';
  g.fillText('Parcel', 895, 690);
};

/** Slice 2 pages in order. Later pieces of work push their pages onto this list. */
export const SLICE2_PAGES: Page[] = [controlsAndStreet, poses, crates, wellPage, roomPage, ...HERO_PAGES, ...STREET_PAGES, ...HALL_PAGES, ...FIXED_PAGES, ...P2_PAGES];
