/**
 * Street scene for World 1 (Your street). Drawn in code, original.
 *
 * Two kinds of function:
 * - Background layers (drawSky, drawSkyline, drawShopRow, drawPassingBus) draw in
 *   SCREEN space (no camera translate). They take camX and scroll themselves
 *   with parallax.
 * - World things (drawRoad, drawPothole, drawStall, drawBusStop) draw in WORLD
 *   space: call them after g.translate(-camX, 0).
 *
 * The shop row and the sky gradient are painted once into offscreen canvases at the
 * screen's own pixel size and copied 1:1 each frame (blitLayer): text, gradients and
 * scaled pictures are costly to paint every frame on a slow phone.
 */
import * as P from './palette';

export const GROUND_Y = 300;
const TAU = Math.PI * 2;

/** Everyday, made-up shop signs. No real brands. */
export const SHOP_SIGNS = ['MAMA PUT', 'VULCANIZER', 'POS HERE', 'PURE WATER', 'TAILOR', 'PROVISIONS', 'PHONE REPAIRS', 'BARBING SALON'] as const;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

// ---------- Screen-pixel layers ----------

/**
 * A picture painted once into an offscreen canvas at the screen's own pixel size, then copied
 * pixel for pixel each frame. A copy at 1:1 is much cheaper on a slow phone than painting a
 * gradient or scaling a picture every frame (qa perf, piece H).
 */
export interface PixelLayer {
  key: string;
  canvas: HTMLCanvasElement;
}

/**
 * Copies `paint` (drawn in world units over w x h from the layer's origin) to (x, y) on g.
 * Painted again only when `key` or the screen scale changes. Returns false when it cannot copy
 * 1:1 (no document, or a turned or stretched transform): the caller then paints directly.
 */
export function blitLayer(
  g: CanvasRenderingContext2D,
  slot: { layer: PixelLayer | null },
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: (cg: CanvasRenderingContext2D) => void,
  snap = false,
): boolean {
  if (typeof document === 'undefined' || typeof g.getTransform !== 'function') return false;
  const m = g.getTransform();
  if (m.b !== 0 || m.c !== 0 || m.a <= 0 || Math.abs(m.a - m.d) > 1e-9) return false;
  const s = m.d;
  // Where the layer lands in screen pixels. The fraction of a pixel is painted into the layer
  // so the copy sits exactly where direct painting would (snap: whole pixels, for a layer that
  // moves every frame and would otherwise be painted again each frame).
  const px = m.e + x * s;
  const py = m.f + y * s;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = snap ? 0 : px - ix;
  const fy = snap ? 0 : py - iy;
  const full = `${key}|${s}|${fx.toFixed(3)}|${fy.toFixed(3)}`;
  let layer = slot.layer;
  if (!layer || layer.key !== full) {
    const c = layer?.canvas ?? document.createElement('canvas');
    c.width = Math.ceil(w * s + fx) + 1;
    c.height = Math.ceil(h * s + fy) + 1;
    const cg = c.getContext('2d');
    if (!cg) return false;
    cg.setTransform(s, 0, 0, s, fx, fy);
    paint(cg);
    layer = { key: full, canvas: c };
    slot.layer = layer;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(layer.canvas, snap ? Math.round(px) : ix, snap ? Math.round(py) : iy);
  g.setTransform(m);
  return true;
}

// ---------- Sky ----------

const SUN_R = 26;
const skyLayer = { layer: null as PixelLayer | null };

function paintSkyFill(g: CanvasRenderingContext2D, viewW: number, upTo: number, grad: CanvasGradient): void {
  g.fillStyle = grad;
  g.fillRect(0, 0, viewW, upTo);
  g.fillStyle = P.SUN;
  g.beginPath();
  g.arc(viewW - 80, 58, SUN_R, 0, TAU);
  g.fill();
}

function skyGradient(g: CanvasRenderingContext2D, viewH: number): CanvasGradient {
  const grad = g.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, P.SKY_TOP);
  grad.addColorStop(0.8, P.SKY_LOW);
  return grad;
}

/**
 * The sky, its sun and drifting clouds. Screen space. The gradient and the sun's disc stand
 * still on screen, so they are painted once and copied; below 80 percent of viewH the sky is
 * plain SKY_LOW (the gradient's last stop), a cheap flat fill.
 */
export function drawSky(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, viewH = 360): void {
  const flat = viewH * 0.8;
  const copied = blitLayer(g, skyLayer, `${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSkyFill(cg, viewW, flat, skyGradient(cg, viewH)));
  if (copied) {
    g.fillStyle = P.SKY_LOW;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else {
    paintSkyFill(g, viewW, viewH, skyGradient(g, viewH));
  }

  // Sun's slowly turning rays (they start clear of the disc, so drawing them after it is the same)
  const sx = viewW - 80;
  const sy = 58;
  g.strokeStyle = P.SUN_RING;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * (TAU / 10) + time * 0.15;
    g.moveTo(sx + Math.cos(a) * 32, sy + Math.sin(a) * 32);
    g.lineTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40);
  }
  g.stroke();

  // Clouds drift slowly
  g.fillStyle = P.CLOUD;
  const span = viewW + 300;
  for (let i = 0; i < 3; i++) {
    const x = ((((i * 290 - camX * 0.05 - time * 4) % span) + span) % span) - 150;
    const y = 40 + i * 28;
    g.beginPath();
    g.arc(x, y, 14, 0, TAU);
    g.arc(x + 18, y - 8, 18, 0, TAU);
    g.arc(x + 38, y, 13, 0, TAU);
    g.fill();
    g.fillRect(x, y, 38, 13);
  }
}

// ---------- Far skyline ----------

export function drawSkyline(g: CanvasRenderingContext2D, camX: number, viewW: number, groundY = GROUND_Y): void {
  const par = camX * 0.15;
  const step = 54;
  const first = Math.floor(par / step) - 1;
  const last = Math.ceil((par + viewW) / step) + 1;
  for (let i = first; i <= last; i++) {
    const h = 50 + Math.floor(hash(i) * 70);
    const w = 40 + Math.floor(hash(i + 50) * 12);
    const x = i * step - par;
    const top = groundY - 60 - h;
    g.fillStyle = hash(i + 9) > 0.5 ? P.SKYLINE : P.SKYLINE_DARK;
    g.fillRect(x, top, w, h + 60);
    // A few window strips, and sometimes a water tank on the roof
    g.fillStyle = P.SKYLINE_WINDOW;
    for (let y = top + 10; y < groundY - 70; y += 16) g.fillRect(x + 6, y, w - 12, 4);
    if (hash(i + 3) > 0.6) {
      g.fillStyle = P.SKYLINE_DARK;
      g.fillRect(x + 8, top - 10, 12, 10);
    }
  }
}

// ---------- Shop row (cached) ----------

const SHOP_W = 124;
const SHOP_TILE_W = SHOP_W * SHOP_SIGNS.length;
const SHOP_TOP = 120; // tallest shop height above the shop base line
const SHOP_BASE = 264; // y where shops meet the pavement

function drawShopIcon(g: CanvasRenderingContext2D, k: number, x: number, y: number): void {
  // A small picture next to each sign so non-readers know the shop too
  g.lineWidth = 2;
  g.strokeStyle = P.INK;
  switch (k) {
    case 0: // pot of food
      rr(g, x - 7, y - 3, 14, 9, 3, '#c0392b');
      g.fillStyle = P.INK;
      g.fillRect(x - 9, y - 4, 18, 2);
      break;
    case 1: // tyre
      g.fillStyle = P.TYRE_BLACK;
      g.beginPath();
      g.arc(x, y, 7, 0, TAU);
      g.fill();
      g.fillStyle = '#999';
      g.beginPath();
      g.arc(x, y, 3, 0, TAU);
      g.fill();
      break;
    case 2: // card machine
      rr(g, x - 5, y - 8, 10, 15, 2, '#444');
      g.fillStyle = '#9fe0a8';
      g.fillRect(x - 3, y - 6, 6, 4);
      break;
    case 3: // water sachet
      rr(g, x - 6, y - 7, 12, 14, 3, '#d7f0ff');
      g.strokeStyle = '#3b8ed0';
      g.strokeRect(x - 6, y - 7, 12, 14);
      break;
    case 4: // spool of thread and needle
      rr(g, x - 4, y - 7, 8, 14, 1, '#e0572b');
      g.beginPath();
      g.moveTo(x + 7, y - 8);
      g.lineTo(x + 7, y + 7);
      g.stroke();
      break;
    case 5: // tin and bag
      rr(g, x - 7, y - 6, 7, 12, 1, '#f39c12');
      rr(g, x + 1, y - 4, 7, 10, 1, '#2fa36b');
      break;
    case 6: // phone
      rr(g, x - 5, y - 8, 10, 16, 2, P.INK);
      g.fillStyle = '#7fd6ff';
      g.fillRect(x - 3, y - 6, 6, 10);
      break;
    case 7: // comb
      g.fillStyle = P.INK;
      g.fillRect(x - 8, y - 5, 16, 3);
      for (let i = 0; i < 6; i++) g.fillRect(x - 7 + i * 3, y - 2, 1.5, 6);
      break;
  }
}

function paintShops(g: CanvasRenderingContext2D): void {
  // Drawn with the shop base at y = SHOP_TOP inside the tile.
  for (let k = 0; k < SHOP_SIGNS.length; k++) {
    const x = k * SHOP_W + 4;
    const w = SHOP_W - 8;
    const h = 96 + (k % 3) * 10;
    const top = SHOP_TOP - h;
    rr(g, x, top, w, h, 4, P.SHOP_WALLS[k] ?? P.SHOP_WALLS[0]);
    g.fillStyle = P.SHOP_SHADE;
    g.fillRect(x, top, w, 6);
    // Sign board
    rr(g, x + 6, top + 12, w - 12, 22, 3, P.SIGN_BOARD);
    g.strokeStyle = P.INK;
    g.lineWidth = 1.5;
    g.strokeRect(x + 6, top + 12, w - 12, 22);
    drawShopIcon(g, k, x + 18, top + 23);
    g.fillStyle = P.INK;
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = SHOP_SIGNS[k] ?? '';
    g.fillText(label, x + w / 2 + 10, top + 23.5, w - 40);
    // Awning
    const ay = top + 40;
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? P.CREAM : '#d65a4a';
      g.fillRect(x + i * (w / 7), ay, w / 7 + 0.5, 9);
    }
    // Door and window
    rr(g, x + 12, SHOP_TOP - 46, 26, 46, 2, P.SHOP_DOOR);
    rr(g, x + 50, SHOP_TOP - 48, w - 60, 28, 2, P.SHOP_GLASS);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillRect(x + 54, SHOP_TOP - 45, 6, 22);
  }
}

const shopLayer = { layer: null as PixelLayer | null };

/** Shop row at half camera speed, plus the pavement band down to the road. */
export function drawShopRow(g: CanvasRenderingContext2D, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = SHOP_BASE - (GROUND_Y - groundY);
  // Pavement
  g.fillStyle = '#cdb98f';
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = '#b8a477';
  g.fillRect(0, base, viewW, 3);

  // The eight shops are one picture at the screen's own pixel size, copied whole pixel for
  // whole pixel (signs, text and many shapes are costly to paint every frame on a slow phone).
  const par = camX * 0.5;
  const startTile = Math.floor(par / SHOP_TILE_W);
  for (let t = startTile; t * SHOP_TILE_W - par < viewW; t++) {
    const x = t * SHOP_TILE_W - par;
    if (blitLayer(g, shopLayer, 'shops', x, base - SHOP_TOP, SHOP_TILE_W, SHOP_TOP, paintShops, true)) continue;
    g.save();
    g.translate(x, base - SHOP_TOP);
    paintShops(g);
    g.restore();
  }
}

// ---------- Yellow bus ----------

/** A yellow city bus with black stripes, wheels on y = 0, front facing +x. */
export function drawBusShape(g: CanvasRenderingContext2D, x: number, y: number, time: number, open = false): void {
  const bob = Math.sin(time * 14) * 0.6;
  g.save();
  g.translate(x, y + bob);
  rr(g, -46, -42, 92, 34, 7, P.BUS_YELLOW);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-46, -42, 92, 34, 7);
  g.stroke();
  g.fillStyle = P.BUS_STRIPE;
  g.fillRect(-46, -24, 92, 3);
  g.fillRect(-46, -15, 92, 2);
  g.fillStyle = P.BUS_GLASS;
  for (let i = 0; i < 4; i++) g.fillRect(-40 + i * 18, -38, 13, 10);
  g.fillRect(32, -38, 10, 12); // windscreen
  // Door
  g.fillStyle = open ? '#3a3a3a' : P.BUS_GLASS;
  g.fillRect(18, -38, 10, 26);
  // Lights
  g.fillStyle = '#fff3b0';
  g.fillRect(42, -18, 4, 4);
  g.fillStyle = '#e74c3c';
  g.fillRect(-46, -18, 3, 4);
  // Wheels
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(-26, -7, 7, 0, TAU);
  g.arc(26, -7, 7, 0, TAU);
  g.fill();
  g.fillStyle = '#9a9a9a';
  g.beginPath();
  g.arc(-26, -7, 2.5, 0, TAU);
  g.arc(26, -7, 2.5, 0, TAU);
  g.fill();
  g.restore();
}

/** Screen space: a bus passing on the far lane now and then. */
export function drawPassingBus(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, groundY = GROUND_Y): void {
  const span = viewW + 600;
  const x = ((((time * 90 - camX * 0.7) % span) + span) % span) - 200;
  // gamedev (qa C7): small, on the back lane in front of the shops, so it reads as
  // far away and nobody tries to jump it. Full-size buses belong to the bus stop.
  g.save();
  g.translate(x, groundY - 26);
  g.scale(0.5, 0.5);
  drawBusShape(g, 0, 0, time);
  g.restore();
}

// ---------- Road and potholes (world space) ----------

export function drawPothole(g: CanvasRenderingContext2D, x0: number, x1: number, groundY = GROUND_Y, viewH = 360): void {
  g.fillStyle = P.POTHOLE;
  g.fillRect(x0, groundY, x1 - x0, viewH - groundY);
  // A thin band of rain water near the top; dark below it, down to the bottom edge (S2.1).
  g.fillStyle = P.POTHOLE_WATER;
  g.fillRect(x0 + 2, groundY + 34, x1 - x0 - 4, 7);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x0 + 6, groundY + 36, Math.min(14, x1 - x0 - 12), 2);
  // Broken rims on both sides so it reads as a hole, not just a dark patch
  g.fillStyle = P.POTHOLE_RIM;
  for (const [x, dir] of [[x0, 1], [x1, -1]] as const) {
    g.beginPath();
    g.moveTo(x, groundY);
    g.lineTo(x + dir * 6, groundY + 6);
    g.lineTo(x + dir * 3, groundY + 14);
    g.lineTo(x + dir * 7, groundY + 22);
    g.lineTo(x, groundY + 30);
    g.closePath();
    g.fill();
  }
}

/**
 * World space. Road spans [startX, endX]; the gaps between them are potholes.
 * Only the part between camX and camX + viewW is drawn.
 */
export function drawRoad(g: CanvasRenderingContext2D, camX: number, viewW: number, ground: readonly (readonly [number, number])[], groundY = GROUND_Y, viewH = 360): void {
  const L = camX - 20;
  const R = camX + viewW + 20;
  for (let i = 0; i < ground.length; i++) {
    const span = ground[i];
    if (!span) continue;
    const a = Math.max(span[0], L);
    const b = Math.min(span[1], R);
    if (b > a) {
      g.fillStyle = P.ROAD;
      g.fillRect(a, groundY, b - a, viewH - groundY);
      g.fillStyle = P.ROAD_EDGE;
      g.fillRect(a, groundY, b - a, 5);
      g.fillStyle = P.ROAD_LINE;
      for (let x = Math.ceil(a / 60) * 60; x < b - 30; x += 60) g.fillRect(x, groundY + 28, 30, 4);
    }
    const next = ground[i + 1];
    if (next && next[0] > span[1] && next[0] > L && span[1] < R) drawPothole(g, span[1], next[0], groundY, viewH);
  }
}

// ---------- Market stall (platform) ----------

/** World space. The roof top is exactly at topY: that is the landing line. */
export function drawStall(g: CanvasRenderingContext2D, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  // Poles
  g.fillStyle = P.STALL_POLE;
  g.fillRect(x + 6, topY + 10, 4, groundY - topY - 10);
  g.fillRect(x + w - 10, topY + 10, 4, groundY - topY - 10);
  // Table with produce, if there is room under the roof
  if (groundY - topY > 40) {
    const ty = groundY - 22;
    g.fillStyle = P.STALL_TABLE;
    g.fillRect(x + 4, ty, w - 8, 5);
    g.fillRect(x + 12, ty + 5, 3, 17);
    g.fillRect(x + w - 15, ty + 5, 3, 17);
    const goods = ['#e74c3c', '#f39c12', '#2fa36b', '#e74c3c'];
    for (let i = 0; i * 12 + 16 < w - 12; i++) {
      g.fillStyle = goods[i % goods.length] ?? '#e74c3c';
      g.beginPath();
      g.arc(x + 16 + i * 12, ty - 3, 4, 0, TAU);
      g.fill();
    }
  }
  // Roof: corrugated top with a striped scalloped edge
  rr(g, x, topY, w, 10, 3, P.STALL_ROOF);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, topY, w, 10, 3);
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = x + 8; i < x + w - 4; i += 10) g.fillRect(i, topY + 2, 2, 7);
  for (let i = 0; x + i * 14 < x + w - 2; i++) {
    g.fillStyle = i % 2 ? P.STALL_ROOF_STRIPE : P.STALL_ROOF;
    g.beginPath();
    g.arc(x + 7 + i * 14, topY + 10, 7, 0, Math.PI);
    g.fill();
  }
}

// ---------- Bus stop (checkpoint) ----------

/**
 * World space, x = the checkpoint. lit = reached. The sign changes shape as well
 * as colour: unlit shows a bus picture, lit adds a big tick and a lamp glow.
 */
export function drawBusStop(g: CanvasRenderingContext2D, x: number, lit: boolean, time: number, groundY = GROUND_Y, withBus = true): void {
  if (withBus) drawBusShape(g, x + 90, groundY - 6, lit ? time : 0, true);
  // Shelter
  g.fillStyle = '#7d8a96';
  g.fillRect(x - 40, groundY - 62, 4, 62);
  g.fillRect(x + 28, groundY - 62, 4, 62);
  rr(g, x - 46, groundY - 68, 84, 8, 3, '#4f7cac');
  g.fillStyle = 'rgba(191,227,245,0.5)';
  g.fillRect(x - 36, groundY - 60, 64, 34);
  // Bench
  g.fillStyle = '#8a5d36';
  g.fillRect(x - 34, groundY - 20, 58, 4);
  g.fillRect(x - 30, groundY - 16, 3, 16);
  g.fillRect(x + 18, groundY - 16, 3, 16);
  // Pole and sign
  g.fillStyle = P.STOP_POLE;
  g.fillRect(x + 44, groundY - 96, 4, 96);
  if (lit) {
    const pulse = 0.25 + 0.15 * Math.sin(time * 6);
    g.globalAlpha = pulse;
    g.fillStyle = P.GLOW;
    g.beginPath();
    g.arc(x + 46, groundY - 104, 26, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }
  rr(g, x + 22, groundY - 118, 48, 28, 5, lit ? P.STOP_SIGN_ON : P.STOP_SIGN_OFF);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x + 22, groundY - 118, 48, 28, 5);
  g.stroke();
  g.fillStyle = P.WHITE;
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BUS STOP', x + 46, groundY - 110);
  if (lit) {
    g.strokeStyle = P.WHITE;
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 39, groundY - 100);
    g.lineTo(x + 44, groundY - 95);
    g.lineTo(x + 54, groundY - 104);
    g.stroke();
  } else {
    // Tiny bus picture
    rr(g, x + 37, groundY - 103, 18, 8, 2, P.BUS_YELLOW);
    g.fillStyle = P.INK;
    g.fillRect(x + 40, groundY - 95, 3, 2);
    g.fillRect(x + 49, groundY - 95, 3, 2);
  }
}
