/**
 * Gallery pages for P13 and P15 (debug only; docs/design.md S2.16 B1 to B5).
 * ?gallery=20: the hero: amala's strong look (stance, glow breathing and the last-2-s blink,
 * reduced motion, step thump, smash ring, pick-up flex, shake out), the garri tech suit
 * (put-on, idle hum, crack, the bits; every body and hair, ground and air), the dash (pose,
 * speed lines, dust; rest with breath puffs; reduced motion).
 * ?gallery=21: the street: egret and crow (peck, hop, hover, fly off, with a fufu ball), the
 * rubbish pile and the kobo pop, short and long gutters with weeds, drying, dried and
 * trampled, the dash gap sign and the Gentle cement blocks.
 */
import { BIRD_BOX, drawCrow, drawEgret, drawPileKoboPop, drawRubbishPile } from './birds';
import { drawDustRing, drawStepThump } from './dust';
import { CEMENT_BLOCKS, GUTTER, drawCementBlocks, drawGutter, drawWeedSteam, drawWeeds } from './gutter';
import { AGES, BODIES, FIRST_LOOKS, HAIRS, OUTFITS, SKINS, STRONG, SUIT, drawHero, drawSuitBits, type HeroLook, type HeroPose } from './hero';
import { INK } from './palette';
import { drawDashSign, drawPotholeSign } from './sign';

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

function road(g: CanvasRenderingContext2D, x0: number, x1: number, groundY: number, depth = 40): void {
  g.fillStyle = '#3e3e42';
  g.fillRect(x0, groundY, x1 - x0, depth);
  g.fillStyle = '#d8c27a';
  g.fillRect(x0, groundY, x1 - x0, 3);
}

function hero(g: CanvasRenderingContext2D, x: number, y: number, look: HeroLook, pose: HeroPose, s = 1.3): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawHero(g, look, pose);
  g.restore();
}

/** The six first looks (every body and age), with a spread of skins. */
function firstLooks(): HeroLook[] {
  const out: HeroLook[] = [];
  for (let body = 0; body < BODIES.length; body++)
    for (let age = 0; age < AGES.length; age++) {
      const pick = FIRST_LOOKS[body]?.[age] ?? { hair: 0, outfit: 0 };
      out.push({ skin: (body * 3 + age * 2) % SKINS.length, hair: pick.hair, outfit: pick.outfit, body, age });
    }
  return out;
}

const heroPage: Page = (g, time) => {
  title(g, 'P13 amala strong look and the garri tech suit; P15 the dash (S2.16 B2, B3, B4)');
  const looks = firstLooks();
  const run = (time * 1.6) % 1;

  // --- Strong look: every first look running, then the moments
  g.fillStyle = '#f4ead2';
  g.fillRect(0, 26, 960, 170);
  road(g, 0, 960, 120, 6);
  looks.forEach((look, i) => {
    hero(g, 40 + i * 62, 120, look, { phase: (run + i * 0.11) % 1, inAir: false, facing: 1, glow: false, strong: {}, time });
  });
  label(g, 'strong run, every body (glow breathes once a second)', 200, 128);
  const left = 3 - (time % 3);
  hero(g, 420, 120, looks[1]!, { phase: run, inAir: false, facing: 1, glow: false, strong: { left }, time });
  label(g, `blink (${left.toFixed(1)} s left)`, 420, 128);
  hero(g, 510, 120, looks[4]!, { phase: run, inAir: false, facing: 1, glow: false, strong: { left: 5 }, still: true, time });
  hero(g, 560, 120, looks[4]!, { phase: run, inAir: false, facing: 1, glow: false, strong: { left: 1 }, still: true, time });
  label(g, 'reduced motion: steady, thin', 540, 140);
  const flex = (time % 1.2) / STRONG.flexTime;
  hero(g, 650, 120, looks[2]!, { phase: run, inAir: false, facing: 1, glow: false, strong: { flex: flex < 1 ? flex : 2 }, time });
  label(g, 'pick-up flex', 650, 128);
  const shake = (time % 1.2) / STRONG.shakeTime;
  hero(g, 730, 120, looks[5]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, shakeOut: shake < 1 ? shake : 2, time });
  label(g, 'shake out (end)', 730, 128);
  hero(g, 800, 120, looks[3]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, strong: {}, time });
  hero(g, 850, 120, looks[3]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, time });
  label(g, 'strong stand, plain stand', 825, 128);
  drawStepThump(g, 900, 120, (time % 0.4) / 0.25);
  drawDustRing(g, 935, 120, (time % 0.8) / 0.4);
  label(g, 'step, smash', 918, 140, 8);

  // --- Tech suit: every hair (ground) and the jump, rope; put-on, hum, crack, bits
  g.fillStyle = '#e3eef0';
  g.fillRect(0, 200, 960, 220);
  for (let hair = 0; hair < HAIRS.length; hair++) {
    for (let outfit = 0; outfit < OUTFITS.length; outfit++) {
      const look: HeroLook = { skin: (hair + outfit) % SKINS.length, hair, outfit, body: (hair + outfit) % 2, age: outfit % 3 };
      hero(g, 26 + (hair * OUTFITS.length + outfit) * 24, 290, look, { phase: (run + outfit * 0.2) % 1, inAir: false, facing: 1, glow: false, suit: {}, time }, 0.9);
    }
  }
  label(g, 'suit on every hair x outfit (bodies and ages mixed): face and hair always clear', 310, 296);
  const on = (time % 1.6) / SUIT.putOnTime;
  hero(g, 660, 290, looks[0]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, suit: { on: Math.min(on, 1) }, time });
  label(g, 'put on (feet up)', 660, 296);
  hero(g, 730, 290, looks[5]!, { phase: 0, inAir: true, facing: 1, glow: false, vy: -200, suit: {}, time });
  hero(g, 790, 290, looks[4]!, { phase: 0, inAir: false, facing: -1, glow: false, rope: true, suit: {}, time });
  label(g, 'jump, rope, facing left', 760, 296);
  hero(g, 860, 290, looks[1]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, suit: { crack: true }, time });
  label(g, 'crack (0.1 s)', 860, 296);
  const bk = (time % 1) / 0.6;
  drawSuitBits(g, 930, 290, bk < 1 ? bk : 0.999);
  label(g, 'bits', 930, 296);
  // Every body and age with the suit, larger
  looks.forEach((look, i) => {
    hero(g, 60 + i * 80, 400, look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, suit: {}, time }, 1.5);
  });
  hero(g, 560, 400, looks[2]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, suit: {}, still: true, time }, 1.5);
  label(g, 'reduced motion: no hum light', 560, 406);
  drawSuitBits(g, 700, 400, 0.5, true);
  label(g, 'bits, reduced motion', 700, 406);

  // --- Dash, rest, reduced motion
  g.fillStyle = '#cfe8f4';
  g.fillRect(0, 425, 960, 160);
  road(g, 0, 960, 540, 45);
  looks.forEach((look, i) => {
    hero(g, 70 + i * 80, 540, look, { phase: (time * 2.4 + i * 0.1) % 1, inAir: false, facing: 1, glow: false, dash: true, time });
  });
  label(g, 'dash, every body (12 degree lean, arms pumping, speed lines, dust)', 270, 548);
  hero(g, 560, 540, looks[3]!, { phase: (time * 2.4) % 1, inAir: false, facing: -1, glow: false, dash: true, time });
  label(g, 'left', 560, 548);
  hero(g, 640, 540, looks[1]!, { phase: (time * 2.4) % 1, inAir: true, facing: 1, glow: false, vy: -100, dash: true, time });
  label(g, 'dash jump', 640, 548);
  hero(g, 720, 540, looks[0]!, { phase: (time * 2.4) % 1, inAir: false, facing: 1, glow: false, dash: true, still: true, time });
  label(g, 'reduced motion', 720, 548);
  hero(g, 800, 540, looks[4]!, { phase: (time * 1.6) % 1, inAir: false, facing: 1, glow: false, resting: true, time });
  hero(g, 880, 540, looks[2]!, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, resting: true, time });
  label(g, 'resting: breath puffs', 840, 548);
};

const streetPage: Page = (g, time) => {
  title(g, 'P15 birds by the rubbish, thorny gutters, the dash gap sign and blocks (S2.16 B1, B4, B5)');
  const gy = 200;
  // --- Birds on the evening road with the piles
  g.fillStyle = '#f4c99a';
  g.fillRect(0, 26, 960, gy - 26);
  road(g, 0, 960, gy, 30);
  drawRubbishPile(g, 70, gy);
  drawEgret(g, 60, gy, 'peck', time);
  label(g, 'egret pecks', 60, gy + 8);
  drawRubbishPile(g, 230, gy);
  const hopX = 220 + Math.sin(time * 1.5) * 20;
  drawEgret(g, hopX, gy, 'hop', time, { facing: Math.cos(time * 1.5) > 0 ? 1 : -1 });
  label(g, 'egret hops (inside its 40 u patch)', 230, gy + 8);
  drawRubbishPile(g, 400, gy);
  drawCrow(g, 400, gy - BIRD_BOX.crow.above, 'hover', time);
  label(g, 'crow hovers (bob 2 u)', 400, gy + 8);
  const fk = (time % 1.2) / 1.2;
  drawEgret(g, 520 + fk * 120, gy - fk * 120, 'fly', time, { facing: 1 });
  drawCrow(g, 640 + fk * 120, gy - 20 - fk * 120, 'fly', time, { facing: 1 });
  label(g, 'flying off (up and right, unhurt)', 600, gy + 8);
  drawEgret(g, 800, gy, 'peck', time, { fufu: true, facing: 1 });
  drawEgret(g, 850, gy - 40, 'fly', time, { fufu: true, facing: 1 });
  drawCrow(g, 910, gy - 40, 'fly', time, { fufu: true, facing: 1 });
  label(g, 'lunch: off with a fufu ball', 860, gy + 8);
  drawPileKoboPop(g, 400, gy - 16, (time % 0.8) / 0.5, time);
  label(g, 'stomp: 2 kobo pop from the pile', 400, gy + 20, 8);

  // --- Close-ups: frames side by side, larger
  g.fillStyle = '#efe6d3';
  g.fillRect(0, 236, 960, 128);
  const big = (fn: () => void, x: number, y: number): void => {
    g.save();
    g.translate(x, y);
    g.scale(2, 2);
    fn();
    g.restore();
  };
  big(() => drawEgret(g, 0, 0, 'peck', 0), 40, 340);
  big(() => drawEgret(g, 0, 0, 'peck', 0.5), 100, 340);
  big(() => drawEgret(g, 0, 0, 'hop', 0.4), 160, 340);
  big(() => drawEgret(g, 0, 0, 'fly', 0, { facing: 1 }), 230, 340);
  big(() => drawEgret(g, 0, 0, 'fly', 0.25, { facing: 1 }), 300, 340);
  big(() => drawCrow(g, 0, 0, 'hover', 0, { still: true }), 380, 320);
  big(() => drawCrow(g, 0, 0, 'hover', 0.2, { still: false }), 450, 320);
  big(() => drawCrow(g, 0, 0, 'fly', 0.1, { facing: 1, fufu: true }), 520, 320);
  big(() => drawRubbishPile(g, 0, 0), 640, 350);
  label(g, 'egret: peck up, down, hop, fly up, down; crow: hover 2 frames, fly with a ball; the pile', 400, 350);

  // --- Gutters: short and long, weeds, drying, dry, trampled
  g.fillStyle = '#cfe8f4';
  g.fillRect(0, 368, 960, 120);
  const gy2 = 450;
  road(g, 0, 960, gy2, 30);
  const gut = (x: number, w: number, state: Parameters<typeof drawWeeds>[4], k = 0): void => {
    drawGutter(g, x, w, gy2);
    drawWeeds(g, x, w, gy2, state, k);
  };
  gut(40, GUTTER.short, 'weeds');
  label(g, 'short 30', 55, gy2 + 16);
  gut(120, GUTTER.long, 'weeds');
  label(g, 'long 44', 142, gy2 + 16);
  const dk = (time % 1.5) / GUTTER.dryTime;
  gut(230, GUTTER.long, dk < 1 ? 'drying' : 'dry', dk);
  if (dk < 1) drawWeedSteam(g, 252, gy2, dk);
  label(g, 'fufu: drying, fsss, steam', 252, gy2 + 16);
  gut(340, GUTTER.short, 'dry');
  label(g, 'dried', 355, gy2 + 16);
  gut(420, GUTTER.long, 'trampled');
  label(g, 'trampled (amala)', 442, gy2 + 16);
  g.save();
  g.translate(520, gy2);
  g.scale(3, 3);
  drawGutter(g, 0, GUTTER.long, 0);
  drawWeeds(g, 0, GUTTER.long, 0, 'weeds');
  g.restore();
  label(g, 'close up: never moves (no time argument)', 590, gy2 - 80);
  // Hero over a long gutter (a walking hold clears it)
  hero(g, 800, gy2 - 30, { skin: 2, hair: 1, outfit: 1, body: 0, age: 0 }, { phase: 0, inAir: true, facing: 1, glow: false, vy: 0, time }, 1);
  gut(778, GUTTER.long, 'weeds');
  label(g, 'hero over a long gutter', 800, gy2 + 16);

  // --- Dash gap: signs, gap with cement blocks (Gentle)
  g.fillStyle = '#e9e1cf';
  g.fillRect(0, 492, 960, 228);
  const gy3 = 640;
  road(g, 0, 300, gy3, 80);
  road(g, 560, 960, gy3, 80);
  g.fillStyle = '#2a1f17';
  g.fillRect(300, gy3, 260, 80);
  drawCementBlocks(g, 300 + 100, gy3, 720);
  drawDashSign(g, 180, gy3);
  label(g, 'dash gap sign', 180, gy3 + 6);
  drawPotholeSign(g, 80, gy3);
  label(g, 'pothole sign (compare)', 80, gy3 + 6);
  label(g, `Gentle: block stack ${CEMENT_BLOCKS.w} u in the middle of a 260 u dash gap`, 430, gy3 - 40);
  g.save();
  g.translate(640, 520);
  g.scale(2.5, 2.5);
  drawDashSign(g, 0, 56, true);
  g.restore();
  g.save();
  g.translate(760, 520);
  g.scale(2.5, 2.5);
  drawDashSign(g, 0, 56, false);
  g.restore();
  label(g, 'close up: fresh and worn', 700, 664);
};

export const B_PAGES: Page[] = [heroPage, streetPage];
