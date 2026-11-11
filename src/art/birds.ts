/**
 * Birds by the rubbish (docs/design.md S2.16 B1): the cattle egret and the pied crow, two
 * real Lagos birds in our own drawings, and the neat rubbish pile with its green bin.
 *
 * The birds are in the way, never the enemy, and never hurt: every way past one ends with
 * it flying off, fine. Real bird shapes with legs, beaks and wings, calm round eyes, no
 * eyebrows, never round ball birds, never a slingshot or a pipe (CLAUDE.md rule 2: nothing
 * like Angry Birds or Flappy Bird).
 *
 * World space, y down. No gradients or shadowBlur. Two frames per move, picked from time.
 */
import { drawFufuBall } from './fufu';
import { drawKobo } from './items';
import { INK } from './palette';

const TAU = Math.PI * 2;

/** Boxes from S2.16 B1 (u). The egret stands on the road; the crow's box bottom is 20 u above it. */
export const BIRD_BOX = {
  egret: { w: 16, h: 28 },
  crow: { w: 22, h: 14, above: 20 },
} as const;

/** Bird colours. */
export const BIRD = {
  egretWhite: '#fbfaf4',
  egretShade: '#dcdad0',
  egretBuff: '#e9b46a',
  beak: '#f2b300',
  egretLeg: '#6b5a2a',
  crowBlack: '#25252b',
  crowSheen: '#44465a',
  crowWhite: '#f6f4ec',
  crowBeak: '#33343a',
  eye: '#3a2a1a',
} as const;

/** Peck or hop on the road (the egret), hover over the pile (the crow), or fly off. */
export type BirdMode = 'peck' | 'hop' | 'hover' | 'fly';

export interface BirdLook {
  /** 1 faces right, -1 faces left (default left, toward a hero coming from the left). */
  facing?: 1 | -1;
  /** Carrying a fufu ball away (in the beak, or the crow's feet). */
  fufu?: boolean;
  /** Reduced motion: frames and bob hold still. */
  still?: boolean;
}

/** Which of two frames shows: `perSecond` changes a second. */
function frame(time: number, perSecond: number, still?: boolean): 0 | 1 {
  if (still || !Number.isFinite(time)) return 0;
  return Math.floor(time * perSecond) % 2 === 0 ? 0 : 1;
}

function outlined(g: CanvasRenderingContext2D, fill: string, w = 1.1): void {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

/** A thin bird leg with an ink edge, from (x1, y1) to (x2, y2), with three short toes. */
function leg(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, toes = true): void {
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  if (toes) {
    g.moveTo(x2 - 2, y2);
    g.lineTo(x2 + 2.6, y2);
  }
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  g.strokeStyle = colour;
  g.lineWidth = 1;
  g.stroke();
}

/** A calm round eye: a dark dot with a tiny light catch. */
function eye(g: CanvasRenderingContext2D, x: number, y: number, r = 0.8): void {
  g.fillStyle = BIRD.eye;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x + r * 0.35, y - r * 0.35, r * 0.35, 0, TAU);
  g.fill();
}

/** A fufu ball, small, held by a bird (no steam). */
function carried(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.scale(0.55, 0.55);
  drawFufuBall(g, 0, 0, { steam: false, still: true });
  g.restore();
}

/* ------------------------------------------------------------------ egret */

/** Egret body, tail and wing at rest (bird frame: feet at 0, 0, facing right). */
function egretBody(g: CanvasRenderingContext2D, y: number): void {
  g.beginPath();
  g.moveTo(5, y - 17);
  g.quadraticCurveTo(5.5, y - 12, 0, y - 11.5);
  g.quadraticCurveTo(-5, y - 11.5, -9.5, y - 12.2);
  g.lineTo(-6.2, y - 15.6);
  g.quadraticCurveTo(-2, y - 20, 2.6, y - 19.4);
  g.quadraticCurveTo(4.6, y - 19, 5, y - 17);
  g.closePath();
  outlined(g, BIRD.egretWhite);
  // Folded wing line and a soft buff patch on the back (breeding colours)
  g.strokeStyle = BIRD.egretShade;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(3, y - 15.5);
  g.quadraticCurveTo(-2, y - 13.4, -7.4, y - 13.4);
  g.stroke();
  g.fillStyle = BIRD.egretBuff;
  g.beginPath();
  g.ellipse(-0.6, y - 17.4, 2.6, 1.1, -0.15, 0, TAU);
  g.fill();
}

/** Egret neck and head, upright (head up, looking ahead) or down (pecking at the road). */
function egretHead(g: CanvasRenderingContext2D, y: number, down: boolean, fufu: boolean): void {
  const hx = down ? 8.6 : 4.4;
  const hy = down ? y - 6.4 : y - 25.4;
  // The S-shaped neck: a thick white stroke with an ink edge
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(3.6, y - 17.4);
  if (down) g.quadraticCurveTo(8.6, y - 16, hx - 0.4, hy - 1.4);
  else g.quadraticCurveTo(1.2, y - 21.6, hx - 0.6, hy + 1.6);
  g.strokeStyle = INK;
  g.lineWidth = 4.4;
  g.stroke();
  g.strokeStyle = BIRD.egretWhite;
  g.lineWidth = 2.6;
  g.stroke();
  // Head, a buff crown and the yellow beak
  g.beginPath();
  g.ellipse(hx, hy, 2.6, 2.2, down ? 1 : 0, 0, TAU);
  outlined(g, BIRD.egretWhite, 1);
  g.fillStyle = BIRD.egretBuff;
  g.beginPath();
  g.ellipse(hx - 0.6, hy - (down ? 0.2 : 1.2), 1.5, 0.9, down ? 1 : -0.2, 0, TAU);
  g.fill();
  g.save();
  g.translate(hx, hy);
  if (down) g.rotate(1.25);
  g.beginPath();
  g.moveTo(2, -0.9);
  g.lineTo(6.6, 0.1);
  g.lineTo(2, 0.9);
  g.closePath();
  outlined(g, BIRD.beak, 0.8);
  eye(g, 0.6, -0.4, 0.75);
  if (fufu) carried(g, 6.4, 0.6);
  g.restore();
}

/**
 * The cattle egret: white, long neck, yellow beak, long legs, a calm round eye. (x, y) is
 * where its feet meet the road; its box is 16 wide and 28 tall above that.
 * 'peck': head down to the road, then up (2 frames). 'hop': a little 6 u hop drawn while
 * its box stays on the road (2 frames). 'fly': flying off, wings up then down, legs trailing
 * (2 frames). `time` in seconds.
 */
export function drawEgret(g: CanvasRenderingContext2D, x: number, y: number, mode: BirdMode, time: number, look: BirdLook = {}): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  g.save();
  g.translate(x, y);
  g.scale(look.facing === 1 ? 1 : -1, 1);
  const fufu = look.fufu === true;
  if (mode === 'fly') {
    egretFlying(g, frame(time, 5, look.still), fufu);
  } else if (mode === 'hop') {
    const f = frame(time, 3, look.still);
    const lift = f === 1 ? 6 : 0;
    leg(g, -0.5, -12 - lift, f === 1 ? -2.6 : -1.8, -lift, BIRD.egretLeg);
    leg(g, 1, -12 - lift, f === 1 ? 2.4 : 2, -lift, BIRD.egretLeg);
    egretBody(g, -lift);
    egretHead(g, -lift, false, fufu);
  } else {
    // Peck (and any other ground mode): standing, head up then down
    const down = frame(time, 2.5, look.still) === 1;
    leg(g, -0.5, -12, -1.8, 0, BIRD.egretLeg);
    leg(g, 1, -12, 2, 0, BIRD.egretLeg);
    egretBody(g, 0);
    egretHead(g, 0, down && !fufu, fufu);
  }
  g.restore();
}

/** The egret flying off: body level, neck folded, legs trailing back, broad white wings. */
function egretFlying(g: CanvasRenderingContext2D, f: 0 | 1, fufu: boolean): void {
  // Legs trailing behind
  leg(g, -6, -16, -15, -14, BIRD.egretLeg, false);
  // Far wing
  wing(g, -1, -18, f, BIRD.egretShade, 14);
  egretBody(g, -2);
  // Neck folded back onto the shoulders, head forward
  g.beginPath();
  g.ellipse(6, -21.6, 2.6, 2.2, 0, 0, TAU);
  outlined(g, BIRD.egretWhite, 1);
  g.beginPath();
  g.moveTo(8, -22.4);
  g.lineTo(12.6, -21.4);
  g.lineTo(8, -20.6);
  g.closePath();
  outlined(g, BIRD.beak, 0.8);
  eye(g, 6.6, -22.2, 0.75);
  if (fufu) carried(g, 12.4, -20.8);
  // Near wing
  wing(g, 0, -18, f, BIRD.egretWhite, 16);
}

/** A broad wing from the shoulder (x, y): frame 0 raised, frame 1 lowered. */
function wing(g: CanvasRenderingContext2D, x: number, y: number, f: 0 | 1, fill: string, span: number): void {
  const up = f === 0;
  const tipY = up ? y - span * 0.85 : y + span * 0.55;
  g.beginPath();
  g.moveTo(x + 3, y);
  g.quadraticCurveTo(x + 2, tipY + (up ? 4 : -4), x - span * 0.45, tipY);
  // Three feather points along the trailing edge
  g.lineTo(x - span * 0.35, tipY + (up ? 3 : -3));
  g.lineTo(x - span * 0.55, tipY + (up ? 4.4 : -4.4));
  g.lineTo(x - span * 0.45, tipY + (up ? 7 : -7));
  g.quadraticCurveTo(x - 5, y + (up ? -2 : 2), x - 4, y + 0.6);
  g.closePath();
  outlined(g, fill);
}

/* ------------------------------------------------------------------- crow */

/**
 * The pied crow: black with a white chest band, stout, wings out and flapping slowly. (x, y)
 * is the bottom middle of its box (S2.16: 22 wide, 14 tall, bottom 20 u above the road, so
 * y = groundY - 20). 'hover': flapping in place over the pile with a drawn bob of 2 u once a
 * second (the box never moves). 'fly': flying off, body tilted up. `time` in seconds.
 */
export function drawCrow(g: CanvasRenderingContext2D, x: number, y: number, mode: BirdMode, time: number, look: BirdLook = {}): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const still = look.still === true;
  const bob = mode === 'fly' || still ? 0 : Math.sin((Number.isFinite(time) ? time : 0) * TAU) * 1;
  const f = frame(time, mode === 'fly' ? 5 : 3, still);
  g.save();
  g.translate(x, y - 7 + bob);
  g.scale(look.facing === 1 ? 1 : -1, 1);
  if (mode === 'fly') g.rotate(-0.4);
  // Feet tucked under (holding a ball when it caught one)
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-1, 3.6);
  g.lineTo(-2, 6);
  g.moveTo(1.4, 3.8);
  g.lineTo(0.6, 6.2);
  g.stroke();
  if (look.fufu) carried(g, -0.4, 8.4);
  // Far wing
  crowWing(g, -1, -2, f, BIRD.crowSheen, 12);
  // Tail: a short wedge
  g.beginPath();
  g.moveTo(-6, -1);
  g.lineTo(-12.4, 1.2);
  g.lineTo(-12, 3.4);
  g.lineTo(-5.4, 2.6);
  g.closePath();
  outlined(g, BIRD.crowBlack);
  // Stout body
  g.beginPath();
  g.ellipse(-0.6, 0, 7.4, 4.6, -0.12, 0, TAU);
  outlined(g, BIRD.crowBlack);
  // White chest band round the breast and the back of the neck
  g.beginPath();
  g.moveTo(2.4, -4.2);
  g.quadraticCurveTo(-0.6, -1, 2.2, 4);
  g.quadraticCurveTo(5.6, 3.4, 6.8, 0.4);
  g.quadraticCurveTo(6.6, -3.2, 2.4, -4.2);
  g.closePath();
  outlined(g, BIRD.crowWhite, 0.9);
  // Head, thick dark beak, calm eye
  g.beginPath();
  g.arc(7.4, -3.4, 3.4, 0, TAU);
  outlined(g, BIRD.crowBlack);
  g.beginPath();
  g.moveTo(9.8, -4.6);
  g.quadraticCurveTo(13, -4.2, 14.4, -2.6);
  g.lineTo(10, -1.6);
  g.closePath();
  outlined(g, BIRD.crowBeak, 0.9);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(8.2, -4.2, 1.15, 0, TAU);
  g.fill();
  eye(g, 8.3, -4.2, 0.75);
  // Near wing, held out
  crowWing(g, 0, -2, f, BIRD.crowBlack, 13);
  g.restore();
}

/** A crow wing out from the shoulder: frame 0 raised, frame 1 level and down a little. Fingered tip. */
function crowWing(g: CanvasRenderingContext2D, x: number, y: number, f: 0 | 1, fill: string, span: number): void {
  const up = f === 0;
  const tipX = x - span * 0.5;
  const tipY = up ? y - span * 0.8 : y + span * 0.25;
  g.beginPath();
  g.moveTo(x + 3, y);
  g.quadraticCurveTo(x + 1, (y + tipY) / 2 - (up ? 2 : 0), tipX + 2, tipY);
  // Three short "finger" feathers at the tip
  for (let i = 0; i < 3; i++) {
    const d = up ? i * 1.8 : -i * 1.2;
    g.lineTo(tipX - 2 - i * 0.6, tipY + d);
    g.lineTo(tipX + 0.4 - i * 0.6, tipY + d + (up ? 1.2 : -1));
  }
  g.quadraticCurveTo(x - 4, y + (up ? -1 : 2.4), x - 3, y + 1);
  g.closePath();
  outlined(g, fill);
}

/* ------------------------------------------------------------ rubbish pile */

/** Pile colours: tied sacks, a woven basket, a green bin with painted words. */
export const PILE = {
  sack: '#e6dcc4',
  sackShade: '#c7b994',
  sackBlue: '#7aa3c9',
  basket: '#c08a45',
  basketLine: '#8a5a26',
  bin: '#2f8a4a',
  binDark: '#226a38',
  words: '#ffffff',
  /** About this wide in all, centred on its x. */
  w: 50,
} as const;

/**
 * The rubbish pile waiting for collection (S2.16 B1): tied sacks and a woven basket next to
 * a green bin painted "PLEASE USE THE BIN". Neat, scenery only (never solid, never hurts):
 * no flies, no smell lines, no rats, no joke. Its foot is at (x, groundY), at the back edge of
 * the road. Not drawn in the fixed look (the birds peck on clean pavement there).
 */
export function drawRubbishPile(g: CanvasRenderingContext2D, x: number, groundY = 300): void {
  if (!Number.isFinite(x) || !Number.isFinite(groundY)) return;
  g.save();
  g.translate(x, groundY);
  // The bin, at the right
  const bx = 8;
  g.beginPath();
  g.moveTo(bx, -26);
  g.lineTo(bx + 18, -26);
  g.lineTo(bx + 16.6, 0);
  g.lineTo(bx + 1.4, 0);
  g.closePath();
  outlined(g, PILE.bin, 1.2);
  g.beginPath();
  g.moveTo(bx - 1, -26);
  g.lineTo(bx + 19, -26);
  g.lineTo(bx + 19, -29);
  g.quadraticCurveTo(bx + 9, -31, bx - 1, -29);
  g.closePath();
  outlined(g, PILE.binDark, 1.2);
  g.fillStyle = PILE.words;
  g.font = 'bold 3.6px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PLEASE', bx + 9, -19.5);
  g.fillText('USE THE', bx + 9, -15);
  g.fillText('BIN', bx + 9, -10.5);
  // A woven basket, at the left
  g.beginPath();
  g.moveTo(-26, -13);
  g.lineTo(-14, -13);
  g.lineTo(-15.4, 0);
  g.lineTo(-24.6, 0);
  g.closePath();
  outlined(g, PILE.basket, 1.1);
  g.strokeStyle = PILE.basketLine;
  g.lineWidth = 0.7;
  g.beginPath();
  for (const yy of [-9.6, -6.2, -2.8]) {
    g.moveTo(-25.6, yy);
    g.lineTo(-14.6, yy);
  }
  for (const xx of [-22.6, -20, -17.4]) {
    g.moveTo(xx, -12.6);
    g.lineTo(xx + 0.3, -0.4);
  }
  g.stroke();
  // Tied sacks, in the middle
  sack(g, -6, 0, 8.6, 13, PILE.sack, PILE.sackShade);
  sack(g, 3, 0, 6.6, 10, PILE.sackBlue, '#5a83a8');
  sack(g, -2, -9, 6, 9, PILE.sack, PILE.sackShade);
  g.restore();
}

/** One tied sack: a rounded bag with a knot on top. (x, y) its bottom middle. */
function sack(g: CanvasRenderingContext2D, x: number, y: number, rx: number, h: number, fill: string, shade: string): void {
  g.beginPath();
  g.moveTo(x - rx, y);
  g.quadraticCurveTo(x - rx - 1, y - h * 0.8, x - 1.4, y - h);
  g.lineTo(x + 1.4, y - h);
  g.quadraticCurveTo(x + rx + 1, y - h * 0.8, x + rx, y);
  g.closePath();
  outlined(g, fill);
  g.strokeStyle = shade;
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x - rx * 0.4, y - 1.2);
  g.quadraticCurveTo(x - rx * 0.5, y - h * 0.5, x - 0.6, y - h + 1.6);
  g.stroke();
  // The knot
  g.beginPath();
  g.moveTo(x - 1.4, y - h);
  g.lineTo(x - 2.6, y - h - 2.4);
  g.lineTo(x, y - h - 1.2);
  g.lineTo(x + 2.6, y - h - 2.4);
  g.lineTo(x + 1.4, y - h);
  g.closePath();
  outlined(g, fill, 0.9);
}

/**
 * The 2 kobo that pop out of the pile when the hero bounces on a bird (S2.16 B1): two coins
 * hop up out of (x, y) and apart. k 0 to 1 over about 0.5 s; draws nothing after 1.
 * The game then flies them to the counter as usual.
 */
export function drawPileKoboPop(g: CanvasRenderingContext2D, x: number, y: number, k: number, time: number): void {
  if (!(k < 1) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = Math.max(0, k);
  for (const s of [-1, 1]) {
    const px = x + s * (4 + t * 12);
    const py = y - Math.sin(Math.min(1, t * 1.2) * Math.PI) * 18 - t * 6;
    drawKobo(g, px, py, (Number.isFinite(time) ? time : 0) + (s > 0 ? 0.2 : 0));
  }
}
