/**
 * Every word a player sees on the menu screens, exactly as in docs/design.md
 * (Hero builder, Screens), approved by po. Change words there first, then here.
 */
/** The game name is one setting (docs/questions.md Q1). */
export const GAME_NAME = 'Gbese!';

export const WORDS = {
  title: {
    tagline: 'Run your street. Clear the jam.',
    makeHero: 'Make your hero',
    start: 'Start running',
    changeHero: 'Change hero',
    credits: 'Credits',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    gentle: 'Gentle mode: 5 lives instead of 3',
    /** S2.2 How to play: touch words when the phone buttons show, else the key words. */
    howTo: 'Press the arrows to walk. Keep holding to run. Press Jump to jump. Press it again in the air to jump again. Hold it to jump higher.',
    howToKeys: 'Left and right arrows walk. Keep holding to run. Space jumps. Press it again in the air to jump again. Hold it to jump higher.',
  },
  builder: {
    heading: 'Make your hero',
    skin: 'Skin',
    hair: 'Hair',
    outfit: 'Outfit',
    start: 'Start running',
    savedNote: 'Your hero is saved on this phone only.',
  },
  credits: {
    heading: 'Credits',
    lines: ['Made by CoachNaz.', 'Every picture and sound is our own.'],
    back: 'Back',
  },
  hud: {
    lives: (n: number) => `♥ ${n}`,
    kobo: (n: number) => `Kobo ${n}`,
    fast: (s: number) => `Fast ${s}`,
    shield: 'Shield',
    strong: (s: number) => `Strong ${s}`,
    pause: 'Pause',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
  },
  pause: {
    heading: 'Paused',
    keepRunning: 'Keep running',
    restart: 'Start the level again',
    home: 'Home',
  },
  gameOver: {
    heading: 'Out of lives',
    text: (kobo: number) => `You got ${kobo} kobo. The road is still here. Try again!`,
    playAgain: 'Play again',
    gentleOffer: 'Want more tries? Gentle mode gives you 5 lives.',
    home: 'Home',
  },
  win: {
    heading: 'Road cleared!',
    text: (kobo: number, lives: number) =>
      `You beat General Go-Slow with ${kobo} kobo and ${lives} ${lives === 1 ? 'life' : 'lives'} left.`,
    more: 'More roads are coming soon.',
    playAgain: 'Play again',
    home: 'Home',
  },
  /** S2.2 Words in hints: what {forward}, {back}, {jump} and {down} become. */
  hintMarks: {
    touch: { forward: 'the forward arrow', back: 'the back arrow', jump: 'Jump', down: 'Go down' },
    keys: { forward: 'the right arrow', back: 'the left arrow', jump: 'Space', down: 'the down arrow' },
  },
  /** Toasts in the run: docs/design.md Power-ups, Level 1. */
  toast: {
    corn: 'Roasted corn! You run faster for 6 seconds.',
    garri: 'Garri, sugar and epa (groundnut)! A shield takes one hit for you.',
    amala: 'Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through!',
    cornWearingOff: 'Corn is wearing off!',
    amalaWearingOff: 'Amala is wearing off!',
    shieldUsed: 'Shield used up!',
    bossArrives: 'General Go-Slow blocks the road! Jump onto the green light.',
    greenLight: (left: number) => `Green light! ${left} more.`,
    roadFree: 'Green light! The road is free!',
  },
} as const;

/** Fills the {forward} {back} {jump} {down} markers in a hint for touch or keys. */
export function hintWords(words: string, kind: 'touch' | 'keys'): string {
  const marks: Record<string, string> = WORDS.hintMarks[kind];
  return words.replace(/\{(forward|back|jump|down)\}/g, (_, k: string) => marks[k] ?? k);
}
