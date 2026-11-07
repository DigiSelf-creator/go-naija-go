/**
 * H3: the finger and key rules (docs/design.md S2.2: Phone buttons, Fingers, Keys) and the
 * button sizes per screen.
 */
import { describe, expect, it } from 'vitest';
import { Controls, type Dir, type Source, type TouchAreas } from '../../src/engine/input';
import { buttonLayout } from '../../src/screens/controls';

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
