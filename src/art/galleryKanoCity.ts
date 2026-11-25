/**
 * K6a: Kano from above and Harmattan Road for qa and Tp (debug only; docs/kano.md 6.1 to 6.5):
 * ?gallery=kano-city   the whole city tired, every pin showing its problem (the start);
 * ?gallery=kano-city2  the whole city bright after the boom: every fix done, every place built
 *                      and busy, walkers about (the people kit, crisp style 1.8);
 * ?gallery=kano-city3  close-ups: tired and bright blocks side by side, the four places with
 *                      their people, the water queue, the pins (problem and ready) and icons;
 * ?gallery=kano-city4  Harmattan Road at 851 x 393 and 320 x 240, its vehicles and scenery.
 * The art is in the lazy Kano part, so it is fetched here with import(), never bundled in.
 */
import { drawFolkBust, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { CITY_FOLK_SCALE } from './folkCasts';
import { setInkRatio } from './ink';
import { INK } from './palette';
import * as lane from './lane';
import * as shade from './lane-shade';
import * as things from './lane-things';

type G = CanvasRenderingContext2D;
type Kano = typeof import('../worlds/kano/galleryArt');
const PLACE_DRAW = (k: Kano) => ({ leather: k.drawLeatherStalls, dye: k.drawDyePits, grain: k.drawGrainMarket, pyramid: k.drawPyramidPlace });

let kano: Kano | null = null;
let asked = false;
const pics = new Map<string, HTMLCanvasElement | null>();

function label(g: G, text: string, x: number, y: number, size = 11): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

const who = (g: G, look: FolkLook, x: number, y: number, f: FolkFrame, flip = false): void => {
  g.save();
  g.translate(x, y);
  g.scale(flip ? -CITY_FOLK_SCALE : CITY_FOLK_SCALE, CITY_FOLK_SCALE);
  drawFolkFrame(g, look, f);
  g.restore();
};

/**
 * The queue at the water yard once it flows (kano.md part 7), as K6b can place it: adults and a
 * teen by the cans, a child standing close by a parent (never a child carrying water alone).
 */
function queue(g: G, k: Kano): void {
  const b = k.KANO_BLOCKS.find((q) => q.id === 'r0c3')!;
  const who5 = [k.KURMI_CAST[4]!, k.DAWANAU_CAST[5]!, k.KOFAR_MATA_CAST[3]!, k.KURMI_CAST[11]!, k.KURMI_CAST[10]!, k.KURMI_CAST[6]!];
  who5.forEach((l, i) => who(g, l, b.x + 196 + i * 18 - (i === 4 ? 8 : 0), b.y + b.d - 2 + (i % 2) * 3, 'stand'));
}

function map(g: G, k: Kano, key: string, s: number, x: number, y: number, bright: boolean, time: number): void {
  const L = k.KANO_SPOT_IDS;
  const looks = Object.fromEntries(L.map((id) => [id, bright ? 'fixed' : 'problem'])) as Record<(typeof L)[number], 'fixed' | 'problem'>;
  const opts = bright ? { boom: true, lit: true, built: k.KANO_PLACE_IDS } : { bright: [] as string[] };
  const dpr = g.getTransform().a;
  let c = pics.get(key);
  if (c === undefined) {
    c = k.makeKanoCityCanvas(looks, s * dpr, 4096, opts);
    pics.set(key, c);
  }
  if (c) g.drawImage(c, x, y, k.KANO_MAP.w * s, k.KANO_MAP.h * s);
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  if (bright) {
    for (const id of k.KANO_PLACE_IDS) {
      const p = k.KANO_PLACES[id];
      PLACE_DRAW(k)[id](g, p.x, p.y, { time, sale: (time / k.KANO_PLACE_LOOK[id].time) % 1, served: Math.floor(time / 8), stock: 0.8, who });
    }
    k.KANO_CITY_CAST.forEach((l, i) => {
      const b = k.KANO_BLOCKS[i % k.KANO_BLOCKS.length]!;
      who(g, l, b.x + 30 + ((i * 53) % (b.w - 60)), b.y + b.d + 6, `walk${Math.floor(time * 6 + i) % 4}` as FolkFrame, i % 2 === 1);
    });
    queue(g, k);
  }
  g.restore();
  if (!bright) for (const id of L) k.drawKanoPin(g, x + k.KANO_SPOTS[id].pin.x * s, y + k.KANO_SPOTS[id].pin.y * s, id, 'problem');
}

function closeUps(g: G, k: Kano, time: number): void {
  label(g, 'Tired (left) and bright (right): Kurmi stalls, the dye yard, the water yard (dry / flowing), the truck yard and mast (slow / fixed)', 12, 6);
  const pairs: [string, number, number][] = [['r1c0', 10, 26], ['r0c1', 490, 26]];
  for (const [id, x, y] of pairs) {
    const b = k.KANO_BLOCKS.find((q) => q.id === id)!;
    for (const bright of [false, true]) {
      g.save();
      g.beginPath();
      g.rect(x + (bright ? 232 : 0), y, 228, 170);
      g.clip();
      g.translate(x + (bright ? 232 : 0) + 4, y + 30);
      g.scale(0.62, 0.62);
      g.translate(-b.x, -b.y);
      k.drawKanoBlock(g, b, 'fixed', { bright: bright ? [id] : [] });
      g.restore();
    }
  }
  const pairs2: [string, number, number, 'dryTaps' | 'slowInternet'][] = [['r0c3', 10, 206, 'dryTaps'], ['r2c3', 490, 206, 'slowInternet']];
  for (const [id, x, y, spot] of pairs2) {
    const b = k.KANO_BLOCKS.find((q) => q.id === id)!;
    for (const bright of [false, true]) {
      g.save();
      g.beginPath();
      g.rect(x + (bright ? 232 : 0), y, 228, 170);
      g.clip();
      g.translate(x + (bright ? 232 : 0) + 4, y + 50);
      g.scale(0.62, 0.62);
      g.translate(-b.x, -b.y);
      k.drawKanoBlock(g, b, bright ? 'fixed' : spot === 'dryTaps' ? 'problem' : 'ready', { bright: bright ? [id] : [] });
      if (bright && id === 'r0c3') queue(g, k);
      g.restore();
    }
  }
  label(g, 'The four tax places at 1.5x, live, with their people (the kit, crisp): leather stalls, dye pits, grain market, groundnut pyramid', 12, 384);
  g.save();
  g.translate(0, 520);
  g.scale(1.5, 1.5);
  (['leather', 'dye', 'grain', 'pyramid'] as const).forEach((id, i) => {
    PLACE_DRAW(k)[id](g, 80 + i * 160, 0, { time, sale: (time / 4) % 1, served: Math.floor(time / 4), stock: 0.9, who });
  });
  g.restore();
  label(g, 'Pins: problem, then ready (screen px, as Lagos and Ogun), and their icons', 12, 560);
  k.KANO_SPOT_IDS.forEach((id, i) => {
    k.drawKanoPin(g, 50 + i * 150, 660, id, 'problem', 0);
    k.drawKanoPin(g, 115 + i * 150, 660, id, 'ready', 0);
    g.save();
    g.translate(82 + i * 150, 694);
    g.scale(1.5, 1.5);
    k.drawKanoSpotIcon(g, id, 0, 0);
    g.restore();
  });
  g.save();
  g.translate(620, 690);
  k.plot(g, 60, 0, 90);
  k.drawKanoBus(g, 240, -10, 'e');
  k.drawKanoBus(g, 290, -10, 'e', true);
  g.restore();
}

function laneFrame(g: G, k: Kano, x: number, y: number, w: number, h: number, time: number): void {
  const look = k.harmattanLook({ lane, shade, things, folk: { drawFolkFrame, drawFolkBust } });
  const dpr = g.getTransform().a;
  const v = lane.laneView(w, h);
  const dist = time * 10;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x, y);
  const sky = look.sky(w, v.horizonY);
  if (sky) g.drawImage(sky as CanvasImageSource, 0, 0);
  look.road(g, v, dist);
  const ppmAt = (z: number): number => v.f / (z + lane.LANE_CAMERA.back);
  const near = look.things(ppmAt(0) * dpr);
  const scen = look.scenery(ppmAt(12) * dpr);
  const blit = (key: string, set: Map<string, shade.Baked>, px: number, z: number, up = 0): void => {
    const p = lane.project(v, px, z, up);
    const b = set.get(key);
    if (!p || !b) return;
    shade.blitBaked(g, b, p.x, p.y, p.ppm);
  };
  const R = lane.ROAD;
  for (let d = Math.floor((dist + 60) / 25) * 25; d > dist; d -= 25) {
    const i = Math.round(d / 25);
    const side = i % 2 === 0 ? 1 : -1;
    blit(look.sceneryKeys[i % look.sceneryKeys.length]!, scen, side * (R.half + R.kerb + (side < 0 ? R.divider : 0) + 2.6), d - dist);
  }
  blit('busStop', scen, R.half + R.kerb + 2.6, 52);
  const veh: [number, number][] = [[40, 0], [30, 2], [18, 1]];
  for (const [z, l] of veh) blit(look.danfo(z + 7, l, 0), near, lane.laneCentre(l), z);
  for (let c = 0; c < 4; c++) blit(things.laneKey('coin', 2), near, lane.laneCentre(2), 9 + c * 3, 0.6);
  blit(things.laneKey('bulb'), near, lane.laneCentre(0), 12, 0.8);
  g.restore();
  g.strokeStyle = INK;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

function lanePage(g: G, k: Kano, time: number): void {
  label(g, 'K6a Harmattan Road: gold haze, our far wall and baobabs, cattle far off, sand on the road edges, grain trucks and danfos (the danfo kind), groundnut and orange stalls. 851 x 393', 12, 6);
  laneFrame(g, k, 12, 24, 851, 393, time);
  label(g, '320 x 240 real size', 12, 428);
  laneFrame(g, k, 12, 446, 320, 240, time);
  label(g, 'Vehicles and scenery (baked pieces)', 350, 428);
  const look = k.harmattanLook({ lane, shade, things, folk: { drawFolkFrame, drawFolkBust } });
  const ppm = 30;
  const tm = look.things(ppm);
  const sc = look.scenery(ppm);
  const items: [string, Map<string, shade.Baked>][] = [['grainTruck#1', tm], ['danfo#0', tm], ...look.sceneryKeys.map((key): [string, Map<string, shade.Baked>] => [key, sc]), ['busStopBright', sc]];
  items.forEach(([key, set], i) => {
    const b = set.get(key);
    if (b) shade.blitBaked(g, b, 380 + (i % 5) * 100 + (key === 'busStopBright' ? 140 : 0), 560 + Math.floor(i / 5) * 130, ppm);
  });
  g.save();
  g.translate(880, 700);
  g.scale(30 / 32, 30 / 32);
  look.front?.(g, { wall: 2, windows: ['lean', 'glow'], door: 'open' });
  g.restore();
}

export function drawKanoCityGallery(g: G, viewW: number, viewH: number, time: number, page: number): void {
  if (!asked) {
    asked = true;
    void import('../worlds/kano').then((m) => {
      kano = m;
    });
  }
  g.fillStyle = '#f3ecdc';
  g.fillRect(0, 0, viewW, viewH);
  if (!kano) {
    label(g, 'Loading the Kano part...', 12, 12, 14);
    return;
  }
  setInkRatio(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  g.save();
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  if (page === 0) {
    label(g, 'K6a Kano from above at the start: every area tired, every pin a problem (Sandy road, Lights out, Slow internet, Dry taps). Wall and gate faded.', 12, 6);
    map(g, kano, 'start', 0.58, 16, 30, false, time);
  } else if (page === 1) {
    label(g, 'Kano bright after the boom: fixes done, places built and busy, walkers about (kit, crisp), the water queue, wall and gate bright.', 12, 6);
    map(g, kano, 'boom', 0.58, 16, 30, true, time);
  } else if (page === 2) closeUps(g, kano, time);
  else lanePage(g, kano, time);
  g.restore();
}
