/**
 * Decision 62 (Tp, 14 Nov): goats say "meeh" when bumped or fed a fufu ball, and the street 3
 * birds call "hawk hawk" when they take off. Neither is ever hurt, so both calls are silly,
 * never pained. This picks the call for a game event and keeps it from piling up: at most one
 * goat "meeh" every 0.5 s and one bird call every 1.5 s. The Sound switch, the first-tap rule
 * and the iPhone silent switch (decision 22) are all kept by Sound.play itself.
 */
import type { SoundName } from '../engine/sound';
import type { GameEvent } from './game';

/** The two animal calls. */
export type AnimalCall = 'meeh' | 'hawk';

/** The shortest time between two of the same call, in seconds. */
export const CALL_GAP: Record<AnimalCall, number> = { meeh: 0.5, hawk: 1.5 };

/** The call a game event asks for, or null. */
export function callFor(e: GameEvent): AnimalCall | null {
  switch (e.type) {
    case 'bounce':
    case 'smash':
      return e.kind === 'goat' ? 'meeh' : null;
    case 'goatBump':
    case 'goatMeeh':
      return 'meeh';
    case 'birdOff':
      return 'hawk';
    default:
      return null;
  }
}

export class AnimalCalls {
  private last: Record<AnimalCall, number> = { meeh: -Infinity, hawk: -Infinity };

  /** `now` gives seconds (performance time by default; tests pass their own clock). */
  constructor(
    private readonly play: (name: SoundName) => void,
    private readonly now: () => number = () => performance.now() / 1000,
  ) {}

  /**
   * Plays the call this event asks for, unless the same call played too lately.
   * True if it played.
   */
  hear(e: GameEvent): boolean {
    const call = callFor(e);
    if (!call) return false;
    const t = this.now();
    if (t - this.last[call] < CALL_GAP[call]) return false;
    this.last[call] = t;
    this.play(call);
    return true;
  }

  /** A new play of a street: the next call may sound at once. */
  reset(): void {
    this.last = { meeh: -Infinity, hawk: -Infinity };
  }
}
