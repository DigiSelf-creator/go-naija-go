/**
 * The challenge road's pictures for qa (debug only; docs/design.md S3e0 part 10, art S3e1a):
 * ?gallery=road   the whole road twice: a new save (Alausa Next, the ferry "Coming soon") and
 *                 everything done (the ferry built), then every plate state, in colour and grey;
 * ?gallery=road2  the road as it shows at 320 x 240 and 568 x 320 (scale 1, scrolling);
 * ?gallery=road3  the road at 851 x 393 (scale 1.2) and 1920 x 1080 (scale 2), whole;
 * ?gallery=road4  the stop card pictures, tired and bright, at the three card sizes, with
 *                 different heroes; the fallback; the icons;
 * ?gallery=road5, road6, road7  each street's first screen, tired (top) and bright (bottom):
 *                 Alausa, Computer Village, Ikeja;
 * ?gallery=road8  all three first screens at 320 x 240, tired and bright.
 * Same fixed 960 x 720 layout as the other pages; &t=1.5 holds the time.
 */
import { drawBackdrop } from './backdrop';
import { CITY_AREAS, START_LOOKS, makeCityCanvas, type SpotLooks } from './city';
import { FIRST_SCREEN, FIRST_STREETS, drawFirstGround, type FirstLook, type FirstStreet } from './firstLook';
import { drawHero, type HeroLook } from './hero';
import { INK } from './palette';
import {
  CARD_CUTS,
  ROAD,
  ROAD_ICONS,
  ROAD_STOPS,
  STOP_BOX,
  drawCardCut,
  drawCardFallback,
  drawCardOverlay,
  drawRoadIcon,
  drawRoadPicture,
  drawStopPlate,
  type JettyLook,
  type PlateState,
  type PlateWords,
  type StopId,
} from './road';
import { drawRoad } from './street';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11, align: CanvasTextAlign = 'left'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
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

const NAMES: Record<StopId, string> = { alausa: 'Alausa', lane: 'Lane run', computerVillage: 'Computer Village', ikeja: 'Ikeja', hall: 'Go-Slow Hall', ferry: 'Ferry' };

type RoadState = Record<StopId, { state: PlateState; status: string; line3?: string; parcel?: boolean }>;

const NEW_SAVE: RoadState = {
  alausa: { state: 'next', status: 'Ready to play' },
  lane: { state: 'open', status: 'Ready to play' },
  computerVillage: { state: 'locked', status: 'Locked' },
  ikeja: { state: 'locked', status: 'Locked' },
  hall: { state: 'locked', status: 'Locked' },
  ferry: { state: 'soon', status: 'Coming soon', line3: 'Fixes to go: 5' },
};
const MIDWAY: RoadState = {
  alausa: { state: 'done', status: 'Done ✓', line3: 'Best: ₦8.70' },
  lane: { state: 'done', status: 'Done ✓', line3: 'Best: 1,240 m' },
  computerVillage: { state: 'next', status: 'Ready to play' },
  ikeja: { state: 'locked', status: 'Locked' },
  hall: { state: 'locked', status: 'Locked', parcel: true },
  ferry: { state: 'soon', status: 'Coming soon', line3: 'Fixes to go: 3' },
};
const ALL_DONE: RoadState = {
  alausa: { state: 'done', status: 'Done ✓', line3: 'Best: ₦8.70' },
  lane: { state: 'done', status: 'Done ✓', line3: 'Best: 840 m' },
  computerVillage: { state: 'done', status: 'Done ✓', line3: 'Best: ₦11.20' },
  ikeja: { state: 'done', status: 'Done ✓', line3: 'Best: ₦9.05' },
  hall: { state: 'done', status: 'Done ✓', parcel: true },
  ferry: { state: 'built', status: 'Built ✓', line3: 'More soon' },
};

function nextOf(st: RoadState): StopId | null {
  return ROAD_STOPS.find((s) => st[s].state === 'next') ?? null;
}

/** The road and its plates at road scale s, top left at (x, y). */
function road(g: CanvasRenderingContext2D, x: number, y: number, s: number, st: RoadState, jetty: JettyLook, time: number): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawRoadPicture(g, { jetty, next: nextOf(st) });
  const bob = time % 1 < 0.5 ? 0 : 2;
  for (const id of ROAD_STOPS) {
    const p = st[id];
    const words: PlateWords = { name: NAMES[id], status: p.status, line3: p.line3, parcel: p.parcel };
    drawStopPlate(g, STOP_BOX[id], p.state, words, bob, id === 'ferry');
  }
  g.restore();
}

/** A phone screen frame: the top row (Home, heading, Sound) and the road at scale s, scrolled by `scroll` px. */
function phone(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: number, scroll: number, st: RoadState, jetty: JettyLook, time: number): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = '#fbe6b4';
  g.fillRect(x, y, w, h);
  const top = h >= 360 ? 48 : 44;
  g.fillStyle = 'rgba(29,26,20,0.08)';
  g.fillRect(x, y, w, top);
  drawRoadIcon(g, 'house', x + 12, y + 14, 16);
  label(g, 'Home', x + 32, y + 15, 12);
  g.font = `bold ${w <= 400 ? 15 : 17}px sans-serif`;
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.fillText('Challenge road', x + w / 2, y + 14);
  if (w <= 360) drawRoadIcon(g, 'soundOn', x + w - 30, y + 14, 16);
  else label(g, 'Sound: on', x + w - 12, y + 15, 12, 'right');
  const openH = h - top - 16;
  const ry = y + top + 8 + Math.max(0, (openH - ROAD.h * s) / 2);
  const roadW = ROAD.w * s;
  const rx = roadW <= w - 16 ? x + (w - roadW) / 2 : x + 8 - scroll;
  road(g, rx, ry, s, st, jetty, time);
  // The edge arrows, where there is more road that way
  const more = roadW > w - 16;
  const ay = ry + (ROAD.h * s) / 2 - 22;
  for (const [show, ax, dir] of [[more && scroll > 0, x + 4, 'left'], [more && rx + roadW > x + w, x + w - 48, 'right']] as const) {
    if (!show) continue;
    g.fillStyle = 'rgba(29,26,20,0.85)';
    g.beginPath();
    g.arc(ax + 22, ay + 22, 20, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 2;
    g.stroke();
    drawRoadIcon(g, dir, ax + 11, ay + 11, 22, '#fffaf0');
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

const plates: Page = (g, time) => {
  title(g, 'S3e1a challenge road: a new save (top), midway with a parcel (middle), everything done (bottom)');
  const s = 1.36;
  road(g, 10, 26, s, NEW_SAVE, 'before', time);
  road(g, 10, 258, s, MIDWAY, 'before', time);
  road(g, 10, 486, s, ALL_DONE, 'after', time);
  label(g, 'Plates read by icon and word, never colour alone. Next: pennant + bus; Done: tick badge + tick; Locked: padlock; Ferry: ferry icon.', 12, 712, 10);
};

const phones: Page = (g, time) => {
  title(g, 'S3e1a the road at 320 x 240 (left, scrolled to the start, then to Computer Village) and 568 x 320 (right)');
  phone(g, 12, 34, 320, 240, 1, 0, NEW_SAVE, 'before', time);
  phone(g, 12, 300, 320, 240, 1, 96, MIDWAY, 'before', time);
  phone(g, 360, 34, 568, 320, 1, 0, NEW_SAVE, 'before', time);
  phone(g, 360, 380, 568, 320, 1, 144, ALL_DONE, 'after', time);
  label(g, '320 x 240: Alausa, the Lane run and Computer Village whole; the arrow shows more road.', 12, 552, 10);
  label(g, '568 x 320: every stop to the hall whole; the ferry off the right.', 12, 568, 10);
};

const wide: Page = (g, time) => {
  title(g, 'S3e1a the road at 851 x 393 (scale 1.2, whole; top) and 1920 x 1080 (scale 2; bottom, shown at 0.48)');
  phone(g, 12, 30, 851, 393, 1.2, 0, MIDWAY, 'before', time);
  g.save();
  g.translate(12, 436);
  g.scale(0.48, 0.48);
  phone(g, 0, 0, 1920, 560, 2, 0, ALL_DONE, 'after', time);
  g.restore();
  label(g, '(1920 x 1080 cropped to the road band: the road is 1360 x 336, centred both ways.)', 12, 712 - 16, 10);
};

const HEROES: readonly HeroLook[] = [
  { skin: 4, hair: 3, outfit: 1, body: 1, age: 1 },
  { skin: 0, hair: 0, outfit: 0, body: 0, age: 0 },
  { skin: 2, hair: 1, outfit: 2, body: 1, age: 0 },
  { skin: 3, hair: 4, outfit: 4, body: 1, age: 2 },
  { skin: 1, hair: 2, outfit: 3, body: 0, age: 1 },
];

let cities: { tired: HTMLCanvasElement | null; bright: HTMLCanvasElement | null; noJetty: HTMLCanvasElement | null } | null = null;
const CITY_SCALE = 1;

function cityPictures(): NonNullable<typeof cities> {
  if (cities) return cities;
  const fixed: SpotLooks = { potholes: 'fixed', lightsOut: 'fixed', slowInternet: 'fixed' };
  cities = {
    tired: makeCityCanvas(START_LOOKS, CITY_SCALE, 2048, { bright: [], jetty: false }),
    bright: makeCityCanvas(fixed, CITY_SCALE, 2048, { bright: CITY_AREAS, boom: true, jetty: true }),
    noJetty: makeCityCanvas(START_LOOKS, CITY_SCALE, 2048, { bright: [], jetty: false }),
  };
  return cities;
}

function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cut: keyof typeof CARD_CUTS | null, look: 'tired' | 'bright', name: string, hero: HeroLook, time: number, bus = true): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.roundRect(0, 0, w, h, 4);
  g.clip();
  const c = cityPictures();
  const pic = look === 'tired' ? c.tired : c.bright;
  if (cut && pic) drawCardCut(g, pic, CITY_SCALE, CARD_CUTS[cut], w, h);
  else drawCardFallback(g, w, h);
  drawCardOverlay(g, w, h, { name, hero, time, bus });
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

const cards: Page = (g, time) => {
  title(g, 'S3e1a the stop card pictures: tired (left of each pair) and bright, with the sign, the danfo and your hero');
  // Alausa at the three card sizes
  card(g, 12, 34, 112, 84, 'alausa', 'tired', 'Alausa', HEROES[0]!, time);
  card(g, 132, 34, 112, 84, 'alausa', 'bright', 'Alausa', HEROES[0]!, time);
  card(g, 256, 34, 160, 120, 'alausa', 'tired', 'Alausa', HEROES[1]!, time);
  card(g, 424, 34, 160, 120, 'alausa', 'bright', 'Alausa', HEROES[1]!, time);
  card(g, 596, 34, 240, 180, 'alausa', 'bright', 'Alausa', HEROES[2]!, time);
  label(g, '112 x 84 (320 x 240)', 12, 122, 10);
  label(g, '160 x 120 (from 568 x 320)', 256, 158, 10);
  label(g, '240 x 180 (1920 x 1080)', 596, 218, 10);
  // Every stop at 160 x 120
  const row = 244;
  card(g, 12, row, 160, 120, 'computerVillage', 'tired', 'Computer Village', HEROES[3]!, time);
  card(g, 180, row, 160, 120, 'computerVillage', 'bright', 'Computer Village', HEROES[3]!, time);
  card(g, 356, row, 160, 120, 'ikeja', 'tired', 'Ikeja', HEROES[4]!, time);
  card(g, 524, row, 160, 120, 'ikeja', 'bright', 'Ikeja', HEROES[4]!, time);
  label(g, 'Computer Village (r1c3), Ikeja (r2c1); the Lane run uses these cuts', 12, row + 124, 10);
  const row2 = 392;
  card(g, 12, row2, 160, 120, 'ferry', 'tired', 'Ferry', HEROES[1]!, time, false);
  card(g, 180, row2, 160, 120, 'ferry', 'bright', 'Ferry', HEROES[1]!, time, false);
  card(g, 356, row2, 160, 120, null, 'tired', 'Ikeja', HEROES[2]!, time);
  card(g, 524, row2, 112, 84, null, 'tired', 'Computer Village', HEROES[0]!, time);
  label(g, 'Ferry before / after the boom (sign only)   fallback: sand box, swap the cut in when ready', 12, row2 + 124, 10);
  // Every hero body, skin, hair and outfit stepping in (112 wide)
  const row3 = 548;
  for (let i = 0; i < 7; i++) {
    const look: HeroLook = { skin: i % 5, hair: (i * 2) % 5, outfit: (i * 3) % 5, body: i % 2, age: i % 3 };
    card(g, 12 + i * 120, row3, 112, 84, i % 2 ? 'ikeja' : 'alausa', i % 3 ? 'bright' : 'tired', i % 2 ? 'Ikeja' : 'Alausa', look, time);
  }
  // The icons, 16 px and 32 px
  ROAD_ICONS.forEach((icon, i) => {
    drawRoadIcon(g, icon, 700 + (i % 5) * 50, 384 + Math.floor(i / 5) * 40, 32);
    drawRoadIcon(g, icon, 712 + (i % 5) * 50, 470 + Math.floor(i / 5) * 24, 16);
  });
  label(g, 'icons: padlock, bus, tick, ferry, parcel / house, sound on, sound off, left, right', 700, 520, 9);
};

const PANEL_W = 909;

/** One first screen at world width ww (420 tall), drawn at scale k with its top left at (x, y). */
function firstScreen(g: CanvasRenderingContext2D, x: number, y: number, k: number, ww: number, street: FirstStreet, look: FirstLook, time: number, hero: HeroLook): void {
  const fs = FIRST_SCREEN[street];
  const H = 420;
  const gy = 300;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.beginPath();
  g.rect(0, 0, ww, H);
  g.clip();
  const first = { street, look };
  // Where the game's camera starts (camera.ts heroScreenX): the hero a fifth to 30% in from the left
  const heroX = street === 'ikeja' ? 420 : 80;
  const camX = heroX - ww * Math.min(0.3, Math.max(0.12, (ww - 448) / ww));
  drawBackdrop(g, fs.theme, camX, ww, time, H, gy, false, first);
  g.translate(-camX, 0);
  drawRoad(g, camX, ww, [[-400, 2400]], gy, H, false);
  drawFirstGround(g, first, camX, ww, gy, H);
  g.save();
  g.translate(heroX, gy);
  drawHero(g, hero, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  g.restore();
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x - 0.5, y - 0.5, ww * k + 1, H * k + 1);
}

function streetPage(street: FirstStreet): Page {
  return (g, time) => {
    const fs = FIRST_SCREEN[street];
    title(g, `S3e1a W17 C, ${fs.name}: the first screen tired (top) and bright (bottom); stretch ${fs.from} to ${fs.to}, sign at ${fs.sign}`);
    // 851 x 393: 909 world units across
    const k = 0.82;
    firstScreen(g, 10, 30, k, PANEL_W, street, 'tired', time, HEROES[1]!);
    firstScreen(g, 10, 30 + 420 * k + 16, k, PANEL_W, street, 'bright', time, HEROES[1]!);
    label(g, 'as at 851 x 393', 10 + PANEL_W * k + 8, 34, 10);
  };
}

const small: Page = (g, time) => {
  title(g, 'S3e1a W17 C at 320 x 240 (560 world units across): tired (top) and bright (bottom); the sign reads');
  FIRST_STREETS.forEach((street, i) => {
    firstScreen(g, 8 + i * 316, 40, 0.55, 560, street, 'tired', time, HEROES[i]!);
    firstScreen(g, 8 + i * 316, 290, 0.55, 560, street, 'bright', time, HEROES[i]!);
  });
};

/** Pages for ?gallery=road (index 0), road2 (1), ... road8 (7). */
export const ROAD_PAGES: readonly Page[] = [plates, phones, wide, cards, streetPage('alausa'), streetPage('computerVillage'), streetPage('ikeja'), small];

/** Fills viewW x viewH with page `page` of the road gallery (960 x 720 layout, fitted). */
export function drawRoadGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, page: number): void {
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 720);
  g.scale(s, s);
  (ROAD_PAGES[page] ?? ROAD_PAGES[0]!)(g, time);
  g.restore();
}
