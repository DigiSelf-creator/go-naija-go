import { h } from './dom';
import { WORDS } from './words';

/** How long the banner takes to fade out (screens.css .update-banner); 0 with reduced motion. */
export const BANNER_FADE_MS = 200;

/**
 * U1: "New version ready. Tap to update." A small bar at the top of any screen. Its region is
 * role=status, so screen readers hear it when the button is put in. While it shows, the body has
 * the class `has-update` and every menu screen starts below it, so it covers no button.
 */
export class UpdateBanner {
  readonly el: HTMLElement;
  private readonly btn: HTMLButtonElement;
  private on = false;
  private gone: number | undefined;

  constructor(
    parent: HTMLElement,
    onTap: () => void,
    private readonly still: () => boolean = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {
    // data-ui: a tap on it is never a jump.
    this.el = h('div', { class: 'update-banner', role: 'status', 'aria-live': 'polite', 'data-ui': true });
    this.btn = h('button', { type: 'button', class: 'update-btn' }, WORDS.update.ready);
    this.btn.addEventListener('click', onTap);
    parent.append(this.el);
  }

  get shown(): boolean {
    return this.on;
  }

  set(show: boolean): void {
    if (show === this.on) return;
    this.on = show;
    window.clearTimeout(this.gone);
    document.body.classList.toggle('has-update', show);
    // The full screens (intro, city, wheel) move below the banner: let them fit themselves again.
    window.dispatchEvent(new Event('resize'));
    if (show) {
      if (!this.btn.isConnected) this.el.append(this.btn);
      // Next frame, so the fade in runs (CSS turns it off with reduced motion).
      requestAnimationFrame(() => {
        if (this.on) this.el.classList.add('show');
      });
      return;
    }
    const wasFocused = document.activeElement === this.btn;
    this.el.classList.remove('show');
    if (wasFocused) this.btn.blur();
    // Reduced motion: no close animation, it goes at once.
    if (this.still()) this.btn.remove();
    else this.gone = window.setTimeout(() => this.btn.remove(), BANNER_FADE_MS);
  }
}
