/**
 * O6b: the words of Ogun's city, its challenge road and the Expressway (docs/ogun.md 6.2 to 6.6,
 * W18 with Ogun's names). They live in the lazy Ogun part, beside its art, so the first load
 * stays small (qa: search here and in src/screens/words.ts OGUN_WORDS). Words the note does not
 * give are gamedev's, marked "new" for designer to check. The Lagos city's own words (Sound,
 * Settings, Hero, zoom, the chips, Back) are WORDS.city's.
 */
import { formatMoney } from '../../game/money';

export const OGUN_CITY_WORDS = {
  heading: 'Ogun',
  /** New: the map picture's spoken name. */
  map: 'Ogun from above. Tap where you want to go.',
  /** Board names on the chalk boards (new: "Water pump"; the rest as 6.2). */
  board: {
    potholes: 'New road',
    adire: 'Adire market',
    dryTaps: 'Water pump',
    lightsOut: 'Lamps',
    slowInternet: 'Mast',
    mill: 'Garri mill',
    kola: 'Kola market',
  },
  /** Spoken pin names once fixed (new). */
  fixedName: { potholes: 'New road', dryTaps: 'Water on', lightsOut: 'Lamps on', slowInternet: 'Fast internet', badRoad: 'The gateway' },
  /** 6.2: the problem cards. */
  cards: {
    potholes: { line1: "Potholes here. Buses can't get through.", line2: 'Run Ota to earn Naira.', go: 'Run Ota' },
    dryTaps: { line1: 'The taps are dry. The pump needs Power.', line2: 'Run the Expressway to collect Power.', go: 'Run the Expressway' },
    lightsOut: { line1: 'Lamps are out on this road.', line2: 'Run the Expressway for Power.', go: 'Run the Expressway' },
    slowInternet: { line1: 'Slow internet here.', line2: 'Run the Expressway for Tech.', go: 'Run the Expressway' },
  },
  /** OG-R37: the Bad road card (the gateway). Before Sagamu is cleared: clear the streets; after: the hall. */
  badRoad: {
    line1: 'King Pothole is blocking the gateway.',
    clear: 'Clear Ota, Abeokuta and Sagamu to reach Pothole Hall.',
    toHall: 'Go to Pothole Hall.',
    hall: 'Go to Pothole Hall',
    /** "Run Ota", "Run Abeokuta", "Run Sagamu": the next street to clear (1 to 3). */
    run: (n: number) => `Run ${['Ota', 'Abeokuta', 'Sagamu'][n - 1] ?? 'Ota'}`,
  },
  /** 6.2: each fix's Mission complete line, shown as the build goes up (2 s). */
  built: {
    potholes: 'New road here. Trucks and buses are moving.',
    adire: 'The adire market is open here.',
    dryTaps: 'The pump is on. Water for everyone.',
    lightsOut: 'The lamps are on. The road is safe to drive.',
    slowInternet: 'Fast internet here. The factories are busy.',
    mill: 'The garri mill is open here.',
    kola: 'The kola market is open here.',
  },
  /** W8 Not enough: Ogun's challenges to earn more (new, as Lagos's). */
  earnRun: 'Run Ota to earn more.',
  /** W18 with Ogun's names: the tax places as the collect line says them. */
  placeName: { adire: 'the adire market', mill: 'the garri mill', kola: 'the kola market' },
  /** W18: once, after the first collect in Ogun (hint id `taxOgun`). */
  hintTax: 'Busy shops pay a small tax. Ogun uses it to fix more.',
  /** New: the first visit's hint. */
  hintWalk: 'Tap where you want to go. Walk onto a board to pay.',
  hintWalkKeys: 'Use the arrow keys to walk. Walk onto a board to pay.',
  /** 6.4: Ogun's boom card. */
  boom: {
    heading: 'Ogun is booming!',
    body: 'New buildings are going up. More people are coming through the gateway, and they need more.',
    cog: "Ogun's cog is turning on Nigeria's wheel!",
    go: 'See Ogun',
  },
  /** The border market's coming-soon pin and card (OG-R7). */
  border: { word: 'Border market', line: 'A busy market road. Coming soon.' },
  /** After a run from Ogun: "You brought ₦12 home." */
  brought: (kobo: number) => `You brought ${formatMoney(kobo)} home.`,
  /** 6.5: Ogun's challenge road. */
  road: {
    heading: 'Challenge road',
    home: 'Ogun',
    toLagos: 'To Lagos',
    toLagosLine: 'The road back to Lagos.',
    goLagos: 'Go to Lagos',
    expressway: 'Expressway',
    expresswayLines: {
      dryTaps: 'The taps are dry. The pump needs Power.',
      lightsOut: 'Lamps are out on this road.',
      slowInternet: 'Slow internet here.',
      none: 'Water, lamps and internet are on.',
    },
    expresswayGo: 'Run the Expressway',
    hallWon: 'The gateway is open. Play it again any time.',
    /** New: Ota, Abeokuta and Sagamu's line 2 (Lagos's says "for Lagos"; the wallet is shared). */
    earns: 'Earns Naira.',
    wayOn: 'The way on',
    wayOnLine: 'The road north to the rest of Nigeria is still being built.',
    moreOfNigeria: 'More of Nigeria',
    border: 'Border market',
    borderLine: 'A busy market road. Coming soon.',
    later: 'Later',
    otaLines: ['The gateway road from Lagos.', 'Ota is moving again.'] as readonly string[],
    abeokutaLines: ['The adire yards.', 'Abeokuta is moving again.'] as readonly string[],
    sagamuLines: ['The interchange.', 'Sagamu is moving again.'] as readonly string[],
  },
} as const;
