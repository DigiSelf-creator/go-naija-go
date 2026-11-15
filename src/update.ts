/**
 * U1 (decision 52): "New version ready. Tap to update."
 *
 * The service worker answers page loads from its cache, so after a deploy the open game is still
 * the old one. When a new worker takes over while the page is open, or waits to, the game offers
 * one tap to load the new version. Never on a first visit (no old worker), never in a run.
 * Talks only to our own service worker: no other network requests.
 */

/** The bits of a ServiceWorkerRegistration this file uses (a fake one in unit tests). */
export interface RegistrationLike {
  readonly waiting: { postMessage(msg: unknown): void } | null;
  readonly installing: EventTarget & { readonly state: string } | null;
  update(): Promise<unknown>;
  addEventListener(type: 'updatefound', fn: () => void): void;
}

/** The bits of navigator.serviceWorker this file uses. */
export interface ContainerLike {
  readonly controller: unknown;
  addEventListener(type: 'controllerchange', fn: () => void): void;
}

/** What sw.js listens for: a waiting worker takes over at once. */
export const SKIP_WAITING = { type: 'skip-waiting' } as const;

/** If a waiting worker does not take over in this time after the tap, reload anyway. */
export const TAKE_OVER_MS = 3000;

/**
 * Knows whether a new version is ready. A first visit has no controlling worker; its own new
 * worker taking control (clients.claim) is not an update. Any later take-over is.
 */
export class UpdateState {
  private controlled: boolean;
  private isReady = false;

  constructor(controlledAtLoad: boolean) {
    this.controlled = controlledAtLoad;
  }

  get ready(): boolean {
    return this.isReady;
  }

  /** navigator.serviceWorker's controllerchange: a new worker controls this page. */
  controllerChanged(): void {
    if (this.controlled) this.isReady = true;
    this.controlled = true;
  }

  /** A new worker is installed and waiting (or about to activate) while an old one controls the page. */
  workerWaiting(hasController: boolean): void {
    if (hasController && this.controlled) this.isReady = true;
  }
}

/** The banner shows when a new version is ready and no run is being played (paused or a card is fine). */
export function bannerShows(ready: boolean, inRun: boolean): boolean {
  return ready && !inRun;
}

export interface UpdateWatchOptions {
  container: ContainerLike;
  registration: Promise<RegistrationLike | undefined>;
  /** Called whenever the update becomes ready. */
  onReady: () => void;
  /** Reloads the page (location.reload). */
  reload: () => void;
  /** Calls fn when the page becomes visible again. */
  onVisible: (fn: () => void) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
}

/** Wires UpdateState to the real (or a fake) service worker container. */
export class UpdateWatch {
  readonly state: UpdateState;
  private reg: RegistrationLike | undefined;
  private reloading = false;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;

  constructor(private readonly o: UpdateWatchOptions) {
    this.state = new UpdateState(!!o.container.controller);
    this.setTimer = o.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms));
    o.container.addEventListener('controllerchange', () => {
      if (this.reloading) {
        this.o.reload();
        return;
      }
      this.mark(() => this.state.controllerChanged());
    });
    void o.registration.then(
      (reg) => {
        if (!reg) return;
        this.reg = reg;
        if (reg.waiting) this.mark(() => this.state.workerWaiting(!!o.container.controller));
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', () => {
            if (w.state === 'installed') this.mark(() => this.state.workerWaiting(!!o.container.controller));
          });
        });
        // Look for a new sw.js on every open, and each time the game comes back to the front, so
        // the game does not depend on the browser's own check. Only our own sw.js. Chromium runs
        // a check made without a tap at most about once a minute. Not on a first visit (no old
        // worker: nothing to update from) and not while a worker is installing or waiting (the
        // update is already here; a queued check would only hold up the next open's register()).
        if (o.container.controller && !reg.installing && !reg.waiting) this.check();
        o.onVisible(() => this.check());
      },
      () => {
        /* No service worker: no updates to offer. */
      },
    );
  }

  /** Asks the browser to fetch our sw.js again. Offline it fails quietly. */
  check(): void {
    this.reg?.update().catch(() => {});
  }

  /** The tap: load the new version. A waiting worker is asked to take over first. */
  apply(): void {
    if (this.reloading) return;
    const waiting = this.reg?.waiting;
    if (waiting) {
      this.reloading = true;
      waiting.postMessage(SKIP_WAITING);
      this.setTimer(() => this.o.reload(), TAKE_OVER_MS);
      return;
    }
    this.reloading = true;
    this.o.reload();
  }

  private mark(change: () => void): void {
    const was = this.state.ready;
    change();
    if (this.state.ready && !was) this.o.onReady();
  }
}
