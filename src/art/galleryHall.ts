/**
 * Gallery pages for M1 (debug only): ?gallery=12 Go-Slow Hall in the fight (a wide phone
 * screen, every piece in place) with close-ups of the new pieces; ?gallery=13 the kind finish
 * frame by frame. Same fixed 960 x 720 layout as the other gallery pages; &t=1.5 holds time.
 */
import { drawBoss, drawGoLight, drawHighHonk, drawHitCounter, drawHonkCloud, type BossMode, type GoLightState } from './boss';
import { HALL, drawHall, drawHallCones, drawHallFront, hallDoors, hallFinishAt } from './hall';
import { drawTyre } from './hazards';
import { drawHero } from './hero';
import { INK } from './palette';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'center';
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

const LIGHTS: readonly (readonly [number, number, number])[] = [
  [60, 240, 90],
  [310, 210, 90],
  [190, 180, 90],
];

interface Scene {
  mode: BossMode;
  t: number;
  hits: number;
  time: number;
  aim?: 'low' | 'high';
  heroX: number;
  heroY?: number;
  finish?: number;
  throws?: boolean;
}

/** The whole hall as the game would draw it, world space, camera at camX. */
function hallScene(g: CanvasRenderingContext2D, camX: number, viewW: number, s: Scene): void {
  const f = s.finish === undefined ? null : hallFinishAt(s.finish);
  g.save();
  g.translate(-camX, 0);
  drawHall(g, camX, viewW, 420, {
    lamps: f?.lamps,
    doors: f ? f.doors : hallDoors(s.mode, s.t),
    arrows: f?.arrows ?? 0,
    time: s.time,
  });
  const lit = s.mode === 'defeat' ? -1 : s.hits;
  LIGHTS.forEach(([x, y, w], i) => {
    const state: GoLightState = i < s.hits ? 'done' : i === lit ? 'lit' : 'off';
    drawGoLight(g, x, y, w, state, s.time, HALL.floorY);
  });
  drawBoss(g, HALL.bossX, HALL.floorY, { mode: s.mode, t: s.t, hits: s.hits, time: s.time, aim: s.aim });
  if (s.throws) {
    const k = (s.time * 0.5) % 1;
    drawTyre(g, HALL.throwX - k * 420, HALL.floorY - 11, -s.time * 14);
    drawHonkCloud(g, 360 - k * 300, 236, s.time);
    drawHighHonk(g, 420 - k * 360, 170, s.time);
  }
  drawHallCones(g, f?.cones ?? 0);
  g.save();
  g.translate(s.heroX, s.heroY ?? HALL.floorY);
  drawHero(g, { skin: 3, hair: 2, outfit: 1 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time: s.time });
  g.restore();
  drawHallFront(g, camX, viewW, 420);
  g.restore();
}

/** Page 12 (M1): the hall in the fight on a wide screen, then close-ups of every new piece. */
const hallPage: Page = (g, time) => {
  title(g, 'M1: Go-Slow Hall in the fight (932 u wide screen, hall centred, outside walls at the sides). Throws loop across.');
  // 1. A wide phone screen, 1:1 world units: 932 x 420, hall centred
  const viewW = 932;
  const camX = (HALL.w - viewW) / 2;
  g.save();
  g.translate(14, 26);
  g.beginPath();
  g.rect(0, 0, viewW, 420);
  g.clip();
  const cycle = time % 3;
  hallScene(g, camX, viewW, {
    mode: cycle < 0.4 ? 'attack' : 'idle',
    t: cycle,
    hits: 2,
    time,
    aim: 'high',
    heroX: 120,
    throws: true,
  });
  drawHitCounter(g, 466, 20, 2);
  g.restore();

  // 2. Close-ups at 2x: high honk next to the low honk; attack poses low and high
  const y2 = 470;
  g.save();
  g.translate(0, y2);
  g.scale(2, 2);
  drawHonkCloud(g, 40, 40, time);
  drawHighHonk(g, 110, 40, time);
  g.restore();
  label(g, 'low "POOO!" (round, cream)   high "PEEP!" (long, thin, pale blue)', 150, y2 + 104);
  g.save();
  g.translate(300, y2 + 180);
  g.scale(0.9, 0.9);
  drawBoss(g, 70, 0, { mode: 'attack', t: 0.1, hits: 2, time, aim: 'low' });
  drawBoss(g, 250, 0, { mode: 'attack', t: 0.1, hits: 2, time, aim: 'high' });
  g.restore();
  label(g, 'attack: low throw (marks at the heap)   high honk (marks round the light)', 450, y2 + 186);

  // 3. Doors shut, half, open, and the cones in line, sliding, aside (1:1, cropped)
  const doorsK = [0, 0.5, 1];
  doorsK.forEach((k, i) => {
    const bx = 640 + i * 108;
    g.save();
    g.translate(bx, y2 - 60);
    g.beginPath();
    g.rect(0, 0, 100, 180);
    g.clip();
    g.translate(-440, -140);
    drawHall(g, 0, 560, 420, { doors: k });
    drawHallCones(g, k);
    g.restore();
    label(g, `doors ${k}, cones ${k}`, bx + 50, y2 + 124);
  });
};

/** Page 13 (M1): the kind finish, frame by frame (half size), and a live loop. */
const finishPage: Page = (g, time) => {
  title(g, 'M1: the kind finish. Cars drive out through the doors, lamps click on one by one, cones slide aside, arrows light');
  const frames = [0.6, 1.6, 2.3, 3.0, 3.5, 4.6];
  const tag = ['0.6 s light sighs', '1.6 s doors open, first car out', '2.3 s', '3.0 s first lamp, cones start', '3.5 s', '4.6 s Lagos is switched on'];
  frames.forEach((ft, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const ox = 14 + col * 314;
    const oy = 28 + row * 228;
    g.save();
    g.translate(ox, oy);
    g.scale(0.52, 0.52);
    g.beginPath();
    g.rect(0, 0, 580, 410);
    g.clip();
    hallScene(g, -10, 580, { mode: 'defeat', t: ft, hits: 3, time: ft, heroX: 300, finish: ft });
    g.restore();
    label(g, tag[i] ?? '', ox + 151, oy + 214);
  });
  // A live loop of the whole finish (6 s), full width at 0.52
  const lt = time % 6.5;
  g.save();
  g.translate(14, 486);
  g.scale(0.52, 0.52);
  g.beginPath();
  g.rect(0, 0, 580, 420);
  g.clip();
  hallScene(g, -10, 580, { mode: 'defeat', t: lt, hits: 3, time: lt, heroX: 300, finish: lt });
  g.restore();
  label(g, `live loop, t = ${lt.toFixed(1)} s`, 165, 706);
  // Reduced motion: the same moments, still (doors and cones jump, lamps still come on)
  g.save();
  g.translate(340, 486);
  g.scale(0.52, 0.52);
  g.beginPath();
  g.rect(0, 0, 580, 420);
  g.clip();
  const f = hallFinishAt(lt, true);
  g.translate(10, 0);
  drawHall(g, -10, 580, 420, { lamps: f.lamps, doors: f.doors, arrows: f.arrows, still: true });
  drawBoss(g, HALL.bossX, HALL.floorY, { mode: 'defeat', t: lt, hits: 3, time: 0 });
  drawHallCones(g, f.cones);
  drawHallFront(g, -10, 580, 420);
  g.restore();
  label(g, 'reduced motion: doors and cones jump, no arrow pulse', 491, 706);
  // Narrowest screen: exactly the hall (560 u)
  g.save();
  g.translate(660, 486);
  g.scale(0.5, 0.5);
  g.beginPath();
  g.rect(0, 0, 560, 420);
  g.clip();
  hallScene(g, 0, 560, { mode: 'idle', t: 0, hits: 0, time, heroX: 50 });
  g.restore();
  label(g, 'narrowest screen (560 u), start: hero at the door', 800, 706);
};

export const HALL_PAGES: Page[] = [hallPage, finishPage];
