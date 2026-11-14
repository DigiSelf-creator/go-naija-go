import { button, h } from '../screens/dom';

/**
 * Exact words from docs/design.md ST0 part 3. They live here for now so the app code stays out
 * of src/screens while U1 is built there; ST0 build note 2 moves them to src/screens/words.ts.
 */
export const LEAVE_WORDS = {
  heading: 'Leave the game?',
  line: 'Your hero and your Lagos are saved on this phone.',
  street: 'This street starts again next time.',
  hall: 'The hall starts again next time.',
  stay: 'Keep playing',
  leave: 'Leave',
} as const;

/** The "Leave the game?" ask, over whatever screen is showing. Built from the menu styles. */
export class LeaveAsk {
  private readonly el: HTMLDivElement;
  private readonly runLine: HTMLParagraphElement;
  private readonly stayButton: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly hooks: { leave: () => void; changed: () => void },
  ) {
    this.stayButton = button(LEAVE_WORDS.stay, 'go', () => this.close());
    this.runLine = h('p', { hidden: true });
    this.el = h(
      'div',
      { class: 'screen leave-ask', 'data-ui': true, hidden: true, style: 'z-index: 30' },
      h(
        'div',
        { class: 'card narrow event', role: 'dialog', 'aria-modal': 'true', 'aria-label': LEAVE_WORDS.heading },
        h('h2', {}, LEAVE_WORDS.heading),
        h('p', {}, LEAVE_WORDS.line),
        this.runLine,
        // Never colour alone: "Keep playing" is the big filled button and comes first; "Leave" is
        // smaller, outline only (the menus' "minor" style).
        h('div', { class: 'actions' }, this.stayButton, h('div', { class: 'minor-row' }, button(LEAVE_WORDS.leave, 'minor', () => this.hooks.leave()))),
      ),
    );
    parent.append(this.el);
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(fromRun: 'street' | 'hall' | null): void {
    this.runLine.textContent = fromRun === 'hall' ? LEAVE_WORDS.hall : fromRun === 'street' ? LEAVE_WORDS.street : '';
    this.runLine.hidden = fromRun === null;
    this.el.hidden = false;
    // ST0 part 3 rule 3: the ask opens with "Keep playing" ready.
    this.stayButton.focus({ preventScroll: true });
    this.hooks.changed();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.hooks.changed();
  }
}
