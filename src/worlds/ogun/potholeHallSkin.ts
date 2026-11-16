/**
 * O5b: Pothole Hall's look in play (docs/ogun.md 5.2 to 5.5 and 7). Gamedev's glue between the
 * game (Game.renderHall calls StreetSkin.hall) and art's pieces in hall.ts. It only draws and
 * reads the run and the fight; it never changes them. Lives in the lazy Ogun part.
 *
 * Draw order (art's hookup notes in hall.ts): the hall's back (cached), the roller, the door
 * people, the road mix pile, King Pothole, the mud patches and shadows, the throws, the plops
 * and fallen cones, the hero (with the bag on the head while carrying), the cut walls, his
 * bubble, then the hit counter at the top of the screen.
 *
 * The three door people (CO1): each look is baked once into a small sheet at the screen's own
 * pixel scale and copied 1:1 at whole device pixels (no scaled copies, no drawing a person every
 * frame), so they cost next to nothing on a slow phone.
 */
import { drawBubble, drawFolkFrame, FOLK_BOX, type FolkFrame } from '../../art/folk';
import { INK, WHITE } from '../../art/palette';
import type { SkinEvent, SkinNow, StreetSkin } from '../../game/skin';
import { WORDS } from '../../screens/words';
import { OGUN_WORDS } from '../../screens/words';
import {
  CROWN_CONES,
  HALL_CHEER_SPOTS,
  HALL_DOOR_PEOPLE,
  HALL_DOOR_SCALE,
  HALL_DOOR_SPOTS,
  POTHOLE_FILL,
  POTHOLE_FINISH,
  POT_HALL,
  crownConeFall,
  drawCarriedBag,
  drawConeLine,
  drawCrownCone,
  drawKingPothole,
  drawMudBlob,
  drawMudPatch,
  drawMudShadow,
  drawPlop,
  drawPotholeHall,
  drawPotholeHallFront,
  drawRoadMixPile,
  drawRoller,
  potholeFinishAt,
  type PotholeMood,
} from './hall';
import { DOOR_COST, type PotholeFight } from './potholeFight';
import { drawGravelNow, SAGAMU_LOOK } from './sagamuStreet';
import { drawGravelCrumble, drawGravelDust } from './sagamu';
import { STEPS } from './ogunLook';

type G = CanvasRenderingContext2D;

/** The look's own timings, s. */
export const HALL_LOOK = {
  plop: 0.4,
  coneFall: 0.8,
  bubble: 1.4,
  doorCheer: 1.0,
  /** At the finish the door people walk in along the back wall from here, at this speed (u/s). */
  walkIn: 2.5,
  walkSpeed: 110,
} as const;

interface Puff {
  x: number;
  at: number;
  crumble: boolean;
}

/** King Pothole's mood now (the finish has its own). */
export function potholeMood(f: PotholeFight, t: number): PotholeMood {
  const s = f.steps;
  const last = f.hitAt[f.hitAt.length - 1];
  if (last !== undefined && (s - last) / STEPS < HALL_LOOK.coneFall) return 'hit';
  if (f.gulp >= 0) return 'gulp';
  if (f.frozen) return 'watch';
  if ((s - f.bumpAt) / STEPS < HALL_LOOK.bubble || f.phase >= 2) return 'cross';
  void t;
  return 'calm';
}

/** His bubble now: "Hmph!", "Oof... hm!" or the giggle, with its age (s), or null. */
export function potholeBubble(f: PotholeFight): { text: string; age: number } | null {
  const w = OGUN_WORDS.hall.pothole;
  const s = f.steps;
  if (f.defeated) {
    const age = f.finishT;
    return age < POTHOLE_FINISH.yawn ? { text: w.giggle, age } : null;
  }
  const last = f.hitAt[f.hitAt.length - 1];
  if (last !== undefined && (s - last) / STEPS < HALL_LOOK.bubble) return { text: w.hit, age: (s - last) / STEPS };
  const b = (s - f.bumpAt) / STEPS;
  if (b < HALL_LOOK.bubble) return { text: w.bump, age: b };
  return null;
}

/**
 * The door people's frames, each baked once into its own small canvas at `px` device pixels per
 * unit (CO1: copied 1:1 at whole device pixels, never drawn person by person each frame).
 */
class DoorSprites {
  private px = 0;
  private readonly cells = new Map<string, HTMLCanvasElement>();

  /** Draws person i's frame with the feet at device pixel (x, y). */
  draw(g: G, i: number, frame: FolkFrame, x: number, y: number, px: number): void {
    if (Math.abs(px - this.px) > 0.01) {
      // A new screen scale: every frame of all three is baked now, so the finish never bakes.
      this.cells.clear();
      this.px = px;
      HALL_DOOR_PEOPLE.forEach((_, k) => DOOR_FRAMES.forEach((f) => this.cells.set(`${k}:${f}`, this.bake(k, f))));
    }
    const c = this.cells.get(`${i}:${frame}`) ?? this.bake(i, frame);
    g.drawImage(c, Math.round(x - 1 + FOLK_BOX.l * px), Math.round(y - 1 + FOLK_BOX.t * px));
  }

  private bake(i: number, frame: FolkFrame): HTMLCanvasElement {
    const px = this.px;
    const c = document.createElement('canvas');
    c.width = Math.ceil((FOLK_BOX.r - FOLK_BOX.l) * px) + 2;
    c.height = Math.ceil((FOLK_BOX.b - FOLK_BOX.t) * px) + 2;
    const cg = c.getContext('2d')!;
    cg.setTransform(px, 0, 0, px, 1 - FOLK_BOX.l * px, 1 - FOLK_BOX.t * px);
    drawFolkFrame(cg, HALL_DOOR_PEOPLE[i]!, frame);
    return c;
  }
}

/** The door people's frames: standing, cheering and walking in. */
const DOOR_FRAMES: readonly FolkFrame[] = ['stand', 'cheer0', 'cheer1', 'walk0', 'walk1', 'walk2', 'walk3'];

/** A fresh Pothole Hall look for one try. */
export function potholeHallSkin(): StreetSkin {
  const puffs: Puff[] = [];
  const sprites = new DoorSprites();
  /** The three door people: standing, cheering each bag, walking in and cheering at the finish. */
  const doorPeople = (g: G, f: PotholeFight, clock: number, still: boolean): void => {
    // Baked at the device scale times their size, then copied at whole device pixels.
    const m = g.getTransform();
    const px = m.a * HALL_DOOR_SCALE;
    const ft = f.finishT;
    const last = f.hitAt[f.hitAt.length - 1];
    const cheering = f.defeated ? ft >= POTHOLE_FINISH.cheer : last !== undefined && (f.steps - last) / STEPS < HALL_LOOK.doorCheer;
    const two = (since: number): FolkFrame => (still ? 'cheer0' : Math.floor(since / 0.25) % 2 ? 'cheer1' : 'cheer0');
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    HALL_DOOR_PEOPLE.forEach((_, i) => {
      let x = HALL_DOOR_SPOTS[i]!;
      let frame: FolkFrame = cheering ? two(clock + i * 0.12) : 'stand';
      if (f.defeated && ft >= HALL_LOOK.walkIn) {
        const to = HALL_CHEER_SPOTS[i]!;
        const walked = still ? Infinity : (ft - HALL_LOOK.walkIn) * HALL_LOOK.walkSpeed;
        x = Math.min(to, x + walked);
        if (x < to) frame = `walk${Math.floor(ft / 0.15) % 4}` as FolkFrame;
      }
      const y = POT_HALL.floorY - 4;
      // World to device: m.a per u, the camera already in m.e.
      const dx = Math.round(m.a * x + m.e);
      const dy = Math.round(m.d * y + m.f);
      sprites.draw(g, i, frame, dx, dy, px);
    });
    g.restore();
  };

  return {
    backdrop() {
      // The hall draws all of itself in hall().
    },
    hazard: drawGravelNow,
    hear(events: readonly SkinEvent[], s: SkinNow) {
      for (const e of events) {
        if (e.type === 'gravelHop') puffs.push({ x: e.x, at: s.clock, crumble: false });
        else if (e.type === 'crumble') puffs.push({ x: e.x, at: s.clock, crumble: true });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]!;
        if (s.clock - p.at >= (p.crumble ? SAGAMU_LOOK.crumble : SAGAMU_LOOK.dust)) puffs.splice(i, 1);
      }
      if (puffs.length > SAGAMU_LOOK.puffs) puffs.splice(0, puffs.length - SAGAMU_LOOK.puffs);
    },
    restart() {
      puffs.length = 0;
    },
    hall(g, s, hero, view) {
      const f = s.run.arena as PotholeFight | null;
      if (!f) return false;
      const { camX, viewW, H, clock, still } = s;
      const gy = POT_HALL.floorY;
      const t = still ? 0 : clock;
      const fin = f.defeated ? potholeFinishAt(f.finishT, f.pitX, POTHOLE_FILL[2], still) : null;
      // O6b: the danfo and the tipper roll out once the doors are open (ogun.md part 7).
      const rollOut = f.defeated ? f.finishT - POTHOLE_FINISH.doorsFrom - POTHOLE_FINISH.doorsSwing : -1;
      drawPotholeHall(g, camX, viewW, H, fin ? { lamps: fin.lamps, doors: fin.doors, gateLit: fin.gateLit, arrows: fin.smooth, rollOut, time: clock, still } : { time: clock, still });
      drawRoller(g, fin ? fin.roller.x : POT_HALL.rollerX, gy, fin ? fin.roller : {});
      // The door people, unless the people are switched off (a fault, as in Go-Slow Hall). CO1: their cost is kept for qa.
      if (s.people?.on !== false) {
        const t0 = performance.now();
        doorPeople(g, f, clock, still);
        const ms = performance.now() - t0;
        const c = DOOR_COST;
        c.frames++;
        c.avg += (ms - c.avg) / Math.min(c.frames, 120);
        if (c.frames > 30) c.max = Math.max(c.max, ms);
      }
      drawRoadMixPile(g, f.bagReady, gy);
      // King Pothole: fuller with each bag; his cones fall one by one.
      const hits = f.hits;
      const sinceHit = hits > 0 ? (f.steps - f.hitAt[hits - 1]!) / STEPS : Infinity;
      if (fin) {
        drawKingPothole(g, f.pitX, gy, { mood: fin.mood, fill: fin.fill, cones: fin.smooth > 0 ? 0 : 1, coneTip: fin.coneTip, smooth: fin.smooth, smile: fin.smile, time: clock, still });
        if (fin.smooth > 0) drawConeLine(g, f.pitX + POT_HALL.pitW / 2 + 12, gy);
      } else {
        const from = POTHOLE_FILL[Math.max(0, hits - 1)] ?? 0;
        const to = POTHOLE_FILL[Math.min(hits, POTHOLE_FILL.length - 1)] ?? 0;
        const fill = still ? to : from + (to - from) * Math.min(1, sinceHit / HALL_LOOK.coneFall);
        const bumpK = (f.steps - f.bumpAt) / STEPS / 0.4;
        drawKingPothole(g, f.pitX, gy, {
          mood: potholeMood(f, clock),
          fill,
          cones: 3 - hits,
          gulp: Math.max(0, f.gulp),
          bump: bumpK >= 0 && bumpK < 1 ? bumpK : 0,
          time: clock,
          still,
        });
      }
      // Mud patches drying, shadows of blobs on the way, the blobs.
      for (const q of f.splats) drawMudPatch(g, q.m.x + q.m.w / 2, q.m.w, gy, (f.steps - q.at) / (q.until - q.at), t, still);
      for (const b of f.blobs) {
        const p = f.blobAt(b);
        drawMudShadow(g, b.x1, gy, p.k, f.data.mud.width);
        drawMudBlob(g, p.x, p.y, clock, still);
      }
      // The plop where the last bag went in; the cones knocked off his crown, lying at his side.
      if (sinceHit < HALL_LOOK.plop) drawPlop(g, f.pitX, gy + 20, sinceHit / HALL_LOOK.plop);
      if (!fin || fin.smooth <= 0) {
        for (let i = 0; i < hits && i < 2; i++) {
          const c = CROWN_CONES[i]!;
          const k = (f.steps - f.hitAt[i]!) / STEPS / HALL_LOOK.coneFall;
          const dir: 1 | -1 = i === 0 ? -1 : 1;
          const p = crownConeFall(k, dir, still);
          drawCrownCone(g, f.pitX + c.dx + p.dx, gy + p.dy, c.s, p.tilt);
        }
      }
      const pose = hero();
      if (pose && f.carrying) drawCarriedBag(g, s.look, pose, s.run.hero.x, s.run.hero.y);
      if (!still) {
        for (const p of puffs) {
          if (p.crumble) drawGravelCrumble(g, p.x, gy, (clock - p.at) / SAGAMU_LOOK.crumble);
          else drawGravelDust(g, p.x, gy, (clock - p.at) / SAGAMU_LOOK.dust);
        }
      }
      drawPotholeHallFront(g, camX, viewW, H);
      // His bubble, over his far rim; the door people's cheer on each bag.
      const bub = potholeBubble(f);
      if (bub) drawBubble(g, bub.text, f.pitX + 10, gy - 30, { tail: 'left' });
      const last = hits > 0 && !f.defeated ? sinceHit : Infinity;
      if (last < HALL_LOOK.bubble) {
        const said = WORDS.folk.hallHit[Math.min(1, hits - 1)]!;
        drawBubble(g, said, HALL_DOOR_SPOTS[1]!, gy - 48, { tail: 'left' });
      }
      // The hit counter: three cones under the HUD row, each gets a tick as a bag goes in.
      g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      drawBagCounter(g, view.width / 2, 66 + view.safe.top, f.defeated ? 3 : hits);
      return true;
    },
  };
}

/** Three cone shapes at the top: a bag in fills one, with a tick (never colour alone). */
export function drawBagCounter(g: G, x: number, y: number, bags: number): void {
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * 22;
    const done = i < bags;
    g.globalAlpha = done ? 1 : 0.45;
    drawCrownCone(g, cx, y + 9, 0.9, 0);
    g.globalAlpha = 1;
    if (done) {
      g.fillStyle = INK;
      g.beginPath();
      g.arc(cx + 7, y + 4, 5.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = WHITE;
      g.lineWidth = 1.8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx + 4.5, y + 4);
      g.lineTo(cx + 6.5, y + 6);
      g.lineTo(cx + 9.5, y + 2);
      g.stroke();
    }
  }
}
