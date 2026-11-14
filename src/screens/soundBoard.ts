/**
 * ?sounds: a small test board (debug only, loaded only on that address) so Tp can hear every
 * code-made sound, with decision 62's goat "meeh" and birds' "hawk hawk" first. It keeps the
 * game's saved Sound switch (and has its own switch), the first-tap rule and the iPhone silent
 * switch (decision 22): all of that is in Sound itself.
 */
import { SOUND_NAMES, Sound, type SoundName } from '../engine/sound';
import { Music } from '../engine/music';
import { LANE_SOUND_NAMES, addLaneSounds } from '../art/lane-sounds';
import { createStore } from '../storage';
import { loadSettings } from '../game/save';

/** Shown first, with plain words. */
const FIRST: readonly [SoundName, string][] = [
  ['meeh', 'Goat: "meeh" (bumped, landed on or fed)'],
  ['hawk', 'Birds on street 3: "hawk hawk" (they take off)'],
  ['goatChew', 'Goat chewing a fufu ball'],
  ['birdFlap', 'Bird wings'],
];

/** Plain words for the lane run's sounds. */
const LANE_WORDS: Partial<Record<SoundName, string>> = {
  laneStepA: 'Lane: step (left foot)',
  laneStepB: 'Lane: step (right foot)',
  laneSwish: 'Lane: change lane (whoosh)',
  laneHop: 'Lane: jump (hop up)',
  laneLand: 'Lane: land (soft thud)',
  laneSlide: 'Lane: slide (cloth scuff)',
  laneTink0: 'Lane: coin "tink" 1',
  laneTink1: 'Lane: coin "tink" 2',
  laneTink2: 'Lane: coin "tink" 3',
  laneBulb: 'Lane: Power bulb "vmm-ding"',
  laneChip: 'Lane: Tech chip "blip-blip"',
  lanePok: 'Lane: burst (wooden "pok")',
  laneOof: 'Lane: stumble ("oof" and thump)',
  laneTunk: 'Lane: lamp switches off ("tunk")',
  laneTzing: 'Lane: shield used ("tzing")',
  laneBusStop: 'Lane: bus stop (horn and chime)',
  laneCaught: 'Lane: caught ("wom-wom-wom", torch click)',
};

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
  // S3f1: the lane run's sounds (design.md S3f0 part 17), its close hum and its tune
  addLaneSounds();
  const laneHead = document.createElement('h2');
  laneHead.textContent = 'Lane run';
  laneHead.style.cssText = 'font-size:18px;margin:18px 0 0';
  const lane = document.createElement('div');
  lane.style.cssText = grid.style.cssText;
  for (const name of LANE_SOUND_NAMES) lane.append(button(name, LANE_WORDS[name] ?? name, false));
  lane.append(button('meeh', 'Goat: "meeh" (the same goat sound)', false));
  const music = new Music();
  const toggleButton = (words: (on: boolean) => string, act: (on: boolean) => void): HTMLButtonElement => {
    let on = false;
    const b = document.createElement('button');
    b.textContent = words(on);
    b.style.cssText = 'min-height:48px;padding:8px;border-radius:10px;border:2px solid #f2b300;background:#1f3a27;color:#fff;font:inherit;text-align:left';
    b.addEventListener('click', () => {
      sound.unlock();
      if (sound.context) music.attach(sound.context);
      music.unlock();
      on = !on;
      act(on);
      b.textContent = words(on);
    });
    return b;
  };
  lane.append(
    toggleButton((on) => `Close hum (Blackout under 15 m): ${on ? 'on' : 'off'}`, (on) => sound.setCloseHum(on)),
    toggleButton((on) => `Lane tune: ${on ? 'playing' : 'off'}`, (on) => (on ? music.play('lane') : music.stop())),
    toggleButton((on) => `Blackout close (guitar drops out): ${on ? 'yes' : 'no'}`, (on) => music.setLayer('guitar', !on)),
  );
  toggle.style.cssText = 'min-height:44px;padding:8px 14px;border-radius:10px;border:2px solid #fff;background:none;color:#fff;font:inherit';
  box.append(h, note, toggle, grid, laneHead, lane);
  root.append(box);
}
