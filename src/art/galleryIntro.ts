/**
 * The intro that moves (S3a3) in the gallery (debug only):
 * ?gallery=31 the whole scene playing big, on a loop (the 45 fps check at 4x CPU), with the
 * beat marks under it; &t=12.5 holds one moment.
 * ?gallery=32 the scene at each beat start and at 2, 19.4, 23 and 27.8 s, with a chosen hero
 * and the plain outline hero.
 */
import { type HeroLook } from './hero';
import { INTRO_BEATS, INTRO_CUES, drawIntroScene, prepareIntroScene } from './intro-scene';
import { INK } from './palette';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

const LOOK: HeroLook = { skin: 4, hair: 3, outfit: 1, body: 1, age: 1 };
const LOOP = 31;

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size = 11, align: CanvasTextAlign = 'left'): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillText(s, x, y);
}

function at(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, look: HeroLook | null): void {
  g.save();
  g.translate(x, y);
  drawIntroScene(g, w, h, t, { look });
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
}

const livePage: Page = (g, time) => {
  prepareIntroScene();
  const t = time % LOOP;
  text(g, `S3a3: the intro that moves, live (loops every ${LOOP} s). t = ${t.toFixed(2)} s`, 12, 6, 14);
  at(g, 10, 28, 940, 434, t, (Math.floor(time / LOOP) % 2 === 0 ? LOOK : null));
  // The beat marks and the cues on a time bar
  const x0 = 10;
  const bw = 940;
  const y = 480;
  g.fillStyle = '#e9e1cf';
  g.fillRect(x0, y, bw, 10);
  g.fillStyle = '#e4ad3c';
  g.fillRect(x0, y, (bw * t) / LOOP, 10);
  INTRO_BEATS.forEach((b, i) => {
    const x = x0 + (bw * b) / LOOP;
    g.fillStyle = INK;
    g.fillRect(x, y - 4, 2, 18);
    text(g, i < 6 ? `beat ${i + 1}` : 'hold', x + 3, y + 16, 10);
  });
  for (const c of INTRO_CUES) {
    const x = x0 + (bw * c.t) / LOOP;
    g.fillStyle = 'sound' in c ? '#1aa39a' : '#9b59b6';
    g.fillRect(x, y + 32, 2, 8);
  }
  text(g, 'green marks: sounds, purple: music level. Odd loops: a built hero; even loops: the plain outline hero.', 10, y + 44, 10);
};

const SHOTS = [0, 2, 6, 11, 15.5, 19.4, 20, 23, 24.5, 27.8] as const;

const stillsPage: Page = (g) => {
  text(g, 'S3a3: the scene at each beat start and at 2, 19.4, 23 and 27.8 s (built hero); bottom row: the outline hero', 12, 6, 13);
  SHOTS.forEach((t, i) => {
    const x = 10 + (i % 4) * 237;
    const y = 26 + Math.floor(i / 4) * 140;
    at(g, x, y, 228, 116, t, LOOK);
    text(g, `${t} s`, x + 114, y + 118, 10, 'center');
  });
  [21, 22.6, 26.5].forEach((t, i) => {
    const x = i < 2 ? 10 + (i + 2) * 237 : 10 + 2 * 237;
    const y = i < 2 ? 26 + 2 * 140 : 470;
    at(g, x, y, 228, 116, t, null);
    text(g, `${t} s, outline hero`, x + 114, y + 118, 10, 'center');
  });
  // The smallest screen: 320 x 240
  at(g, 10, 470, 320, 240, 22.6, LOOK);
  text(g, '320 x 240, 22.6 s', 165, 712, 10, 'center');
};

export const INTRO_SCENE_PAGES: Page[] = [livePage, stillsPage];
