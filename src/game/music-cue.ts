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
