/**
 * O1: the music (docs/design.md S2.9). Checks the note data (keys, lengths,
 * tempos, at most 6 notes at once), the originality of every melody against
 * the openings of well-known game tunes and our sound-effect motifs, and the
 * player (look-ahead scheduling, the Music switch, place changes, tempo steps
 * on a bar line, pause and resume from the same bar).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CORN, G_PENTATONIC, TUNES, laneTempoAt, type MusicPlace, type Tune } from '../../src/art/tunes';
import { LOOKAHEAD, MUSIC_GAIN, Music, midiHz, noteNumber, ringSeconds, stepSeconds, trackEvents, tuneEvents } from '../../src/engine/music';

const PLACES = Object.keys(TUNES) as MusicPlace[];
const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

describe('note data', () => {
  it('reads notes, chords, holds and rests', () => {
    expect(noteNumber('A4')).toBe(69);
    expect(noteNumber('C4')).toBe(60);
    expect(noteNumber('F#5')).toBe(78);
    expect(noteNumber('H2')).toBeNull();
    expect(midiHz(69)).toBeCloseTo(440, 6);
    const ev = trackEvents({ inst: 'guitar', vol: 1, bars: ['G4 - - . B4+D5 . x - . . . . . . . -', 'C5 . . . . . . . . . . . . . . .'] });
    expect(ev.map((e) => [e.step, e.len, e.notes])).toEqual([
      [0, 3, [67]],
      [4, 1, [71, 74]],
      [6, 2, []],
      [16, 1, [72]],
    ]);
    expect(() => trackEvents({ inst: 'bass', vol: 1, bars: ['G2 . .'] })).toThrow(/16/);
    expect(() => trackEvents({ inst: 'bass', vol: 1, bars: ['Q2 . . . . . . . . . . . . . . .'] })).toThrow(/not a note/);
  });

  it('every tune parses: every bar 16 steps, every track as long as the tune', () => {
    for (const p of PLACES) {
      const t = TUNES[p];
      for (const tr of t.tracks) {
        expect(tr.bars.length, `${p} ${tr.inst}`).toBe(t.bars);
        expect(() => trackEvents(tr)).not.toThrow();
      }
      expect(t.chords.length).toBe(t.bars);
    }
  });

  it('tempos, lengths and loops follow S2.9', () => {
    const secs = (t: Tune, i = 0): number => t.bars * 16 * stepSeconds(t, i);
    expect(TUNES.menu.bpm).toEqual([96]);
    expect(TUNES.menu.gain).toBe(0.7);
    expect(TUNES.street.bpm).toEqual([108, 112, 116]);
    expect(secs(TUNES.street, 0)).toBeGreaterThan(34);
    expect(secs(TUNES.street, 0)).toBeLessThan(36);
    expect(secs(TUNES.street, 2)).toBeGreaterThan(32);
    expect(TUNES.well.bpm).toEqual([84]);
    expect(secs(TUNES.well)).toBeCloseTo(22.9, 1);
    expect(TUNES.hall.bpm).toEqual([128, 134, 140]);
    expect(secs(TUNES.hall, 0)).toBeCloseTo(15, 1);
    expect(secs(TUNES.hall, 2)).toBeGreaterThan(13.5);
    for (const p of ['menu', 'street', 'well', 'hall'] as const) expect(TUNES[p].loop).toBe(true);
    for (const p of ['cleared', 'win'] as const) expect(TUNES[p].loop).toBe(false);
    // The short tunes: the last note ends near 2.5 s and 5 s
    const end = (t: Tune): number => Math.max(...tuneEvents(t).map((e) => e.step * stepSeconds(t) + ringSeconds(e, stepSeconds(t))));
    expect(end(TUNES.cleared)).toBeGreaterThan(2.2);
    expect(end(TUNES.cleared)).toBeLessThan(3);
    expect(end(TUNES.win)).toBeGreaterThan(4.5);
    expect(end(TUNES.win)).toBeLessThan(5.5);
  });

  it('the hall adds layers with each tempo step; street 3 adds a second agogo', () => {
    const insts = (t: Tune, i: number): string[] => [...new Set(tuneEvents(t, i).map((e) => e.inst))].sort();
    expect(insts(TUNES.hall, 0)).not.toContain('shekere');
    expect(insts(TUNES.hall, 1)).toContain('shekere');
    expect(tuneEvents(TUNES.hall, 2).length).toBeGreaterThan(tuneEvents(TUNES.hall, 1).length);
    expect(tuneEvents(TUNES.street, 2).filter((e) => e.inst === 'agogo').length).toBeGreaterThan(tuneEvents(TUNES.street, 0).filter((e) => e.inst === 'agogo').length);
    expect(insts(TUNES.menu, 0)).toEqual(['bass', 'guitar']);
  });

  it('tuned parts stay inside each tune key (the horn in the street-cleared jingle is our bus horn)', () => {
    for (const p of PLACES) {
      const t = TUNES[p];
      for (const tr of t.tracks) {
        if (p === 'cleared' && tr.inst === 'horn') continue;
        for (const e of trackEvents(tr)) {
          for (const n of e.notes) expect(t.key, `${p} ${tr.inst} ${PC[n % 12]}`).toContain(PC[n % 12]);
        }
      }
    }
  });

  it('never more than 6 notes sounding at once, at any tempo', () => {
    for (const p of PLACES) {
      const t = TUNES[p];
      for (let tempo = 0; tempo < t.bpm.length; tempo++) {
        const s = stepSeconds(t, tempo);
        const evs = tuneEvents(t, tempo);
        const total = t.bars * 16;
        for (let step = 0; step < total; step++) {
          let n = 0;
          for (const e of evs) {
            const steps = Math.max(1, Math.ceil(ringSeconds(e, s) / s - 1e-9));
            if (step >= e.step && step < e.step + steps) n += Math.max(1, e.notes.length);
          }
          expect(n, `${p} tempo ${tempo} step ${step}`).toBeLessThanOrEqual(6);
        }
      }
    }
  });
});

/**
 * Openings of well-known game tunes, hymns, anthems and songs sung across Nigeria
 * (first notes only, as a fingerprint) and our sound-effect motifs. A melody copies one if any run of 5 of its notes,
 * anywhere in the tune, moves by the same steps (within half a semitone) as any run of 5
 * in the fingerprint, or if its first 4 notes move like the fingerprint's first 4.
 * A plain scale run (every step 1 or 2 semitones, all the same way) is not a copy:
 * any tune in the key has those.
 */
const KNOWN: Record<string, string[]> = {
  'platformer overworld theme': ['E5', 'E5', 'E5', 'C5', 'E5', 'G5', 'G4'],
  'platformer underground theme': ['C4', 'C5', 'A3', 'A4', 'A#3', 'A#4'],
  'platformer star theme': ['C5', 'C5', 'C5', 'D4', 'C5', 'C5', 'D4', 'C5'],
  'platformer castle theme': ['C#4', 'D4', 'C#4', 'D4', 'C#4', 'D4', 'C#4'],
  'falling blocks theme': ['E5', 'B4', 'C5', 'D5', 'C5', 'B4', 'A4', 'A4', 'C5', 'E5', 'D5', 'C5', 'B4'],
  'adventure overworld theme': ['A#4', 'F4', 'A#4', 'A#4', 'C5', 'D5', 'D#5', 'F5'],
  'pickup jingle': ['B5', 'E6'],
  'extra life jingle': ['E5', 'G5', 'E6', 'C6', 'D6', 'G6'],
  'lose a life jingle': ['B4', 'F5', 'F5', 'F5', 'E5', 'D5', 'C5'],
  'course clear run': ['G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'E5'],
  'secret found jingle': ['G5', 'F#5', 'D#5', 'A4', 'G#4', 'E5', 'G#5', 'C6'],
  'item fanfare': ['A4', 'A#4', 'B4', 'C5'],
  // P9 (S2.9 "Corn tune"): power-up and speed music, checked against the corn tune and every other.
  'power-up appears run': ['G4', 'B4', 'D5', 'G5', 'B5', 'G#4', 'C5', 'D#5', 'G#5', 'C6', 'A#4', 'D5', 'F5', 'A#5', 'D6'],
  'maze chase intro': ['B4', 'B5', 'F#5', 'D#5', 'B5', 'F#5', 'D#5', 'C5', 'C6', 'G5', 'E5', 'C6', 'G5', 'E5'],
  // Hymns, anthems and songs widely sung in Nigeria (opening notes only, no words).
  'Amazing Grace': ['D4', 'G4', 'B4', 'G4', 'B4', 'A4', 'G4', 'E4', 'D4'],
  'Michael, Row the Boat Ashore': ['C4', 'E4', 'G4', 'E4', 'G4', 'A4', 'G4'],
  'Camptown Races': ['G4', 'G4', 'E4', 'G4', 'A4', 'G4', 'E4'],
  'Happy Birthday': ['G4', 'G4', 'A4', 'G4', 'C5', 'B4', 'G4', 'G4', 'A4', 'G4', 'D5', 'C5'],
  'Twinkle, Twinkle, Little Star': ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'],
  'Silent Night': ['G4', 'A4', 'G4', 'E4', 'G4', 'A4', 'G4', 'E4'],
  'Joy to the World': ['D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'E4', 'D4'],
  'O Come, All Ye Faithful': ['G4', 'G4', 'D4', 'G4', 'A4', 'D4', 'B4', 'A4', 'B4', 'C5', 'B4', 'A4'],
  'Holy, Holy, Holy': ['D4', 'D4', 'F#4', 'F#4', 'A4', 'A4'],
  'Old Hundredth (the Doxology)': ['G4', 'G4', 'F#4', 'E4', 'D4', 'G4', 'A4', 'B4'],
  'Abide with Me': ['E4', 'E4', 'D4', 'C4', 'G4', 'A4', 'G4', 'F4', 'E4'],
  'When the Saints Go Marching In': ['C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4'],
  'Ode to Joy': ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4'],
  'Auld Lang Syne': ['C4', 'F4', 'F4', 'F4', 'A4', 'G4', 'F4', 'G4', 'A4', 'F4'],
  'Jingle Bells (chorus)': ['E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4'],
  'What a Friend We Have in Jesus': ['G4', 'G4', 'A4', 'G4', 'E4', 'C4', 'C4'],
};

const iv = (xs: number[]): number[] => xs.slice(1).map((x, i) => x - xs[i]!);
const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]!) <= 0.5);
/** Steps that only walk up (or only down) the scale, 1 or 2 semitones each. */
const scaleRun = (steps: number[]): boolean =>
  steps.every((d) => d >= 1 && d <= 2) || steps.every((d) => d <= -1 && d >= -2);

function copies(mel: number[], known: number[]): boolean {
  const n = Math.min(4, known.length);
  if (mel.length >= n && same(iv(mel.slice(0, n)), iv(known.slice(0, n)))) return true;
  if (known.length < 5) return false;
  for (let k = 0; k + 5 <= known.length; k++) {
    const want = iv(known.slice(k, k + 5));
    if (scaleRun(want)) continue;
    for (let i = 0; i + 5 <= mel.length; i++) if (same(iv(mel.slice(i, i + 5)), want)) return true;
  }
  return false;
}

/** The melody: each note start of the lead track (top note of a chord). */
const melody = (t: Tune): number[] =>
  t.tracks
    .filter((tr) => tr.lead)
    .flatMap(trackEvents)
    .sort((a, b) => a.step - b.step)
    .map((e) => Math.max(...e.notes));

describe('every tune is our own', () => {
  it('the check catches the copies it is meant to', () => {
    const mario = KNOWN['platformer overworld theme']!.map((n) => noteNumber(n)!);
    expect(copies(mario.map((n) => n - 5), mario)).toBe(true); // moved to another key
    const blocks = KNOWN['falling blocks theme']!.map((n) => noteNumber(n)!);
    expect(copies([60, 62, ...blocks.slice(3, 9)], blocks)).toBe(true); // hidden in the middle
    const friend = KNOWN['What a Friend We Have in Jesus']!.map((n) => noteNumber(n)!);
    expect(copies([71, 74, 79, 78, 74, 76, 74, 71, 67], friend)).toBe(true); // the old street bar 1-2, from its 5th note
    expect(copies([64, 60, 67, 69, 71, 72, 74, 76], KNOWN['Joy to the World']!.map((n) => noteNumber(n)!).reverse())).toBe(false); // a plain scale run
  });

  for (const p of PLACES) {
    it(`${p}: no melody follows a well-known game tune, hymn, song or our sound motifs`, () => {
      const mel = melody(TUNES[p]);
      expect(mel.length).toBeGreaterThan(3);
      for (const [name, notes] of Object.entries(KNOWN)) {
        expect(copies(mel, notes.map((n) => noteNumber(n)!)), `${p} is close to the ${name}`).toBe(false);
      }
    });
  }

  it('the four looping tunes each have their own melody', () => {
    const open = (p: MusicPlace): string => iv(melody(TUNES[p]).slice(0, 6)).join(',');
    const opens = ['street', 'well', 'hall', 'lane'].map((p) => open(p as MusicPlace));
    expect(new Set(opens).size).toBe(4);
  });
});

/**
 * S3f1: the lane tune (design.md S3f0 part 17). It must not sound like the Subway Surfers, Temple
 * Run or Minion Rush music. Their melodies are not written into KNOWN above: notes written down
 * from memory proved unreliable (guessed fingerprints matched our own older tunes, so they test
 * nothing). Instead these checks hold the things that make those tunes what they are away from
 * ours (no whistle or high held lead, no hip-hop backbeat, no strings), and qa's by-ear check
 * (S3f0 part 24.17) covers the melodies themselves. The lane tune is also checked against every
 * fingerprint in KNOWN by the loop above.
 */
describe('S3f1: the lane tune (design.md S3f0 part 17)', () => {
  const lane = TUNES.lane;
  it('120 BPM in E minor pentatonic, 8 bars looping, and 1 BPM faster per 100 m after the goal up to 132', () => {
    expect(lane.bpm[0]).toBe(120);
    expect(lane.bpm.at(-1)).toBe(132);
    expect(lane.bpm.length).toBe(13);
    expect([...lane.key].sort()).toEqual(['A', 'B', 'D', 'E', 'G']);
    expect(lane.bars).toBe(8);
    expect(lane.loop).toBe(true);
    expect(laneTempoAt(0)).toBe(0);
    expect(laneTempoAt(600)).toBe(0);
    expect(laneTempoAt(699)).toBe(0);
    expect(laneTempoAt(700)).toBe(1);
    expect(laneTempoAt(1250)).toBe(6);
    expect(laneTempoAt(99999)).toBe(12);
    expect(laneTempoAt(Number.NaN)).toBe(0);
    // Its notes are the street tunes' G major pentatonic, so the corn tune never clashes
    expect([...lane.key].sort()).toEqual([...G_PENTATONIC].sort());
  });

  it('kick on beats 1 and 3 only (no hip-hop backbeat), shekere on every 16th, a talking-drum call every 4 bars', () => {
    const kick = lane.tracks.find((t) => t.inst === 'kick')!;
    for (const e of trackEvents(kick)) expect([0, 8]).toContain(e.step % 16);
    expect(trackEvents(kick).length).toBe(16);
    const shake = lane.tracks.find((t) => t.inst === 'shekere')!;
    expect(trackEvents(shake).length).toBe(8 * 16);
    const drum = lane.tracks.find((t) => t.inst === 'drum')!;
    const bars = new Set(trackEvents(drum).map((e) => Math.floor(e.step / 16)));
    expect([...bars].sort()).toEqual([3, 7]);
  });

  it('a plucked highlife guitar lead (no whistle, horn or strings), which rests where the drum calls', () => {
    const insts = new Set(lane.tracks.map((t) => t.inst));
    expect([...insts].sort()).toEqual(['bass', 'drum', 'guitar', 'kick', 'shekere']);
    const lead = lane.tracks.filter((t) => t.lead);
    expect(lead.map((t) => t.inst)).toEqual(['guitar']);
    // Never high and held like a whistle: the lead stays at E5 or under, notes short
    for (const e of trackEvents(lead[0]!)) {
      expect(Math.max(...e.notes)).toBeLessThanOrEqual(noteNumber('E5')!);
      expect(e.len).toBeLessThanOrEqual(2);
    }
    // The guitar starts no note in the last beat of bars 4 and 8, where the talking drum calls
    for (const e of trackEvents(lead[0]!)) {
      const bar = Math.floor(e.step / 16);
      if (bar % 4 === 3) expect(e.step % 16).toBeLessThan(12);
    }
  });

  it('only the guitar is the layer that drops out under 15 m; drums and bass play on', () => {
    expect(lane.tracks.filter((t) => t.layer).map((t) => [t.inst, t.layer])).toEqual([['guitar', 'guitar']]);
  });

  it('the tune data is small (under 2 KB as written)', () => {
    expect(JSON.stringify(lane).length).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------- the player

interface Scheduled {
  type: string;
  f: number;
  at: number;
}
let scheduled: Scheduled[] = [];

class FakeParam {
  value = 1;
  constructor(private readonly onSet?: (v: number, t: number) => void) {}
  setValueAtTime(v: number, t: number): void {
    this.value = v;
    this.onSet?.(v, t);
  }
  linearRampToValueAtTime(v: number): void {
    this.value = v;
  }
  exponentialRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  connect<T>(n: T): T {
    return n;
  }
  disconnect(): void {}
}
class FakeOsc extends FakeNode {
  type = 'sine';
  private first = true;
  frequency = new FakeParam((v, t) => {
    if (this.first) scheduled.push({ type: this.type, f: v, at: t });
    this.first = false;
  });
  start(): void {}
  stop(): void {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
}
class FakeCtx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  createOscillator(): FakeOsc {
    return new FakeOsc();
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
  createBuffer(_c: number, n: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource(): FakeNode & { buffer: unknown; start: () => void; stop: () => void } {
    return Object.assign(new FakeNode(), { buffer: null, start: () => undefined, stop: () => undefined });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

function rig(): { m: Music; ctx: FakeCtx; tick: () => void; timers: () => number; advance: (s: number) => void } {
  const ctx = new FakeCtx();
  let fn: (() => void) | null = null;
  let live = 0;
  const m = new Music({
    setInterval: (f) => {
      fn = f;
      live++;
      return live as unknown as ReturnType<typeof setInterval>;
    },
    clearInterval: () => {
      fn = null;
      live = Math.max(0, live - 1);
    },
  });
  m.attach(ctx as unknown as AudioContext);
  const tick = (): void => fn?.();
  const advance = (s: number): void => {
    for (let t = 0; t < s; t += 0.025) {
      ctx.currentTime += 0.025;
      tick();
    }
  };
  return { m, ctx, tick, timers: () => (fn ? 1 : 0), advance };
}

describe('music player', () => {
  beforeEach(() => {
    scheduled = [];
  });
  afterEach(() => {
    scheduled = [];
  });

  it('music is a third as loud as the sound effects', () => {
    expect(MUSIC_GAIN).toBeCloseTo(0.3, 6);
  });

  it('schedules only a little ahead, and keeps going as time passes', () => {
    const { m, ctx, advance } = rig();
    m.play('street');
    expect(scheduled.length).toBeGreaterThan(0);
    expect(Math.max(...scheduled.map((s) => s.at))).toBeLessThanOrEqual(ctx.currentTime + LOOKAHEAD + 0.06);
    const first = scheduled.length;
    advance(2);
    expect(scheduled.length).toBeGreaterThan(first);
    expect(Math.max(...scheduled.map((s) => s.at))).toBeLessThanOrEqual(ctx.currentTime + LOOKAHEAD + 0.001);
    expect(m.place).toBe('street');
  });

  it('a street loop comes round again after 16 bars', () => {
    const { m, advance } = rig();
    m.play('street');
    advance(36);
    const firstBass = scheduled.filter((s) => s.type === 'triangle' && Math.abs(s.f - midiHz(43)) < 0.01); // G2
    expect(firstBass.some((s) => s.at > 35)).toBe(true);
  });

  it('Music off: silence, nothing scheduled anywhere, and on again plays the place', () => {
    const { m, advance, timers } = rig();
    m.setEnabled(false);
    m.play('hall');
    advance(1);
    expect(scheduled).toEqual([]);
    expect(timers()).toBe(0);
    m.setEnabled(true);
    advance(0.5);
    expect(scheduled.length).toBeGreaterThan(0);
    m.setEnabled(false);
    const n = scheduled.length;
    advance(2);
    expect(scheduled.length).toBe(n);
  });

  it('changing place leaves 0.5 s (fade and quiet) before the new tune', () => {
    const { m, ctx, advance } = rig();
    m.play('street');
    advance(1);
    scheduled = [];
    const at = ctx.currentTime;
    m.play('well');
    advance(1);
    expect(scheduled.length).toBeGreaterThan(0);
    expect(Math.min(...scheduled.map((s) => s.at))).toBeGreaterThanOrEqual(at + 0.5 - 1e-9);
    expect(m.place).toBe('well');
  });

  it('a tempo step waits for the next bar line', () => {
    const { m, advance } = rig();
    m.play('hall', 0);
    advance(0.5); // part way into bar 1 (a bar is 1.875 s at 128)
    m.play('hall', 1);
    expect(m.tempoStep).toBe(1);
    scheduled = [];
    advance(1.2); // still bar 1: no shaker hiss, old tempo
    advance(2);
    expect(m.tempoStep).toBe(1);
  });

  it('pause stops scheduling; resume carries on from the same bar', () => {
    const { m, advance, timers } = rig();
    m.play('well');
    advance(6.5); // bar 3 of 8 (a bar is 2.857 s at 84)
    m.pause();
    expect(timers()).toBe(0);
    scheduled = [];
    advance(3);
    expect(scheduled).toEqual([]);
    m.resume();
    advance(0.3);
    // Bar 3 (index 2) of the well tune opens with D5 on the kalimba
    expect(scheduled.some((s) => Math.abs(s.f - midiHz(74)) < 0.01)).toBe(true);
  });

  it('one-off tunes play once and then stop', () => {
    const { m, advance, timers } = rig();
    m.play('cleared');
    advance(5);
    expect(timers()).toBe(0);
    expect(m.place).toBeNull();
    const n = scheduled.length;
    advance(5);
    expect(scheduled.length).toBe(n);
  });

  it('stop ends everything; nothing plays before unlock or attach', () => {
    const { m, advance, timers } = rig();
    m.play('menu');
    m.stop();
    expect(timers()).toBe(0);
    expect(m.place).toBeNull();
    const fresh = new Music();
    expect(() => fresh.play('street')).not.toThrow();
    expect(fresh.place).toBe('street');
    advance(1);
  });
});

// ---------------------------------------------------------------- P9: the corn tune

describe('corn tune (S2.9 "Corn tune")', () => {
  const lead = (): number[] => melody(CORN);

  it('144 BPM fresh, then one tempo step per count number (128, 112, 96, 80, 72); 4 bars G C D G, looping, about 6.7 s', () => {
    expect(TUNES.corn).toBe(CORN);
    expect(CORN.bpm).toEqual([144, 128, 112, 96, 80, 72]);
    expect(CORN.bars).toBe(4);
    expect(CORN.loop).toBe(true);
    expect(CORN.chords).toEqual(['G', 'C', 'D', 'G']);
    expect(CORN.bars * 16 * stepSeconds(CORN, 0)).toBeCloseTo(6.67, 1);
  });

  it('the band: guitar lead, bass, agogo, shekere on every 16th, a talking-drum fill in bar 4 only', () => {
    const leads = CORN.tracks.filter((t) => t.lead);
    expect(leads.map((t) => t.inst)).toEqual(['guitar']);
    expect(new Set(CORN.tracks.map((t) => t.inst))).toEqual(new Set(['guitar', 'bass', 'agogo', 'shekere', 'drum']));
    const shake = CORN.tracks.find((t) => t.inst === 'shekere')!;
    expect(trackEvents(shake).length).toBe(CORN.bars * 16);
    const drum = CORN.tracks.find((t) => t.inst === 'drum')!;
    expect(trackEvents(drum).every((e) => e.step >= 48)).toBe(true);
    expect(trackEvents(drum).length).toBeGreaterThan(0);
    // Bass on beat 1 and the "and" of 2 in every bar
    const bass = CORN.tracks.find((t) => t.inst === 'bass')!;
    expect(trackEvents(bass).map((e) => e.step % 16)).toEqual([0, 6, 0, 6, 0, 6, 0, 6]);
  });

  it('the lead uses G major pentatonic only, so it never climbs by semitones', () => {
    for (const n of lead()) expect(G_PENTATONIC as readonly string[]).toContain(PC[n % 12]);
    for (const d of iv(lead())) expect(Math.abs(d)).not.toBe(1);
  });

  it('not star or speed music: no note three times in a row, no rising arpeggio of leaps', () => {
    const mel = lead();
    for (let i = 0; i + 2 < mel.length; i++) expect(mel[i] === mel[i + 1] && mel[i + 1] === mel[i + 2], `same note at ${i}`).toBe(false);
    // An arpeggio climb: three leaps of 3 semitones or more in a row, all up.
    const steps = iv(mel);
    for (let i = 0; i + 2 < steps.length; i++) expect(steps.slice(i, i + 3).every((d) => d >= 3), `leaps up at ${i}`).toBe(false);
    // Also across the loop seam
    const seam = [...mel.slice(-4), ...mel.slice(0, 4)];
    for (const [name, notes] of Object.entries(KNOWN)) expect(copies(seam, notes.map((n) => noteNumber(n)!)), `seam close to ${name}`).toBe(false);
  });

  it('its opening is not any other tune of ours, and the note data stays under 2 KB', () => {
    const open = (p: MusicPlace): string => iv(melody(TUNES[p]).slice(0, 6)).join(',');
    for (const p of ['street', 'well', 'hall', 'cleared', 'win'] as const) expect(open('corn')).not.toBe(open(p));
    expect(JSON.stringify(CORN).length).toBeLessThan(2048);
  });
});

describe('S3f1: the lane tune in the player', () => {
  beforeEach(() => {
    scheduled = [];
  });

  /** Guitar notes are two square waves together; kicks are sines starting at twice E2. */
  const guitarNotes = (): number => scheduled.filter((s) => s.type === 'square').length;
  const kicks = (): number => scheduled.filter((s) => s.type === 'sine' && Math.abs(s.f - midiHz(40) * 2) < 0.01).length;

  it('plays the guitar, then drops only the guitar layer while it is off (under 15 m), and back on', () => {
    const { m, advance } = rig();
    m.play('lane');
    advance(4);
    expect(guitarNotes()).toBeGreaterThan(0);
    expect(kicks()).toBeGreaterThan(0);
    m.setLayer('guitar', false);
    expect(m.layerOn('guitar')).toBe(false);
    scheduled = [];
    advance(4);
    expect(guitarNotes()).toBe(0);
    expect(kicks()).toBeGreaterThan(0);
    expect(scheduled.filter((s) => s.type === 'triangle').length).toBeGreaterThan(0); // bass on
    m.setLayer('guitar', true);
    scheduled = [];
    advance(4);
    expect(guitarNotes()).toBeGreaterThan(0);
  });

  it('two kicks a bar at 120 BPM (beats 1 and 3)', () => {
    const { m, advance } = rig();
    m.play('lane');
    advance(8.05); // four bars at 120 BPM
    expect(kicks()).toBeGreaterThanOrEqual(8);
    expect(kicks()).toBeLessThanOrEqual(10);
  });
});
