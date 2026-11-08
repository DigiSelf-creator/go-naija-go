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
    /** S2.3: shown at the top of the right column, once, for a slice 1 hero. */
    newNote: 'New! Pick male or female, and your age.',
    body: 'Male or female',
    age: 'Age',
    skin: 'Skin',
    hair: 'Hair',
    outfit: 'Outfit',
    start: 'Start running',
    savedNote: 'Your hero is saved on this phone only.',
    /** Spoken name of the live preview picture. */
    preview: 'Your hero',
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
    /** S2.10 HUD: the garri parcel icon and this word while it is carried (S2.5). */
    parcel: 'Parcel',
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
  /** S2.10 Street cleared (no parcel line until L2; "Streets" until N2 is "Home"). */
  cleared: {
    heading: 'Street cleared!',
    text: (name: string, kobo: number) => `${name} is fixed. You got ${kobo} kobo.`,
    next: 'Next street',
    toHall: 'Go to Go-Slow Hall',
    playAgain: 'Play again',
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
  /**
   * S2.2 Words in hints: what {forward}, {back}, {jump} and {down} become. The arrows are plain
   * characters (U+2192, U+2190, U+2193) in the hint's own font, never emoji.
   */
  hintMarks: {
    touch: { forward: '\u2192', back: '\u2190', jump: 'Jump', down: 'Go down' },
    keys: { forward: '\u2192', back: '\u2190', jump: 'Space', down: '\u2193' },
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
    /** S2.5 the well and its room. */
    roomArrive: 'A secret room! Grab the kobo. Stand under the rope to go back up.',
    parcel: 'Garri parcel! Your shield will be on when the Go-Slow Hall fight starts.',
    backOnStreet: 'Back on the street!',
  },
  /** S2.10 Well button: the words on it (touch, and a computer with keys), and its spoken name. */
  well: {
    down: 'Go down',
    downKeys: 'Go down (\u2193)',
    up: 'Go up',
    upKeys: 'Go up (Enter)',
  },
} as const;

/** S2.2 hint bar: a toast longer than this shows its short words on a narrow bar. */
export const SHORT_AT = 35;
/** S2.2 hint bar: a bar narrower than this (CSS px) takes the short words. */
export const NARROW_BAR = 160;

/** S2.2 "Short words for narrow bars": full toast words, then the short words. */
export const SHORT_TOAST: Readonly<Record<string, string>> = {
  'Roasted corn! You run faster for 6 seconds.': 'Roasted corn! You run faster!',
  'Garri, sugar and epa (groundnut)! A shield takes one hit for you.': 'Garri, sugar and epa! Shield on!',
  'Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through!': 'Amala, gbegiri and ewedu! Strong!',
  'General Go-Slow blocks the road! Jump onto the green light.': 'Go-Slow! Jump on the green light.',
  'A secret room! Grab the kobo. Stand under the rope to go back up.': 'Secret room! Use the rope to go up.',
  'Garri parcel! Your shield will be on when the Go-Slow Hall fight starts.': 'Garri parcel! Shield for the hall.',
  'Your garri parcel: the shield is on!': 'Garri parcel: shield on!',
  'General Go-Slow is jamming the hall! Jump onto the green light.': 'Go-Slow! Jump on the green light.',
  'PEEP! High honks fly high. Stay low on the floor.': 'PEEP! High honks: stay low.',
};

/** The words a toast shows in a bar this wide (CSS px): the short words on a narrow bar. */
export function barWords(words: string, barWidth: number): string {
  if (barWidth >= NARROW_BAR || words.length <= SHORT_AT) return words;
  return SHORT_TOAST[words] ?? words;
}

/** Fills the {forward} {back} {jump} {down} markers in a hint for touch or keys. */
export function hintWords(words: string, kind: 'touch' | 'keys'): string {
  const marks: Record<string, string> = WORDS.hintMarks[kind];
  return words.replace(/\{(forward|back|jump|down)\}/g, (_, k: string) => marks[k] ?? k);
}
