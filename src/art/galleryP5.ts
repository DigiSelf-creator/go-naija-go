/**
 * Gallery page for P6 and P7 (debug only, ?gallery=16): the hall light's last second (blink
 * and the reduced-motion look), pepper fufu (bowl, ball in flight, squash, roll, settle, the
 * plugged pothole, the HUD icon), the throw pose for every body on the ground and in the
 * air, the goat eating, a tyre and drum knocked off, and the Throw button.
 */
import { drawGoLight } from './boss';
import { drawControl } from './controls';
import { FUFU, drawDrumKnocked, drawFufuBall, drawFufuIcon, drawFufuPlug, drawFufuSettle, drawTyreKnocked } from './fufu';
import { GOAT_EAT_TIME, drawGoatEating } from './hazards';
import { AGES, BODIES, FIRST_LOOKS, SKINS, THROW_TIME, drawHero, type HeroLook } from './hero';
import { drawFood } from './items';
import { INK } from './palette';
import { drawPothole } from './street';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 9): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function road(g: CanvasRenderingContext2D, x0: number, x1: number, groundY: number): void {
  g.fillStyle = '#3e3e42';
  g.fillRect(x0, groundY, x1 - x0, 40);
  g.fillStyle = '#d8c27a';
  g.fillRect(x0, groundY, x1 - x0, 3);
}

const p5Page: Page = (g, time) => {
  g.fillStyle = INK;
  g.font = 'bold 14px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('P6 hall light last second, P7 pepper fufu: bowl, balls, plug, throw pose, goat eating, knocked off, Throw button', 12, 6);

  // --- Hall light: fresh, last-second blink (live), reduced motion
  g.fillStyle = '#e9e1cf';
  g.fillRect(0, 28, 330, 130);
  const loop = time % 2; // 1 s fresh, then the last 1 s
  const left = 2 - loop;
  drawGoLight(g, 20, 80, 80, 'lit', time, 150);
  label(g, 'green', 60, 140);
  drawGoLight(g, 125, 80, 80, 'lit', time, 150, { left: left <= 1 ? left : 3 });
  label(g, left <= 1 ? `last second (${left.toFixed(1)} s)` : 'fresh, then blinks', 165, 140);
  drawGoLight(g, 230, 80, 80, 'lit', time, 150, { left: 0.9, still: true });
  label(g, 'reduced motion', 270, 140);

  // --- Food and HUD icon
  g.fillStyle = '#cfe8f4';
  g.fillRect(340, 28, 300, 130);
  road(g, 340, 640, 120);
  drawFood(g, 'fufu', 390, 100, time);
  label(g, 'bowl on the road', 390, 132);
  g.save();
  g.translate(440, 40);
  g.scale(3, 3);
  g.translate(0, 10);
  drawFood(g, 'fufu', 12, 0, 0);
  g.restore();
  label(g, 'close up', 476, 132);
  g.fillStyle = '#2b2f36';
  g.fillRect(540, 50, 60, 60);
  drawFufuIcon(g, 570, 80, 52);
  label(g, 'HUD icon', 570, 132);

  // --- A ball's life: flight, plop squash, hop, roll, settle; the plugged pothole
  g.fillStyle = '#cfe8f4';
  g.fillRect(650, 28, 310, 130);
  road(g, 650, 960, 120);
  drawPothole(g, 860, 940, 120, 160);
  drawFufuBall(g, 680, 80, { time });
  drawFufuBall(g, 712, 114, { squash: 1, time });
  drawFufuBall(g, 742, 104, { squash: 0.3, time });
  drawFufuBall(g, 778, 114, { spin: time * 8, time });
  drawFufuSettle(g, 812, 120, (time % 0.6) / 0.6);
  label(g, 'fly, plop, hop, roll, settle', 745, 132);
  label(g, 'pothole', 900, 132);
  // A plugged pothole below
  g.fillStyle = '#cfe8f4';
  g.fillRect(650, 160, 310, 60);
  road(g, 650, 960, 190);
  drawPothole(g, 760, 860, 190, 230);
  drawFufuPlug(g, 760, 860, 190, 230);
  label(g, 'plugged (level with the road)', 810, 206);

  // --- Throw pose: every body and age, wind and swing, ground and air
  g.fillStyle = '#f4ead2';
  g.fillRect(0, 165, 645, 290);
  let x = 30;
  const looks: HeroLook[] = [];
  for (let body = 0; body < BODIES.length; body++)
    for (let age = 0; age < AGES.length; age++) {
      const pick = FIRST_LOOKS[body]?.[age] ?? { hair: 0, outfit: 0 };
      looks.push({ skin: (body * 3 + age * 2) % SKINS.length, hair: pick.hair, outfit: pick.outfit, body, age });
    }
  for (const look of looks) {
    for (const [i, p] of [0.2, 0.7].entries()) {
      g.save();
      g.translate(x + i * 34, 250);
      g.scale(1.3, 1.3);
      drawHero(g, look, { phase: 0.25, inAir: false, facing: 1, glow: false, throwing: p, time });
      g.restore();
      g.save();
      g.translate(x + i * 34, 360);
      g.scale(1.3, 1.3);
      drawHero(g, look, { phase: 0, inAir: true, facing: 1, glow: false, vy: -100, throwing: p, time });
      g.restore();
    }
    x += 80;
  }
  label(g, 'ground: wind (ball in hand) then swing through', 320, 262);
  label(g, 'air: wind then swing forward and down ("aims down")', 320, 372);
  // Live throw loop
  const tp = (time % 0.6) / THROW_TIME;
  g.save();
  g.translate(580, 430);
  g.scale(1.5, 1.5);
  drawHero(g, { skin: 4, hair: 3, outfit: 2, body: 1, age: 1 }, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time, throwing: tp < 1 ? tp : 2 });
  g.restore();
  if (tp >= 1) drawFufuBall(g, 600 + Math.min(1, (tp - 1) / 2) * 40, 380, { time });
  label(g, 'live', 580, 436);

  // --- Goat eating, live, and its two frames; knocked tyre and drum
  g.fillStyle = '#cfe8f4';
  g.fillRect(650, 225, 310, 230);
  road(g, 650, 960, 320);
  const k = ((time % 1.2) / GOAT_EAT_TIME) % 2;
  drawGoatEating(g, 700, 320, 0.1);
  drawGoatEating(g, 760, 320, 0.3);
  drawGoatEating(g, 830, 320, Math.min(1, k));
  if (k < 1) drawFufuBall(g, 830 - 22, 314, { pepper: false, steam: false, squash: 0.2 });
  label(g, 'eat frames 0, 1, then live with MEEH!', 780, 330);
  const kk = (time % 0.8) / FUFU.knockTime;
  road(g, 650, 960, 430);
  drawTyreKnocked(g, 720, 430, kk < 1 ? kk : 0.01, time);
  drawDrumKnocked(g, 830, 430, kk < 1 ? kk : 0.01, time);
  label(g, 'tyre and drum knocked off the road', 780, 440);

  // --- Throw button, plain and pressed, beside Jump
  g.fillStyle = '#7a8a9a';
  g.fillRect(0, 460, 960, 120);
  drawControl(g, 'throw', 120, 520, 80, false);
  drawControl(g, 'throw', 230, 520, 80, true);
  drawControl(g, 'jump', 360, 520, 80, false);
  drawControl(g, 'throw', 520, 520, 64, false);
  drawControl(g, 'jump', 520 + 32 + 10 + 48, 520, 64, false);
  label(g, 'Throw, pressed, Jump; at 64 px with the 10 px gap', 400, 564);
};

export const P5_PAGES: Page[] = [p5Page];
