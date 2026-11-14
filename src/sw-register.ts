import { UpdateWatch } from './update';

/**
 * Registers the service worker (built files only) so the game plays offline after the first visit.
 * U1: calls `onReady` when a new version has taken over (or waits to) while the page is open,
 * and returns the watch whose `apply()` loads it. Null when there is no service worker.
 */
export function registerServiceWorker(onReady: () => void = () => {}): UpdateWatch | null {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  const sw = navigator.serviceWorker;
  const registration = new Promise<ServiceWorkerRegistration | undefined>((done) => {
    const register = (): void => {
      // Relative URL: works at the site root and under a GitHub Pages sub-path.
      sw.register('./sw.js').then(done, () => {
        /* Offline play is a bonus; the game still runs without it. */
        done(undefined);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  });
  return new UpdateWatch({
    container: sw,
    registration,
    onReady,
    reload: () => location.reload(),
    onVisible: (fn) =>
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) fn();
      }),
  });
}
