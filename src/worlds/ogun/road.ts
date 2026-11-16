/**
 * Ogun's challenge road (art O6a; docs/ogun.md 6.5, design.md S3e0): the same screen and rules
 * as Lagos's road (src/art/road.ts), with Ogun's own picture. The road starts at the back of the
 * gateway arch on the left (the "To Lagos" stop), runs past red-brown earth, palms, our own
 * granite rocks, Ota's factory sheds, Abeokuta's adire yards, Sagamu's flyover and Pothole Hall,
 * and goes on north past the works at the right end ("The way on", coming soon). Two side roads
 * climb to the Expressway stop (a tipper and a tanker queued) and to the border market (flat
 * cloth shades and sacks; no post, gate, fence or officer, OG-R7). No writing but the plates
 * (HTML buttons, drawn by gamedev) and the card's sign; no real building, brand or crest.
 *
 * Road units: OGUN_ROAD.w x OGUN_ROAD.h (816 x 168), six plates across (the road scrolls). Paint
 * it once (drawOgunRoadPicture) and again only when the Next stop or `lit` changes. The stop
 * plates sit at OGUN_STOP_BOX. Lives in the lazy Ogun part.
 */
import { PLATE, drawDanfoSide, drawStopPlate, roadBend, type PlateState, type RoadBox } from '../../art/road';
import { drawMiniArch } from '../../art/gatewayRoad';
import { drawGateArch } from '../../art/ogunGate';
import { INK, WHITE } from '../../art/palette';
import { OG, drawAdireCloth, drawOgunTruck } from './city';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

export const OGUN_ROAD = { w: 816, h: 168 } as const;

export type OgunStopId = 'toLagos' | 'ota' | 'expressway' | 'abeokuta' | 'sagamu' | 'hall' | 'border' | 'wayOn';
/** The list order (start, then the road, then the two "Coming soon" ends). */
export const OGUN_ROAD_STOPS: readonly OgunStopId[] = ['toLagos', 'ota', 'expressway', 'abeokuta', 'sagamu', 'hall', 'wayOn', 'border'];

/** Plate boxes (road units), as Lagos's: 112 x 64, main stops on y 92, side stops on y 4. */
export const OGUN_STOP_BOX: Readonly<Record<OgunStopId, RoadBox>> = {
  toLagos: { x: 8, y: 92, w: 112, h: 64 },
  expressway: { x: 76, y: 4, w: 112, h: 64 },
  ota: { x: 144, y: 92, w: 112, h: 64 },
  abeokuta: { x: 280, y: 92, w: 112, h: 64 },
  sagamu: { x: 416, y: 92, w: 112, h: 64 },
  hall: { x: 552, y: 92, w: 112, h: 64 },
  border: { x: 620, y: 4, w: 112, h: 64 },
  wayOn: { x: 688, y: 92, w: 112, h: 64 },
};
/** Where the two side roads leave the main road. */
export const OGUN_SIDE_X = { expressway: 132, border: 676 } as const;
/** The main stops with a shelter behind the plate. */
export const OGUN_SHELTER_STOPS: readonly OgunStopId[] = ['ota', 'abeokuta', 'sagamu'];

const C = {
  skyTop: '#b4b8ea',
  skyLow: '#ffe2bb',
  earth: '#d9925f',
  earthDark: '#b8703f',
  kerb: '#f4efe0',
  road: '#5f5c62',
  roadDark: '#4f4c52',
  dash: '#f4f1e6',
  leaf: '#4f9a3a',
  trunk: '#7a5a3a',
} as const;

function rect(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
}

function disc(g: G, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function rock(g: G, x: number, y: number, w: number, h: number, far = false): void {
  g.fillStyle = far ? '#c2bccd' : OG.granite;
  g.strokeStyle = far ? 'rgba(29,26,20,0.3)' : INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w / 2, y - h * 0.8, x - w * 0.1, y - h, x + w * 0.1, y - h);
  g.bezierCurveTo(x + w * 0.4, y - h, x + w / 2, y - h * 0.5, x + w / 2, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = far ? '#d6d1df' : OG.graniteLight;
  g.beginPath();
  g.ellipse(x - w * 0.12, y - h * 0.7, w * 0.16, h * 0.14, -0.4, 0, TAU);
  g.fill();
}

function palm(g: G, x: number, y: number, h = 44): void {
  g.strokeStyle = C.trunk;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + 4, y - h * 0.55, x + 2, y - h);
  g.stroke();
  g.fillStyle = C.leaf;
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55;
    g.beginPath();
    g.ellipse(x + 2 + Math.cos(a) * 10, y - h + Math.sin(a) * 6 + 4, 12, 3.2, a, 0, TAU);
    g.fill();
  }
}

/** A low Ogun house: a cream or ochre wall, a zinc roof seen from the front, a louvre window and a door. */
function house(g: G, x: number, w: number, top: number, wall: string): void {
  const base = 88;
  rect(g, x, top, w, base - top, wall, 1);
  g.fillStyle = OG.zinc;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 4, top + 1);
  g.lineTo(x + 4, top - 10);
  g.lineTo(x + w - 4, top - 10);
  g.lineTo(x + w + 4, top + 1);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = OG.zincDark;
  for (let k = x + 4; k < x + w - 2; k += 5) g.fillRect(k, top - 9, 1, 9);
  rect(g, x + 5, top + 8, 10, 9, '#cfe9f5', 0.8);
  for (let k = 0; k < 3; k++) rect(g, x + 5, top + 10 + k * 2.6, 10, 0.8, '#8fb0c8');
  rect(g, x + w - 15, base - 18, 9, 18, '#5b4636');
  rect(g, x, base - 22, w, 3, OG.indigo);
}

/** A factory shed with a saw-tooth roof (seen from the side), big doors, no name. */
function shed(g: G, x: number, w: number): void {
  rect(g, x, 46, w, 42, '#c3c8de', 1);
  g.fillStyle = OG.zinc;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, 46);
  for (let k = 0; k < w; k += 16) {
    g.lineTo(x + k + 12, 34);
    g.lineTo(x + k + 12, 46);
    g.lineTo(x + Math.min(w, k + 16), 46);
  }
  g.stroke();
  g.fill();
  for (let k = 0; k + 12 <= w; k += 16) rect(g, x + k + 10, 36, 2, 10, '#bfe3f5');
  rect(g, x + 8, 62, 22, 26, '#6a7489', 1);
  rect(g, x + w - 30, 62, 22, 26, '#6a7489', 1);
}

/** The flyover far off near Sagamu: a deck on two pillars with a tiny truck crossing. */
function flyover(g: G, x: number, w: number): void {
  rect(g, x, 40, w, 7, '#c9c2b6', 1);
  rect(g, x, 37, w, 3, '#e6e0d3', 0.6);
  for (const px of [x + 14, x + w - 22]) rect(g, px, 47, 8, 41, '#b8b0a2', 1);
  drawOgunTruck(g, x + w * 0.45, 32, 'e', 'tipper', false);
}

/** The kerbside shelter behind a main stop's plate: an indigo roof with a white stripe on two posts and a bench. */
function shelter(g: G, b: RoadBox): void {
  const { x } = b;
  rect(g, x + 12, 66, 3, 64, '#7d8a96');
  rect(g, x + b.w - 15, 66, 3, 64, '#7d8a96');
  rect(g, x + 16, 108, b.w - 32, 4, '#8a5d36');
  rect(g, x + 6, 60, b.w - 12, 8, OG.indigo, 1);
  rect(g, x + 8, 63, b.w - 16, 1.5, 'rgba(255,255,255,0.75)');
  rect(g, x + 16, 70, b.w - 32, 20, 'rgba(191,227,245,0.5)');
}

/** A flat cloth shade on two poles with a table of sacks (border market side road): never an umbrella. */
function stall(g: G, x: number, y: number, c: string, c2: string): void {
  rect(g, x - 1, y - 24, 2, 24, '#6b4a2b');
  rect(g, x + 25, y - 24, 2, 24, '#6b4a2b');
  rect(g, x - 4, y - 28, 34, 6, c, 1);
  g.fillStyle = c2;
  for (let k = 0; k < 34; k += 6) g.fillRect(x - 4 + k, y - 28, 2.4, 6);
  rect(g, x, y - 9, 26, 3, '#8a5d36');
  for (let k = 0; k < 3; k++) {
    g.fillStyle = '#efe6cf';
    g.beginPath();
    g.ellipse(x + 5 + k * 8, y - 12, 3.4, 3, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.6;
    g.stroke();
  }
}

/** Cones and a plain striped barrier: the road on north is still being built ("Coming soon"). */
function works(g: G, x: number): void {
  rect(g, x, 112, 46, 6, WHITE, 1);
  g.fillStyle = '#e0572b';
  for (let k = 0; k < 46; k += 10) g.fillRect(x + k, 112, 5, 6);
  rect(g, x + 2, 118, 2.4, 12, '#5d6670');
  rect(g, x + 41, 118, 2.4, 12, '#5d6670');
  for (const cx of [x - 12, x + 58]) {
    g.fillStyle = '#f07a2b';
    g.beginPath();
    g.moveTo(cx - 4, 132);
    g.lineTo(cx, 116);
    g.lineTo(cx + 4, 132);
    g.closePath();
    g.fill();
    rect(g, cx - 2.2, 123, 4.4, 2, WHITE);
  }
}

/** Pothole Hall behind its stop: a road works yard under a zinc roof on steel posts, granite cladding over an indigo stripe, a gravel heap, cones and a little roller. No writing, no palace. */
function hallMini(g: G, x: number, lit: boolean): void {
  rect(g, x + 6, 44, 100, 44, OG.granite, 1);
  rect(g, x + 6, 66, 100, 5, OG.indigo);
  g.fillStyle = OG.zinc;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, 46);
  g.lineTo(x + 12, 30);
  g.lineTo(x + 100, 30);
  g.lineTo(x + 112, 46);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = OG.zincDark;
  for (let k = x + 14; k < x + 100; k += 6) g.fillRect(k, 31, 1, 14);
  // The wide open door, dark inside with lamps (warm once King Pothole is beaten)
  rect(g, x + 30, 52, 52, 36, lit ? '#6b5a3a' : '#2e2a3a', 1);
  for (let k = 0; k < 3; k++) disc(g, x + 40 + k * 16, 57, lit ? 3 : 2, lit ? '#ffe08a' : '#5a5865');
  for (const px of [x + 10, x + 100]) {
    rect(g, px, 46, 3, 42, '#5d6670');
    g.fillStyle = '#f2c230';
    g.fillRect(px - 1, 82, 5, 6);
  }
  // A gravel heap and a striped barrier by the door
  g.fillStyle = '#9a9790';
  g.beginPath();
  g.moveTo(x + 84, 88);
  g.quadraticCurveTo(x + 94, 72, x + 104, 88);
  g.closePath();
  g.fill();
  rect(g, x + 14, 78, 14, 4, WHITE, 0.8);
  g.fillStyle = '#e0572b';
  g.fillRect(x + 14, 78, 4, 4);
  g.fillRect(x + 22, 78, 4, 4);
}

export interface OgunRoadOpts {
  /** King Pothole is beaten: the arch and the hall's lamps are bright. */
  lit: boolean;
  /** The Next stop (a small danfo at its shelter), or null. */
  next: OgunStopId | null;
}

/**
 * The whole road picture in road units (0, 0) to (816, 168): sky, far rocks and hills, houses,
 * sheds, the flyover and Pothole Hall, palms, the arch at the start, the two side roads, the main
 * road with its gentle bends, kerbs and dashes, the works at the north end. Plates go on top.
 */
export function drawOgunRoadPicture(g: G, opts: OgunRoadOpts): void {
  const { w, h } = OGUN_ROAD;
  g.save();
  const sky = g.createLinearGradient(0, 0, 0, 80);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyLow);
  g.fillStyle = C.earth;
  g.fillRect(0, 0, w, h);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, 90);
  // Far: our own granite rocks and green hills, a quarry's grey terraces far off on the right
  g.fillStyle = '#9fbf86';
  g.beginPath();
  g.moveTo(0, 90);
  for (let x = 0; x <= w; x += 34) g.lineTo(x, 66 + Math.sin(x * 0.02) * 8);
  g.lineTo(w, 90);
  g.closePath();
  g.fill();
  for (const [x, rw, rh] of [[210, 70, 40], [262, 40, 26], [380, 60, 34], [610, 54, 30]] as const) rock(g, x, 74, rw, rh, true);
  g.fillStyle = '#c9c2b6';
  for (let k = 0; k < 3; k++) g.fillRect(740 + k * 6, 50 + k * 8, 70 - k * 12, 6);
  // Ota: factory sheds; Abeokuta: houses, adire on a line and a near rock; Sagamu: the flyover
  shed(g, 150, 100);
  house(g, 268, 46, 50, '#f1d9a6');
  house(g, 320, 40, 58, '#e49a7e');
  g.strokeStyle = '#5d6670';
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(364, 64);
  g.lineTo(404, 64);
  g.stroke();
  for (let k = 0; k < 3; k++) drawAdireCloth(g, 366 + k * 13, 64, 10, 14, k);
  rock(g, 380, 88, 34, 22);
  flyover(g, 412, 120);
  house(g, 500, 40, 56, '#a9b4e0');
  hallMini(g, OGUN_STOP_BOX.hall.x, opts.lit);
  // The earth verge in front of the far things
  g.fillStyle = C.earth;
  g.fillRect(0, 88, w, 44);
  g.fillStyle = C.earthDark;
  g.fillRect(0, 88, w, 2);
  for (let i = 0; i < 18; i++) g.fillRect((i * 47) % w, 96 + ((i * 13) % 30), 9, 1.6);
  palm(g, 136, 90);
  palm(g, 262, 92, 40);
  palm(g, 544, 90);
  palm(g, 806, 88, 38);
  // The side roads: to the Expressway (a tipper and a tanker queued) and to the border market
  for (const [sx, top] of [[OGUN_SIDE_X.expressway, 60], [OGUN_SIDE_X.border, 60]] as const) {
    g.fillStyle = C.road;
    g.beginPath();
    g.moveTo(sx - 11, 134);
    g.quadraticCurveTo(sx - 14, 96, sx - 10, top);
    g.lineTo(sx + 10, top);
    g.quadraticCurveTo(sx + 14, 96, sx + 11, 134);
    g.closePath();
    g.fill();
    g.strokeStyle = C.kerb;
    g.lineWidth = 1.5;
    g.stroke();
  }
  for (const [y, kind] of [[86, 'tipper'], [116, 'tanker']] as const) {
    g.save();
    g.translate(OGUN_SIDE_X.expressway, y);
    g.scale(0.5, 0.5);
    drawOgunTruck(g, 0, 0, 's', kind);
    g.restore();
  }
  stall(g, OGUN_SIDE_X.border + 16, 88, OG.indigo, '#ffffff');
  stall(g, OGUN_SIDE_X.border - 46, 88, '#e0572b', '#f6e9cc');
  for (const s of OGUN_SHELTER_STOPS) shelter(g, OGUN_STOP_BOX[s]);
  // The main road: kerb, tarmac and dashes, from under the arch at the left to the works at the right
  g.fillStyle = C.road;
  g.beginPath();
  g.moveTo(0, 130 + roadBend(0));
  for (let x = 0; x <= w; x += 10) g.lineTo(x, 130 + roadBend((x * 680) / w));
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  g.strokeStyle = C.kerb;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = C.roadDark;
  g.fillRect(0, h - 3, w, 3);
  g.fillStyle = C.dash;
  for (let x = 4; x < w - 16; x += 22) g.fillRect(x, 160 + roadBend((x * 680) / w) * 0.4, 11, 2.5);
  works(g, 748);
  // The arch at the start, its back to us ("To Lagos" leaves under it): lit after the hall
  drawGateArch(g, 64, 132, 0.42, { face: 'back', lit: opts.lit });
  if (opts.next) {
    const b = OGUN_STOP_BOX[opts.next];
    drawDanfoSide(g, b.x + 30, b.y < 50 ? 60 : 93, false, 0.95);
  }
  g.restore();
}

/** The gallery's plate (the screen's HTML buttons copy it): the stop's name and a status line. Words here are for the gallery only. */
export function drawOgunStopPlate(g: G, id: OgunStopId, state: PlateState, bob = 0): void {
  const NAMES: Record<OgunStopId, string> = { toLagos: 'To Lagos', ota: 'Ota', expressway: 'Expressway', abeokuta: 'Abeokuta', sagamu: 'Sagamu', hall: 'Pothole Hall', border: 'Border market', wayOn: 'The way on' };
  const status = state === 'soon' ? 'Coming soon' : state === 'locked' ? 'Locked' : state === 'done' ? 'Done' : 'Play';
  drawStopPlate(g, OGUN_STOP_BOX[id], state === 'soon' ? 'locked' : state, { name: NAMES[id], status, line3: id === 'wayOn' ? 'More of Nigeria' : id === 'border' ? 'Later' : undefined }, bob);
}

// ---------- The stop card's picture ----------

/** Cuts from the still Ogun city picture (map units, 4 by 3) for the stops that have a spot on the map. */
export const OGUN_CARD_CUTS: Readonly<Record<'ota' | 'waterPoint' | 'interchange' | 'estate' | 'abeokuta' | 'sagamu' | 'border', RoadBox>> = {
  ota: { x: 0, y: 335, w: 240, h: 180 },
  waterPoint: { x: 940, y: 590, w: 240, h: 180 },
  interchange: { x: 680, y: 430, w: 320, h: 240 },
  estate: { x: 132, y: 300, w: 320, h: 240 },
  abeokuta: { x: 470, y: 60, w: 320, h: 240 },
  sagamu: { x: 1166, y: 600, w: 320, h: 240 },
  border: { x: 1280, y: 760, w: 320, h: 240 },
};

/** Copies a cut of the still Ogun city picture (at `cityScale` px a map unit) into a w x h box at (0, 0). */
export function drawOgunCardCut(g: G, city: CanvasImageSource, cityScale: number, cut: RoadBox, w: number, h: number): void {
  g.drawImage(city, cut.x * cityScale, cut.y * cityScale, cut.w * cityScale, cut.h * cityScale, 0, 0, w, h);
}

/**
 * The drawn card pictures, at card size (0, 0, w, h): 'toLagos' the arch's back with the road to
 * Lagos under it; 'wayOn' the expressway north past the arch into the hills, cones at the works;
 * 'border' the border market road, busy under flat shades (no post or officer). Still pictures;
 * time and still are for the cloth's sway only.
 */
export function drawOgunCardPicture(g: G, id: 'toLagos' | 'wayOn' | 'border', w: number, h: number, time = 0, still = false): void {
  const u = w / 112;
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyLow);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#9fbf86';
  g.fillRect(0, h * 0.55, w, h * 0.45);
  rock(g, w * 0.82, h * 0.6, 30 * u, 18 * u, true);
  g.fillStyle = C.earth;
  g.fillRect(0, h * 0.66, w, h * 0.34);
  // The road narrowing to the horizon
  g.fillStyle = C.road;
  g.beginPath();
  g.moveTo(w * 0.47, h * 0.58);
  g.lineTo(w * 0.53, h * 0.58);
  g.lineTo(w * 0.9, h);
  g.lineTo(w * 0.1, h);
  g.closePath();
  g.fill();
  g.fillStyle = C.dash;
  for (let k = 0; k < 4; k++) {
    const y0 = h * (0.62 + k * 0.1);
    g.fillRect(w / 2 - (0.6 + k) * u * 0.5, y0, (0.6 + k) * u, h * 0.04);
  }
  palm(g, w * 0.08, h * 0.75, 30 * u);
  if (id === 'toLagos') drawGateArch(g, w / 2, h * 0.8, 0.36 * u, { face: 'back' });
  else if (id === 'wayOn') {
    drawMiniArch(g, w / 2, h * 0.6, 0.5 * u, true);
    const k = u * 0.5;
    for (const cx of [w * 0.36, w * 0.64]) {
      g.fillStyle = '#f07a2b';
      g.beginPath();
      g.moveTo(cx - 5 * k, h * 0.9);
      g.lineTo(cx, h * 0.9 - 16 * k);
      g.lineTo(cx + 5 * k, h * 0.9);
      g.closePath();
      g.fill();
      rect(g, cx - 2.4 * k, h * 0.9 - 9 * k, 4.8 * k, 2 * k, WHITE);
    }
  } else {
    g.save();
    g.scale(u, u);
    stall(g, 8, 70, OG.indigo, '#ffffff');
    stall(g, 76, 70, '#13703a', '#f2b300');
    for (let k = 0; k < 3; k++) drawAdireCloth(g, 10 + k * 11, 42, 8, 10, k, false, still ? 0 : Math.sin(time * 1.5 + k) * 0.6);
    g.restore();
  }
  g.restore();
}

/** The plate sizes, for the screen (as Lagos's). */
export const OGUN_PLATE = PLATE;
