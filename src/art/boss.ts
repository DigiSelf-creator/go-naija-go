/**
 * General Go-Slow: a PROBLEM, not a person. A heap of stuck cars under one grumpy
 * traffic light with a cartoon face. No uniform, cap, medals, flag, party colours,
 * and no faces in the cars. Nothing breaks and nobody is hurt: on defeat the light
 * turns green and smiles and the cars simply drive off.
 *
 * World space. (x, groundY) is the bottom centre of the heap.
 */
import * as P from './palette';

const TAU = Math.PI * 2;

export type BossMode = 'idle' | 'hit' | 'attack' | 'defeat';

export interface BossState {
  mode: BossMode;
  /** Seconds since this mode started. */
  t: number;
  /** Hits taken so far, 0 to 3. In 'hit' mode this already counts the new hit. */
  hits: number;
  /** Running clock in seconds, for idle wobble. */
  time: number;
  /**
   * What the attack pose is about to throw (Go-Slow Hall, S2.7). 'high' (the high "PEEP!"
   * honk): the honk marks pop out round the light at the top, so the player sees a high throw
   * is coming. Anything else, or missing: the marks low round the heap, as in slice 1.
   */
  aim?: 'low' | 'high' | undefined;
}

/** About how wide and tall the boss is, for camera and layout. */
export const BOSS_W = 140;
export const BOSS_H = 172;

interface CarSpot {
  x: number;
  y: number;
  rot: number;
  w: number;
  colour: string;
}

const C = P.CAR_COLOURS;
const CARS: readonly CarSpot[] = [
  { x: -44, y: 0, rot: 0, w: 44, colour: C[0] },
  { x: 0, y: 0, rot: 0, w: 46, colour: C[1] },
  { x: 44, y: 0, rot: 0, w: 44, colour: C[2] },
  { x: -22, y: -23, rot: 0.1, w: 42, colour: C[3] },
  { x: 24, y: -22, rot: -0.12, w: 42, colour: C[4] },
  { x: 2, y: -45, rot: 0.18, w: 40, colour: C[5] },
];
/** Which car leaves on each hit (top first), then the rest on defeat. */
const LEAVE_ORDER = [5, 4, 3, 0, 1, 2] as const;

function drawCar(g: CanvasRenderingContext2D, w: number, colour: string): void {
  // Wheels on y = 0, front to the right. No face.
  const h = w / 2;
  g.fillStyle = colour;
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-h * 0.55, -12);
  g.lineTo(-h * 0.3, -21);
  g.lineTo(h * 0.35, -21);
  g.lineTo(h * 0.65, -12);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.roundRect(-h, -13, w, 10, 3);
  g.fill();
  g.stroke();
  g.fillStyle = P.BUS_GLASS;
  g.fillRect(-h * 0.35, -19, h * 0.3, 6);
  g.fillRect(h * 0.05, -19, h * 0.3, 6);
  g.fillStyle = '#fff3b0';
  g.fillRect(h - 3, -11, 3, 3);
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(-h * 0.55, -3, 4.5, 0, TAU);
  g.arc(h * 0.55, -3, 4.5, 0, TAU);
  g.fill();
}

function honkMarks(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - 4, y);
  g.lineTo(x - 1, y - 4);
  g.lineTo(x + 2, y);
  g.lineTo(x + 5, y - 4);
  g.stroke();
}

type Face = 'grumpy' | 'wince' | 'honk' | 'sigh' | 'happy';

function drawLightBox(g: CanvasRenderingContext2D, lit: 'red' | 'amber' | 'green' | 'none', face: Face): void {
  // Housing centred on x = 0, from y -84 (top) to 0 (bottom)
  g.fillStyle = P.LIGHT_BOX;
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-18, -84, 36, 84, 7);
  g.fill();
  g.stroke();
  // Face panel
  g.fillStyle = '#f3e3b0';
  g.beginPath();
  g.roundRect(-14, -80, 28, 24, 5);
  g.fill();

  g.strokeStyle = P.INK;
  g.fillStyle = P.INK;
  g.lineWidth = 1.8;
  g.lineCap = 'round';
  g.beginPath();
  switch (face) {
    case 'grumpy':
    case 'honk':
      // Brows slanted down to the middle, small eyes
      g.moveTo(-10, -76);
      g.lineTo(-3, -73);
      g.moveTo(10, -76);
      g.lineTo(3, -73);
      g.stroke();
      g.beginPath();
      g.arc(-6, -70, 1.6, 0, TAU);
      g.arc(6, -70, 1.6, 0, TAU);
      g.fill();
      g.beginPath();
      if (face === 'grumpy') {
        g.arc(0, -59, 5, Math.PI * 1.2, Math.PI * 1.8);
        g.stroke();
      } else {
        g.arc(0, -62.5, 3.2, 0, TAU);
        g.fill();
      }
      break;
    case 'wince':
      g.moveTo(-9, -73);
      g.lineTo(-4, -70);
      g.lineTo(-9, -67);
      g.moveTo(9, -73);
      g.lineTo(4, -70);
      g.lineTo(9, -67);
      g.moveTo(-6, -61);
      g.lineTo(-3, -63);
      g.lineTo(0, -61);
      g.lineTo(3, -63);
      g.lineTo(6, -61);
      g.stroke();
      break;
    case 'sigh':
      g.arc(-6, -71, 2.5, 0.1, Math.PI - 0.1);
      g.moveTo(8.5, -71);
      g.arc(6, -71, 2.5, 0.1, Math.PI - 0.1);
      g.stroke();
      g.beginPath();
      g.arc(0, -62, 1.8, 0, TAU);
      g.fill();
      break;
    case 'happy':
      g.arc(-6, -69, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      g.moveTo(8.5, -70);
      g.arc(6, -69, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      g.beginPath();
      g.arc(0, -64, 5, 0.15, Math.PI - 0.15);
      g.stroke();
      break;
  }

  // Three lamps
  const lamps: readonly ['red' | 'amber' | 'green', string, number][] = [
    ['red', P.LIGHT_RED, -45],
    ['amber', P.LIGHT_AMBER, -29],
    ['green', P.GREEN_GO, -13],
  ];
  for (const [name, colour, y] of lamps) {
    g.fillStyle = name === lit ? colour : P.LIGHT_OFF;
    g.beginPath();
    g.arc(0, y, 6.5, 0, TAU);
    g.fill();
    if (name === lit) {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(-2, y - 2, 1.8, 0, TAU);
      g.fill();
    }
  }
}

export function drawBoss(g: CanvasRenderingContext2D, x: number, groundY: number, s: BossState): void {
  const { mode, t, time } = s;
  const hits = Math.max(0, Math.min(3, s.hits));
  const shake = mode === 'hit' && t < 0.5 ? Math.sin(t * 70) * 2.5 : 0;
  const wobble = Math.sin(time * 2) * 1.2;

  g.save();
  g.translate(x + shake, groundY);

  // Pole and light: waves on defeat
  const happy = mode === 'defeat' && t >= 1.4;
  g.save();
  if (happy) g.rotate(Math.sin((t - 1.4) * 5) * 0.1);
  g.fillStyle = '#6b7480';
  g.strokeStyle = P.INK;
  g.lineWidth = 1.2;
  g.fillRect(-3, -86, 6, 86);
  g.strokeRect(-3, -86, 6, 86);
  g.translate(0, -76 + (mode === 'idle' ? wobble : 0));
  let lit: 'red' | 'amber' | 'green' | 'none' = 'red';
  let face: Face = 'grumpy';
  if (mode === 'hit' && t < 0.8) {
    lit = 'amber';
    face = 'wince';
  } else if (mode === 'attack') {
    face = 'honk';
  } else if (mode === 'defeat') {
    if (t < 1.4) {
      lit = Math.floor(t / 0.2) % 2 === 0 ? 'amber' : 'none';
      face = 'sigh';
    } else {
      lit = 'green';
      face = 'happy';
    }
  }
  drawLightBox(g, lit, face);
  g.restore();

  // Sigh puff during the blink
  if (mode === 'defeat' && t > 0.5 && t < 1.5) {
    const u = (t - 0.5) / 1;
    g.globalAlpha = 1 - u;
    g.fillStyle = P.WHITE;
    g.beginPath();
    g.arc(22 + u * 12, -150 - u * 10, 5 + u * 4, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  // Cars
  for (let k = LEAVE_ORDER.length - 1; k >= 0; k--) {
    const idx = LEAVE_ORDER[k];
    if (idx === undefined) continue;
    const car = CARS[idx];
    if (!car) continue;
    let leaveT = -1; // < 0: still stuck
    if (k < hits) {
      if (mode === 'hit' && k === hits - 1) leaveT = t;
      else continue; // already gone
    }
    if (mode === 'defeat' && k >= 3) {
      const start = 1.6 + (k - 3) * 0.45;
      if (t > start) leaveT = t - start;
    }
    let cx = car.x;
    let cy = car.y;
    let rot = car.rot;
    if (leaveT >= 0) {
      const settle = Math.min(1, leaveT / 0.3);
      cy = car.y * (1 - settle);
      rot = car.rot * (1 - settle);
      cx = car.x + Math.max(0, leaveT - 0.3) * 260;
      if (cx > 420) continue;
    } else if (mode !== 'defeat') {
      cy += idx >= 3 ? wobble * 0.5 : 0;
    }
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    drawCar(g, car.w, car.colour);
    g.restore();
    if (leaveT >= 0 && mode === 'defeat' && leaveT < 1.2) {
      // Happy two-note honk as it goes
      g.fillStyle = P.INK;
      g.font = 'bold 9px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('pom pom', cx, cy - 30);
    }
  }

  // Cross honking after a hit, and while attacking (a high honk: marks up round the light)
  if (mode === 'attack' && t < 0.4 && s.aim === 'high') {
    honkMarks(g, -30, -150);
    honkMarks(g, 30, -156);
    honkMarks(g, -26, -128);
    honkMarks(g, 26, -134);
  } else if ((mode === 'hit' && t < 0.8) || (mode === 'attack' && t < 0.4)) {
    honkMarks(g, -50, -30);
    honkMarks(g, 40, -32);
    honkMarks(g, 10, -72);
  }
  g.restore();
}

/** Honk cloud thrown at head height: a puff with the word in it. Moves left. */
export function drawHonkCloud(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const puff = 1 + Math.sin(time * 12) * 0.05;
  const blobs: readonly [number, number, number][] = [[-14, 2, 9], [-4, -6, 11], [9, -5, 10], [16, 3, 8], [1, 5, 10]];
  g.save();
  g.translate(x, y);
  g.scale(puff, puff);
  g.fillStyle = P.INK;
  g.beginPath();
  for (const [bx, by, r] of blobs) {
    g.moveTo(bx + r + 1.5, by);
    g.arc(bx, by, r + 1.5, 0, TAU);
  }
  g.fill();
  g.fillStyle = '#fdf1d6';
  g.beginPath();
  for (const [bx, by, r] of blobs) {
    g.moveTo(bx + r, by);
    g.arc(bx, by, r, 0, TAU);
  }
  g.fill();
  g.fillStyle = '#c0392b';
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('POOO!', 1, 0);
  // Sound lines on the leading (left) side
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(-20, 0, 8, Math.PI * 0.75, Math.PI * 1.25);
  g.stroke();
  g.beginPath();
  g.arc(-17, 0, 14, Math.PI * 0.8, Math.PI * 1.2);
  g.stroke();
  g.restore();
}

/** About how big the high honk drawing is (its hurt box in S2.7 is 36 x 20). */
export const HIGH_HONK_W = 48;
export const HIGH_HONK_H = 22;

/**
 * The high honk (Go-Slow Hall, phase 3): a long, thin, pale blue cloud with "PEEP!" in it,
 * thrown at head height of a hero on a light. Told apart from the round cream "POOO!" cloud by
 * shape (long and flat, pointed ends), word and colour. Centred on (x, y); moves left. A
 * still drawing for reduced motion: pass time 0.
 */
export function drawHighHonk(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  const quiver = Math.sin(t * 30) * 0.6;
  g.save();
  g.translate(x, y + quiver);
  // A long flat cloud: pointed ends, small bumps along the top and bottom
  const path = (grow: number): void => {
    g.beginPath();
    g.moveTo(-24 - grow, 0);
    for (let i = 0; i < 4; i++) {
      const x0 = -16 + i * 10;
      g.quadraticCurveTo(x0 - 5, -10 - grow, x0, -8 - grow);
      g.quadraticCurveTo(x0 + 5, -12 - grow, x0 + 6, -7 - grow);
    }
    g.lineTo(24 + grow, 0);
    for (let i = 3; i >= 0; i--) {
      const x0 = -14 + i * 10;
      g.quadraticCurveTo(x0 + 5, 11 + grow, x0, 8 + grow);
      g.quadraticCurveTo(x0 - 5, 11 + grow, x0 - 6, 7 + grow);
    }
    g.closePath();
  };
  path(1.4);
  g.fillStyle = P.INK;
  g.fill();
  path(0);
  g.fillStyle = '#dcefff';
  g.fill();
  g.fillStyle = '#2d2a8c';
  g.font = 'bold 10px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PEEP!', 0, 0.5, 40);
  // Thin, sharp sound lines on the leading (left) side: little chevrons, not round arcs
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  g.beginPath();
  for (const dx of [0, 5]) {
    g.moveTo(-26 - dx + 4, -6);
    g.lineTo(-26 - dx, 0);
    g.lineTo(-26 - dx + 4, 6);
  }
  g.stroke();
  g.restore();
}

/** Thrown things pop into dust after a hit. t 0 to 1 over about 0.35 s. */
export function drawDustPop(g: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  if (t >= 1) return;
  g.globalAlpha = 1 - t;
  g.fillStyle = '#d9c9a3';
  for (let i = 0; i < 5; i++) {
    const a = i * (TAU / 5) + 0.3;
    const r = 4 + t * 14;
    g.beginPath();
    g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 5 * (1 - t) + 2, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

export type GoLightState = 'off' | 'lit' | 'done';

/** S2.14 part 3: a green light warns in its last second before it goes dark. */
export const GO_LIGHT_END = {
  /** Seconds of green left when the warning starts. */
  warn: 1.0,
  /** Blinks a second (never faster). */
  perSecond: 2,
} as const;

/**
 * The end of a green light (S2.14 part 3). left = seconds of green left; still = reduced motion.
 * Leave it out while the light is not ending.
 */
export interface GoLightEnd {
  left: number;
  still?: boolean;
}

/**
 * In the last GO_LIGHT_END.warn seconds: true while the lamps show (each blink is half lit,
 * half dark). Always true before the warning, and always true with reduced motion (no blink).
 */
export function goLightBlinkOn(left: number, still = false): boolean {
  if (still || !Number.isFinite(left) || left > GO_LIGHT_END.warn || left <= 0) return true;
  const into = GO_LIGHT_END.warn - left; // 0 at the start of the warning
  return Math.floor(into * GO_LIGHT_END.perSecond * 2) % 2 === 1;
}

/**
 * Seconds of green left at which to play 'lightTick' (one per blink, as the lamps go dark):
 * [1.0, 0.5]. With reduced motion the ticks still play at the same times.
 */
export function goLightTickTimes(): number[] {
  const n = Math.round(GO_LIGHT_END.warn * GO_LIGHT_END.perSecond);
  return Array.from({ length: n }, (_, i) => GO_LIGHT_END.warn - i / GO_LIGHT_END.perSecond);
}

/**
 * A light platform in the arena. [x, topY, w] as in the level data (x is the left
 * edge). Lit = green lamps PLUS a bouncing down arrow with the word GO, so the
 * meaning never rests on colour alone. Done = the light goes dark (lamps off, the same as
 * an unlit light) with a small grey tick, so only the next lit light reads as the target.
 *
 * end (S2.14): pass it while a lit light is in its last second. The lamps blink 2 times a
 * second and the arrow stops bouncing; with end.still (reduced motion) nothing blinks, the
 * arrow hides and "GO" stays. A light that went dark again is plain 'off'.
 */
export function drawGoLight(g: CanvasRenderingContext2D, x: number, topY: number, w: number, state: GoLightState, time: number, groundY = 300, end?: GoLightEnd): void {
  const mid = x + w / 2;
  const ending = state === 'lit' && end !== undefined && Number.isFinite(end.left) && end.left <= GO_LIGHT_END.warn;
  const still = ending && end.still === true;
  const lampsOn = state === 'lit' && (!ending || goLightBlinkOn(end.left, still));
  // Pole
  g.fillStyle = '#6b7480';
  g.fillRect(mid - 3, topY + 14, 6, groundY - topY - 14);
  // Housing (the landing surface is its top edge)
  g.fillStyle = P.LIGHT_BOX;
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, topY, w, 14, 5);
  g.fill();
  g.stroke();
  const lampCol = lampsOn ? P.GREEN_GO : P.LIGHT_OFF;
  for (let i = 0; i < 3; i++) {
    const lx = x + w * (0.22 + i * 0.28);
    g.fillStyle = lampCol;
    g.beginPath();
    g.arc(lx, topY + 7, 4.5, 0, TAU);
    g.fill();
  }
  if (state === 'done') {
    // A small grey tick: used up, not a target.
    g.strokeStyle = P.TICK_GREY;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(mid - 4, topY - 7);
    g.lineTo(mid - 1, topY - 4);
    g.lineTo(mid + 4, topY - 10);
    g.stroke();
  }
  if (state === 'lit' && still) {
    // Reduced motion, last second: the arrow hides, the word GO stays (on a small green tag).
    const by = topY - 18;
    g.fillStyle = P.GREEN_GO;
    g.strokeStyle = P.INK;
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(mid - 13, by - 8, 26, 16, 5);
    g.fill();
    g.stroke();
    g.fillStyle = P.WHITE;
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('GO', mid, by + 0.5);
    return;
  }
  if (state === 'lit') {
    // The arrow bounces while the light is fresh and holds still in its last second.
    const by = topY - 34 + (ending ? 0 : Math.abs(Math.sin(time * 5)) * -8);
    g.fillStyle = P.GREEN_GO;
    g.strokeStyle = P.INK;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(mid - 12, by - 8);
    g.lineTo(mid + 12, by - 8);
    g.lineTo(mid + 12, by + 6);
    g.lineTo(mid + 18, by + 6);
    g.lineTo(mid, by + 22);
    g.lineTo(mid - 18, by + 6);
    g.lineTo(mid - 12, by + 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = P.WHITE;
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('GO', mid, by + 1);
  }
}

/** Boss hit counter: three circles that fill with a tick. Centre at (x, y). */
export function drawHitCounter(g: CanvasRenderingContext2D, x: number, y: number, hits: number): void {
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * 22;
    g.fillStyle = i < hits ? P.GREEN_GO : 'rgba(255,255,255,0.7)';
    g.strokeStyle = P.INK;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, y, 8, 0, TAU);
    g.fill();
    g.stroke();
    if (i < hits) {
      g.strokeStyle = P.WHITE;
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - 4, y);
      g.lineTo(cx - 1, y + 3);
      g.lineTo(cx + 4, y - 3);
      g.stroke();
    }
  }
}
