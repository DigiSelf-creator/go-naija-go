/**
 * Which tune plays where (docs/design.md S2.9), and the glue between the game and the music
 * player (src/engine/music.ts). Pure rules, so they are unit tested without any audio.
 *
 *   Title, builder, credits, Streets, wheel  -> menu loop
 *   A street                                  -> street loop, tempo step 0, 1, 2 for streets 1 to 3
 *   The well room                             -> well loop
 *   Go-Slow Hall                              -> hall loop, one tempo step per hit (128, 134, 140)
 *   Street cleared card                       -> the cleared jingle, once
 *   Win card                                  -> the win tune, once, then quiet
 *   Game over                                 -> no music (the gameOver sound plays alone)
 *   Pause, tab hidden, app switched           -> the tune holds, and carries on from the same bar
 */
import type { MusicPlace } from '../art/tunes';

/** What the game shows now, as far as music cares. */
export interface MusicScene {
  /** The menu screen showing, 'play' in a run with no card up, or null (between screens). */
  screen: 'title' | 'builder' | 'credits' | 'streets' | 'wheel' | 'pause' | 'gameover' | 'cleared' | 'win' | 'play' | null;
  /** The street being played (0 to 2) or 'hall'. */
  where: number | 'hall';
  /** Below the street, in the well room. */
  below: boolean;
  /** Hits on General Go-Slow so far (hall only). */
  hits: number;
  /** The page is hidden (tab switched, app switched, screen locked). */
  hidden: boolean;
}

export interface Cue {
  place: MusicPlace;
  tempo: number;
}

/** The tune a scene wants; null for no music; 'keep' to leave the tune as it is (Pause). */
export function musicCue(s: MusicScene): Cue | null | 'keep' {
  switch (s.screen) {
    case 'title':
    case 'builder':
    case 'credits':
    case 'streets':
    case 'wheel':
      return { place: 'menu', tempo: 0 };
    case 'pause':
      return 'keep';
    case 'gameover':
      return null;
    case null:
      // Between screens (a run starting): the next sync knows where we are going.
      return 'keep';
    case 'cleared':
      return { place: 'cleared', tempo: 0 };
    case 'win':
      return { place: 'win', tempo: 0 };
    case 'play':
      if (s.where === 'hall') return { place: 'hall', tempo: Math.min(Math.max(0, s.hits), 2) };
      if (s.below) return { place: 'well', tempo: 0 };
      return { place: 'street', tempo: Math.min(Math.max(0, s.where), 2) };
  }
}

/** The tune holds (silent, remembering its bar) on the Pause card and while the page is hidden. */
export const musicHeld = (s: MusicScene): boolean => s.hidden || s.screen === 'pause';

/** S2.9 rule 5 and the Sound rule: music plays only with Music on and Sound on. */
export const musicAudible = (sound: boolean, music: boolean): boolean => sound && music;

/** The parts of the music player the game uses (src/engine/music.ts). */
export interface MusicPlayer {
  play(place: MusicPlace, tempo?: number): void;
  setTempo(tempo: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setEnabled(on: boolean): void;
}

/**
 * Turns scenes into player calls. Each call is cheap and changes nothing when the scene's tune
 * is already asked for, so the game may call `update` as often as it likes. Nothing here ever
 * waits: the player schedules its own notes on its own timer.
 */
export class MusicDirector {
  /** The tune last asked for ("" = none yet), so a one-off jingle that ended is not played again. */
  private asked: MusicPlace | null | '' = '';
  private tempo = 0;
  private held = false;

  constructor(private readonly player: MusicPlayer) {}

  /** The Sound and Music switches (both must be on). */
  switches(sound: boolean, music: boolean): void {
    this.player.setEnabled(musicAudible(sound, music));
  }

  /** A new run (or Start again): the next street or hall tune starts from its first bar. */
  restart(): void {
    this.asked = '';
  }

  update(s: MusicScene): void {
    // Between screens (a run starting): change nothing, not even the hold; the next update knows.
    if (s.screen === null) return;
    const cue = musicCue(s);
    const held = musicHeld(s);
    if (cue !== 'keep') {
      const place = cue ? cue.place : null;
      if (place !== this.asked) {
        this.asked = place;
        this.tempo = cue ? cue.tempo : 0;
        if (cue) this.player.play(cue.place, cue.tempo);
        else this.player.stop();
        // play() starts at once: hold it again if the page is hidden.
        this.held = false;
      } else if (cue && cue.tempo !== this.tempo) {
        // The hall after a hit: the player changes tempo at the next bar line.
        this.tempo = cue.tempo;
        this.player.setTempo(cue.tempo);
      }
    }
    if (held !== this.held) {
      this.held = held;
      if (held) this.player.pause();
      else this.player.resume();
    }
  }
}

// ---------------------------------------------------------------- the corn tune (S2.9 "Corn tune")

/** The corn tune plays on its own output at 0.8 (effects 1.0, music 0.3). */
export const CORN_GAIN = 0.8;
/** By count step (0 fresh, then 5, 4, 3, 2, 1): the street tune and every effect, 0 to 1. */
export const CORN_DUCK = [0.3, 0.44, 0.58, 0.72, 0.86, 0.93] as const;
/** By count step: the corn tune's own loudness. Its tempo step is the count step (144, 128 ... 72). */
export const CORN_LOUD = [1, 0.8, 0.6, 0.4, 0.2, 0.1] as const;
/** Seconds: turning down at the start; the end's fade and the way back; a lost life or the bus. */
export const CORN_TIMES = { duck: 0.15, endFade: 0.4, endBack: 0.6, cutFade: 0.3, cutBack: 0.3, switchFade: 0.05 } as const;
const STEPS_PER_SECOND = 60;

/** The number the count shows for `steps` of corn left: 5, 4, 3, 2, 1, or 0 for none. */
export function cornCount(steps: number): number {
  if (steps <= 0) return 0;
  const n = Math.ceil(steps / STEPS_PER_SECOND);
  return n <= 5 ? n : 0;
}

/** The count step (0 while fresh, 1 at "5" ... 5 at "1"): the tempo and loudness row. */
export function cornStage(steps: number): number {
  const n = cornCount(steps);
  return n === 0 ? 0 : 6 - n;
}

/** The parts of the corn player and the turn-down the game uses. */
export interface CornPlayer {
  /** From bar 1 at 144 BPM and full loudness. */
  start(): void;
  /** A count step: tempo on the next 16th, loudness, and one agogo note. */
  step(stage: number): void;
  stop(fade: number): void;
  pause(): void;
  resume(): void;
  /** The street (or well) tune and every sound effect to `level` over `ramp` seconds. */
  duck(level: number, ramp: number): void;
}

export interface CornScene {
  /** Steps of corn left (Run.power.corn). */
  corn: number;
  /** A street (or its well room) is being played: not the hall, the bus, a card or the menus. */
  active: boolean;
  /** Sound on and Music on (po Ruling 1). */
  audible: boolean;
  /** Paused: the pause card, the page hidden. */
  held: boolean;
}

/**
 * Turns the corn timer into corn tune calls (S2.9). Cheap to call every frame.
 * - Corn picked up: the tune starts at once, the street tune and effects go down to 30 percent.
 * - A second corn: the tune starts again from bar 1 at full speed and loudness.
 * - The last 5 seconds: one step per number, slower and softer, the turn-down easing off.
 * - At 0: the tune fades in 0.4 s and everything comes back over 0.6 s.
 * - A lost life, the bus, leaving: fades in 0.3 s and comes back over 0.3 s.
 * - Music or Sound off: no corn tune and no turn-down (the count still shows, elsewhere).
 * - Pause: the tune holds with the corn timer.
 */
export class CornDirector {
  private playing = false;
  private stage = 0;
  private last = 0;
  private held = false;

  constructor(private readonly player: CornPlayer) {}

  get on(): boolean {
    return this.playing;
  }

  get step(): number {
    return this.stage;
  }

  update(s: CornScene): void {
    const want = s.active && s.audible && s.corn > 0;
    const fresh = s.corn > this.last; // picked up (or a second corn)
    if (want && (fresh || !this.playing)) {
      this.player.start();
      this.playing = true;
      this.held = false;
      this.stage = 0;
      this.player.duck(CORN_DUCK[0], CORN_TIMES.duck);
    }
    if (this.playing && !want) {
      const T = CORN_TIMES;
      const natural = s.corn === 0 && s.active && s.audible && this.last <= 6;
      const switched = !s.audible;
      this.player.stop(switched ? T.switchFade : natural ? T.endFade : T.cutFade);
      this.player.duck(1, switched ? T.switchFade : natural ? T.endBack : T.cutBack);
      this.playing = false;
      this.held = false;
      this.stage = 0;
    }
    if (this.playing) {
      const st = cornStage(s.corn);
      if (st !== this.stage) {
        this.stage = st;
        this.player.step(st);
        this.player.duck(CORN_DUCK[st]!, CORN_TIMES.duck);
      }
      if (s.held !== this.held) {
        this.held = s.held;
        if (s.held) this.player.pause();
        else this.player.resume();
      }
    }
    this.last = s.corn;
  }
}
