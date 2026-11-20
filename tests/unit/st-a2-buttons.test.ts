/**
 * ST-A2 and ST-A3 (docs/style.md 1.2): the button recipe in src/screens/screens.css. Pins the
 * numbers of the recipe, the one main green, the status chip discs (the ST-A1 disc colours), and
 * that nothing that slides, fades or blinks carries the soft part of the lip (rule 5).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ICON_DISC } from '../../src/art/icons';

const CSS = readFileSync(new URL('../../src/screens/screens.css', import.meta.url), 'utf8');

/** The declarations of the first rule whose selector list is exactly `sel`. */
function rule(sel: string): string {
  const at = CSS.indexOf(`\n${sel} {`);
  expect(at, sel).toBeGreaterThanOrEqual(0);
  return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at));
}

const SOFT = '0 6px 8px rgba(58, 38, 24, 0.22)';
const LIP = `0 3px 0 #3a2618, ${SOFT}`;

describe('ST-A2 button recipe', () => {
  it('every menu button: cream pill, warm ink edge and lip, 44 px, bold 15 px', () => {
    const r = rule('.go,\n.minor,\n.chip');
    for (const d of ['min-height: 44px', 'min-width: 44px', 'border: 2.5px solid #3a2618', 'border-radius: 999px', 'background: #fff8e6', 'color: #3a2618', "font: 800 15px 'Trebuchet MS', Verdana, sans-serif", `box-shadow: ${LIP}`])
      expect(r, d).toContain(d);
  });

  it('the main action: green #0e7a3e, 52 px, white 16 px words with their shadow', () => {
    const r = rule('.go');
    for (const d of ['min-height: 52px', 'font-size: 16px', 'background: #0e7a3e', 'color: #fff', 'text-shadow: 0 1.5px 0 rgba(0, 0, 0, 0.35)']) expect(r, d).toContain(d);
    // A second big button on a card (Pause's "Start again") is cream: one green per screen.
    expect(rule('.go.secondary')).toContain('background: #fff8e6');
  });

  it('pressed: down 3 px onto the lip, no transition', () => {
    const r = rule('.go:active,\n.minor:active,\n.chip:active,\n.swatch:active');
    expect(r).toContain('transform: translateY(3px)');
    expect(r).toContain('box-shadow: 0 0 0 #3a2618');
    expect(r).not.toContain('transition');
  });

  it('icon discs: 30 px (36 on the big button), 2 px warm ink edge, icon 70 percent', () => {
    const r = rule('.ic');
    for (const d of ['width: 30px', 'height: 30px', 'border: 2px solid #3a2618', 'border-radius: 50%']) expect(r, d).toContain(d);
    expect(rule('.ic svg')).toContain('width: 21px');
    expect(rule('.go .ic')).toContain('width: 36px');
    expect(rule('.go .ic svg')).toContain('width: 25px');
  });

  it('a switch that is on: 3.5 px edge and a tick that is not read out', () => {
    expect(rule(".minor[aria-checked='true'],\n.minor[data-on='true']")).toContain('border-width: 3.5px');
    expect(rule(".minor[aria-checked='true']::after,\n.minor[data-on='true']::after")).toContain("content: '\\2713' / ''");
  });

  it('nothing that moves or fades has the soft lip (update banner, the intro Go, HUD chips)', () => {
    expect(rule('.update-btn')).toContain('box-shadow: 0 3px 0 #3a2618;');
    expect(rule('.intro-card.moving .intro-go')).toContain('box-shadow: 0 3px 0 #3a2618;');
    expect(rule('.hud-left > span')).toContain('box-shadow: 0 3px 0 #3a2618;');
    for (const s of ['.update-btn', '.intro-card.moving .intro-go', '.hud-left > span']) expect(rule(s), s).not.toContain(SOFT);
  });

  it('no blur or filter added for the look (style.md 1.5)', () => {
    expect(CSS).not.toMatch(/filter:\s*blur|backdrop-filter/);
  });
});

describe('ST-A3 status chips', () => {
  it('the city chips: the recipe, a 26 px disc in the ST-A1 colours', () => {
    const r = rule('.city-chip');
    for (const d of ['min-height: 34px', 'padding: 3px 13px 3px 3px', 'border: 2.5px solid #3a2618', 'border-radius: 999px', 'background: #fff8e6', `box-shadow: ${LIP}`]) expect(r, d).toContain(d);
    const disc = rule('.city-chip svg');
    expect(disc).toContain('width: 26px');
    expect(disc).toContain(`background: ${ICON_DISC.power}`);
    expect(rule('.chip-naira svg')).toContain(`background: ${ICON_DISC.naira}`);
    expect(rule('.chip-tech svg')).toContain(`background: ${ICON_DISC.tech}`);
  });

  it('the place box: 14 px corners, the warm edge and lip', () => {
    const r = rule('.screen .city-top h2');
    for (const d of ['border: 2.5px solid #3a2618', 'border-radius: 14px', 'background: #fff8e6', `box-shadow: ${LIP}`]) expect(r, d).toContain(d);
  });

  it('the run counters: cream chips no bigger than the old 32 px boxes', () => {
    const r = rule('.hud-left > span');
    for (const d of ['box-sizing: border-box', 'min-height: 32px', 'padding: 0 5.5px', 'border: 2.5px solid #3a2618', 'background: #fff8e6']) expect(r, d).toContain(d);
  });
});
