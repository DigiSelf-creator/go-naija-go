/**
 * Every word a player sees on the menu screens, exactly as in docs/design.md
 * (Hero builder, Screens), approved by po. Change words there first, then here.
 */
import { formatMoney } from '../game/money';

/** The game name is one setting (docs/questions.md Q1). */
export const GAME_NAME = 'Gbese!';

/** The title line (City choice 10, Tp 9 Nov 2026); the moving intro ends on the same words. */
const TAGLINE = 'Build up Lagos. Get Nigeria working.';

/**
 * O1b1: when the Ogun part cannot load (src/worlds/load.ts). `noInternet` is ogun.md part 8's
 * download card line; `broken` (a missing or damaged file) is gamedev's draft for designer to check.
 */
export const WORLD_PART_WORDS = {
  noInternet: 'Ogun needs the internet once to download. Lagos still works with no internet.',
  broken: 'Ogun could not open just now. Lagos still works. Try again later.',
};

export const WORDS = {
  title: {
    /** City choice 10 (Tp, 9 Nov 2026). */
    tagline: TAGLINE,
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
    /** style.md 1.2 rule 4 "Short screens": what the game over switch shows on a screen 300 px tall or less. Its spoken name stays `gentle`. */
    gentleShortOver: 'Gentle mode',
    /** Settings: the switch reads like Sound ("Sound: on" and a tick), at every size. Its spoken name stays `gentle`. */
    gentleOff: 'Gentle mode: off',
    gentleOn: 'Gentle mode: on',
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
  /** U1 (decision 52): the banner when a new version of the game is ready. */
  update: {
    ready: 'New version ready. Tap to update.',
  },
  /** S2.10 Pause: four buttons and the Sound and Music switches. */
  pause: {
    heading: 'Paused',
    keepPlaying: 'Keep playing',
    restart: 'Start again',
    road: 'Challenge road',
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
    road: 'Challenge road',
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
    road: 'Challenge road',
  },
  /** S2.10 Win, after Go-Slow Hall. No kobo here (po M4 note). */
  win: {
    heading: 'Lagos is switched on!',
    text: (lives: number) => `You cleared General Go-Slow with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`,
    cog: (n: number) => `Lagos's cog is turning: ${n} of 37.`,
    more: 'More of Nigeria is coming soon.',
    wheel: "See Nigeria's wheel",
    playAgain: 'Play again',
    road: 'Challenge road',
  },
  /** S3e0: the challenge road, its stops and the stop card (docs/design.md S3e0 parts 3 to 5, 9). */
  road: {
    heading: 'Challenge road',
    list: 'Challenge road stops',
    home: 'Home',
    back: 'Back',
    hint: 'Tap a stop to see it.',
    next: 'Next',
    locked: 'Locked',
    open: 'Ready to play',
    done: 'Done \u2713',
    soon: 'Coming soon',
    built: 'Built \u2713',
    moreSoon: 'More soon',
    best: (b: string) => `Best: ${b}`,
    yourBest: (b: string) => `Your best: ${b}`,
    metres: (m: number) => `${m.toLocaleString('en-GB')} m`,
    toGo: (n: number) => `Fixes to go: ${n}`,
    stop: (n: number) => `Stop ${n}`,
    side: 'Side road',
    lane: 'Lane run',
    hall: 'Go-Slow Hall',
    ferry: 'Ferry',
    theFerry: 'The ferry',
    finish: (name: string) => `Finish ${name} first.`,
    run: (name: string) => `Run ${name}`,
    toHall: 'Go to Go-Slow Hall',
    parcel: 'You have a garri parcel.',
    earns: 'Earns Naira for Lagos.',
    earnsAll: 'Earns Naira, Power and Tech.',
    /** CR-Q1 a: "A win pays for the New road (\u20a610)." or "(\u20a66 left)". */
    pays: (fix: string, price: string, part: boolean) => `A win pays for the ${fix} (${price}${part ? ' left' : ''}).`,
    road: ['Potholes on this road.', 'New road here. Buses are moving again.'],
    cv: ['The internet is slow here.', 'Fast internet here. Shops are busy.', 'Earns Naira. Tech comes from the Lane run.'],
    ikeja: ['Lamps are out here.', 'The lamps are on. The street is awake.', 'Earns Naira. Power comes from the Lane run.'],
    hallLines: ['General Go-Slow is jamming the hall.', 'The hall is moving. Lagos is switched on.', 'A win brings \u20a615 and switches Lagos on.', 'A win brings \u20a615 for Lagos.'],
    bothOn: 'Lamps on and fast internet here.',
    ferryLines: ['A ferry jetty is coming to this shore.', 'The jetty is built. The ferry is here!', 'New stops over the water are coming soon.'],
    ferryBoom: (n: number) => `It is built when Lagos booms: ${n} of 20.`,
    /** Spoken (part 9). */
    sayBest: (b: string) => `Best ${b}.`,
    sayMetres: (m: number) => `${m} metres`,
    saySoon: (n: number) => `Coming soon. Fixes to go: ${n}.`,
    sayBuilt: 'Built. More stops coming soon.',
    pic: (name: string) => `Seen from above. A stop sign says ${name}. Your hero is getting on a danfo.`,
    picHall: 'Go-Slow Hall, with its traffic lights.',
    sound: 'Sound',
    left: 'More road to the left',
    right: 'More road to the right',
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
    /**
     * One per beat, word for word; the moving intro shows them as subtitles (a2.12). Caption 5
     * ends with "That hero is you." and caption 6 with the title's line (a unit test checks).
     */
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
    road: 'Challenge road',
    /** CO3: shown for a moment while the road's part opens (gamedev's words, for designer to check). */
    roadOpening: 'Opening the road...',
    /** S3e0 part 7: the problem cards' small button. */
    seeStop: 'See the stop',
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
    hintCollect: 'Mama Put pays a small tax! Walk over to collect it.',
    /** W18 (decision 71): once, in the hint bar, right after the first collect (hint id `tax`). */
    hintTax: 'Busy shops pay a small tax. Lagos uses it to fix more.',
    /** 5W W2: the problem card's button that walks the hero to the board. */
    walkThere: 'Walk there',
    /** 5W W8 Not enough card. */
    need: (price: string) => `You need ${price} for this.`,
    earnRun: 'Run Alausa to earn more.',
    /** W14 Q2: names the bucket ("Lane runs earn Power." / "Lane runs earn Tech."). */
    earnLane: (bucket: 'power' | 'tech') => `Lane runs earn ${bucket === 'power' ? 'Power' : 'Tech'}.`,
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
    /** W18 (decision 71): the tray bubble's label for a Naira place: "Tax 80 kobo", "Tax ₦1.20". */
    trayLabel: (money: string) => `Tax ${money}`,
    /** W18 Collect line (1.5 s): "Mama Put paid ₦1.20 tax!", "The market paid ₦2.40 tax!". */
    collectLine: (money: string, name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)} paid ${money} tax!`,
    /** W18 Collect, spoken, with spoken money: "Mama Put paid 1 naira 20 kobo tax." */
    collectSpoken: (money: string, name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)} paid ${money} tax.`,
    /** W18 Spoken: "Tax from Mama Put: 1 naira 20 kobo. Full." ("the market" stays lower case mid-line). */
    traySpoken: (name: string, money: string, full: boolean) => `Tax from ${name}: ${money}.${full ? ' Full.' : ''}`,
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
    /** city.md (d), d8: the Booming meter you can see. */
    booming: 'Booming',
    meter: (n: number, of: number) => `${n} of ${of}`,
    meterSpoken: (n: number, of: number) => `Booming meter. ${n} of ${of} to the next boom.`,
    stepLine: 'Lagos is getting brighter!',
    stepSpoken: 'Lagos is getting brighter.',
    hintBright: 'Each fix makes Lagos brighter!',
    skip: 'Tap to skip',
    skipKeys: 'Press Space to skip',
    boom: {
      heading: 'Lagos is booming!',
      body: 'New buildings are going up. More people are coming, and they need more.',
      cog: "Lagos's cog is turning on Nigeria's wheel!",
      go: 'See Lagos',
    },
    /** d4, d8: the coming-soon pins and their cards. */
    soon: {
      goSlow: 'The traffic is stuck here.',
      crowdedBuses: 'More people need buses here.',
      line: 'Coming soon.',
      spoken: (word: string) => `${word}, coming soon.`,
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
      },
      slowInternet: {
        line1: 'The internet is slow here.',
        line2: 'Fixing it costs Tech 6.',
        go: 'Lane run',
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
  /** S3f0 the lane run (docs/design.md S3f0 parts 3, 14 and 15). */
  lane: {
    count: ['3', '2', '1'] as readonly string[],
    go: 'Go!',
    /** The buttons' spoken names (part 3). */
    buttons: { left: 'Left lane', right: 'Right lane', jump: 'Jump', slide: 'Slide' },
    /** Settings and the lane Pause card. */
    buttonsOn: 'Buttons instead of swipes: on',
    buttonsOff: 'Buttons instead of swipes: off',
    /** Part 25.9 (decision 70): tilt to steer. The switch's spoken name is `tiltName`, with on or off. */
    tiltName: 'Tilt to steer',
    tiltOff: 'Tilt to steer: off',
    tiltOn: 'Tilt to steer: on',
    tiltPrivacy: 'Tilt is only used to steer. Nothing is saved or sent.',
    /** iPhone only, under the switch and on the offer card. */
    tiltAskFirst: 'Your phone will ask first. Tap Allow.',
    tiltDenied: 'Your phone said no to tilt, so swipes are on.',
    /** iPhone Safari. */
    tiltRetry: 'To try again, close the game and open it again.',
    /** iPhone store app, only if iOS will not ask again. "Gbese!" is the app name (decision 39). */
    tiltRetryApp: "To try again, allow Motion for Gbese! in your phone's Settings.",
    tiltLost: 'Tilt is not working. Swipe to change lane.',
    /** Under "3, 2, 1" with tilt on. */
    tiltHold: 'Hold your phone the way you like.',
    tiltOfferHeading: 'New: tilt your phone to change lane.',
    tiltOfferLine: 'You can still swipe to jump and slide.',
    tiltOfferYes: 'Try tilt',
    tiltOfferNo: 'No thanks',
    /** The polite spoken line when a run starts with tilt on (part 25.7). */
    tiltSpoken: 'Tilt your phone left or right to change lane. Swipe up to jump, down to slide.',
    tiltSpokenButtons: 'Tilt your phone left or right to change lane. Use Jump and Slide to jump and slide.',
    toGo: (m: number) => `To the bus stop: ${m} m`,
    toGoShort: (m: number) => `Bus stop: ${m} m`,
    /** After the goal: the distance run and the best (whole metres, with a thousands comma). */
    run: (m: number) => `${m.toLocaleString('en-GB')} m`,
    best: (m: number) => `Best: ${m.toLocaleString('en-GB')} m`,
    goalHeading: 'You made it to the bus stop!',
    takeHome: 'Take it home',
    keepRunning: 'Keep running for more',
    pauseHome: 'Back to Lagos',
    // S3f3: the HUD (parts 14 and 15).
    power: (n: number) => `Power ${n}`,
    tech: (n: number) => `Tech ${n}`,
    blackout: (m: number) => `Blackout: ${m} m behind`,
    blackoutNear: (m: number) => `Blackout: ${m} m behind!`,
    pushed: (m: number) => `+${m} m`,
    gained: (m: number) => `−${m} m`,
    /** Reduced motion: a chip counts up with a short "+1" (part 18); Naira says the money ("+₦0.10"). */
    plus: (n: string) => `+${n}`,
    /** The first lane run's start, the look back (part 14). */
    lookBack: 'The Blackout is switching off the lamps.',
    runToStop: 'Run to the bus stop!',
    /** The polite live line (part 14). */
    nearSpoken: (m: number) => `Blackout ${m} metres behind`,
    stopSpoken: 'Bus stop in 100 metres',
    // Food lines (part 11), in the hint bar.
    garri: 'Garri! A shield takes one stumble.',
    corn: 'Roasted corn! Corn toss for 12 s.',
    shieldTook: 'The shield took it!',
    // The cards (part 14). `got` is a haul in words: "₦10.20, Power 12 and Tech 7".
    got: (got: string) => `You got ${got}.`,
    caughtAt: (m: number) => `The Blackout caught up at ${m.toLocaleString('en-GB')} m.`,
    winSafe: (got: string) => `Your win is safe. You got ${got}.`,
    newBest: (m: number) => `New best: ${m.toLocaleString('en-GB')} m!`,
    caught: 'The Blackout caught up.',
    keepAll: (got: string) => `You keep it all: ${got}.`,
    stopWas: (m: number) => `The bus stop was ${m} m away.`,
    gentleOffer: 'Want more tries? Gentle mode keeps the Blackout further back.',
    gentleOff: 'Gentle mode: off',
    gentleOn: 'Gentle mode: on',
    runAgain: 'Run again',
    soFar: (got: string) => `So far: ${got}.`,
    /** City lines after "Take it home" (part 2) and the LR-Q2 hint. */
    broughtHome: (got: string) => `You brought ${got} home.`,
    alsoMast: 'The mast is ready to fix too. Walk onto its board.',
    alsoLamps: 'The lamps are ready to fix too. Walk onto their board.',
    /** Hints (part 8 and 14), once each until passed. Swipes, buttons, keys. */
    hints: {
      lane: ['Swipe left or right to change lane.', 'Tap ◀ or ▶ to change lane.', 'Press ← or → to change lane.'],
      jump: ['Swipe up to jump over the cones.', 'Tap ▲ to jump over the cones.', 'Press ↑ or Space to jump.'],
      slide: ['Swipe down to slide under the bar.', 'Tap ▼ to slide under the bar.', 'Press ↓ to slide under the bar.'],
      pothole: ['Jump over potholes.', 'Tap ▲ to jump over potholes.', 'Press ↑ to jump over potholes.'],
      crate: 'Run into crates to burst them.',
      power: 'Power pushes the Blackout back.',
      goat: 'Goats move out of your way. Meeh!',
      food: 'Run into the garri to eat it.',
      tech: 'Tech chips fix slow internet.',
      /** Part 25.8: the change-lane hint with tilt on (its own key, shown once). */
      tilt: 'Tilt your phone left or right to change lane.',
    } as Readonly<Record<string, string | readonly string[]>>,
  },
  /** S2.10 Well button: the words on it (touch, and a computer with keys), and its spoken name. */
  well: {
    down: 'Go down',
    downKeys: 'Go down (\u2193)',
    up: 'Go up',
    upKeys: 'Go up (Enter)',
  },
  /**
   * S3g1b, design.md "People everywhere" part 6: what people say in their bubbles (never read
   * out, no meaning). Each kind is split by language, and a line is picked language first, so
   * English, Pidgin, Yoruba, Hausa and Igbo get an equal share (decision 30, PE-R2).
   */
  folk: {
    /** Morning greetings (Alausa). */
    greetMorning: { en: ['Good morning!'], yo: ['Ẹ káàárọ̀!'], ha: ['Ina kwana!'], ig: ['Ụtụtụ ọma!'] },
    /** Greetings at any time. */
    greet: { en: ['Hello!'], pcm: ['How far?'], yo: ['Ẹ n lẹ́ o!'], ha: ['Sannu!'], ig: ['Ndewo!'] },
    /** Each street's traders call only their own lines. */
    traders: {
      alausa: ['Hot akara!', 'Fresh bread!'],
      village: ['Phone case here!', 'Charger, charger!', 'Fine cloth!', 'Fresh pepper!'],
      ikeja: ['Suya dey!', 'Tickets here!', 'Hot food!'],
    },
    /** A problem cleared, the bus stop. */
    cheers: { en: ['Well done!', 'Nice one!'], pcm: ['You do well!', 'Oya, go!', 'Ehen!'], yo: ['Ẹ kú iṣẹ́!'], ha: ['Madalla!'], ig: ['I meela!'] },
    /** The bus park. */
    bus: { pcm: ['Bus don come!'], en: ['Safe trip!'] },
    /** The well room's store keeper as the hero takes the garri parcel (PE-R4). */
    storeKeeper: 'For the boss. Go well!',
    /** The hall's door people on hit 1 and hit 2. */
    hallHit: ['Ehen!', 'Well done!'],
    /** The plain spelling, if a phone shows a tone mark as a box. */
    plain: { 'Ẹ káàárọ̀!': 'E kaaro!', 'Ụtụtụ ọma!': 'Ututu oma!', 'Ẹ n lẹ́ o!': 'E n le o!', 'Ẹ kú iṣẹ́!': 'E ku ise!' } as Readonly<Record<string, string>>,
  },
  /**
   * MS3b: quick missions (docs/missions.md part 2): the city's button. Every other mission word
   * (the run's, Lagos's five, the board's and the cards') loads with the board
   * (src/screens/boardWords.ts); Ogun's five are in the Ogun part.
   */
  missions: {
    button: 'Missions',
  },
} as const;

/**
 * O0a1: every Ogun word a player sees (docs/ogun.md parts 1, 3, 4, 5, 7 and 8; decisions 72 to
 * 82). Kept apart from WORDS so gamedev can hook each screen up in its own task (O1b, O2b to
 * O5b). "Ota" alone, never "Sango-Ota"; the rocks are never named; nothing religious.
 * The city from above, its challenge road and the Expressway run (part 6) come with O6.
 */
export const OGUN_WORDS = {
  /** Part 1.2: the Win screen after Go-Slow Hall gains a button and a new line. */
  lagosWin: {
    line: 'The road to Ogun is open. Ogun is the gateway to the rest of Nigeria.',
    /** The big button after the first hall win. */
    onToOgun: 'On to Ogun',
    /** The small button after later hall wins. */
    goToOgun: 'Go to Ogun',
  },
  /** Part 1.3 and 1.4: the bus ride and our own gateway arch. */
  busRide: {
    archFront: ['WELCOME TO OGUN', 'THE GATEWAY STATE'] as readonly string[],
    archBack: 'SAFE JOURNEY',
    skip: 'Skip',
    /** The picture's spoken name, going in and going home. */
    spokenIn: 'A yellow bus drives under the gateway arch into Ogun.',
    spokenOut: 'A yellow bus drives back under the arch to Lagos.',
    /** Settings switch (default on). */
    settingOn: 'Show the bus ride: on',
    settingOff: 'Show the bus ride: off',
  },
  /** Part 1.4: the arrival card, first visit only. */
  arrival: {
    heading: 'Welcome to Ogun, the Gateway State!',
    line1: 'The road to the rest of Nigeria runs through here.',
    line2: 'King Pothole has dug in at the gateway. Fix Ogun, and the way opens.',
    go: "Let's go",
  },
  /** Part 8 and 9.2 (OG-R6): the web download card. The size is "about 80 KB" everywhere. */
  download: {
    line1: 'Ogun is ready to download (about 80 KB).',
    line2: 'After this it plays with no internet.',
    go: 'Download',
    notNow: 'Not now',
    /** While it downloads (not in the note: added so the card never sits blank). */
    loading: 'Downloading Ogun...',
    noNet: 'Ogun needs the internet once to download. Lagos still works with no internet.',
    ok: 'OK',
  },
  /** Part 1.5: the Travel button and card. */
  travel: {
    button: 'Travel',
    heading: 'Where to?',
    lagos: 'Lagos',
    ogun: 'Ogun',
    here: 'You are here',
    back: 'Back',
    /** "Booming: 9 of 20", or "Booming: 20 of 20 ✓" once its cog turns. */
    booming: (n: number, turning: boolean) => `Booming: ${n} of 20${turning ? ' ✓' : ''}`,
    /** "Lagos. Booming 20 of 20. Cog turning." / "Ogun. Booming 4 of 20. You are here." */
    spoken: (name: string, n: number, turning: boolean, here: boolean) =>
      `${name}. Booming ${n} of 20.${turning ? ' Cog turning.' : ''}${here ? ' You are here.' : ''}`,
  },
  /** Part 1.2: the "To Ogun" stop on the Lagos challenge road, and its card. */
  toOgun: {
    stop: 'To Ogun',
    open: 'Open',
    /** Locked stop, line 3. */
    lockedShort: 'Win Go-Slow Hall',
    line: 'The road to Ogun is open.',
    go: 'Go to Ogun',
    locked: 'Win Go-Slow Hall to open the road to Ogun.',
  },
  /** Part 1.7: the wheel's rail lines and the "All names" list. */
  wheel: {
    lagosOnly: 'Win Go-Slow Hall to open the road to Ogun.',
    ogunNext: 'Next: Ogun, the Gateway State.',
    ogunTurning: 'Ogun is turning. Smooth out King Pothole to open the gateway.',
    gatewayOpen: 'The gateway is open. More states are coming soon.',
    /** In "All names", after the pennant (never colour alone). */
    listNext: 'Ogun, next',
  },
  /** O6b: the Expressway's Pause card button (Lagos's says "Back to Lagos"). */
  laneHome: 'Back to Ogun',
  /** Part 1.8: Settings, under "Saved on this phone". */
  saved: 'Your hero, Lagos and Ogun are saved on this phone.',
  /** Part 3.1 (decision 76): the three streets, in order along the road from Lagos. */
  streets: ['Ota', 'Abeokuta', 'Sagamu'] as readonly string[],
  /** Part 8: Out of lives on an Ogun street (the Lagos card's words, with Ogun). */
  gameOver: {
    text: (kobo: number) => `You keep ${formatMoney(kobo)} for Ogun. The street is still here. Try again!`,
    hallText: 'King Pothole is still blocking the gateway. Try again!',
  },
  /** Part 3: each street's hints, word for word as in its level file (35 characters or fewer). */
  hints: {
    ota: ['Mud! It slows you down.', 'Bus stop! Now you start here.', 'Big pit! Leave the mud, then run.', "Ikokore! Mud won't slow you now."],
    abeokuta: [
      'Rocks! Jump up from step to step.',
      'Water pothole! Jump over it too.',
      'Bus stop! Now you start here.',
      'Crack! It opens up. Jump over it.',
      'Ofada! Cracks stay shut now.',
    ],
    sagamu: ['Hopping gravel! Jump or bounce.', 'Two roads! Climb up, or stay low.', 'Bus stop! Now you start here.'],
  } as Readonly<Record<'ota' | 'abeokuta' | 'sagamu', readonly string[]>>,
  /** Toasts in the Ogun streets and the well room (parts 1.4, 3.7, 4.1). */
  toast: {
    /** As the hero passes under the arch on Ota (35 characters). */
    arch: 'Welcome to Ogun, the Gateway State!',
    ikokore: "Ikokore! Mud won't slow you for 12 seconds.",
    ofada: 'Ofada rice! Cracks stay shut for 12 seconds.',
    ikokoreWearingOff: 'Ikokore is wearing off!',
    ofadaWearingOff: 'Ofada is wearing off!',
    parcel: 'Ijebu garri parcel! Shield for the hall.',
  },
  /** HUD chips while a food works (icon, word, bar; never colour alone). */
  hud: {
    ikokore: (s: number) => `Ikokore ${s}`,
    ofada: (s: number) => `Ofada ${s}`,
  },
  /** Street cleared, carrying the Ijebu garri parcel; the card's hall button. */
  cleared: {
    parcel: 'Your Ijebu garri parcel is saved for Pothole Hall.',
    toHall: 'Go to Pothole Hall',
  },
  /**
   * Part 5: Pothole Hall. Only what the first load shows; the hall's own words (and Ogun's
   * bubbles, part 7) are in src/worlds/ogun/partWords.ts, in the lazy Ogun part (qa O2: size).
   */
  hall: {
    name: 'Pothole Hall',
    open: 'The gateway is open! Ogun is switched on!',
  },
  /** Part 5.5: the Win screen after Pothole Hall (the money line is the Lagos one). */
  win: {
    heading: 'Ogun is switched on!',
    line: 'The road through the gateway is smooth. The way to the rest of Nigeria is open.',
    takeHome: 'Take it home',
    /** The money line, as Lagos's cards: "You got ₦15." */
    money: (kobo: number) => `You got ${formatMoney(kobo)}.`,
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
  // O0a1: Ogun (docs/ogun.md parts 4 and 5).
  "Ikokore! Mud won't slow you for 12 seconds.": "Ikokore! Mud won't slow you!",
  'Ofada rice! Cracks stay shut for 12 seconds.': 'Ofada rice! Cracks stay shut!',
  'Ijebu garri parcel! Shield for the hall.': 'Ijebu garri! Shield for the hall.',
  'Your Ijebu garri parcel: the shield is on!': 'Ijebu garri parcel: shield on!',
  'King Pothole is blocking the gateway!': 'King Pothole blocks the gateway!',
  'Jump over King Pothole to drop it in.': 'Jump over him to drop it in.',
  "He's cross! Two gravel lumps now. Jump them both.": 'Two gravel lumps now! Jump both.',
  'The gateway is open! Ogun is switched on!': 'The gateway is open!',
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
