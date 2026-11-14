/**
 * ?sounds: a small test board (debug only, loaded only on that address) so Tp can hear every
 * code-made sound, with decision 62's goat "meeh" and birds' "hawk hawk" first. It keeps the
 * game's saved Sound switch (and has its own switch), the first-tap rule and the iPhone silent
 * switch (decision 22): all of that is in Sound itself.
 */
import { SOUND_NAMES, Sound, type SoundName } from '../engine/sound';
import { createStore } from '../storage';
import { loadSettings } from '../game/save';

/** Shown first, with plain words. */
const FIRST: readonly [SoundName, string][] = [
  ['meeh', 'Goat: "meeh" (bumped, landed on or fed)'],
  ['hawk', 'Birds on street 3: "hawk hawk" (they take off)'],
  ['goatChew', 'Goat chewing a fufu ball'],
  ['birdFlap', 'Bird wings'],
];

export function showSoundBoard(root: HTMLElement): void {
  const sound = new Sound();
  sound.enabled = loadSettings(createStore()).sound;
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;inset:0;overflow:auto;touch-action:pan-y;padding:16px;box-sizing:border-box;color:#fff;background:#0f1a12;font:16px "Trebuchet MS",Verdana,sans-serif;z-index:10;-webkit-user-select:none;user-select:none';
  const h = document.createElement('h1');
  h.textContent = 'Sounds';
  h.style.cssText = 'font-size:22px;margin:0 0 8px';
  const note = document.createElement('p');
  note.textContent = 'Tap a sound to hear it. On iPhone, turn off silent mode.';
  note.style.cssText = 'margin:0 0 12px;opacity:.85';
  const toggle = document.createElement('button');
  const label = (): string => `Sound: ${sound.enabled ? 'on' : 'off'}`;
  toggle.textContent = label();
  toggle.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    toggle.textContent = label();
  });
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:12px';
  const button = (name: SoundName, words: string, big: boolean): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = words;
    b.dataset.sound = name;
    b.style.cssText = `min-height:48px;padding:8px;border-radius:10px;border:2px solid ${big ? '#f2b300' : '#3c6b4a'};background:${big ? '#1f3a27' : '#16281b'};color:#fff;font:inherit;text-align:left;${big ? 'grid-column:span 2' : ''}`;
    b.addEventListener('click', () => {
      sound.unlock();
      sound.play(name);
    });
    return b;
  };
  for (const [name, words] of FIRST) grid.append(button(name, words, name === 'meeh' || name === 'hawk'));
  const firsts = new Set(FIRST.map(([n]) => n));
  for (const name of SOUND_NAMES) if (!firsts.has(name)) grid.append(button(name, name, false));
  toggle.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:10px;border:2px solid #fff;background:none;color:#fff;font:inherit';
  box.append(h, note, toggle, grid);
  root.append(box);
}
