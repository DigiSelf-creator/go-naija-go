/** Registers the service worker (built files only) so the game plays offline after the first visit. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative URL: works at the site root and under a GitHub Pages sub-path.
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline play is a bonus; the game still runs without it. */
    });
  });
}
