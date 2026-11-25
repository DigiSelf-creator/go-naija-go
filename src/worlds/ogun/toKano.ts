/**
 * The "To Kano" stop on Ogun's challenge road (docs/kano.md 1.2 item 2, 1.4; art K1a): a small
 * Kano gate for the stop's picture, a 16 px plate icon, and the stop card's picture. It sits in
 * the Ogun part because Ogun's road draws it; it imports nothing (not the Kano part, which is
 * fetched only when the player goes there, and no first-load value). Colours match
 * src/worlds/kano/gate.ts. No crest, script or palace; no words.
 */
const INK = '#1d1a14';
const TAU = Math.PI * 2;
const LOOK = {
  faded: { wall: '#b98670', dark: '#91644f', door: '#9c8268', board: '#f1e6cc', cog: '#cdb994', cogEdge: '#8a7a5c' },
  bright: { wall: '#c8583a', dark: '#933b25', door: '#2f8a6e', board: '#fff3d6', cog: '#f4a62a', cogEdge: '#7a4e0e' },
} as const;

/**
 * The small Kano gate, base centre at (cx, y), about 52 x 34 units at s = 1: a short stretch of
 * the red wall with triangles on top, the round-topped gateway with its doors open, and the board
 * on its post with a tiny cog. lit: Rusty Borehole is beaten (bright), else faded.
 */
export function drawMiniKanoGate(g: CanvasRenderingContext2D, cx: number, y: number, s: number, lit: boolean): void {
  const c = LOOK[lit ? 'bright' : 'faded'];
  g.save();
  g.translate(cx, y);
  g.scale(s, s);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.lineJoin = 'round';
  g.fillStyle = c.wall;
  g.beginPath();
  for (let x = -22; x <= 22; x += 6) {
    const top = Math.abs(x) <= 10 ? -24 : -15;
    g.moveTo(x - 2.2, top + 0.5);
    g.lineTo(x, top - 3);
    g.lineTo(x + 2.2, top + 0.5);
  }
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(-26, 0);
  g.lineTo(-26, -15);
  g.lineTo(-12, -15);
  g.lineTo(-12, -22);
  g.quadraticCurveTo(-12, -24, -10, -24);
  g.lineTo(10, -24);
  g.quadraticCurveTo(12, -24, 12, -22);
  g.lineTo(12, -15);
  g.lineTo(26, -15);
  g.lineTo(26, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = c.dark;
  g.fillRect(-26, -2, 52, 2);
  // The gateway (sand beyond), the doors open against its sides
  g.fillStyle = lit ? '#f7dc9c' : '#eed9ae';
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(-6, -12);
  g.arc(0, -12, 6, Math.PI, 0);
  g.lineTo(6, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = c.door;
  g.fillRect(-6, -12, 2.4, 12);
  g.fillRect(3.6, -12, 2.4, 12);
  // The board on its post, in front at the left, and its cog
  g.fillStyle = '#6b4a2e';
  g.fillRect(-19.5, -19, 1.6, 20);
  g.fillStyle = c.board;
  g.fillRect(-25, -27, 13, 8);
  g.strokeRect(-25, -27, 13, 8);
  g.fillStyle = INK;
  g.fillRect(-23, -25, 9, 1.2);
  g.fillRect(-22, -22.4, 7, 0.9);
  g.fillStyle = c.cog;
  g.strokeStyle = c.cogEdge;
  g.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    const r = k % 2 ? 2.2 : 3.2;
    g.lineTo(-18.5 + Math.cos(a) * r, -30.5 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

/** The plate icon's shapes (16 px box): wall with triangles, round-topped gateway cut out. */
const ICON_WALL = 'M1 15V8.5H4.5V5.5Q4.5 4.5 5.5 4.5H10.5Q11.5 4.5 11.5 5.5V8.5H15V15H10.4V11Q10.4 8.6 8 8.6Q5.6 8.6 5.6 11V15Z';
const ICON_TOPS = 'M1.6 8.5L2.8 6.8L4 8.5ZM12 8.5L13.2 6.8L14.4 8.5ZM5.4 4.5L6.6 2.6L7.8 4.5ZM8.2 4.5L9.4 2.6L10.6 4.5Z';

/** The 16 px "To Kano" icon (the plate once open), top left at (x, y), in the button's ink. Needs Path2D. */
export function drawKanoGateIcon(g: CanvasRenderingContext2D, x: number, y: number, size = 16, ink: string = INK): void {
  if (typeof Path2D === 'undefined') return;
  g.save();
  g.translate(x, y);
  g.scale(size / 16, size / 16);
  g.fillStyle = ink;
  g.fill(new Path2D(ICON_WALL));
  g.fill(new Path2D(ICON_TOPS));
  g.restore();
}

/** The same icon as SVG markup (aria-hidden: the words beside it are spoken). */
export function kanoGateIconSvg(size = 16, ink: string = INK): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="${ICON_WALL}${ICON_TOPS}" fill="${ink}"/></svg>`;
}

/**
 * The "To Kano" stop card's picture at card size (0, 0, w, h): the road north across dry gold
 * grassland with a baobab, running to the small Kano gate under a soft gold sky. A still picture.
 */
export function drawToKanoCard(g: CanvasRenderingContext2D, w: number, h: number, lit = false): void {
  const u = w / 112;
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#8fcbea');
  sky.addColorStop(1, '#f6dca4');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#d8bb7e';
  g.fillRect(0, h * 0.55, w, h * 0.45);
  g.fillStyle = '#c9774a';
  g.fillRect(0, h * 0.74, w, h * 0.26);
  // A baobab on the right
  // A baobab on the right: a fat trunk forking into bare thick branches, small leaf tufts at the tips
  const bx = w * 0.85;
  const by = h * 0.62;
  g.fillStyle = '#9a7a62';
  g.beginPath();
  g.moveTo(bx - 4 * u, by);
  g.quadraticCurveTo(bx - 5 * u, by - 8 * u, bx - 2.5 * u, by - 14 * u);
  g.lineTo(bx + 2.5 * u, by - 14 * u);
  g.quadraticCurveTo(bx + 5 * u, by - 8 * u, bx + 4 * u, by);
  g.fill();
  g.strokeStyle = '#9a7a62';
  g.lineWidth = 1.8 * u;
  g.lineCap = 'round';
  g.beginPath();
  for (const k of [-1, 0, 1]) {
    g.moveTo(bx + k * u, by - 13 * u);
    g.lineTo(bx + k * 7 * u, by - (k ? 19 : 22) * u);
  }
  g.stroke();
  g.fillStyle = '#7f9a4a';
  for (const k of [-1, 0, 1]) {
    g.beginPath();
    g.arc(bx + k * 7 * u, by - (k ? 20 : 23) * u, 2.2 * u, 0, TAU);
    g.fill();
  }
  // The road narrowing to the gate
  g.fillStyle = '#66666d';
  g.beginPath();
  g.moveTo(w * 0.47, h * 0.58);
  g.lineTo(w * 0.53, h * 0.58);
  g.lineTo(w * 0.9, h);
  g.lineTo(w * 0.1, h);
  g.closePath();
  g.fill();
  g.fillStyle = '#f4f1e6';
  for (let k = 0; k < 4; k++) g.fillRect(w / 2 - (0.6 + k) * u * 0.5, h * (0.62 + k * 0.1), (0.6 + k) * u, h * 0.04);
  drawMiniKanoGate(g, w / 2, h * 0.6, 0.75 * u, lit);
  g.restore();
}
