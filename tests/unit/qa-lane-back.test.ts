/**
 * qa S3f2/S3f3: the Android back button in a lane run (docs/design.md ST0 part 3, S3f0 part 14):
 * mashing back never leaves; the lane run's own cards press "Take it home"; the ask has both lines.
 */
import { describe, expect, it } from 'vitest';
import { BACK_GUARD_MS, backStep, type BackLabels, type BackState } from '../../src/native/back';
import { LEAVE_WORDS } from '../../src/native/leave-ask';
import { WORDS } from '../../src/screens/words';

const L: BackLabels = {
  introSkip: WORDS.intro.skip,
  settingsBack: WORDS.settings.back,
  creditsBack: WORDS.credits.back,
  streetsHome: WORDS.streets.home,
  wheelClose: WORDS.wheel.close,
  wheelBack: WORDS.wheel.back,
  takeHome: WORDS.cleared.takeHome,
};
const at = (s: Partial<BackState>): BackState => ({ askOpen: false, sinceScreen: 1000, screen: null, running: false, hall: false, heroSaved: true, lane: true, ...s });

describe('qa: Android back in a lane run', () => {
  it('mashed in a lane run: pause, ask (lane lines), close, ask again; never leaves', () => {
    let screen: BackState['screen'] = null;
    let askOpen = false;
    let running = true;
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const step = backStep(at({ screen, askOpen, running }), L);
      seen.push(step.kind === 'ask' ? `ask:${step.fromRun}` : step.kind);
      if (step.kind === 'pause') {
        screen = 'pause';
        running = false;
      } else if (step.kind === 'ask') askOpen = true;
      else if (step.kind === 'closeAsk') askOpen = false;
    }
    expect(seen.slice(0, 4)).toEqual(['pause', 'ask:lane', 'closeAsk', 'ask:lane']);
    expect(seen.some((k) => k === 'home' || k === 'city' || k === 'press')).toBe(false);
  });

  it('during "3, 2, 1" back pauses (the run counts as running); too soon after a screen it is ignored', () => {
    expect(backStep(at({ running: true }), L)).toEqual({ kind: 'pause' });
    expect(backStep(at({ running: true, sinceScreen: BACK_GUARD_MS - 1 }), L)).toEqual({ kind: 'ignore' });
  });

  it('on a lane card (bus stop, caught) back presses "Take it home", which is the cards\' own words', () => {
    expect(backStep(at({}), L)).toEqual({ kind: 'press', labels: [WORDS.lane.takeHome] });
    expect(WORDS.cleared.takeHome).toBe(WORDS.lane.takeHome);
  });

  it('the ask from a lane run has "This run starts again next time." and "You keep what you picked up."', () => {
    expect(backStep(at({ screen: 'pause' }), L)).toEqual({ kind: 'ask', fromRun: 'lane' });
    expect(LEAVE_WORDS.lane).toBe('This run starts again next time.');
    expect(LEAVE_WORDS.laneKeep).toBe('You keep what you picked up.');
  });
});
