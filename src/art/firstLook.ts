/**
 * W17 C (docs/design.md S3e0 part 6): the first screen of a street run looks like its city spot,
 * tired before the fix and bright after, with a plain street sign. Scenery only: nothing here is
 * solid, nothing moves a coin, crate, hazard or the camera, and the level files do not change.
 *
 * Plain shapes for now (art S3e1a draws the real pieces). Each look is painted once into a
 * picture at the screen's pixel size and copied (blitLayer), never drawn piece by piece.
 * - drawFirstRow: screen space, at the shop row's half camera speed, over the row.
 * - drawFirstWorld: world space, after the road: the road paint, Alausa's cracks and the sign.
 */
import { drawRoad, blitLayer, type PixelLayer } from './street';

export interface FirstLook {
  /** Street index: 0 Alausa, 1 Computer Village, 2 Ikeja. */
  street: number;
  name: string;
  /** The spot is fixed (the New road, the Mast, the Lamps). */
  bright: boolean;
}

/** Each street's stretch ends here, and its sign stands here (world units, from x 20). */
export const FIRST_STRETCH: readonly { end: number; sign: number }[] = [
  { end: 760, sign: 260 },
  { end: 1000, sign: 260 },
  { end: 1000, sign: 600 },
];
export const STRETCH_START = 20;
/** The look eases back to the street's own over this much at the end of the stretch. */
export const BLEND = 120;
const UP = 190;
const INK = '#1d1a14';

const rowSlot = { layer: null as PixelLayer | null };
const worldSlot = { layer: null as PixelLayer | null };

const stretch = (f: FirstLook): { end: number; sign: number } => FIRST_STRETCH[f.street] ?? FIRST_STRETCH[0]!;

/** Screen x (at row speed) up to which the street's fixed look is held back: a tired stretch only. */
export function heldTo(f: FirstLook | null, camX: number): number {
  return f && !f.bright ? stretch(f).end - camX * 0.5 : 0;
}

function person(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  const tops = ['#2b9bc8', '#8e5bb5', '#e8743b', '#3f9a4a'];
  g.fillStyle = '#5a3a24';
  g.beginPath();
  g.arc(x, y - 40, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = tops[k % 4]!;
  g.fillRect(x - 6, y - 34, 12, 20);
  g.fillStyle = '#3a332a';
  g.fillRect(x - 5, y - 14, 4, 14);
  g.fillRect(x + 1, y - 14, 4, 14);
}

function lamp(g: CanvasRenderingContext2D, x: number, base: number, on: boolean): void {
  g.fillStyle = '#5d6670';
  g.fillRect(x - 2, base - 150, 4, 150);
  if (on) {
    g.fillStyle = 'rgba(255,216,110,0.35)';
    g.beginPath();
    g.arc(x, base - 150, 18, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = on ? '#fff4c2' : '#3a3f45';
  g.fillRect(x - 7, base - 156, 14, 8);
}

/** The row pieces, in row units from the stretch's own origin (x 0), base at y UP. */
function paintRow(g: CanvasRenderingContext2D, f: FirstLook): void {
  const { end } = stretch(f);
  const b = UP;
  const sq = (x: number, y: number, w: number, h: number, c: string): void => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  if (!f.bright) {
    // Walls mixed toward warm sand, easing back over the last 120 units.
    const grad = g.createLinearGradient(end - BLEND, 0, end, 0);
    grad.addColorStop(0, 'rgba(201,180,140,0.5)');
    grad.addColorStop(1, 'rgba(201,180,140,0)');
    sq(STRETCH_START, b - 130, end - BLEND - STRETCH_START, 130, 'rgba(201,180,140,0.5)');
    g.fillStyle = grad;
    g.fillRect(end - BLEND, b - 130, BLEND, 130);
    // Two roll-down shutters in the first four fronts, 4 flat lines across.
    for (const x of [30, 278]) {
      sq(x, b - 50, 96, 50, '#8a8076');
      for (let i = 1; i <= 4; i++) sq(x, b - 50 + i * 10, 96, 1.5, '#6b625a');
    }
    // A neat tied sack and a box at the kerb, waiting for collection.
    sq(420, b - 16, 18, 16, '#b49a6a');
    g.fillStyle = '#c9a874';
    g.beginPath();
    g.ellipse(452, b - 9, 10, 9, 0, 0, Math.PI * 2);
    g.fill();
    person(g, 200, b, 0);
  } else {
    // Goods out front: a crate of tomatoes, a rack of cloth, plain boxes. Four people.
    sq(60, b - 18, 30, 18, '#a0703f');
    g.fillStyle = '#d9412b';
    for (let i = 0; i < 4; i++) g.fillRect(63 + i * 7, b - 22, 5, 5);
    sq(300, b - 46, 3, 46, '#5d6670');
    for (let i = 0; i < 3; i++) sq(304, b - 44 + i * 12, 20, 10, ['#8e5bb5', '#e8743b', '#2b9bc8'][i]!);
    sq(520, b - 16, 20, 16, '#c9a874');
    sq(542, b - 12, 16, 12, '#b49a6a');
    [150, 360, 470, 640].forEach((x, k) => person(g, x, b, k));
  }
  if (f.street === 0 && !f.bright) {
    // Two cones at 70%, against a shop wall in the back layer: never on the road band.
    for (const x of [232, 250]) {
      g.fillStyle = '#f07d22';
      g.beginPath();
      g.moveTo(x - 6, b - 2);
      g.lineTo(x, b - 20);
      g.lineTo(x + 6, b - 2);
      g.fill();
    }
  }
  if (f.street === 1) {
    // Our own mast behind the row: 1 of 4 bars tired, 4 of 4 bright; shop screens dark or lit.
    sq(608, b - UP + 10, 5, 70, '#5d6670');
    for (let i = 0; i < 4; i++) {
      const on = f.bright || i === 0;
      g.strokeStyle = INK;
      g.lineWidth = 1.5;
      g.strokeRect(620 + i * 9, b - UP + 50 - i * 8, 7, 10 + i * 8);
      if (on) sq(620 + i * 9, b - UP + 50 - i * 8, 7, 10 + i * 8, '#2f8f4e');
    }
    [100, 340, 580].forEach((x, k) => {
      sq(x, b - 64, 22, 14, f.bright || k === 2 ? '#7fd6ff' : '#2a2a2a');
      if (f.bright) sq(x + 2, b - 62, 1, 10, '#ffffff');
    });
  }
  if (f.street === 2) for (const x of [300, 700]) lamp(g, x, b, f.bright);
}

/** Screen space, straight after the backdrop's row (at the row's half camera speed). */
export function drawFirstRow(g: CanvasRenderingContext2D, f: FirstLook, camX: number, viewW: number, groundY: number, time: number, still: boolean): void {
  const { end } = stretch(f);
  const x = -camX * 0.5;
  if (x + end < 0 || x > viewW) return;
  const base = 264 - (300 - groundY);
  const y = base - UP;
  if (!blitLayer(g, rowSlot, `first|${f.street}|${f.bright}`, x, y, end + 20, UP + 4, (cg) => paintRow(cg, f), true)) {
    g.save();
    g.translate(x, y);
    paintRow(g, f);
    g.restore();
  }
  // The bright mast's small light blinks once every 2 s (steady with reduced motion).
  if (f.street === 1 && f.bright && (still || time % 2 < 1)) {
    g.fillStyle = '#ff5a4a';
    g.fillRect(x + 607, y + 6, 7, 5);
  }
}

/** The sign and Alausa's cracks, in world units from (ox, groundY - 140). */
function paintWorld(g: CanvasRenderingContext2D, f: FirstLook, font: number, ox: number): void {
  const sx = stretch(f).sign - ox;
  // The plain street sign: a dark grey pole and a cream plate with the name, nothing else.
  g.fillStyle = '#4b4f55';
  g.fillRect(sx - 2.5, 40, 5, 100);
  g.font = `bold ${font}px 'Trebuchet MS', Verdana, sans-serif`;
  const tw = (g.measureText(f.name) as TextMetrics | undefined)?.width ?? f.name.length * font * 0.6;
  const pw = tw + font;
  const ph = font * 1.6;
  g.fillStyle = '#fffaf0';
  g.fillRect(sx - pw / 2, 40 - ph, pw, ph);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(sx - pw / 2, 40 - ph, pw, ph);
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(f.name, sx, 40 - ph / 2);
  if (f.street === 0 && !f.bright) {
    // Five thin cracks on the road's front face (6 to 30 below the walking line), never on it.
    g.strokeStyle = '#3a332a';
    g.lineWidth = 1.5;
    for (const [cx, cy] of [[150, 148], [300, 158], [420, 150], [560, 162], [660, 152]] as const) {
      const lx = cx - ox;
      g.beginPath();
      g.moveTo(lx, cy);
      g.lineTo(lx + 6, cy + 4);
      g.lineTo(lx + 11, cy);
      g.lineTo(lx + 18, cy + 5);
      g.stroke();
    }
  }
}

/**
 * World space, after the road and before every crate, coin and hazard: the road paint the spot
 * wants (fresh once fixed), Alausa's cracks while tired, and the street sign. `scale` is screen
 * px per world unit, so the sign's words are at least 12 px bold.
 */
export function drawFirstWorld(g: CanvasRenderingContext2D, f: FirstLook, camX: number, viewW: number, ground: readonly (readonly [number, number])[], groundY: number, viewH: number, fixed: boolean, scale: number): void {
  const { end, sign } = stretch(f);
  if (camX > end || camX + viewW < STRETCH_START) return;
  const fresh = f.street === 0 ? f.bright : fixed && f.bright;
  if (fresh !== fixed) {
    // The road paint inside the stretch, easing into the street's own over the last 120 units.
    const part = (a: number, b: number, alpha: number): void => {
      g.globalAlpha = alpha;
      drawRoad(g, a + 20, b - a - 40, ground.map(([x0, x1]) => [Math.max(x0, a), Math.min(x1, b)] as const).filter(([x0, x1]) => x1 > x0), groundY, viewH, fresh);
    };
    part(STRETCH_START, end - BLEND, 1);
    for (let i = 0; i < 4; i++) part(end - BLEND + i * 30, end - BLEND + (i + 1) * 30, 0.8 - i * 0.2);
    g.globalAlpha = 1;
  }
  const font = Math.max(12, 12 / Math.max(0.1, scale));
  // Alausa's layer reaches its last crack; the others hold the sign alone.
  const ox = f.street === 0 ? 140 : sign - 120;
  const w = f.street === 0 ? 560 : 240;
  if (!blitLayer(g, worldSlot, `firstW|${f.street}|${f.bright}|${font}`, ox, groundY - 140, w, 200, (cg) => paintWorld(cg, f, font, ox), true)) {
    g.save();
    g.translate(ox, groundY - 140);
    paintWorld(g, f, font, ox);
    g.restore();
  }
}
