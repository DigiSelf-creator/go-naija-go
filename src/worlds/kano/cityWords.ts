/**
 * K6b: the words of Kano's city, its challenge road and Harmattan Road (docs/kano.md 6.2 to 6.5
 * and 8, W18 with Kano's names), word for word; words the note does not give are gamedev's, as
 * Ogun's (src/worlds/ogun/cityWords.ts), marked "new" for designer to check. The Lagos city's own
 * words (Sound, Settings, Hero, zoom, the chips, Back, Walk there, the tray and pay lines) are
 * WORDS.city's, passed in by the game. Money comes in as words the game has already written.
 */
export const KANO_CITY_WORDS = {
  heading: 'Kano',
  map: 'Kano from above. Tap where you want to go.',
  /** Part 8: the boards. */
  board: {
    sandyRoad: 'Clean road',
    leather: 'Leather stalls',
    lightsOut: 'Lamps',
    slowInternet: 'Mast',
    dye: 'Dye pits',
    grain: 'Grain market',
    pyramid: 'Groundnut pyramid',
  },
  /** 6.2: the problem cards. */
  cards: {
    sandyRoad: { line1: "Sand is on the road. Carts can't get through.", line2: 'Run Kurmi to earn Naira.', go: 'Run Kurmi' },
    lightsOut: { line1: 'Lamps are out on this road.', line2: 'Run the Harmattan Road for Power.', go: 'Run the Harmattan Road' },
    slowInternet: { line1: 'Slow internet here.', line2: 'Run the Harmattan Road for Tech.', go: 'Run the Harmattan Road' },
  },
  /** 6.2: the Dry taps card. Before Dawanau is cleared: clear the streets; after: the hall. */
  dryTaps: {
    line1: 'The taps are dry. Rusty Borehole is clogged with dust.',
    clear: 'Clear Kurmi, Kofar Mata and Dawanau to reach Borehole Hall.',
    toHall: 'Go to Borehole Hall.',
    hall: 'Go to Borehole Hall',
    /** New: "Run Kurmi", "Run Kofar Mata", "Run Dawanau": the next street to clear (1 to 3). */
    run: (n: number) => `Run ${['Kurmi', 'Kofar Mata', 'Dawanau'][n - 1] ?? 'Kurmi'}`,
  },
  /** 6.2: each fix's Mission complete line, shown as the build goes up (2 s). */
  built: {
    sandyRoad: 'Clean road here. Carts and buses are moving.',
    leather: 'The leather stalls are open here.',
    lightsOut: 'The lamps are on. The market stays open late.',
    slowInternet: 'Fast internet here. Traders can call far away.',
    dye: 'The dye pits are busy here.',
    grain: 'The grain market is open here.',
    pyramid: 'The groundnut pyramid is back! Long ago, Kano piled sacks as tall as hills.',
    /** Back in the city after the first Borehole Hall win (once). */
    dryTaps: 'The water is flowing. Everyone can fill up.',
  },
  /** Part 8, Not enough. */
  earnRun: 'Run Kurmi to earn more.',
  earnLane: (bucket: 'power' | 'tech') => `Run the Harmattan Road to earn ${bucket === 'power' ? 'Power' : 'Tech'}.`,
  /** W18 with Kano's names: the tax places as the collect line says them. */
  placeName: { leather: 'the leather stalls', dye: 'the dye pits', grain: 'the grain market', pyramid: 'the groundnut pyramid' },
  /** 6.3: once, after the first collect in Kano (hint `taxKano`). */
  hintTax: 'Busy shops pay a small tax. Kano uses it to fix more.',
  /** New, as Ogun's: the first visit's hint. */
  hintWalk: 'Tap where you want to go. Walk onto a board to pay.',
  hintWalkKeys: 'Use the arrow keys to walk. Walk onto a board to pay.',
  /** 6.4: Kano's boom card. */
  boom: {
    heading: 'Kano is booming!',
    body: 'New shops are opening. More traders are coming to Kano.',
    cog: "Kano's cog is turning on Nigeria's wheel!",
    go: 'See Kano',
  },
  /** 6.4: Kano's challenge road (ogun.md 6.5 shape). */
  road: {
    toOgun: 'To Ogun',
    toOgunLine: 'The road back to Ogun.',
    goOgun: 'Go to Ogun',
    lane: 'Harmattan Road',
    laneLines: { lightsOut: 'Lamps are out on this road.', slowInternet: 'Slow internet here.', none: 'Lamps on and fast internet here.' },
    laneGo: 'Run the Harmattan Road',
    picHall: 'Borehole Hall, with its water tank.',
    /** As Ogun's: [before the win line 1, after line 1, before line 2, after line 2]. */
    hallLines: ['The taps are dry. Rusty Borehole is clogged with dust.', 'The water is flowing. Kano is switched on.', 'A win brings ₦15 and gets the water flowing.', 'A win brings ₦15.'] as readonly string[],
    earns: 'Earns Naira.',
    wayOn: 'The way on',
    wayOnLine: 'More of Nigeria',
    streetLines: [
      ['The leather market by the gate.', 'Kurmi is moving again.'],
      ['The dye pits.', 'Kofar Mata is moving again.'],
      ['The grain market.', 'Dawanau is moving again.'],
    ] as readonly (readonly string[])[],
  },
} as const;
