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
    howTo: 'Tap to jump. Tap again in the air to jump again. Hold to jump higher. You run by yourself.',
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
