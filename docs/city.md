# The city: a new direction for the game (proposal)

Owner: designer. Written 9 Nov 2026 from Tp's words in chat the same day.

**This is a proposal only.** Nothing here gets built, and docs/brief.md and docs/decisions.md do not change, until Tp says yes. Where this note and the brief or decisions disagree, the brief and decisions win until Tp approves. The open choices for Tp are in part 7, each with a recommended answer.

## 0. What Tp asked for, in short

Tp's words (9 Nov 2026), and what they mean for the game:

| Tp said | What it becomes |
|---|---|
| "like wordscapes … things are happening in a city and you keep protecting, or you go play internal games … if you win, then you bring the winning back into the city" | A home city screen. Problems show up in the city. You tap one, play a short challenge, win kobo, bring it home and spend it to fix the city. This is the loop of city-building puzzle games like Homescapes or Township (Wordscapes, which Tp named, is a word puzzle game; the loop Tp describes is the city one). We take the loop only, never their look, characters or screens. |
| "Lagos is a place where every Tom, Dick and Harry comes … meant to be a center of excellence … infrastructure and technology needs to be on point" | The home city is Lagos. More people keep arriving, so the city keeps needing more roads, light, buses, drains and internet. Newcomers are always welcome, never the problem (see part 1, "Words"). |
| "we can still leave this game as one of the hurdles that you go into and play and win" | The side-view street runner and Go-Slow Hall we built in slice 2 become the first challenges. Nothing built is wasted. |
| "As long as its a never ending cycle. Development never ends." | The heart of the game. The city grows, new problems come, more of Nigeria opens on the wheel. There is always one more thing to fix, switch on or build. |
| "I want some of the challenges to have the view & experience like subway surfer" | A new challenge seen from behind the hero: three lanes, swipe to change lane, jump and slide, endless, speed rises. It may play like that kind of game, but everything you see and hear is our own (part 2B). |
| "like contra … the shooting is constant and the guntype changes the shooting type. So corn will fire corns to obstacles" | Foods that throw things at **problems**, never at people. Corn throws corn, fufu rolls a fufu ball. Goats are fed and shooed off the road, never hit. Beggars are never in the game at all: not as targets, not as scenery, not as a problem to clear (CLAUDE.md rule 4). No guns, soldiers or war look. See part 2C and 2D. |
| Phone test: no sound; expected fufu to throw something; power-ups wear off too fast | No sound: a fix comes first, whatever Tp decides (part 4 and choice 2). Fufu gets a throw (2D). Timed foods last 12 seconds instead of 6 or 7 (2D, choice 5). |

## 1. The core loop

### The loop in one picture

1. **Look at Lagos.** The city screen shows Lagos. Some spots have a problem: a dark street, a road full of potholes, a jammed junction, a flooded corner.
2. **Tap a problem.** A card says what is wrong and which challenge helps: "Potholes on this road. Run the street to raise kobo for the repair." (A real place name never sits in a line that says something is wrong; see "Words".)
3. **Play the challenge.** A street run, the hall, or the new lane run. Win and you keep the kobo you picked up, plus a win prize.
4. **Bring the kobo home.** Back in the city, the kobo counter fills up.
5. **Fix it.** Tap "Fix it (100 kobo)". The spot changes where you can see it: new tarmac rolls out, lamps switch on, a bus stop is built. A short sound and a little party.
6. **The city grows.** Each fix brings more people to Lagos. More people means new needs: a new problem pin appears somewhere else. Back to step 1.

### The city screen

- **What it looks like.** One wide picture of Lagos seen from the side, like our streets but further back, that you slide left and right with a finger (or the arrow keys). Sky, the lagoon and bridges at the back (drawn our own way, never a real bridge or landmark drawn to look real), buildings and roads in the middle, the street at the front. It uses the same drawn style as the streets now. In slice 3 it shows one area (around Ikeja: Alausa, Computer Village, Ikeja). Later areas join on the sides (the island, Ikorodu, Badagry, Epe and more, each name checked with the Q22 rule).
- **Problem pins.** A problem shows as a round sign floating over its spot, with an icon and a short word under it ("Potholes", "Lights out", "Go-slow", "Flood"). Never colour alone: icon, word and a gentle bob up and down.
- **States of a spot.** Each spot has three looks: *problem* (pin showing), *ready to fix* (you have enough kobo; the pin gets a tick-in-a-circle badge and the word "Ready"), *fixed* (the new look, no pin, a small star of sparkle once).
- **Kobo counter** at the top: "Kobo 240". Under the heading, a small line of words (no people icon, no cap): "Lagos: 1,200 new people", which goes up as you fix things (a happy number, never a worry, never a limit you must build homes to raise).
- **Buttons** (each at least 44 px): "Nigeria's wheel", "Hero", "Settings" (sound, music, gentle mode). Pause is not needed on the city screen: nothing moves against you there.
- **Nothing ever goes wrong on its own.** A fixed spot never breaks again on a timer. There are no energy bars, no waiting clocks, no "come back in 4 hours". New problems come because the city grows, not because the player was away. This keeps it kind, offline, and with nothing to buy (brief: no payments in version 1).

### Fix, switch on, build

Three kinds of change, and the words players see say only these (never "conquer", "defeat", "beat Lagos"):

| Word | When | Example of the visible change |
|---|---|---|
| **Fix** | Something broken is repaired | Potholes filled, fresh tarmac and lane paint; a broken drain cleared |
| **Switch on** | Power or light comes back | Street lamps and shop signs light up, a transformer hums, Computer Village signs glow (made-up shop words, never a brand) |
| **Build** | Something new the growing city needs | A new bus stop and more yellow buses, a footbridge, a bigger drain, a phone mast (no network's name or colours), a ferry jetty |

A bigger spot can take two or three steps (fix, then switch on, then build), each with its own change, so the same corner keeps getting better.

### Problems and the challenge that helps each

| City problem | Challenge that raises the kobo | What the fix looks like |
|---|---|---|
| Bad road, potholes | Street run (side view) | New tarmac, lane paint, kerbs |
| Go-slow at a junction | Go-Slow Hall (boss); later the lane run | Traffic lights switch on, cars flow, a bus lane is built |
| Crowded buses | Lane run | A new bus stop and more yellow buses |
| Lights out (power cut) | Any challenge (slice 3); later its own challenge with The Light Taker | Lamps, shop signs and windows switch on |
| Flooding | Later challenge | Drains built, the water goes, the road dries |
| Slow internet | Later challenge (a short "connect it" puzzle is one idea) | A mast blinks on, shop screens light up |
| Rubbish blocking a drain | Later challenge | Bins placed, drain open |
| Red tape (long queues) | Later, Mister Red Tape in Abuja (brief) | A queue becomes a short line, a "Done ✓" stamp |

Any kobo can pay for any fix: the kobo is the city's purse. The pin only says which challenge suits it best, so a player who loves one challenge is never stuck.

### How the kobo adds up (first numbers, to be tuned in play)

- A street run gives the kobo you pick up (about 60 to 150) plus a win prize of 50.
- A lane run gives the kobo you pick up (about 40 to 120 by the goal) plus 50 for reaching the goal; keep running for more.
- The hall gives 150 for a win.
- A fix costs 100 to 300. So a fix takes one or two wins, never ten. Replaying a challenge always pays, so nobody gets stuck.
- Losing a challenge keeps half the kobo you picked up. Something always comes home.

### It never ends

1. **The city grows.** Every fix adds new people (shown on the people counter). At set numbers (for example 2,000, 5,000, 10,000) a new need appears: a new pin, or a new area slides into the city picture.
2. **Lagos's cog turns** when Lagos reaches its first big mark (in slice 3: the 3 first problems fixed; later: the Lagos hall plus a number of fixes). The cog keeps turning; Lagos keeps growing after it.
3. **The next state opens** on Nigeria's wheel. Its city screen has its own real, proud sights and foods, the same everyday problems (no state is worse or to blame, R0), and its own challenges. Lagos stays open: new Lagos pins keep coming.
4. **After all 37 cogs turn,** the wheel's hub spins (the big party), and every state keeps getting new "build" jobs as it grows. Then West Africa, as friendly neighbours (brief).
5. Development never ends, and it never goes backwards.

### Words

- Arrivals are good news. "More people are coming to Lagos! The city needs a new bus stop." Never "too many people", "crowded with outsiders", or any line that blames newcomers, a group, a job, a region or an accent. The problem is always the thing (not enough buses), never the people.
- No area is shown as dirty, dangerous or behind. Every area has the same kinds of problems and ends proud (Q22 rule 4).
- Real place names go only in challenge names ("Run Alausa") and in praise. A line that says something is wrong uses "here" or "this road", never the place name (decision line 19, waiting to be pasted: "no place shown as broken or to blame"). This matters most for Alausa, the seat of the state government: no line may read as a dig at it (design S2.6 "Alausa, two checks").
- No real people, officials, governors, parties, party colours or government buildings anywhere in the city (CLAUDE.md rule 3; the Alausa guards in design S2.6 stay).
- The player is a worker who gets things working. No mayor, no chairman, no "boss of the city".

## 2. Challenge types

### 2A. Street run (side view) and Go-Slow Hall: kept as they are

- Streets 1 to 3 (Alausa, Computer Village, Ikeja) and Go-Slow Hall stay exactly as built and accepted in slice 2: walk, run, jump, crates, the well and the parcel, the bus at the end, the hall fight.
- What changes: you reach them from a pin on the city screen instead of only the Streets list, and the end card has one new big button, "Take the kobo home". The Streets list stays as a plain list of every challenge (also good for screen readers).
- "Lagos is switched on!" after the hall becomes the hall's fix: the junction's traffic lights switch on in the city picture.
- The hall now pays 150 kobo for a win, so po's M4 ruling (no kobo on the hall Win line) changes when the city is built: the Win line becomes "You cleared General Go-Slow with {lives} lives left. You got 150 kobo for Lagos."

### 2B. The lane run (new, seen from behind)

Working name: **Lane run**. (Tp can name it; see choice 3.)

**The idea.** The camera sits behind the hero, a little above. The road runs away to the horizon. Three lanes. You run forward by yourself and the speed slowly rises.

**Runs by itself: needs Tp's yes.** Tp confirmed "no auto-run anywhere" on 8 Nov (Q18, decision line 17, waiting to be pasted). The lane run cannot work without it, so it would be the one exception. Street runs and halls keep "no auto-run". This is a choice for Tp in docs/questions.md.

**Phone sideways, like every other screen.** The lane run plays with the phone sideways, the same as the streets, so nobody turns the phone between challenges. Holding the phone upright shows "Turn your phone sideways to play." and pauses, as now (design S2.10). It also pauses by itself when a call comes in, the app is switched or the tab is hidden, and every finger is let go (design S2.2). After a pause, play starts again with a short "3, 2, 1" so nothing hits you the moment you come back. Things come towards you down the lanes; you change lane, jump or slide to get past them.

**Controls.**
- Swipe left or right: change lane. Swipe up: jump. Swipe down: slide (duck low, a short skid on the ground).
- A swipe counts as soon as the finger has moved 24 px in one direction within 0.3 s (it does not wait for the finger to lift), so it feels quick.
- Keys: left and right arrows (or A and D) change lane, up (or W, Space) jumps, down (or S) slides. P or Escape pauses.
- Accessibility: a setting "Buttons instead of swipes" shows four big buttons (at least 56 px) at the screen corners: ◀ ▶ at the bottom left, ▲ ▼ at the bottom right, each with an arrow shape, not colour alone.

**Where it happens (our own Nigeria).** A Lagos road during a go-slow, on the way to a job. The traffic is stuck, so you run past it on foot. This keeps the road-safety message right: **nothing ever drives at the hero.** Vehicles in your path are standing still (stuck in the go-slow) or creeping forward the same way you run.

Things in the lanes:

| Thing | How to pass it | Notes |
|---|---|---|
| Stuck yellow danfo bus | Change lane (too tall to jump) | Our own bus drawing, seen from the back, black stripes. Route board shows only "IKEJA" (already decided) or an arrow; any other place name passes the Q22 rule first |
| Stuck keke (tricycle) | Change lane, or jump if low enough | Seen from the back |
| Parked okada, kickstand down | Change lane or jump | No rider on it |
| Row of road cones | Jump | Orange and white |
| Pothole | Jump | Same pothole idea as the streets, seen from above-behind |
| Barrier arm across the lane | Slide under | A car-park arm on one post, yellow and black, our own drawing. Never a red-and-white rail barrier on two legs |
| Low market umbrella or bunting line | Slide under | Bright cloth, our own patterns |
| Wheelbarrow of yams left in the lane | Jump or change lane | A proud market sight, not litter |
| Goat crossing | Change lane, or jump; corn feeds it off the road (2C) | Never hurt, never a target |
| Puddle of flood water | Jump, or slow splash (no life lost, just slower for 1 s) | Teaches flooding as a city problem |

People stand on the pavements as scenery only (market traders at their stalls, people waiting at bus stops, waving). People are never in the lanes and never something to dodge, hit or shoot.

**Kobo and food.** Kobo come in lines down a lane and in arcs over jumps. Food sits in a lane like kobo, one at a time.

**How a run goes.**
- Start speed is gentle. The speed rises a little every few seconds, to a top speed about twice the start.
- Every thing is visible on the road for at least 1.5 seconds before it reaches you, at every speed. No hazard the player cannot see coming.
- One new thing at a time: the first 20 seconds of a player's first run teach lane change, then jump, then slide, then a goat, then food, each with a hint word in the hint bar ("Swipe left or right to change lane."), the same hint rules as design S2.2.
- A hit costs a life (3, or 5 in gentle mode), then 1.7 s of blinking safety, the same as the streets. A garri shield takes the hit instead.
- **The goal.** Each lane run has a goal distance shown at the top ("To the bus stop: 600 m"). Reaching it is a win: the kobo and the win prize go home. Then the card asks "Keep running for more kobo?" and the run goes on, endless, faster, until you run out of lives or tap "Take the kobo home". Running out of lives after the goal is still a win.
- A best distance is saved on the phone.

**Gentle mode:** 5 lives, and the speed rises half as fast.

**What we must NOT copy** (from Subway Surfers, Temple Run and every other lane runner). It may play like the genre; nothing you see or hear may be theirs:
1. No trains, railway tracks, subway, tunnels or running along the tops of a line of vehicles.
2. No chasing guard, inspector, police or dog, and nobody chasing the hero at all. Nothing behind you; the danger is only ahead.
3. No graffiti, spray cans, tagging or "street art crew" theme, and no graffiti-style lettering anywhere.
4. No hoverboard, skateboard, jetpack, pogo stick, super sneakers or any ride that saves you from a crash. Our saving power is the garri shield.
5. No coin magnet look (no horseshoe magnet), no "mystery box", no score multiplier pickups, no letter-collecting hunt, no keys to continue, no daily missions, streaks or login prizes.
6. No "stumble once, caught the second time" rule. We use lives and the 1.7 s blink, as on our streets.
7. Phone sideways, never an upright screen like theirs.
8. No characters, outfits, colours, fonts, logos, menu layouts, icons, music or sounds from any of those games.
9. No turning corners on a path over a cliff and no monster chase (Temple Run).
10. Our own: the hero you built, Lagos roads, danfo, keke, okada, cones, market umbrellas, a bus stop goal, Nigerian foods, our own highlife tunes and our own sounds.

### 2C. Food throws at problems ("problems, not people")

Tp's idea: like an old shooting game, things fly out all the time and the food you ate changes what flies. We keep the fun and drop the war. Recommended: throws happen only while a throw food is working (12 s), not all the time, so dodging stays the game (choice 4 for Tp):

- **No guns, no bullets, no soldiers, no army look, no "spread gun" or any name from Contra.** The hero tosses food bits by hand, like a friendly throw.
- **Targets are problems only:** potholes (plugged), cones (knocked aside, they slide to the roadside), smoke and exhaust puffs (popped), broken or dark street lamps (switched on with a "ping"), blocked drain covers (cleared), litter bags (knocked into a bin), barrier arms (lifted).
- **Never targets:** people of any kind (beggars, traders, hawkers, drivers, riders, police, anyone), animals, faith places, homes. The aim never even turns towards a person.
- **Goats:** corn never hits a goat. When a goat is near, the corn lands on the roadside in front of it and the goat trots off the road after the snack, happy. Shooing, feeding, never hurting. Tp's idea of firing corn at the goat becomes "feed the goat off the road".
- **How it fires:** while a throw food is active, the hero throws on their own, about two times a second, at the nearest problem ahead in their lane. Nothing to aim, so the one-hand control stays simple. Each thing hit gives +2 kobo.
- **Where:** as a food power in the lane run and in the street runs (recommended). A whole challenge built on it ("Clean-up run") can come later (choice 4).
- The throws are small food bits: corn kernels, a rolling fufu ball. No flames, no fire, no explosions. The word "fireball" is never used, and no ball bounces along in arcs (that is a famous plumber game's fire flower; R8).

### 2D. What each food does now, and how long

Tp found the foods wear off too fast (corn 6 s, amala 7 s). New plan: **every timed food lasts 12 seconds.** The last 3 seconds blink with a soft tick each second. The HUD shows the icon, a word and a shrinking bar with the seconds left (bar plus number, not colour alone).

| Food | Where from | Does | Lasts | Pickup words (hint bar, 35 characters) |
|---|---|---|---|---|
| Roasted corn | Street food all over Nigeria | **Corn toss:** throws corn at problems ahead; feeds goats off the road. In the street run it also keeps its old speed boost, so the built levels still work | 12 s | "Roasted corn! Corn toss for 12 s." |
| Fufu and egusi soup | Many homes in the South and beyond | **Fufu roll:** rolls a soft fufu ball straight along the ground in your lane. It plugs the first pothole (a funny "plop", the hole is filled) or pushes the first cone or barrel to the side. One roll each second | 12 s | "Fufu! Roll it at potholes. 12 s." |
| Garri, sugar and epa | Everywhere, school and home | **Shield:** takes one hit for you. No timer; it lasts until it is used | until one hit | "Garri! A shield takes one hit." |
| Amala, gbegiri and ewedu | South-West | **Strong:** smash through cones, barrels, tyres and boss throws; goats trot away unhurt, as now | 12 s | "Amala! Super strong for 12 s." |

Later foods, one or more from every region as the wheel opens (each needs a designer note first):

| Food | Region | Idea |
|---|---|---|
| Tuwo shinkafa and miyan kuka | North | **Kobo calabash:** kobo nearby fly into a calabash on your back (not a magnet) |
| Banga soup and starch | South-South | **Double kobo** for 12 s |
| Abacha (African salad) | South-East | **Light step:** puddles and slow patches do not slow you |
| Kunu or zobo drink | North and everywhere | **Cool head:** the speed rise pauses for 12 s |
| Edikang ikong | South-South (Cross River, Akwa Ibom) | **Lamp lighter:** every dark lamp you pass switches on, +kobo each |
| Masa with honey | North | **Soft landing:** one fall into a pothole does not cost a life |

Rules: a second of the same food restarts its timer. Two different timed foods can work at once (corn toss and amala together is fine and fun). No food saves you from a pit in the street run, as now, except masa later. Never food as a joke about any group.

## 3. How it fits a cheap phone and the 3 MB first load

Today all our art and sound are drawn and made in code, so they cost almost nothing to download. We keep that strength.

1. **The city screen is flat pictures, drawn once.** It does not move against you, so it is drawn when something changes and then left still: no 60 frames a second, light on the battery. Each fixable spot is a small layer with a "before" and an "after" look laid over the base picture.
2. **The lane run is pseudo-3D on the 2D canvas, no WebGL and no 3D engine.** The road is drawn as stripes that get narrower towards the horizon (the old racing-game trick). Each thing on the road is a flat picture made bigger as it comes closer, drawn back to front. The camera never turns, so each thing needs only one picture, seen from behind. At most about 20 things on screen. Pictures are kept in a pool and reused, never made new each frame. Target: 60 fps on a mid phone, never under 30 on a cheap one, at least 45 at 4x CPU slowdown as qa tests now.
3. **Load each challenge when first needed.** The first load holds the engine, the hero, the city screen, the street runs, the hall and the lane run (the slice 3 set). Later states and their challenges download only when the wheel opens them, with a note first: "Ogun is ready to download (about 400 KB)." Once downloaded, the service worker keeps it so it plays offline.
4. **If we use Blender** (choice 8), it only makes flat pictures before the game ships: we draw a scene in 3D, take pictures from one fixed angle, and save them small (WebP, a few sizes, few colours). The phone never runs 3D. A budget: the whole city picture under 300 KB, each before/after layer under 20 KB, each lane-run thing under 15 KB.
5. **Budget for the first load** (gamedev checks against the real build, the size check in CI stays): engine and screens, city, both runs, hall, sounds and tunes: aim under 1.5 MB, so there is room to spare under 3 MB.
6. **Real 3D in the phone is out.** It would break the 3 MB rule and stutter on cheap Androids.

**The sound fix (before anything else).** Tp heard no sound on the phone. Likely reasons for gamedev to check: the music player (O2) is not built yet, so there is no music at all; on an iPhone, the side ring/silent switch mutes web sound unless the game asks for "playback" sound; and sound must start from the player's first tap. This is a fix for the game as it is now, whatever Tp decides about the city.

## 4. What we keep, change or drop from slice 2

| Thing from slice 2 | Keep, change or drop | How |
|---|---|---|
| Hero builder (body, age, skin, hair, outfit) | Keep | Same hero in every challenge; the lane run needs a "from behind" pose set (art) |
| Streets 1 to 3, crates, well, garri parcel | Keep | They become the street-run challenges behind city pins |
| Go-Slow Hall | Keep | The first boss challenge; its win fixes the junction in the city. P2's hall tuning still needed |
| Walk, run, jump controls | Keep | For side-view challenges. The lane run has its own swipe controls |
| Kobo | Change | Kobo were only a score. Now they are the city's purse and are spent on fixes. Saved on the phone. "Best: {n} kobo" on a challenge card stays a record of the best run and is never spent. Kobo is never sold for real money |
| Food lengths (corn 6 s, amala 7 s) | Change | 12 s each; corn also tosses corn |
| Nigeria's wheel, 37 cogs | Keep | Still the big progress picture; a cog turns when a state reaches its first big mark |
| Fixed street look (lamps, bunting, road paint) | Keep, reuse | It is exactly a city "after" look; reuse it for the city spots |
| "Fix" and "switch on" words | Keep, add "build" | Same rule: never "conquer" |
| Streets screen | Change | Becomes a plain "Challenges" list reached from the city; the city screen becomes the home after the title |
| Strict order street 1, 2, 3, hall | Change a little | Pins open in order in slice 3 to teach one thing at a time; later more than one pin can be open |
| Save `gidi-progress` | Keep, add | Add a `city` part under each state (merge, never overwrite, as now) |
| Music tunes (O1) | Keep | Add a calm city tune and a lane-run tune later |
| Gentle mode 5 lives | Keep | Also halves the lane run's speed rise |
| Title words "Fix the streets. Get Nigeria working." | Change slightly | designer: "Fix Lagos. Get Nigeria working."; po: "Build up Lagos. Get Nigeria working." (Tp picks, see docs/questions.md) |
| Brief's "one-tap runner", "Worlds" list, "a level is 60 to 120 s" | Change (Tp only) | Tp edits the brief if this is approved; see "Lines for Tp" at the end |
| Nothing | Drop | No built feature is thrown away |

## 5. Slice 3: a small first slice to prove the loop

**Goal ("slice 3 done"):** a player opens Lagos's city screen, sees 3 problems, fixes one with kobo from a street run and one with kobo from a first lane run, switches on the third with any kobo, sees each spot change, sees new people arrive and a new pin appear ("coming soon"), and Lagos's cog turns. All offline on a second visit, under 3 MB.

**The three problems (Ikeja area):**

| # | Pin | Challenge | Cost | The visible change |
|---|---|---|---|---|
| 1 | "Potholes" on Alausa road | Street 1 (Alausa), side view | 100 kobo | Fix: fresh black tarmac rolls out, white lane paint, cones go away |
| 2 | "Go-slow" by the Ikeja bus stop | Lane run, first version | 150 kobo | Build: a new bus stop shelter, two more yellow buses, traffic moves |
| 3 | "Lights out" at Computer Village | Any challenge | 100 kobo | Switch on: street lamps and shop signs light up one by one with a hum |

Opening order: pin 1 first, then pin 2, then pin 3 (one new thing at a time). After all three: "More people are coming to Lagos!" The people counter jumps, two grey pins appear marked "Coming soon", and Lagos's cog turns on the wheel.

**The first lane run (small on purpose):**
- 3 lanes, swipe and keys, the "Buttons instead of swipes" setting.
- Things: stuck danfo, cone row, barrier arm, pothole, goat. Food: roasted corn (corn toss) and garri.
- Goal 600 m (about 55 s at first-timer speed), then "Keep running" endless.
- First-run teaching in the first 20 seconds, one move at a time.
- A first-timer reaches the goal in 3 tries or fewer (the designer rule).

**Also in slice 3:** the sound fix (if not done before), food lengths to 12 s, the "Take the kobo home" button on street and lane-run end cards, the `city` save.

**Not in slice 3:** more areas of Lagos, other states, fufu (unless Tp wants it early, choice 6), Blender pictures (unless chosen), new bosses, the Clean-up run, any timers or waiting.

**Order** (same flow as always): designer writes the slice 3 notes in docs/design.md (city screen, lane run, words) → art (city picture with before/after layers, lane-run things from behind, hero from behind, pins, sounds) → gamedev (city screen and save, lane run, kobo flow, food changes) → qa (phone profile, 4x CPU, size, offline, originality list in 2B, first-timer tries) → po accepts.

**Screens and words for slice 3 (first draft, po checks the words):**

| Screen | Who sees it | One job | Words |
|---|---|---|---|
| City | Anyone who taps "Play" | Pick a problem to fix | Heading "Lagos". "Kobo {n}". "Lagos: {n} new people". Pins with one word each. Buttons "Nigeria's wheel", "Hero", "Settings" |
| Problem card | A player who taps a pin | Say what is wrong and how to help | "Potholes on this road." "Run the street to raise kobo for the repair." Big button "Run Alausa" (or "Fix it ({cost} kobo)" when you have enough). Small "Back" |
| Fixed! | A player who paid for a fix | Celebrate the change | "Fixed!" (or "Switched on!" or "Built!") "{n} more people are coming to Lagos." Button "Back to Lagos" |
| Lane run end | A player who reached the goal or ran out of lives | Bring kobo home | Goal reached: "You made it to the bus stop! You got {kobo} kobo." Big "Take the kobo home", small "Keep running". Out of lives before the goal: "Out of lives. You keep {half} kobo. Try again!" Big "Play again", small "Take the kobo home" |
| Pause (lane run) | A player who paused | Get back to playing | "Paused". "Keep playing", "Start again", "Back to Lagos". Sound and Music switches |

Accessibility for all of it: every button at least 44 px (in-play at least 56), sound and music switches on every pause and on Settings, no meaning by colour alone (icon, word, shape), gentle mode, the "Buttons instead of swipes" setting, screen readers hear each pin as "Potholes, problem" or "New road, done", reduced motion keeps the city still.

## 6. Original only: the check list for every new piece

On top of design R8 and part 2B's "must NOT copy" list:
1. From Homescapes, Township and Wordscapes: the loop only. No butler or helper character, no match-3 board, no letter wheel, no star currency, no farm, no screens, fonts or sounds of theirs. Also: no task list down the side with a cost on each task, no "pick one of three styles" for a fix, no top-down tilted town, no population cap or houses to raise it, no crops, no trains or zeppelins, no area locked behind a paid key.
2. From Contra: no guns, soldiers, military look, aliens, weapon letters or names, no Konami code.
3. From Mario and every Nintendo game: everything in R8, plus no bouncing fireballs and no fire flower.
4. From Subway Surfers and Temple Run: part 2B's list.
5. Our own: Lagos and Nigeria, our hero, our foods, our highlife, our drawn style.

## 7. Open choices for Tp

Each has a recommended answer (first) and other options. po has put these to Tp in docs/questions.md, "City direction (9 Nov 2026)", with two changes: the kobo spending point joins choice 7, and po adds the lane run's auto-run and the title line.

**Choice 1. Do we change the game's shape to the city loop?**
- **a (recommended):** Yes, as written here: a Lagos city screen is the home, challenges earn kobo, kobo fixes the city, and it never ends.
- b: Yes, but slowly: keep the Streets list as the home for now and add the city screen after a few more streets.
- c: No: stay a side-view platform game only.

**Choice 2. Slice 2's leftovers (O music player, P polish) and the no-sound bug.**
- **a (recommended):** Finish O and P first, plus the no-sound fix, so Tp gets a whole, working, accepted slice 2 on the phone. The designer writes the slice 3 notes at the same time, so nothing waits.
- b: Do only the no-sound fix now; fold O and P into slice 3.
- c: Stop slice 2 where it is and start slice 3 straight away.

**Choice 3. The lane run's setting and name.**
- **a (recommended):** A Lagos road in a go-slow: you run on foot past stuck danfos and kekes to a bus stop; nothing drives at you. Name "Lane run" until Tp picks a better one.
- b: A market road on market day (no vehicles; stalls, umbrellas, wheelbarrows).
- c: A brand-new road before it opens (cones, barriers, road works; no traffic).

**Choice 4. The food throws (Tp's "Contra" idea).**
- **a (recommended):** As food powers (corn toss, fufu roll) in the lane run and the street runs, throwing only while the food works. Problems only; goats fed off the road; no people ever. A "Clean-up run" challenge built on throwing can come later.
- b: Throwing all the time, as Tp first said; the food only changes what flies. (po: the throws would clear the road for you, so dodging stops mattering, and more things on screen is harder on a cheap phone.)
- c: Leave throwing out for now.

**Choice 5. How long timed foods last.**
- **a (recommended):** 12 seconds each.
- b: 10 seconds.
- c: 15 seconds.

**Choice 6. Fufu.**
- **a (recommended):** "Fufu and egusi": a fufu ball rolls along the ground and plugs potholes. Comes after slice 3 (slice 3 has corn toss to prove throwing).
- b: The same, but in slice 3.
- c: Fufu does something else (for example, a shield like garri) and does not throw.

**Choice 7. How fixing costs and waits work.**
- **a (recommended):** Kobo only. Any kobo fixes any problem; a fix costs one or two wins; no timers, no energy, nothing breaks while you are away, nothing to buy.
- b: A fix needs a win in that problem's own challenge plus kobo (more tied together, less free).
- c: Fixes take a little real time to finish (like a build clock). Not recommended: it adds waiting, and waiting games lean on payments later.

**Choice 8. Art route, and whether to install Blender.**
- **a (recommended):** Keep drawing in code for slice 3 (almost 0 KB, same look as now). Try Blender on one city picture as a side test, and decide after seeing it on the phone. Installing Blender is a free download of about 300 to 400 MB, which needs Tp's yes.
- b: Install Blender now and pre-render the city and all lane-run things as flat pictures.
- c: No Blender: code-drawn art only.

## Lines for Tp (only if choice 1 is "a")

These are suggestions for Tp to put in docs/brief.md and docs/decisions.md. No agent edits those files.
1. The idea in one line: "A free game where you build up Lagos, then all of Nigeria: play short street challenges, earn kobo, and spend it to fix, switch on and build the city. Development never ends."
2. How it plays: the city screen is home. Challenges are the side-view street run, the boss halls, and a lane run seen from behind. "A level is 60 to 120 s" applies to the street run only. The lane run is the one challenge where the hero runs by itself (an exception to decision line 17); street runs and halls keep line 8's controls.
3. Food powers last 12 seconds. Corn tosses corn and fufu rolls fufu at problems, never at people; goats are fed off the road, never hurt.
4. Worlds become states on Nigeria's wheel, each with its own city screen, Lagos first.
