/**
 * Gallery page for P2 (debug only, ?gallery=15): the pothole warning sign (as it
 * stands before a wide pothole, fresh and worn, and close up) and the Gentle mode
 * "dust off" in its two frames for every body, plus the live 0.4 s loop.
 */
import { AGES, BODIES, DUST_OFF_TIME, FIRST_LOOKS, SKINS, drawHero, type HeroLook } from './hero';
import { INK } from './palette';
import { drawPotholeSign } from './sign';
import { drawPothole } from './street';

type Page = (g: CanvasRenderingContext2D, time: number) => void;

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 9): void {
  g.fillStyle = INK;
  g.font = `${size}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(text, x, y);
}

function hero(g: CanvasRenderingContext2D, x: number, y: number, look: HeroLook, dustOff: number | undefined, time: number, scale: number): void {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  drawHero(g, look, dustOff === undefined ? { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time } : { phase: 0, inAir: false, facing: 1, glow: false, dustOff, time });
  g.restore();
}

/** A strip of road at groundY from x0 to x1 with a hole [h0, h1]. */
function road(g: CanvasRenderingContext2D, x0: number, x1: number, groundY: number, h0: number, h1: number): void {
  g.fillStyle = '#3e3e42';
  g.fillRect(x0, groundY, x1 - x0, 50);
  g.fillStyle = '#d8c27a';
  g.fillRect(x0, groundY, x1 - x0, 3);
  drawPothole(g, h0, h1, groundY, groundY + 50);
}

const p2Page: Page = (g, time) => {
  g.fillStyle = INK;
  g.font = 'bold 14px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('P2: pothole warning sign (120 u before a wide pothole; worn, fresh, close up) and the dust off for every body', 12, 6);

  // Game size: sign 120 u before a 100 u pothole, worn then fresh
  g.fillStyle = '#cfe8f4';
  g.fillRect(0, 30, 960, 100);
  road(g, 0, 470, 130, 230, 330);
  drawPotholeSign(g, 110, 130);
  label(g, 'worn (game size)', 110, 186);
  road(g, 490, 960, 130, 720, 820);
  drawPotholeSign(g, 600, 130, true);
  label(g, 'fresh: fixed look (game size)', 600, 186);

  // Close up at 4x
  for (const [cx, fresh] of [
    [240, false],
    [700, true],
  ] as const) {
    g.save();
    g.translate(cx, 440);
    g.scale(4, 4);
    g.fillStyle = '#3e3e42';
    g.fillRect(-40, 0, 80, 6);
    drawPotholeSign(g, 0, 0, fresh);
    g.restore();
  }
  label(g, 'close up x4 (no words: a hole, and a jump, jump again path)', 470, 470, 10);

  // Dust off: frame 0 (hands up) and frame 1 (pat, puff) for every body, then live
  const y = 640;
  g.fillStyle = '#d9cbb0';
  g.fillRect(4, y, 952, 3);
  BODIES.forEach((b, body) =>
    AGES.forEach((a, age) => {
      const x = 30 + (body * AGES.length + age) * 156;
      const first = FIRST_LOOKS[body]![age]!;
      const look: HeroLook = { skin: (body * 3 + age) % SKINS.length, hair: first.hair, outfit: first.outfit, body, age };
      hero(g, x, y, look, 0.1, time, 2);
      hero(g, x + 48, y, look, 0.85, time, 2);
      const live = (time % (DUST_OFF_TIME + 0.6)) / DUST_OFF_TIME;
      hero(g, x + 96, y, look, live < 1 ? live : undefined, time, 2);
      label(g, `${b.label} ${a.label}: up, pat, live`, x + 48, y + 8);
    }),
  );
};

export const P2_PAGES: Page[] = [p2Page];
