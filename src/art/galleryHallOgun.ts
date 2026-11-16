/**
 * Pothole Hall's pieces for qa and Tp (debug only; art O5a, docs/ogun.md 5.1 to 5.6 and 7):
 * ?gallery=hall-ogun   the hall in the fight (dark, King Pothole at his start, a bag carried, a
 *                      gravel lump and a mud blob with its shadow) and after the win (lamps on,
 *                      the doors open on the lit gateway arch, the smooth road, the roller, the
 *                      door people cheering); King Pothole's moods and how full he gets; the
 *                      finish frame by frame; the bags, the pile, the carrying pose on every
 *                      body; the plop, mud, cones and roller; and the fight in grey.
 * &t=1.5 holds the time; &still=1 draws the reduced-motion look.
 * The art is in the lazy Ogun part, so it is fetched here with import(), never bundled in.
 */
import { drawBubble, drawFolkFrame, type FolkFrame, type FolkLook } from './folk';
import { drawHero, type HeroLook, type HeroPose } from './hero';
import { INK } from './palette';
import { OGUN_WORDS } from '../screens/words';

type Hall = typeof import('../worlds/ogun');
type Sag = typeof import('../worlds/ogun');
let hall: Hall | null = null;
let sag: Sag | null = null;
let asked = false;

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

function folk(g: G, look: FolkLook, x: number, y: number, s: number, f: FolkFrame = 'stand'): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawFolkFrame(g, look, f);
  g.restore();
}

/** A window onto the hall: world x from -20 and y from 10, at scale s. */
function view(g: G, x: number, y: number, s: number, paint: () => void): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.rect(0, 0, 600 * s, 370 * s);
  g.clip();
  g.scale(s, s);
  g.translate(20, -10);
  paint();
  g.restore();
}

const HERO: HeroLook = { skin: 3, hair: 3, outfit: 1, body: 1, age: 1 };

/** The fight: dark, King Pothole at x, a bag on the hero's head, a gravel lump and a mud blob. */
function fight(g: G, a: Hall, s: Sag, time: number, still: boolean, pitX = 330, grey = false): void {
  const t = still ? 0 : time;
  if (grey) g.filter = 'grayscale(1)';
  a.drawPotholeHall(g, 0, 560, 420, { time, still });
  a.drawRoller(g, a.POT_HALL.rollerX, 300);
  a.HALL_DOOR_PEOPLE.forEach((l, i) => folk(g, l, a.HALL_DOOR_SPOTS[i]!, 296, a.HALL_DOOR_SCALE));
  a.drawRoadMixPile(g, false);
  a.drawKingPothole(g, pitX, 300, { mood: 'gulp', gulp: still ? 1 : (time * 0.7) % 1, cones: 3, time, still });
  a.drawMudPatch(g, 120, 60, 300, 0.2, time, still);
  a.drawMudShadow(g, 200, 300, 0.5);
  a.drawMudBlob(g, 220, 230, time, still);
  const hop = s.gravelHop(time, still);
  s.drawGravel(g, pitX - 70, 300 - hop.lift, hop.frame, 300, 1);
  const pose: HeroPose = { phase: still ? 0 : time * 1.6, inAir: false, facing: 1, glow: false, gait: 'walk', time: t, still };
  g.save();
  g.translate(150, 300);
  drawHero(g, HERO, pose);
  g.restore();
  a.drawCarriedBag(g, HERO, pose, 150, 300);
  a.drawPotholeHallFront(g, -20, 600, 420);
  g.filter = 'none';
}

/** The win: lamps on, doors open on the lit arch, the smooth road, the roller, the cheering. */
function win(g: G, a: Hall, time: number, still: boolean, t: number): void {
  const pitX = 330;
  const f = a.potholeFinishAt(t, pitX, 0.44, still);
  a.drawPotholeHall(g, 0, 560, 420, { lamps: f.lamps, doors: f.doors, gateLit: f.gateLit, arrows: f.smooth, time, still });
  a.drawRoller(g, f.roller.x, 300, f.roller);
  const cheer = (still ? 'cheer0' : Math.floor(time * 4) % 2 ? 'cheer1' : 'cheer0') as FolkFrame;
  a.HALL_DOOR_PEOPLE.forEach((l, i) => folk(g, l, f.cheer ? a.HALL_CHEER_SPOTS[i]! : a.HALL_DOOR_SPOTS[i]!, 296, a.HALL_DOOR_SCALE, f.cheer ? cheer : 'stand'));
  a.drawRoadMixPile(g, false);
  a.drawKingPothole(g, pitX, 300, { mood: f.mood, fill: f.fill, cones: f.smooth > 0 ? 0 : 1, coneTip: f.coneTip, smooth: f.smooth, smile: f.smile, time, still });
  if (f.smooth > 0) a.drawConeLine(g, 400, 300);
  g.save();
  g.translate(470, 300);
  drawHero(g, HERO, { phase: 0, inAir: false, facing: -1, glow: false, standing: true, face: 'win', time: still ? 0 : time, still });
  g.restore();
  a.drawPotholeHallFront(g, -20, 600, 420);
}

function page(g: G, a: Hall, s: Sag, time: number, still: boolean): void {
  const t = still ? 0 : time;
  label(g, 'O5a Pothole Hall: a road works yard, and King Pothole: only a pothole with a crack face and a crown of three road cones (decision 78). No beads, staff, robes, throne or palace. No pipes, blocks or mushrooms.', 12, 4, 11);

  // The hall: the fight and the win
  const vs = 462 / 600;
  frame(g, 12, 22, 462, 370 * vs);
  view(g, 12, 22, vs, () => fight(g, a, s, time, still));
  label(g, 'Fight: dark yard, he gulps; gravel, mud blob and shadow, a patch; a bag carried', 14, 22 + 370 * vs + 2, 9);
  frame(g, 486, 22, 462, 370 * vs);
  view(g, 486, 22, vs, () => win(g, a, time, still, 5));
  label(g, 'Win: lamps on, doors open on the lit arch, smooth road, cones in a line, cheering', 488, 22 + 370 * vs + 2, 9);

  // His moods
  const my = 322;
  frame(g, 12, my, 936, 116, '#efe2c6');
  label(g, 'King Pothole\'s moods (watch: the hero is in the air, he freezes). His bubbles from OGUN_WORDS.hall.pothole', 16, my + 2, 10);
  const moods = ['calm', 'cross', 'watch', 'gulp', 'hit', 'giggle', 'yawn', 'sleep', 'smooth'] as const;
  const fills = [0, 0, 0.22, 0, 0.22, 0.95, 1, 1, 1];
  const cones = [3, 3, 2, 3, 2, 1, 1, 0, 0];
  const bubble: Record<string, string> = { cross: OGUN_WORDS.hall.pothole.bump, hit: OGUN_WORDS.hall.pothole.hit, giggle: OGUN_WORDS.hall.pothole.giggle };
  moods.forEach((m, i) => {
    const cx = 64 + i * 103;
    g.save();
    g.beginPath();
    g.rect(cx - 52, my + 14, 104, 100);
    g.clip();
    g.translate(cx, my + 50 - 300 * 0.82);
    g.scale(0.82, 0.82);
    g.fillStyle = '#9c968c';
    g.fillRect(-70, 300, 140, 60);
    a.drawKingPothole(g, 0, 300, { mood: m, fill: fills[i], cones: cones[i], gulp: 1, smooth: m === 'smooth' ? 1 : 0, smile: m === 'smooth' ? 1 : 0, coneTip: m === 'yawn' ? 0.6 : 0, time, still });
    g.restore();
    label(g, m, cx, my + 104, 9, 'center');
  });
  // His bubbles over three of them (screen px, as the game draws them)
  drawBubble(g, bubble.cross!, 64 + 103, my + 40, { px: 12 });
  drawBubble(g, bubble.hit!, 64 + 4 * 103, my + 40, { px: 12 });
  drawBubble(g, bubble.giggle!, 64 + 5 * 103 + 20, my + 40, { px: 12, tail: 'left' });

  // The finish, frame by frame
  const fy = 446;
  frame(g, 12, fy, 936, 112, '#e7e9f1');
  label(g, 'The finish (5.5), seconds from the third bag: fills and giggles, yawns and the last cone tips, the roller laps and toots, smooth road and smile, lamps, doors and the arch, cheering', 16, fy + 2, 10);
  const times = [0.6, 1.4, 2.0, 2.6, 3.5, 4.8];
  const ts = 150 / 600;
  times.forEach((tt, i) => {
    const fx = 16 + i * 155;
    frame(g, fx, fy + 16, 150, 370 * ts);
    view(g, fx, fy + 16, ts, () => win(g, a, time, still, tt));
    label(g, `${tt} s`, fx + 2, fy + 18 + 370 * ts, 9);
  });

  // Bags, the pile, carrying on every body
  const by = 566;
  frame(g, 12, by, 470, 150, '#f3e3cf');
  label(g, 'Road mix: pile (empty, ready), one bag, carried on every body (pad, hands free)', 16, by + 2, 10);
  g.fillStyle = '#9c968c';
  g.fillRect(12, by + 118, 470, 32);
  g.save();
  g.translate(-30, by + 118 - 300);
  a.drawRoadMixPile(g, false);
  g.translate(60, 0);
  a.drawRoadMixPile(g, true);
  g.restore();
  g.save();
  g.translate(150, by + 112);
  g.scale(2, 2);
  a.drawRoadMixBag(g, 0, 0, true);
  g.restore();
  const looks: HeroLook[] = [
    { skin: 0, hair: 0, outfit: 0, body: 0, age: 0 },
    { skin: 4, hair: 1, outfit: 3, body: 0, age: 1 },
    { skin: 2, hair: 4, outfit: 4, body: 0, age: 2 },
    { skin: 1, hair: 2, outfit: 2, body: 1, age: 0 },
    { skin: 3, hair: 3, outfit: 1, body: 1, age: 1 },
    { skin: 4, hair: 4, outfit: 4, body: 1, age: 2 },
  ];
  looks.forEach((l, i) => {
    const hx = 222 + i * 42;
    const air = i % 3 === 1;
    const pose: HeroPose = { phase: still ? 0 : time * 1.5 + i * 0.2, inAir: air, ...(air ? { vy: -200 } : {}), facing: i === 5 ? -1 : 1, glow: false, time: t, still };
    const hy = by + 118 - (air ? 14 : 0);
    g.save();
    g.translate(hx, hy);
    drawHero(g, l, pose);
    g.restore();
    a.drawCarriedBag(g, l, pose, hx, hy);
  });

  // Plop, mud, cones, roller, gravel
  const py = 566;
  frame(g, 494, py, 454, 150, '#efe2c6');
  label(g, 'Plop | mud blob, shadow closing in, patch drying | a cone falls and rolls | the roller and its toot', 498, py + 2, 10);
  g.fillStyle = '#9c968c';
  g.fillRect(494, py + 118, 454, 32);
  g.save();
  g.translate(494, py + 118 - 300);
  [0.15, 0.45].forEach((k, i) => {
    g.fillStyle = '#3b3b40';
    g.fillRect(14 + i * 50, 300, 40, 10);
    a.drawPlop(g, 34 + i * 50, 300, k);
  });
  a.drawMudBlob(g, 130, 250, time, still);
  [0.1, 0.5, 0.9].forEach((k, i) => a.drawMudShadow(g, 130 + i * 0.1, 300, k, 40 - i * 6));
  [0, 0.55, 0.85].forEach((d, i) => a.drawMudPatch(g, 190 + i * 46, 40, 300, d, time, still));
  [0, 0.3, 0.7, 1].forEach((k, i) => {
    const c = a.crownConeFall(k, 1, still);
    a.drawCrownCone(g, 320 + i * 4 + c.dx * 0.6, 300 + c.dy, 0.8, c.tilt);
  });
  a.drawRoller(g, 412, 300, { facing: -1, drum: t * 4, toot: still ? 0.3 : (time * 0.8) % 1 });
  g.restore();

  // People and the grey check
  const qy = 724;
  frame(g, 12, qy, 470, 72, '#eef0f8');
  label(g, 'Door people from the Ogun casts (garri trader, factory worker, elder in agbada): waiting, then cheering', 16, qy + 2, 10);
  a.HALL_DOOR_PEOPLE.forEach((l, i) => {
    folk(g, l, 40 + i * 40, qy + 66, 1.1, 'stand');
    folk(g, l, 210 + i * 40, qy + 66, 1.1, still ? 'cheer0' : Math.floor(time * 4) % 2 ? 'cheer1' : 'cheer0');
  });
  const gs = 296 / 600;
  frame(g, 494, qy - 4, 296, 370 * gs * 0.42);
  g.save();
  g.beginPath();
  g.rect(494, qy - 4, 296, 370 * gs * 0.42);
  g.clip();
  view(g, 494, qy - 4 - 370 * gs * 0.5, gs, () => fight(g, a, s, time, still, 300, true));
  g.restore();
  label(g, 'In grey: all still read', 800, qy + 4, 10);
}

export function drawHallOgunGallery(g: G, viewW: number, viewH: number, time: number, still = false): void {
  if (!hall && !asked) {
    asked = true;
    void import('../worlds/ogun').then((m) => (hall = m));
    void import('../worlds/ogun').then((m) => (sag = m));
  }
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  const s = Math.min(viewW / 960, viewH / 800);
  g.scale(s, s);
  if (hall && sag) page(g, hall, sag, time, still);
  else label(g, 'Loading Pothole Hall...', 12, 12, 14);
  g.restore();
}
