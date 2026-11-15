/**
 * The lane run's people pictures (S3g1a; design.md "People everywhere" part 7): the two-storey
 * fronts with people at the windows and the lantern glow, and the footbridge crowd. Loads with
 * the lane run, not with the first page.
 */
import { drawFolkBust, folkDisc as disc, folkLines as lines, folkMix as mix, folkPart as part, type FolkLook } from './folk';

type G = CanvasRenderingContext2D;

/** Lane run: an adult is this many metres tall, so a sprite's scale is ppm * LANE_FOLK_M / 37. */
export const LANE_FOLK_M = 1.7;

/** A two-storey front for the lane run's pavements (part 7), its own units, bottom centre at (0, 0). */
export const FRONT_TILE = { w: 126, h: 106 } as const;

export type FrontWindow = 'empty' | 'lean' | 'wave0' | 'wave1' | 'glow';

/**
 * One two-storey front: a shop or home door below (open with a warm inside, or shut), two
 * upper windows (empty with a curtain, a person leaning out, waving in two frames, or the warm
 * glow of a rechargeable lantern when the street lamp is off). No signs, no writing.
 * `wall` picks the wall colour; `looks` are the people at the windows and the door.
 */
export function drawTwoStorey(g: G, opts: { wall?: number; windows: readonly [FrontWindow, FrontWindow]; door: 'open' | 'shut'; looks?: readonly FolkLook[] }): void {
  const walls = ['#f0a35e', '#7fc4a4', '#f2d06b', '#e58b8b', '#9fb6e8', '#e7b98a', '#b7d77a', '#d7a6d9'];
  const n = Math.abs(Math.round(opts.wall ?? 0));
  const wall = walls[n % 8]!;
  const box = (x: number, y: number, w: number, h: number, c: string, sh = 1): void => part(g, () => g.rect(x, y, w, h), c, { sh, line: 1.2 });
  g.save();
  box(-60, -100, 120, 100, wall, 2.6);
  // Roof edge and the floor band
  box(-63, -106, 126, 7, '#8f8a82');
  box(-60, -53, 120, 5, mix(wall, '#ffffff', 0.35));
  // Ground floor: a door, open with a warm room inside, or shut; a small side window
  if (opts.door === 'open') {
    box(-31, -40, 26, 40, '#ffd98a');
    box(-8, -38, 4, 38, '#7a5434', 0.6);
  } else {
    box(-31, -40, 26, 40, '#7a5434');
    lines(g, '#5b3a22', 1, [-27, -28, -9, -28, -27, -14, -9, -14]);
  }
  box(14, -36, 30, 20, '#cfe9f5');
  // Upper windows: a curtain, a person leaning out or waving, or a lantern's warm glow
  opts.windows.forEach((w, i) => {
    const x = -42 + i * 50;
    const lit = w === 'glow';
    box(x, -86, 34, 28, lit ? '#ffcf6a' : '#5d7684');
    g.save();
    g.beginPath();
    g.rect(x, -86, 34, 28);
    g.clip();
    if (lit) {
      // A rechargeable lantern on the sill, glowing
      disc(g, x + 17, -68, 12, 'rgba(255,250,220,0.55)');
      disc(g, x + 17, -68, 6, 'rgba(255,252,235,0.9)');
      box(x + 14.4, -69, 5.2, 8, '#f6f4ee', 0.6);
    } else {
      g.fillStyle = mix(walls[(n + i + 3) % 8]!, '#ffffff', 0.2);
      g.fillRect(x, -86, 9, 28);
      const look = opts.looks?.[i];
      if (look && w !== 'empty') drawFolkBust(g, look, x + 20, -56, 0.95, w === 'wave0' ? 1 : w === 'wave1' ? 2 : 0);
    }
    g.restore();
    box(x - 3, -58, 40, 3.4, '#e9e1cf', 0.8);
  });
  g.restore();
}

/**
 * The footbridge crowd (part 7): heads and shoulders above the railing, in screen space.
 * (x0..x1) is the deck span on screen, railY the top of the rail, ppm the bridge's pixels per
 * metre (lane.ts drawFootbridge). frame: 0 still, 1 or 2 everyone waving and cheering. Draw
 * the rail after this so it crosses in front of their chests. Bake two looks (still, waving).
 */
export function drawBridgeCrowd(g: G, x0: number, x1: number, railY: number, ppm: number, looks: readonly FolkLook[], frame: 0 | 1 | 2 = 0): void {
  const n = looks.length;
  if (n === 0) return;
  const size = (ppm * LANE_FOLK_M) / 37;
  if (size * 37 < 6) return;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n + (i % 2 ? 0.2 : -0.2) * ppm;
    const wave = frame === 0 ? 0 : (((i + frame) % 2) + 1) as 1 | 2;
    drawFolkBust(g, looks[i]!, x, railY + 0.25 * ppm, size, wave);
  }
}
