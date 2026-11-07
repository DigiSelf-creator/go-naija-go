/**
 * H3: the finger and key rules (docs/design.md S2.2: Phone buttons, Fingers, Keys) and the
 * button sizes per screen.
 */
import { describe, expect, it } from 'vitest';
import { Controls, type Dir, type Source, type TouchAreas } from '../../src/engine/input';
import lagos1 from '../../src/data/levels/lagos-1.json';
import { fitView } from '../../src/engine/view';
import { Game } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { MIN_D, buttonLayout } from '../../src/screens/controls';
import { recorder } from './recorder';

/** A 727 x 393 phone held sideways (the test profile): D 80, Back 12-92, Forward 102-182. */
const PHONE: TouchAreas = { width: 727, height: 393, midX: 97, buttons: true };
const BACK = { x: 52, y: 345 };
const FWD = { x: 142, y: 345 };
const JUMP = { x: 655, y: 345 };

function rig(areas: TouchAreas = PHONE) {
  const log: string[] = [];
  const moves: Dir[] = [];
  const c = new Controls(
    {
      onJumpPress: (by: Source) => log.push(`press ${by}`),
      onJumpRelease: (by: Source) => log.push(`release ${by}`),
      onMove: (d) => moves.push(d),
    },
    () => areas,
  );
  return { c, log, moves };
}

describe('S2.2 button sizes', () => {
  it('matches the table for every screen', () => {
    const rows = [
      { w: 320, h: 240, safe: 0, d: 56, leftEnd: 134, jump: [224, 308] },
      { w: 568, h: 320, safe: 0, d: 79, leftEnd: 180, jump: [437, 556] },
      { w: 667, h: 375, safe: 0, d: 80, leftEnd: 182, jump: [535, 655] },
      { w: 851, h: 393, safe: 21, d: 80, leftEnd: 182, jump: [719, 839] },
      { w: 1024, h: 768, safe: 0, d: 80, leftEnd: 182, jump: [892, 1012] },
    ];
    for (const r of rows) {
      const l = buttonLayout(r.w, r.h, { top: 0, left: 0, right: 0, bottom: r.safe });
      expect(l.d, `${r.w}x${r.h}`).toBe(r.d);
      expect(l.back.x).toBe(12);
      expect(l.forward.x + l.forward.w).toBe(r.leftEnd);
      expect(Math.round(l.jump.x)).toBe(r.jump[0]);
      expect(l.jump.x + l.jump.w).toBe(r.jump[1]);
      expect(l.back.y + l.back.h).toBe(r.h - Math.max(8, r.safe));
      // Fully below the road line.
      expect(l.back.y).toBeGreaterThanOrEqual((r.h * 300) / 420);
    }
  });
  it('keeps out of the notch on the left and right', () => {
    const l = buttonLayout(851, 393, { top: 0, left: 44, right: 44, bottom: 21 });
    expect(l.back.x).toBe(44);
    expect(l.jump.x + l.jump.w).toBe(851 - 44);
    expect(l.midX).toBe(44 + 80 + 5);
  });
});

describe('very short screens: the road line is raised clear of the 56 px buttons', () => {
  /** Where the road line (world y 300) is drawn, CSS px from the top, with the layout's lift. */
  const roadY = (w: number, h: number, lift: number): number => {
    const v = fitView(w, h, 1);
    return (300 - lift) * (h / v.height);
  };

  it('no lift on any normal screen, from 238 px tall up', () => {
    for (const w of [320, 480, 568, 640, 727, 851, 932, 1024, 1280]) {
      for (let h = 238; h <= 800; h++) {
        if (h > w) continue; // upright: not played
        expect(buttonLayout(w, h).lift, `${w}x${h}`).toBe(0);
      }
    }
  });

  it('640x200: buttons stay 56 px, the road line moves up to 4 px above them', () => {
    const l = buttonLayout(640, 200);
    expect(l.d).toBe(MIN_D);
    expect(l.back.y).toBe(136);
    // Without the lift the road line would be at 142.9 px, 7 px below the button tops.
    expect(roadY(640, 200, 0)).toBeGreaterThan(l.back.y);
    expect(l.lift).toBeCloseTo(22.8, 1);
    expect(roadY(640, 200, l.lift)).toBeCloseTo(l.back.y - 4, 6);
  });

  it('every short screen (and a home bar inset): just enough lift, never more', () => {
    for (const bottom of [0, 21]) {
      for (const w of [480, 640, 800]) {
        for (let h = 120; h < 300; h++) {
          const l = buttonLayout(w, h, { top: 0, left: 0, right: 0, bottom });
          expect(l.d).toBeGreaterThanOrEqual(MIN_D);
          const top = Math.min(l.back.y, l.forward.y, l.jump.y);
          const y = roadY(w, h, l.lift);
          expect(y, `${w}x${h} bottom ${bottom}`).toBeLessThanOrEqual(top - 4 + 1e-6);
          // Raised only when needed, and then only to the 4 px gap.
          if (l.lift > 0) expect(y).toBeCloseTo(top - 4, 6);
          else expect(roadY(w, h, 0)).toBeLessThanOrEqual(top - 4 + 1e-6);
        }
      }
    }
  });

  it('the game draws the world raised by the lift, and the HUD layer is not moved', () => {
    const game = new Game(parseLevel(structuredClone(lagos1)));
    const view = fitView(640, 200, 1);
    const r = recorder();
    game.lift = buttonLayout(640, 200).lift;
    game.render(r.g, view);
    const transforms = r.calls.filter((c) => c.name === 'setTransform').map((c) => c.args);
    expect(transforms[0]).toEqual([view.scale, 0, 0, view.scale, 0, -game.lift * view.scale]);
    expect(transforms.at(-1)).toEqual([view.scale, 0, 0, view.scale, 0, 0]);
    // The road is filled down to the bottom of the raised picture (no strip left unpainted).
    const road = r.calls.filter((c) => c.name === 'fillRect' && c.args[1] === 300);
    expect(road.length).toBeGreaterThan(0);
    const lowest = Math.max(...road.map((c) => (c.args[1] as number) + (c.args[3] as number)));
    expect(lowest).toBeGreaterThanOrEqual(view.height + game.lift - 1e-6);
  });
});

describe('S2.2 fingers', () => {
  it('a finger on the left 45 percent is a direction: Back left of the midpoint, Forward right of it', () => {
    const { c, moves } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    expect(c.dir).toBe(1);
    c.pointerUp(1);
    c.pointerDown(2, BACK.x, BACK.y, true);
    expect(c.dir).toBe(-1);
    c.pointerUp(2);
    expect(moves).toEqual([1, 0, -1, 0]);
    // Far above the buttons but still in the left part, below the top strip: still a direction.
    c.pointerDown(3, 300, 100, true);
    expect(c.dir).toBe(1);
  });

  it('rocking from Back to Forward without lifting turns at the midpoint', () => {
    const { c, moves } = rig();
    c.pointerDown(1, BACK.x, BACK.y, true);
    c.pointerMove(1, 96, BACK.y);
    expect(c.dir).toBe(-1);
    c.pointerMove(1, 98, BACK.y);
    expect(c.dir).toBe(1);
    expect(moves).toEqual([-1, 1]);
  });

  it('a finger on the right 55 percent is a jump press, anywhere there', () => {
    const { c, log } = rig();
    c.pointerDown(1, JUMP.x, JUMP.y, true);
    c.pointerDown(2, 400, 80, true);
    c.pointerUp(1);
    c.pointerUp(2);
    expect(log).toEqual(['press 1', 'press 2', 'release 1', 'release 2']);
    expect(c.dir).toBe(0);
  });

  it('the top strip (HUD) is neither', () => {
    const { c, log, moves } = rig();
    c.pointerDown(1, 50, 30, true);
    c.pointerDown(2, 600, 30, true);
    expect(log).toEqual([]);
    expect(moves).toEqual([]);
  });

  it('each finger keeps the area it first touched for its whole life', () => {
    const { c, log } = rig();
    c.pointerDown(1, JUMP.x, JUMP.y, true);
    c.pointerMove(1, FWD.x, FWD.y); // a jump finger sliding left never walks
    expect(c.dir).toBe(0);
    c.pointerUp(1);
    expect(log).toEqual(['press 1', 'release 1']);
  });

  it('a direction finger sliding into the jump area lets go (and does nothing until lifted); sliding up keeps it', () => {
    const { c, log } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    c.pointerMove(1, FWD.x, 70);
    expect(c.dir).toBe(1);
    c.pointerMove(1, 400, 200);
    expect(c.dir).toBe(0);
    c.pointerMove(1, FWD.x, FWD.y);
    expect(c.dir).toBe(0);
    expect(log).toEqual([]); // it never becomes a jump either
    c.pointerUp(1);
    c.pointerDown(2, FWD.x, FWD.y, true);
    expect(c.dir).toBe(1);
  });

  it('two direction fingers: the newest wins; when it lifts, the older one rules again', () => {
    const { c } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    c.pointerDown(2, BACK.x, BACK.y, true);
    expect(c.dir).toBe(-1);
    c.pointerUp(2);
    expect(c.dir).toBe(1);
  });

  it('every new jump finger is a new press; walking and jumping with two thumbs together works', () => {
    const { c, log } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    c.pointerDown(2, JUMP.x, JUMP.y, true);
    c.pointerDown(3, 500, 200, true);
    expect(c.dir).toBe(1);
    expect(c.jumpHeld).toBe(2);
    c.pointerUp(3);
    c.pointerUp(2);
    expect(log).toEqual(['press 2', 'press 3', 'release 3', 'release 2']);
    expect(c.dir).toBe(1);
  });

  it('let go of everything: fingers and keys still down do nothing until lifted and pressed again', () => {
    const { c, log } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    c.pointerDown(2, JUMP.x, JUMP.y, true);
    c.keyDown('ArrowLeft', false);
    c.keyDown('Space', false);
    expect(c.dir).toBe(-1);
    c.releaseAll();
    expect(c.dir).toBe(0);
    expect(c.jumpHeld).toBe(0);
    expect(log).toEqual(['press 2', 'press Space', 'release 2', 'release Space']);
    // Still resting: moving, repeats, and lifting do nothing.
    c.pointerMove(1, BACK.x, BACK.y);
    c.keyDown('ArrowLeft', true);
    c.keyDown('Space', false); // a fresh keydown of a key never lifted: ignored
    c.pointerUp(2);
    c.keyUp('Space');
    c.keyUp('ArrowLeft');
    expect(c.dir).toBe(0);
    expect(log).toHaveLength(4);
    // Pressed again: works.
    c.pointerUp(1);
    c.pointerDown(4, FWD.x, FWD.y, true);
    c.keyDown('Space', false);
    expect(c.dir).toBe(1);
    expect(log.at(-1)).toBe('press Space');
  });

  it('a finger leaving the screen edge lets go of everything', () => {
    const { c } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    c.pointerMove(1, FWD.x, 400);
    expect(c.dir).toBe(0);
  });

  it('without the buttons on screen (mouse only, or the slice 1 boss), a press anywhere is a jump', () => {
    const { c, log } = rig({ ...PHONE, buttons: false });
    c.pointerDown(1, FWD.x, FWD.y, false);
    c.pointerDown(2, 300, 20, false);
    expect(c.dir).toBe(0);
    expect(log).toEqual(['press 1', 'press 2']);
  });
});

describe('S2.2 keys', () => {
  it('right arrow and D forward, left arrow and A back; Space, Up and W jump', () => {
    const { c, log } = rig();
    for (const [code, dir] of [['ArrowRight', 1], ['KeyD', 1], ['ArrowLeft', -1], ['KeyA', -1]] as const) {
      expect(c.keyDown(code, false)).toBe(true);
      expect(c.dir).toBe(dir);
      c.keyUp(code);
      expect(c.dir).toBe(0);
    }
    for (const code of ['Space', 'ArrowUp', 'KeyW']) {
      c.keyDown(code, false);
      c.keyUp(code);
    }
    expect(log).toEqual(['press Space', 'release Space', 'press ArrowUp', 'release ArrowUp', 'press KeyW', 'release KeyW']);
    expect(c.keyDown('KeyQ', false)).toBe(false);
    expect(c.lastKind).toBe('keys');
  });

  it('both held: the last one pressed wins; letting it go hands back to the other', () => {
    const { c } = rig();
    c.keyDown('ArrowRight', false);
    c.keyDown('ArrowLeft', false);
    expect(c.dir).toBe(-1);
    c.keyUp('ArrowLeft');
    expect(c.dir).toBe(1);
  });

  it('key repeat is ignored', () => {
    const { c, log, moves } = rig();
    c.keyDown('Space', false);
    for (let i = 0; i < 5; i++) c.keyDown('Space', true);
    c.keyDown('ArrowRight', false);
    for (let i = 0; i < 5; i++) c.keyDown('ArrowRight', true);
    expect(log).toEqual(['press Space']);
    expect(moves).toEqual([1]);
  });

  it('the words follow the last thing used', () => {
    const { c } = rig();
    expect(c.lastKind).toBe('touch');
    c.keyDown('ArrowRight', false);
    expect(c.lastKind).toBe('keys');
    c.pointerDown(1, JUMP.x, JUMP.y, true);
    expect(c.lastKind).toBe('touch');
  });
});
