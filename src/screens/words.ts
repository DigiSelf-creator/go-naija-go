/**
 * Every word a player sees on the menu screens, exactly as in docs/design.md
 * (Hero builder, Screens), approved by po. Change words there first, then here.
 */
/** The game name is one setting (docs/questions.md Q1). */
export const GAME_NAME = 'Gidi Dash';

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
    lines: ['Made by Tp and team.', 'Every picture and sound is our own.'],
    back: 'Back',
  },
  closingLine: 'Remember: a wrong premise often leads to a misleading conclusion.',
} as const;
