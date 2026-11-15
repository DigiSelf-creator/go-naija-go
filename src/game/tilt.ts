/**
 * S3f0 part 25.4 and 25.5 (decision 70): can this phone tilt, and may the game read it? Only this
 * small part is in the first load (the Settings switch needs it); the tilt reader itself is in the
 * lane run's chunk. No reading is kept here: the quiet check only looks for a number.
 */

/** What the phone said this visit: not asked yet, yes, or no. */
export type TiltAnswer = 'unknown' | 'granted' | 'denied';
/** Which tap asked: the switch or "Try tilt", or a run's start or resume button. */
export type TiltAskFrom = 'switch' | 'run';

interface OrientationEventStatic {
  requestPermission?: () => Promise<string>;
}

/**
 * Part 25.4: after a no, does iOS ask again in the store app once the game is closed and opened
 * again? Then the Safari line ("close the game and open it again") is right there too; if a real
 * iPhone shows it does not, set this false and the app says to allow Motion in Settings instead.
 */
export const TILT_APP_ASKS_AGAIN = true;

/** Part 25.5: the quiet check for a real reading lasts this long after the game opens. */
export const TILT_DETECT_MS = 1500;

export class TiltAccess {
  /** iPhone or iPad: motion needs Apple's own box, asked only from a tap. */
  readonly ios: boolean;
  /** A phone that can tilt (25.5). Android-like phones learn it within 1.5 s. */
  canTilt: boolean;
  answer: TiltAnswer;
  private asking: Promise<'granted' | 'denied'> | null = null;
  private readonly seen: (() => void)[] = [];
  private readonly answered: ((a: 'granted' | 'denied', from: TiltAskFrom) => void)[] = [];

  constructor(win: Window = window) {
    const touch = (() => {
      try {
        return win.matchMedia('(pointer: coarse)').matches;
      } catch {
        return false;
      }
    })();
    const ev = (win as unknown as { DeviceOrientationEvent?: OrientationEventStatic }).DeviceOrientationEvent;
    // Chrome has requestPermission too (it says yes by itself), so only an Apple phone or iPad
    // (an iPad says "Macintosh", with touch points) counts as the one that asks.
    const nav = (win as unknown as { navigator?: Navigator }).navigator;
    const ua = nav?.userAgent ?? '';
    const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1);
    this.ios = touch && apple && typeof ev?.requestPermission === 'function';
    this.canTilt = this.ios;
    // Android and the rest never ask: yes from the start.
    this.answer = this.ios ? 'unknown' : 'granted';
    if (!touch || this.ios || !ev) return;
    // A quiet listener for one reading with a number, removed after 1.5 s (a computer that sends
    // one event with no numbers does not count).
    const stop = (): void => {
      win.removeEventListener('deviceorientation', look);
      win.clearTimeout(timer);
    };
    const look = (e: DeviceOrientationEvent): void => {
      if (typeof e.beta !== 'number' || !Number.isFinite(e.beta)) return;
      stop();
      this.canTilt = true;
      for (const f of this.seen) f();
    };
    win.addEventListener('deviceorientation', look);
    const timer = win.setTimeout(stop, TILT_DETECT_MS);
  }

  /** Called once the phone is found to tilt (the switch shows then). */
  onFound(f: () => void): void {
    this.seen.push(f);
  }

  /** Called after each answer from Apple's box. */
  onAnswer(f: (a: 'granted' | 'denied', from: TiltAskFrom) => void): void {
    this.answered.push(f);
  }

  /** Tilt can be read now (Android, or an iPhone that said yes this visit). */
  get ready(): boolean {
    return this.canTilt && this.answer === 'granted';
  }

  /** An iPhone that has not been asked this visit. */
  get needsAsk(): boolean {
    return this.ios && this.answer === 'unknown';
  }

  /**
   * Asks Apple's box. Call it only inside a tap handler (Safari refuses otherwise). Android: yes
   * at once, no box. Two taps while the box shows share the one answer.
   */
  ask(from: TiltAskFrom): Promise<'granted' | 'denied'> {
    if (!this.ios) return Promise.resolve('granted');
    if (this.asking) return this.asking;
    let call: Promise<string>;
    try {
      const ev = (window as unknown as { DeviceOrientationEvent?: OrientationEventStatic }).DeviceOrientationEvent;
      call = ev?.requestPermission?.() ?? Promise.resolve('denied');
    } catch {
      call = Promise.resolve('denied');
    }
    this.asking = call
      .then((r) => (r === 'granted' ? 'granted' : 'denied') as 'granted' | 'denied', () => 'denied' as const)
      .then((a) => {
        this.asking = null;
        this.answer = a;
        for (const f of this.answered) f(a, from);
        return a;
      });
    return this.asking;
  }
}
