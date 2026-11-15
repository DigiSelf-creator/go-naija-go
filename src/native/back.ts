import type { MenuScreen } from '../screens/menus';

/**
 * The Android back button in the store app (docs/design.md ST0 part 3). It never closes the game
 * by itself: in a run it pauses, from Pause it asks "Leave the game?", and only "Leave" closes.
 */
export type BackStep =
  /** Too soon after a new screen or the ask opened (ST0 part 3 rule 2): do nothing. */
  | { kind: 'ignore' }
  /** Pause the run, the same as the Pause button. */
  | { kind: 'pause' }
  /** Open the "Leave the game?" ask. `fromRun` adds the "starts again next time" line. */
  | { kind: 'ask'; fromRun: RunKind | null }
  /** Close the ask: the same as "Keep playing". */
  | { kind: 'closeAsk' }
  /** Press that screen's own button: the first of these labels that is showing. */
  | { kind: 'press'; labels: readonly string[] }
  /** Home to Lagos city (out of lives, Win). Anything already kept stays kept. */
  | { kind: 'home' }
  /** Back from changing a saved hero: the old look stays. */
  | { kind: 'city' };

/** Which run the ask's "starts again next time" line is for. */
export type RunKind = 'street' | 'hall' | 'lane';

/** Back presses this soon after a new screen (or the ask) are ignored, the same as taps. */
export const BACK_GUARD_MS = 400;

export interface BackState {
  /** The "Leave the game?" ask is showing. */
  askOpen: boolean;
  /** Milliseconds since the current screen (or the ask) opened or closed. */
  sinceScreen: number;
  /** The menu screen showing, or null in a run. */
  screen: MenuScreen;
  /** A run is being played right now (not paused, not on a card). */
  running: boolean;
  /** The run is (or was, on Pause) in Go-Slow Hall. */
  hall: boolean;
  /** S3f2: the run is (or was, on Pause) a lane run. */
  lane?: boolean;
  /** A hero is saved on this phone (the builder is not the first-time one). */
  heroSaved: boolean;
  /** O1b2: a card shows over the screen (Travel, the Ogun download card, the arrival card). */
  card?: boolean;
}

/** The labels a screen's own button uses (from src/screens/words.ts, so they stay in step). */
export interface BackLabels {
  introSkip: string;
  settingsBack: string;
  creditsBack: string;
  /** S3e0 part 8: the road's "Home", and its stop card's "Back" (pressed first while a card shows). */
  roadHome: string;
  roadBack: string;
  wheelClose: string;
  wheelBack: string;
  takeHome: string;
  /** S3f0 part 25.1: the tilt offer card's "No thanks" (Android back counts as it). */
  tiltNo?: string;
  /** O1b2: a card's own way out, first one showing: Travel's "Back", "Not now", "OK", "Let's go". */
  cardOut?: readonly string[];
  /** O1b2: the bus ride's "Skip". */
  rideSkip?: string;
}

export function backStep(s: BackState, labels: BackLabels): BackStep {
  if (s.sinceScreen < BACK_GUARD_MS) return { kind: 'ignore' };
  if (s.askOpen) return { kind: 'closeAsk' };
  if (s.card) return { kind: 'press', labels: labels.cardOut ?? [] };
  switch (s.screen) {
    case null:
      // Between a run's end and its card, back waits for the card. A lane run's own cards
      // (the bus stop, caught) take it home, the same as their "Take it home".
      if (s.running) return { kind: 'pause' };
      return s.lane ? { kind: 'press', labels: labels.tiltNo ? [labels.takeHome, labels.tiltNo] : [labels.takeHome] } : { kind: 'ignore' };
    case 'pause':
      return { kind: 'ask', fromRun: s.lane ? 'lane' : s.hall ? 'hall' : 'street' };
    case 'title':
    case 'city':
    case 'ogun':
      return { kind: 'ask', fromRun: null };
    case 'ride':
      return { kind: 'press', labels: labels.rideSkip ? [labels.rideSkip] : [] };
    case 'intro':
      return { kind: 'press', labels: [labels.introSkip] };
    case 'settings':
      return { kind: 'press', labels: [labels.settingsBack] };
    case 'credits':
      return { kind: 'press', labels: [labels.creditsBack] };
    case 'road':
      return { kind: 'press', labels: [labels.roadBack, labels.roadHome] };
    case 'wheel':
      // The "All names" list first (Close), else the wheel's own Back.
      return { kind: 'press', labels: [labels.wheelClose, labels.wheelBack] };
    case 'builder':
      return s.heroSaved ? { kind: 'city' } : { kind: 'ask', fromRun: null };
    case 'cleared':
      return { kind: 'press', labels: [labels.takeHome] };
    case 'gameover':
    case 'win':
      return { kind: 'home' };
  }
}

/**
 * Keep the screen awake in a run and the moving intro only (ST0 part 5 rule 6). The edge swipe
 * is blocked over the play buttons in a run only (ST0 part 3).
 */
export function playMode(screen: MenuScreen, running: boolean): { awake: boolean; blockEdges: boolean } {
  const inRun = screen === null && running;
  return { awake: inRun || screen === 'intro', blockEdges: inRun };
}

/**
 * ST0 part 4: inside the safe area plus 8 px. An edge with nothing in the way (0) stays 0, so a
 * phone with no notch looks just like the web link.
 */
export function safeEdge(inset: number): number {
  return inset > 0 ? Math.ceil(inset) + 8 : 0;
}
