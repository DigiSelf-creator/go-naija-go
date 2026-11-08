/**
 * Gallery pages for K1 (debug only): ?gallery=10 the three street looks side by side,
 * ?gallery=11 the rolling drum (rolling, squash, bounce sparkle, smash) next to the tyre.
 * Same fixed 960 x 720 layout as the other gallery pages.
 */
import { drawBackdrop, drawThemeStall, THEMES } from './backdrop';
import { DRUM, drawDrum, drawDrumSmash, drawDrumSparkle } from './drum';
import { drawTyre } from './hazards';
import { drawHero } from './hero';
import { drawKobo } from './items';
import { INK } from './palette';
import { drawPavement } from './roadside';
import { GROUND_Y, drawRoad } from './street';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 9): void {
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

const NAMES: Record<string, string> = { morning: 'Street 1, Your street (morning)', market: 'Street 2, Market road (midday)', evening: 'Street 3, Bus park road (evening)' };

/** Page 10 (K1): each street look at half size, scrolling, with a stall roof, a hazard and a hero. */
const streets: Page = (g, time) => {
  title(g, 'K1: the three street looks (half size, scrolling). Stall roofs are platforms; hazards and hero on top');
  const camX = time * 80;
  const w = 1920;
  THEMES.forEach((theme, i) => {
    g.save();
    g.translate(0, 26 + i * 232);
    g.beginPath();
    g.rect(0, 0, 960, 210);
    g.clip();
    g.scale(0.5, 0.5);
    drawBackdrop(g, theme, camX, w, time, 420);
    g.translate(-camX, 0);
    const ground: [number, number][] = [[camX - 100, camX + 1300], [camX + 1400, camX + 2100]];
    drawRoad(g, camX, w, ground, GROUND_Y, 420);
    drawPavement(g, camX, w, ground);
    drawThemeStall(g, theme, camX + 300, 240, 140);
    drawThemeStall(g, theme, camX + 1000, 190, 120);
    for (let k = 0; k < 4; k++) drawKobo(g, camX + 330 + k * 24, 220, time);
    if (theme === 'evening') drawDrum(g, camX + 700, GROUND_Y, -time * 84 / DRUM.rollR);
    else drawTyre(g, camX + 700, GROUND_Y, -time * 6);
    g.save();
    g.translate(camX + 560, GROUND_Y);
    drawHero(g, { skin: i * 2, hair: i + 1, outfit: i + 2 }, { phase: (time * 1.6) % 1, inAir: false, facing: 1, glow: false, time });
    g.restore();
    g.restore();
    label(g, NAMES[theme] ?? theme, 480, 26 + i * 232 + 212, 10);
  });
};

/** Page 11 (K1): the rolling drum, large and at game size, with the tyre to compare. */
const drumPage: Page = (g, time) => {
  title(g, 'K1: rolling drum. Rolling (x3 and 1:1), squash on landing, bounce sparkle, smash; the tyre beside it');
  const road = (y: number): void => {
    g.fillStyle = '#3e3e42';
    g.fillRect(20, y, 920, 16);
    g.fillStyle = '#d8c27a';
    g.fillRect(20, y, 920, 3);
  };
  // Row 1: x3, rolling left across the row, and frames of a roll
  g.save();
  road(250);
  g.translate(0, 250);
  g.scale(3, 3);
  const x = 300 - ((time * 40) % 260);
  drawDrum(g, x, 0, -((time * 40) % 260) / DRUM.rollR);
  drawTyre(g, 300 - ((time * 30) % 260), 0, -((time * 30) % 260) / 11);
  g.restore();
  label(g, 'x3: drum (blue, ridged, taller) and tyre (black, round) rolling left', 480, 270, 10);
  // Row 2: at game size, still frames of one turn, and squash steps
  road(400);
  for (let i = 0; i < 8; i++) drawDrum(g, 60 + i * 40, 400, (-i * Math.PI) / 4 / (DRUM.rollR / DRUM.r));
  label(g, '1:1 one turn (8 frames)', 200, 420, 10);
  for (let i = 0; i < 4; i++) drawDrum(g, 420 + i * 40, 400, 0, { squash: i / 3, lines: false });
  label(g, 'squash 0 to 1', 480, 420, 10);
  drawTyre(g, 640, 400, 0);
  drawDrum(g, 680, 400, 0, { lines: false });
  label(g, 'side by side', 660, 420, 10);
  // Row 3: sparkle and smash, frames x2
  g.save();
  road(620);
  g.translate(0, 620);
  g.scale(2, 2);
  for (let i = 0; i < 5; i++) drawDrumSparkle(g, 30 + i * 46, 0, i / 5);
  for (let i = 0; i < 5; i++) drawDrumSmash(g, 260 + i * 44, 0, i / 5);
  g.restore();
  label(g, 'bounce sparkle k = 0 to 0.8 (x2)', 240, 640, 10);
  label(g, 'smash k = 0 to 0.8 (x2)', 700, 640, 10);
  // A loop: a hero lands on a drum and it clangs away
  const t = time % 1.6;
  g.save();
  road(500);
  const dx = 820 - t * 60;
  if (t < 0.8) drawDrum(g, dx, 500, -t * 60 / DRUM.rollR, { squash: t > 0.6 ? (t - 0.6) / 0.2 : 0 });
  else drawDrumSparkle(g, 820 - 48, 500, Math.min(0.99, (t - 0.8) / 0.3));
  g.restore();
  label(g, 'landed on: squash, then sparkle', 800, 520, 10);
};

export const STREET_PAGES: Page[] = [streets, drumPage];
