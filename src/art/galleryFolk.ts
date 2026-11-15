/**
 * The people kit in the gallery (debug only, task S3g1a), a fixed 960 x 720 layout:
 * ?gallery=folk    every dress kind in every skin tone
 * ?gallery=folk2   frames, ages and bodies, hair and headwear, held things, extras
 * ?gallery=folk3   each street's cast, the hall, the bus park, the lane and the city casts
 * ?gallery=folk4   places: a street (wide and 320 x 240) with people, the hall, the well room
 * ?gallery=folk5   movers and small things: okada, keke, bus windows, lane fronts, footbridge,
 *                  jogger and children, the city size, Mama Put and the Market, bubbles
 * Each page is drawn once into a picture and copied (the kit is meant to be baked).
 */
import { drawBackdrop } from './backdrop';
import {
  FOLK_DRESSES,
  FOLK_FRAMES,
  FOLK_HOLDS,
  drawBubble,
  drawFolkBall,
  drawFolkFrame,
  drawKekeRiders,
  drawOkada,
  drawWindowHeads,
  folkBallAt,
  type FolkDress,
  type FolkFrame,
  type FolkLook,
} from './folk';
import {
  BUS_PARK_CROWD,
  CITY_CAST,
  CITY_FOLK_SCALE,
  HALL_CROWD,
  KEKE_RIDERS,
  LANE_CAST,
  LANE_CHILDREN,
  LANE_JOGGER,
  LANE_JOGGER_2,
  MAMA_PUT_COOK,
  MAMA_PUT_QUEUE,
  MARKET_SHOPPERS,
  MARKET_SHOPPER_SPOTS,
  OKADA_RIDERS,
  STORE_KEEPER,
  STORE_KEEPER_SPOT,
  STREET_CASTS,
  BUS_SHAPE_WINDOWS,
  mamaPutQueueSpot,
} from './folkCasts';
import { drawBridgeCrowd, drawTwoStorey } from './folkLane';
import { drawHall } from './hall';
import { drawHero } from './hero';
import { drawKekeShape } from './market';
import { INK } from './palette';
import { drawMamaPut, drawMarketPlace } from './places';
import { GROUND_Y, drawBusShape, drawRoad } from './street';
import { ROOM, drawWellRoom } from './wellRoom';

const LAYOUT_W = 960;
/** The seven skins, light to deep. */
const FOLK_SKIN_ORDER = [0, 1, 5, 2, 3, 4, 6];
const LAYOUT_H = 720;

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size = 9, align: CanvasTextAlign = 'center'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(s, x, y);
}

function person(g: CanvasRenderingContext2D, look: FolkLook, x: number, y: number, frame: FolkFrame = 'stand', s = 1, flip = false): void {
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);
  drawFolkFrame(g, look, frame);
  g.restore();
}

/** A sensible look for each dress kind (sex, hair, headwear), for the kit page. */
function dressLook(d: FolkDress, skin: number, i: number): FolkLook {
  const female: Partial<Record<FolkDress, true>> = { iroBuba: true, hijabDress: true, wrapperBlouse: true };
  const f = female[d] === true || (d === 'anger' && i % 2 === 0) || (d === 'school' && i % 2 === 1) || (d === 'jeansTee' && i % 2 === 1);
  const base: FolkLook = { skin, age: d === 'school' ? (i % 3 === 0 ? 'child' : 'teen') : i === 6 ? 'elder' : 'adult', sex: f ? 'f' : 'm', body: (['slim', 'medium', 'round'] as const)[i % 3]!, hair: f ? (['braids', 'afro', 'bun', 'cornrows'] as const)[i % 4]! : i === 6 ? 'grey' : (['lowcut', 'afro', 'cornrows'] as const)[i % 3]!, dress: d, a: '#e0572b', b: '#2b59c3' };
  const cols: [string, string][] = [
    ['#e0572b', '#2b59c3'],
    ['#1aa39a', '#f2b300'],
    ['#7d3c98', '#f2b300'],
    ['#f2b300', '#3f8f4a'],
    ['#5aa9e6', '#f6f4ee'],
    ['#d6336c', '#1aa39a'],
    ['#efe6d2', '#2b59c3'],
  ];
  const [a, b] = cols[i % cols.length]!;
  base.a = a;
  base.b = b;
  switch (d) {
    case 'iroBuba':
      return { ...base, head: 'gele', h: a };
    case 'bubaSokoto':
      return { ...base, head: 'fila', h: b === '#f6f4ee' ? '#2b59c3' : b };
    case 'agbada':
      return { ...base, head: i % 2 ? 'fila' : 'none', h: a };
    case 'kaftan':
      return { ...base, head: 'kaftanCap', h: '#f6f4ee', a: i % 2 ? '#efe6d2' : a };
    case 'babbanRiga':
      return { ...base, head: 'rigaCap', h: '#efe6d2', a: i % 2 ? '#f6f4ee' : '#5aa9e6', b: '#3f8f4a' };
    case 'hijabDress':
      return { ...base, head: 'hijab', h: b };
    case 'wrapperBlouse':
      return { ...base, head: 'headscarf', h: b };
    case 'isiagu':
      return { ...base, a: i % 2 ? '#8e2a3a' : '#2a2a33', b: '#2a2a33' };
    case 'etibo':
      return { ...base, a: '#f6f4ee', b: a };
    case 'school':
      return { ...base, b: (['#7b2d26', '#2b59c3', '#3f8f4a'] as const)[i % 3]! };
    default:
      return { ...base, beard: base.age === 'elder' && !f };
  }
}

const NAMES: Record<FolkDress, string> = {
  iroBuba: 'iro and buba, gele',
  bubaSokoto: 'buba and sokoto, fila',
  agbada: 'agbada',
  kaftan: 'kaftan, cap',
  babbanRiga: 'babban riga, cap',
  hijabDress: 'long dress, hijab',
  wrapperBlouse: 'wrapper, blouse, scarf',
  isiagu: 'our own sun top',
  etibo: 'etibo shirt, wrapper',
  anger: 'our own stripes',
  jeansTee: 'jeans, T-shirt',
  shirtTrousers: 'shirt, trousers',
  school: 'plain school',
  sport: 'sport',
};

/* ---------------------------------------------------------------- pages */

function pageKit(g: CanvasRenderingContext2D): void {
  text(g, 'The people kit: the 13 dress kinds (columns) in the 7 skin tones, light to deep (rows). Adults 37 u, drawn 1.6x.', 480, 6, 11);
  const cw = 72;
  FOLK_DRESSES.forEach((d, c) => {
    const x = 36 + c * cw;
    text(g, NAMES[d], x, 24, 7.5);
    FOLK_SKIN_ORDER.forEach((skin, r) => {
      person(g, dressLook(d, skin, (r + c) % 7), x, 100 + r * 88, 'stand', 1.55);
    });
  });
}

function pageFrames(g: CanvasRenderingContext2D, time: number): void {
  text(g, 'Frames (stand, walk 4, wave 2, cheer 2, call, sit, clap 2, run 4) and back views for the lane run', 480, 4, 11);
  const looks: FolkLook[] = [STREET_CASTS.alausa[0]!, STREET_CASTS.village[4]!, STREET_CASTS.ikeja[4]!, LANE_JOGGER];
  const fronts = FOLK_FRAMES.filter((f) => !f.startsWith('back'));
  looks.forEach((look, r) => {
    fronts.forEach((f, c) => person(g, look, 26 + c * 55, 78 + r * 64, f, 1.25));
  });
  fronts.forEach((f, c) => text(g, f, 26 + c * 55, 330, 7.5));
  const backs = FOLK_FRAMES.filter((f) => f.startsWith('back'));
  [LANE_CAST[0]!, LANE_CAST[4]!, LANE_CHILDREN[0], LANE_CAST[5]!].forEach((look, i) => {
    backs.forEach((f, c) => person(g, look, 26 + c * 26 + i * 240, 392, f, 0.95));
  });
  text(g, 'back: stand, walk 4, run 4 (four looks)', 480, 400, 8);

  // Ages and bodies
  text(g, 'Ages (child, teen, adult, elder) and bodies (slim, medium, round), male and female', 220, 418, 9);
  const ages = ['child', 'teen', 'adult', 'elder'] as const;
  const bodies = ['slim', 'medium', 'round'] as const;
  let n = 0;
  for (const sex of ['f', 'm'] as const)
    for (const age of ages)
      for (const body of bodies) {
        if (age === 'child' && body === 'round') continue;
        const look: FolkLook = { skin: FOLK_SKIN_ORDER[n % 7]!, age, sex, body, hair: age === 'elder' ? 'grey' : sex === 'f' ? 'braids' : 'lowcut', dress: age === 'child' ? 'school' : sex === 'f' ? 'wrapperBlouse' : 'shirtTrousers', a: '#1aa39a', b: '#e0572b', beard: age === 'elder' && sex === 'm' };
        person(g, look, 18 + n * 19, 478, 'stand', 0.95);
        n++;
      }

  // Hair and headwear
  text(g, 'Hair: low cut, afro, braids, cornrows, grey, puffs, bun. Headwear: gele, headscarf, hijab, fila, kaftan cap, riga cap, helmet', 700, 418, 8);
  const hairs = ['lowcut', 'afro', 'braids', 'cornrows', 'grey', 'puffs', 'bun'] as const;
  hairs.forEach((h, i) => person(g, { skin: [3, 6, 1, 4, 5, 2, 0][i]!, age: h === 'puffs' ? 'child' : h === 'grey' ? 'elder' : 'adult', sex: i % 2 ? 'm' : 'f', body: 'medium', hair: h, dress: 'jeansTee', a: '#7d3c98', b: '#2b59c3' }, 470 + i * 34, 478, 'stand', 1.05));
  const heads = ['gele', 'headscarf', 'hijab', 'fila', 'kaftanCap', 'rigaCap', 'helmet'] as const;
  heads.forEach((h, i) =>
    person(g, { skin: [6, 2, 4, 0, 3, 5, 1][i]!, age: 'adult', sex: i < 3 ? 'f' : 'm', body: 'medium', hair: 'lowcut', head: h, h: ['#d6336c', '#1aa39a', '#7d3c98', '#2b59c3', '#f6f4ee', '#efe6d2', '#2f6fd6'][i]!, dress: i < 3 ? 'wrapperBlouse' : 'bubaSokoto', a: '#f2b300', b: '#3f8f4a' }, 720 + i * 34, 478, 'stand', 1.05),
  );

  // Held things
  text(g, 'Held things (the ball is never gold or yellow), and extras: glasses, a baby on the back, a wheelchair (walk turns the wheels)', 480, 500, 9);
  FOLK_HOLDS.forEach((hold, i) => {
    const look: FolkLook = { skin: FOLK_SKIN_ORDER[i % 7]!, age: hold === 'ball' || hold === 'schoolBag' ? 'child' : 'adult', sex: i % 2 ? 'm' : 'f', body: 'medium', hair: i % 2 ? 'lowcut' : 'braids', head: i % 2 ? 'none' : 'headscarf', h: '#1aa39a', dress: i % 2 ? 'jeansTee' : 'wrapperBlouse', a: '#e0572b', b: '#2b59c3', hold };
    const f: FolkFrame = hold === 'phoneCase' || hold === 'ankaraRoll' ? 'call' : 'stand';
    person(g, look, 26 + i * 40, 580, f, 1.15);
    text(g, hold, 26 + i * 40, 584, 7);
  });
  const extras: FolkLook[] = [
    { skin: 2, age: 'adult', sex: 'm', body: 'slim', hair: 'lowcut', dress: 'shirtTrousers', a: '#5aa9e6', b: '#2a2a33', glasses: true },
    { skin: 4, age: 'adult', sex: 'f', body: 'medium', hair: 'bun', head: 'headscarf', h: '#7d3c98', dress: 'wrapperBlouse', a: '#d6336c', b: '#f2b300', baby: true },
    { skin: 0, age: 'adult', sex: 'f', body: 'round', hair: 'braids', dress: 'iroBuba', head: 'gele', h: '#1aa39a', a: '#1aa39a', b: '#f2b300', chair: true },
    { skin: 6, age: 'teen', sex: 'm', body: 'slim', hair: 'afro', dress: 'jeansTee', a: '#f2b300', b: '#2b59c3', chair: true },
  ];
  const ef: FolkFrame[] = ['stand', 'walk1', 'wave0', 'cheer1', 'call'];
  extras.forEach((look, r) => ef.forEach((f, c) => person(g, look, 30 + c * 44 + r * 236, 690, f, 1.2)));
  // Store keeper
  const kf: FolkFrame[] = ['sit', 'wave0', 'wave1', 'clap0', 'clap1'];
  void time;
  text(g, 'store keeper: sit, wave, clap', 840, 590, 8);
  kf.forEach((f, i) => person(g, STORE_KEEPER, 740 + i * 46, 580, f, 1.15));
}

function pageCasts(g: CanvasRenderingContext2D): void {
  text(g, "Suggested casts: each street's 16 looks (every skin twice, every age, a wheelchair, glasses, dress from across Nigeria)", 480, 4, 11);
  const row = (label: string, looks: readonly FolkLook[], y: number, frames: FolkFrame[] = ['stand', 'wave0', 'walk1', 'cheer0'], s = 1.3): void => {
    text(g, label, 8, y - 66, 10, 'left');
    looks.forEach((l, i) => person(g, l, 34 + i * 57, y, frames[i % frames.length]!, s, i % 5 === 4));
  };
  row('Alausa (morning)', STREET_CASTS.alausa, 100);
  row('Computer Village (market)', STREET_CASTS.village, 200);
  row('Ikeja (bus park, evening)', STREET_CASTS.ikeja, 300);
  row('Go-Slow Hall: door people (3) and the walk-in (4): cheer, clap', HALL_CROWD, 400, ['cheer0', 'clap0', 'cheer1', 'clap1']);
  row('Bus park crowd (5)', BUS_PARK_CROWD.map((l, i) => (i === 0 ? { ...l, stool: true } : l)), 500, ['sit', 'stand', 'stand', 'wave1', 'stand']);
  row('Lane run pavements', LANE_CAST, 600, ['stand', 'backWalk0', 'walk2', 'backStand']);
  text(g, 'City walkers (city size, 0.41)', 8, 640, 10, 'left');
  CITY_CAST.forEach((l, i) => person(g, l, 30 + i * 30, 700, (['walk0', 'walk1', 'walk2', 'walk3', 'cheer0'] as const)[i % 5], CITY_FOLK_SCALE * 1.6, i % 2 === 1));
  text(g, 'Mama Put cook and queue', 700, 640, 10, 'left');
  [MAMA_PUT_COOK, ...MAMA_PUT_QUEUE].forEach((l, i) => person(g, l, 710 + i * 22, 700, i === 0 ? 'wave1' : 'stand', CITY_FOLK_SCALE * 1.6));
  [...MARKET_SHOPPERS].forEach((l, i) => person(g, l, 640 + i * 18, 712, l.hold === 'ankaraRoll' ? 'call' : 'stand', CITY_FOLK_SCALE * 1.2));
}

function streetScene(g: CanvasRenderingContext2D, x: number, y: number, viewW: number, viewH: number, scale: number, time: number, theme: string, fixed: boolean, looks: readonly FolkLook[]): void {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.beginPath();
  g.rect(0, 0, viewW, viewH);
  g.clip();
  drawBackdrop(g, theme, 400, viewW, time, viewH, GROUND_Y, fixed);
  drawRoad(g, 0, viewW, [[-100, viewW + 100]], GROUND_Y, viewH, fixed);
  // People on the back pavement: feet at groundY - 8, never on the front strip
  const frames: FolkFrame[] = ['stand', 'walk1', 'wave0', 'stand', 'call', 'walk3', 'cheer0', 'stand'];
  const n = Math.min(looks.length, Math.floor(viewW / 70));
  for (let i = 0; i < n; i++) person(g, looks[i]!, 40 + i * (viewW - 60) / n, GROUND_Y - 8, frames[i % frames.length]!, 1, i % 3 === 1);
  // The hero in front, for size
  g.save();
  g.translate(viewW * 0.42, GROUND_Y);
  drawHero(g, { skin: 2, hair: 1, outfit: 0 }, { phase: 0.2, inAir: false, facing: 1, glow: false, time });
  g.restore();
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, viewW * scale, viewH * scale);
}

function pagePlaces(g: CanvasRenderingContext2D, time: number): void {
  text(g, 'Places: a street at 851 x 393 (morning, then the fixed look) and 320 x 240, with people on the back pavement and the hero for size', 480, 4, 10);
  streetScene(g, 10, 20, 909, 420, 0.5, time, 'morning', false, STREET_CASTS.alausa);
  streetScene(g, 10, 236, 909, 420, 0.5, time, 'market', true, STREET_CASTS.village);
  streetScene(g, 480, 20, 560, 420, 0.35, time, 'evening', false, STREET_CASTS.ikeja);
  text(g, '320 x 240 (evening)', 578, 172, 9);
  // The hall: door people at the finish
  text(g, 'Go-Slow Hall at the finish: the door people and the walk-in along the back wall, clapping and cheering', 480, 452, 9);
  g.save();
  g.translate(10, 466);
  g.scale(0.42, 0.42);
  g.beginPath();
  g.rect(0, 0, 580, 420);
  g.clip();
  drawHall(g, 0, 580, 420, { lamps: [2, 2, 2, 2, 2, 2, 1, 0], doors: 1, arrows: 1, time });
  HALL_CROWD.forEach((l, i) => person(g, l, 60 + i * 50, 296, i % 2 ? 'cheer1' : 'clap0'));
  g.restore();
  // The hall in the fight: three at the door, outside
  g.save();
  g.translate(260, 466);
  g.scale(0.42, 0.42);
  g.beginPath();
  g.rect(0, 0, 580, 420);
  g.clip();
  drawHall(g, 0, 580, 420, {});
  HALL_CROWD.slice(0, 3).forEach((l, i) => person(g, l, 42 + i * 24, 290, i === 1 ? 'cheer0' : 'stand', 0.9));
  g.restore();
  text(g, 'in the fight (at the door)', 380, 650, 9);
  // The well room with the store keeper
  g.save();
  g.translate(510, 466);
  g.scale(0.42, 0.42);
  g.beginPath();
  g.rect(0, 0, 560, 420);
  g.clip();
  drawWellRoom(g, 0, 560, time, 420);
  person(g, STORE_KEEPER, STORE_KEEPER_SPOT.x, STORE_KEEPER_SPOT.y, 'wave0', 1.1);
  g.restore();
  text(g, `well room: the store keeper at x ${STORE_KEEPER_SPOT.x} (rope at ${ROOM.arriveX})`, 628, 650, 9);
  // Two children and their ball
  for (let i = 0; i < 4; i++) {
    const t = i * 0.3;
    const bx = 790 + (i % 2) * 80;
    const by = 520 + Math.floor(i / 2) * 90;
    person(g, LANE_CHILDREN[0], bx, by, 'stand', 1.2);
    person(g, LANE_CHILDREN[1], bx + 50, by, 'stand', 1.2, true);
    const b = folkBallAt(t, 50);
    drawFolkBall(g, bx + b.x * 1.2, by + b.y * 1.2, 2.6);
  }
  text(g, 'the ball between two children', 860, 700, 9);
}

function pageMovers(g: CanvasRenderingContext2D, time: number): void {
  text(g, 'Movers and small things', 480, 4, 11);
  // Okada, two wheel frames, both ways
  for (let i = 0; i < 2; i++) {
    g.save();
    g.translate(70 + i * 120, 90);
    g.scale(i === 1 ? -1.5 : 1.5, 1.5);
    drawOkada(g, OKADA_RIDERS[0], OKADA_RIDERS[1], i as 0 | 1);
    g.restore();
  }
  text(g, 'okada: frames 0 and 1, both ways', 130, 100, 9);
  // Keke with riders
  g.save();
  g.translate(310, 90);
  g.scale(1.4, 1.4);
  drawKekeShape(g, 0, 0, 0);
  drawKekeRiders(g, 0, 0, 0, KEKE_RIDERS, 1);
  g.restore();
  text(g, 'keke riders', 310, 100, 9);
  // Buses with heads: still and the two waving frames
  for (let w = 0; w < 3; w++) {
    g.save();
    g.translate(470 + w * 160, 90);
    g.scale(1.5, 1.5);
    drawBusShape(g, 0, 0, 0);
    drawWindowHeads(g, BUS_SHAPE_WINDOWS, [STREET_CASTS.alausa[1], STREET_CASTS.village[2], undefined, STREET_CASTS.ikeja[5]], w as 0 | 1 | 2);
    g.restore();
  }
  text(g, 'heads in bus windows: still, wave 1, wave 2', 630, 100, 9);

  // Lane run fronts
  text(g, 'Lane run two-storey fronts: empty, leaning out, waving (2), lantern glow; door open and shut', 260, 120, 9);
  const states: [['empty', 'lean'], ['wave0', 'wave1'], ['glow', 'glow'], ['empty', 'wave0']] = [
    ['empty', 'lean'],
    ['wave0', 'wave1'],
    ['glow', 'glow'],
    ['empty', 'wave0'],
  ];
  states.forEach((w, i) => {
    g.save();
    g.translate(70 + i * 128, 250);
    drawTwoStorey(g, { wall: i * 2 + 1, windows: w, door: i === 2 ? 'shut' : 'open', looks: [LANE_CAST[i]!, LANE_CAST[i + 4]!] });
    g.restore();
  });
  // Footbridge crowd (still and waving), over a simple rail
  for (let f = 0; f < 2; f++) {
    const y = 180 + f * 70;
    const x0 = 560;
    const x1 = 940;
    g.fillStyle = '#c9c2b6';
    g.fillRect(x0 - 10, y + 6, x1 - x0 + 20, 12);
    drawBridgeCrowd(g, x0, x1, y, 22, LANE_CAST.slice(f * 3, f * 3 + 6), f === 0 ? 0 : 1);
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x0 - 10, y);
    g.lineTo(x1 + 10, y);
    for (let x = x0 - 10; x <= x1 + 10; x += 16) {
      g.moveTo(x, y);
      g.lineTo(x, y + 6);
    }
    g.stroke();
  }
  text(g, 'footbridge crowd: still, waving', 750, 268, 9);

  // Jogger and children running alongside (back view, 4 frames)
  text(g, 'Running alongside (back view, 4 frames): two joggers, two children', 260, 280, 9);
  [LANE_JOGGER, LANE_JOGGER_2, LANE_CHILDREN[0], LANE_CHILDREN[1]].forEach((l, r) => {
    for (let i = 0; i < 4; i++) person(g, l, 30 + i * 30 + r * 130, 360, `backRun${i}` as FolkFrame, 1.15);
  });
  // City size: Mama Put with the kit queue and cook, the Market with shoppers
  text(g, 'City size: the Mama Put queue (kit people) and the Market shoppers', 750, 300, 9);
  g.save();
  g.translate(640, 400);
  g.scale(1.3, 1.3);
  drawMamaPut(g, 0, 0, { time, queue: 0 });
  person(g, MAMA_PUT_COOK, -3, -9, 'wave0', CITY_FOLK_SCALE);
  MAMA_PUT_QUEUE.slice(0, 3).forEach((l, i) => {
    const s = mamaPutQueueSpot(i);
    person(g, l, s.x, s.y, 'stand', CITY_FOLK_SCALE, true);
  });
  g.restore();
  g.save();
  g.translate(650, 500);
  g.scale(1.25, 1.25);
  drawMarketPlace(g, 0, 0, {});
  MARKET_SHOPPERS.forEach((l, i) => {
    const s = MARKET_SHOPPER_SPOTS[i]!;
    person(g, l, s.x, s.y, l.hold === 'ankaraRoll' ? 'call' : i === 1 ? 'walk1' : 'stand', CITY_FOLK_SCALE, i % 2 === 1);
  });
  g.restore();
  // City walkers and the cheer pose
  CITY_CAST.slice(0, 10).forEach((l, i) => person(g, l, 30 + i * 22, 420, i % 3 === 0 ? 'cheer1' : `walk${i % 4}` as FolkFrame, CITY_FOLK_SCALE * 1.3, i % 2 === 0));
  text(g, 'city walkers and the cheer, at 1.3x city size', 140, 428, 9);

  // Bubbles
  text(g, 'Speech bubbles (12 px bold, cream, tail to the speaker)', 240, 470, 9);
  const words = ['Good morning!', 'Ẹ káàárọ̀!', 'Sannu!', 'Ndewo!', 'How far?', 'Hot akara!', 'Well done!', 'For the boss. Go well!'];
  words.forEach((w, i) => {
    const x = 30 + (i % 4) * 120;
    const y = 520 + Math.floor(i / 4) * 80;
    const look = STREET_CASTS.alausa[i]!;
    person(g, look, x + 10, y + 60, i % 2 ? 'wave0' : 'call', 1);
    drawBubble(g, w, x + 12, y + 18, { tail: i % 3 === 2 ? 'right' : 'left' });
  });
}

/* ---------------------------------------------------------------- the page */

let cache: { key: string; canvas: HTMLCanvasElement } | null = null;

export function drawFolkGallery(g: CanvasRenderingContext2D, viewW: number, viewH: number, time: number, page = 0): void {
  const s = Math.min(viewW / LAYOUT_W, viewH / LAYOUT_H);
  const m = g.getTransform();
  const px = s * m.a;
  const key = `${page}:${viewW}:${viewH}:${px}`;
  if (!cache || cache.key !== key) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(LAYOUT_W * px);
    c.height = Math.ceil(LAYOUT_H * px);
    const h = c.getContext('2d')!;
    h.scale(px, px);
    h.fillStyle = '#fbf3df';
    h.fillRect(0, 0, LAYOUT_W, LAYOUT_H);
    h.lineCap = 'round';
    if (page === 0) pageKit(h);
    else if (page === 1) pageFrames(h, time);
    else if (page === 2) pageCasts(h);
    else if (page === 3) pagePlaces(h, time);
    else pageMovers(h, time);
    cache = { key, canvas: c };
  }
  g.save();
  g.fillStyle = '#fbf3df';
  g.fillRect(0, 0, viewW, viewH);
  g.translate((viewW - LAYOUT_W * s) / 2, (viewH - LAYOUT_H * s) / 2);
  g.scale(s, s);
  g.drawImage(cache.canvas, 0, 0, LAYOUT_W, LAYOUT_H);
  g.restore();
}
