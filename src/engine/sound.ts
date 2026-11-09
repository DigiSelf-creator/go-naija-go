/**
 * Short sounds made in code with WebAudio: no sound files, nothing downloaded.
 * The audio starts only after the player's first tap or key (browsers require it),
 * and nothing plays while sound is off.
 */
import { audioCtor, playSilence, wake } from './audio-unlock';

export type SoundName =
  | 'jump'
  | 'airJump'
  | 'kobo'
  | 'food'
  | 'bounce'
  | 'meeh'
  | 'smash'
  | 'hit'
  | 'shieldPop'
  | 'fall'
  | 'checkpoint'
  | 'tick'
  | 'gameOver'
  | 'arena'
  // Boss (General Go-Slow)
  | 'honk'
  | 'greenHit'
  | 'bossWin'
  // Slice 2: moving and the street end (H5)
  | 'runStart'
  | 'skid'
  | 'busBoard'
  // Slice 2: hanging crates (J1)
  | 'crateHit'
  | 'crateEmpty'
  | 'crateKobo'
  | 'cratePop'
  // Slice 2: the well and its room (L1)
  | 'wellDown'
  | 'wellUp'
  | 'roomThump'
  | 'parcel'
  // Slice 2: the rolling drum (K1)
  | 'drumWake'
  | 'drumBounce'
  // Slice 2: Go-Slow Hall (M1)
  | 'highHonk'
  | 'hallLamp'
  // Slice 2: Streets screen and Nigeria's wheel (N1)
  | 'cogRatchet'
  | 'cogBell'
  | 'lockedTuk';

/**
 * One tone. f = start Hz; peak = Hz reached at 35% of the length (a talking-drum
 * style bend); to = Hz at the end; at = start delay in s; vol = loudness.
 */
interface Tone {
  f: number;
  len: number;
  wave?: OscillatorType;
  peak?: number;
  to?: number;
  at?: number;
  vol?: number;
}

/** A short burst of hiss (shekere shake, splash). hp/lp = filter Hz. */
interface Hiss {
  len: number;
  at?: number;
  vol?: number;
  hp?: number;
  lp?: number;
}

interface Recipe {
  tones: readonly Tone[];
  hiss?: readonly Hiss[];
}

/** A two-tone horn chord (like a bus horn, not any real one). */
const horn = (lo: number, hi: number, len: number, at: number, sag = 0.97): Tone[] => [
  { f: lo, len, wave: 'sawtooth', to: lo * sag, at, vol: 0.025 },
  { f: hi, len, wave: 'sawtooth', to: hi * sag, at, vol: 0.025 },
];

/**
 * All our own. Soft sine and triangle waves, short. Avoided on purpose: the
 * square-wave B5-to-E6 coin, rising square power-up runs, descending "lose" runs,
 * and pipe or warp slides.
 */
const SOUNDS: Record<SoundName, Recipe> = {
  // Talking-drum bend: up, then settles a little lower.
  jump: { tones: [{ f: 330, len: 0.14, wave: 'triangle', peak: 520, to: 440, vol: 0.07 }] },
  airJump: { tones: [{ f: 470, len: 0.12, wave: 'triangle', peak: 720, to: 620, vol: 0.06 }] },
  // Shekere shake plus one soft high pling that dips.
  kobo: { tones: [{ f: 1175, len: 0.09, wave: 'sine', to: 1110, vol: 0.045 }], hiss: [{ len: 0.045, hp: 5000, vol: 0.05 }] },
  // "Yum": a drum bend up-down, then a small sparkle.
  food: {
    tones: [
      { f: 520, len: 0.16, wave: 'triangle', peak: 760, to: 600 },
      { f: 990, len: 0.12, wave: 'sine', to: 1040, at: 0.15, vol: 0.04 },
    ],
    hiss: [{ len: 0.06, hp: 5000, at: 0.15, vol: 0.03 }],
  },
  // Springy boing.
  bounce: { tones: [{ f: 300, len: 0.13, wave: 'sine', peak: 640, to: 520, vol: 0.08 }] },
  // Friendly goat bleat, wobbly.
  meeh: {
    tones: [
      { f: 540, len: 0.09, wave: 'triangle', peak: 580, to: 500 },
      { f: 530, len: 0.17, wave: 'triangle', peak: 570, to: 470, at: 0.1 },
    ],
  },
  // Soft thump, a puff of dust, a tiny ping.
  smash: {
    tones: [
      { f: 200, len: 0.1, wave: 'triangle', to: 100, vol: 0.09 },
      { f: 1047, len: 0.06, wave: 'sine', at: 0.07, vol: 0.035 },
    ],
    hiss: [{ len: 0.09, lp: 1200, vol: 0.05 }],
  },
  // "Oof": one sagging bend, not a run of falling notes.
  hit: { tones: [{ f: 300, len: 0.24, wave: 'triangle', peak: 340, to: 190, vol: 0.07 }] },
  // Bubble pop: quick rise plus a tiny tick.
  shieldPop: { tones: [{ f: 600, len: 0.05, wave: 'sine', to: 1300, vol: 0.06 }], hiss: [{ len: 0.03, hp: 3000, at: 0.04, vol: 0.04 }] },
  // Plop into the puddle: a short drip then a splash.
  fall: {
    tones: [{ f: 900, len: 0.07, wave: 'sine', to: 300, vol: 0.06 }],
    hiss: [{ len: 0.22, lp: 1800, at: 0.07, vol: 0.06 }],
  },
  // Short bright bell ding (with a quiet bell overtone).
  checkpoint: {
    tones: [
      { f: 1397, len: 0.35, wave: 'sine', vol: 0.06 },
      { f: 3856, len: 0.15, wave: 'sine', vol: 0.015 },
    ],
  },
  // Woodblock tick for the last seconds of a food.
  tick: { tones: [{ f: 1500, len: 0.03, wave: 'sine', to: 1250 }] },
  // "Aw, try again": a dip, then a hopeful lift.
  gameOver: {
    tones: [
      { f: 523, len: 0.22, wave: 'triangle', to: 494 },
      { f: 494, len: 0.32, wave: 'triangle', peak: 560, to: 587, at: 0.24 },
    ],
  },
  // Boss arrives: a low two-tone horn, "pa-paaam".
  arena: { tones: [...horn(311, 392, 0.1, 0), ...horn(311, 392, 0.3, 0.14, 0.94)] },
  // Honk-cloud throw: one sagging "POOO".
  honk: { tones: horn(370, 466, 0.28, 0, 0.9) },
  // Landing on the green light: a drum knock and a bright ding.
  greenHit: {
    tones: [
      { f: 330, len: 0.1, wave: 'triangle', peak: 500, to: 420 },
      { f: 1568, len: 0.25, wave: 'sine', at: 0.08, vol: 0.05 },
    ],
    hiss: [{ len: 0.04, hp: 5000, at: 0.08, vol: 0.03 }],
  },
  // Defeat: happy "pom pom" from the cars, then our own little highlife-style tune.
  bossWin: {
    tones: [
      ...horn(523, 659, 0.09, 0, 1),
      ...horn(523, 659, 0.16, 0.14, 1),
      ...(
        [
          [659, 0.1, 0.45],
          [784, 0.1, 0.57],
          [880, 0.18, 0.69],
          [784, 0.08, 0.9],
          [659, 0.08, 1.0],
          [880, 0.1, 1.1],
          [1047, 0.3, 1.22],
        ] as const
      ).map(([f, len, at]): Tone => ({ f, len, at, wave: 'triangle', vol: 0.05 })),
    ],
    hiss: [
      { len: 0.04, hp: 5000, at: 0.45, vol: 0.03 },
      { len: 0.04, hp: 5000, at: 0.69, vol: 0.03 },
      { len: 0.04, hp: 5000, at: 1.0, vol: 0.03 },
      { len: 0.04, hp: 5000, at: 1.22, vol: 0.03 },
    ],
  },
  // Slice 2 (H5). Run start: a soft dust whoosh, low hiss with a faint low swell under it.
  runStart: {
    tones: [{ f: 140, len: 0.16, wave: 'sine', peak: 190, to: 120, vol: 0.03 }],
    hiss: [{ len: 0.16, lp: 1400, vol: 0.05 }, { len: 0.08, hp: 3000, at: 0.03, vol: 0.015 }],
  },
  // Skid on a turn: a short gritty scuff, two rough hisses and a low drag.
  skid: {
    tones: [{ f: 220, len: 0.12, wave: 'triangle', to: 150, vol: 0.035 }],
    hiss: [{ len: 0.07, lp: 2600, vol: 0.06 }, { len: 0.08, lp: 1800, at: 0.06, vol: 0.045 }],
  },
  // Getting on the bus: the door hiss, then our "pa-paam" horn (same as the arena horn).
  busBoard: {
    tones: [...horn(311, 392, 0.1, 0.32), ...horn(311, 392, 0.3, 0.46, 0.94)],
    hiss: [{ len: 0.26, hp: 2500, vol: 0.04 }],
  },
  // Slice 2 (J1). Crate knocked: a hollow wooden "tok", then a soft rope creak (two slow wobbles).
  crateHit: {
    tones: [
      { f: 820, len: 0.06, wave: 'triangle', to: 560, vol: 0.09 },
      { f: 410, len: 0.08, wave: 'sine', to: 300, vol: 0.05 },
      { f: 150, len: 0.18, wave: 'sawtooth', peak: 175, to: 140, at: 0.09, vol: 0.012 },
      { f: 165, len: 0.16, wave: 'sawtooth', peak: 150, to: 172, at: 0.3, vol: 0.01 },
    ],
    hiss: [{ len: 0.025, hp: 2000, vol: 0.04 }],
  },
  // An empty crate: a duller, lower "tok" and no creak.
  crateEmpty: {
    tones: [
      { f: 560, len: 0.05, wave: 'triangle', to: 400, vol: 0.07 },
      { f: 280, len: 0.06, wave: 'sine', to: 220, vol: 0.04 },
    ],
    hiss: [{ len: 0.02, lp: 1500, vol: 0.03 }],
  },
  // Three kobo out of a crate: our kobo pling three times quickly, each a little higher.
  crateKobo: {
    tones: [0, 1, 2].map((i): Tone => ({ f: 1175 * 2 ** (i / 12), len: 0.08, wave: 'sine', to: 1110 * 2 ** (i / 12), at: i * 0.07, vol: 0.04 })),
    hiss: [0, 1, 2].map((i): Hiss => ({ len: 0.04, hp: 5000, at: i * 0.07, vol: 0.04 })),
  },
  // Food out of a crate: a soft round pop.
  cratePop: {
    tones: [{ f: 260, len: 0.09, wave: 'sine', peak: 620, to: 480, vol: 0.07 }],
    hiss: [{ len: 0.03, lp: 2500, at: 0.01, vol: 0.03 }],
  },
  // Slice 2 (L1). Going down: wooden crank clicks a whole tone lower each time, under a slow rope creak.
  wellDown: {
    tones: [
      ...[0, 1, 2, 3, 4, 5, 6].map((i): Tone => ({ f: 1400 * 2 ** (-i / 6), len: 0.025, wave: 'triangle', to: 1300 * 2 ** (-i / 6), at: i * 0.15, vol: 0.05 })),
      { f: 170, len: 0.5, wave: 'sawtooth', peak: 200, to: 140, at: 0.1, vol: 0.01 },
    ],
    hiss: [0, 1, 2, 3, 4, 5, 6].map((i): Hiss => ({ len: 0.02, hp: 3000, at: i * 0.15, vol: 0.025 })),
  },
  // Going up: the same clicks, a whole tone higher each time, a little quicker.
  wellUp: {
    tones: [
      ...[0, 1, 2, 3, 4, 5].map((i): Tone => ({ f: 800 * 2 ** (i / 6), len: 0.025, wave: 'triangle', to: 760 * 2 ** (i / 6), at: i * 0.13, vol: 0.05 })),
      { f: 150, len: 0.45, wave: 'sawtooth', peak: 190, to: 175, at: 0.05, vol: 0.01 },
    ],
    hiss: [0, 1, 2, 3, 4, 5].map((i): Hiss => ({ len: 0.02, hp: 3000, at: i * 0.13, vol: 0.025 })),
  },
  // Arriving in the room: a soft hollow thump with two quiet echoes.
  roomThump: {
    tones: [
      { f: 120, len: 0.22, wave: 'sine', to: 60, vol: 0.11 },
      { f: 118, len: 0.18, wave: 'sine', to: 64, at: 0.17, vol: 0.035 },
      { f: 116, len: 0.16, wave: 'sine', to: 66, at: 0.33, vol: 0.015 },
    ],
    hiss: [{ len: 0.08, lp: 600, vol: 0.05 }],
  },
  // Garri parcel: a warm two-note "got it", up a fifth, soft triangle.
  parcel: {
    tones: [
      { f: 392, len: 0.13, wave: 'triangle', vol: 0.06 },
      { f: 587, len: 0.3, wave: 'triangle', peak: 594, to: 587, at: 0.12, vol: 0.06 },
      { f: 294, len: 0.4, wave: 'sine', at: 0.12, vol: 0.03 },
    ],
  },
  // Slice 2 (K1). The drum wakes: a low hollow "dum", then a soft rolling rumble (four low
  // knocks getting quieter, under a low hiss), like an empty drum starting to roll on tar.
  drumWake: {
    tones: [
      { f: 98, len: 0.22, wave: 'sine', peak: 110, to: 82, vol: 0.12 },
      { f: 196, len: 0.08, wave: 'triangle', to: 150, vol: 0.03 },
      ...[0, 1, 2, 3].map((i): Tone => ({ f: 72 + (i % 2) * 6, len: 0.07, wave: 'triangle', to: 60, at: 0.16 + i * 0.09, vol: 0.06 - i * 0.012 })),
    ],
    hiss: [{ len: 0.45, lp: 380, at: 0.1, vol: 0.05 }],
  },
  // Landed on: a deep metal "dong" (a low body note with two bright, out-of-tune metal
  // partials over it, as an empty drum rings), and a short strike click.
  drumBounce: {
    tones: [
      { f: 147, len: 0.45, wave: 'sine', to: 140, vol: 0.1 },
      { f: 147 * 2.76, len: 0.3, wave: 'sine', to: 147 * 2.7, vol: 0.035 },
      { f: 147 * 5.4, len: 0.16, wave: 'sine', to: 147 * 5.3, vol: 0.018 },
      { f: 220, len: 0.06, wave: 'triangle', to: 160, vol: 0.05 },
    ],
    hiss: [{ len: 0.03, hp: 3500, vol: 0.05 }],
  },
  // Slice 2 (M1). High honk throw: a thin, high two-tone "pee-PEEP" (a quick short toot, then a
  // longer one that lifts a little), two triangles a minor third apart, far above the low
  // sawtooth "POOO" so the ear tells them apart too.
  highHonk: {
    tones: [
      { f: 932, len: 0.07, wave: 'triangle', vol: 0.04 },
      { f: 1109, len: 0.07, wave: 'triangle', vol: 0.03 },
      { f: 932, len: 0.2, wave: 'triangle', to: 960, at: 0.1, vol: 0.045 },
      { f: 1109, len: 0.2, wave: 'triangle', to: 1142, at: 0.1, vol: 0.035 },
    ],
  },
  // A roof lamp coming on: a small switch click, then a soft low electric hum that fades.
  hallLamp: {
    tones: [
      { f: 1600, len: 0.02, wave: 'triangle', to: 1200, vol: 0.05 },
      { f: 110, len: 0.45, wave: 'sine', vol: 0.03 },
      { f: 220, len: 0.35, wave: 'sine', vol: 0.012 },
    ],
    hiss: [{ len: 0.015, hp: 3000, vol: 0.04 }],
  },
  // Slice 2 (N1). A cog starting to turn: four quick dry ratchet clicks, wood-on-metal, that
  // rock between two close pitches (never a run up or down), each with a tiny tick of hiss.
  cogRatchet: {
    tones: [0, 1, 2, 3].map((i): Tone => ({ f: i % 2 ? 2100 : 2350, len: 0.018, wave: 'triangle', to: i % 2 ? 1900 : 2150, at: i * 0.075, vol: 0.045 })),
    hiss: [0, 1, 2, 3].map((i): Hiss => ({ len: 0.015, hp: 4000, at: i * 0.075, vol: 0.03 })),
  },
  // Then a small bell: one soft strike, a low body note with two out-of-tune bell partials
  // over it (1 : 2.76 : 5.4), lower and rounder than the bus stop's ding.
  cogBell: {
    tones: [
      { f: 1046, len: 0.6, wave: 'sine', to: 1040, vol: 0.05 },
      { f: 1046 * 2.76, len: 0.32, wave: 'sine', to: 1040 * 2.76, vol: 0.014 },
      { f: 1046 * 5.4, len: 0.12, wave: 'sine', vol: 0.006 },
    ],
  },
  // Tapping a locked street card: one soft, low, short "tuk", like a knock on a closed door.
  lockedTuk: {
    tones: [
      { f: 200, len: 0.07, wave: 'triangle', to: 150, vol: 0.07 },
      { f: 400, len: 0.03, wave: 'sine', to: 320, vol: 0.02 },
    ],
    hiss: [{ len: 0.02, lp: 900, vol: 0.03 }],
  },
};

/** Every tone and hiss fades in over this long from near silence, so none starts with a tick. */
export const ATTACK = 0.003;

export class Sound {
  private ac: AudioContext | null = null;
  enabled = true;

  /**
   * Call from every tap, touch end, click or key (see audio-unlock.ts): creates the audio the
   * first time and wakes it whenever it is not running. Cheap when it already runs.
   */
  unlock(): void {
    try {
      if (!this.ac) {
        const Ctor = audioCtor();
        if (!Ctor) return;
        this.ac = new Ctor();
      }
      const ac = this.ac;
      if (ac.state === 'running' && this.opened) return;
      wake(ac);
      // iOS: a sound started inside the gesture opens audio for the page.
      playSilence(ac);
      this.opened = true;
    } catch {
      this.ac = null; // no sound, the game still runs
    }
  }

  /** The page shows again (app switch, screen lock): try to wake the audio without a tap. */
  wake(): void {
    if (this.ac) wake(this.ac);
  }

  /** The AudioContext once the first tap made it (the music shares it), else null. */
  get context(): AudioContext | null {
    return this.ac;
  }

  /** True while sounds can be heard (the context runs). */
  get running(): boolean {
    return this.ac?.state === 'running';
  }

  private opened = false;

  get started(): boolean {
    return this.ac !== null;
  }

  private noise: AudioBuffer | null = null;

  play(name: SoundName): void {
    const ac = this.ac;
    if (!this.enabled || !ac || ac.state !== 'running') return;
    const recipe = SOUNDS[name];
    const now = ac.currentTime;
    try {
      for (const tone of recipe.tones) {
        const t = now + (tone.at ?? 0);
        const end = t + tone.len;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        gain.gain.value = 0.0001; // a new gain starts at 1: start it quiet so no sample slips out before the envelope
        osc.type = tone.wave ?? 'triangle';
        osc.frequency.setValueAtTime(tone.f, t);
        if (tone.peak) osc.frequency.linearRampToValueAtTime(tone.peak, t + tone.len * 0.35);
        if (tone.to) osc.frequency.linearRampToValueAtTime(tone.to, end);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(tone.vol ?? 0.06, t + ATTACK);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, t + ATTACK + 0.01));
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(end + 0.02);
      }
    } catch {
      /* a sound that fails is never worth a crash */
    }
    // Hiss is extra: if this browser cannot make it, the tones above still played.
    try {
      for (const h of recipe.hiss ?? []) {
        const t = now + (h.at ?? 0);
        if (!this.noise) {
          const len = Math.ceil(ac.sampleRate * 0.3);
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
          this.noise = buf;
        }
        const src = ac.createBufferSource();
        src.buffer = this.noise;
        const filter = ac.createBiquadFilter();
        filter.type = h.lp ? 'lowpass' : 'highpass';
        filter.frequency.setValueAtTime(h.lp ?? h.hp ?? 4000, t);
        const gain = ac.createGain();
        gain.gain.value = 0.0001; // a new gain starts at 1: start it quiet so no sample slips out before the envelope
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(h.vol ?? 0.04, t + ATTACK);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(h.len, ATTACK + 0.01));
        src.connect(filter).connect(gain).connect(ac.destination);
        src.start(t);
        src.stop(t + h.len + 0.02);
      }
    } catch {
      /* no hiss, still fine */
    }
  }
}
