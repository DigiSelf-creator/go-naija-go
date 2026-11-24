# Quick missions in Lagos and Ogun (designer note, 24 Nov 2026)

Decision 89: Tp's 6 year old has played everything in Lagos and Ogun and says "no more missions". Tp chose a few quick new missions in Lagos and Ogun now, while Kano is designed on its own. This note is the build note for slice MS (docs/plan.md). It changes no rule in docs/brief.md or docs/decisions.md.

## 0. What a "mission" is today, and what is new

Today the word "mission" means one thing: **Mission complete** (city.md part 1, 5W W5). You win a challenge (a street, the lane run, a hall), go home to the city, and the fix you paid for plays out. Safety missions against the Shadow (city.md 2E) are planned but not built. So once every pin is fixed and every board is built, there is nothing new to go for. That is what the child means.

**New: a quick mission is a street or a lane run you already know, with one goal on top, shown by a picture and a number. You win stars.** Same street, same hazards, same foods, same money; only the goal is new. That is why it is fast to build: no new level, no new hazard, no new boss.

- Each mission has 2 or 3 stars. Star 1 is easy for a child of 5 (decision 86). Star 3 is a real try for a child who has finished everything.
- A star is kept **the moment it fills**, in the middle of the run. Losing a life, running out of lives or leaving early never takes a star away. A 5 year old should never earn something and then lose it.
- Everything else in the run is as today: coins are money, a won street pays its prize, a lost one keeps what you picked up (decision 66 for the lane run, question 2 for streets).

## 1. The missions

Five in Lagos, five in Ogun: 28 stars. Order on the board is easiest first.

### Lagos

| # | Name (words a child sees) | Where | What you do | Stars (you win when) | Line on the card |
|---|---|---|---|---|---|
| L1 | **Coin catch** | Alausa | Pick up coins (coins from crates, goats and piles count too) | 60 coins · 100 coins · 135 coins | "Catch coins on Alausa!" |
| L2 | **Lunch for Mama Put** | Alausa | Pick up the roasted corn, the pepper fufu and the amala | one star for each food picked up | "Mama Put needs corn, fufu and amala!" |
| L3 | **Goat friends** | Computer Village | Throw pepper fufu so a goat stops to eat it | 1 goat · 2 goats · 3 goats | "Throw fufu to the hungry goats!" |
| L4 | **Secret wells** | Computer Village and Ikeja | Find the secret well and go down it | 1 well · both wells (2 stars) | "Find the secret wells!" |
| L5 | **Light it up** | The lane run | Pick up Power bulbs (from crates too, and after the bus stop) | 4 bulbs · 8 bulbs · 12 bulbs | "Catch Power bulbs!" |

### Ogun

| # | Name | Where | What you do | Stars | Line on the card |
|---|---|---|---|---|---|
| O1 | **Coin catch** | Ota | Pick up coins | 60 coins · 100 coins · 135 coins | "Catch coins on Ota!" |
| O2 | **Fill the potholes** | Abeokuta | Throw pepper fufu into potholes (each plug counts) | 1 · 3 · 5 potholes | "Throw fufu into the potholes!" |
| O3 | **Garri for the mill** | Abeokuta and Sagamu | Find the secret well, take the Ijebu garri parcel, ride the bus with it | one street · both streets (2 stars) | "Bring Ijebu garri to the mill!" |
| O4 | **Stomp the gravel** | Sagamu | Jump on hopping gravel (crumbles from amala or ikokore count too) | 1 · 3 · 5 gravel | "Jump on the hopping gravel!" |
| O5 | **Tech chips** | The Expressway | Pick up Tech chips (from crates too, and after the bus stop) | 3 chips · 6 chips · 8 chips | "Catch Tech chips!" |

### Why these numbers (gamedev's unit test holds them to the data)

- **Coins.** Star 1 is 40 percent of the street's laid coins, star 2 is 65 percent, star 3 is 85 percent, each rounded down to a 5 (Alausa 159 coins and Ota 160 today: 60, 100, 135). The test works the numbers out from the level file, so a change to a street can never make a star impossible. A first-timer who runs the street once, without hunting, picks up well over 40 percent, so star 1 should come on the first go (qa checks it, part 8).
- **Lunch for Mama Put.** Alausa holds one corn, one fufu and one amala on the main road. Any order. The three foods must each stay on the street the hero runs (the level test already checks foods are reachable).
- **Goat friends.** Computer Village has fufu at x 4800 and four goats after it (6200, 7500, 9950, 10650), and 8 balls. A ball rolls along the road and the goat stops for it, so throwing when a goat shows is enough. Three of four leaves room for one miss.
- **Secret wells.** Computer Village's well is at x 2950; Ikeja's is behind the start at x 160, so a child must walk back (a secret on purpose). **Help after two goes:** if the player has started that street twice in this mission and not found its well, the mission card adds a picture of an arrow and one line: Ikeja "Look back, behind the start!", Computer Village "Look for a well by the road!" It never shows before.
- **Fill the potholes.** Abeokuta's fufu is at x 3700; after it come six cracks (40 and 60 u, they open into potholes) and three potholes on the road (9400, 9950, 11200). If gamedev finds a ball cannot plug an opened crack, star 3 becomes 3 potholes and stars 1 and 2 stay; designer is told in one line.
- **Garri for the mill.** The parcel is in the wells of Abeokuta (x 3500) and Sagamu (x 4700, on the low road). In this mission the room always gives the parcel, even if one is already saved for Pothole Hall. On the bus: if no parcel was saved, it is saved for the hall as today; if one was, nothing changes (still one at a time, never two, progress.ts). The star fills when the bus is boarded with the parcel (a lost life keeps the parcel, as today).
- **Stomp the gravel.** Sagamu has six gravel. Five of six for star 3.
- **Light it up / Tech chips.** Each lane run lays 14 Power and 9 Tech before the bus stop (ogun.md 6.6), and more after it. Star 3 needs a good run or "Keep running" after the goal.

### Not now, and why

- **Beat a time.** A clock is hard for a 5 year old and makes the run stressful. Not in this set.
- **A no-hit run.** Too hard for a 5 year old, and it punishes the first bump. Not in this set.
- **Halls.** Go-Slow Hall and Pothole Hall are the hardest places in the game. A hall mission can come later, once qa sees how children do with these.
- **Daily missions.** See MS-R1 and question MS-Q1.

## 2. How it looks and works

### Where you find them

- **The city's bottom row gets "Missions"** (a star icon plus the word), first in the row, in Lagos and in Ogun. Each city shows its own five.
- It appears once the player has seen their first "Mission complete!" (the New road), so a first-timer learns the city before anything else (one new thing at a time).
- **If five buttons do not fit** at 320 x 240 with 44 px tap areas and 8 px gaps (safe area included), "Nigeria's wheel" moves into the Settings card as a button with the same words. Words stay on every button (decision 85).

### The Missions board (a card, the same card look as the road's stop card)

- Heading: **"Missions"**. Line under it: **"Get stars! Tap a mission."**
- Five tiles in a list, easiest first. Each tile: the street's picture (the challenge road card picture, already drawn, decision 48), the name, and its star slots. One tile glows and bobs gently, as the road's next stop does: the first one with a star still to win. Reduced motion: no bob, the glow stays.
- Locked tile (its street is not open on the road yet): padlock icon (already drawn) and "Open {street} first". Kano or later states are not shown.
- Foot of the card: **"Stars: {n} of 14"**. Small "Back".
- Tiles are at least 56 px tall, 8 px apart. Spoken: "Coin catch. Alausa. 1 of 3 stars." / "Secret wells. Locked. Open Ikeja first."

### The mission card (tap a tile)

- Picture, name, the card line from part 1.
- The stars in a row, each with its number under it: an outline star for not yet, a filled star for won. Example: ☆ 60 · ☆ 100 · ☆ 135 (drawn as our star icon, not this text).
- For a best so far: **"Best: {n}"** (coins, goats, potholes, gravel, bulbs, chips). Not shown before the first go.
- The help line for wells after two goes (part 1).
- Big green **"Play"**. Small **"Back"**.
- Gentle mode works as always (more lives); the star numbers do not change.

### In the run: the mission chip

- One cream status chip under the HUD's top row (the ST-A3 chip look): the mission's icon (coin, fufu ball, goat, well, garri parcel, gravel, Power bulb, Tech chip, each already drawn for the HUD or the street) and **"{have} / {next star}"**, with three small star outlines that fill. After the last star: the number and a tick, e.g. "140 ✓" (tick icon, already drawn).
- Lunch for Mama Put shows the three food icons, each getting a tick when picked up. Secret wells and Garri for the mill show the well or parcel icon and "0 / 1".
- **When a star fills:** the star in the chip pops once (0.3 s, none with reduced motion), the bright bell "ding" plays (already made, follows the Sound switch), and the hint bar shows **"Star!"** for 1 s. Spoken (polite): "Star! 1 of 3."
- The chip never covers the hero, a hazard, a pit warning sign, Pause or Sound. At 640 x 200 and 320 x 240 it sits in the HUD row's free space; if there is none, only the icon and the number show.

### At the end

- **Street cleared / lane run end card:** one more line above the money line: **"You got a star!"** or **"You got 2 stars!"**; with all of a mission's stars, **"All 3 stars!"** (or "Both stars!"). Not shown if no new star was won in this go.
- **Out of lives / caught by the Blackout:** if a star was won in this go, the same line shows, so the child sees it was kept.
- **New stars pay a little: ₦2 each, the first time only,** added to the money brought home (one wallet, decision 80). See MS-R2.
- **Back in the city after a helper mission:** the "back home" line gains **"Mama Put says thank you!"** (Lagos, Lunch for Mama Put) or **"The garri mill says thank you!"** (Ogun, Garri for the mill), and when the hero walks near the Mama Put cook or the mill, they show one cheer bubble from the lines already checked by a speaker ("Well done!", "Ẹ kú iṣẹ́!", "Madalla!", "I meela!"). No new bubble words, so nothing new waits on decision 84. If the Mama Put or mill is not built yet, only "You got a star!" shows.

### Every star in a city

- When the last of a city's 14 stars fills, back in the city a card shows: **"Every Lagos star!"** / **"You are a Lagos star helper."** / **"OK"** (Ogun: "Every Ogun star!" / "You are an Ogun star helper."). The highlife "built" sting plays (already made).
- From then the board's heading shows a big filled star and **"Star helper"**. Nothing else changes, and nothing is ever taken away.

## 3. Saves (on the phone only)

- Its own key, `gidi-missions`: `{ "v": 1, "stars": { "lagos-coins": 2, ... }, "best": { "lagos-coins": 112, ... }, "tries": { "lagos-wells-ikeja": 2 }, "helper": { "lagos": true } }`.
- Written the moment a star fills (with its ₦2 into the city wallet, in the same write), and at the end of a mission go (best and tries). Merge, never overwrite; stars and bests never go down; a broken copy reads as no stars and is not written over until a star fills, as progress.ts.
- Old saves load with no stars. Nothing in `gidi-progress` changes shape.

## 4. Pictures and sounds (near zero)

| New thing | Owner | Size |
|---|---|---|
| Our own star icon, outline and filled (the shape differs, not only the colour): five rounded points, a small round dot in the middle, no face or eyes, never a Mario "power star" or any game's star | art, in src/art/icons.ts beside the ST-A1 set | 0.3 KB |
| "Missions" button disc (the star icon) | art (reuses the star) | 0 |
| Help arrow for the wells (reuse the edge arrow, edgeArrowSvg) | none | 0 |
| Star pop (scale 1 to 1.3 to 1 over 0.3 s, CSS) | gamedev | 0 |
| Sounds: the bell "ding" and the "built" sting, both already made | none | 0 |

Everything else is already drawn: road card pictures, padlock, tick, coin, foods, goat, well, parcel, gravel, bulb and chip icons, the Mama Put cook and the city walkers.

## 5. Rules check

- **Original only.** Goals on known levels and stars are common to many games; our pictures, words and star shape are our own. No Mario stars, coins, blocks or sounds; no "daily missions, streaks or login prizes" (city.md 2B rule 6).
- **No real people.** The helpers are the Mama Put and the garri mill, places with their own made-up workers.
- **Mock no one.** Real foods from many parts of Nigeria, each shown as good food; goats are fed, never hurt; potholes and gravel are the problems.
- **Privacy and light.** No accounts, no network, no clock; saves on the phone; about 4 KB.
- **Children first.** Pictures and numbers carry each goal; words are 6 or fewer on a card line; star 1 comes on the first go; nothing earned is lost.

## 6. Rulings (decision 64: small and easy to undo, one line each for Tp)

- **MS-R1.** No calendar: missions never change by the day, and nothing is lost by not playing. The board's glowing "next" tile is what pulls a child back. (Keeps city.md 2B rule 6 and design.md "No streaks". MS-Q1 asks Tp to confirm.)
- **MS-R2.** Each new star pays ₦2 once, so stars also help the city (28 stars, ₦56 at most, less than four street wins over the whole set).
- **MS-R3.** Stars are kept the moment they fill, even after a lost run.
- **MS-R4.** "Nigeria's wheel" may move into Settings on screens where five bottom buttons do not fit.
- **MS-R5.** No Booming points for stars: the Booming meter stays about fixing the city.

## 7. Build effort

| Part | Who | Size (gzip) | Effort |
|---|---|---|---|
| Star icon | art | 0.3 KB first load | under half a day |
| Missions core: the list (data), a watcher fed by run and lane events (kobo, food, goatEat, room, busBoard with parcel, fufuPlug, crumble, the lane pickups), the save, the ₦2 pay, unit tests (numbers from level data) | gamedev | 1.5 KB first load | 1 day |
| Board, mission card, chip, end card lines, the "Missions" button, the wheel move rule | gamedev | 1.5 KB first load | 1 day |
| Helpers' thank-you lines and cheer, the wells help line, the parcel-in-mission rule, Ogun's five (words in the Ogun part) | gamedev | 0.5 KB first load, 0.5 KB Ogun | half a day |
| Total | | about 3.8 KB first load, 0.5 KB Ogun | about 3 days of gamedev |

No new level file, hazard, food, boss or tune. The engine (run.ts, lane sim) needs no change: the street events exist (kobo, food, goatEat, room, busBoard, fufuPlug, crumble), and the lane counts are the Power and Tech the run has gained (pickups and bursts both count), read from the lane session.

## 8. Done when (qa, MS4)

1. All 10 missions play by touch on the phone profile and at 4x CPU, Normal and Gentle; frame rate on Alausa, Ota and the lane run not lower with the chip on.
2. Star 1 of every mission is won on the first go by a qa bot playing like a first-timer (the level bots), and by Tp's child if Tp is willing (optional, no pressure).
3. Stars fill at the exact numbers in part 1; the unit test proves every star is reachable from the level data.
4. A star won and then a game over: still saved, ₦2 paid once; a reload keeps all; replaying never pays again.
5. Garri for the mill never leaves two parcels saved, and a saved parcel is never lost by playing it.
6. The wells help line shows only after two goes without the well.
7. Every tile, button and the chip: 44 px tap areas (tiles 56 px), words kept, 15 px text, at 320 x 240, 568 x 320, 640 x 200, 851 x 393, 1280 x 720, 1920 x 1080, with and without the 24 px safe area; nothing newly covered.
8. Stars read in greyscale (outline vs filled); spoken names as part 2; Sound off silences the ding; reduced motion stills the pop and the bob.
9. First load grows 4 KB at most, the Ogun part 0.5 KB at most; offline after one visit.
10. Originality and "mock no one" check of the star, the words and the helper lines.

## 9. Build notes (gamedev, MS3a to MS3c, 25 Nov)

- **Coin stars** are worked out from each level file by the unit test (tests/unit/missions.test.ts): Alausa 159 coins and Ota 160, both 60 · 100 · 135. city.md W5's old 46 is not used.
- **Fill the potholes:** a fufu ball does plug an opened crack (the test throws one into Abeokuta's crack at x 5250 on the real level). Star 3 stays at 5.
- **Light it up / Tech chips:** before the bus stop the lane run lays 14 Power and 9 Tech (pickups and bursts), as part 1 says.
- **Tiles' pictures** are the goal's picture (coin, foods, goat, well, Power, fufu, parcel, gravel, Tech), not the road card picture: the road's pictures draw the city map and live in the road's chunk. Placeholder star in src/art/star.ts until art's MS2 star.
- **MS-R4:** "Nigeria's wheel" moves into Settings only where five do not fit in one row (568 x 320 and 320 x 240 today); on a phone held sideways all five fit ("Challenge road" and the wheel take two lines).
- **Short screens:** at 320 x 240 and 640 x 200 the board's tiles scroll between the heading and Back (both always show); from 320 px tall nothing scrolls.
- **Lane run:** the goal chip sits under the lane run's top rows on the left.
- Mama Put's card line has 7 words (part 5 says 6 or fewer); kept as written. The helpers' cheer bubble near the cook or the mill is not built yet; the thank-you line is.
