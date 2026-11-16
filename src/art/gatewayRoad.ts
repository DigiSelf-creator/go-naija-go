/**
 * The small gateway arch and the "To Ogun" road branch (docs/ogun.md 1.2; art O1a), split from
 * ./gateway so they load with the road screen and the Ogun part, not with the first page (qa O2:
 * first-load size). ./gateway keeps the icons and colours the menus need at once.
 */
import { INK } from './palette';
import { GATE_COLOURS } from './gateway';

/** The "To Ogun" plate's box on the road (road units, docs/ogun.md 1.2 item 2). */
export const OGUN_STOP_BOX = { x: 484, y: 4, w: 112, h: 64 } as const;
/** Where the branch leaves the main road, in the gap between the hall and Ferry plates. */
export const OGUN_BRANCH_X = 540;

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
}

/**
 * The small gateway (for the road branch and the stop card), base centre at (cx, y), about
 * 44 x 28 units at s = 1. lit: bright colours, else faded. The full arch is ogunGate's drawGateArch.
 */
export function drawMiniArch(g: CanvasRenderingContext2D, cx: number, y: number, s: number, lit: boolean): void {
  const c = lit ? GATE_COLOURS.bright : GATE_COLOURS.faded;
  g.save();
  g.translate(cx, y);
  g.scale(s, s);
  for (const px of [-19, 13]) {
    box(g, px, -20, 6, 20, c.pillar, 1);
    g.fillStyle = c.cloth;
    for (let k = 0; k < 3; k++) {
      g.fillRect(px + 0.5, -17 + k * 6, 5, 1.2);
      g.fillRect(px + 2.4, -14.6 + k * 6, 1.3, 1.3);
    }
  }
  box(g, -22, -27, 44, 7, c.beam, 1);
  g.fillStyle = c.words;
  g.fillRect(-18, -24.4, 12, 1.6);
  g.fillRect(6, -24.4, 12, 1.6);
  g.fillStyle = c.cog;
  g.strokeStyle = c.cogEdge;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    const r = k % 2 ? 3 : 4.4;
    g.lineTo(Math.cos(a) * r, -23.5 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

/**
 * The "To Ogun" side road on the challenge road picture (road units). Paint it after
 * drawRoadPicture and before the plates. It climbs from the main road up to OGUN_STOP_BOX under
 * a small gateway arch. open: Go-Slow Hall is won (painted arrow; else a striped barrier).
 * lit: King Pothole is beaten (the arch bright; else faded). A still picture.
 */
export function drawOgunBranch(g: CanvasRenderingContext2D, open: boolean, lit = false): void {
  const x = OGUN_BRANCH_X;
  g.save();
  g.fillStyle = '#66666d';
  g.strokeStyle = '#f4efe0';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - 10, 128);
  g.quadraticCurveTo(x - 13, 96, x - 9, 62);
  g.lineTo(x + 9, 62);
  g.quadraticCurveTo(x + 13, 96, x + 10, 128);
  g.fill();
  g.stroke();
  if (open) {
    // A white arrow painted on the tarmac, pointing up the branch
    g.strokeStyle = '#f4f1e6';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, 124);
    g.lineTo(x, 106);
    g.moveTo(x - 4.5, 111);
    g.lineTo(x, 105);
    g.lineTo(x + 4.5, 111);
    g.stroke();
  } else {
    // A plain red-and-white striped barrier on two short posts across the branch
    box(g, x - 14, 110, 2.5, 10, '#5d6670');
    box(g, x + 11.5, 110, 2.5, 10, '#5d6670');
    box(g, x - 15, 108, 30, 4, '#ffffff', 1);
    g.fillStyle = '#d65a4a';
    for (let k = 0; k < 5; k += 2) g.fillRect(x - 15 + k * 6, 108, 6, 4);
  }
  drawMiniArch(g, x, 92, 0.76, lit);
  g.restore();
}
