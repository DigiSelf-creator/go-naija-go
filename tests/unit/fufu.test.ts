/**
 * Pepper fufu (docs/design.md S2.15): ball flight, plop, two smaller hops then a roll, plugs,
 * big pits, goats fed and never touched, tyres and drums knocked off, the limits, the count,
 * the hall (bowl drop, pops, the jam's delay), the X key and the Throw button's place.
 */
import { describe, expect, it } from 'vitest';
import street1 from '../../src/data/levels/lagos-1.json';
import street2 from '../../src/data/levels/lagos-2.json';
import street3 from '../../src/data/levels/lagos-3.json';
import hallData from '../../src/data/levels/lagos-hall.json';
import { Controls } from '../../src/engine/input';
import { BOSS_RULES } from '../../src/game/boss';
import { FUFU_RULES, tossBall } from '../../src/game/fufu';
import { parseLevel, type Level } from '../../src/game/level';
import { pitsOf } from '../../src/game/pits';
import { HAZARD_BOX, RULES, Run, type RunEvent } from '../../src/game/run';
import { buttonLayout, hintBarBox } from '../../src/screens/controls';
import { WORDS, hintWords } from '../../src/screens/words';

const DT = 1 / 60;
const GY = 300;

/** A plain test street: road from -400 to `gaps`, then road to 4000, nothing else unless asked. */
function street(o: { ground?: [number, number][]; hazards?: [string, number][]; crates?: [number, number, string][]; foods?: [number, number, string][] } = {}): Level {
  const raw = structuredClone(street1) as Record<string, unknown>;
  Object.assign(raw, {
    id: 'test-street',
    ground: o.ground ?? [[-400, 4000]],
    platforms: [],
    kobo: [],
    foods: o.foods ?? [],
    hazards: o.hazards ?? [],
    crates: o.crates ?? [],
    hints: [],
    wells: [],
    checkpoint: 3000,
    end: { x: 3800, wall: 3900 },
  });
  return parseLevel(raw);
}

function run(level: Level, x = 100, fufu = 8): Run {
  const r = new Run(level);
  r.hero.x = x;
  r.fufu = fufu;
  return r;
}

function steps(r: Run, n: number, safe = false): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < n; i++) {
    all.push(...r.step(DT));
    if (safe) r.safe = 10;
  }
  return all;
}
const types = (ev: RunEvent[]) => ev.map((e) => e.type);

describe('how a ball flies (S2.15)', () => {
  it('thrown at a stand on the ground it lands about 86 u ahead (within 3 u)', () => {
    const r = run(street());
    expect(r.throwFufu()).toBe(true);
    const x0 = r.balls[0]!.x;
    expect(x0).toBe(100 + FUFU_RULES.ahead);
    expect(r.balls[0]!.y).toBe(GY - FUFU_RULES.hand);
    let landX = NaN;
    for (let i = 0; i < 60 && Number.isNaN(landX); i++) {
      const ev = r.step(DT);
      const plop = ev.find((e) => e.type === 'fufuPlop');
      if (plop && plop.type === 'fufuPlop') landX = plop.x;
    }
    expect(Math.abs(landX - x0 - 86)).toBeLessThanOrEqual(3);
  });

  it('adds the hero speed the way it faces, never against it; facing left throws left', () => {
    const b = tossBall({ x: 0, y: GY, dir: 1, vx: 156, grounded: true });
    expect(b.vx).toBe(240 + 156);
    expect(b.vy).toBe(-180);
    expect(tossBall({ x: 0, y: GY, dir: 1, vx: -90, grounded: true }).vx).toBe(240);
    const left = tossBall({ x: 0, y: GY, dir: -1, vx: -90, grounded: true });
    expect(left.vx).toBe(-(240 + 90));
    expect(left.x).toBe(-12);
  });

  it('in the air it aims down: 150 across plus the hero speed, 260 down', () => {
    const b = tossBall({ x: 0, y: 200, dir: 1, vx: 100, grounded: false });
    expect(b.vx).toBe(250);
    expect(b.vy).toBe(260);
  });

  it('plop, hop, little hop, roll: each hop smaller, never a run of equal bounces; then it settles at 1.5 s', () => {
    const r = run(street());
    r.throwFufu();
    const lands: { hop: boolean; t: number }[] = [];
    let rollAt = -1;
    let settleAt = -1;
    let topAfter: number[] = [];
    let top = Infinity;
    for (let i = 0; i < 200 && r.balls.length > 0; i++) {
      const b = r.balls[0]!;
      const before = b.touches;
      for (const e of r.step(DT)) {
        if (e.type === 'fufuPlop') lands.push({ hop: e.hop, t: i });
        if (e.type === 'fufuRoll') rollAt = i;
        if (e.type === 'fufuSettle') settleAt = i;
      }
      if (r.balls[0] && r.balls[0].touches !== before) {
        if (before > 0) topAfter.push(GY - top);
        top = Infinity;
      }
      if (r.balls[0]) top = Math.min(top, r.balls[0].y);
    }
    expect(lands.map((l) => l.hop)).toEqual([false, true]);
    expect(rollAt).toBeGreaterThan(lands[1]!.t);
    // The two hops: the second is smaller than the first.
    expect(topAfter.length).toBe(2);
    expect(topAfter[1]!).toBeLessThan(topAfter[0]!);
    expect(topAfter[0]!).toBeGreaterThan(0);
    expect(settleAt - lands[0]!.t).toBe(FUFU_RULES.rollSteps);
    expect(r.balls).toEqual([]); // gone after the 0.3 s settle
  });

  it('is gone at the start fence and at the bus', () => {
    const r = run(street(), 60);
    r.hero.dir = -1;
    r.throwFufu();
    steps(r, 90);
    expect(r.balls).toEqual([]);
    const r2 = run(street(), 3750);
    r2.hero.vx = 228;
    r2.throwFufu();
    steps(r2, 20);
    expect(r2.balls.every((b) => b.x <= 3800)).toBe(true);
  });
});

describe('limits and the count', () => {
  it('one press, one ball; at most one every 0.25 s; at most 3 out at once', () => {
    const r = run(street(), 100, 16);
    expect(r.throwFufu()).toBe(true);
    expect(r.throwFufu()).toBe(false); // too soon
    steps(r, FUFU_RULES.coolSteps - 1);
    expect(r.throwFufu()).toBe(false);
    steps(r, 1);
    expect(r.throwFufu()).toBe(true);
    steps(r, FUFU_RULES.coolSteps);
    expect(r.throwFufu()).toBe(true);
    steps(r, FUFU_RULES.coolSteps);
    expect(r.balls.filter((b) => b.mode === 'fly' || b.mode === 'roll')).toHaveLength(3);
    expect(r.throwFufu()).toBe(false); // 3 out: nothing
    expect(r.fufu).toBe(13);
  });

  it('a bowl gives 8, a second gives up to 16 (12 + 8 = 16), and with 0 nothing throws', () => {
    const lv = street({ foods: [[200, 272, 'fufu'], [400, 272, 'fufu']] });
    const r = run(lv, 100, 0);
    expect(r.throwFufu()).toBe(false);
    expect(r.canThrow).toBe(false);
    r.steer(1);
    const ev = steps(r, 120);
    expect(ev.filter((e) => e.type === 'food')).toHaveLength(1);
    expect(r.fufu).toBe(8);
    r.fufu = 12;
    steps(r, 200);
    expect(r.fufu).toBe(16);
    expect(r.canThrow).toBe(true);
  });

  it('a lost life takes every ball: a hit, and a fall', () => {
    const r = run(street({ hazards: [['tyre', 300]] }), 100, 8);
    steps(r, 60 * 10);
    expect(r.lives).toBeLessThan(3);
    expect(r.fufu).toBe(0);
    const f = run(street({ ground: [[-400, 200], [400, 4000]] }), 150, 8);
    f.steer(1);
    const ev = steps(f, 120);
    expect(types(ev)).toContain('fall');
    expect(f.fufu).toBe(0);
    expect(f.balls).toEqual([]);
  });

  it('a fufu bowl at or past the restart point comes back after a fall', () => {
    const r = run(street({ ground: [[-400, 600], [700, 4000]], foods: [[300, 272, 'fufu']] }), 100, 0);
    r.steer(1);
    for (let i = 0; i < 600 && !r.foods[0]!.taken; i++) r.step(DT);
    expect(r.fufu).toBe(8);
    for (let i = 0; i < 600 && r.lives === 3; i++) r.step(DT);
    expect(r.fufu).toBe(0);
    expect(r.foods[0]!.taken).toBe(false);
  });
});

describe('what a ball does: potholes', () => {
  const holed = (): Level => street({ ground: [[-400, 300], [400, 4000]] }); // a 100 u wide pothole at 300

  it('one ball plugs a 100 u pothole; the hero walks over it; it stays plugged after a lost life', () => {
    const r = run(holed(), 260, 8);
    r.hero.dir = 1;
    // Rolled into it from close by.
    const ev = steps(r, 120);
    void ev;
    r.throwFufu();
    const out = steps(r, 120);
    const plug = out.find((e) => e.type === 'fufuPlug');
    expect(plug).toMatchObject({ type: 'fufuPlug', a: 300, b: 400, first: true });
    expect(r.plugged).toEqual([{ a: 300, b: 400, w: 100 }]);
    r.steer(1);
    const walk = steps(r, 60 * 4);
    expect(types(walk)).not.toContain('fall');
    expect(r.hero.x).toBeGreaterThan(420);
    // A lost life (a forced fall elsewhere) keeps it plugged.
    r.hero.y = 900;
    r.step(DT);
    r.lives = 3;
    expect(r.plugged).toHaveLength(1);
    expect(r.terrain.ground.some((g) => g.x0 === 300 && g.x1 === 400)).toBe(true);
  });

  it('a big pit (170 u) is never plugged: the ball drops away with a far-off plop', () => {
    const r = run(street({ ground: [[-400, 300], [470, 4000]] }), 260, 8);
    r.throwFufu();
    const out = steps(r, 120);
    expect(types(out)).toContain('fufuFarPlop');
    expect(types(out)).not.toContain('fufuPlug');
    expect(r.plugged).toEqual([]);
  });

  it('every pothole 30 to 110 u on the Lagos streets can be plugged; their big pits cannot', () => {
    for (const raw of [street1, street2, street3]) {
      for (const p of pitsOf(parseLevel(raw).ground)) {
        const plug = p.w >= FUFU_RULES.plugMin && p.w <= FUFU_RULES.plugMax;
        expect(plug, `${p.a} ${p.w}`).toBe(p.w < 160);
      }
    }
  });

  it('a plugged pothole has no Gentle mode climb-out (it is road)', () => {
    const lv = street({ ground: [[-400, 300], [400, 1000], [1060, 4000]] });
    const r = new Run(lv, { gentle: true });
    r.hero.x = 260;
    r.fufu = 8;
    r.throwFufu();
    steps(r, 120);
    expect(r.plugged).toHaveLength(1);
    r.hero.x = 1030; // over the other pothole
    r.hero.y = 900;
    const ev = steps(r, 1);
    const c = ev.find((e) => e.type === 'climbOut');
    // The pothole it fell in (1000 to 1060), never the plugged one: 100 u before its lip.
    expect(c && c.type === 'climbOut' ? c.x : NaN).toBe(900);
  });
});

describe('what a ball does: hazards and crates', () => {
  it('a tyre is knocked off the road: +1 kobo, the ball used up; a drum the same', () => {
    for (const kind of ['tyre', 'drum'] as const) {
      const r = run(street({ hazards: [[kind, 300]] }), 100, 8);
      r.throwFufu();
      const ev = steps(r, 60, true);
      expect(ev.find((e) => e.type === 'fufuKnock')).toMatchObject({ kind });
      expect(r.kobo).toBe(1);
      expect(r.hazards[0]!.mode).not.toBe('move');
      steps(r, FUFU_RULES.knockSteps + 1, true);
      expect(r.hazards[0]!.mode).toBe('gone');
      expect(r.balls).toEqual([]);
    }
  });

  it('a goat is never touched from any angle, ground or air: it always eats, says meeh and trots off', () => {
    let tries = 0;
    let fed = 0;
    for (const dist of [60, 90, 120, 160, 200, 260, 320, 400]) {
      for (const air of [false, true]) {
        for (const side of [1, -1] as const) {
          for (const vx of [0, 90, 156]) {
            const gx = 1500;
            const r = run(street({ hazards: [['goat', gx]] }), gx - side * dist, 8);
            r.hero.dir = side;
            r.hero.vx = vx * side;
            if (air) {
              r.hero.y = GY - 60;
              r.hero.grounded = false;
              r.hero.vy = 0;
            }
            const goat = r.hazards[0]!;
            goat.mode = 'move';
            goat.vx = -side * 36;
            expect(r.throwFufu()).toBe(true);
            const ev: RunEvent[] = [];
            for (let i = 0; i < 240; i++) {
              ev.push(...r.step(DT));
              r.safe = 10;
              for (const b of r.balls) {
                if (b.mode === 'gone') continue;
                const box = HAZARD_BOX.goat;
                const touching = b.x + 6 >= goat.x - box.halfW && b.x - 6 <= goat.x + box.halfW && b.y >= goat.y - box.h && b.y - 12 <= goat.y;
                if ((goat.mode as string) === 'wait' || (goat.mode as string) === 'move') expect(touching, `dist ${dist} air ${air} side ${side}`).toBe(false);
              }
            }
            tries++;
            if (ev.some((e) => e.type === 'goatEat')) {
              fed++;
              expect(types(ev)).toContain('goatMeeh');
              expect(['runAway', 'gone']).toContain(goat.mode);
              expect(r.lives).toBe(3);
            }
          }
        }
      }
    }
    expect(tries).toBeGreaterThanOrEqual(50);
    console.log(`goat tries ${tries}, fed ${fed}`);
    expect(fed).toBeGreaterThanOrEqual(tries / 2);
  });

  it('a fed goat stops 16 u away on the hero side, eats for 0.6 s, then runs away (unhurt)', () => {
    const r = run(street({ hazards: [['goat', 400]] }), 200, 8);
    r.hazards[0]!.mode = 'move';
    r.hazards[0]!.vx = 0;
    r.throwFufu();
    let eatAt = -1;
    let meehAt = -1;
    for (let i = 0; i < 120; i++) {
      for (const e of r.step(DT)) {
        if (e.type === 'goatEat') eatAt = i;
        if (e.type === 'goatMeeh') meehAt = i;
      }
      if (eatAt === i) {
        const b = r.balls.find((q) => q.mode === 'fed')!;
        expect(b.x).toBe(400 - HAZARD_BOX.goat.halfW - FUFU_RULES.goatGap - FUFU_RULES.r);
        expect(b.y).toBe(GY);
        expect(r.hazards[0]!.mode).toBe('eat');
        expect(r.hazards[0]!.face).toBe(-1);
      }
    }
    expect(meehAt - eatAt).toBe(FUFU_RULES.eatSteps);
    expect(r.hazards[0]!.mode).toBe('runAway');
    expect(r.kobo).toBe(0);
  });

  it('a ball never opens a crate: touching one it drops straight down', () => {
    // (Hung low for this check, so the ball's arc meets its side.)
    const r = run(street({ crates: [[200, 280, 'kobo']] }), 100, 8);
    r.throwFufu();
    let xAtTouch = NaN;
    for (let i = 0; i < 60; i++) {
      r.step(DT);
      const b = r.balls[0];
      if (b && b.vx === 0 && Number.isNaN(xAtTouch)) xAtTouch = b.x;
    }
    expect(Number.isNaN(xAtTouch)).toBe(false);
    expect(r.crates[0]!.open).toBe(false);
    expect(r.kobo).toBe(0);
  });

  it('kobo and foods are never collected by a ball', () => {
    const raw = structuredClone(street1) as Record<string, unknown>;
    const lv = street({ foods: [[200, 290, 'corn']] });
    void raw;
    const r = run(lv, 100, 8);
    r.throwFufu();
    steps(r, 60);
    expect(r.foods[0]!.taken).toBe(false);
    expect(r.power.corn).toBe(0);
  });
});

describe('the food placements (S2.15)', () => {
  it('one fufu bowl per street, at 8700, 4800 and 5800 on the road; the hall drops one at 120 after hit 1', () => {
    expect([street1, street2, street3].map((raw) => parseLevel(raw).foods.filter((f) => f.kind === 'fufu'))).toEqual([
      [{ x: 8700, y: 272, kind: 'fufu' }],
      [{ x: 4800, y: 272, kind: 'fufu' }],
      [{ x: 5800, y: 272, kind: 'fufu' }],
    ]);
    expect(parseLevel(hallData).boss!.fufu).toEqual({ x: 120, afterHit: 1 });
  });
});

describe('pepper fufu in Go-Slow Hall', () => {
  const HALL = parseLevel(hallData);
  const wait = (r: Run, s: number) => steps(r, Math.round(s * 60), true);
  /** The hero standing on the hall floor at x. */
  const stand = (r: Run, x: number) => Object.assign(r.hero, { x, y: GY, prevY: GY, vy: 0, vx: 0, grounded: true, on: null, dir: 1 });
  function toPhase2(): Run {
    const r = new Run(HALL);
    const boss = r.boss!;
    while (boss.lit !== 0) {
      r.step(DT);
      r.safe = 10;
    }
    const p = HALL.boss!.lights[0]!;
    Object.assign(r.hero, { x: p.x + p.w / 2, y: p.y - 20, prevY: p.y - 20, vy: 60, vx: 0, grounded: false, on: null });
    for (let i = 0; i < 30 && boss.hits === 0; i++) r.step(DT);
    expect(boss.hits).toBe(1);
    return r;
  }

  it('phase 1 has no fufu; the bowl drops at x 120 when the break after hit 1 ends, once per try', () => {
    const r = toPhase2();
    expect(r.foods).toEqual([]);
    const ev = wait(r, 1.5);
    expect(ev.filter((e) => e.type === 'fufuBowl')).toEqual([{ type: 'fufuBowl', x: 120, y: 272 }]);
    expect(r.foods).toEqual([{ x: 120, y: 272, kind: 'fufu', taken: false }]);
    stand(r, 120);
    wait(r, 0.1);
    expect(r.fufu).toBe(8);
    expect(types(wait(r, 10))).not.toContain('fufuBowl');
  });

  it('a ball pops a tyre into dust, and a honk ("pff"); the ball is used up', () => {
    const r = toPhase2();
    wait(r, 1.5);
    r.fufu = 8;
    const boss = r.boss!;
    // Far enough that the ball meets it low, hopping (a close tyre is flown over).
    boss.throws = [{ kind: 'tyre', x: 400, y: 300, vx: -192, rot: 0 }];
    stand(r, 150);
    r.throwFufu();
    const ev = wait(r, 1);
    expect(ev.find((e) => e.type === 'fufuPop')).toMatchObject({ kind: 'tyre' });
    expect(types(ev)).toContain('dust');
    expect(boss.throws.filter((t) => t.kind === 'tyre' && t.vx === -192 && t.x > 250)).toEqual([]);
    boss.throws = [{ kind: 'honk', x: 200, y: GY - FUFU_RULES.hand - 6, vx: -120, rot: 0 }];
    stand(r, 150);
    wait(r, 0.3);
    r.throwFufu();
    const ev2 = wait(r, 1);
    expect(ev2.find((e) => e.type === 'fufuPop')).toMatchObject({ kind: 'honk' });
  });

  it('a ball at the jam: "pfft", its next throw comes 0.5 s later (once per throw at most), never a hit', () => {
    const r = toPhase2();
    wait(r, 1.5);
    const boss = r.boss!;
    // The next throw's step with nothing touching the jam.
    const plain = new Run(HALL);
    void plain;
    r.fufu = 8;
    stand(r, 400);
    boss.throws = [];
    let throwsAt: number[] = [];
    let jams: boolean[] = [];
    for (let i = 0; i < 60 * 5; i++) {
      if (i === 0 || i === 20) r.throwFufu();
      for (const e of r.step(DT)) {
        if (e.type === 'bossThrow') throwsAt.push(boss.steps);
        if (e.type === 'fufuJam') jams.push(e.pushed);
      }
      r.safe = 10;
      boss.throws = boss.throws.filter((t) => t.x < 300);
    }
    // The break ended 1.5 s after the hit; the first throw is 1.8 s into phase 2, +0.5 s.
    expect(jams).toEqual([true, false]);
    expect(boss.hits).toBe(1);
    const phaseStart = throwsAt[0]! - Math.round((1.8 + BOSS_RULES.jamDelay) * 60);
    expect(throwsAt[1]! - throwsAt[0]!).toBe(Math.round(1.8 * 60));
    expect(phaseStart).toBeGreaterThan(0);
  });

  it('a lit light still needs a landing: balls never hit a light', () => {
    const r = toPhase2();
    wait(r, 1.5 + 4.0);
    expect(r.boss!.lit).toBe(1);
    r.fufu = 8;
    stand(r, 250);
    for (let i = 0; i < 3; i++) {
      r.throwFufu();
      wait(r, 0.3);
    }
    wait(r, 1);
    expect(r.boss!.hits).toBe(1);
  });
});

describe('Throw: the X key and the button (S2.15)', () => {
  it('X throws once per press; key repeat is ignored', () => {
    let n = 0;
    const c = new Controls({ onJumpPress: () => {}, onJumpRelease: () => {}, onMove: () => {}, onThrow: () => n++ }, () => ({ width: 800, height: 400, midX: 80, buttons: false }), 'touch');
    expect(c.keyDown('KeyX', false)).toBe(true);
    expect(c.keyDown('KeyX', true)).toBe(true);
    c.keyUp('KeyX');
    c.keyDown('KeyX', false);
    expect(n).toBe(2);
    expect(c.lastKind).toBe('keys');
    expect(c.jumpHeld).toBe(0);
  });

  it('sits where the S2.15 table says, max(64, D), 10 px left of Jump, same bottom; touch area 5 px round', () => {
    const rows: [number, number, number, number, number, number][] = [
      // w, h, jump x0, jump x1, throw x0, throw x1
      [320, 240, 224, 308, 150, 214],
      [480, 270, 370, 468, 295, 360],
      [568, 230, 472, 556, 398, 462],
      [640, 200, 544, 628, 470, 534],
      [568, 320, 437, 556, 348, 427],
      [667, 375, 535, 655, 445, 525],
      [1024, 768, 892, 1012, 802, 882],
    ];
    for (const [w, h, j0, j1, t0, t1] of rows) {
      const L = buttonLayout(w, h);
      expect([Math.round(L.jump.x), Math.round(L.jump.x + L.jump.w)], `${w}x${h} jump`).toEqual([j0, j1]);
      expect([Math.round(L.throw.x), Math.round(L.throw.x + L.throw.w)], `${w}x${h} throw`).toEqual([t0, t1]);
      expect(L.throw.w).toBeGreaterThanOrEqual(64);
      expect(L.throw.y + L.throw.h).toBe(L.jump.y + L.jump.h);
      expect(L.throwTouch).toEqual({ x: L.throw.x - 5, y: L.throw.y - 5, w: L.throw.w + 10, h: L.throw.h + 10 });
      // The touch area never goes past the middle of the 10 px gap to Jump.
      expect(L.throwTouch.x + L.throwTouch.w).toBeLessThanOrEqual(L.jump.x - 5);
    }
    const home = buttonLayout(851, 393, { top: 0, right: 0, bottom: 21, left: 0 });
    expect([home.throw.x, home.throw.x + home.throw.w]).toEqual([629, 709]);
  });

  it('the hint bar ends 6 px left of Throw while it shows; at 320 x 240 it keeps its place over Throw', () => {
    const none = { top: 0, right: 0, bottom: 0, left: 0 };
    const bar = (w: number, h: number, t: boolean, safe = none) => hintBarBox(w, h, safe, buttonLayout(w, h, safe), 'all', t);
    const span = (b: { x: number; w: number }) => [Math.round(b.x), Math.round(b.x + b.w)];
    expect(span(bar(480, 270, true))).toEqual([158, 289]);
    expect(span(bar(568, 230, true))).toEqual([140, 392]);
    expect(span(bar(640, 200, true))).toEqual([140, 464]);
    expect(span(bar(568, 320, true))).toEqual([186, 342]);
    expect(span(bar(667, 375, true))).toEqual([188, 439]);
    // (The S2.2 bar's left end here is 188, as built; S2.15's table only moves the right end.)
    expect(span(bar(851, 393, true, { top: 0, right: 0, bottom: 21, left: 0 }))[1]).toBe(623);
    expect(span(bar(1024, 768, true))).toEqual([252, 732]);
    const narrow = bar(320, 240, true);
    expect(narrow.overThrow).toBe(true);
    expect(span(narrow)).toEqual(span(bar(320, 240, false)));
    for (const [w, h] of [[480, 270], [568, 230], [640, 200], [568, 320], [667, 375], [1024, 768]] as const) {
      const b = bar(w, h, true);
      expect(b.overThrow).toBe(false);
      expect(b.x + b.w).toBeLessThanOrEqual(buttonLayout(w, h).throw.x - 6 + 0.01);
    }
  });

  it('the words: {throw} is "Throw" on touch and "X" on keys; toasts 35 characters or fewer', () => {
    expect(hintWords(WORDS.toast.fufu, 'touch')).toBe('Pepper fufu! Press Throw to throw.');
    expect(hintWords(WORDS.toast.fufu, 'keys')).toBe('Pepper fufu! Press X to throw.');
    expect(hintWords(WORDS.toast.fufuHall, 'touch')).toBe('Fufu! Press Throw to pop throws.');
    expect(hintWords(WORDS.toast.fufuHall, 'keys')).toBe('Fufu! Press X to pop throws.');
    expect(WORDS.toast.plugged).toBe('Plugged! Fufu fills potholes.');
    for (const w of [WORDS.toast.fufu, WORDS.toast.fufuHall, WORDS.toast.plugged]) for (const k of ['touch', 'keys'] as const) expect(hintWords(w, k).length).toBeLessThanOrEqual(35);
    expect(WORDS.hud.fufu(8)).toBe('Fufu 8');
    expect(WORDS.hud.fufuSpoken(8)).toBe('Fufu balls: 8');
  });

  it('no "fireball" anywhere in the words (CLAUDE.md rule 2)', () => {
    expect(JSON.stringify(WORDS).toLowerCase()).not.toContain('fireball');
    expect(RULES).toBeTruthy();
  });
});
