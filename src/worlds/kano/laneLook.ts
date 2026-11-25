/**
 * K6a: Harmattan Road, Kano's lane run look (docs/kano.md 6.5, KN-R12; level kano-lane.json,
 * theme "harmattan"). The Expressway's rules, camera and sizes with Kano's own picture: a long
 * straight road across the savanna toward the old wall in gold haze; a pale gold sky, our own
 * far wall and baobabs on the horizon, cattle far off on the plain; sandy verges, a sandy middle
 * strip with low shrubs, sand drifted along the road edges, white lines. Grain trucks and danfos
 * are the level's `danfo` kind (the same box and rule; no writing, no brand, no driver). Roadside
 * stalls of groundnuts and oranges, baobabs and waving people on the verges; flat-roofed
 * earth house fronts with small raised corners; the goal's bus stop by a small copy of our gate.
 *
 * The Kano part imports no value from outside its folder (KN-R10), so the Lagos lane pieces it
 * builds on (the projection, the shading, the road things, the people kit) come in as `kit`:
 * gamedev passes the modules themselves (harmattanLook({ lane, shade, things, folk })). Without
 * `kit.folk` the verges and windows show no people. Units as Lagos's lane (32 u a metre, road
 * things anchored at their ground centre). Nothing here is drawn fresh each frame but the road.
 */
import type { FolkFrame, FolkLook } from '../../art/folk';
import type { FrontWindow } from '../../art/folkLane';
import type { LaneLook } from '../../lane/view';
import type { Baked, UBox } from '../../art/lane-shade';
import { KANO, KANO_INK as INK, drawKanoGate } from './gate';
import { KURMI_CAST, KURMI_TRADER_LOOKS } from './kurmi';
import { KOFAR_MATA_CAST } from './kofarMata';
import { DAWANAU_CAST, DAWANAU_TRADER_LOOKS } from './dawanau';

type G = CanvasRenderingContext2D;
type Shade = typeof import('../../art/lane-shade');

/** The Lagos lane pieces the look builds on, passed in by the game (types only here). */
export interface HarmattanKit {
  lane: Pick<typeof import('../../art/lane'), 'LANE_CAMERA' | 'ROAD' | 'project'>;
  shade: Pick<Shade, 'bake' | 'shape' | 'line' | 'oval' | 'poly' | 'rand'>;
  things: Pick<typeof import('../../art/lane-things'), 'LANE_BOXES' | 'bakeLaneThings' | 'drawLaneThing'>;
  folk?: Pick<typeof import('../../art/folk'), 'drawFolkFrame' | 'drawFolkBust'>;
}


export type HarmattanVehicle = 'grainTruck' | 'danfo';
export type HarmattanScenery = 'groundnutStall' | 'baobab' | 'orangeStall' | 'waving';
/** The verge scenery, in the order it cycles along the road. */
const HARMATTAN_SCENERY: readonly HarmattanScenery[] = ['groundnutStall', 'baobab', 'orangeStall', 'waving'];
const HARMATTAN_SCENERY_BOX: UBox = { l: -64, r: 64, t: -116, b: 4 };
const HARMATTAN_STOP_BOX: UBox = { l: -112, r: 130, t: -150, b: 6 };

const harmattanKey = (kind: HarmattanVehicle, frame = 0): string => `${kind}#${((Math.round(frame) % 2) + 2) % 2}`;

/** The gold sky and Kano's far horizon (our own wall in haze, baobabs, cattle on the plain), w wide down to horizonY. */
function drawHarmattanSky(g: G, w: number, hz: number): void {
  const grad = g.createLinearGradient(0, 0, 0, hz);
  grad.addColorStop(0, '#9fc6dc');
  grad.addColorStop(0.7, '#f3d79a');
  grad.addColorStop(1, '#f6e2b0');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, hz + 1);
  const u = hz / 90;
  const dot = (x: number, y: number, r: number, c: string): void => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  // A pale sun behind the haze
  dot(w * 0.7, hz * 0.42, hz * 0.2, 'rgba(255,244,207,0.45)');
  dot(w * 0.7, hz * 0.42, hz * 0.1, '#fff4cf');
  // The old wall far ahead where the road meets the sky: a low red band with its triangles
  g.fillStyle = '#c79a74';
  g.fillRect(w * 0.3, hz - 7 * u, w * 0.4, 7 * u + 1);
  g.beginPath();
  for (let x = w * 0.3; x < w * 0.7; x += 6 * u) {
    g.moveTo(x, hz - 7 * u);
    g.lineTo(x + 2 * u, hz - 9.5 * u);
    g.lineTo(x + 4 * u, hz - 7 * u);
  }
  g.fill();
  // Baobabs on the plain: fat trunks and wide flat crowns
  g.fillStyle = '#a58a5c';
  for (const [cx, s] of [[0.08, 1.1], [0.2, 0.7], [0.82, 1], [0.94, 0.6]] as const) {
    const x = w * cx;
    g.fillRect(x - 3 * s * u, hz - 14 * s * u, 6 * s * u, 14 * s * u + 1);
    g.beginPath();
    g.ellipse(x, hz - 15 * s * u, 13 * s * u, 4 * s * u, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Cattle far off on the plain (small soft shapes, heads down grazing)
  g.fillStyle = '#8f7356';
  for (const cx of [0.12, 0.15, 0.86, 0.89, 0.91]) {
    const x = w * cx;
    g.beginPath();
    g.ellipse(x, hz - 2 * u, 2.6 * u, 1.3 * u, 0, 0, Math.PI * 2);
    g.ellipse(x + 2.8 * u, hz - 1.4 * u, 0.9 * u, 0.8 * u, 0, 0, Math.PI * 2);
    g.fill();
  }
  // The gold haze laid over the far plain (baked once, never drawn per frame)
  g.fillStyle = 'rgba(246,226,176,0.45)';
  g.fillRect(0, hz - 16 * u, w, 16 * u + 1);
}

function bakeSky(w: number, hz: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(hz + 2));
  const g = c.getContext('2d');
  if (!g) return null;
  drawHarmattanSky(g, w, hz);
  return c;
}

/** Harmattan Road's look for the lane view. */
export function harmattanLook(kit: HarmattanKit): LaneLook {
  const { LANE_CAMERA: C, ROAD, project } = kit.lane;
  const { bake, shape, line, oval, poly, rand } = kit.shade;
  const { LANE_BOXES, bakeLaneThings, drawLaneThing } = kit.things;
  const SHARP = { sharp: true, line: 2.6 };
  const person = (g: G, look: FolkLook, x: number, f: FolkFrame = 'stand'): void => {
    if (!kit.folk) return;
    g.save();
    g.translate(x, 0);
    g.scale(1.3, 1.3);
    kit.folk.drawFolkFrame(g, look, f);
    g.restore();
  };
  const rect = (g: G, x: number, y: number, w: number, h: number, c: string, lw = 1.4): void => shape(g, () => g.rect(x, y, w, h), c, { line: lw });

  const road: LaneLook['road'] = (g, v, dist) => {
    const zNear = 0.4 - C.back;
    const zFar = C.ahead + 40;
    const pg = g.createLinearGradient(0, v.horizonY, 0, v.h);
    pg.addColorStop(0, '#e7cf98');
    pg.addColorStop(1, '#dcbf7e');
    g.fillStyle = pg;
    g.fillRect(0, v.horizonY, v.w, v.h - v.horizonY);
    const strip = (x0: number, x1: number, z0: number, z1: number): void => {
      const p = [project(v, x0, z0), project(v, x1, z0), project(v, x1, z1), project(v, x0, z1)];
      if (p.some((q) => !q)) return;
      g.moveTo(p[0]!.x, p[0]!.y);
      for (let i = 1; i < 4; i++) g.lineTo(p[i]!.x, p[i]!.y);
      g.closePath();
    };
    const fill = (c: string, add: () => void): void => {
      g.fillStyle = c;
      g.beginPath();
      add();
      g.fill();
    };
    const mod = (n: number, m: number): number => ((n % m) + m) % m;
    const R = ROAD.half;
    const K = ROAD.kerb;
    const D = ROAD.divider;
    // The sandy middle strip, kerbs in cream and ochre blocks
    fill('#e8cf96', () => strip(-R - K - D, -R - K, zNear, zFar));
    fill('#c49a62', () => {
      strip(-R - K, -R, zNear, zFar);
      strip(R, R + K, zNear, zFar);
    });
    const ko = mod(dist, 4);
    fill('#efe2c0', () => {
      for (let z = -ko - 4; z < 34; z += 4) {
        strip(-R - K, -R, z, z + 2);
        strip(R, R + K, z, z + 2);
      }
    });
    fill('#4a4640', () => strip(-R, R, zNear, zFar));
    const bo = mod(dist, 10);
    fill('#534e47', () => {
      for (let z = -bo - 10; z < zFar; z += 10) strip(-R, R, Math.max(zNear, z), z + 5);
    });
    // Sand drifted in along both edges, in uneven tongues that move with the run
    const sd = mod(dist, 7);
    fill('#e8cf96', () => {
      for (let z = -sd - 7, i = Math.floor((dist - sd) / 7); z < zFar; z += 7, i++) {
        const z0 = Math.max(zNear, z);
        const a = 0.25 + rand(i) * 0.35;
        strip(-R, -R + a, z0, z + 3 + rand(i + 9) * 2);
        strip(R - a, R, z0, z + 2.5 + rand(i + 4) * 2);
      }
    });
    fill('#f4efe0', () => {
      strip(-R + 0.12, -R + 0.24, zNear, zFar);
      strip(R - 0.24, R - 0.12, zNear, zFar);
    });
    const dd = mod(dist, 9);
    fill('#f4efe0', () => {
      for (const x of [-C.laneWidth / 2, C.laneWidth / 2])
        for (let z = -dd - 9; z < zFar; z += 9) {
          const z0 = Math.max(zNear, z);
          if (z + 3 > z0) strip(x - 0.07, x + 0.07, z0, z + 3);
        }
    });
  };

  /** A grain truck from behind: wooden-sided body in painted boards, sacks heaped over the top under a rope. No writing. */
  const truck = (g: G, lit: boolean): void => {
    g.fillStyle = 'rgba(20,14,30,0.35)';
    g.beginPath();
    oval(g, 0, 0, 36, 3);
    g.fill();
    for (const x of [-24, -15, 15, 24]) shape(g, () => g.rect(x - 4.5, -14, 9, 14), '#2a2a2a', { ...SHARP, line: 2, rim: 0.6 });
    shape(g, () => poly(g, [-33, -22, 33, -22, 33, -14, -33, -14]), '#3a3d42', SHARP);
    for (let k = 0; k < 7; k++) shape(g, () => oval(g, -24 + k * 8, -72 - (k % 2) * 5, 7, 5), ['#e6cc98', '#d2a86a'][k % 2]!, { line: 1.6, shade: 1 });
    shape(g, () => poly(g, [-32, -70, 32, -70, 32, -22, -32, -22]), '#2f8a6e', { ...SHARP, line: 3, shade: 3, rim: 1.4 });
    for (const y of [-58, -46, -34]) line(g, [-30, y, 30, y], '#e9b949', 2.4);
    line(g, [-30, -76, 30, -68], '#8a6634', 1.4);
    line(g, [-30, -68, 30, -78], '#8a6634', 1.4);
    for (const x of [-31, 27]) shape(g, () => g.rect(x, -30, 4, 7), lit ? '#ffb21c' : '#8a5a14', { ...SHARP, line: 1.4, shade: 0 });
  };

  const shadeCloth = (g: G, w: number, c: string, c2: string): void => {
    for (const x of [-w / 2 + 2, w / 2 - 4]) rect(g, x, -60, 2.6, 60, '#6b4a2b');
    shape(g, () => poly(g, [-w / 2 - 4, -64, w / 2 + 4, -64, w / 2, -56, -w / 2, -56]), c, { line: 1.8 });
    for (let x = -w / 2; x < w / 2; x += 8) shape(g, () => g.rect(x, -63, 3, 6), c2, { line: 0, shade: 0, rim: 0 });
    for (const x of [-w / 2 + 4, w / 2 - 6]) rect(g, x, -16, 2.4, 16, '#6b4a2b');
    rect(g, -w / 2 + 2, -19, w - 4, 4, '#8a5d36');
  };
  const baobab = (g: G, x: number, h: number): void => {
    shape(g, () => {
      g.moveTo(x - 12, 0);
      g.quadraticCurveTo(x - 16, -h * 0.5, x - 7, -h);
      g.lineTo(x + 7, -h);
      g.quadraticCurveTo(x + 16, -h * 0.5, x + 12, 0);
      g.closePath();
    }, '#9a7a5a', { line: 1.6, shade: 2.4 });
    for (const [dx, dy, r] of [[-20, -4, 14], [0, -10, 18], [20, -4, 14]] as const) shape(g, () => oval(g, x + dx, -h + dy, r, r * 0.5), '#7f9a44', { line: 1.4 });
  };

  const scenery = (g: G, kind: HarmattanScenery, t = 0): void => {
    g.save();
    g.lineCap = 'round';
    const wave = (k: number): FolkFrame => (t === 0 ? 'wave0' : Math.floor(t * 3 + k) % 2 ? 'wave1' : 'wave0');
    if (kind === 'groundnutStall') {
      shadeCloth(g, 44, KANO.red, KANO.cream);
      for (let i = 0; i < 3; i++) shape(g, () => oval(g, -12 + i * 12, -22, 5.4, 2.6), '#c98d4e', { line: 1.2 });
      shape(g, () => g.roundRect(18, -14, 12, 14, 4), '#e6cc98', { line: 1.4 });
      person(g, DAWANAU_TRADER_LOOKS.groundnut, -32, 'call');
    } else if (kind === 'orangeStall') {
      shadeCloth(g, 40, '#13703a', KANO.gold);
      for (let i = 0; i < 9; i++) shape(g, () => oval(g, -12 + (i % 5) * 6 + (i > 4 ? 3 : 0), -23 - (i > 4 ? 5 : 0), 3, 3), '#f39c12', { line: 1 });
      person(g, KOFAR_MATA_CAST[9]!, 30);
    } else if (kind === 'baobab') {
      baobab(g, -14, 84);
    } else {
      person(g, KURMI_CAST[5]!, -24, wave(0));
      person(g, KURMI_TRADER_LOOKS.sandals, 0);
      person(g, DAWANAU_CAST[12]!, 24, wave(1));
    }
    g.restore();
  };

  const windowCast: readonly FolkLook[] = [...KURMI_CAST.slice(3, 9), ...KOFAR_MATA_CAST.slice(8, 12), ...DAWANAU_CAST.slice(8, 12)];
  const front: NonNullable<LaneLook['front']> = (g, o) => {
    const n = Math.abs(Math.round(o.wall ?? 0));
    const wall = ['#c8583a', '#d9905a', '#e2b878', '#f2e2c0', '#b8cf9a', '#9fbfe0'][n % 6]!;
    const box = (x: number, y: number, w: number, h: number, c: string, lw = 1.2): void => shape(g, () => g.rect(x, y, w, h), c, { line: lw, shade: 1.6, rim: 0.8 });
    g.save();
    box(-60, -96, 120, 96, wall);
    box(-60, -10, 120, 10, '#a8603a');
    // The flat roof's rim and its small raised corners, and a wooden water spout
    box(-62, -100, 124, 6, wall);
    for (const x of [-62, -20, 20, 58]) shape(g, () => poly(g, [x, -100, x + 2, -110, x + 4, -100]), wall, { line: 1.2 });
    box(-31, -46, 26, 36, o.door === 'open' ? '#ffd98a' : '#2f8a6e');
    if (o.door === 'shut') line(g, [-18, -44, -18, -12], INK, 1);
    o.windows.forEach((wnd: FrontWindow, i: number) => {
      const x = i === 0 ? -50 : 8;
      const y = -86;
      const lit = wnd === 'glow';
      box(x, y, 34, 28, lit ? '#ffcf6a' : '#4a5a66');
      if (!lit && wnd !== 'empty' && kit.folk) {
        g.save();
        g.beginPath();
        g.rect(x, y, 34, 28);
        g.clip();
        kit.folk.drawFolkBust(g, windowCast[(n * 3 + i * 5) % windowCast.length]!, x + 17, y + 30, 0.95, wnd === 'wave0' ? 1 : wnd === 'wave1' ? 2 : 0);
        g.restore();
      }
    });
    g.restore();
  };

  /** The goal: a shelter with a bench and a plain stop sign, a danfo at the kerb, our small gate behind. */
  const stop = (g: G, bright: boolean): void => {
    g.save();
    g.lineCap = 'round';
    drawKanoGate(g, -40, 0, 0.75, { lit: bright, still: true, wings: 40 });
    g.save();
    g.translate(-50, 0);
    g.scale(0.9, 0.9);
    drawLaneThing(g, 'danfo', { frame: 0 });
    g.restore();
    shape(g, () => g.rect(20, -60, 54, 44), '#f3e2bb', { line: 1.6, shade: 0, rim: 0 });
    for (const x of [20, 74]) rect(g, x - 1.8, -66, 3.6, 66, '#5d6670');
    shape(g, () => poly(g, [14, -66, 80, -66, 76, -76, 18, -76]), KANO.red, { line: 1.8 });
    rect(g, 26, -20, 44, 4, '#8a5d36', 1.2);
    person(g, KURMI_CAST[13]!, 34, 'sit');
    person(g, KOFAR_MATA_CAST[15]!, 52, 'wave0');
    person(g, DAWANAU_CAST[15]!, 68);
    rect(g, 116, -96, 3, 96, '#5d6670');
    shape(g, () => g.roundRect(108, -114, 19, 19, 3), KANO.indigo, { line: 1.6 });
    shape(g, () => g.roundRect(111.5, -110, 12, 8.6, 2), '#ffffff', { line: 0, shade: 0, rim: 0 });
    g.restore();
  };

  return {
    sky: bakeSky,
    road,
    things(ppm) {
      const out = bakeLaneThings(ppm);
      // Lagos's danfo keeps its own keys ('danfo#0', 'danfo#1'); the grain truck joins it
      for (const f of [0, 1]) {
        const b = bake(LANE_BOXES.danfo, ppm, (g) => truck(g, f === 1));
        if (b) out.set(harmattanKey('grainTruck', f), b);
      }
      return out;
    },
    scenery(ppm) {
      const out = new Map<string, Baked>();
      for (const k of HARMATTAN_SCENERY) {
        const b = bake(HARMATTAN_SCENERY_BOX, ppm, (g) => scenery(g, k, 0));
        if (b) out.set(k, b);
      }
      for (const bright of [false, true]) {
        const b = bake(HARMATTAN_STOP_BOX, ppm, (g) => stop(g, bright));
        if (b) out.set(bright ? 'busStopBright' : 'busStop', b);
      }
      return out;
    },
    sceneryKeys: HARMATTAN_SCENERY,
    // Which look a `danfo` thing takes: fixed for its spot, about 3 grain trucks to 2 danfos
    danfo: (d, lane, frame) => harmattanKey(rand(Math.round(d) * 3 + Math.round(lane) * 17 + 5) < 0.6 ? 'grainTruck' : 'danfo', frame),
    front,
  };
}
