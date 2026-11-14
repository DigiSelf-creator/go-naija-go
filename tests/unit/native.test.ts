import { describe, expect, it } from 'vitest';
import { isNativeApp } from '../../src/native/is-native';
import { BACK_GUARD_MS, backStep, playMode, safeEdge, type BackLabels, type BackState } from '../../src/native/back';
import { LEAVE_WORDS } from '../../src/native/leave-ask';
import { WORDS } from '../../src/screens/words';

describe('isNativeApp (ST1a)', () => {
  it('is false on the web: no Capacitor on the page', () => {
    expect(isNativeApp({})).toBe(false);
    expect(isNativeApp()).toBe(false);
  });

  it('is true only when Capacitor says it runs on a phone', () => {
    expect(isNativeApp({ Capacitor: { isNativePlatform: () => true } })).toBe(true);
    expect(isNativeApp({ Capacitor: { isNativePlatform: () => false } })).toBe(false);
    expect(isNativeApp({ Capacitor: {} })).toBe(false);
  });

  it('is false, never an error, when the check throws', () => {
    const broken = {
      isNativePlatform: (): boolean => {
        throw new Error('broken bridge');
      },
    };
    expect(isNativeApp({ Capacitor: broken })).toBe(false);
  });
});

const L: BackLabels = {
  introSkip: WORDS.intro.skip,
  settingsBack: WORDS.settings.back,
  creditsBack: WORDS.credits.back,
  streetsHome: WORDS.streets.home,
  wheelClose: WORDS.wheel.close,
  wheelBack: WORDS.wheel.back,
  takeHome: WORDS.cleared.takeHome,
};
const at = (s: Partial<BackState>): BackState => ({ askOpen: false, sinceScreen: 1000, screen: null, running: false, hall: false, heroSaved: true, ...s });

describe('Android back button (ST0 part 3)', () => {
  it('in a run pauses; on Pause asks with the run line; on the ask closes it', () => {
    expect(backStep(at({ running: true }), L)).toEqual({ kind: 'pause' });
    expect(backStep(at({ screen: 'pause' }), L)).toEqual({ kind: 'ask', fromRun: 'street' });
    expect(backStep(at({ screen: 'pause', hall: true }), L)).toEqual({ kind: 'ask', fromRun: 'hall' });
    expect(backStep(at({ screen: 'pause', askOpen: true }), L)).toEqual({ kind: 'closeAsk' });
  });

  it('ignores presses in the first 0.4 s of a new screen or of the ask', () => {
    expect(backStep(at({ running: true, sinceScreen: BACK_GUARD_MS - 1 }), L)).toEqual({ kind: 'ignore' });
    expect(backStep(at({ askOpen: true, sinceScreen: 10 }), L)).toEqual({ kind: 'ignore' });
    expect(BACK_GUARD_MS).toBe(400);
  });

  it('pressed again and again in a run never leaves: pause, ask, pause again', () => {
    // A child mashing back: each press lands after the guard on the screen it opened.
    let screen: BackState['screen'] = null;
    let askOpen = false;
    let running = true;
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const step = backStep(at({ screen, askOpen, running }), L);
      seen.push(step.kind);
      if (step.kind === 'pause') {
        screen = 'pause';
        running = false;
      } else if (step.kind === 'ask') askOpen = true;
      else if (step.kind === 'closeAsk') askOpen = false;
    }
    expect(seen.slice(0, 4)).toEqual(['pause', 'ask', 'closeAsk', 'ask']);
    expect(seen).not.toContain('home');
  });

  it('follows the per-screen table', () => {
    expect(backStep(at({ screen: 'city' }), L)).toEqual({ kind: 'ask', fromRun: null });
    expect(backStep(at({ screen: 'title' }), L)).toEqual({ kind: 'ask', fromRun: null });
    expect(backStep(at({ screen: 'intro' }), L)).toEqual({ kind: 'press', labels: ['Skip'] });
    expect(backStep(at({ screen: 'settings' }), L)).toEqual({ kind: 'press', labels: ['Back'] });
    expect(backStep(at({ screen: 'credits' }), L)).toEqual({ kind: 'press', labels: ['Back'] });
    expect(backStep(at({ screen: 'streets' }), L)).toEqual({ kind: 'press', labels: ['Home'] });
    expect(backStep(at({ screen: 'wheel' }), L)).toEqual({ kind: 'press', labels: ['Close', 'Back'] });
    expect(backStep(at({ screen: 'builder', heroSaved: true }), L)).toEqual({ kind: 'city' });
    expect(backStep(at({ screen: 'builder', heroSaved: false }), L)).toEqual({ kind: 'ask', fromRun: null });
    expect(backStep(at({ screen: 'cleared' }), L)).toEqual({ kind: 'press', labels: [WORDS.cleared.takeHome] });
    expect(backStep(at({ screen: 'gameover' }), L)).toEqual({ kind: 'home' });
    expect(backStep(at({ screen: 'win' }), L)).toEqual({ kind: 'home' });
    // Between a run's end and its card: wait for the card.
    expect(backStep(at({ screen: null, running: false }), L)).toEqual({ kind: 'ignore' });
  });

  it('uses the exact ST0 words for the ask', () => {
    expect(LEAVE_WORDS.heading).toBe('Leave the game?');
    expect(LEAVE_WORDS.line).toBe('Your hero and your Lagos are saved on this phone.');
    expect(LEAVE_WORDS.street).toBe('This street starts again next time.');
    expect(LEAVE_WORDS.hall).toBe('The hall starts again next time.');
    expect([LEAVE_WORDS.stay, LEAVE_WORDS.leave]).toEqual(['Keep playing', 'Leave']);
  });
});

describe('Screen awake and safe edges (ST0 parts 4 and 5)', () => {
  it('keeps the screen awake in a run and the intro only; blocks edge swipes in a run only', () => {
    expect(playMode(null, true)).toEqual({ awake: true, blockEdges: true });
    expect(playMode('intro', false)).toEqual({ awake: true, blockEdges: false });
    for (const s of ['pause', 'city', 'title', 'settings'] as const) expect(playMode(s, false)).toEqual({ awake: false, blockEdges: false });
  });

  it('adds 8 px to an edge with something in the way, and leaves a clear edge at 0', () => {
    expect(safeEdge(0)).toBe(0);
    expect(safeEdge(32)).toBe(40);
    expect(safeEdge(31.2)).toBe(40);
  });
});
