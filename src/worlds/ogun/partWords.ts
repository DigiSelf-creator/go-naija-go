/**
 * Ogun's words that only the lazy Ogun part shows (docs/ogun.md part 5 and part 7): Pothole
 * Hall's lines and Ogun's bubbles. Moved here from src/screens/words.ts so the first load stays
 * small (qa O2: size); everything else in OGUN_WORDS is still there, and this OGUN_WORDS is the
 * whole set (qa: search here, cityWords.ts and src/screens/words.ts OGUN_WORDS).
 */
import { OGUN_WORDS as FIRST_WORDS } from '../../screens/words';

export const OGUN_WORDS = {
  ...FIRST_WORDS,
  /** Part 5: Pothole Hall. */
  hall: {
    ...FIRST_WORDS.hall,
    /** Painted over the left door, and the tag on the bag. */
    sign: 'POTHOLE HALL',
    bagTag: 'READY',
    parcelShield: 'Your Ijebu garri parcel: the shield is on!',
    start: 'King Pothole is blocking the gateway!',
    /** First try only. */
    pickUp: 'Pick up the road mix bag.',
    jumpOver: 'Jump over King Pothole to drop it in.',
    /** "Plop! 2 more bags." / "Plop! 1 more bag." */
    plop: (left: number) => `Plop! ${left} more ${left === 1 ? 'bag' : 'bags'}.`,
    /** Before phase 3. */
    cross: "He's cross! Two gravel lumps now. Jump them both.",
    smooth: 'The road is smooth!',
    /** The hit counter's spoken words. */
    bagsSpoken: (n: number) => `Bags in: ${n} of 3.`,
    /** King Pothole's own bubbles (he is a pothole, never a person). */
    pothole: { bump: 'Hmph!', hit: 'Oof... hm!', giggle: 'Hee hee, that tickles!' },
  },
  /**
   * Part 7: Ogun's bubbles, split by language as WORDS.folk (decision 30). Greetings and cheers
   * are the Lagos ones. Each line is checked by a speaker before it ships.
   */
  folk: {
    /** By the arch on Ota. */
    welcome: { en: ['Welcome!'], pcm: ['You don land!'], yo: ['Ẹ káàbọ̀!'], ha: ['Barka da zuwa!'], ig: ['Nnọọ!'] },
    traders: {
      ota: ['Ofada rice dey!', 'Fresh bread!', 'Recharge card dey!'],
      abeokuta: ['Fine adire!', 'New cloth!', 'Ofada, hot!'],
      sagamu: ['Fresh kola!', 'Garri Ijebu!', 'Ikokore, hot!'],
    },
    /** The well room's store keeper as the hero takes the parcel. */
    storeKeeper: 'For Pothole Hall. Go well!',
    /** The plain spelling, if a phone shows a tone mark as a box. */
    plain: { 'Ẹ káàbọ̀!': 'E kaabo!', 'Nnọọ!': 'Nnoo!' } as Readonly<Record<string, string>>,
  },
} as const;
