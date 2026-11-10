# Assets

Owner: art. Every picture below is drawn in code on a canvas (no image files), so it adds only a few KB of script to the first load. No outside assets, fonts or sounds are used. The text uses the phone's own sans-serif font.

| Asset | File | Source | Licence |
|---|---|---|---|
| Shared colours | src/art/palette.ts | Drawn in code, original | No outside licence |
| Hero layers: 5 skin tones, hair (Low cut, Afro, Braids, Gele, Headscarf), outfits (Green jersey, Ankara, School uniform, Agbada, Kaftan); run, jump, stand, blink, amala glow, corn speed lines | src/art/hero.ts | Drawn in code, original | No outside licence |
| Sky, sun, clouds, far skyline | src/art/street.ts | Drawn in code, original | No outside licence |
| Shop row with made-up signs (MAMA PUT, VULCANIZER, POS HERE, PURE WATER, TAILOR, PROVISIONS, PHONE REPAIRS, BARBING SALON) and small shop pictures; cached to one offscreen canvas | src/art/street.ts | Drawn in code, original | No outside licence |
| Yellow bus (passing and parked), road with lane marks, potholes, market stall roofs, bus stop (unlit and lit) | src/art/street.ts | Drawn in code, original | No outside licence |
| Goat (walking, and running away unhurt with a "MEEH!" bubble), rolling tyre | src/art/hazards.ts | Drawn in code, original | No outside licence |
| Kobo coin (spinning), roasted corn, garri sugar and epa, amala gbegiri and ewedu, HUD food icons, pickup sparkle, shield bubble and pop | src/art/items.ts | Drawn in code, original | No outside licence |
| General Go-Slow (idle, hit, honk attack, defeat), "POOO!" honk cloud, dust pop, GO light platform (off, lit, done), hit counter | src/art/boss.ts | Drawn in code, original | No outside licence |
| Art gallery (debug view of every asset) | src/art/gallery.ts | Drawn in code, original | No outside licence |
| Slice 2 gallery pages (?gallery=1 and up; &t=1.5 holds the time) | src/art/gallery2.ts | Drawn in code, original | No outside licence |
| Phone buttons: Back, Forward (circle, triangle), Jump (pill, chevron, word), Go down and Go up (pill, bucket, arrow), each with a pressed look; as SVG for HTML buttons and as canvas drawing | src/art/controls.ts | Drawn in code, original | No outside licence |
| Hero walk, run with dust puff, skid on a turn (same rig, face, skins and hitbox) | src/art/hero.ts, src/art/dust.ts | Drawn in code, original | No outside licence |
| Hanging market crates: pale slatted wood, rope handles, one rope to a line on two wooden poles; stamps (coin stack, corn cob, cup, bowl); swing, open lid hanging down, kobo fan, food pop | src/art/crate.ts | Drawn in code, original | No outside licence |
| Village well: round plastered wall with chips showing brick, wooden frame with a small roof board, log roller, turning crank, rope and metal bucket; entrance (bucket, bobbing arrow) and exit (no bucket); back and front layers with a mouth clip; going down and up timelines; screen fade | src/art/well.ts | Drawn in code, original | No outside licence |
| Well store room: earth walls with layers and stones, beam, side posts, ceiling light holes, three hanging clay oil lamps with a soft flicker, clay pots, woven baskets, plank shelves, rope and bucket back up; garri parcel (leaf wrap, string, bow, glint) and its HUD icon; hero rope pose | src/art/wellRoom.ts, src/art/hero.ts | Drawn in code, original | No outside licence |
| Hero bodies (I1): Male and Female as Teen, Adult and Elder. Teen shorter and slimmer with rounder cheeks and slightly bigger eyes; Elder slight, standing tall, grey hair on Low cut, Afro and Braids (a grey lock under Gele and Headscarf), two short smile lines, and a short neat grey beard on elder men; Female slightly narrower shoulders and wider hips, one lash stroke per eye, gold studs. Every hair and outfit on every body; same rig, face, poses and hitbox | src/art/hero.ts | Drawn in code, original | No outside licence |
| I1 gallery pages (?gallery=6 line-up, 7 run cycles and moves, 8 elder and teen faces, 9 every body x hair x outfit) | src/art/galleryHeroes.ts | Drawn in code, original | No outside licence |
| Pavement and gutter strip, big pit cones, start fence (zinc sheets, posts, arrow board) with a parked bus, bus park (shelter, "BUS PARK" board, wall), big yellow market bus with roof rack and sliding door, bus end timeline | src/art/roadside.ts | Drawn in code, original | No outside licence |
| Market road (Street 2, midday): high sun and clouds; far market sheds with zinc roofs and umbrella tops; stall row with made-up signs (FABRICS, PEPPER AND TOMATOES, PROVISIONS, PHONE ACCESSORIES, TAILOR) and sign pictures: printed cloth lengths, woven baskets of pepper and tomatoes, plain tins and sacks, phone cases and cables, finished robes and a sewing machine; umbrella stands with yams, onions, plantain, garden eggs and oranges; passing keke; market stall roof platform. Sky, far sheds and stall row are cached at screen pixels (blitLayer) | src/art/market.ts | Drawn in code, original | No outside licence |
| Bus park road (Street 3, evening): purple to orange sky with a low sun; dusk skyline with a few lantern-lit windows and a plain lattice mast; park row with VULCANIZER (zinc lean-to, tyre piles, old drums, air compressor), SUYA SPOT (grill, coals, skewers, lantern, rising smoke), TICKETS kiosk, loading ramp, two parked market buses (plain, no writing), unlit street lamps, BATTERY CHARGING, BUKA (pots, curtain, benches), PHONE REPAIRS, and a blue road sign "GO-SLOW HALL" with an arrow pointing on; zinc shed roof platform. Cached at screen pixels | src/art/buspark.ts | Drawn in code, original | No outside licence |
| One call per street look (morning, market, evening) for the backdrop and the platform | src/art/backdrop.ts | Drawn in code, original | No outside licence |
| Rolling drum: plain blue metal drum on its side, seen a little from the side (round lid with two caps and a rim scuff that turn as it rolls, body with two raised hoops, a rust spot, speed lines); squash when landed on, bounce sparkle (clang ring, strike lines, sparkles), smash (dents flat, lid pops off, dust) | src/art/drum.ts | Drawn in code, original | No outside licence |
| K1 gallery pages (?gallery=10 the three street looks, 11 the rolling drum next to the tyre) | src/art/galleryStreets.ts | Drawn in code, original | No outside licence |
| Go-Slow Hall (M1): our own made-up indoor motor park. Corrugated roof, steel roof truss, 8 hanging roof lamps (dark in the fight; on one by one at the finish, each with a light cone, a floor pool and a short flash), pale block back wall with high louvre windows, pale blue steel columns with yellow and black striped feet, an open roller-shutter door on the left showing the street outside, the "GO-SLOW HALL" name board over it, big ribbed steel doors on the right behind the jam (shut, swinging, open), concrete floor with a yellow lane line, white dashes and five painted arrows (dull, then lit warm yellow left to right), drain grate at the left wall, dark apron strip under the floor, cut walls with the hall's warm outside walls on wide screens; the cone line with a striped bar, and the cones sliding aside; the kind finish timeline (doors, lamps, cones, arrows). Back and outside layers cached at screen pixels (blitLayer) | src/art/hall.ts | Drawn in code, original | No outside licence |
| High honk (M1): a long, thin, pale blue cloud with pointed ends and "PEEP!", chevron sound lines; General Go-Slow's high-throw warning (honk marks round the light instead of at the heap) | src/art/boss.ts | Drawn in code, original | No outside licence |
| M1 gallery pages (?gallery=12 the hall in the fight on a wide screen with close-ups, 13 the kind finish frame by frame, reduced motion, narrowest screen) | src/art/galleryHall.ts | Drawn in code, original | No outside licence |
| Nigeria's wheel (N1): a big wheel with a hub cog, six spokes and a rim, and 37 small cogs on the rim, one for each of the 36 states and the FCT, A to Z clockwise from the top, every name beside its cog pointing out from the middle. Grey cog (still, grey, plain name) and working cog (warm amber, a little bigger, a white tick, bold name, turning slowly; no turning under reduced motion). SVG markup for the HTML wheel screen | src/art/wheel.ts | Drawn in code, original | No outside licence |
| Streets cards (N1): card look for open, done and locked (face, edge, word colours; locked has a dashed edge), a pale little picture behind the words for each card (morning street, market, evening bus park, Go-Slow Hall; grey when locked), done badge (amber disc, white tick), locked badge (grey padlock); music and music-off icons (two joined notes, and a slash) | src/art/cards.ts | Drawn in code, original | No outside licence |
| Fixed street look (N1): after Lagos is switched on, each street gets tall street lamps lit (morning and market), the bus park's own two lamps lit, a warm glow and a row of small bulbs on every sign board, bunting strung from lamp to lamp, and fresh road paint (smooth dark tar, bright kerb line with a white line under it, longer lane marks). Same layout and holes. Cached at screen pixels (blitLayer) | src/art/fixedLook.ts, src/art/street.ts (drawRoad fresh), src/art/backdrop.ts (fixed flag) | Drawn in code, original | No outside licence |
| N1 gallery: gallery/n1.html (dev server only, not in the build): ?view=streets the Streets screen mock, ?view=wheel the wheel screen mock, ?view=parts every card look, badge, music icon and the wheel at 0, 1, 13 and 37 working; &still holds the wheel. ?gallery=14 the three streets as now and fixed | src/art/galleryN1.ts, gallery/n1.html, src/art/galleryStreets.ts | Drawn in code, original | No outside licence |

## Originality check

- No red caps, plumbers, pipes, question blocks, mushrooms, or shapes from any other game.
- No real people, brands or logos. Shop names are everyday words. The bus is plain yellow with black stripes and no writing.
- General Go-Slow is a traffic light and a heap of cars: no uniform, cap, medals, flag, party colours, and no faces in the cars.
- Slice 2 (R8 list checked): no run button (buttons are plain arrows and "Jump"); the street ends at a bus park with a market bus (roof rack, sliding door), never a flagpole or castle; the start is a zinc compound fence. The end bus was reshaped from a long rounded body to a boxy van with a sloped nose and roof load, so it does not read as a school bus.
- Crates (R5): orange-brown wood, never yellow or gold (a unit test checks every colour); no "?" or "!" or any writing; no rivets or brick row; always hung by a rope. The first kobo stamp (rings) looked like a target, so it became a small stack of coins. The open lid hangs down the side, so an empty crate reads as "opened", not as a new block.
- Well (R4): rope, roller, crank and bucket on a short, wide plastered wall; never a pipe, tube or green cylinder, and no water anywhere (unit tests check for pipe green and water blue in the well and room colours). The going-down clicks step by a whole tone, never by the semitone or fourth steps of famous warp or item sounds. The first brick chips looked like beans, so they became ragged holes showing bricks.
- Streets 2 and 3 (K1): no pipes, "?" blocks, flagpoles or castles; the bus park is a real-life motor park edge (kiosk, ramp, parked vans, lamp posts, a road sign), not a level from any game. Parked buses carry no writing, no company name and no logo, and are a softer yellow than the bus the hero boards, so nobody tries to board them. Shop signs are everyday words; "GO-SLOW HALL" is our own made-up place.
- Drum (K1): plain, no writing, no brand, no hazard symbols. It tells apart from the tyre by shape: taller, a long body with ridges and a lid, where the tyre is round and black with tread (a unit test checks the box and that it draws no text).
- Go-Slow Hall (M1, R6): a roofed motor park, never a temple or a castle. No domes, towers, arches, steeples, crosses, crescents, carved figures, masquerades or any faith's sign; no castle bricks (the wall is plain painted blockwork in pale cream and blue), no lava or fire, no bridge, no axe, no flagpole, no boss platform over a pit. Not modelled on any real building or park. The only writing is our own name "GO-SLOW HALL"; no company, party or brand names. General Go-Slow is still a traffic light and a heap of plain cars, and the finish is kind: the light smiles, the cars drive home through the doors, the lamps come on. The high honk is our own long flat cloud with "PEEP!", told apart from the round "POOO!" by shape, word and colour (unit tests check the shape and words).
- Nigeria's wheel (N1): our own cog wheel, not any game's map, star map, level select or progress wheel; no stars, no flags, no crest, no map outline of Nigeria, no coat of arms. Cogs are plain eight-tooth gears.
- Streets cards (N1): plain rounded cards with our own small street pictures; the badges are a plain tick in a disc and a plain padlock, the music icon is two joined notes. No stars, no "world" or level-select look from any game.
- Fixed look (N1): ordinary street lamps, bulbs on sign boards and triangle bunting, as on any festive Nigerian street; nothing from a game.
- Store room: lamp-lit earth, never blue bricks or any game's underground. A dry, plainly magic bonus place: nobody is stuck, nothing suggests climbing into a real well.

## Pride check (things we chose not to do)

- Every skin tone gets the same face: white eyes with a dark pupil and a white smile, so features read on the darkest tone too. No tone is used for a "baddie".
- Gele was reshaped to a wide, swept, pleated wrap so it does not look like a crown or a church hat. The agbada chest embroidery is loops, not a cross, so it carries no faith sign.
- Headscarf is a soft wrap shown as a normal, proud choice, never a costume.
- Heroes (I1): no age, gender or skin is drawn as a joke. Elders stand tall, run and jump like everyone, and carry no stick; in the short landing squash an elder's back stays straighter, so they never look bent over. Elder grey is a calm silver, not white or wild, and the beard is short and neat. Teens are teen-sized (46 of 50 u, head 96 percent), not small children. Female differs only in everyday ways (shoulders, hips, one lash, studs), with no lipstick, no body exaggeration and the same face, smile and moves. Every hair and outfit is open to every hero.
- Market road (K1): goods from across the country side by side (yams, onions, plantain, garden eggs, oranges, pepper and tomatoes, printed cloth, finished robes), stalls neat, bright and busy. No traders are drawn, so no job or person is a joke.
- Umbrellas (K1, flag for po): market umbrellas are everyday, but a party logo is also an umbrella. Ours never use green, white and red together (no green at all; a unit test checks the colours), and carry no writing or symbol.
- Bus park road (K1): the street lamps are drawn off, to be lit by the fixed look (N1). The bus park is busy and working (suya, buka, tickets, charging), not run-down or dirty.
- Go-Slow Hall (M1): traffic is the problem, never the drivers: no drivers are drawn, the cars have no faces, and the jam just gives up and drives home. The hall is clean, solid and well built, a place that works once the jam clears, not a picture of Lagos as broken. Its colours carry no green (the go lights are the only green in the room; a unit test checks), and no party colour set. Flag for po: the high honk word "PEEP!" is a car horn sound, not a word from any language, so it mocks no accent.
- Nigeria's wheel (N1): every state and the FCT has the same cog, the same size and the same letters; none is left out, none is bigger, brighter or placed first except by A to Z order, and only the player's own progress changes a cog. Names are checked word for word against S2.8 by a unit test (Akwa Ibom, Cross River, FCT and Nasarawa included). A grey cog means "not working yet" in the game (no streets built yet), never that a state is bad: the words say "More states are coming soon."
- Wheel colours, how they were chosen: the working colour is our own warm amber, the same family as the kobo and lamp glow, so it reads as "light and money coming in", not as a side. Everything else is warm grey, cream and our dark ink. The wheel uses no green, no red and no blue at all (a unit test checks every colour), so no two of its colours can make any party's set (green, white and red; green, white and blue; red, white and blue and so on) or the national flag, and it carries no symbol. Amber is not used as a party's main colour together with any second strong colour here.
- Bunting (N1): amber, purple, sky blue, pink and orange, from our umbrella colours; no green, no white and no red (a unit test checks), so a string of flags can never read as a party's colours or the national flag. No writing or symbol on any flag.
- Alausa (street 1, N1): the fixed look adds only lamps, lit shop signs, bunting and road paint. No government building, secretariat, crest, flag, office sign, uniform or official anywhere on the street, and no words at all are added (a unit test checks the fixed look draws no text). The fixed look is a party for the place, not proof it was broken.
- Computer Village (street 2, N1): the stalls keep their made-up everyday signs (PHONE ACCESSORIES and the rest); the phone stall's picture is a plain phone and cable with no logo, no bitten fruit, no letter mark and no brand colours. No sign or picture about fake phones or cheats. The fixed look adds no writing.
- Card pictures (N1): every street gets a bright, proud little picture; the locked card is the same picture in grey, never a broken or dirty version.
- Flag for po: the wheel at the smallest screen (320 x 240) is about 190 px wide, so the state names are about 7 to 8 px tall there, small but all shown, all the same size. At 932 x 430 they are about 14 px. Screen readers get the full list (S2.8). If po or qa find 8 px too small, the fix is in the wheel screen's layout (give the wheel the full card height), not in dropping names.
- The goat is never hurt: it smiles and trots off. The boss is a problem, not a tribe, job or official, and its defeat is a happy green light.

## Sound

All sounds are made in code with WebAudio in src/engine/sound.ts: original, no sound files, no outside licence. Soft sine and triangle tones plus a little filtered hiss, each under half a second (the win tune is about 1.5 s). Nothing plays until the first tap, and the sound button turns every one off.

| Sound | What it is |
|---|---|
| jump / airJump | Talking-drum style pitch bend, up then settling; the air jump is higher |
| kobo | Shekere-style hiss tick with one soft high pling that dips |
| food | "Yum" drum bend up and down, then a small sparkle |
| bounce | Springy sine boing |
| meeh | Friendly, wobbly two-part goat bleat |
| smash | Soft thump, dust puff, tiny ping |
| hit | One sagging "oof" bend |
| shieldPop | Bubble pop: quick rise and a tick |
| fall | Drip then puddle splash |
| checkpoint | One bright bell ding at the bus stop |
| tick | Woodblock tick as a food wears off |
| gameOver | A dip, then a hopeful lift ("try again") |
| arena | Low two-tone bus-style horn, "pa-paaam" (no real horn copied) |
| honk | Boss honk-cloud throw: one sagging two-tone "POOO" |
| greenHit | Drum knock and bright ding when landing on the green light |
| bossWin | Happy "pom pom" from the cars, then our own short highlife-style tune |
| runStart | Soft dust whoosh: low hiss over a faint low swell |
| skid | Short gritty scuff: two rough hisses and a low drag |
| busBoard | Door hiss, then our "pa-paam" horn |
| crateHit | Hollow wooden "tok", then a soft rope creak |
| crateEmpty | Duller, lower "tok", no creak |
| crateKobo | Our kobo pling three times quickly, each a semitone higher (no chime run) |
| cratePop | Soft round pop as a food comes out |
| wellDown | Wooden crank clicks, a whole tone lower each time, under a slow rope creak |
| wellUp | The same clicks, a whole tone higher each time |
| roomThump | Soft hollow thump with two quiet echoes |
| parcel | Warm two-note "got it", up a fifth, over a low hum |
| drumWake | The drum wakes: a low hollow "dum", then a soft rolling rumble (four low knocks getting quieter over a low hiss) |
| drumBounce | Landed on: a deep metal "dong" (a low body note with two bright, out-of-tune metal partials) and a short strike click |
| highHonk | High honk throw: a thin, high two-tone "pee-PEEP" (two soft triangles a minor third apart, a short toot then a longer one that lifts a little), far above the low sawtooth "POOO" |
| hallLamp | A roof lamp coming on: a small switch click, then a soft low electric hum that fades (played once per lamp, 0.15 s apart) |
| cogRatchet | A cog starting to turn (N1): four quick, dry ratchet clicks that rock between two close pitches (never a run up or down), each with a tiny tick of hiss, about 0.25 s |
| cogBell | Then a small bell (N1): one soft strike, a low body note with two out-of-tune bell partials (1 : 2.76 : 5.4), lower and rounder than the bus stop ding, about 0.6 s. Play it about 0.3 s after cogRatchet |
| lockedTuk | Tapping a locked street card (N1): one soft, low, short "tuk" like a knock on a closed door, never a buzzer or an error beep (the card's words say why) |

Avoided on purpose: the square-wave B5-to-E6 coin pair, rising square power-up runs, descending "lose" runs, and pipe or warp slides. tests/unit/sound-originality.test.ts checks the coin pair.

## Music

All music is made in code with WebAudio: our own melodies kept as note data in src/art/tunes.ts (one string of 16 steps per bar, easy to read), played by src/engine/music.ts. No music files, no outside licence. Instruments are built from oscillators and hiss: bass (triangle, low-pass), highlife guitar pluck (two slightly apart square waves, low-pass 1800 Hz, falling away fast so it never sounds like a chip tune), agogo bell (two sines at 1 : 2.7), shekere (high hiss), talking drum (sine bend), kalimba (sine and a soft third partial), horn stab (sawtooth, low-pass) and a soft drone. At most 6 notes at once; music sits well under the sound effects (music gain 0.3).

| Tune | Mood | Tempo | Key and chords |
|---|---|---|---|
| menu | warm, welcoming: the street tune, bass and guitar only, 70 percent volume | 96 | G major |
| street | bright, busy walking-to-work highlife; street 3 adds a second agogo line | 108, 112, 116 | G major. A: G C D G. B: Em C D D. 16 bars |
| well | cosy, secret, calm kalimba over a low drone | 84 | A minor pentatonic. Am G F G. 8 bars |
| hall | tense but funny and honky; walking bass, horn stabs on 2 and 4; a shaker joins after hit 1 and a second horn after hit 2 | 128, 134, 140 | E minor. Em Em C B. 8 bars |
| cleared | our "pa-paam" bus horn, then a 4-note guitar figure ending on G, about 2.5 s | 120 | G major |
| win | a broken run up the G major scale, an agogo flourish, a talking-drum "pom pom", a full G chord, about 5 s | 120 | G major |

Originality: tests/unit/music.test.ts checks every melody against the openings of well-known game tunes (platformer overworld, underground, star and castle themes, the falling-blocks theme, an adventure overworld theme) and our list of famous game sound motifs. While writing, the check caught three real near-copies, which were rewritten: the well and hall tunes each had the five-note turn "A C E D C" (and the hall a "C D C B A" turn) from the falling-blocks theme, and the win run was a plain major-scale run like an adventure theme's, so it now climbs in broken steps. The check cannot know Nigerian songs: qa should still listen for known Nigerian songs, adverts, anthems, hymns and chants (S2.9).
