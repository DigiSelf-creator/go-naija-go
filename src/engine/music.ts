/**
 * Music made in code with WebAudio (docs/design.md S2.9). The notes live in
 * src/art/tunes.ts; this file turns them into sound.
 *
 *   const music = new Music();
 *   music.unlock();          // from the first tap or key (or music.attach(ctx) to share one AudioContext)
 *   music.play('street', 0); // street 1 tempo; 'menu' | 'street' | 'well' | 'hall' | 'cleared' | 'win'
 *   music.setTempo(1);       // hall after a hit: changes at the next bar line
 *   music.pause(); music.resume();   // carries on from the same bar
 *   music.setEnabled(false); // the Music switch: no tune anywhere
 *   music.stop();
 *
 * Light on the CPU: a 25 ms timer schedules notes 0.1 s ahead (the game never
 * waits for music); each note is one or two oscillators that stop by themselves;
 * at most 6 notes sound at once (checked in the tests).
 */
import { TUNES, type Instrument, type MusicPlace, type Track, type Tune } from '../art/tunes';
import { audioCtor, playSilence, wake } from './audio-unlock';

export type { MusicPlace };

/** Music is about a third as loud as the sound effects (S2.9 rule 1). */
export const MUSIC_GAIN = 0.3;
export const LOOKAHEAD = 0.1;
export const TICK_MS = 25;
const FADE_OUT = 0.3;
const QUIET = 0.2;
/** Every note fades in over this long from near silence, so no note starts with a tick. */
export const ATTACK = 0.003;

// ---------------------------------------------------------------- notes (pure)

const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" -> 69 (MIDI number); null if not a note. */
export function noteNumber(name: string): number | null {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return null;
  const pc = NAMES[m[1]!];
  return pc === undefined ? null : (Number(m[2]) + 1) * 12 + pc;
}

export const midiHz = (n: number): number => 440 * 2 ** ((n - 69) / 12);

export interface NoteEvent {
  /** 16th step from the start of the tune. */
  step: number;
  /** Length in 16ths (holds added). */
  len: number;
  /** MIDI note numbers (several for a chord); empty for a shaker hit. */
  notes: number[];
  inst: Instrument;
  vol: number;
  accent: boolean;
}

/** Turns one track into note events. Holds ("-") carry across bar lines. Throws on a bad token or a bar not 16 long. */
export function trackEvents(t: Track): NoteEvent[] {
  const out: NoteEvent[] = [];
  let step = 0;
  let last: NoteEvent | null = null;
  for (const [b, bar] of t.bars.entries()) {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== 16) throw new Error(`${t.inst} bar ${b + 1} has ${tokens.length} steps, not 16`);
    for (const tok of tokens) {
      if (tok === '-') {
        if (last) last.len++;
      } else if (tok === '.') {
        last = null;
      } else if (tok === 'x' || tok === 'X') {
        last = { step, len: 1, notes: [], inst: t.inst, vol: t.vol, accent: tok === 'X' };
        out.push(last);
      } else {
        const notes = tok.split('+').map((n) => {
          const v = noteNumber(n);
          if (v === null) throw new Error(`${t.inst} bar ${b + 1}: "${tok}" is not a note`);
          return v;
        });
        last = { step, len: 1, notes, inst: t.inst, vol: t.vol, accent: false };
        out.push(last);
      }
      step++;
    }
  }
  return out;
}

/** Every event of a tune at a tempo step (layers that join later are left out), sorted by step. */
export function tuneEvents(tune: Tune, tempo = 0): NoteEvent[] {
  return tune.tracks
    .filter((t) => (t.from ?? 0) <= tempo)
    .flatMap(trackEvents)
    .sort((a, b) => a.step - b.step);
}

/** Seconds per 16th at a tempo step. */
export function stepSeconds(tune: Tune, tempo = 0): number {
  const bpm = tune.bpm[Math.min(Math.max(0, tempo), tune.bpm.length - 1)] ?? 120;
  return 60 / bpm / 4;
}

/** How long each note really rings (s): plucks and bells fall away on their own. */
export function ringSeconds(e: NoteEvent, stepS: number): number {
  const held = e.len * stepS;
  switch (e.inst) {
    case 'guitar':
      return Math.min(Math.max(held, 0.12), 0.25 + held * 0.5);
    case 'agogo':
      return 0.12;
    case 'shekere':
      return 0.05;
    case 'drum':
      return 0.18;
    case 'kalimba':
      return 0.6;
    case 'horn':
      return Math.min(held, 0.2);
    case 'bass':
    case 'drone':
      return held;
  }
}

// ---------------------------------------------------------------- player

type Timer = ReturnType<typeof setInterval>;

export interface MusicOptions {
  /** For tests: a stand-in for setInterval / clearInterval. */
  setInterval?: (fn: () => void, ms: number) => Timer;
  clearInterval?: (t: Timer) => void;
  /** The player's own output level instead of MUSIC_GAIN (the corn tune plays at 0.8, S2.9). */
  gain?: number;
}

export class Music {
  private ac: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: Timer | null = null;
  private readonly setI: (fn: () => void, ms: number) => Timer;
  private readonly clearI: (t: Timer) => void;
  private readonly gain: number;
  /** Turn-down (corn: the street tune at 30 percent) or loudness step (the corn count), 0 to 1. */
  private level = 1;
  /** A pending tempo change lands on the next 16th, not the next bar line (the corn count). */
  private tempoNow = false;

  private on = true;
  private paused = false;
  private current: MusicPlace | null = null;
  private tune: Tune | null = null;
  private tempo = 0;
  private pendingTempo: number | null = null;
  private events: NoteEvent[] = [];
  /** Next 16th step to schedule (within the tune), and when it sounds. */
  private step = 0;
  private nextTime = 0;
  /** Index into events of the next one to schedule. */
  private cursor = 0;
  /** Bar to restart from after a pause. */
  private resumeBar = 0;

  constructor(opts: MusicOptions = {}) {
    this.setI = opts.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this.clearI = opts.clearInterval ?? ((t) => clearInterval(t));
    this.gain = opts.gain ?? MUSIC_GAIN;
  }

  /** The output level asked for now (before the tune's own gain), 0 to 1. */
  get outLevel(): number {
    return this.level;
  }

  /** Turns the whole tune to `level` (0 to 1) over `ramp` seconds; it keeps playing. */
  setLevel(level: number, ramp = 0.15): void {
    this.level = level;
    const ac = this.ac;
    const out = this.out;
    if (!ac || !out || !this.tune) return;
    try {
      const now = ac.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(this.gain * this.tune.gain * level, now + Math.max(0.001, ramp));
    } catch {
      /* fine */
    }
  }

  /** Plays the place's tune from its first bar at once, even if it is playing (a second corn). */
  restart(place: MusicPlace, tempo = 0): void {
    this.current = place;
    this.tempo = tempo;
    this.pendingTempo = null;
    this.tempoNow = false;
    this.paused = false;
    this.resumeBar = 0;
    if (!this.on) return;
    this.start(place, tempo, 0, 0.02);
  }

  /** Changes the tempo on the next 16th note (the corn count): only the speed, never the pitch. */
  setTempoSoon(tempo: number): void {
    this.setTempo(tempo);
    if (this.pendingTempo !== null) this.tempoNow = true;
  }

  /** One agogo note now (the corn count's number), on this player's output. */
  accent(note = 81): void {
    const ac = this.ac;
    if (!ac || !this.out || this.paused || !this.on) return;
    this.sound({ step: 0, len: 1, notes: [note], inst: 'agogo', vol: 0.9, accent: true }, ac.currentTime + 0.01, 0.1);
  }

  /** Use an AudioContext the game already has (one context is lighter on a phone). */
  attach(ac: AudioContext): void {
    this.ac = ac;
  }

  /** Call from a tap or key: creates or wakes the audio. Music starts only after this (S2.9 rule 3). */
  unlock(): void {
    try {
      if (!this.ac) {
        const Ctor = audioCtor();
        if (!Ctor) return;
        this.ac = new Ctor();
        playSilence(this.ac);
      }
      wake(this.ac);
      if (this.current && this.on && !this.paused && !this.timer) this.start(this.current, this.tempo, this.resumeBar, 0);
    } catch {
      this.ac = null;
    }
  }

  get enabled(): boolean {
    return this.on;
  }

  /** The place whose tune is meant to be playing (null when stopped). */
  get place(): MusicPlace | null {
    return this.current;
  }

  /** Held by pause() (Pause card, hidden page) until resume(). */
  get held(): boolean {
    return this.paused;
  }

  get tempoStep(): number {
    return this.pendingTempo ?? this.tempo;
  }

  /** The Music switch. Off: silence now and no tune anywhere; on: the current place plays again. */
  setEnabled(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    if (!on) {
      this.halt(0.05);
    } else if (this.current && !this.paused) {
      this.start(this.current, this.tempo, 0, 0.05);
    }
  }

  /**
   * Play a place's tune. The old tune fades out in 0.3 s, then 0.2 s of quiet,
   * then the new one starts on its first bar line. Playing the place that is
   * already playing only changes the tempo (at the next bar line).
   */
  play(place: MusicPlace, tempo = 0): void {
    if (place === this.current && this.tune?.loop && !this.paused) {
      this.setTempo(tempo);
      return;
    }
    const wasPlaying = this.timer !== null;
    this.current = place;
    this.tempo = tempo;
    this.pendingTempo = null;
    this.paused = false;
    this.resumeBar = 0;
    if (!this.on) return;
    this.start(place, tempo, 0, wasPlaying ? FADE_OUT + QUIET : 0.05);
  }

  /** Hall after a hit, or street 1 to 3: takes effect at the next bar line. */
  setTempo(tempo: number): void {
    if (!this.tune) {
      this.tempo = tempo;
      return;
    }
    const t = Math.min(Math.max(0, Math.floor(tempo)), this.tune.bpm.length - 1);
    if (t !== this.tempo) this.pendingTempo = t;
  }

  /** Pause (pause screen, phone upright, tab hidden): silence, remembering the bar. */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.tune) this.resumeBar = Math.floor(this.step / 16) % this.tune.bars;
    this.halt(0.05);
  }

  /** Carry on from the bar where the pause happened. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.current && this.on) this.start(this.current, this.tempo, this.resumeBar, 0.05);
  }

  /** No music (game over, leaving play). The tune fades out over `fade` seconds. */
  stop(fade = FADE_OUT): void {
    this.current = null;
    this.tune = null;
    this.paused = false;
    this.halt(fade);
  }

  // ---------------------------------------------------------------- inside

  private halt(fade: number): void {
    if (this.timer) this.clearI(this.timer);
    this.timer = null;
    const ac = this.ac;
    const out = this.out;
    if (ac && out) {
      try {
        const now = ac.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + fade);
        setTimeout(() => {
          try {
            out.disconnect();
          } catch {
            /* already gone */
          }
        }, (fade + 0.2) * 1000);
      } catch {
        /* fine */
      }
    }
    this.out = null;
  }

  private start(place: MusicPlace, tempo: number, bar: number, delay: number): void {
    this.halt(FADE_OUT);
    const ac = this.ac;
    const tune = TUNES[place];
    this.tune = tune;
    this.tempo = Math.min(Math.max(0, tempo), tune.bpm.length - 1);
    this.events = tuneEvents(tune, this.tempo);
    this.step = bar * 16;
    this.cursor = this.events.findIndex((e) => e.step >= this.step);
    if (this.cursor < 0) this.cursor = this.events.length;
    if (!ac) return; // unlock() will start it
    try {
      const out = ac.createGain();
      out.gain.setValueAtTime(this.gain * tune.gain * this.level, ac.currentTime);
      out.connect(ac.destination);
      this.out = out;
    } catch {
      return;
    }
    this.nextTime = ac.currentTime + delay;
    this.timer = this.setI(() => this.tick(), TICK_MS);
    this.tick();
  }

  /** Schedules every note due in the next LOOKAHEAD seconds. */
  tick(): void {
    const ac = this.ac;
    const tune = this.tune;
    if (!ac || !tune || !this.out || !this.on || this.paused) return;
    const until = ac.currentTime + LOOKAHEAD;
    const total = tune.bars * 16;
    while (this.nextTime < until) {
      // Tempo changes and layer changes land on a bar line.
      if ((this.tempoNow || this.step % 16 === 0) && this.pendingTempo !== null) {
        this.tempo = this.pendingTempo;
        this.pendingTempo = null;
        this.tempoNow = false;
        this.events = tuneEvents(tune, this.tempo);
        this.cursor = this.events.findIndex((e) => e.step >= this.step);
        if (this.cursor < 0) this.cursor = this.events.length;
      }
      const stepS = stepSeconds(tune, this.tempo);
      while (this.cursor < this.events.length && this.events[this.cursor]!.step === this.step) {
        this.sound(this.events[this.cursor]!, this.nextTime, stepS);
        this.cursor++;
      }
      this.step++;
      this.nextTime += stepS;
      if (this.step >= total) {
        if (!tune.loop) {
          // A one-off tune: let the last notes ring, then stop.
          if (this.timer) this.clearI(this.timer);
          this.timer = null;
          this.current = null;
          return;
        }
        this.step = 0;
        this.cursor = 0;
      }
    }
  }

  private sound(e: NoteEvent, t: number, stepS: number): void {
    const ac = this.ac;
    const out = this.out;
    if (!ac || !out) return;
    const ring = ringSeconds(e, stepS);
    const vol = e.vol * 0.08; // with MUSIC_GAIN, the whole band peaks well under one sound effect
    try {
      if (e.inst === 'shekere') {
        this.hiss(t, 0.05, e.accent ? vol * 0.9 : vol * 0.55);
        return;
      }
      for (const n of e.notes) {
        const f = midiHz(n);
        switch (e.inst) {
          case 'bass':
            this.osc('triangle', f, t, ring, vol, { lp: 600 });
            break;
          case 'drone':
            this.osc('triangle', f, t, ring, vol * 0.6, { lp: 400, attack: 0.4 });
            break;
          case 'guitar':
            // Highlife pluck: two slightly apart square waves, softened by a low-pass, falling away.
            this.osc('square', f * 1.003, t, ring, vol * 0.35, { lp: 1800 });
            this.osc('square', f * 0.997, t, ring, vol * 0.35, { lp: 1800 });
            break;
          case 'agogo':
            this.osc('sine', f, t, ring, vol * 0.6);
            this.osc('sine', f * 2.7, t, ring * 0.7, vol * 0.25);
            break;
          case 'drum':
            this.osc('sine', f, t, ring, vol * 1.2, { bend: [f * 1.5, f * 1.25] });
            break;
          case 'kalimba':
            this.osc('sine', f, t, ring, vol * 0.8);
            this.osc('sine', f * 3, t, ring * 0.3, vol * 0.12);
            break;
          case 'horn':
            this.osc('sawtooth', f, t, ring, vol * 0.4, { lp: 1200 });
            break;
        }
      }
    } catch {
      /* one lost note never stops the game */
    }
  }

  private osc(type: OscillatorType, f: number, t: number, len: number, vol: number, o: { lp?: number; attack?: number; bend?: [number, number] } = {}): void {
    const ac = this.ac!;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    gain.gain.value = 0.0001; // a new gain starts at 1: start it quiet so no sample slips out before the envelope
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (o.bend) {
      osc.frequency.linearRampToValueAtTime(o.bend[0], t + len * 0.35);
      osc.frequency.linearRampToValueAtTime(o.bend[1], t + len);
    }
    const a = o.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, a + 0.01));
    let node: AudioNode = osc.connect(gain);
    if (o.lp) {
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(o.lp, t);
      node = gain.connect(filter);
    }
    node.connect(this.out!);
    osc.start(t);
    osc.stop(t + Math.max(len, a + 0.01) + 0.02);
  }

  private hiss(t: number, len: number, vol: number): void {
    const ac = this.ac!;
    if (!this.noise) {
      const n = Math.ceil(ac.sampleRate * 0.1);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, t);
    const gain = ac.createGain();
    gain.gain.value = 0.0001; // a new gain starts at 1: start it quiet so no sample slips out before the envelope
    // A short fade-in: a shake that starts at full volume clicks on every beat.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, ATTACK + 0.01));
    src.connect(filter).connect(gain).connect(this.out!);
    src.start(t);
    src.stop(t + len + 0.02);
  }
}
