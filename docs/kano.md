# Kano, the Centre of Commerce (designer note, 24 Nov 2026; Tp answered 25 Nov, decision 91; po checked in K0b)

Owner: designer. Written for decision 89 (Tp, 24 Nov): the next state is Kano, the first in the North (decisions 81 and 82). This note is to Kano what docs/ogun.md is to Ogun, in the same shape but lean: it is the source for the K tasks in part 10. Where this note is silent, Ogun's rule holds with Kano's names (ogun.md parts 1 to 9), and Lagos's rules hold under that (city.md, design.md).

Sources: decisions 7, 13 to 19, 29 to 38, 42 to 48, 62, 64, 66 to 89; docs/ogun.md (all parts, the model); docs/city.md (2C, 2D, 5W, W3, W18); docs/design.md (S2.2 jump numbers, S2.5 well, S2.6 street rules, S2.7 hall, S2.8 saves and the wheel, "People everywhere"); docs/style.md (1.2 buttons, 1.3 shading, 1.6 haze, 1.8 crisp characters).

**Settled by Tp (decision 91, 25 Nov):** KN-Q1 to KN-Q4 all took answer a (street names Kurmi, Kofar Mata and Dawanau, a Kano speaker checks them; the boss Rusty Borehole; the foods kilishi and fura da nono; the Hausa lines are fine for the team's test link and are read by Tp or a Hausa speaker Tp trusts before the closed invited test). Lines that carry a KN-Q id are now settled. Small rulings KN-R1 to KN-R12 (part 11) follow the team's recommendation under decision 64 and are reported to Tp in one line each.

---

## 0. Kano in one line

The gateway in Ogun is open, so a long-distance bus carries you north through the savanna to Kano's old red city walls. Kano is the Centre of Commerce: markets, cloth, leather and grain from all over. But the Harmattan dust has choked the borehole, and Rusty Borehole has gone dry. Fix Kano's roads, lights and markets, get the water flowing, and Kano is switched on.

- **Who it is for:** every player who has beaten King Pothole (decision 82: the gateway road leads on from Ogun).
- **The one job:** show the North with pride, as busy and welcoming as Lagos and Ogun, and keep the earn-then-fix loop a 5 year old already knows (decision 86).
- **New things it teaches:** wind, springy cloth, dust whirls. One per street, never two at once.

---

## 1. The gateway road: from Ogun to Kano

### 1.1 When Kano opens

Kano opens the moment Pothole Hall is won for the first time. Nothing else is needed. A save that already has `states.ogun.hall.done` opens Kano at once.

### 1.2 Three ways in (the same three as Ogun, ogun.md 1.2)

1. **Pothole Hall Win screen.** First win: big **"On to Kano"** above "Take it home". Later wins: small "Go to Kano". The line under "Ogun is switched on!" stays; a second line is added: "The road north to Kano is open."
2. **Ogun's challenge road.** The "The way on" stop (ogun.md 6.5, "Coming soon") becomes **"To Kano"**: locked until Pothole Hall is won ("Win Pothole Hall"), then "Open". Card: "The road to Kano is open." / "Go to Kano". The Border market stop stays "Coming soon".
3. **Travel.** The Travel card gains a third button, "Kano" (1.5).

### 1.3 The long bus ride north (about 5 s first time, skippable)

A side view, drawn in code. Our own long-distance bus (cream and danfo yellow, no brand, no name on it) leaves Ogun under the arch's "SAFE JOURNEY" side, then drives right past: palm trees and red earth; a long bridge over a wide river (our own bridge, unnamed, never a real bridge's shape); open grassland with baobab trees and a few cattle far off grazing; then the soft gold Harmattan haze; then Kano's old red earth wall and our own gate (1.4). The sun crosses the sky once (a long trip, in 5 s). Our own short welcome tune (about 1.5 s: a kalangu-style talking drum and a light flute).

- Tap or Enter: jump to the end picture. "Skip" (44 x 44, top right) ends it at once.
- Reduced motion: the end picture only, the bus at the gate.
- Later trips: 2 s, only if "Show the bus ride" is on (Ogun's switch, one switch for every ride).
- Kano to Ogun or Lagos plays it the other way. Lagos to Kano plays one ride, not two (KN-R1).

### 1.4 The gate in the old wall (our own drawing, decision 19)

A thick, smooth red-brown earth wall with a rounded top, running off both edges, and in it one wide, round-topped gateway with two plain wooden doors standing open. Small raised triangles along the wall's top as our own simple pattern. In front of the gate, on its own post (never carved into the wall), a plain board: **"WELCOME TO KANO"** and under it, smaller, **"CENTRE OF COMMERCE"** (Kano's well-known name, a phrase, not a crest; po checked, KN-R2). The game's Wheel cog sits on the board's top, turning once Kano is switched on.

- Never a real gate's shape or name, never the state's crest, seal, flag or emblem, never a palace, never any writing but our two lines (no Arabic or Ajami script anywhere, KN-R3).
- Faded but warm before Kano is switched on (decision 47); after Rusty Borehole, the wall glows warm red, the doors have fresh paint, lamps hang lit on both sides, and the cog turns.
- Shows in four places: the bus ride, the start of street 1, the Kano city's bottom edge, and the "To Kano" stop.

**Arrival card** (first visit only, over the Kano city):
- Heading: **"Welcome to Kano!"**
- Line 1: "Kano is the Centre of Commerce. People come here to buy and sell."
- Line 2: "The dust has dried up the borehole. Fix Kano, and the water will flow."
- Button: **"Let's go"** (56 px tall). Screen readers hear the heading, both lines, then the button.

### 1.5 Travel card with three states

- Heading "Where to?". Three buttons, each at least 140 x 72 px: side by side when the screen is 480 px wide or more, one above the other when narrower. "Lagos", "Ogun", "Kano", each with its Booming line and cog, and "You are here" with the pin on the open one (ogun.md 1.5).
- Lagos and Ogun stay exactly as they are (ogun.md 1.6).

### 1.6 The wheel

- Kano's cog gets Ogun's pennant mark and "Kano, next" while Kano is open but not turning (never colour alone).
- Kano's cog turns at Kano's first boom (20 points) or the first Borehole Hall win, whichever comes first (as Ogun, OG-R35).
- Rail lines change:

| When | Line now | New line |
|---|---|---|
| King Pothole beaten, Kano not open yet | "The gateway is open. More states are coming soon." | (cannot happen: Kano opens at the same win) |
| Kano open, not turning | | "Next: Kano, the Centre of Commerce." |
| Kano turning, Rusty Borehole not beaten | | "Kano is turning. Get the water flowing in Borehole Hall." |
| Rusty Borehole beaten | | "The water is flowing in Kano. More states are coming soon." |

### 1.7 Saves

The same key `gidi-progress` and rules as ogun.md 1.8, with a `states.kano` part shaped like `states.ogun` (streets, parcel, hall, lane, city, arrived). One wallet for every state (decision 80). An old save with no `kano` part loads; Kano is open if Ogun's hall is done. Settings words: "Your hero, Lagos, Ogun and Kano are saved on this phone." gamedev adds a load test with an old save, Kano half done, and a broken `kano` part.

---

## 2. Kano's identity, with pride

### 2.1 What Kano is in the game

**The Centre of Commerce.** One of the oldest trading cities in West Africa. For hundreds of years traders came across the desert and the savanna to its markets. Kano is famous for its old city walls, its indigo dye pits, fine leather, cloth, and grain and groundnut markets. Long ago, Kano piled sacks of groundnuts into pyramids as tall as hills. Its people are busy, warm and proud, and traders from every part of Nigeria work side by side. Its trouble is everyone's trouble: dusty roads, lights going out, taps running dry. Nothing in Kano is shown as broken for good, behind or to blame.

### 2.2 What we show (our own drawings, real and proud)

| Thing | Where it shows | How |
|---|---|---|
| **The old city walls** | street 1 start, the city edge, the ride | Thick red-brown earth walls with rounded tops, whole and proud, our own gate (1.4). Never a real named gate |
| **Dye pits** | street 2, a city build | Round pits set in the ground of a yard behind a low wall, dyers lifting dark blue cloth on poles, cloth spread to dry, cloth beaters tapping folded cloth with wooden mallets until it shines (a "tok-tok" beat). Pits are always scenery behind the walking line, never a hazard and never something to fall in (KN-R4) |
| **Leatherwork** | street 1, a city build | Finished goods only: bags, sandals, cushions (poufs), belts, laid out on mats and hung on stall poles. Our own simple patterns. No hides, no tanning pits |
| **Cloth and weaving** | street 2, a later city build | Bolts of bright cloth on shelves, a weaver at a narrow-strip loom, a tailor at a sewing machine |
| **Grain and groundnut market** | street 3, a city build | Sacks of millet, sorghum, maize, beans and groundnuts; traders measuring with bowls; trucks loading; porters with sacks on head pads |
| **Groundnut pyramid** | street 3 far scenery, a city build after the first boom | Our own small stepped stack of groundnut sacks, a proud nod to the groundnut pyramids of long ago (KN-R5) |
| **Harmattan haze** | every Kano scene | A soft gold haze on far things only, baked once (style 1.6). The play line, hero, kobo, food and hazards are never hazed (KN-R6) |
| **Savanna** | the ride, the lane run, city edges | Baobab and neem-shaped trees of our own, dry grass, red earth |

### 2.3 What we never show (CLAUDE.md rules 3 and 4; decision 19)

- **Nothing religious.** No mosques, minarets, domes, prayer, prayer mats, prayer beads, Quranic schools, religious festivals, Arabic or Ajami writing, and no dress used as a sign of faith. Everyday clothes are just clothes (2.4). No greeting or bubble that names God (KN-R7).
- **No royal or title likeness.** No emir or any real office-holder, no palace or palace walls, no palace guards, no big wrapped turban of office, no robes of office, no horses in regalia, no long royal trumpets. The Durbar is left out (KN-R8; po ruled in K0b that it stays out of version 1).
- **No real people, no parties.** No politicians, officials, celebrities, party names, colours or logos. No real building, crest or brand.
- **No danger story.** The North is never shown as dangerous: no soldiers, police, checkpoints, guns, uniforms, badges, guard groups or anything about crime. No child begging, alone on the street or at work (KN-R9).
- **Mock no one.** No accent, tribe, faith or job is a joke. Hausa, Fulani, Kanuri, Yoruba, Igbo and everyone else who lives in Kano are shown the same way: busy, kind, proud. Water carriers, porters and traders are proud work, never the problem.

### 2.4 People's clothes (everyday, not symbols)

Kaftans and trousers, a plain babban riga with an embroidered neck, a hula cap (a small round embroidered cap), wrappers and blouses, a light head shawl draped over the head and shoulders (gyale), ankara, school uniforms, work clothes, jeans and T-shirts. Elders stand tall (decision 21). A wheelchair user is in the city, as in every city. Elders have no walking stick (decision 21).

### 2.5 The look (decision 47 and style.md)

Kano is drawn in the new style from the start: crisp characters (style 1.8), the new buttons (1.2), building shading once ST-B lands (1.3). It starts **a bit faded but warm**, never run-down: colours a little dusty, sand drifted on the road edges, some lamps dark, taps dry, but markets full and people smiling. Each fix brightens its block for good. Kano's own colour notes: **earth red** (the walls), **indigo** (the dye pits; never used alone to mean anything), **Harmattan gold** (the haze and light), **groundnut tan**, with the game's cream and danfo yellow. Different from Ogun's indigo and laterite by the round earth buildings, the flat roofs with small raised corners, and the gold light.

### 2.6 Kano's music (decision 30)

Our own code-made tunes with a kalangu-style talking drum, a shaker, a light flute line and a plucked lute line, in a bright walking feel. Our own notes. Never a known song, praise song, chant or anything tied to worship, spirits or royal courts (no long royal trumpets). The hall tune speeds up after each hit, as before.

---

## 3. The three streets

Every rule from design.md S2.2 and S2.6 and ogun.md part 3 holds: pit kinds and widths, 160 u clear run-up before every big pit, hazards at least 200 u from a pit, food at least 300 u from a pit, the corn rules, a warning sign before every pit 90 u or wider, hints at least 120 u apart and 35 characters or fewer, three lives (five in Gentle), one bus stop checkpoint, the yellow bus at the end. Ogun's mud, cracks and gravel do not appear in Kano (KN-R10), so the Kano part never needs Ogun's code.

### 3.1 Street names (KN-Q1, settled: decision 91; decision 19)

| Street | Theme | Name (decision 91) | Backup (not used) | Why |
|---|---|---|---|---|
| 1 (kano-1.json) | morning, through the gate, the old market | **Kurmi** | Kantin Kwari | Kurmi Market is one of the oldest markets in West Africa, famous for leather and crafts. A market name, not a person |
| 2 (kano-2.json) | midday, the dye pits | **Kofar Mata** | Yankaba | Home of Kano's famous dye pits. The name is a place (an old gate's name, "Women's Gate"), not a person or holy place. po checked it (K0b); a Kano speaker checks all three names before the closed invited test (decision 91) |
| 3 (kano-3.json) | evening, the grain market | **Dawanau** | Sharada | Dawanau is one of the biggest grain markets in West Africa; trucks come from all over. A town name |

Cleared words: "Kurmi is moving again, thanks to you! You got {money}." The same for Kofar Mata and Dawanau. A line that says something is wrong never names the place.

### 3.2 The difficulty curve after Ogun

Kano starts level with Abeokuta and ends one step past Sagamu.

| | Abeokuta | Sagamu | **Kurmi** | **Kofar Mata** | **Dawanau** |
|---|---|---|---|---|---|
| Length (u) | 11720 | 12120 | 11720 | 12120 | 12520 |
| Full run / typical | 75 / 100 s | 78 / 105 s | 75 / 100 s | 78 / 105 s | 80 / 108 s |
| New thing | rock steps, cracks, ofada | gravel, two roads | **wind**, kilishi | **springy cloth** | **dust whirls**, fura da nono |
| Big pits | 1 | 2 | 1 | 1 | 1 |
| Hints | 5 | 3 | 4 | 1 | 2 |
| Well | yes | yes, secret | none | yes | yes, secret |

**Tries:** a player who finished Ogun should finish Kurmi in 3 tries or fewer, and each Kano street in 4 or fewer. If testers need more, take back in this order: Dawanau's whirl at 11000; Kofar Mata's tyre at 7500; headwind stretches shorter by 200 u; big pits 170 to 160.

### 3.3 The new things (rules for gamedev and the level test)

**Wind** (`wind`: [x, width, dir], width 300 to 800, dir "back" or "face"; Kurmi first). The Harmattan blows along a stretch of street.
- Seen before it starts: a wind sign at its start (a pole with a long cloth streamer and an arrow showing which way), and through the stretch the stall bunting, cloth on lines and leaves all stream the same way, with thin dust streaks crossing the sky. A soft "whoosh" while you are in it (Sound on). Never colour alone: the arrow, the streamers, the streaks.
- **Wind behind you ("back"):** while in the air, your speed forward is a quarter more, so you jump farther. It helps.
- **Wind in your face ("face"):** while in the air, your speed forward is a quarter less, so you jump shorter. Walking and running on the ground are not changed.
- Fair rules: no wide or big pit inside a headwind or within 160 u after one ends (only tap and hold pits there); the first wind is a tailwind (wind first helps you); no wind on a spawn, checkpoint, well or bus door ± 100 u. In Gentle mode a headwind takes away only an eighth.
- **Kilishi:** a headwind does nothing while it works; a tailwind still helps.

**Springy cloth** (`springs`: [x, width], width 80 to 120; Kofar Mata first). Freshly dyed cloth stretched tight on a low wooden frame, 30 u high, to dry. The dyers set it out and wave you on.
- Land on it from above and you bounce up high: vy -640 (a normal jump is -576). Holding makes it higher, as a jump does, and the second jump is still there. Walk into its side: it is a low step, nothing happens. It never hurts.
- Looks: cloth with a soft sag, wooden legs, a small bounce-arrow sign beside the first one. A "boing" made of a drum note (our own sound).
- Fair rules: a frame stands at least 200 u from any pit; a bounce never carries you over a pit or onto anything you cannot see from the frame; anything a bounce is for (a roof of kobo) is no higher than 170 u.

**Dust whirl** (`whirl` hazard; Dawanau first). A small spinning swirl of Harmattan dust, 30 wide x 50 tall, drifting left at 50 u/s with a gentle sway, leaves turning inside it.
- Not colour alone: its spinning shape, the leaves, a soft "fff" (only when on screen, as OG-R15's tk).
- A jump clears it (a tap jump rises 74 u). Land on it from above to bounce (vy -480): it puffs apart. Any other touch hurts, like a tyre.
- Placing: as the tyre (S2.2 rule 3: second half of a corn's reach only). The first one alone with a hint. Gentle: 40 u/s.
- Fura da nono: touching a whirl puffs it apart, no hurt. Amala smashes it, fufu puffs it (+1 kobo as for every hazard; fura's puff pays nothing, as OG-R14).

**Sack steps** (Dawanau). Stacked grain sacks drawn as steps. They are rocks under another look (ogun.md 3.3 rock rules), so no new code; field `sacks`: [x, width, height].

### 3.4 Street 1: Kurmi (src/data/levels/kano-1.json)

Idea: a bright, hazy morning. The bus drops you just inside our own gate in the old wall. Round earth buildings with flat roofs, leather stalls with bags and sandals hung on poles, a kosai seller, a phone kiosk, a vulcanizer. Signs (made up): "FINE LEATHER", "SANDALS", "POS HERE", "PROVISIONS", "VULCANIZER". Teaches wind, then kilishi.

Length: spawn 80 to bus 11800 = 11720 u.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Arrival | 80-900 | | The gate at 200; toast as the hero passes it: "Welcome to Kano!" Kobo at 300, 500, 700; kobo crate at 800 |
| Refresher | 900-2000 | | Tap 40 at 1100, hold 60 at 1450, goat 1800 |
| Tailwind | 2000-3400 | **wind behind** | Hint 2050: "Wind behind you! You jump farther." Tailwind 2200 to 3000. Wide pit 100 at 2700 (sign 2580), kobo arc over it |
| Headwind | 3400-4500 | **wind in your face** | Hint 3450: "Wind in your face! Short jumps." Headwind 3600 to 4200, tap 40 at 3900, kobo on the road |
| Bus stop | 4700 | | "Bus stop! Now you start here." |
| Garri | 4800-5600 | | Garri crate at 4900, tyre 5300 |
| Big pit | 5600-6300 | | Clear road 5840 to 6000, big pit 170 at 6000 (sign 5880, cones, kobo arc) |
| Kilishi | 6400-8000 | **kilishi** | Kilishi on the road at 6600. Hint 6540: "Kilishi! Wind can't hold you back." Headwind 6800 to 7600, goat 7100, tap 40 at 7400 |
| Corn | 8200-10936 | | Corn on the road at 8200. Fast stretch to 9568: roofs at 8500 and 9000 with kobo crates, tap 40 at 8800. Second half: tyre 9800, tailwind 10000 to 10600 with hold 60 at 10400 |
| Fufu | 10900-11800 | | Pepper fufu at 10900, goat 11200, tap 40 at 11500. Bus door 11800 |

Kobo: about 150 loose and 12 in crates. Well: none (the arrival street stays simple). Hints: 4 plus the gate toast.

**Built (K0a, 25 Nov):** src/data/levels/kano-1.json. Pits as ground gaps: tap 40 at 1100, hold 60 at 1450, wide 100 at 2700, tap 40 at 3900, big 170 at 6000, tap 40 at 7400, tap 40 at 8800, hold 60 at 10400, tap 40 at 11500. Wind `[x, width, dir]`: [2200, 800, back], [3600, 600, face], [6800, 800, face], [10000, 600, back]. Roofs [8500, 245, 120] and [9000, 245, 120] (kobo crates 8560, 9060). Gate 200. Kobo: 160 loose (so KM1's stars 60, 100, 135 are 40, 65 and 85 percent, as missions.md), 4 kobo crates (12): 800, 3200 (added, to make the 12), 8560, 9060. End: bus door 11800, wall 12000. Nothing moved from the table. Checked by tests/unit/street.test.ts (S2.6) and tests/unit/kano-levels.test.ts (3.3 wind and food rules, the gate, KM1 and KM2). Until gamedev reads `wind`, `gate` and kilishi (K2b), the S2.6 test reads a copy without kilishi (tests/unit/kano-level-data.ts).

### 3.5 Street 2: Kofar Mata (src/data/levels/kano-2.json)

Idea: midday at the dye pits. Behind a low wall, dyers lift dark blue cloth from round pits on long poles; cloth beaters tap a steady "tok-tok"; cloth dries on frames and lines. A fura seller with a calabash, a tailor, a cloth shop. Signs (made up): "INDIGO CLOTH", "TAILOR", "FINE CLOTH", "FURA DA NONO", "PROVISIONS". Teaches springy cloth.

Length: spawn 80 to bus 12200 = 12120 u.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Warm up | 80-1000 | | Kobo; kobo crate at 700 |
| Springy cloth | 1000-2400 | **springy cloth** | Hint 1050: "Springy cloth! Land to bounce high." Cloth 1250 (100 wide) alone, a straight line of kobo above it. Cloth 1800 with a roof at 1950 (150 high, only a bounce or a double jump reaches it) holding a kobo crate |
| Wind again | 2400-3400 | | Tailwind 2500 to 3200, wide pit 100 at 2900 (sign 2780) |
| Well | 3400-3800 | | Entrance well at 3600 in a quiet dye yard, no people within 120 u. Exit well 4800 |
| Bus stop | 5000 | | "Bus stop! Now you start here." |
| Cloth to a roof | 5000-6200 | | Goat 5300. Cloth 5700 up to a long roof 5850 to 6150 (150 high) that reaches over a wide pit 100 at 6000 (sign 5880): bounce over, or double jump the hole |
| Big pit | 6300-7000 | | Clear road 6560 to 6720, big pit 170 at 6720 (sign 6600) |
| Headwind | 7000-8200 | | Headwind 7200 to 7900, tyre 7500, tap 40 at 7800 |
| Corn | 8400-11136 | | Corn crate at 8400. Fast stretch to 9768: cloth 8800 up to a roof at 8950 with a kobo crate, tap 40 at 9300. Second half: goat 10000, tailwind 10300 to 10900 with hold 60 at 10600 |
| Amala | 11300-12200 | | Amala on the road at 11300, tyre 11600, goat 11900. Bus door 12200 |

Kobo: about 150 loose and 12 in crates, plus 17 in the well room. Hints: 1 (wind and wells were taught before).

**Built (K0a, 25 Nov):** src/data/levels/kano-2.json. Pits as ground gaps: wide 100 at 2900, wide 100 at 6000 (under the long roof), big 170 at 6720, tap 40 at 7800, tap 40 at 9300, hold 60 at 10600. Springs `[x, width]`: 1250, 1800, 5700, 8800, each 100 wide. Roofs (150 high, y 150): [1950, 150, 120] (kobo crate 2010), the long roof [5850, 150, 300], [8950, 150, 120] (kobo crate 9010). Wind: [2500, 700, back], [7200, 700, face], [10300, 600, back]. Well 3600, exit 4800. Kobo: 152 loose, 4 kobo crates (12): 700, 2010, 3300 (added, to make the 12), 9010; corn crate 8400; amala 11300. End: bus door 12200, wall 12400. Hints: 2 (the 3.2 count leaves out the bus stop line, which every street has). Nothing moved from the table. Until gamedev reads `springs` (K3b), the frames are only checked by kano-levels.test.ts: 200 u from any pit and farther than a held bounce carries you at the fastest speed there (154 u at run speed, 225 u at corn speed).

### 3.6 Street 3: Dawanau (src/data/levels/kano-3.json)

Idea: evening at the grain market, gold light through the haze. Mountains of sacks, traders measuring grain with bowls, trucks loading, a groundnut oil seller, our own groundnut sack pyramid far off. Signs (made up): "GRAIN", "GROUNDNUT", "KULI-KULI", "BEANS", "VULCANIZER". Teaches dust whirls, then fura da nono.

Length: spawn 80 to bus 12600 = 12520 u.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Warm up | 80-1000 | | Grain stalls; kobo crates at 600 and 800 |
| Dust whirls | 1000-2600 | **dust whirl** | Hint 1100: "Dust whirl! Jump over it." Whirl 1500 alone. Whirl 2200 |
| Sack steps | 2600-3700 | | Sacks 2800 (50 high), 2930 (100), 3060 (150), each 100 wide, kobo on top. Tap 40 at 3500 |
| Fura da nono | 3700-5200 | **fura da nono** | Fura da nono on the road at 3900. Hint 3840: "Fura da nono! Dust can't stop you." Whirls 4300, 4600, 4900: a row to puff through |
| Bus stop | 5600 | | "Bus stop! Now you start here." |
| Secret well | 5600-6900 | | Entrance well at 6000, behind a front stack of sacks you walk behind; its ↓ arrow peeks over the top (OG-R34). No hint, no sign. Exit well 6900 |
| Big pit | 7300-7800 | | Clear road 7440 to 7600, big pit 170 at 7600 (sign 7480) |
| Mixed | 7900-9200 | | Whirl 8100, goat 8400, tailwind 8600 to 9200 with wide pit 100 at 8900 (sign 8780) |
| Corn | 9300-12036 | | Corn crate at 9300. Fast stretch to 10668: cloth 9700 up to a roof at 9850 with a kobo crate, tap 40 at 10200. Second half: whirl 11000, tyre 11400 |
| Fufu | 11700-12600 | | Pepper fufu at 11700, goat 12000, hold 60 at 12300. Bus door 12600 |

Kobo: about 140 loose and 12 in crates, plus 17 in the well room. Hints: 2.

**Built (K0a, 25 Nov):** src/data/levels/kano-3.json. Pits as ground gaps: tap 40 at 3500, hold 60 at 6600 (added), big 170 at 7600, wide 100 at 8900, tap 40 at 10200, hold 60 at 12300. Sacks `[x, width, height]`: [2800, 100, 50], [2930, 100, 100], [3060, 100, 150], and two added after the bus stop, [6100, 100, 60], [6230, 100, 120]. Spring 9700; roof [9850, 150, 120] (kobo crate 9910). Wind [8600, 600, back]. Whirls 1500, 2200, 4300, 4600, 4900, 8100, 11000; goats 8400, 12000; tyre 11400. Kobo: 143 loose, 4 kobo crates (12): 600, 800, 6900 (added), 9910; corn crate 9300; fura 3900; pepper fufu 11700. End: bus door 12600, wall 12800. Hints: 3 (with the bus stop line).

**One move past 100 u:** the table puts the secret well (6000, exit 6900) after the bus stop (5600), but an exit well must always come before the bus stop (design.md S2.5 rule 5: the bus stop is never skipped). The well moved to 5150, exit 5480, behind the sacks at the end of the fura row; the bus stop stays at 5600. The stretch it left (5600 to 7300) got two sack steps, a hold pit and a kobo crate, so it still has something to do. A small ruling under decision 64, for Tp in one line.

Until gamedev reads `sacks`, the "whirl" hazard and fura (K4b), the S2.6 test reads a copy with each sack stack as a rock and each whirl as a tyre (the same placing rules), without fura.

These tables are the plan; the level files (task K0a) may move a thing up to 100 u to pass the level test, and record each move under "Built" as Ogun did.

### 3.7 The well room: the groundnut store (src/data/levels/kano-well.json)

The S2.5 room rules, Kano's own look: a cool store room under the market, sacks of groundnuts, baskets of kuli-kuli, light through two holes in the ceiling. The gift is **the garri parcel** with Kano's look: garri, sugar and groundnuts tied in our own woven cloth (decision 18's shield for every Borehole Hall try until the hall is cleared; one parcel per state, never stacking). If the player already carries one, the room shows coins instead.
- **The store keeper:** an elder woman in a wrapper and head shawl, sitting on a low stool by the back wall. She waves when the hero comes down; when the hero takes the parcel she claps, bubble **"For Borehole Hall. Safe trip!"**
- Toast: "Groundnut garri parcel! Shield for the hall."

**Built (K0a, 25 Nov):** src/data/levels/kano-well.json, the Ogun room's shape: shelves [100, 250, 90], [230, 205, 100], [390, 240, 90]; the parcel on the middle shelf at (280, 181); 14 loose kobo and one kobo crate at 345 (17 in all). Short toast for narrow bars: "Garri parcel! Shield for the hall."

### 3.8 Level file fields

Schema 2 with `state: "kano"`, `street: 1 to 3`, `theme: "walls" | "dyepits" | "grain"`, and adds: `wind` [x, width, dir]; `springs` [x, width]; `sacks` [x, width, height]; `hazards` kind adds "whirl"; `hazardSpeeds.whirl` 50; `foods` kind adds "kilishi", "fura"; `gate` x (street 1 only). The level test checks every rule in 3.3 and S2.6.

---

## 4. Kano's foods

### 4.1 The two new foods (KN-Q3, settled: decision 91)

| Food | Where from | Does | Lasts | Pickup words | Look (not colour alone) |
|---|---|---|---|---|---|
| **Kilishi** | Hausa homes and markets across the North | **Strong legs:** a headwind cannot hold you back; a tailwind still helps | 12 s | "Kilishi! Wind can't hold you back for 12 seconds." | Thin, dark spiced strips folded in paper. HUD: strip icon, "Kilishi", the bar |
| **Fura da nono** | Fulani and Hausa sellers across the North | **Cool and calm:** dust whirls puff apart when they touch you | 12 s | "Fura da nono! Dust can't stop you for 12 seconds." | A small calabash bowl with white nono and a round fura ball. HUD: bowl icon, "Fura", the bar |

**Why these two:**
- Both are famous Northern foods a child in Kano knows, and both are easy to draw so you can tell them apart (a strip in paper, a calabash bowl).
- Each power answers a Kano street problem, as ikokore and ofada did for Ogun, so the food is clear to a 5 year old: "the wind can't push me", "the dust can't get me".
- Each power has a real reason a child can enjoy: kilishi is dried in the hot, dry wind, so it is tough against the wind; fura da nono is the cool drink people have on a hot dusty day.
- One comes mostly from Hausa cooks and one from Fulani sellers, so the North's share is itself shared.
- Neither duplicates an older power (speed, shield, strong, throw, firm feet, steady road).

- Every older food still works in Kano: corn, garri, amala, pepper fufu. Ogun's ikokore and ofada do not appear in Kano streets (no mud or cracks there).
- Both last 12 s and warn in their last 2 s (OG-R10): blink, soft tick, "Kilishi is wearing off!" / "Fura is wearing off!".
- Never fire, never a weapon. Fura da nono is never shown spilled or thrown.
- Tuwo shinkafa with miyan kuka and masa stay for a later Northern state (city.md 2D).

### 4.2 Keeping the share fair (decisions 30 and 81)

| | Hausa and the North | Igbo and the East | Yoruba and the West | Everyone |
|---|---|---|---|---|
| Built (Lagos, Ogun) | | pepper fufu and egusi | amala, gbegiri and ewedu; ikokore; ofada rice | roasted corn; garri, sugar and epa |
| Kano adds | **kilishi; fura da nono** | | | |
| Owed next | 0 | **1** | 0 | |

After Kano the North has two (decision 81). The East still needs one more before any new West food: the next state's foods should come from the East (city.md 2D: abacha, and the South-South's banga and edikang ikong). People and bubbles in Kano stay shared between Hausa, Yoruba, Igbo and Pidgin, with Hausa first since it is Kano's home language (part 7).

---

## 5. The boss: Rusty Borehole in Borehole Hall

### 5.1 Who he is (KN-Q2, settled: decision 91)

**Rusty Borehole is a problem, never a person.** He is a tall, old borehole pump and water tank on four short legs: a round tank for a body, two round pressure dials for eyes, a tap for a nose, a wide crack in his rust for a grumpy mouth, and a long pipe running from his top across the yard ceiling. The Harmattan dust has clogged him, so he is dry and he coughs dust instead of water. No arms, no clothes, no hat, no title, no face of anyone real. He is the Stopper who keeps the water in.

He is grumpy and wheezy. He loses in a funny way: the water comes back, he gargles, sneezes out the last of the dust, and hums happily as a shiny clean pump.

### 5.2 The place: Borehole Hall (src/data/levels/kano-hall.json)

Our own water yard: a walled earth yard with a wide shade roof on poles, a row of 8 dry taps along the back wall, stacked water cans, a wash line of indigo cloth across the back (it shows the wind), a door on the left where the hero came in, open doors on the right with the hazy city beyond. "BOREHOLE HALL" painted over the left door. Not a real building, no palace look, no faith sign.

Hall x runs 0 to 560, floor y 300 (S2.7).

| Thing | x | Notes |
|---|---|---|
| Hero start | 50 | Walks in through the left door |
| Left wall | hero limit 30 | |
| Valve 1, 2, 3 | 140, 250, 360 | Round valve wheels on Rusty's pipe, their bottom 230 u above the floor (y 70): a held single jump only reaches y 112 with the head, so it takes a double jump (head to y 2) or a held cloth bounce (head to about y 49) |
| Springy cloth frames | under each valve, 80 wide | The Kofar Mata frames: 30 high, bounce vy -640 |
| Rusty Borehole | 450 to 540 | A wall to the hero (hero limit 440); he never moves |

### 5.3 How you win (one rule, three times)

**Bump each stuck valve from below to let the water through.**

1. The valve that is next carries a tag. It is **shut tight** until Rusty has coughed: still, tagged "WAIT", and a head bump only goes "clonk" (the head stops, no hit, no hurt). When the first whirl of the phase leaves his feet, a puff of dust runs along the pipe and **shakes it loose**: from then on the valve shakes, puffs dust and is tagged "STUCK", and it stays ready for the rest of the phase. Words and shaking, never colour alone. The others wait, still. (KN-R14)
2. Bounce on the cloth under it and keep holding jump, or double jump, and hit the valve from below with your head, the same move as opening a crate (design.md S2.4: the head stops, a small push down). The valve spins free: **"SQUEAK... GLUG!"** Water rushes a little way along the pipe. That is a hit.
3. The order is left, middle, right: each valve is nearer Rusty, so his dust reaches it sooner. A done valve shows a tick and drips.

Hit counter: three valve shapes at the top that fill with a tick. The HUD row never covers a valve, its tag or the counter: on a short screen (320 x 240) the hall is drawn a little smaller about the floor line, a tag that would run under Sound hangs left of its valve, and the counter sits just under Sound and Pause (K5c). Toasts: "Glug! 2 more valves." and "Glug! 1 more valve."

**Built (K0a, 25 Nov):** src/data/levels/kano-hall.json holds every number in 5.2 to 5.5 in a `boss` block of kind "rusty-borehole" (body, valves, frames, phases, whirl, gust, finish times, Gentle), read by gamedev in K5b. kano-levels.test.ts checks the reach rule with the real jump numbers: a held jump puts the head at y 112, a held cloth bounce at y 48, a double jump at y 2, against the valves' bottom at y 70; an un-held bounce falls short, so the "hold" in the hint matters.

**He holds his breath while you bounce.** No new whirl leaves Rusty from a cloth bounce until the hero's feet touch the floor (landing on a cloth again does not count), so the way up to the valve and back down is always clear of new dust. A cough that comes due while he holds his breath waits at his mouth: his dials keep spinning and his tank stays puffed out, and the whirl leaves 0.5 s after the hero lands on the floor. Landing on a whirl from above is always a bounce, never a hurt (3.3), so coming down on one is safe.

**So every phase has a whirl to beat (KN-R14).** A valve opens only after its phase's first whirl has left him, and he only coughs once the hero is on the floor. First whirls come at 2.0 s (entry), and one `every` after the 1.5 s break (3.9 s after hit 1, 3.5 s after hit 2), as OG-R21. The fastest clean win is about 11 s with at least three whirls met. If the hero bounces on a cloth for 3 s while the valve says "WAIT", hint once per try: "Come down and let him cough!"

**A whirl never appears touching the hero (KN-R15, as Pothole Hall's OG-R25).** A whirl leaves his feet at x 440, the hero's own wall. While the hero stands at his mouth (their box less than 11 u of clear floor from the whirl's box as it would leave him, that is x above 407, on the floor or hopping), a whirl that comes due waits at his mouth, wheezing, as in the held breath, and leaves 0.5 s after the hero has stepped clear. So it is always seen leaving him before it can reach anyone, and holding Forward against him (Gentle too) never costs a life. A hero who walks into a whirl already rolling can still be hit; the wheeze warned them. If that whirl has waited 2.0 s (Gentle 2.4 s) with the hero still at his mouth, Rusty gives a soft, harmless "Hmph!" puff (the soft whirl "fff" sound, his blowing face): the hero slides gently back left, about 60 u, no hurt, no life lost, Forward held only during the slide, until they have gone 60 u and been clear 0.5 s; then the whirl rolls out. The first puff of a try shows the hint "Step back so he can cough!". So a child holding Forward against him still meets his whirls and the fight goes on. Data: `boss.whirl.clearGap: 11`, `boss.huff: { after: 2.0, back: 60, speed: 75 }`, `boss.gentle.huffAfter: 2.4`.

### 5.4 What he does, and how it gets harder

Before each cough he shows a 0.5 s "wheeze": his dials spin, his tank puffs out, a little dust rises from his tap.

- **Dust whirl:** a Dawanau whirl rolls out from his feet toward the hero at 60 u/s. Jump it, or land on it to bounce. It puffs apart at the left wall.
- **Gust (from hit 1):** he blows the Harmattan across the yard for 2 s: the wash line cloth streams left, dust streaks fly, and air speed toward him is a quarter less (the Kurmi headwind). Warned by 0.6 s of cheeks puffing and cloth starting to flutter. It never hurts; it only makes jumps shorter.

| Phase | Cough every | Pattern (repeats) | Hall music |
|---|---|---|---|
| Before any hit | 2.8 s | whirl | 120 BPM |
| After hit 1 | 2.4 s | whirl, gust | 126 BPM, adds shaker |
| After hit 2 | 2.0 s | whirl, whirl, gust | 132 BPM, adds a second drum |

- Before phase 3, toast: "He's cross! Two whirls now. Jump them both."
- A hit: "SQUEAK... GLUG!", Rusty hiccups ("hic!"), a flake of rust falls off him and shows clean blue paint underneath, every whirl puffs apart, no coughs for 1.5 s, then the next phase.
- What hurts: a whirl from the side (a life, back to x 50). The garri parcel's shield takes one whirl. There is no hole to fall in.
- No foods in the hall except the parcel.
- **Gentle mode:** 5 lives, whirls 45 u/s, every cough 0.4 s later, gusts take away only an eighth.

**Entry:** if there is a parcel, toast "Your garri parcel: the shield is on!". Then "Rusty Borehole has gone dry!" Then, on the first try of each visit, hint "Bounce, hold, and bump the valve!" First cough at 2.0 s.

**Fair for a 5 year old:** he never moves, every cough is warned, the valve to hit is marked with a word and shaking, a held cloth bounce makes the high reach one press and hold (no second jump needed), and every move was taught in Kano's streets. Never a "jump on his head" fight, never a throw back at him, never a pattern from any Nintendo or other game.

**Three tries:** a Dawanau finisher should beat him in 3 tries. If not, tune in this order: coughs 3.0 / 2.6 / 2.2 s; phase 3 pattern whirl, gust; whirl speed 50; valve bottom 220.

### 5.5 The funny, kind finish

From the third valve:
- 0 s: every whirl puffs apart. The hero cannot be hurt.
- 0 to 1.2 s: water rushes along the whole pipe in a wave of bubbles. Rusty's dials spin round and round; he gargles "glug glug glug".
- 1.2 s: his tank swells, his dials squeeze shut: "A... a... ACHOO!" One big puff of dust shoots out of his top and floats away out of the roof, harmless, into the sky.
- 1.8 s: all his rust flakes fall off like confetti; he is a shiny, clean blue pump. A little fountain rises from his top and he hums "mm-hmm!".
- 2.4 s to 3.6 s: the 8 taps along the back wall run, one by one, each with a happy splash.
- 4.0 s: toast **"The water is flowing! Kano is switched on!"** The win tune plays. The door people come in with cans and buckets and cheer (part 7).
- 6.0 s: the Win screen.

Nobody is hurt. The old pump just gets clean and goes back to work.

**Win screen words:** heading "Kano is switched on!"; line "The water is flowing. The markets of Kano are busy again."; "You got ₦15."; big "Take it home"; small "Play again", "Challenge road".

---

## 6. Kano's city from above

Reuse every Lagos and Ogun city system with Kano's look (ogun.md part 6). Nothing new to learn but the places.

### 6.1 The map

The same size (1600 x 1000, 12 blocks in 3 rows of 4, a motor park in the middle).
- **Bottom edge:** the old wall with our gate, where the road comes in from the south (Travel and "To Ogun" sit here).
- **Left:** Kurmi market, leather stalls.
- **Middle:** the motor park and a market road.
- **Top:** Kofar Mata's dye pits behind a low wall.
- **Right:** Dawanau's grain market with trucks; later, the groundnut pyramid.
- **Top right:** the water yard (Borehole Hall).
- **Far edges:** savanna, baobabs, the wall curving away.

### 6.2 Problems, builds and missions

| Pin | Where | Problem or build | Costs | Challenge that helps | Mission complete line | Tax? |
|---|---|---|---|---|---|---|
| 1 | gate road | "Sandy road" | ₦12 | Kurmi | "Clean road here. Carts and buses are moving." | no |
| 2 | Kurmi | (build) "Leather stalls" | ₦6 | any | "The leather stalls are open here." | yes |
| 3 | market road | "Lights out" | Power 8 | Harmattan Road (lane run) | "The lamps are on. The market stays open late." | no |
| 4 | Dawanau | "Slow internet" | Tech 6 | Harmattan Road | "Fast internet here. Traders can call far away." | no |
| 5 | Kofar Mata | (build) "Dye pits" | ₦8 | any | "The dye pits are busy here." | yes |
| 6 | Dawanau | (build) "Grain market" (needs pin 1) | ₦8 | any | "The grain market is open here." | yes |
| 7 | water yard | "Dry taps" | win in Borehole Hall | Borehole Hall | "The water is flowing. Everyone can fill up." | no |
| later | Dawanau edge, after the first boom | (build) "Groundnut pyramid" | ₦10 | any | "The groundnut pyramid is back! Long ago, Kano piled sacks as tall as hills." | yes |
| later | | (build) "Cloth market" | later | | | yes |

- 6 places before the first boom, 24 points, so 20 is always reachable (as Ogun).
- **Card words:** "Sand is on the road. Carts can't get through. Run Kurmi to earn Naira." / "Lamps are out on this road. Run the Harmattan Road for Power." / "Slow internet here. Run the Harmattan Road for Tech." / "The taps are dry. Rusty Borehole is clogged with dust. Go to Borehole Hall." (before Dawanau is cleared: "Clear Kurmi, Kofar Mata and Dawanau to reach Borehole Hall.").
- **Quick missions** (decision 89; the shape, board, stars and saves of docs/missions.md, ids KM1 to KM5, built with Kano once the Missions board is in):

| # | Name | Where | What you do | Stars | Line on the card |
|---|---|---|---|---|---|
| KM1 | **Coin catch** | Kurmi | Pick up coins | 60 · 100 · 135 coins | "Catch coins on Kurmi!" |
| KM2 | **Ride the wind** | Kurmi | Pick up the kobo arcs over pits inside a tailwind | 1 · 2 arcs | "Jump far with the wind!" |
| KM3 | **Bounce high** | Kofar Mata | Bounce on springy cloth | 3 · 5 · 8 bounces | "Bounce on the springy cloth!" |
| KM4 | **Puff the dust** | Dawanau | Puff dust whirls (by landing on them, or with fura da nono or amala) | 1 · 3 · 5 whirls | "Puff the dust whirls!" |
| KM5 | **Power for the market** | Harmattan Road | Pick up Power bulbs | 4 · 8 · 12 bulbs | "Catch Power bulbs!" |

  K0a checks each top number against the level files, as missions.md's unit test does.

### 6.3 Tax places (decision 71, W18 rules)

| Place | What you see | Earns | Cap |
|---|---|---|---|
| Leather stalls | A buyer walks off with a bag or sandals | 10 kobo a sale, one every 8 s of play | ₦1.20 |
| Dye pits | A dyer lifts cloth; a beater folds it; a buyer carries it off | 20 kobo a cloth, one every 12 s | ₦1.20 |
| Grain market | A truck loads sacks and drives off (needs the clean road) | 30 kobo a truck, one every 15 s | ₦2.40 |
| Groundnut pyramid (later) | Sacks go up the stack; a buyer carries one away | 20 kobo a sack, one every 12 s | ₦1.20 |

All Kano trays together before the boom (₦4.80) stay under half of a street win (W3). Words: "The leather stalls paid ₦1.20 tax!" and so on; the once-only line: "Busy shops pay a small tax. Kano uses it to fix more." (hint `taxKano`).

### 6.4 Booming meter and challenge road

- The same meter and steps (ogun.md 6.4). At 20: "Kano is booming!" / "New shops are opening. More traders are coming to Kano." / "See Kano". The groundnut pyramid's pin appears.
- Challenge road (ogun.md 6.5 shape): "To Ogun" (start, a link) → **Kurmi** (always) → side road **Harmattan Road** (lane run, always) → **Kofar Mata** (Kurmi done) → **Dawanau** (Kofar Mata done) → **Borehole Hall** (Dawanau done; "A win brings ₦15 and gets the water flowing.") → **The way on** ("Coming soon", "More of Nigeria").

### 6.5 Harmattan Road (the lane run in Kano; src/data/levels/kano-lane.json)

The same rules, numbers, hints and prize as the Expressway (ogun.md 6.6). Our own look: a long straight road across the savanna toward the old wall in gold haze, grain trucks and danfos in the lanes, baobabs, cattle far off on the plain, roadside stalls of groundnuts and oranges. No new rule. Trucks are the `danfo` kind.

**Built (K0a, 25 Nov):** src/data/levels/kano-lane.json. Every number, hint and teaching row up to 230 m is the Expressway's; after that, Kano's own rows (the Expressway's laid across the road the other way round, so each fairness rule still holds) and 8 endless chunks with Kano names. Checked by kano-levels.test.ts with the Lagos and Ogun lane checks, plus KM5 (12 Power before the goal).

---

## 7. People everywhere in Kano

The five rules hold (never in the way, never hurt or scared, never the problem, never laughing at the hero, never a joke), with about 16 looks per street, crisp characters (style 1.8), clothes as 2.4.

- **Kurmi:** leather sellers holding up bags and sandals; a kosai seller frying bean cakes (steam only); a man in a kaftan and hula cap reading a newspaper with no words you can read; a woman in a wrapper and head shawl with shopping; students with bags; traders from other states selling side by side; two children rolling a hoop with a parent close by.
- **Kofar Mata:** dyers at the pits lifting cloth on poles; two cloth beaters keeping the "tok-tok" beat; buyers holding cloth up to the light; a fura seller with a calabash on her head; a tailor at a sewing machine.
- **Dawanau:** grain traders measuring with bowls; porters with sacks on head pads; a truck driver resting with tea, waving; a groundnut oil seller; a family buying beans.
- **The well room:** the store keeper (3.7).
- **Borehole Hall:** 3 people wait at the left door: a woman with a water can, a water cart pusher with his cart of cans, an elder. On each glug they cheer ("Yauwa!", then "Well done!"). At the finish they come in and fill up at the running taps; the cart pusher fills his cans first and grins (his work gets easier; nobody is put out of work).
- **The city:** walkers as Ogun; dyers; a queue at the water yard once it flows (adults and teens with cans, a child holding a parent's hand; never a child carrying heavy water alone).

**Bubbles** (words in words.ts as `KANO_WORDS`; every Hausa line marked ✓? is fine for the team's test link and is read by Tp or a Hausa speaker Tp trusts before the closed invited test, KN-Q4 settled, decision 91; plain words for children about 5 and up, decision 86):

| Kind | Words |
|---|---|
| Welcome (Kurmi, by the gate) | "Welcome!", "Barka da zuwa!" ✓? (Hausa, "welcome"), "Ẹ káàbọ̀!" (Yoruba), "Nnọọ!" (Igbo), "You don land!" (Pidgin) |
| Greetings, by time of day | "Ina kwana?" ✓? (Hausa, good morning: Kurmi), "Barka da rana!" ✓? (good afternoon: Kofar Mata), "Barka da yamma!" ✓? (good evening: Dawanau); any time: "Sannu!" ✓? (hello), "Hello!", "Ndewo!", "Ẹ n lẹ́ o!", "How far?" |
| Answers | "Lafiya lau!" ✓? (Hausa, "fine, thanks"), "Na gode!" ✓? ("thank you") |
| Traders | Kurmi: "Fine leather!", "New sandals!", "Hot kosai!" · Kofar Mata: "Blue cloth!", "Fresh fura!", "Ga fura!" ✓? ("here's fura") · Dawanau: "Groundnut dey!", "Ga gyada!" ✓? ("here are groundnuts"), "Good beans!" |
| Cheers | "Well done!", "Yauwa!" ✓? ("great!"), "Madalla!" (already checked in Lagos), "Sannu da aiki!" ✓? ("well done at your work", said to dyers and porters), "Ẹ kú iṣẹ́!", "I meela!", "Oya, go!" |
| The store keeper | "For Borehole Hall. Safe trip!" |
| Bus | "Bus don come!", "Sai an jima!" ✓? ("see you later") |

Never: any greeting or phrase that names God (KN-R7); no title words for rulers; no joke about how anyone speaks.

---

## 8. Screens and exact words (new or changed)

| Screen | Who sees it | Its one job | Exact words |
|---|---|---|---|
| Pothole Hall Win (changed) | a player who just beat King Pothole | send them on to Kano | "Ogun is switched on!" / "The road through the gateway is smooth. The way to the rest of Nigeria is open." / "The road north to Kano is open." / first win: big "On to Kano"; later: small "Go to Kano" |
| Bus ride north | a player going to or from Kano | show the long trip | gate board "WELCOME TO KANO" / "CENTRE OF COMMERCE"; "Skip" |
| Arrival card | first visit to Kano | welcome, and say the goal | "Welcome to Kano!" / "Kano is the Centre of Commerce. People come here to buy and sell." / "The dust has dried up the borehole. Fix Kano, and the water will flow." / "Let's go" |
| Download card (web only) | a web player opening Kano the first time | get Kano onto the phone | "Kano is ready to download (about 85 KB)." / "After this it plays with no internet." / "Download" / "Not now". No internet: "Kano needs the internet once to download. Lagos and Ogun still work with no internet." / "OK" |
| Travel card | anyone with Kano open | pick a state | "Where to?" / "Lagos" / "Ogun" / "Kano" / "Booming: {n} of 20" / "You are here" / "Back" |
| "To Kano" stop (Ogun road) | Ogun challenge road | go to Kano | "To Kano" / "Open", or locked "Win Pothole Hall"; card "The road to Kano is open." / "Go to Kano"; locked card "Win Pothole Hall to open the road to Kano." |
| Kano city | anyone in Kano | walk to a problem, a board or a tray | Heading "Kano". Spoken map name: "Kano from above. Tap where you want to go." Boards: "Clean road" / "Leather stalls" / "Lamps" / "Mast" / "Dye pits" / "Grain market" / "Groundnut pyramid". Bottom row as Ogun with "Travel" |
| Problem cards | a player who taps a pin | say what is wrong and how to earn | as 6.2 |
| Not enough card | a player short on a board | say where to earn | "You need {price} for this." / "Run Kurmi to earn more." / "Run the Harmattan Road to earn Power." / "...Tech." |
| Kano boom card | the first boom | celebrate | "Kano is booming!" / "New shops are opening. More traders are coming to Kano." / if the cog was not turning: "Kano's cog is turning on Nigeria's wheel!" / "See Kano" |
| Street cleared | each Kano street | well done, send them on | "Street cleared!" / "{Kurmi / Kofar Mata / Dawanau} is moving again, thanks to you! You got {money}." / with the parcel: "Your garri parcel is saved for Borehole Hall." / big "Take it home"; small "Next street" or "Go to Borehole Hall", "Play again" |
| Borehole Hall Win | a player who beat Rusty Borehole | celebrate the water | "Kano is switched on!" / "The water is flowing. The markets of Kano are busy again." / "You got {money}." / big "Take it home"; small "Play again", "Challenge road" |
| Out of lives | a player who lost every life in Kano | try again | "Out of lives" / street: "You keep {money}. The street is still here. Try again!"; hall: "Rusty Borehole is still dry. Try again!" / Gentle offer as Lagos / big "Play again"; small "Home", "Challenge road" |
| Harmattan Road Pause | a player in the lane run | leave early | Lagos's Pause with "Back to Kano" |
| Title, hero builder, Pause, Game over | unchanged | | the title line stays "Build up Lagos. Get Nigeria working." (decision 24) |

**Accessibility:** every button at least 44 x 44 px (big ones 56 tall), 8 px apart; Sound and Music switches work everywhere; never colour alone (wind: arrow sign and streamers; cloth: frame shape and bounce sign; whirl: spinning shape and leaves; the stuck valve: "STUCK" tag and shaking; hit counter: valve shapes with ticks); Gentle mode as 3.3 and 5.4; reduced motion stills the ride, the cog and the finish; screen readers hear every card in order. The haze never sits over the play line (KN-R6).

---

## 9. Light on a cheap phone, and size

### 9.1 Budgets (gzipped)

Everything drawn and made in code (decisions 33, 65). Kano is one lazy part, `dist/worlds/kano/`, loaded only when the player first goes there.

| Piece | Where it lives | Budget |
|---|---|---|
| Third Travel button, "To Kano" stop, "On to Kano", wheel lines, the ride's Kano end | first load | 4 KB at most |
| Kano's art (3 street backdrops, casts, gate and wall, hall, Rusty Borehole, valves, cloth frames, whirls, wind signs and streamers, foods, well room, city blocks, lane look) | Kano part | 52 KB |
| Kano's game code (wind, springy cloth, whirl, the boss, Kano city places) | Kano part | 16 KB |
| Kano's levels (3 streets, well, hall, lane) | Kano part | 11 KB |
| Kano's tunes and sounds (code notes) | Kano part | 6 KB |
| **Kano part in all** | | **about 85 KB, 150 KB at most** (players are told "about 85 KB"; 150 KB is the CI limit). Ogun measured 79 KB |

- `scripts/check-size.mjs` gets a line `kano: 150 * 1000` in `WORLD_BUDGETS`.
- Kano must load and play without the Ogun part on the phone (KN-R10). Anything both use (the rock platform code reused for sacks, the ride, the arrival card) moves into a shared piece; if it lands in the first load it counts toward the 4 KB.
- Speed as Ogun (ogun.md 9.2): a Kano street's first frame no more than 30 ms after a Lagos street's on the slow phone profile; the city idle draws nothing; drag and the hall at least 45 fps at 4x CPU. The haze, dust streaks and streamers are baked strips copied as the camera moves, never drawn fresh each frame, and never `shadowBlur` or `filter` (style 1.5). Before the closed invited test, one Kano street and Borehole Hall join decision 83's real-phone check.

### 9.2 Downloading

As Ogun (OG-R6): on the web, fetched the first time the player opens Kano, then kept for offline; in the store app, already inside.

---

## 10. Build order (slice K)

Lagos and Ogun quick missions (decision 89) and style step ST-H (decision 88) are done (po accepted both 24 Nov, f54e0a1). ST-H is live, so Kano art starts now, and every Kano person (street casts, the store keeper, the door people, the city walkers) is drawn with the style.md 1.8 crisp recipe from the first stroke. Kano's quick missions stay fixed, never daily (decision 90). Each row passes qa, on the slow phone profile too, before it is done; po accepts.

| id | owner | task | depends on | done when | size |
|----|-------|------|------------|-----------|------|
| K0a | designer | Level files kano-1, kano-2, kano-3, kano-well, kano-hall, kano-lane, and `KANO_WORDS` list | none (KN-Q1 settled, decision 91) | every rule in 3.3 and S2.6 passes the level test | 11 KB |
| K0b | po | Check "Kofar Mata", "Centre of Commerce", the hall and the cast against the hard rules (2.3); rule on the Durbar if asked (KN-R8) | none | written ruling in questions.md. **Done 25 Nov (po).** | |
| K1a | art | Wall and gate (faded, bright), the long ride north and its welcome tune, "To Kano" stop, Kano cog pennant | ST-H (done) | 1.4 rules; no real gate, crest or script | 6 KB |
| K1b | gamedev | Lazy Kano part, download card, third Travel button, ride, arrival card, "On to Kano", "To Kano" stop, wheel lines, saves with an old-save test | K1a | part 1 words exact; old saves load; Lagos and Ogun play the same; first load grows 4 KB at most | 4 KB first load |
| K1c | qa | K1 pass | K1b | part 1 at 320 x 240, 568 x 320, 640 x 200, 851 x 393; offline after one visit; Kano opens with the Ogun part absent | |
| K2a | art | Kurmi backdrop, wind sign, streamers and dust streaks, kilishi, Kurmi cast, the street tune | K0a | 2.2, 2.3, 7; haze on far rows only; people to style 1.8 | 12 KB |
| K2b | gamedev | Wind rules, kilishi, `gate` field, Kurmi plays | K0a, K1b, K2a | 3.3 wind rules in tests (no wide pit in a headwind, Gentle eighth) | 3 KB |
| K2c | qa | Kurmi pass | K2b | an Ogun finisher clears Kurmi in 3 tries or fewer; wind reads in greyscale | |
| K3a | art | Kofar Mata backdrop (dye pits behind the wall), cloth frames, fura da nono, groundnut store and keeper, cast, the street tune | K0a | pits as scenery only; own patterns; people to style 1.8 | 12 KB |
| K3b | gamedev | Springy cloth, well room and parcel save, Kofar Mata plays | K2b, K3a | bounce numbers in tests; never over a pit | 3 KB |
| K3c | qa | Kofar Mata pass | K3b | 4 tries or fewer | |
| K4a | art | Dawanau backdrop, sack steps, groundnut pyramid, dust whirl, cast, the street tune | K0a | whirl readable at 320 x 240 and in greyscale; people to style 1.8 | 9 KB |
| K4b | gamedev | Whirl hazard, fura da nono, sacks, secret well, Dawanau plays | K3b, K4a | whirl and corn rules in tests | 3 KB |
| K4c | qa | Dawanau pass | K4b | 4 tries or fewer | |
| K5a | art | Borehole Hall, Rusty Borehole (wheeze, gust, hiccup, sneeze, clean shine), valves, wash line, door people, hall tune | K0a (KN-Q2 settled) | 5.1, 5.2; a problem, never a person; door people to style 1.8 | 10 KB |
| K5b | gamedev | Valves and the bump hit, "holds his breath" rule, coughs, gusts, phases, finish, Win screen | K4b, K5a | 5.3 to 5.5 numbers; tests that no whirl leaves him during a bounce | 4 KB |
| K5c | qa | Hall pass | K5b | a Dawanau finisher wins in 3 tries; Gentle wins in 3; never Nintendo-like | |
| K6a | art | Kano city blocks (tired and bright), wall edge, places, pins, Harmattan Road look | K1a | 6.1; no real building or brand; walkers to style 1.8 | 9 KB |
| K6b | gamedev | Kano city, tax places, Booming meter and cog, challenge road, Harmattan Road | K1b, K6a | 6.2 to 6.5; money adds up; W18 words with Kano names | 3 KB |
| K6c | qa | City, road and lane pass | K6b | 45 fps drag at 4x CPU; idle draws nothing | |
| K7 | qa, then po | Kano full pass, then po accepts | K2c to K6c | Kano part 150 KB at most; offline; slow phone; originality, "mock no one" and nothing-religious check; before the closed invited test, Tp or a Hausa speaker Tp trusts has read the Hausa lines and the three street names (decision 91) | |

Sizes: the Kano-part rows add up to part 9.1 (art and tunes 58, code 16, levels 11, so about 85 KB); K1b's 4 KB is first load. If K7 measures the part over 95 KB, the download card's "about 85 KB" is changed to the measured size.

Order: K0a, K0b and K1 together; then K2, K3, K4 in order (each street teaches what the next and the hall use); K6 beside K3 to K5 once K1 is done; K5 last of the play.

---

## 11. Rulings under decision 64 (one line each for Tp)

- **KN-R1.** Lagos to Kano plays one ride (the Kano one), not Lagos-to-Ogun then Ogun-to-Kano.
- **KN-R2.** "Centre of Commerce" is Kano's well-known name, a phrase, not a crest (like "the Gateway State"). po confirmed in K0b (25 Nov).
- **KN-R3.** No Arabic or Ajami writing anywhere in Kano, since a child or parent may read any script as religious; all signs are our own English shop words.
- **KN-R4.** The dye pits are scenery behind a low wall, never a hazard or something to fall in; the craft is shown with pride.
- **KN-R5.** The groundnut pyramid is our own small stack of sacks and a "long ago" line, not a copy of any photo.
- **KN-R6.** The Harmattan haze is gold, never grey, and only on far rows, so Kano never looks run-down and the play line stays clear.
- **KN-R7.** No greeting or bubble names God, even common everyday ones, to keep faith out of the game.
- **KN-R8.** The Durbar is left out (it is tied to religious festivals and royal courts). po ruled in K0b (25 Nov): it stays out of version 1.
- **KN-R9.** Nothing about danger or crime in the North, and no child begging, alone on the street or at work.
- **KN-R10.** Kano's streets use none of Ogun's mud, cracks or gravel, so the Kano part works without the Ogun part.
- **KN-R11.** The well parcel stays the garri parcel (decision 18), drawn with Kano's groundnuts and cloth; no new power.
- **KN-R12.** Kano's lane run is "Harmattan Road", with the Expressway's numbers and no new rule.
- **KN-R13.** Dawanau's secret well sits before the bus stop (5150 to 5480), not after it, so the bus stop is never skipped (design.md S2.5 rule 5). K0a, 25 Nov.
- **KN-R14.** No more sky-only win: the next valve stays shut ("WAIT", head bump goes "clonk") until that phase's first whirl has left Rusty, then shakes loose ("STUCK") and stays ready. The held breath is unchanged (no whirl leaves him from a cloth bounce until the hero's feet touch the floor; a due whirl waits at his mouth, wheezing, and leaves 0.5 s after landing), so a whirl still never lands on a child mid-bounce. Fastest win about 11 s with three whirls met. Hint after 3 s of bouncing on "WAIT": "Come down and let him cough!" Data: `boss.valveNeedsWhirl: true`, `boss.waitHintAfter: 3.0`, `boss.heldWhirlDelay: 0.5`. 25 Nov.
- **KN-R15.** A whirl never appears touching the hero (the OG-R25 rule, Pothole Hall): it leaves at x 440, where a hero holding Forward stands, so it hurt them on its first frame (K5c qa). Now while the hero's box is within 11 u of the whirl's box at his mouth (x above 407), a whirl due waits there, wheezing, and rolls out 0.5 s after they step clear, so it is always seen leaving him. Walking into a rolling whirl still hurts. No stalemate (lead, 25 Nov): after 2.0 s of waiting (Gentle 2.4 s) with the hero still there, a soft, harmless "Hmph!" puff slides them back about 60 u (Forward held only during the slide), and the whirl rolls out 0.5 s after they are clear; the first puff of a try shows "Step back so he can cough!". Data: `boss.whirl.clearGap: 11`, `boss.huff`, `boss.gentle.huffAfter`. 25 Nov.
