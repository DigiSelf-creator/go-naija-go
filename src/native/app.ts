/**
 * Store app only (ST1a, docs/design.md ST0). main.ts loads this only in the app build
 * (`vite build --mode app`), so none of it, nor Capacitor itself, is in the web link's files.
 */
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import type { MenuScreen } from '../screens/menus';
import { WORDS } from '../screens/words';
import { backStep, playMode, safeEdge, type BackLabels } from './back';
import { LeaveAsk } from './leave-ask';

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Our own small Android plugin (android/app/src/main/java/com/coachnaz/gbese/GbeseScreenPlugin.java). */
interface GbeseScreen {
  setPlayMode(o: { awake: boolean; blockEdges: boolean }): Promise<void>;
  getInsets(): Promise<Insets>;
  addListener(event: 'insets', fn: (i: Insets) => void): Promise<PluginListenerHandle>;
}
const Screen = registerPlugin<GbeseScreen>('GbeseScreen');

export interface NativeHooks {
  /** A run is being played right now (not paused, not on a card). */
  running(): boolean;
  /** The menu screen showing, or null in a run. */
  screen(): MenuScreen;
  /** The run is in Go-Slow Hall. */
  hall(): boolean;
  /** S3f2: the run is a lane run. */
  lane(): boolean;
  /** A hero is saved on this phone. */
  heroSaved(): boolean;
  /** Pause the run and show Pause (does nothing outside a run). */
  pause(): void;
  /** Home to Lagos city from a run's card. */
  home(): void;
  /** The city screen (back from changing a saved hero). */
  city(): void;
  /** Write every save now (the same as when the app goes to the background). */
  save(): void;
  /** The safe edges changed: lay the game out again. */
  relayout(): void;
}

export interface NativeApp {
  /** Tell the app a new screen showed (starts the 0.4 s back guard, sets screen awake). */
  screenChanged(): void;
}

const LABELS: BackLabels = {
  introSkip: WORDS.intro.skip,
  settingsBack: WORDS.settings.back,
  creditsBack: WORDS.credits.back,
  streetsHome: WORDS.streets.home,
  wheelClose: WORDS.wheel.close,
  wheelBack: WORDS.wheel.back,
  takeHome: WORDS.cleared.takeHome,
};

/** Presses the first showing menu button with one of these labels. */
function press(labels: readonly string[]): void {
  const shown = [...document.querySelectorAll<HTMLButtonElement>('[data-ui] button')].filter((b) => b.getClientRects().length > 0);
  for (const label of labels) {
    const b = shown.find((x) => x.textContent?.trim() === label);
    if (b) {
      b.click();
      return;
    }
  }
}

/** ST0 part 4: the real safe edges from Android, plus 8 px, into the CSS the game already reads. */
function applyInsets(i: Insets, relayout: () => void): void {
  const root = document.documentElement.style;
  root.setProperty('--safe-top', `${safeEdge(i.top)}px`);
  root.setProperty('--safe-right', `${safeEdge(i.right)}px`);
  root.setProperty('--safe-bottom', `${safeEdge(i.bottom)}px`);
  root.setProperty('--safe-left', `${safeEdge(i.left)}px`);
  relayout();
}

export function startNativeApp(hooks: NativeHooks): NativeApp {
  let shownAt = performance.now();
  let mode = '';
  const syncMode = (): void => {
    const m = playMode(hooks.screen(), hooks.running());
    const key = `${m.awake}${m.blockEdges}`;
    if (key === mode) return;
    mode = key;
    Screen.setPlayMode(m).catch(() => {});
  };
  const changed = (): void => {
    shownAt = performance.now();
    // After the caller finishes: resume() shows the run first and clears `paused` just after.
    queueMicrotask(syncMode);
  };
  const ask = new LeaveAsk(document.body, {
    leave: () => {
      hooks.save();
      void App.exitApp();
    },
    changed,
  });

  void App.addListener('backButton', () => {
    const step = backStep(
      { askOpen: ask.open, sinceScreen: performance.now() - shownAt, screen: hooks.screen(), running: hooks.running(), hall: hooks.hall(), lane: hooks.lane(), heroSaved: hooks.heroSaved() },
      LABELS,
    );
    switch (step.kind) {
      case 'ignore':
        break;
      case 'pause':
        hooks.pause();
        break;
      case 'ask':
        ask.show(step.fromRun);
        break;
      case 'closeAsk':
        ask.close();
        break;
      case 'press':
        press(step.labels);
        break;
      case 'home':
        hooks.home();
        break;
      case 'city':
        hooks.city();
        break;
    }
  });
  // ST0 part 5: a call, the top shade or the home button pauses and saves, beside the page's
  // own hidden event (which also stops the music).
  void App.addListener('pause', () => {
    hooks.pause();
    hooks.save();
  });

  Screen.getInsets()
    .then((i) => applyInsets(i, hooks.relayout))
    .catch(() => {});
  Screen.addListener('insets', (i) => applyInsets(i, hooks.relayout)).catch(() => {});
  syncMode();

  // ST0 part 6: the splash goes once the first screen has drawn, with a 0.2 s fade (none with
  // reduced motion). Two frames: the first is drawn by the second.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: still ? 0 : 200 }).catch(() => {});
    }),
  );

  return { screenChanged: changed };
}
