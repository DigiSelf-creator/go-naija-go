/**
 * Slice 3 gallery pages (debug only): ?gallery=16 the six intro frames (and frame 5 with
 * several heroes and the plain outline hero), ?gallery=17 Lagos from above with its pins,
 * ?gallery=18 the three problem spots in every look, the pins, buses and bucket icons.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import {
  BUCKETS,
  CITY_BLOCKS,
  CITY_MAP,
  CITY_SPOTS,
  SPOT_IDS,
  SPOT_LOOKS,
  drawBucketIcon,
  drawCity,
  drawCityBlock,
  drawCityBus,
  drawCityGround,
  drawPotholeSpot,
  drawProblemPin,
  type SpotLooks,
} from './city';
import { type HeroLook } from './hero';
import { INTRO_FRAMES, drawIntroFrame } from './intro';
import { INK } from './palette';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10): void {
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

function framed(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, paint: () => void): void {
  g.save();
  g.translate(x, y);
  paint();
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
}

const LOOKS: (HeroLook | null)[] = [
  { skin: 4, hair: 3, outfit: 1, body: 1, age: 1 },
  { skin: 0, hair: 0, outfit: 2, body: 0, age: 0 },
  { skin: 2, hair: 1, outfit: 4, body: 0, age: 2 },
  { skin: 3, hair: 4, outfit: 3, body: 1, age: 2 },
  null,
];

const introPage: Page = (g, time) => {
  title(g, 'S3a1: the six intro frames (captions are HTML text, gamedev). Bottom: frame 5 with other heroes, and no hero yet');
  for (let i = 0; i < INTRO_FRAMES; i++) {
    const x = 15 + (i % 3) * 315;
    const y = 28 + Math.floor(i / 3) * 196;
    framed(g, x, y, 300, 169, () => drawIntroFrame(g, i + 1, 300, 169, { look: LOOKS[0]!, time }));
    label(g, `frame ${i + 1}`, x + 150, y + 172);
  }
  LOOKS.forEach((look, k) => {
    const x = 15 + k * 188;
    framed(g, x, 430, 178, 100, () => drawIntroFrame(g, 5, 178, 100, { look, time }));
    label(g, look ? `skin ${look.skin + 1}, hair ${look.hair}, outfit ${look.outfit}` : 'no hero yet: outline', x + 89, 533);
  });
  // A tall phone shape and a very wide one: the scene fills, the picture stays whole
  framed(g, 15, 560, 90, 150, () => drawIntroFrame(g, 1, 90, 150, { time }));
  label(g, 'tall', 60, 712, 9);
  framed(g, 120, 600, 400, 100, () => drawIntroFrame(g, 4, 400, 100, { time }));
  label(g, 'wide', 320, 702, 9);
  framed(g, 540, 560, 240, 140, () => drawIntroFrame(g, 3, 240, 140, { time: 0 }));
  label(g, 'frame 3, reduced motion (time 0)', 660, 702, 9);
};

const MIXED: SpotLooks = { potholes: 'ready', lightsOut: 'problem', slowInternet: 'fixed' };

const cityPage: Page = (g, time) => {
  title(g, 'S3b1: Lagos from above, far view (pins drawn in screen px over the map). Potholes ready, Lights out problem, Slow internet fixed');
  const s = 0.58;
  g.save();
  g.translate(16, 28);
  g.beginPath();
  g.rect(0, 0, CITY_MAP.w * s, CITY_MAP.h * s);
  g.clip();
  g.scale(s, s);
  drawCity(g, MIXED);
  // Buses on their lanes
  const k = (time * 60) % CITY_MAP.w;
  drawCityBus(g, k, 548, 'e');
  drawCityBus(g, CITY_MAP.w - k, 576, 'w');
  drawCityBus(g, 810, (time * 40) % 520, 's');
  drawCityBus(g, 300 + k * 0.5, 818, 'e');
  g.restore();
  const bob = Math.abs(Math.sin(time * Math.PI)) * 2;
  for (const id of SPOT_IDS) {
    if (MIXED[id] === 'fixed') continue;
    const p = CITY_SPOTS[id].pin;
    drawProblemPin(g, 16 + p.x * s, 28 + p.y * s, id, MIXED[id] === 'ready' ? 'ready' : 'problem', bob);
  }
  label(g, 'Fixed spots have no pin (the slow-internet block on the right is fixed here).', 480, 620, 11);
};

const partsPage: Page = (g, time) => {
  title(g, 'S3b1: the three spots as problem, ready, fixed; pins; buses; bucket icons');
  SPOT_IDS.forEach((id, row) => {
    const spot = CITY_SPOTS[id];
    const f = spot.focus;
    SPOT_LOOKS.forEach((look, col) => {
      const x = 14 + col * 210;
      const y = 26 + row * 226;
      const w = 200;
      const h = 200;
      const pad = id === 'potholes' ? 40 : 10;
      const sc = Math.min(w / (f.w + pad * 2), h / (f.h + 140));
      framed(g, x, y, w, h, () => {
        g.beginPath();
        g.rect(0, 0, w, h);
        g.clip();
        g.scale(sc, sc);
        g.translate(-f.x + pad, -f.y + 120);
        drawCityGround(g);
        if (id === 'potholes') drawPotholeSpot(g, look);
        else for (const b of CITY_BLOCKS) if (b.id === spot.block) drawCityBlock(g, b, look);
      });
      label(g, `${id}: ${look}`, x + w / 2, y + h + 3);
    });
  });
  // Pins, both states
  SPOT_IDS.forEach((id, k) => {
    drawProblemPin(g, 690 + k * 100, 130, id, 'problem', 0);
    drawProblemPin(g, 690 + k * 100, 300, id, 'ready', Math.abs(Math.sin(time * Math.PI)) * 2);
  });
  label(g, 'pins: problem (top) and ready (below)', 790, 310, 9);
  // Buses, four ways
  g.save();
  g.translate(660, 400);
  g.scale(2, 2);
  drawCityBus(g, 20, 20, 'e');
  drawCityBus(g, 80, 20, 'w');
  drawCityBus(g, 120, 30, 'n');
  drawCityBus(g, 145, 30, 's');
  g.restore();
  label(g, 'buses: e, w, n, s (x2)', 810, 490, 9);
  // Bucket icons at 24 and 48
  BUCKETS.forEach((b, k) => {
    drawBucketIcon(g, b, 690 + k * 90, 560, 24);
    drawBucketIcon(g, b, 690 + k * 90, 620, 48);
    label(g, b, 690 + k * 90, 650, 10);
  });
};

export const CITY_PAGES: Page[] = [introPage, cityPage, partsPage];
