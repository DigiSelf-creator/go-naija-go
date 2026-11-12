/**
 * Walk the city gallery pages (debug only; city.md part 5W, step c1):
 * ?gallery=22 the hero from above: every skin, hair, outfit, body and age in four views and
 *   four walk frames, standing, sizes when zoomed out, getting off the bus, the tap ring;
 * ?gallery=23 pay spots: mats, chalk outlines filling, price boards (full, part paid, done,
 *   wobble) at 320 px phone scale, flying money, the road being built, tray bubbles, the
 *   collect line, edge arrows;
 * ?gallery=24 the working places: the Mama Put going up, serving, full and still; the market
 *   empty, filling and full; the danfo's trip; and all of it live in Lagos from above.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import { CITY_MAP, drawCity, type SpotLooks } from './city';
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, type HeroLook } from './hero';
import { INK } from './palette';
import {
  ALAUSA_ROAD,
  BUILD_IDS,
  BUILDS,
  PAY,
  boardWobble,
  drawBuildOutline,
  drawCollectLine,
  drawEdgeArrow,
  drawFlyingMoney,
  drawPayMat,
  drawPriceBoard,
  drawRoadBuild,
  drawTrayBubble,
  edgeArrowPlace,
  priceBoardBox,
  trayWords,
} from './payspot';
import { MAMA_PUT, MARKET_PLACE, danfoTrip, drawMamaPut, drawMarketDanfo, drawMarketPlace, drawPorter } from './places';
import { BUS_ARRIVAL, WALKER, drawBusArrival, drawCityHero, drawWalkRing, walkerSize, type WalkDir } from './walker';

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

/** A patch of city pavement to stand things on. */
function ground(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, road = false): void {
  g.fillStyle = road ? '#5b5b62' : '#f3ead3';
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
}

const DIRS: readonly WalkDir[] = ['s', 'e', 'n', 'w'];

const heroPage: Page = (g, time) => {
  title(g, 'c1: the hero from above. Rows: front (s), side (e), back (n), side (w); 4 walk frames + standing. x2.2');
  // Five sample heroes covering every skin, hair, outfit, both bodies and every age
  const looks: HeroLook[] = [
    { skin: 0, hair: 0, outfit: 2, body: 0, age: 0 },
    { skin: 1, hair: 3, outfit: 1, body: 1, age: 1 },
    { skin: 2, hair: 1, outfit: 0, body: 1, age: 1 },
    { skin: 3, hair: 4, outfit: 4, body: 1, age: 2 },
    { skin: 4, hair: 2, outfit: 3, body: 0, age: 2 },
  ];
  ground(g, 10, 24, 940, 372);
  looks.forEach((lk, h) => {
    const bx = 22 + h * 188;
    label(g, `${SKINS[lk.skin]!.label}, ${HAIRS[lk.hair]!.label}`, bx + 85, 28, 9);
    label(g, `${OUTFITS[lk.outfit]!.label}, ${BODIES[lk.body!]!.label}, ${AGES[lk.age!]!.label}`, bx + 85, 38, 9);
    DIRS.forEach((dir, r) => {
      for (let f = 0; f < 5; f++) {
        g.save();
        g.translate(bx + 14 + f * 34, 118 + r * 78);
        g.scale(2.2, 2.2);
        if (f < 4) drawCityHero(g, lk, 0, 0, { dir, phase: f / 4 + 0.01 });
        else drawCityHero(g, lk, 0, 0, { dir, moving: false, time });
        g.restore();
      }
    });
  });
  for (let f = 0; f < 5; f++) label(g, f < 4 ? `frame ${f}` : 'stand', 36 + f * 34, 382, 8);

  // Every hair x outfit, live walking front, at 1.6x
  label(g, 'Every hair (columns) x outfit (rows), mixed skins, ages and views, live', 250, 404);
  ground(g, 10, 418, 490, 296);
  for (let o = 0; o < OUTFITS.length; o++)
    for (let hI = 0; hI < HAIRS.length; hI++) {
      const lk: HeroLook = { skin: (o + hI) % SKINS.length, hair: hI, outfit: o, body: hI >= 2 ? 1 : 0, age: (o + hI) % 3 };
      const dir: WalkDir = DIRS[(o + hI) % 4]!;
      g.save();
      g.translate(60 + hI * 95, 470 + o * 56);
      g.scale(1.6, 1.6);
      drawCityHero(g, lk, 0, 0, { dir, phase: (time * 3.75 + o * 0.1) % 1 });
      g.restore();
    }

  // Size at zoom: real map size, and walkerSize for far zooms (at least 24 px)
  label(g, 'On screen at zoom 1, 0.5 and 0.3 (walkerSize keeps it 24 px or more)', 730, 404);
  ground(g, 510, 418, 440, 120);
  const lk = looks[1]!;
  for (const [k, z] of [[0, 1], [1, 0.5], [2, 0.3]] as const) {
    g.save();
    g.translate(580 + k * 140, 510);
    g.scale(z, z);
    drawCityHero(g, lk, 0, 0, { dir: 's', phase: (time * 3.75) % 1, size: walkerSize(z) });
    g.restore();
    label(g, `zoom ${z}: ${Math.round(walkerSize(z) * z)} px`, 580 + k * 140, 518, 9);
  }

  // Getting off the bus, frame by frame, and the tap ring
  label(g, 'Getting off the bus (k = 0.2, 0.5, 0.7, 1) and live; tap ring', 730, 546);
  ground(g, 510, 560, 440, 154);
  g.fillStyle = '#5b5b62';
  g.fillRect(510, 590, 440, 30);
  [0.2, 0.5, 0.7, 1].forEach((k, i) => {
    g.save();
    g.beginPath();
    g.rect(510 + i * 88, 560, 88, 154);
    g.clip();
    g.translate(554 + i * 88, 600);
    g.scale(1.3, 1.3);
    drawBusArrival(g, lk, 0, 0, k);
    g.restore();
  });
  g.save();
  g.beginPath();
  g.rect(862, 560, 88, 154);
  g.clip();
  g.translate(898, 600);
  g.scale(1.3, 1.3);
  drawBusArrival(g, lk, 0, 0, Math.min(1, (time / BUS_ARRIVAL.time) % 1.3));
  drawWalkRing(g, 0, 60, (time / WALKER.ringTime) % 1.5);
  g.restore();
};

const payPage: Page = (g, time) => {
  title(g, 'c1: pay spots. Mats and chalk outlines (map units, x0.8); boards, bubbles, money, arrows (screen px, real size)');
  // Mats with outlines filling: 0, 0.5, 1 for each place
  ground(g, 10, 24, 940, 150);
  const outlines: { id: (typeof BUILD_IDS)[number]; k: number }[] = [
    { id: 'mamaPut', k: 0 },
    { id: 'mamaPut', k: 0.5 },
    { id: 'market', k: 1 },
    { id: 'lamps', k: 0 },
    { id: 'mast', k: 0.5 },
  ];
  outlines.forEach(({ id, k }, i) => {
    g.save();
    g.translate(100 + i * 185, 120);
    g.scale(0.8, 0.8);
    drawBuildOutline(g, id, 0, -10, k);
    drawPayMat(g, 0, 30, i === 1);
    g.restore();
    label(g, `${id} outline, fill ${k}${i === 1 ? ', hero on mat' : ''}`, 100 + i * 185, 158, 9);
  });

  // Price boards: every board full price, part paid, done, wobbling (real px)
  ground(g, 10, 182, 620, 210);
  label(g, 'Boards at real size: full price, part paid, Done, and the not-enough wobble (live)', 320, 186);
  BUILD_IDS.forEach((id, i) => {
    const x = 70 + i * 120;
    const b = BUILDS[id];
    drawPriceBoard(g, x, 260, id, b.price);
    drawPriceBoard(g, x, 330, id, Math.max(1, Math.round(b.price * 0.4)));
    const box = priceBoardBox(g, x, 330, id, Math.max(1, Math.round(b.price * 0.4)));
    g.strokeStyle = 'rgba(214,51,108,0.6)';
    g.setLineDash([3, 3]);
    g.strokeRect(box.x, box.y, box.w, box.h);
    g.setLineDash([]);
    label(g, `${Math.round(box.w)} x ${Math.round(box.h)} px`, x, 334, 8);
  });
  drawPriceBoard(g, 70, 386, 'road', 0);
  drawPriceBoard(g, 190, 386, 'mast', 0, { done: true });
  drawPriceBoard(g, 330, 386, 'road', 10, { wobble: boardWobble(time % 1) });
  drawPriceBoard(g, 450, 386, 'lamps', 10, { wobble: boardWobble((time + 0.5) % 1) });
  label(g, 'dashed: tap area (48 px or more)', 560, 370, 8);

  // Flying money: coins, bulbs and chips on their arcs, and live paying into a board
  ground(g, 640, 182, 310, 210);
  label(g, 'Paying: coins, bulbs, chips fly hero to board (live)', 795, 186);
  const kinds = ['naira', 'power', 'tech'] as const;
  kinds.forEach((kind, r) => {
    const y0 = 260 + r * 50;
    g.save();
    g.translate(680, y0);
    g.scale(1.6, 1.6);
    drawCityHero(g, { skin: r + 1, hair: r, outfit: r + 1 }, 0, 6, { dir: 'e', moving: false, time });
    g.restore();
    for (let i = 0; i < 4; i++) {
      const k = ((time / PAY.flight) + i * 0.25) % 1;
      drawFlyingMoney(g, kind, 690, y0 - 10, 900, y0 - 12, k);
    }
  });
  drawPriceBoard(g, 905, 300, 'road', 10 - (Math.floor(time / PAY.every) % 11));
  drawPriceBoard(g, 905, 380, 'lamps', 6);

  // Road being built
  ground(g, 10, 400, 300, 314);
  label(g, 'The road being built (k 0, 0.4, 0.8, live)', 160, 404);
  [0, 0.4, 0.8, (time / 1.5) % 1].forEach((k, i) => {
    g.save();
    g.beginPath();
    g.rect(14 + i * 74, 420, 70, 290);
    g.clip();
    g.translate(14 + i * 74, 420);
    g.scale(0.8, 0.8);
    g.translate(-ALAUSA_ROAD.x0 + 12, -ALAUSA_ROAD.y0 + 80);
    g.fillStyle = '#666169';
    g.fillRect(ALAUSA_ROAD.x0, ALAUSA_ROAD.y0 - 60, ALAUSA_ROAD.x1 - ALAUSA_ROAD.x0, 260);
    for (const [hx, hy] of [[92, 370], [110, 418], [88, 470]] as const) {
      g.fillStyle = '#2a1f17';
      g.beginPath();
      g.ellipse(hx, hy, 12, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (i === 0) drawBuildOutline(g, 'road', (ALAUSA_ROAD.x0 + ALAUSA_ROAD.x1) / 2, ALAUSA_ROAD.y1);
    drawRoadBuild(g, k, time);
    g.restore();
  });

  // Tray bubbles
  ground(g, 320, 400, 330, 314);
  label(g, 'Tray bubbles (real size), the collect line', 485, 404);
  const trays: [number, boolean][] = [[30, false], [80, false], [120, false], [150, true], [240, true]];
  trays.forEach(([k, full], i) => {
    drawTrayBubble(g, 380 + (i % 3) * 110, 490 + Math.floor(i / 3) * 80, 'naira', trayWords(k), full, i === 0 ? Math.abs(Math.sin(time * Math.PI)) * 2 : 0);
  });
  drawTrayBubble(g, 600, 570, 'power', '3', false);
  drawCollectLine(g, 485, 660, '+₦1.20 from Mama Put', (time / PAY.collectLine) % 1);
  drawCollectLine(g, 485, 700, '+₦2.40 from the market', 0.3, true);

  // Edge arrows round a small phone screen (320 x 240 scaled to 0.9)
  ground(g, 660, 400, 290, 314);
  label(g, 'Edge arrows on a 290 x 290 view (pins, boards, trays off screen)', 805, 404, 9);
  const vx = 660;
  const vy = 420;
  const vw = 290;
  const vh = 290;
  const targets: [number, number, Parameters<typeof drawEdgeArrow>[4]][] = [
    [-200, 60, 'potholes'],
    [500, 120, 'slowInternet'],
    [150, 700, 'lightsOut'],
    [-50, -80, 'naira'],
    [400, 400, 'power'],
  ];
  for (const [tx, ty, icon] of targets) {
    const at = edgeArrowPlace(tx, ty, vw, vh, 0);
    if (at) drawEdgeArrow(g, vx + at.x, vy + at.y, at.angle, icon);
  }
};

const LOOKS: SpotLooks = { potholes: 'fixed', lightsOut: 'problem', slowInternet: 'problem' };

const placesPage: Page = (g, time) => {
  title(g, 'c1: the Mama Put and the Market (x2): going up, serving, full, still; the danfo trip; all live in Lagos (right)');
  // Mama Put going up
  ground(g, 10, 24, 460, 130);
  label(g, 'Mama Put going up: build 0.2, 0.5, 0.8, 1', 240, 28);
  [0.2, 0.5, 0.8, 1].forEach((k, i) => {
    g.save();
    g.translate(70 + i * 112, 140);
    g.scale(1.3, 1.3);
    drawMamaPut(g, 0, 0, { build: k, queue: 0, still: true });
    g.restore();
  });
  // Serving, full, still
  ground(g, 10, 160, 460, 250);
  label(g, 'Serving (live, one plate every 6 s sped up 3x); tray full (cook rests, queue chats)', 240, 164, 9);
  const plate = ((time * 3) / MAMA_PUT.plateTime) % 1;
  const served = Math.floor((time * 3) / MAMA_PUT.plateTime);
  g.save();
  g.translate(84, 270);
  g.scale(1.8, 1.8);
  drawMamaPut(g, 0, 0, { time, plate, served, queue: 4 });
  g.restore();
  g.save();
  g.translate(370, 270);
  g.scale(2, 2);
  drawMamaPut(g, 0, 0, { time, served: 3, queue: 3, full: true });
  g.restore();
  g.save();
  g.translate(90, 390);
  g.scale(1.4, 1.4);
  drawMamaPut(g, 0, 0, { time, served: 5, queue: 2, still: true });
  g.restore();
  label(g, 'reduced motion', 90, 396, 9);
  g.save();
  g.translate(320, 390);
  g.scale(1.4, 1.4);
  drawMamaPut(g, 0, 0, { time, served: 1, queue: 1, plate: 0.5 });
  g.restore();
  label(g, 'queue of 1, plate walking off', 320, 396, 9);

  // Market: empty, filling, full, going up
  ground(g, 10, 416, 460, 298);
  label(g, 'Market: going up (0.6), empty, half, full; danfo trip (live, sped up 3x)', 240, 420, 9);
  g.save();
  g.translate(120, 500);
  g.scale(1.3, 1.3);
  drawMarketPlace(g, 0, 0, { build: 0.6 });
  g.restore();
  g.save();
  g.translate(340, 500);
  g.scale(1.3, 1.3);
  drawMarketPlace(g, 0, 0, { stock: 0 });
  g.restore();
  g.save();
  g.translate(120, 590);
  g.scale(1.3, 1.3);
  drawMarketPlace(g, 0, 0, { stock: 0.5 });
  g.restore();
  g.save();
  g.translate(340, 580);
  g.scale(1.3, 1.3);
  drawMarketPlace(g, 0, 0, { stock: 1 });
  drawMarketDanfo(g, 20, 18, 1, true);
  g.restore();
  label(g, 'full: piled high, danfo waits door open', 340, 616, 9);
  const trip = danfoTrip(((time * 3) / MARKET_PLACE.danfoTime) % 1);
  g.save();
  g.beginPath();
  g.rect(12, 630, 456, 82);
  g.clip();
  g.translate(240, 660);
  g.scale(1.1, 1.1);
  drawMarketPlace(g, 0, 0, { stock: trip.stock });
  if (trip.carry >= 0) drawPorter(g, -20, 4, 8, 16, trip.carry);
  if (trip.visible) drawMarketDanfo(g, 20 + trip.dx, 26, trip.load, trip.door);
  g.restore();

  // All of it live in the city: a corner of Lagos at map scale x0.9
  const s = 0.9;
  const ox = 480;
  const oy = 24;
  const w = 470;
  const h = 690;
  const camX = 850;
  const camY = 420;
  g.save();
  g.beginPath();
  g.rect(ox, oy, w, h);
  g.clip();
  g.translate(ox, oy);
  g.scale(s, s);
  g.translate(-camX, -camY);
  drawCity(g, LOOKS);
  drawMamaPut(g, 905, 760, { time, plate: (time / MAMA_PUT.plateTime) % 1, served: Math.floor(time / MAMA_PUT.plateTime), queue: 3 });
  drawBuildOutline(g, 'market', 1320, 800, 0);
  drawPayMat(g, 1320, 818);
  // The hero walking a loop in front of the bus park
  const a = (time * 240) / 300;
  const hx = 900 + Math.cos(a) * 60;
  const hy = 700 + Math.sin(a) * 30;
  const dir: WalkDir = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)) * 0.8 ? (Math.sin(a) > 0 ? 'w' : 'e') : Math.cos(a) > 0 ? 's' : 'n';
  drawCityHero(g, { skin: 3, hair: 3, outfit: 1, body: 1, age: 1 }, hx, hy, { dir, phase: (time * 240) / WALKER.cycle });
  g.restore();
  g.strokeStyle = INK;
  g.strokeRect(ox, oy, w, h);
  // Screen-space signs over it
  const toScreen = (mx: number, my: number): [number, number] => [ox + (mx - camX) * s, oy + (my - camY) * s];
  const [bx, by] = toScreen(1320, 818);
  drawPriceBoard(g, bx - 66, by + 10, 'market', 8);
  const [tx, ty] = toScreen(905, 700);
  drawTrayBubble(g, tx, ty, 'naira', trayWords(120), false);
  const out = edgeArrowPlace(toScreen(101, 430)[0] - ox, toScreen(101, 430)[1] - oy, w, h, 0);
  if (out) drawEdgeArrow(g, ox + out.x, oy + out.y, out.angle, 'potholes');
  label(g, `map ${CITY_MAP.w} x ${CITY_MAP.h}; camera at ${camX}, ${camY}`, ox + w / 2, oy + h - 14, 9);
};

export const WALK_PAGES: Page[] = [heroPage, payPage, placesPage];
