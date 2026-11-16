/**
 * O5b: King Pothole in Pothole Hall, the rules (docs/ogun.md 5.3 to 5.6; decisions 78, 79).
 * - He is a 100 u pit sliding along his track (start 400, left first), 30 / 40 / 55 u/s by phase.
 * - He never moves while the hero is in the air, and slides again 0.3 s after landing.
 * - He never slides under a standing hero: his near lip stops 10 u before the hero's feet.
 * - Carry the bag (walk into it), drop it from the air over his middle 40 u: a hit. Never by
 *   landing, standing or walking past. Hurt: back to the pile. Fallen in: lost, a new one 1.0 s later.
 * - Throws: a 0.5 s gulp, then gravel (and from the first bag mud) from his near lip, every
 *   2.6 / 2.2 / 1.8 s; 1.5 s with no throws after a bag; mud 120 to 200 u from his near lip.
 * - Three bags: the kind finish, lamps, "The gateway is open!", the Win at 6 s.
 * - A fall: a life, back at x 50 and he goes to 400; Gentle: climb out on his left lip, a fifth slower.
 * - OG-R15: the gravel "tk" only on screen, one for two landings within 0.1 s.
 */
import { describe, expect, it } from 'vitest';
import hallRaw from '../../src/data/levels/ogun-hall.json';
import { TkGate } from '../../src/game/animal-calls';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { OGUN_WORDS } from '../../src/screens/words';
import { POTHOLE_RULES, PotholeDataError, PotholeFight, RUN_NUMBERS, parsePotholeHall } from '../../src/worlds/ogun/potholeFight';
import { musicCue } from '../../src/game/music-cue';

const DT = 1 / STEPS_PER_SECOND;
const DATA = parsePotholeHall(hallRaw);
const LEVEL = parseLevel(hallRaw);

function play(opts: { gentle?: boolean; parcel?: boolean; firstTry?: boolean } = {}): { run: Run; f: PotholeFight; ev: RunEvent[] } {
  let f: PotholeFight | null = null;
  const run = new Run(LEVEL, { gentle: opts.gentle ?? false, parcel: opts.parcel ?? false, arena: (r) => (f = new PotholeFight(DATA, r, { firstTry: opts.firstTry ?? false })) });
  return { run, f: f!, ev: [] };
}

/** Steps n times, keeping every event. */
function steps(p: { run: Run; ev: RunEvent[] }, n: number, each?: () => void): void {
  for (let i = 0; i < n; i++) {
    p.ev.push(...p.run.step(DT));
    each?.();
  }
}
const secs = (s: number): number => Math.round(s * STEPS_PER_SECOND);
const cues = (ev: RunEvent[]): { sound?: string; say?: string }[] => ev.filter((e): e is Extract<RunEvent, { type: 'cue' }> => e.type === 'cue');

/** Puts the hero in the air at x, above the floor, falling slowly. */
function inAir(run: Run, x: number, y = 250): void {
  const h = run.hero;
  h.x = x;
  h.y = y;
  h.prevY = y;
  h.vy = 0;
  h.vx = 0;
  h.grounded = false;
  h.on = null;
}

/** Walks the hero into the bag on the pile. */
function pickUp(p: ReturnType<typeof play>): void {
  p.run.steer(1);
  for (let i = 0; i < 120 && !p.f.carrying; i++) p.ev.push(...p.run.step(DT));
  p.run.steer(0);
  expect(p.f.carrying).toBe(true);
}

/** Carries a bag in and drops it from the air over his middle. */
function bag(p: ReturnType<typeof play>): void {
  // Wait for a bag on the pile, put the hero by it, pick it up.
  for (let i = 0; i < 300 && !p.f.bagReady; i++) p.ev.push(...p.run.step(DT));
  p.run.hero.x = 50;
  p.run.hero.vx = 0;
  pickUp(p);
  const hits = p.f.hits;
  inAir(p.run, p.f.pitX);
  p.ev.push(...p.run.step(DT));
  expect(p.f.hits).toBe(hits + 1);
  // Land on the floor left of him, clear of throws.
  p.run.hero.x = 120;
  for (let i = 0; i < 120 && !p.run.hero.grounded; i++) p.ev.push(...p.run.step(DT));
}

describe('ogun.md 5.6: the hall file', () => {
  it('reads King Pothole\'s block and the room', () => {
    expect(DATA.pit).toEqual({ width: 100, track: [230, 400], startX: 400, dropZone: 40, bumpGap: 30, resumeAfterLand: 0.3 });
    expect(DATA.phases.map((p) => [p.every, p.slide, p.pattern.join(',')])).toEqual([
      [2.6, 30, 'gravel'],
      [2.2, 40, 'gravel,mud'],
      [1.8, 55, 'gravel,gravel,mud'],
    ]);
    expect(LEVEL.hall).toEqual({ width: 560, leftLimit: 30, rightLimit: 530 });
    expect(LEVEL.boss).toBeNull(); // read by the Ogun part, not the Go-Slow reader
    expect(() => parsePotholeHall({ ...hallRaw, boss: { ...hallRaw.boss, pit: { ...hallRaw.boss.pit, startX: 900 } } })).toThrow(PotholeDataError);
    expect(() => parsePotholeHall({ ...hallRaw, boss: { ...hallRaw.boss, phases: [] } })).toThrow(PotholeDataError);
  });

  it('starts at once: the hero at 50, he at 400 sliding left, the floor cut at his lips', () => {
    const p = play();
    expect(p.run.phase).toBe('arena');
    expect(p.run.hero.x).toBe(50);
    expect(p.f.pitX).toBe(400);
    expect(p.run.terrain.ground.map((s) => [s.x0, s.x1])).toEqual([
      [-200, 350],
      [450, 760],
    ]);
    steps(p, 1);
    expect(cues(p.ev)[0]).toMatchObject({ sound: 'arena', say: OGUN_WORDS.hall.start, ms: 3000 });
    steps(p, 59);
    expect(p.f.pitX).toBeCloseTo(400 - 30, 0);
    expect(p.f.dir).toBe(-1);
  });

  it('with the parcel: the shield is on, its words first, then his', () => {
    const p = play({ parcel: true });
    expect(p.run.power.shield).toBe(true);
    steps(p, RULES.parcelWordsSteps);
    expect(cues(p.ev).map((c) => c.say).filter(Boolean)).toEqual([OGUN_WORDS.hall.parcelShield, OGUN_WORDS.hall.start]);
  });

  it('first try: the bag hint, then the jump hint once carrying', () => {
    const p = play({ firstTry: true });
    steps(p, POTHOLE_RULES.pickUpAfter + 1);
    expect(cues(p.ev).some((c) => c.say === OGUN_WORDS.hall.pickUp)).toBe(true);
    pickUp(p);
    steps(p, 1);
    expect(cues(p.ev).some((c) => c.say === OGUN_WORDS.hall.jumpOver)).toBe(true);
    expect(cues(p.ev).some((c) => c.sound === 'bagLift')).toBe(true);
  });
});

describe('ogun.md 5.3: he freezes when you jump', () => {
  it('never moves while the hero is in the air, and slides again 0.3 s after landing', () => {
    const p = play();
    steps(p, 30);
    p.run.press();
    const x0 = p.f.pitX;
    let airSteps = 0;
    steps(p, 120, () => {
      if (!p.run.hero.grounded) {
        airSteps++;
        expect(p.f.pitX).toBe(x0);
        expect(p.f.frozen).toBe(true);
      }
    });
    expect(airSteps).toBeGreaterThan(20);
    // Landed some time ago: moving again.
    expect(p.f.pitX).toBeLessThan(x0);
  });

  it('waits 0.3 s after landing before sliding again', () => {
    const p = play();
    steps(p, 10);
    p.run.press();
    p.run.release();
    let landedAt = -1;
    let xAtLand = 0;
    steps(p, 200, () => {
      if (landedAt < 0 && p.run.hero.grounded && p.run.steps > 12) {
        landedAt = p.run.steps;
        xAtLand = p.f.pitX;
      }
      if (landedAt > 0 && p.run.steps - landedAt < secs(0.3)) expect(p.f.pitX).toBe(xAtLand);
    });
    expect(p.f.pitX).not.toBe(xAtLand);
  });
});

describe('ogun.md 5.3: he never swallows a standing hero', () => {
  for (const x of [120, 160, 175, 200, 300, 330, 470, 500, 528]) {
    it(`a hero standing at x ${x} is never under him (20 s, every phase)`, () => {
      for (const ph of [0, 1, 2]) {
        const q = play();
        q.f.phase = ph;
        q.run.hero.x = x;
        let fell = false;
        let minGap = Infinity;
        steps(q, secs(20), () => {
          q.run.hazards.length = 0; // throws aside: only his slide
          q.run.safe = 999;
          if (q.run.hero.grounded) minGap = Math.min(minGap, q.f.gapTo(q.run.hero.x, q.f.pitX));
          if (q.ev.some((e) => e.type === 'fall')) fell = true;
        });
        expect(fell).toBe(false);
        // The hero may start inside the gap (standing still); he never comes closer.
        const startGap = Math.max(-Infinity, q.f.gapTo(x, 400));
        expect(minGap).toBeGreaterThanOrEqual(Math.min(DATA.pit.bumpGap, startGap) - 1e-6);
        expect(q.run.lives).toBe(3);
      }
    });
  }

  it('bumps to a stop with a "hmph" and slides back the other way', () => {
    const p = play();
    p.run.hero.x = 180;
    steps(p, secs(8));
    expect(cues(p.ev).some((c) => c.sound === 'potHmph')).toBe(true);
    expect(p.f.bumpAt).toBeGreaterThan(0);
    expect(p.f.gapTo(180, p.f.pitX)).toBeGreaterThanOrEqual(DATA.pit.bumpGap - 1e-6);
  });

  it('walking into him is a fall', () => {
    const p = play();
    p.run.hero.x = 200;
    p.run.steer(1);
    steps(p, secs(3));
    expect(p.ev.some((e) => e.type === 'fall')).toBe(true);
  });
});

describe('ogun.md 5.3: carry the road mix and drop it in', () => {
  it('a bag dropped from the air over his middle 40 u is a hit; a plop', () => {
    const p = play();
    pickUp(p);
    inAir(p.run, p.f.pitX + 19);
    steps(p, 1);
    expect(p.f.hits).toBe(1);
    expect(p.f.carrying).toBe(false);
    expect(cues(p.ev).some((c) => c.sound === 'potPlop')).toBe(true);
    expect(cues(p.ev).some((c) => c.say === OGUN_WORDS.hall.plop(2))).toBe(true);
    expect(OGUN_WORDS.hall.plop(2)).toBe('Plop! 2 more bags.');
    expect(OGUN_WORDS.hall.plop(1)).toBe('Plop! 1 more bag.');
  });

  it('never anywhere else: outside the middle zone in the air, or standing near him', () => {
    const p = play();
    pickUp(p);
    inAir(p.run, p.f.pitX + 30);
    steps(p, 1);
    expect(p.f.hits).toBe(0);
    p.run.hero.x = p.f.lips[0] - 20;
    p.run.hero.y = 300;
    p.run.hero.grounded = true;
    steps(p, 30);
    expect(p.f.hits).toBe(0);
    expect(p.f.carrying).toBe(true);
  });

  it('a new bag is on the pile 1.0 s after one went in', () => {
    const p = play();
    pickUp(p);
    inAir(p.run, p.f.pitX);
    steps(p, 1);
    expect(p.f.bagReady).toBe(false);
    steps(p, secs(1.0) - 1);
    expect(p.f.bagReady).toBe(false);
    steps(p, 1);
    expect(p.f.bagReady).toBe(true);
  });

  it('hurt while carrying: the bag slides back onto the pile', () => {
    const p = play();
    pickUp(p);
    p.run.hero.x = 200;
    // A gravel lump right on the hero.
    p.run.hazards.push({ kind: 'gravel', x0: 200, x: 200, y: 300, vx: -80, mode: 'move', t: 0, rot: 0, face: -1, fufu: false });
    steps(p, 1);
    expect(p.ev.some((e) => e.type === 'hit')).toBe(true);
    expect(p.f.carrying).toBe(false);
    expect(p.f.bagReady).toBe(true);
  });

  it('fallen in while carrying: lost; a new one 1.0 s later; a life; back at 50, he goes to 400', () => {
    const p = play();
    pickUp(p);
    p.f.pitX = 300;
    p.run.hero.x = 300;
    p.run.hero.grounded = false;
    p.run.hero.y = 330;
    p.run.hero.prevY = 330;
    for (let i = 0; i < 120 && !p.ev.some((e) => e.type === 'fall'); i++) p.ev.push(...p.run.step(DT));
    expect(p.run.lives).toBe(2);
    expect(p.f.carrying).toBe(false);
    expect(p.f.bagReady).toBe(false);
    expect(p.run.hero.x).toBe(50);
    expect(p.f.pitX).toBe(400);
    steps(p, secs(1.0));
    expect(p.f.bagReady).toBe(true);
  });

  it('Gentle (OG-R24, R26): climbs out 40 u left of his left lip, he goes back to 400; slides a fifth slower', () => {
    const p = play({ gentle: true });
    steps(p, 60);
    expect(p.f.pitX).toBeCloseTo(400 - 30 * 0.8, 0);
    const pit = p.f.pitX;
    p.run.hero.x = pit;
    p.run.hero.grounded = false;
    p.run.hero.y = 330;
    for (let i = 0; i < 120 && !p.ev.some((e) => e.type === 'fall'); i++) p.ev.push(...p.run.step(DT));
    expect(p.run.lives).toBe(4);
    expect(p.run.hero.x).toBe(pit - DATA.pit.width / 2 - POTHOLE_RULES.climbBack);
    expect(p.f.pitX).toBe(400);
    expect(p.f.dir).toBe(-1);
    // Clear of his lip by more than the bump gap, so he never slides at the hero there.
    expect(p.f.gapTo(p.run.hero.x, p.f.pitX)).toBeGreaterThanOrEqual(DATA.pit.bumpGap);
    expect(p.ev.some((e) => e.type === 'climbOut')).toBe(true);
  });

  it('OG-R26: the gulp is 0.8 s in Gentle mode, 0.5 s in normal', () => {
    expect(DATA.gulp).toBe(0.5);
    expect(DATA.gentle.gulp).toBe(0.8);
    for (const [gentle, gulp] of [[false, 0.5], [true, 0.8]] as const) {
      const p = play({ gentle });
      steps(p, secs(2.0 - gulp) - 1);
      expect(p.f.gulp).toBe(-1);
      steps(p, 1);
      expect(p.f.gulp).toBeGreaterThanOrEqual(0);
      steps(p, secs(gulp));
      expect(p.run.hazards).toHaveLength(1);
    }
  });

  it('OG-R25: a lump never comes out touching a hero standing still by his lip', () => {
    for (const x of [150, 200, 250, 300]) {
      const p = play();
      p.run.hero.x = x;
      steps(p, secs(12), () => {
        // The moment a lump is thrown, it is clear of the standing hero's box.
        for (const z of p.run.hazards) if (z.t === 0) expect(Math.abs(z.x - p.run.hero.x)).toBeGreaterThan(RULES.heroHalfW + 9);
      });
      expect(p.ev.some((e) => e.type === 'hit')).toBe(true); // they still come at the hero
    }
  });
});

describe('ogun.md 5.4: his throws', () => {
  it('a 0.5 s gulp, then gravel from his near lip toward the hero at 2.0 s; every 2.6 s', () => {
    const p = play();
    steps(p, secs(1.5));
    expect(p.f.gulp).toBeGreaterThanOrEqual(0);
    expect(cues(p.ev).some((c) => c.sound === 'potGulp')).toBe(true);
    expect(p.run.hazards).toHaveLength(0);
    steps(p, secs(0.5));
    expect(p.run.hazards).toHaveLength(1);
    const z = p.run.hazards[0]!;
    expect(z.kind).toBe('gravel');
    expect(z.vx).toBe(-80);
    expect(z.x).toBeLessThan(p.f.lips[0]);
    steps(p, secs(2.6));
    expect(p.run.hazards.filter((q) => q.mode !== 'gone')).toHaveLength(2);
  });

  it('gravel goes right, from his right lip, when the hero is on the right landing; it crumbles at the wall', () => {
    const p = play();
    p.f.pitX = 300;
    p.run.hero.x = 500;
    steps(p, secs(2.0));
    const z = p.run.hazards[0]!;
    expect(z.vx).toBe(80);
    expect(z.x).toBeGreaterThan(p.f.lips[1]);
    p.run.hero.x = 380;
    steps(p, secs(3), () => (p.run.safe = 999));
    expect(z.mode).toBe('gone');
    expect(p.ev.some((e) => e.type === 'crumble')).toBe(true);
  });

  it('after a bag: everything pops into dust, 1.5 s with no throws, then the next phase', () => {
    const p = play();
    steps(p, secs(2.1));
    expect(p.run.hazards.length).toBe(1);
    p.run.hero.x = 50;
    pickUp(p);
    inAir(p.run, p.f.pitX);
    steps(p, 1);
    expect(p.run.hazards.length).toBe(0);
    expect(p.ev.some((e) => e.type === 'dust')).toBe(true);
    const at = p.run.steps;
    steps(p, secs(1.5) - 1);
    expect(p.f.phase).toBe(0);
    steps(p, 1);
    expect(p.f.phase).toBe(1);
    expect(p.f.nextThrowAt).toBe(at + secs(1.5) + secs(2.2));
    expect(musicCue({ screen: 'play', where: 'hall', below: false, hits: p.f.tempo, hidden: false })).toEqual({ place: 'hall', tempo: 1 });
  });

  it('phase 3: "He\'s cross!" and gravel, gravel, mud', () => {
    const p = play();
    bag(p);
    bag(p);
    steps(p, secs(1.6));
    expect(p.f.phase).toBe(2);
    expect(cues(p.ev).some((c) => c.say === OGUN_WORDS.hall.cross)).toBe(true);
  });

  it('mud lands 120 to 200 u from his near lip, inside the walls, 40 u or more from the hero; else gravel', () => {
    const p = play();
    const f = p.f;
    // He at 400, the hero at 100: left lip 350, nearest the middle of the range is 160 u.
    expect(f.mudSpot(350, -1, 100)).toBe(190);
    // The hero right on that spot: the next nearest the middle that is 40 u away.
    const x = f.mudSpot(350, -1, 190)!;
    expect(Math.abs(x - 190)).toBeGreaterThanOrEqual(40);
    expect(350 - x).toBeGreaterThanOrEqual(120);
    expect(350 - x).toBeLessThanOrEqual(200);
    // He at the far left: no spot inside the walls far enough (patch middle 60 or more).
    expect(f.mudSpot(180, -1, 150)).toBe(60);
    // ogun.md 5.6: the hero at the pile while he is at the far-left end: no spot, gravel instead.
    expect(f.mudSpot(180, -1, 70)).toBeNull();
    // Hero on the right landing: no room before the right wall: gravel instead.
    expect(f.mudSpot(450, 1, 500)).toBeNull();
  });

  it('a mud blob lands after its 0.6 s shadow; the patch slows to walk speed and dries in 4 s; it never hurts', () => {
    const p = play();
    bag(p);
    p.run.hero.x = 60;
    // Skip to the mud throw (pattern gravel, mud).
    for (let i = 0; i < secs(8) && p.f.blobs.length === 0; i++) {
      p.ev.push(...p.run.step(DT));
      p.run.safe = 999;
    }
    expect(p.f.blobs).toHaveLength(1);
    const b = p.f.blobs[0]!;
    expect(b.land - b.at).toBe(secs(0.6));
    steps(p, secs(0.6));
    expect(p.run.mud).toHaveLength(1);
    expect(p.run.mud[0]!.w).toBe(60);
    expect(cues(p.ev).some((c) => c.sound === 'mudSplat')).toBe(true);
    const lives = p.run.lives;
    p.run.hero.x = p.run.mud[0]!.x + 30;
    p.run.steer(1);
    steps(p, 5);
    expect(p.run.slowed).toBe(true);
    p.run.steer(0);
    steps(p, secs(4));
    expect(p.run.mud).toHaveLength(0);
    expect(p.run.lives).toBe(lives);
  });
});

describe('ogun.md 5.5: the funny, kind finish', () => {
  it('three bags: defeat, the hero cannot be hurt, lamps, the words, the Win at 6 s', () => {
    const p = play();
    bag(p);
    bag(p);
    bag(p);
    expect(p.f.defeated).toBe(true);
    expect(p.run.beaten).toBe(true);
    expect(p.run.inPlay).toBe(false);
    expect(p.ev.some((e) => e.type === 'bossDefeat')).toBe(true);
    expect(p.run.terrain.ground.every((s) => s.x0 <= 400 || s.x0 >= 400)).toBe(true);
    p.ev.length = 0;
    steps(p, secs(6.0));
    expect(p.ev.filter((e) => e.type === 'lamp')).toHaveLength(8);
    const said = cues(p.ev).map((c) => c.say).filter(Boolean);
    expect(said).toEqual([OGUN_WORDS.hall.smooth, OGUN_WORDS.hall.open]);
    expect(cues(p.ev).map((c) => c.sound).filter(Boolean)).toEqual(expect.arrayContaining(['potYawn', 'rollerToot', 'bossWin']));
    expect(p.ev.some((e) => e.type === 'win')).toBe(true);
    expect(p.run.phase).toBe('won');
    expect(p.run.lives).toBe(3);
  });
});

describe('OG-R15: the gravel "tk"', () => {
  it('plays only for a landing on screen, and once for two within 0.1 s', () => {
    const tk = new TkGate();
    expect(tk.due(900, 0, 640, 1)).toBe(false); // off screen to the right
    expect(tk.due(-10, 0, 640, 1)).toBe(false);
    expect(tk.due(300, 0, 640, 1)).toBe(true);
    expect(tk.due(320, 0, 640, 1.05)).toBe(false); // within 0.1 s
    expect(tk.due(320, 0, 640, 1.1)).toBe(true);
  });
});

describe('words (ogun.md 5 and 8)', () => {
  it('the place says Pothole Hall is open once Sagamu is done; the Win screen', () => {
    expect(OGUN_WORDS.place.sagamuDone).toBe('Sagamu is moving again. Pothole Hall is open.');
    expect(OGUN_WORDS.win.heading).toBe('Ogun is switched on!');
    expect(OGUN_WORDS.win.money(1500)).toBe('You got ₦15.');
    expect(OGUN_WORDS.cleared.toHall).toBe('Go to Pothole Hall');
  });
});

describe('the fight copies the run\'s numbers (no value import from run.ts in the Ogun part)', () => {
  it('RUN_NUMBERS match run.ts RULES', () => {
    for (const [k, v] of Object.entries(RUN_NUMBERS)) expect(RULES[k as keyof typeof RUN_NUMBERS]).toBe(v);
    expect(STEPS_PER_SECOND).toBe(60);
  });
});
