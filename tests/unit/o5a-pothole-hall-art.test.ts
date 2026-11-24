/**
 * O5a: Pothole Hall and King Pothole (docs/ogun.md 2.3, 5.1 to 5.6, 7; decision 78). The room
 * matches the hall file; he is only a pothole with a crack face and three cones (no ruler's
 * things, nothing holy, nothing from another game); the finish follows 5.5 and holds still with
 * reduced motion; the carrying pose fits every body; sounds are short and soft; the tune keeps
 * its key and tempos; every piece draws with good numbers.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import hallFile from '../../src/data/levels/ogun-hall.json';
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, drawHero, heroHeadTop, type HeroPose } from '../../src/art/hero';
import { OGUN_WORDS } from '../../src/worlds/ogun/partWords';
import { noteNumber, trackEvents } from '../../src/engine/music';
import { boundsContext } from './bounds-context';
import {
  CROWN_CONES,
  HALL_DOOR_PEOPLE,
  POTHOLE_FILL,
  POTHOLE_FINISH,
  ROLL_OUT,
  POTHOLE_HALL_TUNE,
  POTHOLE_SOUNDS,
  POT_BAG_TAG,
  POT_HALL,
  POT_HALL_SIGN,
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
  drawRoadMixBag,
  drawRoadMixPile,
  drawRoller,
  potholeFinishAt,
  rollerFinishX,
  potholeLampTimes,
  type PotholeMood,
} from '../../src/worlds/ogun/hall';

function fakeCanvas(): { g: CanvasRenderingContext2D; bad: string[] } {
  const bad: string[] = [];
  const fn = (name: string) => (...args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${name}(${args.join(', ')})`);
    return name === 'createLinearGradient' ? { addColorStop: () => undefined } : proxy;
  };
  const proxy: object = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? fn(k) : undefined), set: () => true });
  return { g: proxy as CanvasRenderingContext2D, bad };
}

const MOODS: PotholeMood[] = ['calm', 'cross', 'watch', 'gulp', 'hit', 'giggle', 'yawn', 'sleep', 'smooth'];

describe('O5a Pothole Hall art', () => {
  it('matches the hall file: room, pit, pile, bag, roller and 8 lamps', () => {
    const b = hallFile.boss;
    expect(POT_HALL.w).toBe(hallFile.width);
    expect(POT_HALL.floorY).toBe(hallFile.groundY);
    expect(POT_HALL.heroMinX).toBe(hallFile.leftLimit);
    expect(POT_HALL.heroMaxX).toBe(hallFile.rightLimit);
    expect(POT_HALL.pitW).toBe(b.pit.width);
    expect([...POT_HALL.track]).toEqual(b.pit.track);
    expect(POT_HALL.startX).toBe(b.pit.startX);
    expect([...POT_HALL.pile]).toEqual(b.bag.pile);
    expect(POT_HALL.bagX).toBe(b.bag.x);
    expect(POT_HALL.rollerX).toBe(b.rollerX);
    expect(POT_HALL.lamps).toHaveLength(b.lamps);
  });

  it('writes only the hall words: the sign and the READY tag', () => {
    expect(POT_HALL_SIGN).toBe(OGUN_WORDS.hall.sign);
    expect(POT_BAG_TAG).toBe(OGUN_WORDS.hall.bagTag);
    const src = readFileSync('src/worlds/ogun/hall.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const texts = [...src.matchAll(/fillText\(([^,]+),/g)].map((m) => m[1]!.trim());
    expect(texts.sort()).toEqual(['POT_BAG_TAG', 'POT_HALL_SIGN']);
  });

  it('is only a pothole with cones (decision 78): nothing royal, holy or from another game', () => {
    const src = readFileSync('src/worlds/ogun/hall.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').toLowerCase();
    for (const w of ['bead', 'staff', 'robe', 'throne', 'palace', 'sceptre', 'jewel', 'gold', 'shrine', 'altar', 'orisha', 'pray', 'cutlass', 'machete', 'anvil', 'pipe', 'mushroom', 'brick', 'question', 'teeth', 'fang', 'fire', 'flame', 'blood']) {
      expect(src, w).not.toContain(w);
    }
    expect(CROWN_CONES).toHaveLength(3);
  });

  it('gets shallower with each bag but keeps his opening; the finish follows 5.5', () => {
    expect([...POTHOLE_FILL]).toEqual([0, 0.22, 0.44]);
    const at = (t: number) => potholeFinishAt(t, 300, 0.44);
    expect(at(0).fill).toBeCloseTo(0.44);
    expect(at(1.2).fill).toBe(1);
    expect(at(0.5).mood).toBe('giggle');
    expect(at(1.5).mood).toBe('yawn');
    expect(at(2.5).mood).toBe('smooth');
    expect(at(2.6).smile).toBe(1);
    expect(at(4).smile).toBe(0);
    expect(at(1.79).roller.x).toBe(POT_HALL.rollerX);
    expect(at(2.4).roller.x).toBeLessThan(300);
    expect(at(2.5).roller.toot).toBeGreaterThan(0);
    // QA-O2-2: it parks on the new patch, clear of the right doors (the roll-out shows whole).
    expect(at(3.3).roller.x).toBe(300);
    expect(at(5.9).roller.x).toBe(300);
    for (const pitX of [POT_HALL.track[0], 300, POT_HALL.track[1], 999]) {
      const x = potholeFinishAt(5, pitX).roller.x;
      expect(x).toBe(rollerFinishX(pitX));
      expect(x + 26, `pit at ${pitX}`).toBeLessThan(POT_HALL.rightDoors.x0);
      // The cone line (his right lip + 12) stays clear of the parked roller's back end.
      if (pitX <= POT_HALL.track[1]) expect(x + 26).toBeLessThan(pitX + POT_HALL.pitW / 2 + 12);
    }
    // QA-O2-2: just before the Win screen the danfo and the tipper (their middles) are both in the doorway.
    const t = POTHOLE_FINISH.winScreen - 0.05 - POTHOLE_FINISH.doorsFrom - POTHOLE_FINISH.doorsSwing;
    const danfo = POT_HALL.rightDoors.x0 + ROLL_OUT.from + t * ROLL_OUT.speed;
    const tipper = danfo - ROLL_OUT.gap * ROLL_OUT.speed;
    for (const x of [danfo, tipper]) {
      expect(x).toBeGreaterThan(POT_HALL.rightDoors.x0);
      expect(x).toBeLessThan(POT_HALL.rightDoors.x1);
    }
    const lamps = potholeLampTimes();
    expect(lamps).toHaveLength(8);
    expect(lamps[0]).toBe(3);
    expect(lamps[7]!).toBeLessThanOrEqual(4.2);
    expect(at(2.9).doors).toBe(0);
    expect(at(4.3).doors).toBe(1);
    expect(at(4.3).gateLit).toBe(true);
    expect(at(4.4).cheer).toBe(false);
    expect(at(4.5).cheer).toBe(true);
    expect(POTHOLE_FINISH.winScreen).toBe(6);
  });

  it('holds still with reduced motion: the roller stays parked, the doors and patch jump', () => {
    for (const t of [0, 1.5, 2.2, 3.7, 5]) {
      const f = potholeFinishAt(t, 300, 0.22, true);
      expect(f.roller.x).toBe(POT_HALL.rollerX);
      expect(f.roller.toot).toBe(0);
      expect([0, 1]).toContain(f.doors);
      expect([0, 1]).toContain(f.smooth);
    }
    expect(crownConeFall(0.2, 1, true)).toEqual(crownConeFall(1, 1));
    expect(potholeFinishAt(NaN, NaN).fill).toBeGreaterThanOrEqual(0);
  });

  it('puts the carried bag on the head of every body, age, hair and outfit, running and jumping', () => {
    for (let skin = 0; skin < SKINS.length; skin += 2)
      for (let body = 0; body < BODIES.length; body++)
        for (let age = 0; age < AGES.length; age++)
          for (let hair = 0; hair < HAIRS.length; hair++) {
            const look = { skin, hair, outfit: (hair + age) % OUTFITS.length, body, age };
            for (const pose of [
              { phase: 0.3, inAir: false, facing: 1, glow: false, time: 0.3 },
              { phase: 0, inAir: true, vy: -250, facing: -1, glow: false, time: 0.3 },
              { phase: 0, inAir: false, facing: 1, glow: false, standing: true, land: 0.6, time: 0.3 },
            ] as HeroPose[]) {
              const hero = boundsContext();
              drawHero(hero.g, look, pose);
              const top = heroHeadTop(look, pose);
              const at = `${skin} ${body} ${age} ${hair} ${pose.inAir}`;
              // The pad rests on the hair or headwear: within 2.5 u of its top, over the head
              expect(Math.abs(top.y - hero.box.top), at).toBeLessThan(2.5);
              expect(Math.abs(top.x), at).toBeLessThan(8);
              const bag = boundsContext();
              drawCarriedBag(bag.g, look, pose, 0, 0);
              expect(bag.bad, at).toEqual([]);
              // (the bounds count each ellipse as a whole circle, so allow the pad's 7 u radius)
              // Style 1.8: the head is bigger (15 u), so the eyes sit about 10 u under its top; 9 u keeps the face clear
              expect(bag.box.bottom, at).toBeLessThan(hero.box.top + 9);
              expect(bag.box.top, at).toBeLessThan(hero.box.top - 8);
            }
          }
  });

  it('keeps his sounds short and soft, with no square wave (no voice)', () => {
    for (const [name, r] of Object.entries(POTHOLE_SOUNDS)) {
      for (const t of [...r.tones, ...(r.hiss ?? [])]) {
        expect('wave' in t ? t.wave : 'sine', name).not.toBe('square');
        expect('nasal' in t, name).toBe(false);
        expect((t.at ?? 0) + t.len, name).toBeLessThanOrEqual(0.65);
        expect(t.vol ?? 0, name).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it("plays the hall tune at the hall file's tempos, in its key, the shaker and second drum joining", () => {
    const t = POTHOLE_HALL_TUNE;
    expect([...t.bpm]).toEqual(hallFile.boss.phases.map((p) => p.bpm));
    expect(t.loop).toBe(true);
    const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (const tr of t.tracks) {
      expect(tr.bars).toHaveLength(t.bars);
      for (const bar of tr.bars) expect(bar.split(' '), bar).toHaveLength(16);
      if (tr.inst === 'shekere') continue;
      for (const e of trackEvents(tr)) for (const n of e.notes) expect(t.key, PC[n % 12]).toContain(PC[n % 12]);
    }
    expect(t.tracks.find((x) => x.inst === 'shekere')?.from).toBe(1);
    expect(t.tracks.filter((x) => x.inst === 'drum' && x.from === 2)).toHaveLength(1);
    expect(t.tracks.some((x) => x.lead && x.inst === 'kalimba')).toBe(true);
    expect(noteNumber('A#1')).not.toBeNull();
  });

  it('draws every piece with good numbers, moving and still', () => {
    const { g, bad } = fakeCanvas();
    for (const time of [0, 1.37, 1e5, NaN]) {
      for (const still of [false, true]) {
        drawPotholeHall(g, 0, 560, 420, { time, still });
        drawPotholeHall(g, -100, 800, 420, { lamps: potholeLampTimes().map((x) => 5 - x), doors: 0.5, gateLit: true, arrows: 0.6, time, still });
        drawPotholeHallFront(g, -100, 800, 420);
        for (const mood of MOODS) {
          for (const fill of [0, 0.22, 0.44, 1]) drawKingPothole(g, 300, 300, { mood, fill, cones: 3, gulp: 0.5, bump: 0.4, smooth: 0.5, smile: 0.5, coneTip: 0.5, time, still });
        }
        drawKingPothole(g, NaN, 300, { cones: NaN });
        drawMudBlob(g, 200, 250, time, still);
        drawMudPatch(g, 200, 60, 300, 0.5, time, still);
        drawRoller(g, 500, 300, { facing: 1, drum: time, toot: 0.5 });
      }
      for (const k of [0, 0.5, 1, NaN]) {
        drawMudShadow(g, 200, 300, k);
        drawPlop(g, 300, 320, k);
        const c = crownConeFall(k, -1);
        drawCrownCone(g, 300 + c.dx, 300 + c.dy, 0.8, c.tilt);
      }
      drawRoadMixPile(g, true);
      drawRoadMixPile(g, false);
      drawRoadMixBag(g, 80, 280, true, 0.1);
      drawConeLine(g, 420, 300);
    }
    expect(bad).toEqual([]);
    expect(HALL_DOOR_PEOPLE).toHaveLength(3);
    expect(HALL_DOOR_PEOPLE.some((l) => l.dress === 'agbada' && l.age === 'elder')).toBe(true);
  });
});
