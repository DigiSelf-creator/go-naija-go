/**
 * Every word a player sees on the menu screens, exactly as in docs/design.md
 * (Hero builder, Screens), approved by po. Change words there first, then here.
 */
import { formatMoney } from '../game/money';

/** The game name is one setting (docs/questions.md Q1). */
export const GAME_NAME = 'Gbese!';

export const WORDS = {
  title: {
    /** City choice 10 (Tp, 9 Nov 2026). */
    tagline: 'Build up Lagos. Get Nigeria working.',
    /** city.md (a): the title's small "Settings" button. */
    settings: 'Settings',
    makeHero: 'Make your hero',
    /** S2.10: "Play" once a hero is saved (the builder's own button stays "Start running"). */
    start: 'Play',
    changeHero: 'Change hero',
    wheel: "Nigeria's wheel",
    credits: 'Credits',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    musicOn: 'Music: on',
    musicOff: 'Music: off',
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
    lines: ['Made by CoachNaz.', 'Every picture, sound and tune is our own.'],
    back: 'Back',
  },
  hud: {
    lives: (n: number) => `♥ ${n}`,
    kobo: (n: number) => `Kobo ${n}`,
    fast: (s: number) => `Fast ${s}`,
    shield: 'Shield',
    strong: (s: number) => `Strong ${s}`,
    /** S2.15: the fufu chip, and what screen readers hear. */
    fufu: (n: number) => `Fufu ${n}`,
    fufuSpoken: (n: number) => `Fufu balls: ${n}`,
    /** S2.10 HUD: the garri parcel icon and this word while it is carried (S2.5). */
    parcel: 'Parcel',
    pause: 'Pause',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
  },
  /** S2.10 Pause: four buttons and the Sound and Music switches. */
  pause: {
    heading: 'Paused',
    keepPlaying: 'Keep playing',
    restart: 'Start again',
    streets: 'Streets',
    home: 'Home',
  },
  gameOver: {
    heading: 'Out of lives',
    /** N2: money words; `kobo` is whole kobo (10 a coin). */
    /** (c) "Losing keeps it all" (Tp, question 2): the money goes home to Lagos. */
    text: (kobo: number) => `You keep ${formatMoney(kobo)} for Lagos. The street is still here. Try again!`,
    /** S2.10 Game over (hall). */
    hallText: 'General Go-Slow is still jamming the hall. Try again!',
    playAgain: 'Play again',
    /** S2.13 part 5: a street's offer; the hall's stays the short one. */
    gentleOffer: 'Want more tries? Gentle mode gives you 5 lives, and you climb out of holes.',
    hallGentleOffer: 'Want more tries? Gentle mode gives you 5 lives.',
    streets: 'Streets',
    home: 'Home',
  },
  /** S2.10 Street cleared, with Tp's line (8 Nov 2026, "Cleared words for real places"). A card line, never a toast. */
  cleared: {
    heading: 'Street cleared!',
    /** N2: money words; `kobo` is whole kobo (10 a coin). */
    text: (name: string, kobo: number) => `${name} is moving again, thanks to you! You got ${formatMoney(kobo)}.`,
    /** Shown when the player got on the bus carrying the garri parcel. */
    parcel: 'Your garri parcel is saved for Go-Slow Hall.',
    /** (c), 5W W5: the big button goes home to Lagos ("Mission complete!"). */
    takeHome: 'Take it home',
    next: 'Next street',
    toHall: 'Go to Go-Slow Hall',
    playAgain: 'Play again',
    streets: 'Streets',
  },
  /** S2.10 Win, after Go-Slow Hall. No kobo here (po M4 note). */
  win: {
    heading: 'Lagos is switched on!',
    text: (lives: number) => `You cleared General Go-Slow with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`,
    cog: (n: number) => `Lagos's cog is turning: ${n} of 37.`,
    more: 'More of Nigeria is coming soon.',
    wheel: "See Nigeria's wheel",
    playAgain: 'Play again',
    streets: 'Streets',
  },
  /** S2.10 Streets: one state's streets and its hall, as cards. */
  streets: {
    heading: 'Lagos',
    line: 'Fix 3 streets, then clear Go-Slow Hall.',
    /** The small first line of a street card. */
    num: (n: number) => `Street ${n}`,
    /** The whole name on one line, for screen readers and wide cards. */
    full: (n: number, name: string) => `Street ${n}: ${name}`,
    /** N2: "Done \u2713 Best: \u20a68.70" (`best` is whole kobo). */
    done: (best: number) => `Done \u2713 Best: ${formatMoney(best)}`,
    /** The hall has no kobo to collect (po M4 note), so its done line has no "Best". */
    hallDone: 'Done \u2713',
    open: 'Ready to play',
    locked: (n: number) => `Finish street ${n} first`,
    parcel: 'You have a garri parcel.',
    wheel: "Nigeria's wheel",
    home: 'Home',
  },
  /** city.md (a) Settings: one column of buttons (Sound, Music and Gentle mode use the title's words). */
  settings: {
    heading: 'Settings',
    story: 'Watch the story',
    back: 'Back',
  },
  /** city.md part 5 "The intro" (T1 to T4, confirmed by Tp 9 and 10 Nov 2026). */
  intro: {
    /** The dialog's spoken name. */
    label: 'The story',
    skip: 'Skip',
    tapOn: 'Tap to go on',
    keysOn: 'Press Space to go on',
    go: "Let's go",
    captions: [
      'Long ago, light shone on West Africa. Its people and its rich land made the Wheel, so everyone could share, stay safe and keep going.',
      'The Wheel turned, and Lagos grew. More people came, and they need more roads, more light and more buses.',
      "Nigeria's Wheel keeps it all moving. The Wheel was made for everyone.",
      'But the Stoppers want it stuck: traffic, potholes, power cuts and red tape.',
      'Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you.',
      'Your journey starts now. Build up Lagos. Get Nigeria working.',
    ],
  },
  /** city.md part 5 (b) Lagos from above, and "Screens and words for slice 3". */
  city: {
    heading: 'Lagos',
    /** The map picture's spoken name. */
    map: 'Lagos from above. Tap where you want to go.',
    power: (n: number) => `Power ${n}`,
    tech: (n: number) => `Tech ${n}`,
    spokenNaira: (money: string) => `Naira: ${money}`,
    spokenPower: (n: number) => `Power: ${n}`,
    spokenTech: (n: number) => `Tech: ${n}`,
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    settings: 'Settings',
    streets: 'Streets',
    hero: 'Hero',
    wheel: "Nigeria's wheel",
    zoomIn: '+',
    zoomOut: '−',
    zoomInSpoken: 'Zoom in',
    zoomOutSpoken: 'Zoom out',
    /** Screen readers hear pins as "Potholes, problem" or "New road, fixed" (city.md accessibility). */
    pinProblem: (word: string) => `${word}, problem`,
    pinReady: (word: string) => `${word}, ready to fix`,
    pinFixed: (name: string) => `${name}, fixed`,
    fixedName: { potholes: 'New road', lightsOut: 'Lamps on', slowInternet: 'Fast internet' },
    fixed: 'Fixed ✓',
    back: 'Back',
    /** 5W W7 hints, once each, in the bar under the top row. */
    hintWalk: 'Tap where you want to go.',
    hintWalkKeys: 'Use the arrow keys to walk.',
    hintBuka: () => `Walk onto the ${formatMoney(400)} board to build a Mama Put.`,
    hintCollect: 'Mama Put made money! Walk over to collect it.',
    /** 5W W2: the problem card's button that walks the hero to the board. */
    walkThere: 'Walk there',
    /** 5W W8 Not enough card. */
    need: (price: string) => `You need ${price} for this.`,
    earnRun: 'Run Alausa to earn more.',
    earnLane: 'The lane run will earn more.',
    /** 5W W8 Part paid line. */
    partPaid: (paid: string, left: string) => `You paid ${paid}. ${left} more to go.`,
    /** 5W W8 Built lines (2 s). */
    builtLine: {
      road: 'New road! Danfos are back.',
      mamaPut: 'Mama Put is open! Food for the queue.',
      market: 'The market is open! Danfos come for goods.',
      lamps: 'Lamps on! The street is awake.',
      mast: 'Fast internet! Shops are busy.',
    },
    /** 5W W8 Collect line (1.5 s): "+₦1.20 from Mama Put". */
    collectLine: (money: string, name: string) => `+${money} from ${name}`,
    /** Spoken: "Mama Put has 1 naira 20 kobo for you. Full." */
    traySpoken: (name: string, money: string, full: boolean) => `${name.charAt(0).toUpperCase()}${name.slice(1)} has ${money} for you.${full ? ' Full.' : ''}`,
    /** Spoken: "New road. Costs 10 naira. You have 6 naira. Walk there." */
    boardSpoken: (name: string, price: string, have: string, part: boolean) => `${name}. ${part ? `${price} left` : `Costs ${price}`}. You have ${have}. Walk there.`,
    /** 5W W5 Mission complete in the walkable city. */
    mission: {
      heading: 'Mission complete!',
      line: {
        road: 'New road here. Buses are moving again.',
        lamps: 'The lamps are on. The street is awake.',
        mast: 'Fast internet here. Shops are busy.',
        mamaPut: 'Mama Put is open here.',
        market: 'The market is open here.',
      },
      more: (money: string) => `${money} more to finish it.`,
      brought: (money: string) => `You brought ${money} home.`,
      skip: 'Tap to skip',
    },
    cards: {
      potholes: {
        line1: 'Potholes on this road.',
        line2: (money: string) => `Fixing it costs ${money}.`,
        go: 'Run Alausa',
      },
      lightsOut: {
        line1: 'Lamps are out here.',
        line2: 'Switching them on costs Power 10.',
        go: 'Lane run',
        soon: 'Lane run: coming soon',
      },
      slowInternet: {
        line1: 'The internet is slow here.',
        line2: 'Fixing it costs Tech 6.',
        go: 'Lane run',
        soon: 'Lane run: coming soon',
      },
    },
  },
  /** S2.8, S2.10 Nigeria's wheel and its "All names" list. */
  wheel: {
    heading: "Nigeria's wheel",
    about: 'Every state is a part of Nigeria Company. Fix a state\'s problems and its cog starts turning.',
    count: (n: number) => `${n} of 37 cogs turning.`,
    /** Narrow rail: the count on its own, then "cogs turning". */
    countShort: (n: number) => `${n} of 37`,
    cogsTurning: 'cogs turning',
    none: 'Fix Lagos to turn the first cog.',
    more: 'More states are coming soon.',
    allNames: 'All names',
    back: 'Back',
    listHeading: 'All 36 states and the FCT',
    tickNote: '\u2713 means its cog is turning.',
    working: ', working',
    notWorking: ', not working yet',
    close: 'Close',
  },
  /**
   * S2.2 Words in hints: what {forward}, {back}, {jump} and {down} become. The arrows are plain
   * characters (U+2192, U+2190, U+2193) in the hint's own font, never emoji.
   */
  hintMarks: {
    touch: { forward: '\u2192', back: '\u2190', jump: 'Jump', down: 'Go down', throw: 'Throw' },
    keys: { forward: '\u2192', back: '\u2190', jump: 'Space', down: '\u2193', throw: 'X' },
  },
  /** Toasts in the run: docs/design.md Power-ups, Level 1. */
  toast: {
    corn: 'Roasted corn! You run faster for 12 seconds.',
    garri: 'Garri, sugar and epa (groundnut)! A shield takes one hit for you.',
    amala: 'Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through!',
    cornWearingOff: 'Corn is wearing off!',
    amalaWearingOff: 'Amala is wearing off!',
    shieldUsed: 'Shield used up!',
    /** S2.7 Go-Slow Hall. */
    hallStart: 'General Go-Slow is jamming the hall! Wait for the green light.',
    /** S2.14: the first time a light comes on in a try, and the first time one goes dark unhit. */
    lightOn: 'Green light! Jump on it!',
    lightMissed: 'Missed it! Wait for the next one.',
    parcelShield: 'Your garri parcel: the shield is on!',
    greenLight: (left: number) => `Green light! ${left} more.`,
    highHonks: 'PEEP! High honks fly high. Stay low on the floor.',
    hallClear: 'Green light! The hall is clear!',
    switchedOn: 'Lagos is switched on!',
    /** S2.5 the well and its room. */
    roomArrive: 'A secret room! Grab the kobo. Stand under the rope to go back up.',
    /** po ruling 8 Nov 2026: from N2 on, now the parcel is saved for the hall. */
    parcel: 'Garri parcel! Shield for the hall.',
    backOnStreet: 'Back on the street!',
    /** S2.15 pepper fufu ({throw} is "Throw" on touch, "X" on keys). */
    fufu: 'Pepper fufu! Press {throw} to throw.',
    fufuHall: 'Fufu! Press {throw} to pop throws.',
    plugged: 'Plugged! Fufu fills potholes.',
    /** S2.16 B5: the first time weeds dry up in a play. */
    weedsDried: 'The weeds dried up! Safe to cross.',
    /** S2.16 B4: the first double tap while resting, once per play. */
    dashTired: 'Catch your breath! Dash again soon.',
  },
  /** S2.9 corn count: what screen readers hear (once at 5, and at 0). */
  corn: {
    endsIn: (n: number) => `Corn ends in ${n} seconds`,
    done: 'Corn is done',
  },
  /** S2.13 part 5: the hint after every Gentle mode climb-out, by the kind of pit (35 characters or fewer). */
  climbOut: {
    small: 'Up you come! Try that jump again.',
    wide: 'Up you come! Jump, then jump again.',
    big: 'Up you come! Run, then jump twice.',
    /** S2.16 B4: with the Gentle blocks a dash gap is two wide potholes (each half is one). */
    dash: 'Up you come! Jump, then jump again.',
  },
  /** S2.10 Well button: the words on it (touch, and a computer with keys), and its spoken name. */
  well: {
    down: 'Go down',
    downKeys: 'Go down (\u2193)',
    up: 'Go up',
    upKeys: 'Go up (Enter)',
  },
} as const;

/**
 * S2.13 part 5: street hints whose words are not true in Gentle mode, and what they say there
 * instead (the bus stop is no longer where a fall puts you back).
 */
export const GENTLE_HINTS: Readonly<Record<string, string>> = {
  'Bus stop! Now you start here.': 'Bus stop! Halfway there.',
  /** S2.16 B4: Gentle mode never needs the dash (cement blocks stand in every dash gap). */
  'Dash, then jump twice!': 'Dash, or hop over the blocks.',
  'Dash gap! Dash, then jump twice.': 'Dash, or hop over the blocks.',
};

/** S2.2 hint bar: a toast longer than this shows its short words on a narrow bar. */
export const SHORT_AT = 35;
/** S2.2 hint bar: a bar narrower than this (CSS px) takes the short words. */
export const NARROW_BAR = 160;

/** S2.2 "Short words for narrow bars": full toast words, then the short words. */
export const SHORT_TOAST: Readonly<Record<string, string>> = {
  'Roasted corn! You run faster for 12 seconds.': 'Roasted corn! You run faster!',
  'Garri, sugar and epa (groundnut)! A shield takes one hit for you.': 'Garri, sugar and epa! Shield on!',
  'Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through!': 'Amala, gbegiri and ewedu! Strong!',
  'A secret room! Grab the kobo. Stand under the rope to go back up.': 'Secret room! Use the rope to go up.',
  'Your garri parcel: the shield is on!': 'Garri parcel: shield on!',
  'General Go-Slow is jamming the hall! Wait for the green light.': 'Go-Slow! Wait for the green light.',
  'PEEP! High honks fly high. Stay low on the floor.': 'PEEP! High honks: stay low.',
};

/** The words a toast shows in a bar this wide (CSS px): the short words on a narrow bar. */
export function barWords(words: string, barWidth: number): string {
  if (barWidth >= NARROW_BAR || words.length <= SHORT_AT) return words;
  return SHORT_TOAST[words] ?? words;
}

/** Fills the {forward} {back} {jump} {down} {throw} markers in a hint for touch or keys. */
export function hintWords(words: string, kind: 'touch' | 'keys'): string {
  const marks: Record<string, string> = WORDS.hintMarks[kind];
  return words.replace(/\{(forward|back|jump|down|throw)\}/g, (_, k: string) => marks[k] ?? k);
}
