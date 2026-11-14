/**
 * The lane run's pictures in the gallery (debug only, task S3f1), in a fixed 960 x 720 layout:
 * ?gallery=lane    the road at dusk with everything on it, live, plus a 320 x 240 phone view
 * ?gallery=lane2   the hero from behind: every pose, and every skin, hair, outfit, body and age
 * ?gallery=lane3   every road thing and pickup up close, bursts, the Blackout steps, lamps
 * ?gallery=lane4   pavement scenery, the footbridge and the bus stop
 * Add &t=1.5 to hold the time.
 */
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, type HeroLook } from './hero';
import { INK } from './palette';
import {
  BUS_STOP_BOX,
  LANE_CAMERA,
  LANE_SCENERY,
  ROAD,
  atScreen,
  blackoutShare,
  drawBlackout,
  drawBlackoutWash,
  drawFootbridge,
  drawLaneBusStop,
  drawLaneLamp,
  drawLaneRoad,
  drawLaneSky,
  drawScenery,
  laneBoost,
  laneCentre,
  laneFade,
  laneView,
  project,
  type LampLook,
  type LaneView,
} from './lane';
import { LANE_HERO_POSES, drawLaneHero, drawLaneHeroAt, drawLaneShadow, laneRunFrame, laneStumbleFrame, laneTorchFrame, type LaneHeroPose } from './lane-hero';
import {
  BURST_TIME,
  LANE_PICKUPS,
  LANE_THINGS,
  bulbFrame,
  coinFrame,

  drawLaneBurst,
  drawLanePickup,
  drawLaneThing,
  goatChewFrame,
  hazardFrame,
  laneFamily,
  type LanePickup,
  type LaneThing,
} from './lane-things';

const LAYOUT_W = 960;
const LAYOUT_H = 720;

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size = 10, align: CanvasTextAlign = 'center', colour = INK): void {
  g.fillStyle = colour;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(s, x, y);
}

const LOOK: HeroLook = { skin: 4, hair: 2, outfit: 1, body: 1, age: 1 };

/** A thing's frame at time t. */
function frameOf(kind: LaneThing | LanePickup, t: number): number {
  if (kind === 'danfo') return hazardFrame(t);
  if (kind === 'goat') return goatChewFrame(t);
  if (kind === 'coin') return coinFrame(t);
  if (kind === 'bulb') return bulbFrame(t);
  return 0;
}

/** The road scene at time t into a w x h box: what the lane run looks like with everything on it. */
export function drawLaneScene(g: CanvasRenderingContext2D, w: number, h: number, t: number, look: HeroLook = LOOK, blackout = 40): void {
  const lane = 1 + Math.round(Math.sin(t * 0.7));
  const camX = laneCentre(lane) * 0.6;
  const v = laneView(w, h, camX);
  const speed = 11;
  const dist = t * speed;
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  drawLaneSky(g, w, v.horizonY);
  drawLaneRoad(g, v, dist);
  // Far to near: footbridge, lamps, scenery, things
  const items: { z: number; draw: () => void }[] = [];
  const bz = 200 - (dist % 200) - 40;
  if (bz > -2 && bz < LANE_CAMERA.ahead + 40) items.push({ z: bz, draw: () => drawFootbridge(g, v, bz) });
  const lampOff = dist % 10;
  for (let z = -lampOff - 10; z < 70; z += 10) {
    const look: LampLook = blackout < 15 && z < 0 ? 'flicker' : z < -2 ? 'off' : 'on';
    for (const side of [-1, 1] as const) items.push({ z, draw: () => drawLaneLamp(g, v, z, side, look, t) });
  }
  const sOff = dist % 16;
  for (let i = 0; i < 6; i++) {
    const z = i * 16 - sOff;
    const kind = LANE_SCENERY[(Math.floor(dist / 16) + i) % LANE_SCENERY.length]!;
    items.push({ z, draw: () => placed(g, v, ROAD.half + ROAD.kerb + 2.4, z, (gg) => drawScenery(gg, kind, t)) });
  }
  const row = (z: number, kinds: (LaneThing | LanePickup | null)[]): void => {
    kinds.forEach((k, i) => {
      if (!k) return;
      const pickup = (LANE_PICKUPS as readonly string[]).includes(k);
      items.push({ z, draw: () => thing(g, v, laneCentre(i), z, k, t, pickup ? (k === 'coin' ? 0.5 : 0.7) : 0) });
    });
  };
  const loop = 72;
  const base = dist % loop;
  const at = (z: number): number => ((z - base + loop * 2) % loop) - 4;
  row(at(10), ['danfo', 'coin', null]);
  row(at(22), [null, 'cones', 'bulb']);
  row(at(34), ['crate:power', 'barrier', null]);
  row(at(46), [null, 'goat', 'danfo']);
  row(at(58), ['chip', 'pothole', 'junk']);
  row(at(68), ['sign', 'garri', 'danfo']);
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();
  // The hero, from behind, in their lane
  const hz = 0;
  const p = project(v, laneCentre(lane), hz);
  if (p) {
    drawLaneShadow(g, p.x, p.y, p.ppm, 0);
    drawLaneHeroAt(g, look, { move: 'run', frame: laneRunFrame(t * 1.6) }, p.x, p.y, p.ppm);
  }
  drawBlackout(g, w, h, blackout);
  g.restore();
}

/** Something in lane units placed on the road at x, z (and `up` metres high), with the far boost and the fade in. */
function placed(g: CanvasRenderingContext2D, v: LaneView, x: number, z: number, draw: (g: CanvasRenderingContext2D) => void, up = 0): void {
  if (z > LANE_CAMERA.ahead) return;
  const p = project(v, x, z, up);
  if (!p) return;
  const a = laneFade(z);
  if (a <= 0) return;
  const ga = g.globalAlpha;
  g.globalAlpha = ga * a;
  atScreen(g, p.x, p.y, p.ppm * laneBoost(z), draw);
  g.globalAlpha = ga;
}

function thing(g: CanvasRenderingContext2D, v: LaneView, x: number, z: number, k: LaneThing | LanePickup, t: number, up: number): void {
  const pickup = (LANE_PICKUPS as readonly string[]).includes(k);
  const d = z + LANE_CAMERA.back;
  placed(
    g,
    v,
    x,
    z,
    (gg) => {
      if (pickup) drawLanePickup(gg, k as LanePickup, { frame: frameOf(k, t) });
      else drawLaneThing(gg, k as LaneThing, { frame: frameOf(k, t), flat: Math.min(1, (LANE_CAMERA.up / d) * 1.4), time: t });
    },
    up,
  );
}

type Page = (g: CanvasRenderingContext2D, t: number) => void;

/** Page 1: the scene big, and at the smallest phone size (320 x 240), with the Blackout close. */
const scenePage: Page = (g, t) => {
  text(g, 'S3f1 lane run: Lagos main road at dusk, from behind (live). Bottom right: 320 x 240 with the Blackout 8 m behind.', 12, 6, 13, 'left');
  g.save();
  g.translate(10, 26);
  drawLaneScene(g, 600, 400, t);
  g.restore();
  g.strokeStyle = INK;
  g.strokeRect(10, 26, 600, 400);
  g.save();
  g.translate(630, 26);
  drawLaneScene(g, 320, 240, t + 3, { skin: 0, hair: 3, outfit: 3, body: 1, age: 2 }, 8);
  g.restore();
  g.strokeRect(630, 26, 320, 240);
  text(g, '320 x 240 (actual size); hero 56 px+ tall', 790, 270, 10);
  g.save();
  g.translate(630, 290);
  drawLaneScene(g, 320, 200, t + 7, { skin: 2, hair: 0, outfit: 0, body: 0, age: 0 }, 22);
  g.restore();
  g.strokeRect(630, 290, 320, 200);
  text(g, '640 x 200 shape at half size; Blackout 22 m', 790, 494, 10);
  // Every kind's family, with frames over time
  const y = 470;
  LANE_THINGS.slice(0, 10).forEach((k, i) => {
    const x = 40 + i * 58;
    g.save();
    g.translate(x, y + 70);
    g.scale(0.9, 0.9);
    drawLaneThing(g, k, { frame: frameOf(k, t), time: t });
    g.restore();
    text(g, k, x, y + 76, 9);
    text(g, laneFamily(k), x, y + 88, 9, 'center', '#6b5a48');
  });
  LANE_PICKUPS.forEach((k, i) => {
    const x = 120 + i * 90;
    g.save();
    g.translate(x, 640);
    g.scale(2, 2);
    drawLanePickup(g, k, { frame: frameOf(k, t) });
    g.restore();
    text(g, k, x, 674, 10);
  });
  text(g, 'Blackout steps: 30 m (none), 20, 10, 0 m (35 percent, deep blue, never black)', 760, 520, 10);
  [30, 20, 10, 0].forEach((m, i) => {
    const x = 640 + i * 78;
    g.fillStyle = '#3b3a42';
    g.fillRect(x, 540, 70, 120);
    g.save();
    g.translate(x, 540);
    drawBlackout(g, 70, 120, m);
    g.restore();
    text(g, `${m} m: ${Math.round(blackoutShare(m) * 100)}%`, x + 35, 664, 9);
  });
};

/** Page 2: the hero from behind, every pose; then every skin x hair, outfits, bodies and ages. */
const heroPage: Page = (g, t) => {
  text(g, 'S3f1 hero from behind: run 4, jump, slide, stumble 2, torch shrug 2, wave 2; suit; then every skin x hair (outfits turn), bodies and ages', 12, 6, 12, 'left');
  g.fillStyle = '#3b3a42';
  g.fillRect(0, 22, LAYOUT_W, 150);
  LANE_HERO_POSES.forEach((p, i) => {
    const x = 40 + i * 70;
    g.save();
    g.translate(x, 150);
    g.scale(1.8, 1.8);
    drawLaneHero(g, LOOK, p);
    g.restore();
    text(g, `${p.move} ${p.frame ?? 0}`, x, 156, 10, 'center', '#ffffff');
  });
  // Live moves and the suit
  const live: [string, LaneHeroPose][] = [
    ['run', { move: 'run', frame: laneRunFrame(t * 1.6) }],
    ['run, suit', { move: 'run', frame: laneRunFrame(t * 1.6), suit: true }],
    ['stumble', { move: 'stumble', frame: laneStumbleFrame((t % 0.6) / 0.5) }],
    ['caught', { move: 'torch', frame: laneTorchFrame((t % 1.6) / 1.2) }],
  ];
  g.fillStyle = '#e9e1cf';
  g.fillRect(0, 172, LAYOUT_W, 116);
  live.forEach(([name, p], i) => {
    const x = 70 + i * 120;
    g.save();
    g.translate(x, 270);
    g.scale(1.6, 1.6);
    drawLaneHero(g, { skin: (i + 1) % 5, hair: (i + 3) % 5, outfit: (i + 2) % 5, body: i % 2, age: 1 }, p);
    g.restore();
    text(g, name, x, 274, 10);
  });
  // Every skin (rows) x every hair (columns); outfits turn so all appear
  const run = laneRunFrame(t * 1.6);
  for (let r = 0; r < SKINS.length; r++) {
    for (let c = 0; c < HAIRS.length; c++) {
      const x = 560 + c * 76;
      const y = 228 + r * 64;
      g.save();
      g.translate(x, y + 60);
      g.scale(1.05, 1.05);
      drawLaneHero(g, { skin: r, hair: c, outfit: (r + c) % OUTFITS.length, body: c >= 3 ? 1 : r % 2, age: 1 }, { move: 'run', frame: (run + r + c) % 4 });
      g.restore();
    }
  }
  for (let c = 0; c < HAIRS.length; c++) text(g, HAIRS[c]!.label, 560 + c * 76, 292 + 5 * 64, 10);
  // Bodies x ages x outfits
  let i = 0;
  for (let b = 0; b < BODIES.length; b++) {
    for (let a = 0; a < AGES.length; a++) {
      const o = i % OUTFITS.length;
      const x = 40 + i * 82;
      g.save();
      g.translate(x, 430);
      g.scale(1.6, 1.6);
      drawLaneHero(g, { skin: (i * 2) % 5, hair: b === 1 ? [2, 4, 3][a]! : [0, 1, 0][a]!, outfit: o, body: b, age: a }, { move: 'wave', frame: Math.floor(t * 3) % 2 });
      g.restore();
      text(g, `${BODIES[b]!.label} ${AGES[a]!.label}`, x, 434, 9);
      text(g, OUTFITS[o]!.label, x, 446, 9);
      i++;
    }
  }
  // Every outfit, running, at game size (about 1 px per u at 320 x 240)
  OUTFITS.forEach((o, k) => {
    const x = 60 + k * 90;
    g.save();
    g.translate(x, 640);
    g.scale(1.2, 1.2);
    drawLaneHero(g, { skin: k, hair: (k + 1) % 5, outfit: k, body: k % 2, age: 1 }, { move: k === 4 ? 'jump' : k === 3 ? 'slide' : 'run', frame: run });
    g.restore();
    text(g, o.label, x, 646, 10);
  });
};

/** Page 3: every road thing and pickup big, bursts, and the lamps' three looks. */
const thingsPage: Page = (g, t) => {
  text(g, 'S3f1 road things big: dodge (thick, sharp), burst (wood or loose, sparkle), goat (round). Bursts loop. Lamps: on, flicker, off, dim (reduced motion)', 12, 6, 12, 'left');
  g.fillStyle = '#3b3a42';
  g.fillRect(0, 22, LAYOUT_W, 360);
  LANE_THINGS.forEach((k, i) => {
    const x = 70 + (i % 8) * 118;
    const y = 190 + Math.floor(i / 8) * 180;
    g.save();
    g.translate(x, y);
    g.scale(1.6, 1.6);
    drawLaneThing(g, k, { frame: frameOf(k, t), time: t, flat: 0.5 });
    g.restore();
    text(g, k, x, y + 6, 10, 'center', '#ffffff');
  });
  LANE_PICKUPS.forEach((k, i) => {
    const x = 70 + i * 100;
    g.save();
    g.translate(x, 440);
    g.scale(3, 3);
    drawLanePickup(g, k, { frame: frameOf(k, t) });
    g.restore();
    text(g, k, x, 486, 10);
  });
  (['crate', 'junk', 'sign'] as const).forEach((b, i) => {
    const x = 600 + i * 120;
    const p = ((t + i * 0.2) % (BURST_TIME + 0.4)) / BURST_TIME;
    g.save();
    g.translate(x, 470);
    g.scale(1.6, 1.6);
    if (p < 1) drawLaneBurst(g, b, p);
    else drawLaneThing(g, b === 'crate' ? 'crate:tech' : b, {});
    g.restore();
    text(g, `${b} burst`, x, 476, 10);
  });
  // Lamps
  const v = laneView(420, 210, 0);
  g.save();
  g.translate(20, 500);
  g.beginPath();
  g.rect(0, 0, 420, 210);
  g.clip();
  g.fillStyle = '#4a3a86';
  g.fillRect(0, 0, 420, 210);
  drawLaneRoad(g, v, t * 10);
  const looks: LampLook[] = ['on', 'flicker', 'off', 'dim'];
  for (let k = 0; k < 4; k++) drawLaneLamp(g, v, 34 - k * 10, 1, looks[k]!, t);
  for (let k = 0; k < 4; k++) drawLaneLamp(g, v, 34 - k * 10, -1, looks[3 - k]!, t);
  g.restore();
  text(g, 'right side, far to near: on, flicker, off, dim', 230, 700, 10);
  // Caught: the wash and the torch shrug
  g.save();
  g.translate(480, 510);
  g.fillStyle = '#3b3a42';
  g.fillRect(0, 0, 200, 190);
  drawBlackoutWash(g, 200, 190, 1);
  g.translate(100, 170);
  g.scale(2.2, 2.2);
  drawLaneHero(g, LOOK, { move: 'torch', frame: Math.floor(t) % 2 });
  g.restore();
  text(g, 'caught: wash, torch shrug', 580, 702, 10);
};

/** Page 4: pavement scenery, the footbridge and the bus stop. */
const placesPage: Page = (g, t) => {
  text(g, 'S3f1 pavement scenery (people only on the pavement), footbridge, bus stop (unlit and bright)', 12, 6, 12, 'left');
  g.fillStyle = '#b59a80';
  g.fillRect(0, 22, LAYOUT_W, 300);
  LANE_SCENERY.forEach((k, i) => {
    const x = 60 + (i % 5) * 190;
    const y = 160 + Math.floor(i / 5) * 150;
    g.save();
    g.translate(x, y);
    g.scale(1.3, 1.3);
    drawScenery(g, k, t);
    g.restore();
    text(g, k, x, y + 4, 10);
  });
  for (const [i, bright] of [[0, false], [1, true]] as const) {
    const x = 160 + i * 460;
    g.save();
    g.translate(x, 560);
    g.scale(1.6, 1.6);
    drawLaneBusStop(g, t, bright);
    g.restore();
    text(g, bright ? 'bus stop, goal reached (bright)' : 'bus stop', x + (BUS_STOP_BOX.r * 0.8) / 2, 566, 11);
  }
  const v = laneView(300, 120, 0);
  g.save();
  g.translate(640, 590);
  g.beginPath();
  g.rect(0, 0, 300, 120);
  g.clip();
  g.fillStyle = '#4a3a86';
  g.fillRect(0, 0, 300, 120);
  drawLaneSky(g, 300, v.horizonY);
  drawLaneRoad(g, v, t * 10);
  drawFootbridge(g, v, 14);
  g.restore();
  text(g, 'footbridge (scenery, high above)', 790, 712, 10);
};

export const LANE_PAGES: Page[] = [scenePage, heroPage, thingsPage, placesPage];

/** Draws gallery page `page` (0 to 3) into a viewW x viewH area at time t. */
export function drawLaneGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, t: number, page = 0): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / LAYOUT_W, viewH / LAYOUT_H);
  g.scale(s, s);
  (LANE_PAGES[page] ?? scenePage)(g, t);
  g.restore();
}

