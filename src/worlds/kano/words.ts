/**
 * K0a: every Kano word the streets, the well room and Borehole Hall need (docs/kano.md parts 3,
 * 4, 5, 7 and 8), word for word. Kept in the Kano folder so it rides in the lazy Kano part
 * (kano.md 9.1); when gamedev builds K1b, the few lines the first load must show (the "On to
 * Kano" button, the Travel card, the "To Kano" stop, the wheel lines, the download card) move to
 * src/screens/words.ts, as Ogun's did. Nothing here is shown yet: the street files carry the
 * hints, and tests/unit/kano-levels.test.ts checks they match.
 *
 * Rules for every line (kano.md 2.3 and 7, decisions 86 and 91): plain words for children about
 * 5 and up; no line names God (KN-R7); no title words for rulers; every Hausa line is fine for
 * the team's test link and is read by Tp or a Hausa speaker Tp trusts before the closed
 * invited test.
 */
import { formatMoney } from '../../game/money';

export const KANO_WORDS = {
  /** Part 3.1 (decision 91): the three streets, in order from the gate. */
  streets: ['Kurmi', 'Kofar Mata', 'Dawanau'] as readonly string[],
  /** Part 3: each street's hints, word for word as in its level file (35 characters or fewer). */
  hints: {
    kurmi: ['Wind behind you! You jump farther.', 'Wind in your face! Short jumps.', 'Bus stop! Now you start here.', "Kilishi! Wind can't hold you back."],
    kofarMata: ['Springy cloth! Land to bounce high.', 'Bus stop! Now you start here.'],
    dawanau: ['Dust whirl! Jump over it.', "Fura da nono! Dust can't stop you.", 'Bus stop! Now you start here.'],
  } as Readonly<Record<'kurmi' | 'kofarMata' | 'dawanau', readonly string[]>>,
  /** Toasts in the Kano streets and the well room (parts 3.4, 3.7, 4.1). */
  toast: {
    /** As the hero passes through the gate on Kurmi. */
    gate: 'Welcome to Kano!',
    kilishi: "Kilishi! Wind can't hold you back for 12 seconds.",
    fura: "Fura da nono! Dust can't stop you for 12 seconds.",
    kilishiWearingOff: 'Kilishi is wearing off!',
    furaWearingOff: 'Fura is wearing off!',
    parcel: 'Groundnut garri parcel! Shield for the hall.',
  },
  /**
   * Short words for a narrow bar (S2.2), for each toast over 35 characters. K1b adds these to
   * SHORT_TOAST (or teaches barWords to read this list once the Kano part has loaded).
   */
  short: {
    "Kilishi! Wind can't hold you back for 12 seconds.": "Kilishi! Wind can't hold you back.",
    "Fura da nono! Dust can't stop you for 12 seconds.": "Fura da nono! Dust can't stop you.",
    'Groundnut garri parcel! Shield for the hall.': 'Garri parcel! Shield for the hall.',
    'Your garri parcel: the shield is on!': 'Garri parcel: shield on!',
    "He's cross! Two whirls now. Jump them both.": 'Two whirls now! Jump them both.',
    'The water is flowing! Kano is switched on!': 'The water is flowing!',
    'Bounce, hold, and bump the valve!': 'Bounce, hold, bump the valve!',
  } as Readonly<Record<string, string>>,
  /** HUD chips while a food works (icon, word, bar; never colour alone). */
  hud: {
    kilishi: (s: number) => `Kilishi ${s}`,
    fura: (s: number) => `Fura ${s}`,
  },
  /** Part 8: Street cleared on a Kano street. */
  cleared: {
    text: (name: string, kobo: number) => `${name} is moving again, thanks to you! You got ${formatMoney(kobo)}.`,
    parcel: 'Your garri parcel is saved for Borehole Hall.',
    toHall: 'Go to Borehole Hall',
  },
  /** Part 8: Out of lives in Kano. */
  gameOver: {
    text: (kobo: number) => `You keep ${formatMoney(kobo)}. The street is still here. Try again!`,
    hallText: 'Rusty Borehole is still dry. Try again!',
  },
  /** Part 5: Borehole Hall. */
  hall: {
    name: 'Borehole Hall',
    /** Painted over the left door, and the tag on the valve to hit now. */
    sign: 'BOREHOLE HALL',
    stuckTag: 'STUCK',
    parcelShield: 'Your garri parcel: the shield is on!',
    start: 'Rusty Borehole has gone dry!',
    /** First try of each visit. */
    hint: 'Bounce, hold, and bump the valve!',
    /** A hit. */
    glug: 'SQUEAK... GLUG!',
    /** "Glug! 2 more valves." / "Glug! 1 more valve." */
    left: (n: number) => `Glug! ${n} more ${n === 1 ? 'valve' : 'valves'}.`,
    /** Before phase 3. */
    cross: "He's cross! Two whirls now. Jump them both.",
    open: 'The water is flowing! Kano is switched on!',
    /** The hit counter's spoken words. */
    valvesSpoken: (n: number) => `Valves open: ${n} of 3.`,
    /** Rusty Borehole's own sounds (he is a pump, never a person). */
    rusty: { hiccup: 'hic!', gargle: 'glug glug glug', sneeze: 'A... a... ACHOO!', hum: 'mm-hmm!' },
  },
  /** Part 5.5: the Win screen after Borehole Hall. */
  win: {
    heading: 'Kano is switched on!',
    line: 'The water is flowing. The markets of Kano are busy again.',
    money: (kobo: number) => `You got ${formatMoney(kobo)}.`,
    takeHome: 'Take it home',
    playAgain: 'Play again',
    road: 'Challenge road',
  },
  /**
   * Part 7: Kano's bubbles, split by language as WORDS.folk (decision 30), Hausa first since it
   * is Kano's home language.
   */
  folk: {
    /** By the gate on Kurmi. */
    welcome: { ha: ['Barka da zuwa!'], en: ['Welcome!'], yo: ['Ẹ káàbọ̀!'], ig: ['Nnọọ!'], pcm: ['You don land!'] },
    /** By time of day: Kurmi is morning, Kofar Mata midday, Dawanau evening. */
    greetings: {
      kurmi: ['Ina kwana?'],
      kofarMata: ['Barka da rana!'],
      dawanau: ['Barka da yamma!'],
      anyTime: ['Sannu!', 'Hello!', 'Ndewo!', 'Ẹ n lẹ́ o!', 'How far?'],
    },
    answers: ['Lafiya lau!', 'Na gode!'],
    traders: {
      kurmi: ['Fine leather!', 'New sandals!', 'Hot kosai!'],
      kofarMata: ['Blue cloth!', 'Fresh fura!', 'Ga fura!'],
      dawanau: ['Groundnut dey!', 'Ga gyada!', 'Good beans!'],
    },
    cheers: ['Well done!', 'Yauwa!', 'Madalla!', 'Sannu da aiki!', 'Ẹ kú iṣẹ́!', 'I meela!', 'Oya, go!'],
    /** The well room's store keeper as the hero takes the parcel. */
    storeKeeper: 'For Borehole Hall. Safe trip!',
    /** The door people in Borehole Hall, on each glug. */
    doorCheers: ['Yauwa!', 'Well done!'],
    bus: ['Bus don come!', 'Sai an jima!'],
    /** The plain spelling, if a phone shows a tone mark as a box. */
    plain: { 'Ẹ káàbọ̀!': 'E kaabo!', 'Nnọọ!': 'Nnoo!', 'Ẹ n lẹ́ o!': 'E n le o!', 'Ẹ kú iṣẹ́!': 'E ku ise!' } as Readonly<Record<string, string>>,
  },
  /** Part 6.2: Kano's quick mission card lines (KM1 to KM5; stars are checked against the level files). */
  missions: {
    coins: 'Catch coins on Kurmi!',
    wind: 'Jump far with the wind!',
    bounce: 'Bounce on the springy cloth!',
    whirls: 'Puff the dust whirls!',
    power: 'Catch Power bulbs!',
  },
} as const;
