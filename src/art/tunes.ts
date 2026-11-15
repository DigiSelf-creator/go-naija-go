/**
 * Our own tunes, as note data (docs/design.md S2.9). No sound files: the music
 * player (src/engine/music.ts) builds every note from oscillators and hiss.
 *
 * How to read a bar: 16 tokens, one per 16th note (4 per beat).
 *   G4      a note (letter, optional #, octave). Middle C is C4.
 *   G4+B4   two or more notes together (a chord stab).
 *   -       hold the note before for one more 16th.
 *   .       rest.
 *   x / X   a shake of the shekere, soft / accented (shaker tracks only).
 *
 * Every melody is new, written inside the S2.9 keys and chords. None follows a
 * known tune: no game music (Nintendo or other), no advert, anthem, hymn,
 * chant, party song or known Nigerian song. tests/unit/music.test.ts checks the
 * keys, the lengths, the note count, and every run of 5 melody notes against
 * the openings of well-known game tunes, hymns and songs.
 */
export type Instrument = 'bass' | 'guitar' | 'agogo' | 'shekere' | 'drum' | 'kalimba' | 'horn' | 'drone' | 'kick';

export interface Track {
  inst: Instrument;
  /** One string of 16 tokens per bar. */
  bars: readonly string[];
  /** Loudness, 0 to 1 (before the music volume). */
  vol: number;
  /** The track joins only from this tempo step on (hall layers, street 3's second agogo). */
  from?: number;
  /** This is the tune's melody (used for the originality check). */
  lead?: boolean;
  /** A layer name the game can turn off and on (Music.setLayer), e.g. the lane tune's 'guitar'. */
  layer?: string;
}

export interface Tune {
  name: string;
  /** Tempo (beats per minute) for each tempo step: street 1 to 3, hall hits 0 to 2. */
  bpm: readonly number[];
  bars: number;
  loop: boolean;
  /** Whole-tune loudness (the menu plays at 70 percent). */
  gain: number;
  /** Pitch classes allowed in tuned parts (key check), e.g. G major. */
  key: readonly string[];
  /** The chord for each bar, for people reading the data. */
  chords: readonly string[];
  tracks: readonly Track[];
}

const rep = (bar: string, n: number): string[] => Array.from({ length: n }, () => bar);
/** Bars for a chord list, picked from a table of one bar per chord. */
const byChord = (table: Record<string, string>, chords: readonly string[]): string[] => chords.map((c) => table[c] ?? rep('.', 16).join(' '));

// ---------------------------------------------------------------- street
// G major, highlife, walking to work. A: G C D G (2 bars each). B: Em C D D.

const STREET_CHORDS = ['G', 'G', 'C', 'C', 'D', 'D', 'G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D', 'D', 'D'] as const;

const STREET_MELODY = [
  'B4 . D5 - . G5 . F#5 - . D5 . A4 - C5 .',
  'D5 - - . G4 . A4 . B4 - - - . . . .',
  'C5 . E5 - . G5 . E5 - . D5 . C5 - G4 .',
  'A4 - - . C5 . E5 . G5 - E5 . D5 - - .',
  'A4 . D5 - . A5 . F#5 - . D5 . E5 - F#5 .',
  'D5 - - . C5 . A4 . F#4 - A4 . C5 - - .',
  'B4 - G4 . B4 . D5 - G5 - - . F#5 . A5 .',
  'G5 - - - D5 . . . G4 - - - . . . .',
  'G4 . B4 . E5 - - . D5 . B4 . G4 - E4 .',
  'G4 - - . A4 . B4 . . . E5 . D5 - - .',
  'E5 . G5 . E5 - C5 . D5 . E5 . G5 - - .',
  'E5 - D5 . C5 - - . E4 . G4 . C5 - - .',
  'D5 . F#5 . A5 - - . F#5 . G5 . E5 - D5 .',
  'C5 - - . A4 . F#4 . A4 . C5 . D5 - - .',
  'F#5 - E5 . D5 . A4 . D5 - E5 . F#5 - - .',
  'A5 - - - . . F#5 . D5 . . . . . . .',
] as const;

const STREET_BASS: Record<string, string> = {
  G: 'G2 - - . . . D3 . G2 . . B2 . . D3 .',
  C: 'C3 - - . . . G2 . C3 . . E3 . . G2 .',
  D: 'D3 - - . . . A2 . D3 . . F#3 . . A2 .',
  Em: 'E2 - - . . . B2 . E3 . . G2 . . B2 .',
};

const STREET_GUITAR: Record<string, string> = {
  G: '. . G4+B4 . D4 . G4+B4 . . . G4+B4 . D4 . G4+B4 .',
  C: '. . E4+G4 . C4 . E4+G4 . . . E4+G4 . C4 . E4+G4 .',
  D: '. . F#4+A4 . D4 . F#4+A4 . . . F#4+A4 . D4 . F#4+A4 .',
  Em: '. . G4+B4 . E4 . G4+B4 . . . G4+B4 . E4 . G4+B4 .',
};

const G_MAJOR = ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] as const;

export const STREET: Tune = {
  name: 'street',
  bpm: [108, 112, 116],
  bars: 16,
  loop: true,
  gain: 1,
  key: G_MAJOR,
  chords: STREET_CHORDS,
  tracks: [
    { inst: 'guitar', bars: STREET_MELODY, vol: 0.55, lead: true },
    { inst: 'bass', bars: byChord(STREET_BASS, STREET_CHORDS), vol: 0.8 },
    { inst: 'guitar', bars: byChord(STREET_GUITAR, STREET_CHORDS), vol: 0.32 },
    { inst: 'agogo', bars: rep('A5 . . A5 . . E5 . A5 . . A5 . E5 . .', 16), vol: 0.35 },
    { inst: 'shekere', bars: rep('X . x x x . x x X . x x x . x x', 16), vol: 0.4 },
    // Street 3 only: a second agogo line that answers the first.
    { inst: 'agogo', bars: rep('. . E5 . . E5 . . . . E5 . . . A5 .', 16), vol: 0.25, from: 2 },
  ],
};

/** Title, builder, Streets and wheel: the street tune, bass and guitar only, slower and softer. */
export const MENU: Tune = {
  ...STREET,
  name: 'menu',
  bpm: [96],
  gain: 0.7,
  tracks: STREET.tracks.filter((t) => t.inst === 'guitar' || t.inst === 'bass'),
};

// ---------------------------------------------------------------- well room
// Cosy and secret: A minor pentatonic kalimba over a soft low drone. Am, G, F, G.

const WELL_CHORDS = ['Am', 'Am', 'G', 'G', 'F', 'F', 'G', 'G'] as const;

export const WELL: Tune = {
  name: 'well',
  bpm: [84],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['A', 'C', 'D', 'E', 'G', 'F', 'B'],
  chords: WELL_CHORDS,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.7,
      bars: [
        'A4 . E5 . D5 . . . C5 . D5 . A4 . . .',
        'E4 . . . G4 . A4 . . . . . C5 . . .',
        'D5 . G4 . D5 . E5 . . . D5 . . . G4 .',
        'A4 . . . G4 . E4 . . . D4 . . . . .',
        'C5 . A4 . C5 . D5 . E5 . . . D5 . C5 .',
        'A4 . . . . . C5 . . . A4 . G4 . . .',
        'G4 . A4 . C5 . D5 . . . E5 . G5 . . .',
        'E5 . . . D5 . . . C5 . . . A4 . . .',
      ],
    },
    {
      inst: 'drone',
      vol: 0.5,
      bars: byChord(
        { Am: 'A2 - - - - - - - - - - - - - - -', G: 'G2 - - - - - - - - - - - - - - -', F: 'F2 - - - - - - - - - - - - - - -' },
        WELL_CHORDS,
      ),
    },
    { inst: 'shekere', bars: rep('. . . . x . . . . . . . x . . .', 8), vol: 0.18 },
  ],
};

// ---------------------------------------------------------------- Go-Slow Hall
// Tense but funny, honky. E minor: Em, Em, C, B. Bass walks steady eighths; horn stabs on 2 and 4.

const HALL_CHORDS = ['Em', 'Em', 'Em', 'Em', 'C', 'C', 'B', 'B'] as const;

export const HALL: Tune = {
  name: 'hall',
  bpm: [128, 134, 140],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['E', 'F#', 'G', 'A', 'B', 'C', 'D', 'D#'],
  chords: HALL_CHORDS,
  tracks: [
    {
      inst: 'guitar',
      lead: true,
      vol: 0.5,
      bars: [
        'E4 - G4 . B4 . A4 - . . F#4 . B4 . E5 .',
        'F#4 - - . E4 . . . D4 . E4 . . . . .',
        'B4 - G4 . B4 . C5 - B4 . A4 . G4 - - .',
        'A4 . F#4 . G4 . E4 . . . . . B3 . . .',
        'C5 - - . B4 . A4 . G4 . A4 . C5 - - .',
        'D5 - E5 . C5 . . . G4 . . . E4 . . .',
        'D#4 - F#4 . B4 . A4 - . . F#4 . A4 . D#4 .',
        'B3 - - . . . F#4 . B4 - - . . . . .',
      ],
    },
    {
      inst: 'bass',
      vol: 0.85,
      bars: byChord(
        {
          Em: 'E2 . G2 . B2 . E3 . D3 . B2 . G2 . B2 .',
          C: 'C3 . E3 . G2 . C3 . E3 . G3 . E3 . C3 .',
          B: 'B2 . D#3 . F#3 . B2 . A2 . F#2 . D#3 . F#2 .',
        },
        HALL_CHORDS,
      ),
    },
    {
      inst: 'horn',
      vol: 0.4,
      bars: byChord(
        {
          Em: '. . . . E4+G4 . . . . . . . E4+B4 . . .',
          C: '. . . . C4+E4 . . . . . . . E4+G4 . . .',
          B: '. . . . B3+D#4 . . . . . . . D#4+F#4 . . .',
        },
        HALL_CHORDS,
      ),
    },
    { inst: 'agogo', bars: rep('A5 . . . E5 . . . A5 . . . E5 . A5 .', 8), vol: 0.25 },
    // After hit 1: a shaker joins.
    { inst: 'shekere', bars: rep('X . x . x . x . X . x . x . x .', 8), vol: 0.35, from: 1 },
    // After hit 2: a second horn answers high.
    {
      inst: 'horn',
      vol: 0.3,
      from: 2,
      bars: byChord({ Em: '. . . . . . . . . . . . . . B4 .', C: '. . . . . . . . . . . . . . G4 .', B: '. . . . . . . . . . . . . . F#4 .' }, HALL_CHORDS),
    },
  ],
};

// ---------------------------------------------------------------- short tunes

/** Street cleared: our bus horn, then a 4-note guitar figure ending on G. About 2.5 s. */
export const CLEARED: Tune = {
  name: 'cleared',
  bpm: [120],
  bars: 2,
  loop: false,
  gain: 1,
  key: G_MAJOR,
  chords: ['G', 'G'],
  tracks: [
    // The horn is our "pa-paam" (the arena and bus sound), not part of the key check.
    { inst: 'horn', bars: ['D#4+G4 - . . D#4+G4 - - - . . . . . . . .', '. . . . . . . . . . . . . . . .'], vol: 0.45 },
    { inst: 'guitar', lead: true, bars: ['. . . . . . . . B4 . D5 . E5 . . .', 'G5 - - - . . . . . . . . . . . .'], vol: 0.6 },
    { inst: 'bass', bars: ['. . . . . . . . . . . . . . . .', 'G2 - - - . . . . . . . . . . . .'], vol: 0.8 },
  ],
};

/** Win (the hall is clear): a broken run up the G major scale, an agogo flourish, a talking-drum "pom pom", a full G chord. About 5 s. */
export const WIN: Tune = {
  name: 'win',
  bpm: [120],
  bars: 3,
  loop: false,
  gain: 1,
  key: G_MAJOR,
  chords: ['G', 'G', 'G'],
  tracks: [
    {
      inst: 'guitar',
      lead: true,
      vol: 0.55,
      // The run climbs the G major scale in broken steps (up a third, back one), not a plain scale.
      bars: ['G4 B4 A4 C5 B4 D5 C5 E5 D5 F#5 G5 - - . . .', 'D5 - B4 . . . . . G5 - - - - - - -', '- - - - - - - - . . . . . . . .'],
    },
    { inst: 'guitar', vol: 0.4, bars: ['. . . . . . . . . . . . . . . .', '. . . . . . . . G4+B4+D5 - - - - - - -', '- - - - - - - - . . . . . . . .'] },
    { inst: 'agogo', vol: 0.4, bars: ['. . . . . . . . A5 . A5 E5 A5 . E5 .', 'A5 . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .'] },
    { inst: 'drum', vol: 0.7, bars: ['. . . . . . . . . . . . . . . .', '. . . . D3 . . D3 . . . . . . . .', '. . . . . . . . . . . . . . . .'] },
    { inst: 'bass', vol: 0.8, bars: ['G2 . . . . . . . D3 . . . . . . .', 'G2 . . . . . . . G2 - - - - - - -', '- - - - - - - - . . . . . . . .'] },
  ],
};

// ---------------------------------------------------------------- corn
// Roasted corn (S2.9 "Corn tune"): fast, loud and bright. G major pentatonic lead over G, C, D, G.
// Our own 2-bar highlife riff (bars 1 and 2), answered by 2 bars (3 and 4). The riff mostly turns
// round and falls; no repeated-note "star" rhythm, no rising arpeggio on every beat, no chromatic
// climb. Tempo steps: 144 while fresh, then 128, 112, 96, 80, 72 for the 5, 4, 3, 2, 1 count
// (only the speed changes, never the pitch).

const CORN_CHORDS = ['G', 'C', 'D', 'G'] as const;

/** The notes the corn tune's lead may use: G major pentatonic. */
export const G_PENTATONIC = ['G', 'A', 'B', 'D', 'E'] as const;

export const CORN: Tune = {
  name: 'corn',
  bpm: [144, 128, 112, 96, 80, 72],
  bars: 4,
  loop: true,
  gain: 1,
  // The lead keeps to G_PENTATONIC; the bass walks the chord roots (C in bar 2), so the check key is G major.
  key: G_MAJOR,
  chords: CORN_CHORDS,
  tracks: [
    {
      inst: 'guitar',
      lead: true,
      vol: 0.6,
      bars: [
        'D5 . B4 A4 B4 . G4 A4 . B4 D5 . E5 . B4 D5',
        'E5 . G5 E5 D5 . E5 . G4 . A4 B4 . A4 G4 .',
        'A4 . D5 . A4 B4 D5 . E5 . A4 . B4 D5 . .',
        'B4 A4 G4 . D4 . E4 G4 . B4 G4 - - . . .',
      ],
    },
    // Bass on beat 1 and the "and" of beat 2.
    {
      inst: 'bass',
      vol: 0.8,
      bars: byChord({ G: 'G2 - - . . . D3 - . . . . . . . .', C: 'C3 - - . . . G2 - . . . . . . . .', D: 'D3 - - . . . A2 - . . . . . . . .' }, CORN_CHORDS),
    },
    // Agogo: a two-note pattern, high then low.
    { inst: 'agogo', bars: rep('A5 . . . . . E5 . . . A5 . . . E5 .', 4), vol: 0.3 },
    { inst: 'shekere', bars: rep('X x x x X x x x X x x x X x x x', 4), vol: 0.35 },
    // A talking-drum fill at the end of bar 4, where the lead rests.
    { inst: 'drum', bars: ['. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . D3 . D3 G3'], vol: 0.6 },
  ],
};

// ---------------------------------------------------------------- lane run
// The lane run (S3f0 part 17): our own Afrobeat-style groove at 120 BPM in E minor pentatonic
// (E G A B D, the same notes as the street tunes' G major pentatonic, so the corn tune never
// clashes). 8 bars looping: a soft kick on beats 1 and 3, shekere on every 16th, a bass riff,
// a highlife guitar line, and a talking-drum call every 4 bars (the guitar rests for it).
// Under 15 m the 'guitar' layer drops out (Music.setLayer('guitar', false)) and only drums and
// bass play. After the goal: one tempo step (1 BPM) per 100 m, up to 132; the pitch never moves.
// Not like any lane runner's music or any known song: no whistle lead, no hip-hop beat (no
// snare backbeat, no boom-bap), no chase-movie strings; plucked guitar over drums and bass.

const LANE_CHORDS = ['Em', 'Em', 'G', 'G', 'Am', 'Am', 'D', 'Em'] as const;

/** E minor pentatonic: the lane tune's only notes. */
export const E_PENTATONIC = ['E', 'G', 'A', 'B', 'D'] as const;

const LANE_BASS: Record<string, string> = {
  Em: 'E2 - . E2 . . G2 . . A2 . B2 . . D3 .',
  G: 'G2 - . G2 . . B2 . . D3 . E3 . . D3 .',
  Am: 'A2 - . A2 . . E2 . . G2 . A2 . . B2 .',
  D: 'D3 - . D2 . . A2 . . B2 . D3 . . A2 .',
};

export const LANE: Tune = {
  name: 'lane',
  bpm: [120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132],
  bars: 8,
  loop: true,
  gain: 1,
  key: E_PENTATONIC,
  chords: LANE_CHORDS,
  tracks: [
    {
      inst: 'guitar',
      lead: true,
      layer: 'guitar',
      vol: 0.5,
      bars: [
        'B4 . G4 B4 . E5 . D5 . B4 . A4 B4 . . .',
        'G4 . E4 G4 . A4 . . B4 . A4 G4 . E4 . .',
        'D5 . B4 D5 . G4 . E5 . D5 . B4 A4 . . .',
        'B4 . A4 B4 . D5 . . G4 . . . . . . .',
        'A4 . E5 . A4 . G4 A4 . D5 . E5 . . A4 .',
        'G4 A4 . E4 . . G4 . A4 . . B4 - . . .',
        'D5 . A4 D5 . B4 . A4 . G4 . E4 . G4 . .',
        'E5 . D5 B4 . . G4 . . . . . . . . .',
      ],
    },
    { inst: 'bass', bars: byChord(LANE_BASS, LANE_CHORDS), vol: 0.8 },
    { inst: 'kick', bars: rep('E2 . . . . . . . E2 . . . . . . .', 8), vol: 0.7 },
    { inst: 'shekere', bars: rep('X x x X x x X x X x x X x x X x', 8), vol: 0.32 },
    // The talking-drum call at the end of bars 4 and 8, where the guitar rests.
    {
      inst: 'drum',
      vol: 0.6,
      bars: [0, 1, 2, 3, 4, 5, 6, 7].map((b) => (b % 4 === 3 ? '. . . . . . . . . . . . E3 . G3 B3' : '. . . . . . . . . . . . . . . .')),
    },
  ],
};

/** The lane tune's tempo step for a distance run (m): 0 up to the goal, then one step per 100 m after it, up to 132 BPM. */
export function laneTempoAt(distance: number, goal = 600): number {
  if (!Number.isFinite(distance) || distance <= goal) return 0;
  return Math.min(LANE.bpm.length - 1, Math.floor((distance - goal) / 100));
}

export type MusicPlace = 'menu' | 'street' | 'well' | 'hall' | 'cleared' | 'win' | 'corn' | 'lane';

export const TUNES: Record<MusicPlace, Tune> = { menu: MENU, street: STREET, well: WELL, hall: HALL, cleared: CLEARED, win: WIN, corn: CORN, lane: LANE };
