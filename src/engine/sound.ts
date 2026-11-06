/**
 * Short sounds made in code with WebAudio: no sound files, nothing downloaded.
 * The audio starts only after the player's first tap or key (browsers require it),
 * and nothing plays while sound is off.
 */
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
  | 'arena';

/** [frequency Hz, length s, wave, slide-to Hz (optional), start delay s (optional)] */
type Note = readonly [number, number, OscillatorType, (number | undefined)?, number?];

const SOUNDS: Record<SoundName, readonly Note[]> = {
  jump: [[520, 0.08, 'square', 760]],
  airJump: [[700, 0.08, 'square', 980]],
  kobo: [[988, 0.05, 'square'], [1320, 0.07, 'square', undefined, 0.05]],
  food: [[523, 0.08, 'triangle'], [659, 0.08, 'triangle', undefined, 0.08], [784, 0.12, 'triangle', undefined, 0.16]],
  bounce: [[400, 0.1, 'square', 720]],
  // A friendly bleat: two wobbly notes.
  meeh: [[560, 0.09, 'sawtooth', 500], [540, 0.16, 'sawtooth', 470, 0.1]],
  smash: [[220, 0.1, 'square', 120], [880, 0.06, 'square', undefined, 0.08]],
  hit: [[180, 0.22, 'sawtooth', 90]],
  shieldPop: [[900, 0.05, 'triangle', 300], [300, 0.1, 'triangle', 200, 0.05]],
  fall: [[420, 0.4, 'triangle', 80]],
  checkpoint: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle', undefined, 0.1], [784, 0.18, 'triangle', undefined, 0.2]],
  tick: [[1200, 0.03, 'sine']],
  gameOver: [[392, 0.18, 'triangle'], [330, 0.18, 'triangle', undefined, 0.2], [262, 0.35, 'triangle', undefined, 0.4]],
  arena: [[262, 0.12, 'sawtooth'], [262, 0.2, 'sawtooth', 247, 0.16]],
};

export class Sound {
  private ac: AudioContext | null = null;
  enabled = true;

  /** Call from a tap or key handler. Creates or wakes the audio the first time. */
  unlock(): void {
    try {
      if (!this.ac) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ac = new Ctor();
      }
      if (this.ac.state === 'suspended') void this.ac.resume().catch(() => {});
    } catch {
      this.ac = null; // no sound, the game still runs
    }
  }

  get started(): boolean {
    return this.ac !== null;
  }

  play(name: SoundName): void {
    const ac = this.ac;
    if (!this.enabled || !ac || ac.state !== 'running') return;
    try {
      const now = ac.currentTime;
      for (const [freq, len, wave, slide, delay = 0] of SOUNDS[name]) {
        const t = now + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, t);
        if (slide) osc.frequency.linearRampToValueAtTime(slide, t + len);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + len + 0.02);
      }
    } catch {
      /* a sound that fails is never worth a crash */
    }
  }
}
