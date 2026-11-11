/**
 * N2: the S2.10 words (cleared line, Win line, Pause, game over), P and Escape (po M4 bug 3),
 * and the HUD buttons that act on the press (po L4 note 2: second finger).
 */
import { describe, expect, it } from 'vitest';
import { PAUSE_KEYS, pauseKeyAction } from '../../src/engine/input';
import { pressOnDown, WELL_CLICK_GUARD_MS } from '../../src/screens/controls';
import { WORDS } from '../../src/screens/words';
import street1 from '../../src/data/levels/lagos-1.json';
import street2 from '../../src/data/levels/lagos-2.json';
import street3 from '../../src/data/levels/lagos-3.json';

describe('S2.10 words', () => {
  it("the street names are Tp's (8 Nov 2026)", () => {
    expect([street1.name, street2.name, street3.name]).toEqual(['Alausa', 'Computer Village', 'Ikeja']);
  });

  it("the cleared line is Tp's line, with the name and the money (N2: whole kobo shown as Naira)", () => {
    expect(WORDS.cleared.text('Computer Village', 1130)).toBe('Computer Village is moving again, thanks to you! You got \u20a611.30.');
    expect(WORDS.cleared.text('Ikeja', 90)).toBe('Ikeja is moving again, thanks to you! You got 90 kobo.');
    expect(WORDS.cleared.parcel).toBe('Your garri parcel is saved for Go-Slow Hall.');
    expect([WORDS.cleared.playAgain, WORDS.cleared.streets]).toEqual(['Play again', 'Streets']);
    expect('home' in WORDS.cleared).toBe(false);
  });

  it('the Win line: lives left, "1 life left" for one, no kobo', () => {
    expect(WORDS.win.text(1)).toBe('You cleared General Go-Slow with 1 life left.');
    expect(WORDS.win.text(2)).toBe('You cleared General Go-Slow with 2 lives left.');
    expect(WORDS.win.text(5)).toBe('You cleared General Go-Slow with 5 lives left.');
    expect(WORDS.win.text(3)).not.toMatch(/kobo/);
    expect(WORDS.win.cog(1)).toBe("Lagos's cog is turning: 1 of 37.");
    expect(WORDS.win.wheel).toBe("See Nigeria's wheel");
    expect([WORDS.win.playAgain, WORDS.win.streets]).toEqual(['Play again', 'Streets']);
  });

  it('Pause and game over words', () => {
    const p = WORDS.pause;
    expect([p.heading, p.keepPlaying, p.restart, p.streets, p.home]).toEqual(['Paused', 'Keep playing', 'Start again', 'Streets', 'Home']);
    // N2: "You got 90 kobo. The street is still here. Try again!"
    expect(WORDS.gameOver.text(90)).toBe('You got 90 kobo. The street is still here. Try again!');
    expect([WORDS.title.musicOn, WORDS.title.musicOff]).toEqual(['Music: on', 'Music: off']);
    expect(WORDS.title.start).toBe('Play');
    // City choice 10 (Tp, 9 Nov 2026).
    expect(WORDS.title.tagline).toBe('Build up Lagos. Get Nigeria working.');
    expect(WORDS.toast.parcel).toBe('Garri parcel! Shield for the hall.');
  });
});

describe('P and Escape (S2.2 Keys, po M4 bug 3)', () => {
  it('pause in play, resume from Pause', () => {
    for (const code of ['KeyP', 'Escape']) {
      expect(PAUSE_KEYS.has(code)).toBe(true);
      expect(pauseKeyAction(code, false, null, true)).toBe('pause');
      expect(pauseKeyAction(code, false, 'pause', false)).toBe('resume');
    }
  });

  it('nothing in the finish or on any other card; key repeat does nothing', () => {
    // The street end and the hall's finish: not playing.
    expect(pauseKeyAction('KeyP', false, null, false)).toBeNull();
    for (const card of ['title', 'builder', 'credits', 'streets', 'wheel', 'gameover', 'cleared', 'win']) {
      expect(pauseKeyAction('KeyP', false, card, false)).toBeNull();
      expect(pauseKeyAction('Escape', false, card, true)).toBeNull();
    }
    expect(pauseKeyAction('KeyP', true, null, true)).toBeNull();
    expect(pauseKeyAction('KeyP', true, 'pause', false)).toBeNull();
    expect(pauseKeyAction('KeyM', false, null, true)).toBeNull();
    expect(pauseKeyAction('Space', false, 'pause', false)).toBeNull();
  });
});

/** An Event with the fields pressOnDown reads. */
function ev(type: string, extra: Record<string, unknown> = {}): Event {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, extra);
  return e;
}

describe('Pause and Sound act on the press (po L4 note 2)', () => {
  function setup() {
    let now = 1000;
    const realNow = performance.now.bind(performance);
    (performance as { now: () => number }).now = () => now;
    const win = new EventTarget() as unknown as Window;
    const el = new EventTarget() as unknown as HTMLElement;
    const other = new EventTarget();
    let presses = 0;
    pressOnDown(el, () => presses++, win);
    // A click on another button: what is under the finger once Pause opens.
    let otherClicks = 0;
    other.addEventListener('click', () => otherClicks++);
    const clickOn = (target: EventTarget, detail: number): void => {
      // Capture on the window runs first, as in a page.
      const e = ev('click', { detail });
      let stopped = false;
      (e as { stopImmediatePropagation: () => void }).stopImmediatePropagation = () => (stopped = true);
      win.dispatchEvent(e);
      if (!stopped) target.dispatchEvent(e);
    };
    return {
      el,
      other,
      presses: () => presses,
      otherClicks: () => otherClicks,
      clickOn,
      at: (t: number) => (now = t),
      done: () => ((performance as { now: () => number }).now = realNow),
    };
  }

  it('a second finger: pointerdown alone does it once (Chrome sends no click)', () => {
    const t = setup();
    const down = ev('pointerdown', { pointerType: 'touch', button: 0 });
    t.el.dispatchEvent(down);
    expect(t.presses()).toBe(1);
    expect(down.defaultPrevented).toBe(true);
    t.done();
  });

  it("one press does one thing: the touch's own click does not press again", () => {
    const t = setup();
    t.el.dispatchEvent(ev('pointerdown', { pointerType: 'touch', button: 0 }));
    t.at(1100);
    t.clickOn(t.el, 1);
    expect(t.presses()).toBe(1);
    t.done();
  });

  it('the press that opens Pause never presses what appears under it', () => {
    const t = setup();
    t.el.dispatchEvent(ev('pointerdown', { pointerType: 'touch', button: 0 }));
    t.at(1000 + WELL_CLICK_GUARD_MS - 1);
    t.clickOn(t.other, 1);
    expect(t.otherClicks()).toBe(0);
    t.at(1000 + WELL_CLICK_GUARD_MS + 1);
    t.clickOn(t.other, 1);
    expect(t.otherClicks()).toBe(1); // later taps work
    t.done();
  });

  it('keys and screen readers (a click with detail 0) still work, once each', () => {
    const t = setup();
    t.clickOn(t.el, 0);
    expect(t.presses()).toBe(1);
    // Right mouse button does nothing.
    t.el.dispatchEvent(ev('pointerdown', { pointerType: 'mouse', button: 2 }));
    expect(t.presses()).toBe(1);
    // A key click is never blocked, even right after a press.
    t.el.dispatchEvent(ev('pointerdown', { pointerType: 'mouse', button: 0 }));
    t.clickOn(t.other, 0);
    expect(t.presses()).toBe(2);
    expect(t.otherClicks()).toBe(1);
    t.done();
  });
});
