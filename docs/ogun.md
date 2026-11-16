# Ogun, the Gateway State (designer note, 15 Nov 2026)

Owner: designer. Written for decisions 72 and 73: after General Go-Slow the next state comes, and it is Ogun, with King Pothole as its boss (brief "Worlds" item 2). Tp added on 15 Nov: **"Ogun is gateway state, remember."** So the Gateway State is the heart of this note: Ogun is the road and the gate out of Lagos to the rest of Nigeria, bad roads block that gate, and fixing Ogun opens the way on.

This note is to Ogun what docs/city.md is to Lagos. It is the source for the O tasks in part 10. Where it gives a number or a word, it wins over older drafts (city.md part 3 once said "about 400 KB"; it now says "about 130 KB", from part 9 here).

Sources: decisions 7, 13 to 19, 29 to 38, 42 to 48, 62, 64, 66 to 73; docs/city.md (parts 1 to 3, 5W, W3, W18); docs/design.md (S2.2 jump rules, S2.5 well, S2.6 streets, S2.7 hall, S2.8 saves and the wheel, S2.14, S2.15, S2.16, S3f0 lane run, S3e0 challenge road, "People everywhere"); src/data/levels/lagos-*.json.

**Open for Tp:** OG-Q1 to OG-Q7 in docs/questions.md (names, Olumo Rock, King Pothole's look, one hall per state, one money for all states, foods and fair shares, the state after Ogun). This note is built on the recommended answers; lines that change with a different answer are marked with the question's id. Small rulings OG-R1 to OG-R9 follow the team's recommendation under decision 64 and are reported to Tp in one line each.

**Decision context for the lead (not a decision line until Tp confirms):** Tp, 15 Nov 2026: "Ogun is gateway state, remember." Draft line: "74. Ogun is the Gateway State: the road and the gate out of Lagos to the rest of Nigeria. The player arrives under our own welcome gateway (never the real gantry, crest or emblem), sees "Welcome to Ogun, the Gateway State", and fixing Ogun (beating King Pothole) opens the way to the next states. (Tp, 15 Nov)"

---

## 0. Ogun in one line

You take the bus out of Lagos, pass under a big welcome gateway, and find the road to the rest of Nigeria full of potholes. King Pothole has dug in at the gateway. Fix Ogun's roads, water, lights and markets, smooth him out, and the way to every other state opens.

- **Who it is for:** every player who has beaten General Go-Slow (decision 72).
- **The one job:** show that Nigeria Company is more than Lagos, and that fixing one state opens the road to the next.
- **New things it teaches:** mud, rock steps, cracks that open, hopping gravel, two roads, carrying, a boss who is a hole in the floor. One per street, never two at once.

---

## 1. How the player gets there

### 1.1 When Ogun opens

Ogun opens the moment Go-Slow Hall is won for the first time (decision 72). Nothing else is needed: no Booming meter mark, no money. A save that already has `states.lagos.hall.done` when the update arrives opens Ogun at once and shows the arrival card (1.4) the next time the player taps "Go to Ogun".

### 1.2 Three ways in

1. **The Win screen after Go-Slow Hall.** It gains a big button **"On to Ogun"** above the old buttons. The line under "Lagos is switched on!" becomes: "The road to Ogun is open. Ogun is the gateway to the rest of Nigeria." After later hall wins the button stays but is small ("Go to Ogun").
2. **The Lagos challenge road.** A new stop, **"To Ogun"**, on a second side road that leaves the main road between Go-Slow Hall and the Ferry and climbs up and off the right through our own gateway arch (the mirror of the Lane run's side road on the left). Box 484, 4, 112, 64 in road units (S3e0 part 4). The road picture stays 680 x 168. Before the hall is won: sand plate, padlock, "Locked", line 3 "Win Go-Slow Hall". After: danfo yellow, a small arch icon, "Open". The Ferry stays a Lagos stop, as S3e0 says (it leads to more of Lagos, not to Ogun).
3. **The city's new "Travel" button.** Once Ogun is open, the city's bottom row gains **"Travel"** (a small danfo icon) between "Challenge road" and "Hero". It opens the Travel card (1.5).

Tapping "To Ogun" or "On to Ogun" plays the bus ride (1.3), then the Ogun city. It never starts a run.

### 1.3 The bus ride out of Lagos (about 4 s, skippable)

A side view, drawn in code. A yellow danfo with the hero at the window drives right along a busy road: Lagos blocks behind, then palm trees, then our own gateway arch over the road. The bus passes under it, a short welcome tune plays (our own, about 1.5 s: talking drum and a bright shaker), and the arch's words are in view for at least 1.5 s.

- Tap or Enter: jump to the end picture. "Skip" button (44 x 44, top right) ends it at once.
- Reduced motion: the end picture only, the bus under the arch.
- After the first time it is 2 s, and only if "Show the bus ride" is on in Settings (default on).

### 1.4 The gateway arch (our own drawing, decision 19)

Two tall, round pillars wrapped in our own indigo-and-white pattern in the style of adire (never a named traditional pattern, OG-R1), joined by a wide beam across the road. On the beam, in big cream letters: **"WELCOME TO OGUN"**, and under it, smaller: **"THE GATEWAY STATE"**. In the middle of the beam, the game's own Wheel cog (the shape from the intro), slowly turning once the arch is lit.

- Never the real gantry's shape or colours, never the state's crest, coat of arms, logo, flag or any government seal. No figures, no statues, no faces, no writing other than the two lines.
- Before Ogun is switched on, the arch is warm but a little faded (decision 47), with its cog still. After King Pothole, it is bright, its lamps glow at night, and the cog turns.
- It shows in four places: the bus ride, the start of street 1 (Ota), the Ogun city's edge, and the "To Ogun" stop.

**The arrival card** (first visit only, over the Ogun city):
- Heading: **"Welcome to Ogun, the Gateway State!"**
- Line 1: "The road to the rest of Nigeria runs through here."
- Line 2: "King Pothole has dug in at the gateway. Fix Ogun, and the way opens."
- Button: **"Let's go"** (56 px tall).
- Screen readers hear the heading, both lines, then the button. Escape or Android back closes it like the button.

### 1.5 The Travel card

- Heading: **"Where to?"**
- Two big buttons, side by side (one above the other when narrower than 400 px), each at least 140 x 72 px:
  - **"Lagos"**, under it its Booming line ("Booming: 20 of 20 ✓" or "Booming: 9 of 20") and a small cog: turning with a tick if its cog turns, still if not.
  - **"Ogun"**, the same, plus "You are here" with a small pin shape on whichever state is open now (that button still works and just closes the card).
- Small "Back".
- Screen readers: "Lagos. Booming 20 of 20. Cog turning." / "Ogun. Booming 4 of 20. You are here."

Going from Ogun to Lagos plays the same ride the other way, under the arch's back ("SAFE JOURNEY", our own words; it is the back of our own arch, so nothing real is copied).

### 1.6 Lagos stays playable

- Every Lagos street, the hall, the lane run, the city, its pay spots and its trays stay exactly as they are. Nothing in Lagos gets harder, easier, locked or reset.
- The Lagos Booming meter keeps going up, and its later marks still come.
- A player can go back and forth as often as they like. The game opens on the city they last used.

### 1.7 Nigeria's wheel shows a second cog

- **Ogun's cog** is not next to Lagos's on the wheel (the cogs go A to Z, and Nasarawa and Niger sit between), so it gets its own mark: while Ogun is open but its cog is not turning, the cog has a small pennant shape and the list says "Ogun, next" (never colour alone: the pennant and the word).
- Ogun's cog turns at Ogun's first boom (20 points, as Lagos, decision 45 and city.md "It never ends").
- The rail's line changes (S2.8):

| When | Old line | New line |
|---|---|---|
| No cog turning | "Fix Lagos to turn the first cog." | the same |
| Lagos turning, Ogun not open | "More states are coming soon." | "Win Go-Slow Hall to open the road to Ogun." |
| Ogun open, not turning | "More states are coming soon." | "Next: Ogun, the Gateway State." |
| Ogun turning, King Pothole not beaten | | "Ogun is turning. Smooth out King Pothole to open the gateway." |
| King Pothole beaten | | "The gateway is open. More states are coming soon." |

- In the "All names" list a turning name is ticked and bold as now; "Ogun, next" uses the pennant before the name in place of the tick.
- **The gateway on the wheel (story beat):** when King Pothole is beaten, a short glow runs from Ogun's cog to the cogs either side and fades (1 s; none with reduced motion), and the rail line above shows. It tells the player the next cogs are reached through Ogun. Decision 16's map arrives with the second region; on it, the next region's road will start at Ogun's gateway (OG-Q7).

### 1.8 Saves carry over

Everything stays on the phone, in the same key `gidi-progress` (S2.8 rules: merge, never overwrite; unknown parts kept; a broken part starts empty and is not written over until the player finishes something).

```json
{
  "v": 1,
  "states": {
    "lagos": { "streets": {}, "parcel": false, "hall": { "done": true, "best": 0 }, "lane": {} },
    "ogun":  { "streets": {}, "parcel": false, "hall": { "done": false, "best": 0 }, "lane": {},
               "city": { "fixed": [], "fixes": 0, "boom": 0, "trays": {}, "heroAt": null },
               "arrived": false }
  },
  "city": { "kobo": 0, "power": 0, "tech": 0, "fixed": [], "fixes": 0 },
  "where": "lagos"
}
```

- The existing `city` part keeps Lagos's map and also holds **the one wallet** (Naira, Power, Tech) for every state (OG-Q5). Money earned in Lagos can fix Ogun and back.
- `states.ogun.city` holds Ogun's own fixes, Booming points, trays and where the hero stood. `arrived` is set when the arrival card is closed. `where` is the last city open.
- A save from before this update has no `ogun` part and no `where`: it loads as "lagos", and Ogun is open if the Lagos hall is done.
- The Ijebu garri parcel (part 4) is `states.ogun.parcel`, separate from Lagos's garri parcel. One parcel per state, never stacking (decision 18).
- gamedev may shape the keys differently, but must keep these rules and add a load test with an old save, a save with Ogun half done, and a broken `ogun` part.

In plain words for players (Settings, under "Saved on this phone"): "Your hero, Lagos and Ogun are saved on this phone."

---

## 2. Ogun's identity, with pride

### 2.1 What Ogun is in the game

**The Gateway State.** The roads out of Lagos run through Ogun to the rest of Nigeria: the expressway north with its busy interchange, the roads to the west and the border market. Goods pass through: trucks of cement and gravel, garri and kola nuts, cloth and factory goods from Ota and Agbara. Ogun is proud, busy and welcoming, and its trouble is the trouble everyone shares: roads that break, taps that run dry, lights that go out. No place is shown as broken for good, behind or to blame.

### 2.2 What we show (our own drawings, real and proud)

| Thing | Where it shows | How |
|---|---|---|
| **Adire** (indigo tie-dye cloth) | Abeokuta street, the city's adire market, the gateway pillars, the hall's door people | Cloth hanging on lines in yards, dye pots, folded piles, sellers holding up cloth. Our own patterns only: circles, stripes, dots, folds. Never a named traditional pattern (OG-R1) |
| **Ijebu garri** | Sagamu market, the city's garri mill, the well room's parcel | Big basins of fine, crisp garri; sacks; a mill shed with steam from the roasting pans (never flames, OG-R4) |
| **Ofada rice and sauce** | A food (part 4), a buka in Ota, a seller in Abeokuta | Rice and the dark pepper sauce, wrapped in a broad green leaf |
| **Ikokore** | A food (part 4), sellers in Sagamu | A warm pottage of water yam in a bowl |
| **Kola nut market** | Sagamu street, a later city build | Traders sorting kola in big baskets lined with leaves; buyers from every region (Sagamu's kola trade links south and north). Trade only, never breaking kola, prayer or reading kola (OG-R1) |
| **The Ogun River** | The city's river and our own bridge; far scenery in Abeokuta | Wide, brown-green water, canoes far off, people on the bank chatting. No shrine, no offering, no white cloth (OG-R1) |
| **Rocks** | Abeokuta street (rock steps), the city's north edge | Big smooth grey granite outcrops, our own, unnamed (OG-Q2). Never the real Olumo Rock drawn to look real, never a shrine or steps to a holy place |
| **Quarries** | Far background of Sagamu, one city edge | A working quarry seen far off: grey terraces, a crusher shed, tipper trucks. Workers in plain hard hats, no vests or badges, never children, never blasting (OG-R5) |
| **Industry** | Ota street, the city's factory estate | Long factory sheds with saw-tooth roofs, gates with no names, workers at shift change, trucks loading crates. No brands, no real company, no smoke stacks with black smoke |
| **The expressway and interchange** | Sagamu street, the lane run, the city's middle | A wide road with a flyover and ramps, trucks and danfos, road cones. Called "the expressway" or "the interchange", never the real road's name (OG-R2) |
| **Border market road** | A city corner and a "Coming soon" road stop | A busy market road with traders, sacks and cloth, under a plain "BORDER MARKET" board. No border post, gate, officers, customs or fences (OG-R7) |

### 2.3 What we never show (rule 4, decision 19)

- **Ogun the state, never Ogun the Orisha.** "Ogun" is only ever the state's name. Nothing religious is drawn or named: no shrines, altars, sacred trees, offerings, masquerades, festivals, priests or robes of office.
- Because Ogun is also the Orisha of iron, Ogun State gets **no blacksmiths, forges, anvils, cutlasses or machetes, no iron charms, no dogs shown as offerings, and no fringes of young palm fronds** (they are holy signs). Palm trees are fine. Plain tools on a road works yard (a spade, a roller) are fine (OG-R1).
- No church, mosque, shrine or holy rock. No real building, bridge, palace, crest or brand.
- No traditional ruler, palace, crown of beads, staff or title dress anywhere, including on King Pothole (OG-Q3).
- No accent, dialect or tribe joke. Egba, Ijebu, Remo and Awori people (and everyone who lives in Ogun from every region) are shown the same way: busy, kind, proud.

### 2.4 The look of each part (decision 47: faded but warm and proud)

Ogun starts like Lagos did: **a bit faded, still warm.** Colours a little dusty, roads patched and cracked, some lamps dark and taps dry, but people are busy and smiling, cloth bright on the lines, markets full. Each fix brightens its block for good. Ogun's own colour note: **indigo** (adire), **laterite red-brown** (the earth and roadsides), **granite grey** (the rocks), with the game's warm cream and danfo yellow. Indigo is never used alone to mean anything (never colour alone).

### 2.5 Ogun's music (decision 30)

Our own code-made tunes, in a light, rolling feel with talking drum, sekere-style shaker and a thumb-piano bass line (the kind of sound South-West street music uses), with our own notes. Never a known song, hymn, chant or praise song, never a real artist's tune. The hall tune speeds up after each hit, as in Go-Slow Hall. The next region brings its own instruments (north or east), so the share stays equal.

---

## 3. The three streets

Rules from design.md S2.2 and S2.6 all hold: pit kinds and widths, 160 u clear run-up before every big pit, hazards at least 200 u from a pit, food at least 300 u from a pit, the corn rules, a warning sign before every pit 90 u or wider, hints at least 120 u apart, three lives (five in Gentle), one bus stop checkpoint, and each street ends at the yellow bus. People follow "People everywhere" (part 7 here).

### 3.1 Street names (OG-Q1; decision 19)

| Street | Theme | Name (recommended) | Backup | Why |
|---|---|---|---|---|
| 1 (ogun-1.json) | morning, the gateway in, the factory road | **Ota** | Agbara | The first big Ogun town over the Lagos line, busy with factories and trucks: you arrive through it. "Ota" alone, not "Sango-Ota": Sango is also an Orisha's name (OG-R1) |
| 2 (ogun-2.json) | midday, adire yards and rocks | **Abeokuta** | Ijebu-Ode | The state capital, famous for adire and for its rocks ("under the rock"). A town name, not a building |
| 3 (ogun-3.json) | evening, the interchange and the kola market | **Sagamu** | Ifo | Where the big roads meet, and a famous kola nut market. Fits the gateway: every road passes it |

Ijebu-Ode is honoured in the city (the garri mill block) and in the well room's Ijebu garri parcel.

Cleared words (decision 19): "Ota is moving again, thanks to you! You got {money}." The same for Abeokuta and Sagamu. A line that says something is wrong never names the place ("this road", "here").

### 3.2 The difficulty curve after Lagos

A player who finished Lagos knows every move. Ogun starts level with Lagos street 2, and ends one step past Lagos street 3. Each street adds one new thing in the first half, then mixes it in after the bus stop.

| | Alausa | Computer Village | Ikeja | **Ota** | **Abeokuta** | **Sagamu** |
|---|---|---|---|---|---|---|
| Length (u) | 10520 | 10920 | 11080 | 11320 | 11720 | 12120 |
| Full run / typical | 67 / 90 s | 70 / 91 s | 71 / 92 s | 73 / 96 s | 75 / 100 s | 78 / 105 s |
| New thing | walk, jump, crate, pit | roof crates, the well | the drum, secret well | **mud**, ikokore | **rock steps, cracks**, ofada | **hopping gravel, two roads** |
| Big pits | 1 | 1 | 2 | 1 (after mud) | 1 | 2 (one after mud) |
| Moving hazards | 8 | 11 | 14 | 6 | 5 | 10 |
| Mud and cracks | 0 | 0 | 0 | 6 mud | 1 mud, 6 cracks (O0a2: 3.5 places 6) | 4 mud, 2 cracks (O0a3: 3.6 places 4) |
| Hints | 15 | 4 | 2 | 4 | 5 | 3 |
| Well | none | yes | yes, secret | none | yes | yes, on the low road |

**Three tries or fewer:** a player who finished Lagos should finish Ota in 3 tries or fewer, and each Ogun street in 4 or fewer. If qa's testers need more, take back in this order: Sagamu's gravel at 11500; Abeokuta's crack 60 at 5700 becomes 40; Ota's tyre at 11000; then mud widths down by 40; then big pits 170 to 160.

### 3.3 The new things (rules for gamedev and the level test)

**Mud patch** (`mud`: [x, width], width 80 to 200; Ota first).
- Dark brown, wet ground with shiny ripples, a few puddle rings and footprints that fill in behind the hero. Not colour alone: the ripples, the footprints, a soft "splosh" step sound and the hero's slower legs.
- On mud the hero's top speed is walk speed (90; 120 with corn). The run timer goes back to 0 on leaving the mud, so a run builds again. Jumps work as normal from walk speed. Mud never hurts.
- Rules: mud ends at least 60 u before any pit lip (take-off is always on firm ground); no mud in the 160 u run-up of a big pit; no mud on a checkpoint, spawn, well or bus door ± 100 u; a big pit after mud gets at least 300 u of firm road (time to run again).
- Ikokore: mud does not slow you while it works.

**Rock steps** (Abeokuta). Granite ledges drawn as rocks. They are one-way platforms like the stall roofs (no new code): you land on top from above and pass up through them from below. Never higher than 150 u per step from the one below.

**Water in a pothole** (Abeokuta, look only). Some potholes are drawn holding brown water with a ripple ring. They are the same widths and kinds as every pothole and have the same warning sign rule. A hint says it once.

**Crack** (`crack`: [x, width], width 40 or 60 only; Abeokuta first).
- A zigzag crack line drawn across the road from the start, with small dust puffs rising from it and a small sign beside it (a cracked-road picture, the same sign shape as the pothole warning sign). Visible from as far as the screen shows.
- When the hero first comes within 240 u of its left lip, it rumbles for 0.4 s (shakes, dust, a low "krrk") and opens into a tap (40) or hold (60) pothole. It stays open after that, for the rest of the try.
- Fair rules: no crack within 300 u of a spawn, checkpoint or exit well; no crack in a big pit's run-up; no crack in a corn's reach (2736 u after a corn), because at corn speed 240 u is less than 1.5 s of warning. In Gentle mode cracks open at 300 u.
- Ofada: cracks do not open while it works; a crack you pass while it works stays shut for good. When ofada wears off, any crack within 240 u ahead also stays shut for good (no crack ever opens right under your feet).

**Hopping gravel** (`gravel` hazard; Sagamu first).
- A lump of broken tarmac and stones, 18 wide x 16 tall, that hops left along the road: 70 u/s, a 40 u high hop every 0.7 s (0.35 s in the air, 0.35 s on the road). Not colour alone: lumpy shape, a dust puff at each landing, a "tk" sound.
- Jump over it (a tap clears it), or land on it from above to bounce (vy -480): it crumbles into dust. Amala smashes it. Ikokore: touching it crumbles it, no hurt. Fufu knocks it off the road. Any other touch hurts.
- Corn and placing: as the tyre (S2.2 rule 3: allowed in the second half of a corn's reach, never in the fast stretch). First one alone with a hint. Wakes like any hazard and drops into potholes.

**Two roads** (Sagamu). A flyover deck: steps up (60 then 120 high), a long one-way deck 140 high, steps down. On top: coins and a fufu. Underneath: mud, gravel and the secret well. Either road reaches the bus stop. The deck has no gaps.

### 3.4 Street 1: Ota (src/data/levels/ogun-1.json)

Idea: morning on the factory road just inside the gateway. The yellow bus drops you under the arch; long factory sheds with saw-tooth roofs, a truck park, a buka with ofada rice, a phone kiosk, a vulcanizer, palm trees. Signs (made up): "OFADA RICE", "BUKA", "VULCANIZER", "POS HERE", "PROVISIONS". Teaches one new thing: mud.

Length: spawn 80 to bus 11400 = 11320 u. 73 s at full run, about 96 s typical.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Arrival | 80-900 | | The arch over the road at 200. Toast as the hero passes under: "Welcome to Ogun, the Gateway State!" Kobo at 300, 500, 700; kobo crate at 800 |
| Potholes | 900-1900 | (refresher) | Tap 40 at 1100, hold 60 at 1450, wide 100 at 1800 (sign at 1680). Kobo over each |
| Mud | 1900-3300 | **mud** | Hint 1980: "Mud! It slows you down." Mud 2100, 120 wide, with kobo on it. Mud 2600, 160 wide. Tap pothole 40 at 2900 (a walking jump clears it) |
| Roof and garri | 3300-4400 | | Roof at 3500 (60 high) with a kobo crate. Garri crate at 3900. Goat at 4200 to spend the shield on |
| Bus stop | 4500 | | Hint 4500: "Bus stop! Now you start here." (the Lagos words, which Gentle mode already swaps for "Bus stop! Halfway there.") |
| Mud, then a big pit | 4500-5400 | mud before a pit | Hint 4630: "Big pit! Leave the mud, then run." Mud 4700, 120 wide. Firm, clear road 4820 to 5150. Big pit 170 at 5150 (sign 5030, cones, kobo arc) |
| Ikokore | 5400-6900 | **ikokore** | Ikokore on the road at 5700. Hint 5640: "Ikokore! Mud won't slow you now." Mud 5900, 200 wide; goat 6350; mud 6550, 160 wide; tyre 6900 |
| Corn | 7700-10436 | | Roasted corn on the road at 7700. Fast stretch to 9068 (no tyre, no gravel): roofs at 8000 and 8500 with kobo crates, tap pothole 40 at 8250, mud 8700, 120 wide. Second half: tyre 9300, tap pothole 40 at 9700 |
| Fufu | 10100-11400 | | Pepper fufu on the road at 10100. Goat 10400, hold pothole 60 at 10700, tyre 11000. Bus door 11400 |

Kobo: 160 loose and 12 in crates (4 kobo crates: 800, 3510 on the roof, 8000 and 8500 on roofs). Well: none (the arrival street stays simple). Hints: 4 plus the arch toast (the toast is `OGUN_WORDS.toast.arch`, shown when the hero passes `arch`; it is not a hint line in the file).

**Built (O0a1, 15 Nov):** src/data/levels/ogun-1.json. Pits as ground gaps: tap 1100, hold 1450, wide 1800, tap 2900, big 5150 (170), tap 8250, tap 9700, hold 10700. Roofs [3440, 240, 140], [7940, 245, 120], [8440, 245, 120]. End: bus door 11400, wall 11600. Every hint is 35 characters or fewer (S2.2 hint bar). Checked by tests/unit/street.test.ts (S2.6) and tests/unit/ogun-levels.test.ts (3.3 mud rules, ikokore, arch, words). Until gamedev adds the `ikokore` food kind (O2b), the S2.6 test reads the file without it and ogun-levels.test.ts checks it by the same food rules.

### 3.5 Street 2: Abeokuta (src/data/levels/ogun-2.json)

Idea: a bright midday in Abeokuta's adire yards, with big smooth rocks rising behind the roofs and the river glinting far off. Cloth hangs high on lines behind the stalls; dyers work at their pots on the back pavement. Signs (made up): "ADIRE", "FINE CLOTH", "OFADA RICE", "TAILOR", "PROVISIONS". Teaches rock steps, then cracks, then ofada.

Length: spawn 80 to bus 11800 = 11720 u. 75 s at full run, about 100 s typical.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Warm up | 80-1000 | | Kobo; kobo crate at 700 |
| Rock steps | 1000-2400 | **rock steps** | Hint 1050: "Rocks! Jump up from step to step." Steps at 1200 (50 high), 1330 (100 high), 1460 (150 high), each 100 wide, kobo on top. Then one long rock ledge 1900 to 2200, 90 high, over a wide pothole 100 at 2000 (sign 1880): go over the rock or double jump the hole |
| Water potholes | 2400-3300 | (look only) | Hint 2500: "Water pothole! Jump over it too." Tap 40 at 2600, hold 60 at 2900, both with water |
| Well | 3300-3600 | | Entrance well at 3500 in a quiet yard between two stalls (no people within 120 u). Exit well at 4700 |
| Goat and mud | 3600-4700 | | Pepper fufu at 3700. Goat 3900, mud 4200, 120 wide, tyre 4500 |
| Bus stop | 4900 | | "Bus stop! Now you start here." |
| Cracks | 4900-6600 | **cracks** | Hint 5030: "Crack! It opens up. Jump over it." Crack 40 at 5250 alone, kobo over it. Crack 60 at 5700. Crack 40 at 6000. Clear road 6040 to 6400. Big pit 170 at 6400 (sign 6280) |
| Ofada | 6900-8400 | **ofada** | Ofada on the road at 6900. Hint 6840: "Ofada! Cracks stay shut now." Crack 40 at 7300, goat 7600, crack 60 at 7900, crack 40 at 8300 |
| Corn | 8900-11636 | | Corn crate at 8900. Fast stretch to 10268: roof at 9100 with a kobo crate, tap 40 at 9400, roof at 9700, tap 36 at 9950. Second half: tyre 10500, goat 10800, hold pothole 60 at 11200. Bus door 11800 |

Kobo: about 150 loose and 12 in crates, plus 17 in the well room.

**Built (O0a2, 15 Nov):** src/data/levels/ogun-2.json and src/data/levels/ogun-well.json. Pits as ground gaps: wide 100 at 2000 (under the ledge), water tap 40 at 2600, water hold 60 at 2900, big 170 at 6400, tap 40 at 9400, tap 36 at 9950, hold 60 at 11200. Rocks `[x, width, height]`: [1200, 100, 50], [1330, 100, 100], [1460, 100, 150], [1900, 300, 90]. Cracks: 5250 (40), 5700 (60), 6000 (40), 7300 (40), 7900 (60), 8300 (40). Roofs [9040, 245, 120] (kobo crate 9100) and [9640, 245, 120]. Kobo: 151 loose, 4 kobo crates (12), 17 in the room. End: bus door 11800, wall 12000. Checked by tests/unit/street.test.ts (S2.6, with rocks read as roofs) and tests/unit/ogun-levels.test.ts (3.3 mud, rocks, water and crack rules, ofada, the well room). Until gamedev reads `rocks`, `cracks` and the `ofada` food (O3b), the S2.6 test reads a copy that adds each rock as a platform and leaves ofada out; ogun-levels.test.ts treats each crack as a pit for the hazard, food, crate, mud and well distances.

Gaps ruled in O0a2 (simplest fair choice, decision 64):
- **Tyre and mud before the bus stop.** The table's tyre at 4500 sits 200 u from the exit well at 4700, but S2.6 wants no hazard within 400 u of an exit well. The tyre moves to 4250 and the mud to 4350 (120 wide, ending 230 u before the exit well). The order there is now goat 3900, tyre 4250, mud 4350.
- **Six cracks, not seven.** 3.2 said 7, but the 3.5 table places 6. The file has the 6 placed; 3.2 now says 6.
- **Twelve kobo in crates.** The table names two kobo crates (700 and the roof at 9100); two more on the road at 3200 and 10200 make the 12.
- **The well room.** The table gives no layout, so it follows S2.5 with its own shelves: sacks at [110, 240, 90] (60 high), a plank shelf [240, 200, 90] (100 high) holding the parcel at (285, 176), sacks at [380, 250, 90] (50 high); 14 loose kobo and a kobo crate at 345 (17 in all); `giftIfCarried` 5 kobo centred on 285. The store keeper sits at the back wall at room x 60 to 100, as the Lagos keeper does (look only).
- **No hint for the well.** Wells were taught in Lagos, so Abeokuta keeps its 5 hints and no well hint.
- **Rocks are platforms.** A rock is one-way (land on top, pass up from below), its left end stands on the road, and it may reach over a pothole (the ledge at 1900). Steps less than 60 u apart climb from the step before; a lone rock climbs from the road.
- **Crack spacing.** Each crack keeps at least 200 u of road from any other pit or crack and 60 u from the end of its stretch of road, so there is always firm road to land on before the next one opens.

### 3.6 Street 3: Sagamu (src/data/levels/ogun-3.json)

Idea: evening at the interchange. A flyover on tall pillars, ramps, a lorry park with trucks of cement and gravel, the kola nut market under big umbrellas with traders from every region, a garri seller, a far quarry edge in the orange sky. Signs (made up): "KOLA NUTS", "GARRI IJEBU", "IKOKORE", "BATTERY CHARGING", "VULCANIZER". Teaches hopping gravel and two roads.

Length: spawn 80 to bus 12200 = 12120 u. 78 s at full run, about 105 s typical.

| Part | x | Teaches | What is there |
|---|---|---|---|
| Warm up | 80-1000 | | Kola market stalls; kobo crates at 600 and 800 |
| Gravel | 1000-2400 | **hopping gravel** | Hint 1100: "Hopping gravel! Jump or bounce." Gravel 1500 alone. Gravel 2100 |
| Cracks and potholes | 2400-3600 | | Crack 40 at 2600, wide pothole 100 at 3000 (sign 2880), mud 3300, 120 wide |
| Two roads | 3600-5300 | **two roads** | Hint 3650: "Two roads! Climb up, or stay low." Steps up at 3800 (60 high) and 3900 (120 high); deck 4000 to 4900, 140 high, with a kobo line and pepper fufu at 4600; steps down at 4950 (100) and 5050 (50). Low road: mud 4100, 160 wide; gravel 4450; secret entrance well at 4700 (only seen from the low road). Exit well 5300 |
| Bus stop | 5500 | | "Bus stop! Now you start here." |
| Big pit 1 | 5500-6400 | | Garri crate at 5700, clear road 5900 to 6200, big pit 170 at 6200 (sign 6080) |
| Group | 6400-7400 | | Gravel 6600, goat 6850, tyre 7100, crack 40 at 7300 |
| Big pit 2 | 7400-8500 | | Ikokore on the road at 7750. Mud 7900, 100 wide. Firm, clear road 8000 to 8300. Big pit 170 at 8300 (sign 8180) |
| Corn | 8800-11536 | | Corn crate at 8800. Fast stretch to 10168: roof at 9000, tap 40 at 9300, roof at 9600 with a kobo crate, mud 9900, 120 wide. Second half: gravel 10400, tyre 10700 |
| Amala | 11000-12200 | | Amala on the road at 11000. Goat 11300, gravel 11500, wide pothole 100 at 11800 (sign 11680). Bus door 12200 |

Kobo: about 140 loose and 12 in crates, plus 17 in the well room.

**Built (O0a3, 15 Nov):** src/data/levels/ogun-3.json (the well room is the shared ogun-well). Pits as ground gaps: wide 100 at 3000, big 170 at 6200, big 170 at 8300, tap 40 at 9300, wide 100 at 11800. Cracks: 2600 (40), 7300 (40). Mud: 3300 (120), 4100 (160), 7900 (100), 9900 (120). Gravel: 1500, 2100, 4450, 6600, 10400, 11500; goats 6850, 11300; tyres 7100, 10700. Platforms: steps up [3800, 240, 100] and [3900, 180, 100], deck [4000, 160, 900], steps down [4950, 200, 100] and [5050, 250, 100]; roofs [8940, 245, 120] and [9540, 245, 120] (kobo crate 9600). Pepper fufu on the deck at (4600, 132). Kobo: 141 loose, 4 kobo crates (12). End: bus door 12200, wall 12400. Checked by tests/unit/street.test.ts (S2.6, with gravel read as a tyre, since its placing rules are the tyre's) and tests/unit/ogun-levels.test.ts (3.3 mud, crack, gravel and two-roads rules).

Gaps ruled in O0a3 (simplest fair choice, decision 64):
- **Four mud patches, not five.** 3.2 said 5, but the 3.6 table places 4 (3300, 4100, 7900, 9900). The file has the 4 placed; 3.2 now says 4.
- **Twelve kobo in crates.** The table names three kobo crates (600, 800, the roof at 9600); a fourth on the road at 2400, between the second gravel and the first crack, makes the 12.
- **The deck and its steps are plain platforms**, not rocks: one-way, like the stall roofs, so they need no new field. Each step is 100 wide and touches the next; the deck has no gaps.
- **The first gravel stands alone** with no other hazard closer than 600 u (the second gravel at 2100 is exactly 600 u on).
- **No well hint.** The low-road well is a secret, as Ikeja's is.

### 3.7 The well room: the Ijebu garri store (src/data/levels/ogun-well.json)

The same room rules as S2.5 (room, coins, going up), our own Ogun look: a cool store room under a compound, sacks and basins of garri, folded adire on a shelf, light falling through two holes in the ceiling. The gift is **the Ijebu garri parcel**: the same shield as Lagos's garri parcel (decision 18), for every Pothole Hall try until the hall is cleared. If the player already carries one, the room shows coins instead (`giftIfCarried`).

- **The store keeper** (PE-R4's idea, Ogun's own person): an elder man in buba and sokoto with a soft fila, sitting on a low stool by the back wall, well away from the rope. He waves when the hero comes down; when the hero takes the parcel he claps and his bubble says **"For Pothole Hall. Go well!"**
- Toast on taking it: "Ijebu garri parcel! Shield for the hall."

### 3.8 Level file fields (schema 2, plus)

Street files keep schema 2 (S2.6) with `state: "ogun"`, `street: 1 to 3`, `theme: "gateway" | "adire" | "interchange"`, and add:

| Field | Shape | Meaning |
|---|---|---|
| `mud` | [x, width] | Mud patches |
| `cracks` | [x, width] | Cracks; width 40 or 60 |
| `waterPits` | [x] | Left lip x of potholes drawn with water (look only) |
| `rocks` | [x, width, height] | Rock ledges (one-way platforms drawn as rock) |
| `hazards` | [kind, x] | kind adds "gravel" |
| `hazardSpeeds` | { goat, tyre, drum, gravel } | gravel 70 |
| `foods` | [x, y, kind] | kind adds "ofada", "ikokore" |
| `arch` | x | The gateway arch (street 1 only) |

The level test checks every new rule in 3.3 as well as the S2.6 list.

---

## 4. Ogun's foods

### 4.1 The new foods (OG-Q6)

| Food | Where from | Does | Lasts | Pickup words | Look (not colour alone) |
|---|---|---|---|---|---|
| **Ikokore** | Ijebu, Ogun | **Firm feet:** mud does not slow you; hopping gravel crumbles when you touch it, no hurt | 12 s | "Ikokore! Mud won't slow you for 12 seconds." | A small bowl of thick pottage with a spoon. HUD: bowl icon, the word "Ikokore", the bar |
| **Ofada rice and sauce** | Ogun | **Steady road:** cracks do not open while it works, and the ones you pass stay shut for good | 12 s | "Ofada rice! Cracks stay shut for 12 seconds." | Rice and sauce on an open green leaf. HUD: leaf icon, "Ofada", the bar |
| **Ijebu garri parcel** (not a new power) | Ijebu, Ogun | The well gift: the shield for Pothole Hall, as the Lagos parcel | until used | "Ijebu garri parcel! Shield for the hall." | A small cloth-tied sack |

- Garri crates in Ogun are drawn as Ijebu garri (finer, paler grains) with the same shield and the same words.
- Every Lagos food still works in Ogun: corn, garri, amala, pepper fufu.
- Both new foods are 12 s. The last 2 s warn, as every timed food does (OG-R10): the HUD chip and the hero blink, a soft tick each second (Sound on), and the toast "Ikokore is wearing off!" / "Ofada is wearing off!". The same food again restarts its timer; two different timed foods can work at once.
- **Never fire.** No food shoots, burns or glows red-hot. Ofada and ikokore have steam only (rule 2, the fireball rule). No new throw food in Ogun.
- In the lane run, ikokore and ofada do not appear in O1 (the lane run has no mud or cracks yet).

### 4.2 Keeping the share fair (decision 30)

Ogun is in the South-West, like Lagos, so its own foods add to the Yoruba side. The ledger, counting only foods that do something:

| | Hausa and the north | Igbo and the east | Yoruba and the west | Everyone |
|---|---|---|---|---|
| Built (Lagos) | | pepper fufu and egusi | amala, gbegiri and ewedu | roasted corn; garri, sugar and epa |
| Ogun adds | | | ikokore; ofada rice | |
| Owed next | **2** | **1** | 0 | |

**The rule (recommended, OG-Q6 a):** no new West food comes until the north has two and the east has two. The next state's foods come from the north or the east (city.md 2D's list: tuwo shinkafa and miyan kuka, masa with honey, kunu or zobo, abacha, and from the South-South banga and edikang ikong), chosen with speakers of those languages.

Inside Ogun the people keep it balanced now: traders and bubbles in Hausa, Igbo, Yoruba and Pidgin in equal share (part 7), and Sagamu's kola market shows traders from the north buying and selling with Ogun traders, side by side, as it really is.

---

## 5. The boss: King Pothole in Pothole Hall

### 5.1 Who he is

**King Pothole is a problem, never a person.** He is a big, round pothole in the floor: a grumpy crater with a face made of cracks (two muddy puddle eyes, a wobbly crack mouth) and, sitting on his rim, a "crown" of three little orange road cones. That is all of him: no body, no arms, no robes, no beads, no staff, no throne (OG-Q3). He is the Stopper who digs up roads, and he has dug in right at the gateway, so goods and buses cannot pass.

He is grumpy and a bit vain about his cones. He loses in a funny way: he gets filled up, giggles, yawns and falls asleep as a smooth new road.

### 5.2 The place: Pothole Hall (src/data/levels/ogun-hall.json)

Our own building that tells you about the problem: a big roofed road works yard by the gateway. Steel roof beams, a row of 8 roof lamps (dark at first), a concrete floor with faded lane arrows, a door on the left where the hero came in, big closed doors on the right with the expressway and the gateway arch beyond, a pile of road mix bags by the left door, our own little road roller parked under the roof (danfo yellow, a big friendly front drum, no brand). On the inside wall over the left door: "POTHOLE HALL". No domes, towers, crosses, crescents, carved figures, palace look or faith sign. Not a real building.

Hall x runs 0 to 560 (fits every landscape screen, as S2.7). Floor y 300.

| Thing | x | Notes |
|---|---|---|
| Hero start | 50 | Walks in through the left door, facing right |
| Left wall | hero limit 30 | |
| Road mix pile | 60 to 90 | One bag waits on top at x 80 when it is ready: a plain sack with a picture of a smooth road and the word "READY" on a tag. Not colour alone |
| King Pothole | a pit 100 wide; its middle moves from x 230 to 400 (so his lips run from 180 to 450) | A wide pothole by size (S2.2), the same width all fight, so the jump stays the one you know |
| Right landing | 450 to 530 (hero limit 530) | Always at least 80 u of floor past him |
| Roller | parked at x 500 behind the floor line, scenery until the finish | |

### 5.3 How you win (one rule, three times)

**Carry the road mix and jump over King Pothole to drop it in.**

1. Walk into the bag on the pile: the hero lifts it onto their head on a small cloth pad, the way porters carry goods (a proud, real sight). Every move stays the same while carrying: walk, run, jump, second jump, dash.
2. Jump over King Pothole. When the hero's middle passes over the middle 40 u of the pit while in the air, the bag drops straight in: **"PLOP!"** That is a hit.
3. A new bag appears on the pile 1.0 s after the last one was dropped in or lost.

- If the hero is hurt while carrying, the bag slides back onto the pile (nothing is lost).
- If the hero falls into him while carrying, the bag is lost and a new one is on the pile when the hero is back.
- The bag never drops anywhere else: landing, standing near him or walking past does nothing.
- Hit counter: three cone shapes at the top that fill with a tick (never colour alone). Toasts: "Plop! 2 more bags." and "Plop! 1 more bag."

**He freezes when you jump.** While the hero is in the air, King Pothole stops sliding (his puddle eyes go wide), and he starts again 0.3 s after the hero lands. So every jump over him is a plain wide-pothole jump you already know: a walking jump and a second jump clears him from any lip.

**He never swallows a standing hero.** He slides left and right along his track, but if his near lip would come within 10 u of the feet of a hero standing or walking on the floor, he bumps to a stop, grumbles ("hmph!") and slides back the other way. So the only ways to fall in are to walk or jump into him. A hero on the right landing is safe from his slide in the same way.

### 5.4 What he does, and how it gets harder

He throws what potholes throw: loose gravel and mud. Each throw is shown first by a 0.5 s "gulp" pose: his rim puffs up, his puddle eyes squint and a little dust rises.

- **Gravel:** a hopping gravel lump (the one from Sagamu) hops out of his near side toward the hero, 80 u/s, 40 u hops every 0.7 s. Jump it, or land on it to bounce (it crumbles). It crumbles at the walls.
- **Mud splat (from hit 1):** a blob arcs out and lands 120 to 200 u from him on the hero's side, never within 40 u of where the hero stands when it is thrown. A round shadow marks the spot 0.6 s before it lands. It makes a mud patch 60 wide that slows to walk speed for 4 s and then dries away. It never hurts.

| Phase | Slide speed | Throw every | Pattern (repeats) | Hall music |
|---|---|---|---|---|
| Before any hit | 30 u/s | 2.6 s | gravel | 126 BPM |
| After hit 1 | 40 u/s | 2.2 s | gravel, mud | 132 BPM, adds shaker |
| After hit 2 | 55 u/s | 1.8 s | gravel, gravel, mud | 138 BPM, adds a second drum |

- Before phase 3, toast: "He's cross! Two gravel lumps now. Jump them both."
- A hit: the bag drops in with "PLOP!", tarmac fills part of him (he looks shallower, though his opening stays 100 wide), one cone falls off his crown and rolls to the side, he says a surprised "Oof... hm!", every throw pops into dust, no throws for 1.5 s, then the next phase starts.
- What hurts: gravel from the side or below; falling into him (a life, back to x 50 while he slides to the right end; in Gentle mode, climb out on his left lip, decision 31). The Ijebu garri parcel's shield takes one gravel hit; a fall is a fall, as on the streets.
- No foods in the hall except the parcel. No fufu: a fufu ball would plug him and skip the fight.

**Entry, t = 0:** if there is a parcel, toast "Your Ijebu garri parcel: the shield is on!". Then toast "King Pothole is blocking the gateway!" Then, once only on the first try, the hint "Pick up the road mix bag." and, when the hero is carrying, "Jump over King Pothole to drop it in." First throw at 2.0 s.

**Fair for a 10 year old:** he is always in view, his size never changes, he holds still while you jump, every throw is warned, he can never slide under you, and the whole fight uses moves from the Ogun streets (carrying is the only new thing, and it is one walk-into). It is never a "jump on his head" fight, never a projectile hit back at him, and never a pattern from any Nintendo or other game.

**Three tries:** a player who finished Sagamu should beat him in three tries. If not, tune in this order: throws 2.8 / 2.4 / 2.0 s; phase 3 pattern gravel, mud; slide speeds 25 / 35 / 45; the drop zone from 40 to 60 u.

### 5.5 The funny, kind finish

From the third bag:
- 0 s: every throw pops into dust. The hero stands and cannot be hurt.
- 0 to 1.2 s: King Pothole fills to the top, his cheeks puff, he giggles ("hee hee, that tickles!") as the tarmac settles.
- 1.2 s: he gives one big yawn, his puddle eyes close, and his last cone tips off.
- 1.8 s: the roller rolls out, does one happy lap over the new patch, and toots.
- 2.4 s: the patch is a smooth new road. Lane arrows paint themselves across it, and for 1 s the crack mouth shows as a tiny sleepy smile in the paint, then fades. The three cones stand in a neat line at the side, as road cones should.
- 2.5 s: toast "The road is smooth!"
- 3.0 s to 4.2 s: the 8 roof lamps come on one by one; the big right doors swing open onto the expressway; the gateway arch beyond lights up and its cog turns.
- 4.5 s: toast **"The gateway is open! Ogun is switched on!"** The win tune plays. The door people cheer (part 7).
- 6.0 s: the Win screen.

Nobody is hurt. The pothole just becomes a good road and has a nap.

**Win screen words:**
- Heading: "Ogun is switched on!"
- Line: "The road through the gateway is smooth. The way to the rest of Nigeria is open."
- Money line as Lagos: "You got ₦15."
- Big button: "Take it home". Small: "Play again", "Challenge road".

### 5.6 The hall file and the gaps it rules (O0a4)

src/data/levels/ogun-hall.json keeps Go-Slow Hall's format (schema 2, `type: "hall"`, the same room numbers: width 560, floor 300, start 50, left wall 30) with right wall 530 and King Pothole's own `boss` block: `pit` (width 100, track 230 to 400, drop zone 40, bump gap 10, slides again 0.3 s after landing), `bag` (pile 60 to 90, bag at 80, a new one 1.0 s later), `phases` (the 5.4 table: every, slide, pattern, bpm), `gravel`, `mud`, `fall` and `gentle`. The game does not read this block yet; gamedev adds the reader in O5b. tests/unit/ogun-hall-lane.test.ts checks it.

Gaps in 5.2 to 5.5, ruled the simplest fair way:
- **Where he starts:** his middle at 400, the right end of his track, the farthest from the hero, sliding left. The same place he goes back to after a fall.
- **"120 to 200 u from him"** is measured from his near lip (the one on the hero's side), so a mud patch never lands in his opening.
- **Walls:** the whole 60 u patch lands inside the walls (its middle 60 to 500). If no spot is 120 to 200 u from his lip, inside the walls and 40 u or more from the hero (the hero at the pile while he is at the far-left end), that throw is a gravel lump instead. Mud never hurts, so this only keeps it fair and simple.
- **His opening slides over a drying patch:** fine. The patch is floor; where his opening passes, you see the hole, and the patch shows again after him until it dries.
- **Gravel when the hero is past him on the right landing:** it hops out of his right lip, toward the hero, and crumbles at the right wall.

---

## 6. Ogun's city from above

Reuse every Lagos system (city.md (b), (d), 5W, W3, W4, W18, S3e0, S3f0) with Ogun's own look. Nothing new to learn for the player except the places.

### 6.1 The map

The same model-town view and size (1600 x 1000 map units, 12 blocks in 3 rows of 4, a motor park in the middle), drawn as Ogun:
- **Bottom left:** the gateway arch where the road comes in from Lagos (the edge of the map; Travel and "To Lagos" sit here).
- **Left:** Ota's factory estate: long sheds, a truck park.
- **Middle:** the interchange: our own flyover where the expressway crosses the town road; the motor park beside it.
- **Top:** Abeokuta's adire market and yards, with our own big unnamed rocks along the top edge (OG-Q2) and the Ogun River crossing the top right under our own bridge.
- **Right:** Ijebu-Ode's garri mill and its yard.
- **Bottom right corner:** the border market road, leading off the map (OG-R7).
- **Far edge:** a quarry, small and far, top left.

Area names show only on the map and in praise lines, never in a line that says something is wrong.

### 6.2 Problems and fixes

| Pin | Where | Problem (pin word) | Costs | Challenge that helps | Fix (Mission complete line) | Earns tax? |
|---|---|---|---|---|---|---|
| 1 | gateway road (Ota) | "Potholes" | ₦12 | Ota | "New road here. Trucks and buses are moving." | no |
| 2 | Abeokuta yards | (build) "Adire market" | ₦6 | any | "The adire market is open here." | yes |
| 3 | the water point by the motor park | "Dry taps" | Power 10 | Expressway (lane run) | "The pump is on. Water for everyone." | no |
| 4 | interchange | "Lights out" | Power 8 | Expressway | "The lamps are on. The road is safe to drive." | no |
| 5 | factory estate | "Slow internet" | Tech 6 | Expressway | "Fast internet here. The factories are busy." | no |
| 6 | Ijebu-Ode | (build) "Garri mill" (needs pin 1) | ₦8 | any | "The garri mill is open here." | yes |
| 7 | the gateway itself | "Bad road" | win in Pothole Hall | Pothole Hall | "The gateway is open. The road is smooth." | no |
| later | Sagamu, after the first boom | (build) "Kola market" | ₦10 | any | "The kola market is open here." | yes |
| later | border market road | (build) "Border market" | later | | | yes |

- **The mix:** Naira 3 (road, adire market, garri mill), Power 2 (water, lamps), Tech 1 (mast), plus the hall. Ogun leans on Naira for roads, as fits King Pothole; Lagos leant on its go-slow. Dry taps are new: water needs the pump, so it costs Power.
- **Card words (problem cards, city.md part 5 style):** "Potholes here. Buses can't get through. Run Ota to earn Naira." / "The taps are dry. The pump needs Power. Run the Expressway to collect Power." / "Lamps are out on this road. Run the Expressway for Power." / "Slow internet here. Run the Expressway for Tech." / "King Pothole is blocking the gateway. Go to Pothole Hall."
- One good lane run may pay for two Power or Tech fixes (decision 67).

### 6.3 Tax places (decision 71, W18 rules)

| Place | What you see | Earns | Cap |
|---|---|---|---|
| Adire market | Dyers lift cloth from the pots, sellers fold and sell; a buyer walks off with a folded cloth | 10 kobo a cloth, one every 8 s of play | ₦1.20 |
| Garri mill | Grating, sieving and roasting pans with steam (never flames, OG-R4); a truck loads sacks and drives off (needs the new road) | 30 kobo a truck, one every 15 s of play | ₦2.40 |
| Kola market (after the first boom) | Traders weigh baskets of kola; buyers carry baskets away | 20 kobo a basket, one every 12 s of play | ₦1.20 |

- W3's cap rule holds: all Ogun trays together (₦4.80) are under half of a street win.
- Words, as W18: "Tax 80 kobo"; "The adire market paid ₦1.20 tax!"; "The garri mill paid ₦2.40 tax!"; "The kola market paid ₦1.20 tax!". The once-only explanation is shown again once in Ogun, with Ogun's name: "Busy shops pay a small tax. Ogun uses it to fix more." (hint id `taxOgun`).
- Trays fill while you play anywhere in the game (any city or any run), not only in their own city, and stop when full, as now (OG-R8). You collect by walking over in that city.

### 6.4 Ogun's Booming meter

- Its own meter, the same points (4 for a fix or build, 1 for a full collect, at most 4 from collecting per boom), the same five steps lighting a set part of Ogun (decision 47).
- Before the first boom there are 24 points of fixes to find (6 places), so 20 is always reachable.
- At 20: "Ogun is booming!" / "New buildings are going up. More people are coming through the gateway, and they need more." Button "See Ogun". Ogun's cog starts turning (1.7). The kola market and its pin appear.
- The Booming meter and the hall win are two different things: the cog turns at the boom; the gateway opens at the hall (5.5). Both are good news; neither waits for the other.

### 6.5 The challenge road in Ogun

The same screen and rules as S3e0, with Ogun's own picture: a road that starts at the gateway arch on the left (a "To Lagos" stop, which travels back), and goes past red-brown earth, palm trees and rocks.

| # | Stop | Opens when | Card picture | A win is "for" |
|---|---|---|---|---|
| start | **To Lagos** | always | the arch's back | (a link, not a challenge) |
| 1 | **Ota** | always | the gateway road spot | the New road while not built |
| side | **Expressway** (lane run) | always | the water point, then the interchange, then the estate | Dry taps, then Lights out, then Slow internet, while not built |
| 2 | **Abeokuta** | Ota done | the adire yards | nothing (Naira home) |
| 3 | **Sagamu** | Abeokuta done | the interchange | nothing |
| 4 | **Pothole Hall** | Sagamu done | the hall picture | the gateway (₦15, first win switches Ogun on) |
| end | **The way on** | never yet: "Coming soon" | the expressway north past the arch | cannot be played; line 3 "More of Nigeria" |
| end, side | **Border market** | never yet: "Coming soon" | the market road | cannot be played; line 3 "Later" |

The first screen of each run matches its spot, tired or bright (decision 48).

### 6.6 The Expressway run (the lane run in Ogun; src/data/levels/ogun-lane.json)

The same rules, controls, tilt, Blackout, buckets, prizes and "Keep running" as S3f0. Our own new look: a wide expressway at dusk seen from behind, tipper trucks and tankers in the lanes (dark back windows, no drivers shown), danfos, road cones, palm trees and red-brown verges, far rocks and a quarry against the sky, the footbridge, and the bus stop goal under a small copy of the arch. The fixed first 600 m uses Ogun's own order of rows (designer writes it with the same fairness rules, S3f0 part 7). No new rule in the lane run for now.

**The file (O0a4).** src/data/levels/ogun-lane.json, the same `type: "lane"` format as lagos-lane.json, name "Expressway", theme "expressway". Gaps ruled the simplest fair way:
- **The same numbers as Lagos:** speeds, moves, Blackout, prize, pops, endless rules and the part 9 totals (Power 14, Tech 9, 86 coins). So S3f0's "three tries" Blackout table still holds, and one win still pays for any one Ogun fix (6.2).
- **The same teaching:** the same nine hint keys at the same distances, with the same words (WORDS.lane.hints), and each thing still taught alone in the middle lane by 305 m. A hint is seen once per phone, so a player who ran the Lagos lane run sees none of them again; one who never did is taught here. The three warm-up bulbs stay at 152, 282 and 372 m in the only free lane.
- **Ogun's own rows:** from 240 m on the rows are new, and the road holds more potholes (7, where Lagos has 3), never before the pothole hint at 288 m. 8 endless chunks of Ogun's own (tanker-wall, pothole-row, zigzag, middle-gap, slide-run, goat-crossing, crate-row, long-tipper).
- **Tippers and tankers** are the `danfo` kind: the same size and rules. Art draws each one as a tipper truck, a tanker or a danfo (O6a), so no new kind and no new rule.

---

## 7. People everywhere in Ogun

The five rules of "People everywhere" hold everywhere in Ogun (never in the way, never hurt or scared, never the problem, never laughing at the hero, never a joke), with the same layers, counts, clear zones, reactions and bubbles. Each street gets its own cast of about 16 looks.

**Ota (morning, the gateway in):**
- Factory workers walking to the morning shift in plain overalls or shirts (no logos, no badges), lunch bags in hand; a woman in iro and buba with a gele going to the market; a student with a school bag.
- Traders: an ofada rice seller at the buka with leaf-wrapped packs; a bread seller; a phone credit seller at a kiosk.
- A truck driver resting in the shade with a cup of tea, waving (drivers are never the problem).
- Children: two children playing ten-ten on a clean doorstep.
- Bus stop and the arch: 3 travellers with bags, just arrived, looking up at the arch and smiling.

**Abeokuta (midday, adire):**
- **Adire dyers** at their pots on the back pavement: a woman lifting dark blue cloth from a pot, a man wringing cloth, a teen hanging cloth on a high line, an elder woman tying cloth into patterns with raffia. Their pots and lines are scenery behind the walking line, never something to touch.
- Sellers holding up folded adire; a tailor at a sewing machine; buyers comparing cloth.
- Walkers: a woman in an adire wrapper with a basket on her head, a man in buba and sokoto with a fila, a woman in a hijab and long dress with shopping, a student.
- Children: a child holding a parent's hand, looking at the cloth.
- Bus stop: 3 people waiting.

**Sagamu (evening, the interchange):**
- **Kola nut traders** sorting kola in leaf-lined baskets; a trader in babban riga and cap and a trader in iro and buba bargaining and laughing together.
- **Garri traders** with big basins of Ijebu garri, measuring with a bowl; a porter carrying a sack on a head pad.
- An ikokore seller at her pot (steam only).
- Travellers with bags waiting for buses at the interchange; a mechanic at the vulcanizer's compressor.
- **Quarry workers** far off at the quarry edge, small, in plain hard hats, walking home with their bags (never working near danger, never children).
- Bus stop: 3 people waiting.

**The well room:** the store keeper (3.7).

**Pothole Hall:** 3 travellers wait at the open left door, outside the floor: a woman with a basket of garri, a factory worker, an elder in agbada. On each hit they cheer ("Ehen!", then "Well done!"). They never boo or laugh at King Pothole: they cheer the road opening. At the finish they walk in along the back wall and cheer at "The gateway is open!"; trucks and danfos roll out through the right doors with passengers waving.

**The Expressway run:** people on the verges at roadside stalls (corn, oranges, garri), at windows of roadside houses, and on the footbridge; when a lamp goes dark they step inside and a lantern glows, as S3f0 part 7.

**The city from above:** walkers as Lagos; dyers at the adire market; a queue at the water point once it is fixed (adults and teens with buckets, a child holding a parent's hand; never a child carrying heavy water alone); trucks loading at the mill.

**Bubbles (decision 30, words in src/screens/words.ts; each line checked by a speaker before it ships):**

| Kind | Words |
|---|---|
| Welcome (Ota, by the arch) | "Welcome!", "Ẹ káàbọ̀!" (Yoruba), "Barka da zuwa!" (Hausa), "Nnọọ!" (Igbo), "You don land!" (Pidgin) |
| Greetings (any time) | as Lagos: "Hello!", "Sannu!", "Ndewo!", "Ẹ n lẹ́ o!", "How far?" |
| Traders | Ota: "Ofada rice dey!", "Fresh bread!", "Recharge card dey!" · Abeokuta: "Fine adire!", "New cloth!", "Ofada, hot!" · Sagamu: "Fresh kola!", "Garri Ijebu!", "Ikokore, hot!" |
| Cheers | as Lagos: "Well done!", "Ẹ kú iṣẹ́!", "Madalla!", "I meela!", "You do well!", "Oya, go!" |
| The store keeper | "For Pothole Hall. Go well!" |
| Bus | "Bus don come!", "Safe trip!" |

Plain spellings if a phone cannot show the marks: "E kaabo!", "Nnoo!".

**Never:** no uniforms, badges or vests (decision 37) on factory or quarry workers; no customs or border officers; no traditional ruler or title dress; no faith singled out; no child at work; nobody shown as poor, lazy or to blame for the roads, the taps or the lights.

---

## 8. Screens and exact words (new or changed)

| Screen | Who sees it | Its one job | Exact words |
|---|---|---|---|
| Go-Slow Hall Win (changed) | a player who just beat General Go-Slow | send them on to Ogun | "Lagos is switched on!" / "The road to Ogun is open. Ogun is the gateway to the rest of Nigeria." / big "On to Ogun" |
| Bus ride | a player going between states | show the journey through the gateway | the arch: "WELCOME TO OGUN" / "THE GATEWAY STATE"; back: "SAFE JOURNEY"; "Skip" |
| Arrival card | first visit to Ogun | welcome, and say the goal | "Welcome to Ogun, the Gateway State!" / "The road to the rest of Nigeria runs through here." / "King Pothole has dug in at the gateway. Fix Ogun, and the way opens." / "Let's go" |
| Download card (web only, 9.2) | a web player opening Ogun the first time without it saved | get Ogun onto the phone | "Ogun is ready to download (about 130 KB)." / "After this it plays with no internet." / "Download" / "Not now". No internet: "Ogun needs the internet once to download. Lagos still works with no internet." / "OK" |
| Travel card | anyone with Ogun open | pick a state | "Where to?" / "Lagos" / "Ogun" / "You are here" / "Back" |
| "To Ogun" stop card | Lagos challenge road | go to Ogun | open: "To Ogun" / "The road to Ogun is open." / "Go to Ogun"; locked: "Win Go-Slow Hall to open the road to Ogun." |
| Ogun place (until Ogun's city, O6b) | anyone in Ogun | start the next open street | "Ogun" / "The Gateway State" / first: "Ota is open. It is the first street on the road from Lagos." / after Ota: "Ota is moving again. Abeokuta is open." / after Abeokuta: "Abeokuta is moving again. Sagamu is open." / after Sagamu (OG-R18; O5b, the hall plays): "Sagamu is moving again. Pothole Hall is open." / after the hall: "The gateway is open! Ogun is switched on!" / "Play Ota" / "Play Abeokuta" / "Play Sagamu" / "Go to Pothole Hall" |
| Opening a part | anyone opening the road or Ogun | show it is working, never a blank card | "Opening the road..." / "Downloading Ogun...". It cannot open: "Ogun could not open just now. Lagos still works. Try again later." |
| Pothole Hall Win | a player who beat King Pothole | celebrate the gateway | "Ogun is switched on!" / "The road through the gateway is smooth. The way to the rest of Nigeria is open." / "You got ₦15." / "Take it home" |
| Street cleared | each Ogun street | as Lagos | "{Ota / Abeokuta / Sagamu} is moving again, thanks to you! You got {money}." |
| Out of lives | as Lagos | as Lagos | "Out of lives" / "You keep {money} for Ogun. The street is still here. Try again!" Gentle offer as now |
| Pause, Game over, title, hero builder | unchanged | | unchanged; the title line stays "Build up Lagos. Get Nigeria working." (decision 24) |

Hints in the streets are listed in part 3. Every word is in words.ts (`OGUN_WORDS`) so qa can search it.

**Accessibility, for all of it:** every button at least 44 x 44 px (big buttons 56 px tall), 8 px apart; the Sound and Music switches work everywhere in Ogun; nothing means something by colour alone (mud has ripples and footprints, cracks a zigzag and a sign, gravel its lumpy shape and dust, the bag a "READY" tag, the hit counter cones with ticks, stops their icons and words); Gentle mode gives 5 lives, cracks open at 300 u and King Pothole's slide speeds drop by a fifth; reduced motion stills the bus ride, the arch's cog, the gateway glow and the finish; screen readers hear every card and the road list in order.

---

## 9. Light on a cheap phone, and size

### 9.1 Budgets

Everything stays drawn and made in code (decisions 33, 65). Ogun is one lazy part of the game, loaded only when the player first goes there.

| Piece | Where it lives | Budget (gzipped) |
|---|---|---|
| Travel, the state list, the lazy loader, the "To Ogun" stop, Win button, wheel lines | first load | 8 KB at most |
| Ogun's art (3 street backdrops, casts, arch, hall, King Pothole, roller, foods, mud, cracks, gravel, well room, city blocks, lane look) | Ogun part | 90 KB |
| Ogun's game code (mud, cracks, gravel, rocks, two roads, carrying, the boss, Ogun city places, Dry taps) | Ogun part | 20 KB |
| Ogun's levels (3 streets, well, hall, lane) | Ogun part | 10 KB |
| Ogun's tunes and sounds (code notes) | Ogun part | 6 KB |
| **Ogun part in all** | | **about 130 KB, 150 KB at most** (players are only ever told "about 130 KB": the card and OG-R6; 150 KB is the CI limit, never shown) |

The first load stays well under 3 MB; the CI size check gets a second line for the Ogun part.

### 9.2 Downloading (OG-R6)

- **Web test link:** the Ogun part is fetched when the player first opens Ogun (download card, part 8), then kept by the service worker so it plays offline. A player who never goes to Ogun never downloads it. This follows brief Tech 3 ("each later world downloads only when reached"); nothing else is fetched.
- **Store app:** the Ogun part is inside the app already, loaded from the phone only when needed. No download card.
- Speed: Ogun's first street frame no more than 30 ms later than a Lagos street's on the slow phone profile; Ogun's city idle draws nothing; drag at least 45 fps at 4x CPU; the hall at least 45 fps at 4x CPU.

---

## 10. Task breakdown for pm (slice O)

Lagos work under way goes first (decision 72: the challenge road S3e1, tax words, tilt, people everywhere). O1 depends on S3e1 for the road stop and on S3g1 for people. Each row passes qa, on the slow phone profile too, before it is done; po accepts.

| id | owner | task | depends on | done when | size |
|----|-------|------|------------|-----------|------|
| O0a | designer | Level files ogun-1, ogun-2, ogun-3, ogun-well, ogun-hall, ogun-lane (from parts 3, 5, 6.6) and the words list for words.ts | Tp's answers to OG-Q1 (names) | every rule in 3.3 and S2.6 passes the level test | 10 KB |
| O1a | art | Gateway arch (front, back, faded, bright), the bus ride scene, "To Ogun" stop and road branch, Travel icon, Ogun cog pennant | none: ready now | 1.4 rules; not the real gantry, no crest or emblem; reduced motion still | 6 KB |
| O1b | gamedev | State list and the lazy Ogun part, download card (web), Travel button and card, bus ride, arrival card, Win button "On to Ogun", "To Ogun" stop, wheel lines, saves (1.8) with an old-save test | S3e1b, O1a | part 1 words exact; old saves load; Lagos plays the same; first load grows 8 KB at most | 8 KB first load |
| O1c | qa | O1 pass | O1b | all of part 1 at 320 x 240, 568 x 320, 640 x 200, 851 x 393; offline after one visit; store build has no download card | |
| O2a | art | Ota backdrop (factory road, arch, buka, truck park), mud look and sound, ikokore, Ijebu garri crates, Ota cast | O0a | 2.2, 2.3, 7; no brand, no uniform | 22 KB |
| O2b | gamedev | Mud rules, ikokore, `arch` field, Ota level plays | O0a, O1b, O2a | 3.3 mud rules in tests; 3.4 plays end to end | 4 KB |
| O2c | qa | Ota pass | O2b | a Lagos finisher clears Ota in 3 tries or fewer; mud reads in greyscale | |
| O3a | art | Abeokuta backdrop (adire yards, rocks, river far off), rock ledges, water potholes, cracks and their sign, ofada, the Ijebu garri store room and store keeper, Abeokuta cast | O0a | own adire patterns only; no Olumo shrine or steps; no Orisha signs (OG-R1) | 26 KB |
| O3b | gamedev | Rocks field, water look, crack rules, ofada, well room and the Ijebu parcel save | O2b, O3a | 3.3 crack rules in tests (never opens under the hero, corn rule, Gentle 300 u) | 5 KB |
| O3c | qa | Abeokuta pass | O3b | 4 tries or fewer; cracks always warned | |
| O4a | art | Sagamu backdrop (interchange, flyover deck, lorry park, kola market, far quarry), hopping gravel, Sagamu cast | O0a | 2.2; quarry far, no children, no blasting | 20 KB |
| O4b | gamedev | Gravel hazard, two roads, secret low-road well, Sagamu plays | O3b, O4a | gravel and corn rule in tests | 4 KB |
| O4c | qa | Sagamu pass | O4b | 4 tries or fewer | |
| O5a | art | Pothole Hall, King Pothole (faces, gulp, giggle, yawn, sleepy smile, cone crown), road mix bag and pile, carrying pose for every body, roller, door people, hall tune | O0a, OG-Q3 | 5.1, 5.2; a problem, never a person; no beads, staff, throne or palace | 12 KB |
| O5b | gamedev | Carrying, the moving pit with the "freezes when you jump" and "never swallows a standing hero" rules, throws, phases, finish, Win screen | O4b, O5a | 5.3 to 5.5 numbers; tests that he never slides under a standing hero and never moves while the hero is in the air | 5 KB |
| O5c | qa | Hall pass | O5b | a Sagamu finisher beats him in 3 tries; Gentle works; never Nintendo-like | |
| O6a | art | Ogun city blocks (tired and bright), arch edge, interchange, river and bridge, rocks, factory estate, water point, adire market, garri mill, kola market, pins, Expressway run look | O1a | 6.1; no real building, bridge or brand | 30 KB |
| O6b | gamedev | Ogun city (reusing the Lagos city), Dry taps, tax places, the shared wallet, trays filling anywhere, Ogun Booming meter and cog, Ogun challenge road, Expressway run from the lane run | O1b, O6a | 6.2 to 6.6; money adds up; W18 words with Ogun names | 6 KB |
| O6c | qa | City, road and Expressway pass | O6b | 45 fps drag at 4x CPU; idle draws nothing; tax rules W18 | |
| O7 | qa | Ogun full pass | O2c to O6c | Ogun part 150 KB at most; offline; slow phone; originality and "mock no one" check; every bubble checked by a speaker; po accepts | |

Order: O1 and O0a together; then O2, O3, O4 in order (each street teaches what the next uses); O6 can run beside O3 to O5 once O1 is done; O5 last of the play.

---

## 11. Rulings under decision 64 (one line each for Tp)

- **OG-R1.** Nothing religious in Ogun: "Ogun" is only the state's name; no shrines, offerings, masquerades, festivals, blacksmiths, cutlasses, iron charms or palm-frond fringes; adire uses our own patterns, never named ones; kola is traded, never broken or prayed over; "Ota", not "Sango-Ota".
- **OG-R2.** The expressway and interchange are never called by their real names; the lane run stop is "Expressway".
- **OG-R3.** The hall is "Pothole Hall", a road works yard, not a palace.
- **OG-R4.** Garri roasting shows steam and a warm glow, never flames.
- **OG-R5.** The quarry is far scenery: plain hard hats, no vests, no children, no blasting.
- **OG-R6.** On the web, Ogun downloads (about 130 KB) the first time you go there, then plays offline; in the store app it is already inside.
- **OG-R7.** The border market is a happy, busy market road ("BORDER MARKET" board), with no border post, gate, fence, customs or officers; a "Coming soon" stop for now.
- **OG-R8.** Trays fill while you play anywhere in the game, and stop when full, as now.
- **OG-R9.** The Win screen after Go-Slow Hall gains "On to Ogun", and the Lagos challenge road gains a "To Ogun" stop on a side road; the Ferry stays a Lagos stop.
- **OG-R10.** Every timed food (corn, amala, ikokore, ofada and any later one) warns in its last 2 s, as Lagos is built and tested: blink, tick, toast. The blink and tick need no reading, and the problem coming back is never sudden (cracks still rumble 0.4 s, mud only slows). city.md 2D's "last 3 seconds" should read 2.
- **OG-R11 (O4b, Sagamu build check).** Keep: the flyover look is found from platforms (a deck 600 u wide or more, steps within 60 u of its ends), no new level field; only Sagamu has a platform that wide, and if a later street needs a wide platform that is not a flyover, it gets a field then.
- **OG-R12.** Keep: gravel drops into a pothole or open crack only when it lands over one, never mid-hop; its hop covers about 25 u (0.35 s at 70 u/s), less than the narrowest pothole (36), so it never hops one and a child never sees it cross a hole it should fall in.
- **OG-R13.** Keep: landing on gravel allows 14 u of slack, not 6. The lump is small and bobs up to meet the feet, so 6 u would make a clean bounce feel like a hit to a 10-year-old; the hero must still be falling, and 14 is less than its 16 u height, so a walk into its side still hurts.
- **OG-R14.** Keep: ikokore's touch-crumble gives no kobo; amala's smash gives +2 and fufu's knock +1, as for every hazard. Ikokore is a guard, like garri's shield (which pays nothing), and a plain bounce on gravel pays nothing either; paying for a touch would teach running into hazards. The crumble's dust and sound are the reward.
- **OG-R15.** Change: the "tk" plays only for a gravel whose landing spot is on screen, and when two land within 0.1 s of each other only one "tk" plays. Gravel wakes 40 u past the right edge and hops on until well past the left edge, so as built a child hears clicks for lumps they cannot see; with two on screen the clicks would also double up. The on-screen tk stays: it is the cue that does not need sight or colour.
- **OG-R16.** Keep: Gentle mode changes nothing for gravel. It is slow (70 u/s), small, one tap clears it and it shows its rhythm; Gentle already gives 5 lives and the tyre, its twin in placing, is not slowed either. Slowing it would only keep it in front of the hero longer.
- **OG-R17.** Keep: the low road's wall under the deck is drawn over back-pavement people between x 4000 and 4900. People behind a wall is a real street sight; art should still avoid placing a person there so only their head pokes over the wall's top edge.
- **OG-R18.** Words: keep "Play Sagamu" and place.abeokutaDone "Abeokuta is moving again. Sagamu is open." (the same shape as Ota's). Change place.sagamuDone to "Sagamu is moving again. Pothole Hall is coming soon." "Coming next" can read as "tap to go", but there is no button yet; "coming soon" matches the Abeokuta line it replaces. The O5b dev changes it to say the hall is open. Part 8's Ogun place row gains these three lines.
