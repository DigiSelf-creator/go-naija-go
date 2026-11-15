/**
 * The lane run's sounds (design.md S3f0 part 17), our own, made in code. They load with the
 * lane run (not the first page): call addLaneSounds() once when the run's code loads, then
 * play them by name with Sound.play. Every one follows the Sound switch, the first-tap rule
 * and the iPhone silent switch (decision 22), as all our sounds do.
 *
 * Soft sine and triangle waves, short. Never a square wave, never the famous two-note rising
 * coin, never a rising power-up run or a falling "lose" jingle.
 * The goat's "meeh" is the streets' sound (decision 62): play 'meeh' through AnimalCalls.
 * The close hum is held, not a one-shot: Sound.setCloseHum(true / false).
 */
import { addSounds, type Hiss, type LaneSoundName, type Recipe, type Tone } from '../engine/sound';

/** E minor pentatonic notes (Hz), the lane tune's key. */
const E5 = 659.3;
const G5 = 784;
const A5 = 880;
const B5 = 987.8;
const D5 = 587.3;
const E6 = 1318.5;

/** A soft bell: a sine and a quieter bright overtone. */
const bell = (f: number, at: number, len: number, vol: number): Tone[] => [
  { f, len, at, wave: 'sine', to: f * 0.998, vol },
  { f: f * 2.76, len: len * 0.4, at, wave: 'sine', to: f * 2.75, vol: vol * 0.22 },
];

/** A soft "tink": one note of the tune's scale, with a glassy overtone. */
const tink = (f: number): Recipe => ({ tones: bell(f, 0, 0.13, 0.045) });

/** One footstep: a muffled low tap and a little grit. */
const step = (f: number): Recipe => ({
  tones: [{ f, len: 0.05, wave: 'triangle', to: f * 0.62, vol: 0.03 }],
  hiss: [{ len: 0.03, lp: 1400, vol: 0.016 }],
});

/** A "wom": a short nasal voice that scoops up a touch, then falls; comic, never sad. */
const wom = (f: number, at: number): Tone[] => [
  { f: f * 0.96, len: 0.2, at, wave: 'triangle', peak: f * 1.03, to: f * 0.84, vol: 0.06, nasal: 520, q: 2.5 },
  { f: f / 2, len: 0.18, at, wave: 'sine', peak: (f / 2) * 1.03, to: (f / 2) * 0.84, vol: 0.03 },
];

const click = (at: number): Hiss => ({ len: 0.012, hp: 3200, at, vol: 0.05 });

export const LANE_SOUNDS: Readonly<Record<LaneSoundName, Recipe>> = {
  // Steps: soft feet, two alternating taps (play A, B, A, B; faster as the run speeds up).
  laneStepA: step(170),
  laneStepB: step(150),
  // Lane change: a short soft whoosh (air through two band filters, no tone).
  laneSwish: {
    tones: [],
    hiss: [
      { len: 0.07, bp: 1500, vol: 0.035 },
      { len: 0.09, bp: 2400, at: 0.04, vol: 0.03 },
    ],
  },
  // Jump: a small hop up (a soft sine lift, not the streets' talking-drum jump).
  laneHop: {
    tones: [{ f: 250, len: 0.11, wave: 'sine', peak: 360, to: 380, vol: 0.06 }],
    hiss: [{ len: 0.04, lp: 1800, vol: 0.015 }],
  },
  // Land: a soft thud.
  laneLand: {
    tones: [{ f: 140, len: 0.1, wave: 'sine', to: 70, vol: 0.07 }],
    hiss: [{ len: 0.05, lp: 700, vol: 0.03 }],
  },
  // Slide: a short cloth scuff.
  laneSlide: {
    tones: [],
    hiss: [
      { len: 0.24, bp: 900, vol: 0.04 },
      { len: 0.12, hp: 3000, at: 0.05, vol: 0.014 },
    ],
  },
  // Coin: a soft "tink", one of three notes of the tune's scale at random (laneTinkFor picks).
  // Never a two-note rising coin: each is one note, and none is a fourth above another's B5.
  laneTink0: tink(G5),
  laneTink1: tink(A5),
  laneTink2: tink(B5),
  // Power bulb: a low hum that ends in a small bell, "vmm-ding".
  laneBulb: {
    tones: [
      { f: 110, len: 0.22, wave: 'sawtooth', to: 140, vol: 0.05, nasal: 420, q: 2 },
      { f: 220, len: 0.2, wave: 'sine', to: 280, vol: 0.02 },
      ...bell(E6, 0.2, 0.42, 0.04),
    ],
  },
  // Tech chip: two quick bright "blip-blip" (triangle, a little lift each).
  laneChip: {
    tones: [
      { f: 1175, len: 0.05, wave: 'triangle', to: 1245, vol: 0.035 },
      { f: 1568, len: 0.06, at: 0.08, wave: 'triangle', to: 1660, vol: 0.035 },
    ],
  },
  // Burst: a wooden "pok" and a short rattle of slats; no bang.
  lanePok: {
    tones: [
      { f: 520, len: 0.07, wave: 'triangle', to: 250, vol: 0.08 },
      ...[700, 610, 760, 560].map((f, i): Tone => ({ f, len: 0.025, at: 0.06 + i * 0.035, wave: 'triangle', to: f * 0.8, vol: 0.026 })),
    ],
    hiss: [{ len: 0.04, bp: 1200, vol: 0.04 }],
  },
  // Stumble: a small "oof" (a short low voice) and a thump.
  laneOof: {
    tones: [
      { f: 210, len: 0.15, wave: 'sawtooth', peak: 235, to: 165, vol: 0.06, nasal: 480, q: 3 },
      { f: 120, len: 0.12, at: 0.09, wave: 'sine', to: 60, vol: 0.08 },
    ],
    hiss: [{ len: 0.05, lp: 600, at: 0.09, vol: 0.035 }],
  },
  // A lamp switching off: a low soft "tunk".
  laneTunk: {
    tones: [
      { f: 196, len: 0.12, wave: 'sine', to: 150, vol: 0.05 },
      { f: 98, len: 0.1, wave: 'triangle', to: 80, vol: 0.03 },
    ],
    hiss: [click(0)],
  },
  // Shield used: a short "tzing".
  laneTzing: {
    tones: [
      { f: 1760, len: 0.18, wave: 'triangle', to: 2093, vol: 0.03 },
      { f: 2637, len: 0.24, at: 0.02, wave: 'sine', to: 2600, vol: 0.014 },
    ],
    hiss: [{ len: 0.1, hp: 6000, vol: 0.025 }],
  },
  // Bus stop: a two-note danfo horn ("pom-paam", our own pitches), then a three-note chime.
  laneBusStop: {
    tones: [
      { f: 392, len: 0.14, wave: 'sawtooth', to: 386, vol: 0.022, nasal: 900, q: 1.5 },
      { f: 494, len: 0.14, wave: 'sawtooth', to: 487, vol: 0.022, nasal: 900, q: 1.5 },
      { f: 330, len: 0.32, at: 0.2, wave: 'sawtooth', to: 322, vol: 0.024, nasal: 900, q: 1.5 },
      { f: 392, len: 0.32, at: 0.2, wave: 'sawtooth', to: 383, vol: 0.024, nasal: 900, q: 1.5 },
      ...bell(D5, 0.68, 0.2, 0.045),
      ...bell(E5, 0.86, 0.2, 0.045),
      ...bell(B5, 1.04, 0.5, 0.045),
    ],
  },
  // Caught: a soft falling "wom-wom-wom", then a torch click; never sad.
  laneCaught: {
    tones: [...wom(330, 0), ...wom(294, 0.22), ...wom(247, 0.44), { f: 1800, len: 0.02, at: 0.9, wave: 'triangle', to: 1500, vol: 0.03 }],
    hiss: [click(0.9), click(0.96)],
  },
};

/** The lane run's sound names, in board order. */
export const LANE_SOUND_NAMES = Object.keys(LANE_SOUNDS) as LaneSoundName[];

/** Puts the lane run's recipes into Sound. Call once when the lane run loads. */
export function addLaneSounds(): void {
  addSounds(LANE_SOUNDS);
}

/** The coin "tink" for a random number 0 to 1 (Math.random()): one of three notes. */
export function laneTinkFor(r: number): 'laneTink0' | 'laneTink1' | 'laneTink2' {
  const i = Number.isFinite(r) ? Math.min(2, Math.max(0, Math.floor(r * 3))) : 0;
  return (['laneTink0', 'laneTink1', 'laneTink2'] as const)[i]!;
}

/** The step for step number n (alternating feet). */
export function laneStepFor(n: number): 'laneStepA' | 'laneStepB' {
  return Math.abs(Math.floor(n)) % 2 === 0 ? 'laneStepA' : 'laneStepB';
}

/**
 * Seconds between steps at a run speed (m/s): about 2.6 steps a second at 9 m/s, up to about
 * 3.4 at 16 m/s, so the feet sound faster as the run speeds up.
 */
export function laneStepGap(speed: number): number {
  const v = Number.isFinite(speed) ? Math.min(16, Math.max(9, speed)) : 9;
  return 1 / (2.6 + ((v - 9) / 7) * 0.8);
}
