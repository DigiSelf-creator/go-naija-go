/**
 * Ogun's city, challenge road and Expressway pieces for qa and Tp (debug only; art O6a,
 * docs/ogun.md part 6 and part 7):
 * ?gallery=ogun-city    the city map tired with every problem (pins), and bright with every fix,
 *                       the boom and the three tax places at work.
 * ?gallery=ogun-city2   close-ups (ready looks, interchange, water point, gateway, estate, top
 *                       edge, border road), the tax places at 2x (building, stocking, full), the
 *                       trucks, and the pins at screen size.
 * ?gallery=ogun-city3   Ogun's challenge road picture (start and after the hall) and the stop
 *                       cards' pictures.
 * ?gallery=ogun-city4   the Expressway lane run: a live frame, the vehicles (tipper, tanker,
 *                       danfo), the scenery, the house fronts, the pickups and the bus stop goal.
 * &t=1.5 holds the time; &still=1 draws the reduced-motion look.
 * The art is in the lazy Ogun part, so it is fetched here with import(), never bundled in.
 */
import { INK } from './palette';

type City = typeof import('../worlds/ogun/city');
type Places = typeof import('../worlds/ogun/places');
type Road = typeof import('../worlds/ogun/road');
type Xw = typeof import('../worlds/ogun/expressway');
let city: City | null = null;
let places: Places | null = null;
let road: Road | null = null;
let xw: Xw | null = null;
let asked = false;
const pics = new Map<string, HTMLCanvasElement | null>();

type G = CanvasRenderingContext2D;

function label(g: G, text: string, x: number, y: number, size = 10, align: CanvasTextAlign = 'left'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function frame(g: G, x: number, y: number, w: number, h: number, fill = '#fffaf0'): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

function pic(key: string, make: () => HTMLCanvasElement | null): HTMLCanvasElement | null {
  if (!pics.has(key)) pics.set(key, make());
  return pics.get(key) ?? null;
}

const FIXED = { potholes: 'fixed', dryTaps: 'fixed', lightsOut: 'fixed', slowInternet: 'fixed', badRoad: 'fixed' } as const;
const tiredPic = (): HTMLCanvasElement | null => pic('tired', () => city!.makeOgunCityCanvas(city!.OGUN_START_LOOKS, 0.5, 2048, { bright: [] }));
const brightPic = (): HTMLCanvasElement | null => pic('bright', () => city!.makeOgunCityCanvas(FIXED, 0.5, 2048, { boom: true, built: ['adire', 'mill', 'kola'] }));

function cityPage(g: G, w: number, h: number, time: number, still: boolean): void {
  const C = city!;
  const P = places!;
  const tired = tiredPic();
  const bright = brightPic();
  const mw = Math.min((h - 30) * 1.6, (w - 36) / 2);
  const mh = mw * 0.625;
  label(g, 'Ogun from above: tired, every problem (pins on top)', 12, 6);
  if (tired) g.drawImage(tired, 12, 20, mw, mh);
  const k = mw / 1600;
  for (const id of C.OGUN_SPOT_IDS) {
    const p = C.OGUN_SPOTS[id].pin;
    g.save();
    g.translate(12 + p.x * k, 20 + p.y * k);
    g.scale(0.6, 0.6);
    C.drawOgunPin(g, 0, 0, id, 'problem', 0);
    g.restore();
  }
  label(g, 'Bright: every fix, the boom, the three tax places built (moving)', 24 + mw, 6);
  if (bright) g.drawImage(bright, 24 + mw, 20, mw, mh);
  g.save();
  g.translate(24 + mw, 20);
  g.scale(k, k);
  const sale = still ? 0.3 : (time / 8) % 1;
  P.drawAdireMarket(g, C.OGUN_PLACES.adire.x, C.OGUN_PLACES.adire.y, { time, sale, stock: 0.7, still });
  P.drawGarriMill(g, C.OGUN_PLACES.mill.x, C.OGUN_PLACES.mill.y, { time, stock: 0.6, still });
  P.drawKolaMarket(g, C.OGUN_PLACES.kola.x, C.OGUN_PLACES.kola.y, { time, sale: (time / 12) % 1, stock: 0.8, still });
  g.restore();
}

function closePage(g: G, w: number, time: number, still: boolean): void {
  const C = city!;
  const P = places!;
  const tired = tiredPic();
  const bright = brightPic();
  const ready = pic('ready', () => C.makeOgunCityCanvas({ potholes: 'ready', dryTaps: 'ready', lightsOut: 'ready', slowInternet: 'ready', badRoad: 'ready' }, 0.5, 2048, { bright: ['r0c0', 'r0c1', 'motorPark', 'verge'] }));
  const cut = (src: HTMLCanvasElement | null, mx: number, my: number, mw: number, mh: number, x: number, y: number, s: number): void => {
    if (src) g.drawImage(src, mx * 0.5, my * 0.5, mw * 0.5, mh * 0.5, x, y, mw * s, mh * s);
  };
  label(g, 'Ready looks (tools wait), half bright', 12, 4);
  if (ready) g.drawImage(ready, 12, 18, 288, 180);
  label(g, 'Interchange, motor park, water point: problem / fixed', 312, 4);
  cut(tired, 720, 440, 420, 360, 312, 18, 0.5);
  cut(bright, 720, 440, 420, 360, 528, 18, 0.5);
  label(g, 'Gateway: bad road / fixed', 744, 4);
  cut(tired, 10, 834, 190, 166, 744, 18, 0.6);
  cut(bright, 10, 834, 190, 166, 744, 122, 0.6);
  label(g, 'Estate: slow / fixed', 866, 4);
  cut(tired, 132, 318, 338, 204, 866, 18, 0.48);
  cut(bright, 132, 318, 338, 204, 866, 122, 0.48);
  label(g, 'Rocks, quarry, river and bridge, Abeokuta yards', 1036, 4);
  cut(bright, 0, 0, 1600, 300, 1036, 18, 0.1);
  cut(bright, 1100, 0, 500, 300, 1036, 60, 0.32);
  cut(tired, 1260, 820, 340, 180, 1036, 160, 0.32);
  // The places at 2x: going up, stocking, full; trucks; a plot
  const y3 = 214;
  label(g, 'Tax places at 1.4x: going up (0.55), stocking (moving), garri mill, kola market, full (still); trucks; an empty plot', 12, y3);
  g.save();
  g.translate(12, y3 + 14);
  g.scale(1.4, 1.4);
  const sale = still ? 0.3 : (time / 8) % 1;
  P.drawAdireMarket(g, 66, 62, { build: 0.55 });
  P.drawAdireMarket(g, 200, 62, { time, sale, stock: 0.4, still, served: 2 });
  P.drawGarriMill(g, 350, 66, { time, stock: 0.5, still });
  P.drawKolaMarket(g, 505, 62, { time, sale: (time / 12) % 1, stock: 0.6, still });
  P.drawKolaMarket(g, 640, 62, { full: true, stock: 1, still: true });
  C.drawOgunTruck(g, 40, 112, 'e', 'tipper');
  C.drawOgunTruck(g, 110, 112, 'w', 'tanker');
  C.drawOgunTruck(g, 180, 112, 'e', 'lorry', false, 0.5);
  C.drawOgunTruck(g, 236, 108, 's', 'lorry', true, 1);
  P.drawPlacePlot(g, 320, 128, 70);
  g.restore();
  // Pins at screen size
  const px = 930;
  C.OGUN_SPOT_IDS.forEach((id, i) => {
    C.drawOgunPin(g, px + 40 + i * 86, 330, id, 'problem', still ? 0 : Math.abs(Math.sin(time * 2)) * 2);
    C.drawOgunPin(g, px + 40 + i * 86, 410, id, 'ready', 0);
  });
  frame(g, px + 330, 230, 40, 40, '#ffffff');
  C.drawBorderIcon(g, px + 350, 250);
  label(g, 'border', px + 330, 274, 9);
  void w;
}

function roadPage(g: G, w: number, time: number, still: boolean): void {
  const R = road!;
  const s = Math.min(0.8, (w - 24) / R.OGUN_ROAD.w);
  label(g, 'Ogun challenge road: start (only Ota open), plates on top', 12, 6);
  const draw = (y: number, after: boolean, next: Parameters<typeof R.drawOgunRoadPicture>[1]['next']): void => {
    g.save();
    g.translate(12, y);
    g.scale(s, s);
    R.drawOgunRoadPicture(g, { lit: after, next });
    for (const id of R.OGUN_ROAD_STOPS) {
      const state = id === 'wayOn' || id === 'border' ? 'soon' : id === 'toLagos' ? 'open' : after ? 'done' : id === 'ota' ? 'next' : id === 'expressway' ? 'open' : 'locked';
      R.drawOgunStopPlate(g, id, state, still ? 0 : Math.abs(Math.sin(time * 3)) * 2);
    }
    g.restore();
  };
  draw(20, false, 'ota');
  label(g, 'After Pothole Hall: lit arch, every stop done', 12, 22 + R.OGUN_ROAD.h * s);
  draw(36 + R.OGUN_ROAD.h * s, true, null);
  const y = 40 + 2 * R.OGUN_ROAD.h * s;
  label(g, 'Stop card pictures (112 x 84 and 160 x 120): drawn ones, then cuts from the city map', 12, y);
  const tired = tiredPic();
  const bright = brightPic();
  let x = 12;
  for (const id of ['toLagos', 'wayOn', 'border'] as const) {
    g.save();
    g.translate(x, y + 14);
    R.drawOgunCardPicture(g, id, 112, 84, time, still);
    g.restore();
    frame(g, x, y + 14, 0, 0);
    label(g, id, x, y + 100, 9);
    x += 118;
  }
  for (const id of Object.keys(R.OGUN_CARD_CUTS) as (keyof typeof R.OGUN_CARD_CUTS)[]) {
    for (const [pic2, name] of [[id === 'border' ? tired : bright, id === 'border' ? 'tired' : 'bright']] as const) {
      if (!pic2) continue;
      g.save();
      g.translate(x, y + 14);
      R.drawOgunCardCut(g, pic2, 0.5, R.OGUN_CARD_CUTS[id], 112, 84);
      g.restore();
      label(g, `${id} ${name}`, x, y + 100, 9);
      x += 118;
      if (x > w - 120) {
        x = 12;
      }
    }
  }
}

function lanePage(g: G, time: number, still: boolean): void {
  const X = xw!;
  const vw = 300;
  const vh = 225;
  label(g, 'The Expressway, live (sky, road, lamps, scenery, fronts, things)', 12, 6);
  g.save();
  g.translate(12, 20);
  g.beginPath();
  g.rect(0, 0, vw, vh);
  g.clip();
  X.drawExpresswayDemo(g, vw, vh, still ? 30 : 30 + time * 9, time, still);
  g.restore();
  const x0 = vw + 30;
  label(g, 'Big vehicles (the danfo kind): tipper, tanker, danfo; hazards off and on', x0, 6);
  X.EXPRESSWAY_VEHICLES.forEach((v, i) => {
    for (const f of [0, 1]) {
      g.save();
      g.translate(x0 + 30 + (i * 2 + f) * 58, 88);
      g.scale(0.75, 0.75);
      X.drawExpresswayVehicle(g, v, f === 1);
      g.restore();
    }
  });
  label(g, 'Ogun pickups (garri, corn) at 2x', x0 + 380, 6);
  (['garri', 'corn'] as const).forEach((k, i) => {
    g.save();
    g.translate(x0 + 410 + i * 60, 50);
    g.scale(2, 2);
    X.drawExpresswayPickup(g, k);
    g.restore();
  });
  label(g, 'Scenery on the verges (flat cloth shades, never umbrellas)', x0, 100);
  X.EXPRESSWAY_SCENERY.forEach((k, i) => {
    g.save();
    g.translate(x0 + 40 + i * 80, 190);
    g.scale(0.62, 0.62);
    X.drawExpresswayScenery(g, k, still ? 0 : time);
    g.restore();
  });
  label(g, 'House fronts (empty, lean, wave, lantern glow); the bus stop goal under a small arch, dim and reached', x0, 204);
  (['empty', 'lean', 'wave0', 'glow'] as const).forEach((wnd, i) => {
    g.save();
    g.translate(x0 + 46 + i * 92, 330);
    g.scale(0.7, 0.7);
    X.drawExpresswayFront(g, { wall: i, windows: [wnd, i % 2 ? 'empty' : 'wave1'], door: wnd === 'glow' ? 'shut' : 'open' });
    g.restore();
  });
  for (const [i, bright] of [[0, false], [1, true]] as const) {
    g.save();
    g.translate(x0 + 460 + i * 180, 330);
    g.scale(0.7, 0.7);
    X.drawExpresswayBusStop(g, still ? 0 : time, bright);
    g.restore();
  }
}

/** Draws page `page` (0 city, 1 road, 2 Expressway). */
export function drawOgunCityGallery(g: G, viewW: number, viewH: number, time: number, page: number, still = false): void {
  if (!asked) {
    asked = true;
    void Promise.all([import('../worlds/ogun/city'), import('../worlds/ogun/places'), import('../worlds/ogun/road'), import('../worlds/ogun/expressway')]).then(([a, b, c, d]) => {
      city = a;
      places = b;
      road = c;
      xw = d;
    });
  }
  g.fillStyle = '#f3ecdc';
  g.fillRect(0, 0, viewW, viewH);
  if (!city || !places || !road || !xw) {
    label(g, 'Loading the Ogun part...', 12, 12, 14);
    return;
  }
  if (page === 1) closePage(g, viewW, time, still);
  else if (page === 2) roadPage(g, viewW, time, still);
  else if (page === 3) lanePage(g, time, still);
  else cityPage(g, viewW, viewH, time, still);
}
