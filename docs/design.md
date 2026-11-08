# Gbese!: design notes

Owner: designer. World is 360 units tall; road top at y = 300 (y grows downward). Feel reference: docs/prototype.html.

This file has two parts. Part 1 (the notes straight below) is slice 1. Part 2, "Slice 2", is at the end. Where slice 2 says something different, slice 2 wins; everything slice 2 does not change stays as written in part 1.

## Physics feel (task A4)

What a first-time player should feel: a quick tap is a small, snappy hop over a pothole or tyre. Holding makes a big, floaty jump onto a stall roof. The second tap is a rescue when a jump falls short. Never slippery, never floaty on the way down, and every fall feels like the player's own choice, not the game's.

Fixed time step: dt = 1/60 s, run with an accumulator, so 30 fps draws two steps and 60 fps draws one. Cap at 4 steps per drawn frame (slower than 15 fps the game slows down instead of jumping ahead). Update order each step: vy += g * dt, cap vy, y += vy * dt, then check landing. Per-frame column = per-second value / 60 (speeds) or / 3600 (gravity).

| Value | Per second | Per frame at 60 fps |
|---|---|---|
| Run speed | 156 u/s | 2.6 |
| Run speed with roasted corn | 228 u/s | 3.8 |
| Jump (from ground) | vy = -576 u/s | -9.6 |
| Second jump (in the air, once) | vy = -504 u/s (set, not added) | -8.4 |
| Gravity | 2232 u/s² | 0.62 |
| Gravity while held and rising | 1152 u/s² | 0.32 |
| Max fall speed | 720 u/s | 12 |
| Bounce off goat or tyre | vy = -480 u/s | -8 |
| Coyote time (jump after leaving an edge) | 0.083 s | 5 steps |
| Jump buffer (tap just before landing) | 0.10 s | 6 steps |

Rules:
1. Hold for higher: the lighter gravity applies only while the finger stays down, the hero is rising (vy < 0), and that press started the jump. Letting go switches straight back to normal gravity. No velocity cut on release.
2. Second jump: one per airtime. It also works after walking off an edge (past coyote time) and after a bounce. Landing on ground or a platform resets it.
3. A bounce counts as the first jump used, so one second jump is left.
4. Landing: only while falling (vy >= 0), and only if the feet were at or above the top last step (platform: prevY <= top + 1; ground: prevY <= 302). Platforms are one-way: jump up through them from below.
5. Platform edges have 6 u of grace on each side, measured from the hero's centre x.
6. Ground exists where a ground span covers the hero's centre x. Over a gap the hero falls; below y = 420 a life is lost.
7. Jump buffer: a tap in the 0.10 s before landing jumps the moment the feet touch.

Resulting shapes (for level design; real values at dt = 1/60 come out about 5 u lower):

| Move | Peak height | Time in air | Ground covered |
|---|---|---|---|
| Tap | 74 u | 0.52 s | 80 u |
| Full hold | 144 u | 0.86 s | 134 u |
| Full hold, then held second jump at the top | 254 u | 1.41 s | 220 u |
Level rules from these numbers:
1. Teaching gaps: tap gaps at most 60 u, hold gaps at most 110 u, double-jump gaps at most 180 u. Keep at least 20 percent slack.
2. Platforms: tap-reachable at most 60 u above the road; hold-only at most 120 u; anything higher needs the second jump.
3. The hero stands at 30 percent of screen width. On a 640 u wide landscape phone that is about 2.9 s of warning before a hazard arrives. Never place a hazard where it appears less than 1.5 s before contact.
4. The test gamedev should pass: the same jump height and landing spot at 30 and 60 fps, within 1 u.

Hitboxes (boxes, x centred, bottom on the feet or the road): hero 14 wide x 44 tall; goat 32 x 26; tyre 20 x 22 (level and boss tyres alike); honk cloud 36 x 20. The hero box is kept narrow on purpose, so near misses feel lucky, not unfair. On top of a goat or tyre: the hero is falling (vy > 0) and on the step before, the feet were no lower than 6 u below the hazard's top (prevFeetY <= top + 6). Any height above the top counts, so a fast fall (12 u a step) never slips through. On top means bounce (vy = -480); any other touch hurts.

## Hero builder (task B1)

Uses po's provisional answer to Q5. Each list is data. Only ever add to the end of a list, never reorder or remove, so a look saved on a phone (indices under the key `gidi-look`) still loads.

- Who sees it: a first-time player straight after "Make your hero" on the title screen; anyone who taps "Change hero" later.
- One job: pick skin, hair and outfit, and see the hero change at once.
- Layout: big live preview on the left (upright phone: on top), three rows of choices, one green button at the bottom. Works upright and sideways. The preview is the same drawing used in the run, standing still and blinking.
- Choices save the moment they are tapped. If storage is blocked, the look lasts until the tab closes and the game still runs.

| List | Options, in this order (art may tune shades, not the order) |
|---|---|
| Skin | 5 round swatches: #f1c9a5, #d9a172, #a8693f, #7a4a2a, #4b2c1a. Spoken names: "Skin tone 1" to "Skin tone 5" |
| Hair | Low cut, Afro, Braids, Gele, Headscarf (a soft wrap over hair and neck, not a tall tie like gele) |
| Outfit | Green jersey (#0e7a3e / #ffffff), Ankara (#e0572b / #2b59c3), School uniform (#f4f4f4 / #7b2d26), Agbada (#5a3e8f / #f2b300), Kaftan (#2f5d8a / #e9e1cf) |

Exact words: heading "Make your hero". Row labels "Skin", "Hair", "Outfit". Button "Start running". Small line under the button: "Your hero is saved on this phone only."

Accessibility: swatches 48 x 48 px, word chips at least 44 px tall with 8 px between targets. The chosen one gets a thick dark ring and a tick, not just a colour change. Every button has a spoken label.

## Level 1: Your street (task C1)

Idea: a busy morning road on your own street: shop signs (Mama Put, Vulcanizer, POS Here), a yellow bus at the bus stop, stalls with roofs to jump on, goats that wander. It teaches one thing at a time, then gives the three foods as rewards, then the jam.

Data file: src/data/levels/w1-l1.json. Gamedev changes nothing in code to move things.

Schema (world units, y grows down, road top `groundY` = 300):
- `ground`: [start x, end x] spans of road. The spaces between spans are potholes.
- `platforms`: [x, top y, width] stall roofs. One-way, physics rules apply.
- `kobo`: [x, centre y, count] rows, coins `koboSpacing` (24) apart. y 276 is picked up by running; lower numbers need a jump.
- `foods`: [x, centre y, kind], kind is corn, garri or amala. y 272 is picked up by running.
- `runSpeed` and `cornSpeed`: the level carries both (156 and 228 here). Code keeps 228 only as the fallback when `cornSpeed` is missing. Absolute speeds, not a multiplier, so the closing-speed checks below read straight from the file.
- `hazards`: [kind, x], kind is goat or tyre. A hazard stands still until it is close enough, then moves toward the hero: goat 36 u/s (turns back at pothole edges), tyre 60 u/s (drops into potholes). Wake distance = the larger of `wakeDistance` (520, the minimum) and the visible width ahead of the hero + 40, so a hazard always starts moving just off the right edge and is never seen standing still (851 x 393 phone: 546 + 40 = 586).
- A tyre that is bounced on or smashed by amala vanishes in a small sparkle (0.3 s, harmless). A goat never vanishes: it bleats and trots off to the right, harmless.
- `hints`: [x, words]. A short toast when the hero passes x. Each hint shows once per play of the level: not again after a fall or a lost life, but again after "Play again" or "Start the level again".
- `checkpoint`: the bus stop x. `arena`: start x and width. `boss`: lights and phases (see Boss).

Length: start x 80 to arena x 11000 is 70 s at 156 u/s; the boss takes about 25 s. About 95 s in all.

| Part | x | Time | Teaches | What is there |
|---|---|---|---|---|
| Warm up | 80-800 | 0-5 s | running and kobo | Flat road, kobo on the ground |
| Jump | 800-1900 | 5-12 s | tap, then hold | Kobo in the air at 880; low stall roof at 1150 (50 high, tap); "Hold" stall at 1650 (110 high). Road is solid under both, so missing costs nothing |
| Gap | 1900-3300 | 12-21 s | potholes | Three tap potholes, 40, 50, 60 wide (2100, 2500, 2900), kobo over each |
| Second jump | 3300-4500 | 21-28 s | tap again in the air | Safe practice: high stall at 3550 (150 high) over solid road. Then a 150-wide pothole at 3950 with a kobo arc |
| Hazard | 4500-5600 | 28-35 s | goats and tyres | Goat at 4950 alone. Tyre at 5450 alone, about 3 s later |
| Bus stop | 5600 | 35 s | checkpoint | Yellow bus and shelter |
| Food | 5600-11000 | 35-70 s | the three foods | Garri at 5900, then a goat at 6400 to spend the shield on. Corn at 7100: 6 s of fast road with kobo, a 50 pothole and two roofs, no hazards. Mixed bit: tyre 8900, 90 hold pothole at 9200. Amala at 9650: goats and a tyre at 10000, 10300, 10550 to smash |
| Boss | 11000-11560 | 70 s on | General Go-Slow | See Boss |

Foods sit on the road at running height with a short kobo row leading in, so a normal run picks up all three without trying: garri x 5900 (37 s), corn x 7100 (45 s), amala x 9650 (61 s). No pothole within 300 u of a food, so nobody jumps over one by accident.

Food when the boss starts: no timed food is running. Corn ends near x 8470. Amala ends near x 10740, the last hazard it meets is near 10450, and the arena starts at 11000, so amala is over about 1.7 s before the boss. The garri shield has no timer, so an unused shield carries into the fight. That is a fair reward. Timers are never cut at the arena line; the Q6 rule just never comes up in this level.

Rules checked against the physics note:
- Potholes: tap 40, 50, 60 (limit 60); hold 90 (limit 110); second jump 150 (limit 180). Corn-speed pothole is 50.
- Roofs: 50 high (tap, limit 60); 110 high (hold, limit 120); 150 high (second jump).
- Seeing hazards: a hazard wakes 520 ahead. Closing speed is at most 288 u/s (tyre while on corn), so every hazard is seen at least 1.8 s before contact. No tyre in the corn stretch. Never a hazard next to a pothole.

Losing a life: a goat, tyre or boss throw costs a life, then 1.7 s of blinking safety, and the run goes on. Falling in a pothole costs a life and you start again at the bus stop if you reached it, else at the start. Lives do not refill at the bus stop. After a fall, food effects end, foods and hazards past the restart point come back, and kobo already picked up stay counted. 0 lives: game over. Play again starts the level from the beginning with 3 lives (5 in gentle mode) and 0 kobo.

Three tries or fewer: before the bus stop there are only 6 ways to lose a life, each taught alone with a hint, with 2 s or more of warning. The hardest moment is the 150 pothole, practised just before on safe ground. If qa's first-timers need more than 3 tries, tune in this order: shorten the 150 pothole to 140, take out the goat at 6400, lower the third boss light to 190.

No hidden well in this level.

## Power-ups (task D1)

All three show an icon, a word and, if timed, seconds left in the HUD. Never colour alone: each also has a shape on the hero.

| Food | Effect | Lasts | Pickup words (toast) | HUD | Hero look | How it ends |
|---|---|---|---|---|---|---|
| Roasted corn | Run speed `cornSpeed` (228) instead of `runSpeed` (156), both from the level file | 6 s | "Roasted corn! You run faster for 6 seconds." | corn icon "Fast 6" counting down | speed lines behind | Last 2 s: HUD and hero blink, a soft tick each second, toast "Corn is wearing off!" |
| Garri, sugar and epa | Shield takes one hit for you | Until one hit | "Garri, sugar and epa (groundnut)! A shield takes one hit for you." | cup icon "Shield" | a round bubble outline | On a hit: bubble pops, toast "Shield used up!", 1.2 s of blinking safety, no life lost |
| Amala, gbegiri and ewedu | Smash through goats (they run off unhurt), tyres and boss throws, +2 kobo each | 7 s | "Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through!" | bowl icon "Strong 7" counting down | glowing outline and bigger steps | Last 2 s: blink and tick, toast "Amala is wearing off!" |

Rules: amala never counts as a boss hit (Q6). No food saves you from a pothole. A second corn or amala restarts its timer; a second garri while shielded gives nothing extra. Goats are never hurt: smashed or bounced, they bleat and trot away.

## Boss: General Go-Slow (task E1)

A problem, not a person: a heap of six stuck cars and buses under one grumpy traffic light with a face. No uniform, cap, medals, flag or party colours, and no human face in the cars. Art: src/art/boss.ts (modes idle, attack, hit, defeat; timings below match it).

Every number here matches the `arena` and `boss` blocks of src/data/levels/w1-l1.json.

Arena geometry:
- Road x 11000 to 11560, solid, no potholes. The boss heap's bottom centre is at x 11580 on the road (about 140 wide, 11510 to 11650). Touching the heap never hurts; the hero never reaches it.
- The fight starts when the hero's centre passes x 11000. The camera stops with its left edge at x 11000 and stays there. On a 16:9 phone (640 u visible) everything shows; on a 4:3 one (480 u) the heap is partly off the right edge but the hero, lights and throws are all on screen. No zoom.
- The hero keeps running by itself and turns around at once at x 11015 (`turnLeftX`) and x 11440 (`turnRightX`). Taps work as normal.
- Three light platforms [x, top y, width], all solid one-way platforms (physics rules) for the whole fight, lit or not: left 11090, 240, 90 (60 above the road, a tap); right 11380, 210, 90 (90, a hold); middle 11235, 180, 90 (120, a full hold or a second jump).
- Unlit lights are dark grey with no arrow. The lit one is green with a bouncing down arrow and the word "GO" (not colour alone).

Timeline:
- t = 0 at x 11000: toast "General Go-Slow blocks the road! Jump onto the green light." Left light comes on. First throw at t = 2.0 s, then one every `every` seconds.
- A hit: the hero lands on the lit light from above (same landing rule as any platform). The hero bounces off it (vy = -480, second jump still available), the light goes dark, one car drives off the heap, the heap shakes and honks crossly (boss mode `hit`, 0.8 s), every throw on screen pops into dust (0.3 s, harmless), and no throws come for `breakAfterHit` (1.5 s). Then the next light comes on, the pattern starts again from its first item, and the first throw comes one full `every` later. Toasts "Green light! 2 more." and "Green light! 1 more." Hit counter: three circles that fill with a tick.
- Landing on a dark light does nothing. Landing on the lit light while blinking after a hurt still counts.

| Phase | Lit light | Throw every | Tyre speed | Pattern (repeats) |
|---|---|---|---|---|
| Before any hit | left | 2.2 s | 156 u/s | tyre |
| After hit 1 | right | 1.8 s | 192 u/s | tyre, tyre, honk |
| After hit 2 | middle | 1.4 s | 228 u/s | tyre, tyre, honk |

The order is fixed, not random, so a player can learn it. How it gets harder after each hit: the throws come faster, the tyres roll faster, honk clouds join in, and the lit light is higher.

Throws (boss mode `attack` for 0.4 s at each throw, cross honk marks):
- Tyre: appears on the road at x 11520, rolls left at the phase speed, 20 x 22 box. Jump it or land on it (bounce, it sparkles away). A tyre catching up from behind is slow, so landing on it is easy. At x 11000 it rolls off and is gone.
- Honk cloud: appears at x 11520, centre y 236, moves left at 120 u/s in every phase, 36 x 20 box (y 226 to 246; drawing about 50 x 33). A hero standing or running on the road (head at y 256) is 10 u under it and safe; jumping into it hurts. A hero standing on the right or middle light is above it and safe. Gone at x 11000.
- What hurts: a tyre touched from the side or below, and any touch with a honk cloud. Each costs a life with 1.7 s of blinking safety, or uses up the garri shield. Amala smashes tyres and clouds (+2 kobo each) but never counts as a hit on the boss. Out of lives in the arena: Game over, as anywhere.

Defeat, funny not cruel (boss mode `defeat`; t from the third hit):
- 0 s: all throws pop into dust, no more throws. The hero stops, stands and cannot be hurt; taps do nothing.
- 0 to 1.4 s: the light blinks yellow and sighs (a puff of breath).
- 1.4 s: it turns green and smiles, and waves its pole from then on.
- 1.6 s, 2.05 s, 2.5 s: the last three cars settle, honk a happy "pom pom" and drive off to the right at 260 u/s.
- 2.5 s: toast "Green light! The road is free!"
- 4.5 s: the Win screen. Nothing breaks, nobody is hurt.

## Screens (tasks C6, E2 and others)

Sound: our own code-made beeps. Sound starts only after the first tap. The sound button is on the title screen and in the HUD, says "Sound: on" or "Sound: off" (HUD: speaker icon with a line through it when off), and is remembered on the phone. Every button is at least 44 x 44 px.

Accidental taps: every screen that opens during play (Pause, Game over, Win) ignores taps for its first 0.4 s, so a jump tap cannot press a button by mistake. The title and hero builder do not need this.

Gentle mode: one switch, "Gentle mode: 5 lives instead of 3", on the title screen and on the game over screen. Remembered on the phone. It changes only the number of lives.

| Screen | Who sees it | One job | Exact words |
|---|---|---|---|
| Title | Everyone who opens the game | Start running | "Gbese!" (the name is one setting). "Run your street. Clear the jam." Button "Make your hero" (first visit) or "Start running" (hero saved). Smaller: "Change hero", "Credits", "Sound: on", "Gentle mode: 5 lives instead of 3". How to play: "Tap to jump. Tap again in the air to jump again. Hold to jump higher. You run by yourself." |
| Hero builder | First-time players, and anyone changing their look | Pick a look | See Hero builder |
| HUD (in play) | The player, all run long | Show lives, kobo, food | Hearts plus a number, e.g. "♥ 3". "Kobo 12". Food slot as in Power-ups. Buttons: sound, pause (spoken "Pause") |
| Pause | A player who tapped pause, left the app, or turned the phone upright | Get back to the run | "Paused". Buttons "Keep running", "Start the level again", "Home". Tapping outside the buttons does nothing |
| Turn phone | A player holding the phone upright during a level | Get the phone sideways | "Turn your phone sideways to play." The game pauses; once sideways, the Pause screen shows |
| Game over | A player who lost the last life | Try again | "Out of lives". "You got {kobo} kobo. The road is still here. Try again!" Button "Play again". If gentle mode is off: "Want more tries? Gentle mode gives you 5 lives." with the switch. Small button "Home" |
| Win | A player who beat General Go-Slow | Celebrate, then play again | "Road cleared!" "You beat General Go-Slow with {kobo} kobo and {lives} lives left." ("1 life left" when one.) "More roads are coming soon." Button "Play again", small "Home". |
| Credits | Anyone who taps "Credits" on the title screen | Say who made it | "Credits". "Made by CoachNaz." "Every picture and sound is our own." Button "Back" |

Level hints (in the data file): "Tap to jump." / "Hold your finger down to jump higher." / "Pothole! Tap to jump over it." / "Tap again in the air for a second jump." / "Big pothole! Jump, then tap again in the air." / "Goat! Jump over it, or land on it to bounce." / "Rolling tyre! Jump over it." / "Bus stop! If you fall, you start again here."

---

# Slice 2

Owner: designer. Written 7 Nov 2026 from Tp's requests R0 to R8 and po's recommended answers to Q16 to Q21 in docs/questions.md. Until Tp confirms, po's recommendations are the stand-ins: World 1 is Lagos, 3 streets plus Go-Slow Hall (Q16); the Nigeria wheel (Q17); no auto-run anywhere, gentle mode stays 5 lives (Q18); the well gift is a garri parcel that starts the hall fight with the shield on (Q19); every hair and outfit open to every hero (Q20); the building is "Go-Slow Hall" (Q21).

Words players see say "fix", "clear", "switch on", "get working". Never "conquer", "defeat the state", "backward" or "underdeveloped". Lagos starts grey like every state will.

Same units as part 1: world units (u), y grows down, road top y = 300, one fixed step = 1/60 s.

## S2.1 The view: room for thumbs (change from part 1)

Part 1 showed the world 360 u tall. Slice 2 shows it **420 u tall**, on every screen, touch or not. The extra 60 u (y 360 to 420) is a pavement and gutter strip under the road front. The buttons live in the bottom strip (y 300 to 420 in world terms is the road front plus this strip), so a thumb never covers the hero, a hazard, a coin or a pit edge.

- Scale = screen height / 420. The view shows width = screen width / scale. 320 x 240 shows 560 u; a 16:9 phone shows about 747 u; 851 x 393 shows about 910 u; 4:3 shows 560 u. The "at least 480 u across" safety net (MIN_WORLD_W) stays.
- The fall line stays at y = 420, which is now the bottom edge of the screen. Pits are drawn dark from the road top down to the bottom edge.
- Nothing playable is ever placed below y = 300. Nothing playable is placed above y = 40 either (that is where the HUD sits).
- The camera never moves up or down.

## S2.2 Controls (R3)

### What it should feel like

The hero waits for you. A light press walks; keep holding and after half a second the hero breaks into a run, with a little dust puff and a lean. Let go and the hero stops within a step. Turn round and the hero skids, then walks the other way. Jumping is exactly as in slice 1 (same heights, same hold, same second jump, coyote time and buffer). What is new is that how far you fly depends on how fast you were going. Walking jumps are short and safe. A run-up jump is long.

### Speeds

| Value | Number | Notes |
|---|---|---|
| Walk speed | 90 u/s | Top speed while holding a direction for less than 0.5 s |
| Run speed | 156 u/s | Same as slice 1's run speed, so part 1's jump table still holds for a running hero |
| Walk speed with roasted corn | 120 u/s | |
| Run speed with roasted corn | 228 u/s | Same as slice 1's corn speed |
| Start to walk (ground) | 900 u/s² | 0 to 90 in 0.1 s |
| Walk to run (ground) | 300 u/s² | Starts after 0.5 s of holding; 90 to 156 in 0.22 s. Full run about 0.72 s after the press, after about 70 u of road |
| Stop when you let go (ground) | 1200 u/s² | From a run: 0.13 s, slides about 10 u. From a walk: 0.08 s, 3 u |
| Turn round (ground) | 1800 u/s² | Slow to 0, then start the walk the other way. Facing flips on the first step |
| Air steering | 600 u/s² | See "In the air" |

The run timer:
1. It counts up while one direction is held, on the ground or in the air.
2. It goes back to 0 when the direction is let go, when the other direction is pressed, when the hero bumps the start wall or end wall, and when a life is lost.
3. Top speed on the ground is walk speed while the timer is under 0.5 s, then run speed. Landing does not reset it, so a hero who keeps holding forward through a hop keeps running.

In the air:
1. The top speed in the air is the larger of walk speed and the speed the hero had when leaving the ground. So walking can never become a run in mid-air, but a running jump keeps its speed.
2. Holding the same direction: speed rises toward that top at 600 u/s².
3. Holding the other direction: speed falls at 600 u/s² and can turn into the other direction, up to walk speed. This lets a player pull back from a bad jump a little.
4. Holding nothing: speed is kept (no air drag). Letting go mid-jump never drops the hero short.
5. Facing follows the direction pressed, in the air too.

Jumps keep every number from part 1 "Physics feel": jump vy -576, second jump -504 (set, not added), gravity 2232, hold gravity 1152 while the press that started the jump is still down and the hero is rising, max fall 720, bounce -480, coyote 5 steps, buffer 6 steps, platform rules, landing rules. A jump with no direction held goes straight up.

### How far a jump goes (for level design)

Measured from the take-off point, at dt = 1/60 (gamedev's test should match within 3 u). Add coyote time on top: up to 7 u at a walk, 13 u at a run.

| Start | Tap | Full hold | Full hold, then held second jump at the top |
|---|---|---|---|
| Standing, forward pressed with the jump | 39 u | 72 u | 126 u |
| Walking (90) | 45 u | 78 u | 132 u |
| Running (156) | 78 u | 135 u | 229 u |
| Corn walk (120) | 60 u | 104 u | 176 u |
| Corn run (228) | 114 u | 198 u | 334 u |

Heights and air time are the same for every start: tap 70 u high, 0.50 s; full hold 139 u, 0.87 s; with the second jump 245 u, 1.47 s.

Pit sizes. Every pit is one of four kinds, and nothing in between, so the player can learn them by eye:

| Kind | Width | Can be crossed by | Slack |
|---|---|---|---|
| Tap pothole | 30 to 40 u | a walking tap (52 u with coyote) | 23 percent or more |
| Hold pothole | 50 to 64 u | a walking full hold (85 u) | 25 percent or more |
| Wide pothole | 90 to 110 u | a walking jump plus second jump (139 u) | 21 percent or more |
| Big pit | 170 u (160 to 180 if qa asks) | only a running jump plus second jump (242 u). A walking or standing jump with the second jump reaches 139 u at best, 31 u short | 30 percent from a run |

Big pit rules:
1. At least 160 u of flat, clear road straight before every big pit (no pit, no hazard, no crate, no food). 160 u is twice the run-up the hero needs.
2. Two orange and white cones stand on each lip and a row of coins arcs over the middle, so a big pit never looks like an ordinary pothole. Not colour alone: the cones and the width say it too.
3. No big pit within 1400 u after a corn (a corn walk can almost clear one; corn lasts 6 s, 6 x 228 = 1368 u).
4. The first big pit of the game comes right after a bus stop, and a coin arc on solid road just before it shows the shape of a running double jump.

Hazards with a player-moved hero (changes part 1 only where it says so):
1. Hazards still wake when they are within the larger of `wakeDistance` and (visible width ahead of the hero + 40), and then move left as in part 1. A hero standing still is walked up to; jumping over or onto them still works.
2. A woken hazard that is more than 200 u left of the camera's left edge, or more than 200 u right of its right edge, is gone for good this play (it comes back only after a lost life, as in part 1).
3. Closing speed is now at most 312 u/s (drum at 84 meeting a corn run at 228). That is too fast for the 1.5 s rule on a 560 u screen, so: no drum and no tyre within 1370 u after a corn. Goats are fine anywhere.

Walls:
1. The hero cannot walk left of `startWall` + 7 or right of `end.wall` - 7. Both are drawn: a fence and parked bus at the start, the bus park wall at the end.

### Phone buttons

Three drawn buttons, all in the bottom strip, see-through.

| Button | Shape and icon | Size (CSS px) | Place |
|---|---|---|---|
| Back | circle, left-pointing triangle | D x D | bottom left: left edge at max(12, safe left), bottom at max(8, safe bottom) |
| Forward | circle, right-pointing triangle | D x D | 10 px right of Back, same bottom |
| Jump | rounded pill, up chevron and the word "Jump" | height D, width 1.5 D | bottom right: right edge at max(12, safe right), same bottom |
| Go down / Go up | rounded pill with a bucket and an arrow, see the well | height max(56, D), width 2.2 D | only at a well; see S2.5 |

D = the strip's height in CSS px (screen height x 120 / 420), minus the bottom margin, minus 4, kept between 56 and 80.

| Screen (landscape, CSS px) | Strip | D | Left group spans | Jump spans |
|---|---|---|---|---|
| 320 x 240 | 69 | 56 | 12 to 134 | 224 to 308 (84 wide) |
| 568 x 320 | 91 | 79 | 12 to 180 | 437 to 556 |
| 667 x 375 | 107 | 80 | 12 to 182 | 535 to 655 |
| 851 x 393 (home bar 21) | 112 | 80 | 12 to 182 | 719 to 839 |
| 1024 x 768 | 219 | 80 | 12 to 182 | 892 to 1012 |

At 320 x 240 the gap between the left group and Jump is 90 px. Buttons sit fully below the road line on all of these.

Look: fill white at 35 percent, a 2 px outline in near-black at 50 percent, icon white with a dark edge. Pressed: fill 60 percent, the button shrinks to 94 percent and the icon turns solid dark. The press shows by shape and size, not colour alone. Spoken labels: "Back", "Forward", "Jump", "Go down", "Go up".

Touch areas are bigger than the drawings, so a thumb that drifts still works:
1. Direction area: the left 45 percent of the screen, below the top 56 px. A finger there means Back if it is left of the midpoint between the Back and Forward centres, else Forward. A thumb can rock from Back to Forward without lifting; the direction changes the moment it crosses the midpoint (and counts as a turn).
2. Jump area: the right 55 percent of the screen, below the top 56 px. A press anywhere there is a jump press. A jump press in slice 1's "tap anywhere" way still works on that side.
3. Real buttons (Pause, Sound, Go down, Go up) always take their own taps first.

Fingers (pointer ids):
1. Each finger belongs to the area it first touched, for its whole life.
2. A direction finger that slides into the jump area lets go of the direction (the hero stops). Sliding up inside the left 45 percent keeps it.
3. Two direction fingers: the newest one wins; when it lifts, the older one rules again.
4. Every new finger in the jump area is a new press: on the ground it jumps, in the air it is the second jump, and so on, exactly as part 1's press. The hold for "jump higher" belongs to the finger that started that jump.
5. Walking and jumping at the same time with two thumbs always works.

Let go of everything at once (the hero slows to a stop with the normal stop rate, and any jump hold ends) when: a finger is cancelled or leaves the screen edge, the window loses focus, the tab is hidden, the phone turns upright, a call or another app takes over, the pause screen opens, or a screen opens over the game. After that, a finger still resting on the glass does nothing until it is lifted and pressed again. The hero never moves by itself after a pause.

Who sees the buttons: shown when the phone or tablet has touch (`(pointer: coarse)`), or after the first touch this visit. Once shown they stay. A computer with only a mouse and keys sees no buttons; clicking the buttons with a mouse also works.

### Keys (computer)

| Key | Does |
|---|---|
| Right arrow, D | Forward (hold to run) |
| Left arrow, A | Back (hold to run) |
| Space, Up arrow, W | Jump (hold to jump higher; press again in the air) |
| Down arrow, S, Enter, E | At a well: go down. In the well room, under the rope: go up (Enter or E; Down and S do nothing there) |
| P, Escape | Pause |
| M | Music on or off |

Both left and right held: the last one pressed wins; letting it go hands back to the other. Key repeat is ignored.

### Camera

1. The hero's forward place on screen is part 1's heroScreenX(view width): 30 percent on wide screens, down to 12 percent on narrow ones (20 percent on a 560 u view). Its back place is 1 minus that (70 percent, or 80 percent on a 560 u view).
2. The camera "looks" the way the hero has been going. It switches to looking left only after the hero has moved 48 u left without stopping, and back to right after 48 u right. A quick step back does not swing the camera.
3. Each step the camera moves 10 percent of the way to its target, never faster than 480 u/s. A hard rule on top: the hero's centre always stays between 8 and 92 percent of the screen width.
4. The camera's left edge never goes left of `startWall` - 40 and its right edge never goes right of `end.wall` + 40.
5. Back-tracking: allowed all the way to the start wall, on every street. Coins taken stay taken, open crates stay open, foods eaten stay eaten. Hazards that left (rule 2 above) do not come back. This makes the street 3 secret well reachable and lets a player go back for a missed crate. There is no time limit, so no reason to stop it.
6. After a lost life the hero appears at the bus stop (or the start), facing right, standing still, and the camera jumps there.

### How to play words

Touch: "Press the arrows to walk. Keep holding to run. Press Jump to jump. Press it again in the air to jump again. Hold it to jump higher."

Keys: "Left and right arrows walk. Keep holding to run. Space jumps. Press it again in the air to jump again. Hold it to jump higher."

The title shows the touch words when the buttons are shown, else the key words.

### Words in hints

Hints in the level files use four markers so one file fits touch and keys. The words picked follow the last thing used (a touch or a key); on first load, touch if `(pointer: coarse)`.

| Marker | Touch | Keys |
|---|---|---|
| {forward} | → | → |
| {back} | ← | ← |
| {jump} | Jump | Space |
| {down} | Go down | ↓ |

The arrows are the plain characters → (U+2192), ← (U+2190) and ↓ (U+2193), drawn in the hint's own font, never as emoji. On a phone → matches the triangle on the Forward button; on a computer it is the arrow key. The short markers keep every hint short enough for the hint bar below.

A hint whose x is at or before `spawnX` shows 0.5 s after the street starts.

### The hint bar: hints never hide what you play (Tp's iPhone note)

Tp on an iPhone: the hint banner covered high kobo, so a player could not tell there were coins to jump for. The old banner sat 24 percent down the screen (and on short screens at the very top), right where high kobo, crates, the BUS PARK board and a double-jumping hero go. This replaces both places.

**The rule: every hint and every toast shows in the hint bar, in the pavement strip at the bottom of the screen, between the left buttons and Jump. Nothing the player collects or must react to is ever drawn there, so a hint can never hide it.**

Options weighed:

| Option | Verdict |
|---|---|
| a) Bottom pavement strip, between the buttons | **Chosen.** The strip below the road front holds nothing playable (S2.1), on every screen. Even at 320 x 240 the gap is 78 px wide and 57 px tall: four short lines of 12 px words |
| b) Slim see-through line at the top | No. At 320 x 240 the top 50 px already hold lives, kobo, Sound and Pause, so a top line would cover the HUD. A double jump from a platform takes the hero's head to y 10, so even a kobo-free band would hide the hero. See-through words over a busy sky are hard to read |
| c) Shorter hints with icons | Partly taken: every hint is now 35 characters or fewer, and the control words are short (→, Jump, Space). No new icons: no art work, and words teach better than a picture of a button |
| d) Show only when the hero stands still or the area is clear | No. Hints must come at the right place, and the hero waits for the player but is often running; a hint held back would arrive late, after the pothole. Also hard for qa to test |

#### Where the bar goes (CSS px)

Gamedev already has `perPx` and `lift` from `buttonLayout` (src/screens/controls.ts). A world y shows at screen y = (y - lift) / perPx.

1. Top limit: screen y of world y 312. That keeps 12 u of road front in sight under the road line, so the hero's feet, hazards on the road and the lips of every pit and pothole always show.
2. Bottom: H - max(8, safe bottom) on screens 280 px tall or more (in line with the buttons' bottoms); H - max(4, safe bottom) on shorter screens.
3. Sides with the buttons shown: left = Forward's right edge + 6; right = Jump's left edge - 6. If that is wider than 480, the bar is 480 wide, centred between those two edges.
4. Sides with no buttons (a computer with keys only): width min(480, W - 2 x max(24, safe left, safe right)), centred on the screen.
5. The bar is fixed to its bottom edge. Its height fits its words, never taller than bottom minus top limit. Words are centred in it, left to right and top to bottom.
6. Never on the HUD row, never over Back, Forward, Jump, Go down, Go up, Sound or Pause. It takes no taps (pointer-events none), so a thumb on the pavement still walks or jumps as S2.2 says.

#### Size of the words

| Screen height | Font | Line height | Padding | Lines that fit |
|---|---|---|---|---|
| under 280 px | bold 12 px | 12.6 px | 2 px top and bottom, 5 px sides | 4 |
| 280 to 419 px | bold 14 px | 16 px | 4 px, 8 px sides | 3 or more |
| 420 px and up | bold 16 px | 19 px | 6 px, 12 px sides | 3 or more |

If the words still do not fit inside the bar, the font steps down 1 px at a time to 11 px. Never cut words or add "...". If a hint still does not fit at 11 px, that is a designer bug: qa reports it and designer shortens the words.

Look: the same yellow (#f2b300) with dark words (#1d1a14), a 1 px dark outline (#1d1a14 at 60 percent), radius 6 px under 280 px tall, else 10 px. Solid, not see-through: it only ever sits on the plain pavement. Fade in and out over 0.15 s (no fade with reduced motion). Keeps `role="status"` and `aria-live="polite"`.

#### Sizes on the screens qa tests (CSS px, rounded)

| Screen | Road line y | Bar x | Bar width | Bar y (top limit to bottom) | Room | Font |
|---|---|---|---|---|---|---|
| 320 x 240 | 171 | 140 to 218 | 78 | 178 to 236 | 58 | 12 |
| 640 x 200 (lift 23) | 132 | 140 to 538 | 398 | 138 to 196 | 58 | 12 |
| 568 x 230 (lift 4) | 162 | 140 to 466 | 326 | 169 to 226 | 57 | 12 |
| 480 x 270 | 193 | 158 to 364 | 206 | 201 to 266 | 65 | 12 |
| 568 x 320 | 229 | 186 to 432 | 246 | 238 to 312 | 74 | 14 |
| 667 x 375 | 268 | 188 to 529 | 341 | 279 to 367 | 88 | 14 |
| 851 x 393, home bar 21 | 281 | 210 to 690 | 480 | 292 to 372 | 80 | 14 |
| 1024 x 768 | 549 | 297 to 777 | 480 | 571 to 760 | 189 | 16 |
| 1280 x 720, keys only | 514 | 400 to 880 | 480 | 535 to 712 | 177 | 16 |

#### How long it shows

Level hints: 3.5 s (was 2.6 s; it hides nothing now, and four short lines need a moment). Food, shield, well, parcel and boss toasts: as before. A new hint or toast replaces the one showing, as now. The bar hides at once when the pause screen or any screen opens over the game, and when a life is lost.

#### Short words for narrow bars

When the bar is under 160 px wide (only screens near 320 x 240), a toast longer than 35 characters shows its short words instead. Level hints have no short form: every level hint is 35 characters or fewer with the markers filled in, touch and keys.

| Full words (bar 160 px wide or more) | Short words (bar under 160 px) |
|---|---|
| Roasted corn! You run faster for 6 seconds. | Roasted corn! You run faster! |
| Garri, sugar and epa (groundnut)! A shield takes one hit for you. | Garri, sugar and epa! Shield on! |
| Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through! | Amala, gbegiri and ewedu! Strong! |
| General Go-Slow blocks the road! Jump onto the green light. | Go-Slow! Jump on the green light. |
| A secret room! Grab the kobo. Stand under the rope to go back up. | Secret room! Use the rope to go up. |
| Your garri parcel: the shield is on! | Garri parcel: shield on! |
| General Go-Slow is jamming the hall! Jump onto the green light. | Go-Slow! Jump on the green light. |
| PEEP! High honks fly high. Stay low on the floor. | PEEP! High honks: stay low. |

Every other toast is already 35 characters or fewer. Any new toast longer than 35 characters must come with short words in this table.

The garri parcel toast has no row here. It comes in two stages (po ruling, 8 Nov 2026): until N2 it is "Garri parcel! Keep it safe." (27 characters); from N2 on it is "Garri parcel! Shield for the hall." (34 characters). Both are 35 characters or fewer, so one string serves every bar. On the 78 px bar at 320 x 236 or 320 x 240 they wrap to short lines of 12 px words (the first one to four lines: "Garri / parcel! / Keep it / safe."), which this section allows; nothing is clipped.

#### New hint words (gamedev: change the level files to these)

Touch and keys are the same file words with the markers filled in.

| Level, x | Old | New | Touch shows | Keys show |
|---|---|---|---|---|
| lagos-1, 0 | Hold {forward} to walk. Keep holding to run. | Hold {forward} to walk. Hold on to run. | Hold → to walk. Hold on to run. | same |
| lagos-1, 700 | Press {jump} to jump. | same | Press Jump to jump. | Press Space to jump. |
| lagos-1, 1450 | Hold {jump} down to jump higher. | Hold {jump} to jump higher. | Hold Jump to jump higher. | Hold Space to jump higher. |
| lagos-1, 1880 (crates) | A crate! Jump up under it and knock it with your head. | Crate! Jump up under it. | same | same |
| lagos-1, 2350 | Pothole! Jump over it. | same | same | same |
| lagos-1, 3200 | Wider pothole! Hold {jump} to jump higher. | Wider pothole! Hold {jump}. | Wider pothole! Hold Jump. | Wider pothole! Hold Space. |
| lagos-1, 3500 | Press {jump} again in the air for a second jump. | In the air, press {jump} again. | In the air, press Jump again. | In the air, press Space again. |
| lagos-1, 3880 | Wide pothole! Jump, then jump again in the air. | Wide pothole! Jump twice. | same | same |
| lagos-1, 4400 | Bus stop! If you fall, you start again here. | Bus stop! Now you start here. | same | same |
| lagos-1, 4560 | To jump far, run first. Keep holding {forward}. | To jump far, run first. | same | same |
| lagos-1, 4820 | Big pit! Run, jump, then jump again in the air. | Big pit! Run, then jump twice. | same | same |
| lagos-1, 5350 | Goat! Jump over it, or land on it to bounce. | Goat! Jump over, or bounce on it. | same | same |
| lagos-1, 5950 | Rolling tyre! Jump over it. | same | same | same |
| lagos-1, 6380 (crates) | This crate has food inside. Knock it! | Food in this crate! Knock it. | same | same |
| lagos-1, 10450 | The yellow bus! Get on to finish the street. | Yellow bus! Get on to finish. | same | same |
| lagos-2, 1000 (crates) | Crates hang over stall roofs too. Jump up from the roof. | High crate? Jump from the roof. | same | same |
| lagos-2, 2780 | A well! Stand by it, then press {down}. | A well! Stand by it. Press {down}. | A well! Stand by it. Press Go down. | A well! Stand by it. Press ↓. |
| lagos-2, 5200 | Bus stop! If you fall, you start again here. | Bus stop! Now you start here. | same | same |
| lagos-2, 5450 | Big pit! Run first, then jump twice. | Big pit! Run, then jump twice. | same | same |
| lagos-3, 1350 | Rolling drum! It rolls fast. Jump over it, or land on it to bounce. | Fast rolling drum! Jump over it. | same | same |
| lagos-3, 4600 | Bus stop! If you fall, you start again here. | Bus stop! Now you start here. | same | same |

"Bus stop! Now you start here." is said as the hero reaches the stop: from now on a lost life brings you back here. The goat line still teaches the bounce; the drum line drops it (the goat taught it first), so the drum hint is just "it is fast, jump".

#### What qa checks

1. At every size in the table above, landscape, touch and keys, with and without a home bar: the bar's box is inside its limits (top at or below world y 312, bottom as rule 2, sides as rules 3 and 4). No pixel of the bar overlaps Back, Forward, Jump, Go down, Go up, Sound, Pause, lives, kobo or the food timer.
2. Play every street and the hall at 320 x 240, 568 x 320 and 667 x 375. On every frame a hint or toast shows, no bar pixel overlaps the drawn box of any kobo, food, crate, hazard, boss throw, honk, light, pit or pothole lip, the hero (unless the hero is falling into a pit), the well, the bus, the bus door or the BUS PARK board.
3. Every hint and toast (touch and key words, full or short as the bar width picks) fits inside the bar with no clipping, no "..." and no scroll (scrollHeight not more than clientHeight), at 12 px or the fallback 11 px. Report any that need 11 px.
4. Level data test: every hint in every level file is 35 characters or fewer after the markers are filled in, touch and keys.
5. Art and level rule test: nothing playable or anything the player must react to is drawn below world y 306 (hero feet, hazards, wells, crates' poles, the bus and its wheels sit on y 300; only shadows and the pavement may go lower). Pits are the only thing drawn into the strip, and their lips at y 300 stay in sight.
6. The bar hides when pause opens and does not come back on "Keep playing" for a hint whose time ran out.

## S2.3 Hero choices (R2)

Two new rows: "Male or female" and "Age". Every hero has the same hitbox (14 wide x 44 tall, feet centred), the same speeds, jumps and timings. Only the drawing changes, and every drawing fits inside the same 50 u tall art box, feet on the same spot.

### Bodies

| | Teen | Adult | Elder |
|---|---|---|---|
| Drawn height, feet to top of head (hair and headwear not counted) | 46 u | 50 u | 49 u |
| Shoulder width | 90 percent | 100 percent | 95 percent |
| Arm and leg thickness | 85 percent | 100 percent | 90 percent |
| Head size | 96 percent (a teen's head is big for the body, but not a child's) | 100 percent | 100 percent |
| Face | slightly rounder cheeks, eyes 105 percent | as now | two short smile lines at the outer eye corners |
| Hair colour | own dark colour | own dark colour | grey: base #b9b4ac, shade #8d877e. Under gele or headscarf, a little grey shows at the temple |
| Pose | as now | as now | as now: back straight, same run and jump. Never bent, never shaky. No walking stick in slice 2 |

Male or female, on top of the age:
- Female: shoulders 6 percent narrower than the age's width, hips 6 percent wider, one small lash stroke at the outer corner of each eye, small round stud earrings (#f2b300).
- Male: as the current drawing. Elder male also has a short, neat grey beard along the jaw and chin.
- Both: the same face, same eyes, same smile on every skin tone (part 1's pride check).

Teens wear the same outfits as everyone, drawn at teen size. Nothing looks like a costume.

### Defaults

The first time the builder opens (nothing saved), the picked hero is Adult, Male, skin 3, Low cut, Green jersey. Until the player taps a Hair or an Outfit chip themselves, changing Male or female, or Age, also changes hair and outfit to these first looks. After the player has tapped Hair or Outfit once, these rows never change on their own.

| | Male | Female |
|---|---|---|
| Teen | Low cut, School uniform | Braids, School uniform |
| Adult | Low cut, Green jersey | Braids, Ankara |
| Elder | Low cut, Agbada | Gele, Ankara |

Every hair and every outfit is open to every hero (Q20).

### Builder layout

Order of rows: Male or female, Age, Skin, Hair, Outfit.

- Landscape, screen 421 px tall or more: left column has the live preview (140 x 180) and under it the green button. Right column: heading, then the five rows. Fits without scrolling from about 700 x 421.
- Landscape, 420 px tall or less: same two columns. Left: preview 104 to 120 px wide, button under it, always on screen. Right column scrolls up and down by itself; while more is below, its bottom 24 px fades to the panel colour and a scroll bar shows. Row labels sit above their chips.
- 320 x 240: left column 104 px (preview 104 x 120, button 104 x 56, words on two lines); right column about 182 px wide: heading, then rows. Male or female and Age fit on one line each; Skin wraps to two lines; Hair and Outfit wrap. The panel scrolls; the button never does.
- Upright: as part 1 (preview on top, rows below, button at the bottom), scrolling if needed.
- Targets: swatches 48 x 48, chips at least 44 tall, 8 px apart. The chosen chip has a thick dark ring and a tick (part 1).

Exact words:
- Heading: "Make your hero"
- Row labels: "Male or female", "Age", "Skin", "Hair", "Outfit"
- Chips: "Male", "Female" / "Teen", "Adult", "Elder"
- Button: "Start running"
- Small line: "Your hero is saved on this phone only."
- Old save note (see below), shown at the top of the right column: "New! Pick male or female, and your age."

Where the button goes: if no street is done yet, straight into street 1. Otherwise to the Streets screen.

### Saved look

`gidi-look` gains two numbers at the end: `body` (0 Male, 1 Female) and `age` (0 Teen, 1 Adult, 2 Elder). Lists only ever grow at the end.

A slice 1 look (no `body`, no `age`) still loads: age = Adult, and body is pre-picked as Female if the saved hair is Gele or Headscarf, else Male. The first time that player presses "Play", the builder opens once with the "New!" line, so the player chooses for themselves. After they press "Start running" the look is saved with both numbers and the builder does not open by itself again.

## S2.4 Crates hit from below (R5)

Our own market crate: a small wooden slatted crate (pale wood, darker slats, rope handles), hanging by one rope from a line strung overhead between two wooden poles or between shop fronts, like goods hung outside a shop. Never yellow or gold, no rivets, no "?" or "!", no brick row around it, never floating with nothing holding it.

| Thing | Number |
|---|---|
| Box | 32 wide x 28 tall, x centred |
| Height | bottom edge 96 u above the surface under it: y 204 over the road; roof top minus 96 over a stall roof |
| Rope | from the crate top straight up 60 u to the overhead line |
| Clearance | a standing hero's head (y 256) is 52 u under a road crate. A walking tap jump's head reaches y 186, 18 u past the bottom |

Stamp on the front shows what is inside: a round coin mark = 3 kobo; a corn cob = roasted corn; a cup = garri, sugar and epa; a bowl = amala, gbegiri and ewedu. The stamp is a picture, not colour alone.

Hit rule (one step):
1. The hero is rising (vy < 0).
2. The hero's centre x is within the crate's centre x plus or minus 20 (16 half width plus 4 grace).
3. Last step the head (feet y - 44) was at or below the crate's bottom, and this step it is above it.
4. Then: the head stops. vy becomes +60 (a small push down), the "hold to jump higher" ends, the second jump is still there if unused. The crate opens.
5. If two crates fit, the one whose centre is nearest the hero's centre opens.

From the side and from above the crate is not solid: the hero passes in front of it and it swings a little (8 degrees), nothing else. The hero can never stand on a crate. Amala strength opens a full crate from any side: any touch of the hero's box with the crate's box.

What comes out:
- Kobo crate: 3 kobo count at once. Three coins pop out of the top in a fan (up, and 30 degrees either side), rise 30 u in 0.35 s, then fly to the HUD kobo counter in 0.4 s.
- Food crate: the food pops 24 u above the crate in 0.25 s, then drops straight down at 90 u/s to the surface below (road: centre y 272; roof: roof top minus 28) and waits there, gently bobbing, until taken. It never moves sideways, so it never falls into a pit. It never runs out.
- The crate swings back and forth (12 degrees, easing to 0 over 1.2 s) with a wooden "tok" and a soft rope creak.

Empty state: the lid hangs open and the stamp is still visible, so it reads as "opened", not as a different block. It sways gently (1 degree, 3 s period) like the full ones. Hitting an empty crate gives the "tok" and a small swing, nothing else.

After a lost life: kobo crates stay open (their kobo stay counted); food crates past the restart point fill up again (as foods come back in part 1).

Placement rules (checked by the level test):
1. Bottom exactly 96 u above the surface under its centre.
2. Never over a pit; the centre at least 60 u from a pit edge.
3. No platform within x plus or minus 40 of the centre, except the roof it hangs over.
4. At least 64 u between crate centres; never more than three in a row.
5. Food crates follow the food rules: at least 300 u from a pit, at least 200 u from a hazard's start.
6. No coin inside a crate's box.

## S2.5 The well and its bonus room (R4)

### The well on the street

A village or compound well, our own drawing: a round wall of plastered brick, about 48 u wide and 30 u tall (top at y 270), a wooden frame with a crank on top (up to y 210), a rope and a bucket. Never a pipe, tube, green cylinder or any game's warp. It is scenery: the hero walks in front of it.

Entrance well (`wells[].x`): the bucket hangs above the mouth and a soft down arrow bobs over the crank every 2 s, so it is findable. The arrow hides while the Go down button shows (the button now says the way, and the arrow would sit under it).

Going down:
1. The hero is on the ground with its centre within the well's x plus or minus 20.
2. The "Go down" button appears above the well: its bottom 8 px above the crank top, centred on the well, kept inside the screen and below the top 56 px. On a computer it reads "Go down (↓)". It is a real button (min 56 tall). It stays while the hero stays in that zone and goes when the hero leaves it.
3. Press it (or Down, S, Enter, E). The hero's controls lock, the hero holds the rope, the bucket lowers with crank clicks: 1.2 s, the screen fades to dark in the last 0.4 s. The street is frozen exactly as it was (hazards, timers, foods). Corn and amala timers pause while in the room.
4. Going down is always a choice. No street needs it.

### The room

Data: src/data/levels/lagos-well.json (both Lagos wells use it). Room x runs 0 to 560, so it fits a 560 u screen. If the screen is wider, the camera centres the room and the sides show dark earth. If narrower (under 560), the camera follows the hero, kept inside 0 to 560.

Look: a dry, cool, lamp-lit store room under the ground. Earth-brown walls, three hanging oil lamps that flicker softly, clay pots, woven baskets, wooden plank shelves. Never blue bricks, never any game's underground. No water at all. It is plainly a magic bonus place.

| Thing | Where |
|---|---|
| Floor | y 300, solid from wall to wall. No pits. Walls at x 30 and 530 (`leftLimit` and `rightLimit` in the room file); as on the street, the hero's centre stays 7 u inside them, so between x 37 and 523 |
| Arrive | the bucket lowers at x 60: the hero rides it down the last 60 u in 0.5 s while the screen fades in, then steps off facing right. Toast: "A secret room! Grab the kobo. Stand under the rope to go back up." |
| Shelves (one-way platforms) | [120, 250, 80] (50 high, tap), [250, 200, 90] (100 high, hold), [400, 240, 80] (60 high, tap) |
| Kobo | 14 in rows (floor at 80, over shelf 1, an arc between shelves 1 and 2, over shelf 3, the floor under shelf 3), plus one kobo crate at x 370 (3 kobo): 17 in all |
| The gift | the garri parcel on the middle shelf, centre (295, 176) |
| Exit | a rope and bucket hanging at x 500 |
| Danger | none. No hazards, no pits, no timer |

Music changes to the well tune while in the room.

### The gift: garri parcel (Q19)

A small parcel of garri, sugar and epa wrapped in a leaf and tied with string. Our own drawing.

1. Pick it up by touching it. Toast, in two stages: until N2, "Garri parcel! Keep it safe."; from N2 on, "Garri parcel! Shield for the hall." (The promise is only made once it is true: M2 gives the shield at the hall start and N2 carries the parcel from a street to the hall.) Neither has short words; both wrap on the narrowest bar (S2.2). The HUD shows a small parcel icon and the word "Parcel" next to the kobo count while it is carried (icon only on a tight HUD, S2.10).
2. It does nothing on the street. It is not a shield yet.
3. A lost life keeps it. Game over, "Start again" or leaving the street loses it.
4. Finishing the street (getting on the bus) while carrying it saves it for the state (`parcel: true`).
5. Once a state has a saved parcel, every try at that state's hall starts with the garri shield on. It never stacks: the most is one shield at the start.
6. If the state already has a saved parcel, the room shows 5 kobo on the middle shelf instead of the parcel: one row centred on x 295 at y 176, 24 u apart (x 247 to 343), from `giftIfCarried` in the room file.
7. The hall is beatable without it (S2.7).

### Going up

1. Stand on the floor with the centre within x 500 plus or minus 20. The "Go up" button appears above the bucket ("Go up (Enter)" on a computer). Press it, or Enter or E.
2. The hero holds the rope and rises: 1.0 s, fade to dark, then fade in on the street at the exit well (`wells[].exitX`). The exit well looks the same but has no hanging bucket and no arrow; it cannot be used to go down.
3. The hero appears at exitX + 30, standing, facing right, with 1.0 s of blinking safety. Toast: "Back on the street!"
4. Any woken hazard within 300 u of the exit is removed. The level rule keeps unwoken ones at least 400 u away.
5. The exit well is always before the street's bus stop, so the bus stop is never skipped.
6. The entrance well can be used again; the room remembers what was taken during this play.
7. Hints between the entrance well and the exit well stay quiet after coming up (they would replace "Back on the street!", and the player skipped that stretch). Level rule: never put a hint that teaches something new between a well's x and its exitX; a player who goes down never sees it. Today none does (street 2: none between 2950 and 4100; street 3's drum hint at 1350 is past exitX 1300 and still shows).

Double taps: a Go down or Go up press never also presses a button under it. The button acts on pointerdown and calls preventDefault on its touch events, and for 400 ms after the press every other button ignores tap clicks; keyboard clicks (Enter, Space) are never blocked.

## S2.6 Streets of Lagos (R7, Q16)

World 1 is Lagos: Street 1, Street 2, Street 3, then Go-Slow Hall. Each street is 60 to 120 seconds, has one bus stop checkpoint near the middle, three lives (five in gentle mode), and ends at a bus park where the hero gets on a yellow bus. Real, proud Lagos sights in our own drawings: shop signs, yellow buses, market stalls, vulcanizers, suya spots, buka signs. Made-up shop names only, no brands. The three streets carry real, well-known Lagos area names (Q22, see "Street names" below); nothing else names a real place.

### Street names (Q22: decided by Tp, 8 Nov 2026)

Tp answered Q22 twice: first "We should use popular ones", then, on the first proposal (Surulere, Yaba, Obalende), "We should pick close around Ikeja, Alausa". So all three names come from in and around Ikeja and Alausa. Tp confirmed them in chat on 8 Nov 2026: street 1 Alausa, street 2 Computer Village, street 3 Ikeja (the first picks below). They replace the working names "Your street", "Market road" and "Bus park road". gamedev changes only the `name` field in each level file, nothing else. The guards stay: no government building, crest, flag or official on any street, and no real shop or brand anywhere, including the Computer Village stalls.

| Street | Theme | Name (decided) | Backup | Why | Flag for Tp and po |
|---|---|---|---|---|---|
| 1 (lagos-1.json) | home street, morning | **Alausa** | Ogba | Tp named Alausa. It is a home and office area of Ikeja where people set off to work in the morning, so it fits the morning home street. Ogba is a big home area next to Ikeja, full of family streets; "ogba" is a plain Yoruba word (a garden or fenced yard), not a person. | Alausa: see "Alausa, two checks" below. Ogba: none. |
| 2 (lagos-2.json) | market at midday | **Computer Village** | Opebi | Computer Village in Ikeja is the best-known phone and computer market in Nigeria; every Lagos teen knows it. It matches the street's phone accessories stall, and a busy midday market street with fabric, tailor and pepper stalls beside the phone stalls is a real Lagos sight. The name describes what is sold there, not a person, a faith or a brand. Opebi is the busy shop and office road right next to it. | Computer Village: never a sign, hint or line about fake phones, cheats or "wahala" there; the stalls are honest stalls, shown with pride (Q22 rule 4). Opebi: I do not know where the name comes from; po, please check it before it is ever used. |
| 3 (lagos-3.json) | bus park, evening | **Ikeja** | Ojota | Ikeja's bus stop and the motor park by Ikeja Under Bridge are among the busiest in Lagos: yellow buses, evening crowds, suya smoke, exactly street 3. Ikeja is the name of the old town and of the state capital, not a person. Its traditional ruler takes his title from the town, not the other way round, so the name is not a ruler's title. Ojota motor park, just north of Ikeja, is the mainland's big motor park. | Ojota: I know it only as a place name and do not know its origin; po, please check it before it is ever used. The park at Ojota named after a person is not part of our name. |

**Alausa, two checks** (Tp chose Alausa on 8 Nov 2026; the guards below stay):
1. **Could it be a person or family name?** Alausa is also a Yoruba family name (a surname some people carry). I do not know whether the area was named after a person or a family, or whether the place and the surname just share a word. Under the Q22 rule ("if you are not sure, skip it") the designer would normally skip it. Tp named it and confirmed it, so it stays. If anyone confirms it honours a person or family, use Ogba.
2. **The seat of the Lagos State Government.** "Alausa" is the place where the state government sits, and Lagos people sometimes say "Alausa" to mean the government, the way people say a capital's name. My view: it does not break CLAUDE.md rule 3. Rule 3 is about real people (politicians, officials, their names, faces, parties, colours and logos); a place name is not a person, and no official appears. The risk is a different one: a street of potholes called Alausa could be read as a dig at the government. We guard against that by drawing only an ordinary home street with made-up shop signs: no government building, secretariat, crest, flag, office sign, uniform or official, and no word about government anywhere on the street. The cleared line praises the player and the place and blames no one. With those guards, Alausa is fine to use.

Names left out:
1. **Named after people:** Allen Avenue and Obafemi Awolowo Way (Tp's area, but both honour people), and from the first list Awolowo Road, Herbert Macaulay Way, Adeola Odeku Street, Ahmadu Bello Way, Victoria Island (a queen), Oshodi (said to be named after a 19th-century chief), Tejuosho, Jibowu, Ladipo and Jakande market.
2. **Not sure of the origin:** Maryland (it may come from a person or a faith name), Oregun and Agidingbi (also less known to teens across Lagos).
3. **Not Tp's area now:** Surulere, Yaba and Obalende (first proposal; Tp asked for names around Ikeja and Alausa).
4. **Clashes with a pick:** Ikeja GRA (too close to "Ikeja" on street 3) and "Ikeja Under Bridge" or "Ikeja bus stop" (too long for the cards; "Ikeja" says it).
5. **Faith:** CMS, Ojuelegba.

How the names were checked:
1. **No real people, no faith, no ruler's title.** As above, with the two Alausa checks.
2. **Mock no one.** The name is only where the run happens. The street's problems stay everyday city problems (potholes, goats, rolling tyres and drums), never the people or the place. No area name appears in a hazard, a boss line or a game over line. The fixed look after Lagos is switched on (lamps, signs, bunting) is a party for the place, not proof it was broken.
3. **Spread.** The Q22 rule asked for mainland and island; Tp chose one area instead, so all three are in and around Ikeja on the mainland. That is Tp's call and it is fine: Ikeja is the state capital and everyone in Lagos passes through it. Other Lagos areas (the island, Ikorodu, Badagry, Epe) can come in a later Lagos bonus street.
4. **Length.** Longest name: "Computer Village" (16 characters). See "Fit at 320 px" below.
5. **Spelling.** Exactly as written above, no accent marks, so every phone font shows it. "Computer Village" with both capitals.

**Fit at 320 px** (Streets cards and the Street cleared card; worked out with Arial widths, qa checks on the real phone font in N3):
- Streets cards at 320 x 240 are about 140 x 60 in a 2 x 2 grid. "Street 2: Computer Village" (26 characters) cannot be one line there. So every card shows its words in three lines: "Street 2" (small), then the name in bold, then the one status line. "Computer Village" in bold at 16 px is about 133 px, a squeeze in about 124 px of room, so on the tiny grid the name is 0.9rem (about 120 px) and fits one line. Never cut it with "..." and never let it run off the card; if it ever wraps, it wraps between "Computer" and "Village" and the card grows taller. Wider screens show "Street 2: Computer Village" on one line, as before. Alausa, Ogba, Opebi, Ikeja and Ojota fit anywhere.
- The Street cleared card: see S2.10, "Cleared words for real places".
- The HUD shows no street name, and should not, to keep the one-row rule.

How difficulty rises:

| | Street 1 | Street 2 | Street 3 |
|---|---|---|---|
| New thing | walking, running, crates, the big pit | crates on roofs, the well, hazard then pit | the rolling drum, a secret well behind you, two big pits |
| Big pits | 1 | 1 | 2 |
| Hazards | 7, one at a time | 10, some in pairs | 13, in groups of up to four |
| Hints | 15 | 4 | 2 |

### The street end (every street)

`end.x` is the bus door. A yellow bus is parked from end.x - 40 to end.x + 160 at a bus park with a shelter. `end.wall` is the bus park wall; the hero cannot pass it.

When the hero's centre reaches end.x on the ground (or lands past it): controls lock, all hazards fade out in 0.3 s (nothing can hurt now), the hero hops through the door (0.6 s), the bus gives our "pa-paam" horn and pulls away to the right (1.4 s), the street-cleared jingle plays, and at 2.2 s the Street cleared screen opens. Never a flagpole, never a castle.

### Street 1: Alausa, was "Your street" (src/data/levels/lagos-1.json)

Idea: slice 1's morning street, reworked for walking. You stand still at the start and nothing happens until you move. Teaches one thing at a time: walk and run, jump, hold, crate, pothole, second jump, run-up long jump, goat, tyre, food.

Length: spawn 80 to bus 10600 = 10520 u. 67 s at full run; about 90 s for a first-timer (average 120 u/s with stops).

| Part | x | About | Teaches | What is there |
|---|---|---|---|---|
| Warm up | 80-700 | 0-5 s | walk, run | Fence and parked bus behind the start. Hint at once: "Hold {forward} to walk. Hold on to run." Kobo at 300 and 560 on the road |
| Jump | 700-1880 | 5-15 s | tap, then hold | "Press {jump} to jump." Kobo in the air at 880. Roof at 1150, 50 high (tap). "Hold {jump} down to jump higher." Roof at 1650, 110 high. Solid road under both |
| Crate | 1880-2300 | 15-19 s | hit from below | "A crate! Jump up under it and knock it with your head." Kobo crates at 2000 and 2150 |
| Pothole | 2300-3400 | 19-28 s | potholes | "Pothole! Jump over it." Tap potholes 30, 36, 40 wide at 2450, 2750, 3050. "Wider pothole! Hold {jump} to jump higher." Hold pothole 60 wide at 3300. Kobo over each |
| Second jump | 3400-4300 | 28-36 s | jump again in the air | "Press {jump} again in the air for a second jump." Roof 150 high at 3650 over solid road (practice). "Wide pothole! Jump, then jump again in the air." Wide pothole 100 at 4000, kobo arc |
| Bus stop | 4400 | 36 s | checkpoint | "Bus stop! If you fall, you start again here." |
| Long jump | 4400-5300 | 36-44 s | run-up | "To jump far, run first. Keep holding {forward}." A coin arc on solid road from 4620 to 4824 in the shape of a running double jump (walking gets only half). Clear road 4824 to 5050. "Big pit! Run, jump, then jump again in the air." Big pit 170 wide at 5050, cones on both lips, kobo arc |
| Hazard | 5300-6400 | 44-53 s | goat, tyre | "Goat! Jump over it, or land on it to bounce." Goat at 5700 alone. "Rolling tyre! Jump over it." Tyre at 6250 alone |
| Food | 6400-10000 | 53-83 s | the three foods | "This crate has food inside. Knock it!" Garri crate at 6500; goat at 6900 to spend the shield on. Roasted corn on the road at 7300: fast stretch 7300 to 8670 with kobo, a tap pothole 40 at 7800 and roofs at 7600 (with a kobo crate on it), 8100, 8500; no hazards. Mixed: tyre 8900, hold pothole 60 at 9150. Amala on the road at 9530; goat 9850, tyre 10050, goat 10250 to smash |
| End | 10450-10600 | 87 s | | "The yellow bus! Get on to finish the street." Bus door 10600 |

Kobo: 165 (153 loose, 12 in crates). Well: none (taught in street 2).

Three tries or fewer: before the bus stop only the five potholes can cost a life, each taught alone with a hint, and walking is enough for every one of them. The big pit comes right after the bus stop, so a fall there costs only about 5 s. If qa's first-timers need more than 3 tries, tune in this order: big pit 170 to 160; take out the goat at 6900; hold potholes 60 to 50.

### Street 2: Computer Village, was "Market road" (src/data/levels/lagos-2.json)

Idea: a busy Lagos market road at midday: stalls under big umbrellas, baskets of pepper and tomatoes, cloth stalls, a phone accessories kiosk. Signs (made up): "FABRICS", "PEPPER AND TOMATOES", "PROVISIONS", "PHONE ACCESSORIES", "TAILOR". A well stands in a small yard between two stalls.

Length: spawn 80 to bus 11000 = 10920 u. 70 s at full run, about 91 s typical.

| Part | x | New thing | What is there |
|---|---|---|---|
| Warm up | 80-1000 | | Kobo, a kobo crate at 600 |
| Roof crates | 1000-1900 | crates on roofs | "Crates hang over stall roofs too. Jump up from the roof." Roof at 1100 (60 high) with a kobo crate over it; roof at 1500 (110 high) with a kobo crate over it |
| Potholes | 1900-2800 | | Tap 40 at 2100, hold 60 at 2400, tap 36 at 2700 |
| Well | 2780-2950 | the well | "A well! Stand by it, then press {down}." Entrance well at 2950. Exit well at 4100 |
| Goat then pit | 3000-4100 | hazard then pit (skipped if you take the well) | Goat at 3250, then a wide pothole 100 at 3600 |
| Garri | 4100-5200 | | Garri on the road at 4500 |
| Bus stop | 5200 | | "Bus stop! If you fall, you start again here." |
| Big pit | 5450-5970 | | "Big pit! Run first, then jump twice." Clear road 5300 to 5800, big pit 170 at 5800 |
| Hazards | 6000-7200 | pairs | Goat 6300, tyre 6600, goat 7000 with a roof at 7050 to hop onto |
| Corn | 7300-8670 | | Corn crate at 7300 (corn drops to the road). Tap potholes 40 at 7700 and 36 at 8200, roofs at 7900 (kobo crate over it) and 8450. No hazards |
| Mixed | 8670-9700 | | Tyre 8950, goat 9100, hold pothole 60 at 9300 |
| Amala | 9700-11000 | | Amala on the road at 9700. Goat 9950, tyre 10100, wide pothole 100 at 10300, goat 10650, tyre 10850. Bus door 11000 |

Kobo: 144 (132 loose, 12 in crates), plus 17 in the well room.

### Street 3: Ikeja, was "Bus park road" (src/data/levels/lagos-3.json)

Idea: the road into a big bus park in the evening: orange sky, parked yellow buses, a vulcanizer with tyre piles and old drums, a suya spot with smoke, a battery charging kiosk, a buka. Signs (made up): "VULCANIZER", "SUYA SPOT", "BATTERY CHARGING", "BUKA", "PHONE REPAIRS".

Length: spawn 420 to bus 11500 = 11080 u. 71 s at full run, about 92 s typical.

| Part | x | New thing | What is there |
|---|---|---|---|
| Secret well | 20-420 | back-tracking | The hero starts at 420. The entrance well is behind, at 160, with 3 kobo at 230 leading to it. No hint: it is the street's secret. On a wide screen it peeks in at the left edge at the start; on a 560 u screen it is just out of view. Exit well at 1300 |
| Warm up | 420-1300 | | Kobo crates at 700 and 850, roof at 1000 with a kobo crate over it |
| Drum | 1300-2200 | the rolling drum | "Rolling drum! It rolls fast. Jump over it, or land on it to bounce." Drum at 1800 alone |
| Potholes | 2200-3400 | | Tap 40 at 2300, wide 100 at 2700, hold 60 at 3300 |
| Group | 3400-4500 | three in a row | Roof at 3550, goat 3700, tyre 3950, drum 4250 |
| Bus stop | 4600 | | "Bus stop! If you fall, you start again here." |
| Big pit 1 | 4600-5470 | | Garri crate at 4900, clear road 5000 to 5300, big pit 170 at 5300 |
| Between | 5470-6700 | | Goat 5900, drum 6300, roof at 6350 |
| Big pit 2 | 6700-7170 | | Clear road 6700 to 7000, big pit 170 at 7000 |
| Corn | 7500-8870 | | Corn crate at 7500. Tap 40 at 8100, hold 60 at 8600, roof at 8300 with a kobo crate. No hazards |
| Mixed | 8870-9900 | | Tyre 9100, goat 9300, drum 9550, roof at 9700 |
| Amala | 9950-11500 | | Amala on the road at 9950. Drum 10200, tyre 10350, goat 10500, drum 10650, wide pothole 100 at 10900. Bus door 11500 |

Kobo: 129 (117 loose, 12 in crates), plus 17 in the well room.

### The rolling drum (new hazard, street 3)

An empty, plain oil drum (no writing, no brand) rolling left from the vulcanizer.

| | Number |
|---|---|
| Box | 26 wide x 30 tall, feet on the road |
| Speed | 84 u/s, rolling left (tyre is 60) |
| Rules | as the tyre: wakes like any hazard, drops into potholes, land on it to bounce (vy -480), it then rolls into a sparkle (0.3 s); amala smashes it (+2 kobo); any other touch hurts |
| Placing | never within 1370 u after a corn; at least 200 u from a pit; first one alone with a hint |

Not colour alone: the drum is taller and has ridges, the tyre is round and black with a tread.

### Level data format (schema 2, for gamedev)

Street files keep every slice 1 field that is not listed as removed, and add:

| Field | Shape | Meaning |
|---|---|---|
| `schema` | 2 | The format. A file without it is slice 1 format |
| `type` | "street", "room" or "hall" | Which shape follows |
| `state`, `street` | "lagos", 1 | Where it sits in the save |
| `theme` | "morning", "market", "evening" | Which backdrop art draws |
| `walkSpeed`, `cornWalkSpeed` | 90, 120 | Walk speeds (`runSpeed` and `cornSpeed` stay) |
| `startWall` | x | The start fence. Hero limit startWall + 7 |
| `crates` | [centreX, bottomY, contents] | contents: "kobo" (3 kobo), "corn", "garri", "amala" |
| `wells` | [{ "x", "exitX", "room" }] | Entrance x, exit x, room file id. May be empty |
| `end` | { "x", "wall" } | Bus door x; bus park wall x |
| `hazards` | [kind, x] | kind adds "drum" |
| `hazardSpeeds` | { goat, tyre, drum } | adds drum 84 |
| `hints` | [x, words] | words may hold {forward}, {back}, {jump}, {down} |

Removed from street files: `arena` and `boss` (they move to the hall file). `foods` stays for food lying on the road.

Room file (`type: "room"`): `width`, `leftLimit`, `rightLimit`, `entryX`, `exitX`, `groundY`, `koboSpacing`, `platforms`, `kobo`, `crates`, `gift` [x, centreY, "parcel"], `giftIfCarried` [x, centreY, count of kobo shown instead].

Hall file (`type: "hall"`): `width`, `spawnX`, `leftLimit`, `rightLimit`, `groundY`, and `boss` with `kind`, `x` (heap bottom centre), `throwX`, `drainX`, `startDelay`, `lights`, `breakAfterHit`, `phases` (each: `every`, `speed`, `pattern`, `bpm`), `honkY`, `highHonkY`, `honkSpeed`. Pattern items: "tyre", "honk", "highHonk".

Files: src/data/levels/lagos-1.json, lagos-2.json, lagos-3.json, lagos-well.json, lagos-hall.json. w1-l1.json is the slice 1 level; gamedev retires it once lagos-1 and lagos-hall replace it (its tests move to the new files).

A level test should check every rule in this part: pit kinds and widths, run-up before big pits, hazard distances from pits and exit wells, no drum or tyre in a corn stretch, crate heights and spacing, food distances, hints at least 120 u apart, spawn, bus stop, wells and bus door on solid road.

## S2.7 Go-Slow Hall (R6)

Who: a player who has finished Lagos street 3 (or replays it).

The place: our own building that tells you about the problem. A huge roofed indoor motor park: steel roof beams, a row of 8 roof lamps (dark at first), painted lane lines and arrows on a concrete floor, a door on the left where the hero came in, big closed doors on the right behind the jam, a line of traffic cones in front of the jam, a floor drain grate by the left wall. On the inside wall, over the left door, a sign "GO-SLOW HALL" (inside, because that is the wall the player sees; po M4 note). No domes, towers, steeples, crosses, crescents, carved figures, masquerades or any faith's sign; not a real building. The word "temple" is never used.

### Layout (src/data/levels/lagos-hall.json)

Hall x runs 0 to 560, so all of it shows on every landscape screen (560 u is the narrowest). Wider screens centre the hall; the sides show the outside walls. Floor y 300, solid, no pits.

| Thing | x | Notes |
|---|---|---|
| Hero start | 50 | Walks in through the left door, standing, facing right |
| Left wall | hero limit 30 | Drain grate at x 0 to 20 |
| Cone line | hero limit 400 | The hero cannot pass the cones. Touching the cones or the jam never hurts |
| The jam (General Go-Slow) | heap bottom centre 500, about 440 to 560 | Same boss art as slice 1: a heap of stuck cars and buses under one grumpy traffic light with a face. Throws come out of a gap at the heap's foot, x 470 |
| Left light | [60, 240, 90] | 60 above the floor: a tap |
| Middle light | [190, 180, 90] | 120 above: a full hold, or a tap from the right light |
| Right light | [310, 210, 90] | 90 above: a hold |

The lights are one-way platforms all fight long, lit or not (part 1). Unlit: dark grey, no arrow. Lit: green, a bouncing down arrow and the word "GO".

### The rule and the timeline

Same rule as part 1: land on the lit green light from above three times. Order: left, right, middle.

- t = 0: the hero is inside. If the state has a parcel: shield on, toast "Your garri parcel: the shield is on!". Then toast "General Go-Slow is jamming the hall! Jump onto the green light." The left light comes on. The player can move straight away.
- First throw at t = `startDelay` (2.0 s), then one every `every` seconds.
- A hit: as part 1 (bounce vy -480, the light goes dark, one car drives off through the right doors, the heap shakes and honks crossly for 0.8 s, all throws pop into dust, no throws for 1.5 s, then the next light comes on and the pattern starts again). Toasts "Green light! 2 more." and "Green light! 1 more." Hit counter: three circles that fill with a tick.
- Before the third phase starts, toast: "PEEP! High honks fly high. Stay low on the floor."

| Phase | Lit light | Throw every | Tyre speed | Pattern (repeats) | Hall music |
|---|---|---|---|---|---|
| Before any hit | left | 2.2 s | 156 u/s | tyre | 128 BPM |
| After hit 1 | right | 1.8 s | 192 u/s | tyre, tyre, honk | 134 BPM, adds shaker |
| After hit 2 | middle | 1.4 s | 228 u/s | tyre, honk, tyre, high honk | 140 BPM, adds second horn |

Throws (each one shown first by the boss's 0.4 s attack pose and honk marks):
- Tyre: rolls out at x 470 to the left at the phase speed, 20 x 22 box. At the left wall it drops into the drain grate and is gone. Jump it or land on it (bounce, sparkle).
- Honk (low): the slice 1 "POOO!" cloud, centre y 236 (box y 226 to 246), 120 u/s left, fades at the left wall.
- High honk (new): a long thin cloud with the word "PEEP!", centre y 170 (box 36 x 20, y 160 to 180), 120 u/s left. It hits a hero standing on the middle or right light, or jumping high. A hero on the floor (head at y 256) or on the left light (head at y 196) is safe from it.

Safe places (not safe forever: something always comes):

| Where the hero stands | Tyre | Low honk | High honk |
|---|---|---|---|
| Floor | jump it | safe (passes 10 u over the head) | safe |
| Left light | safe | hurts | safe |
| Right light | safe | safe | hurts |
| Middle light | safe | safe | hurts |

How player movement changes the fight:
1. No running by itself and no turn points (part 1's turnLeftX and turnRightX go). The player walks or runs anywhere from x 30 to 400.
2. Standing still is allowed. Throws come to the player, so standing still means jumping each tyre in place.
3. The hall is short, so run-ups do not matter here; every light is reachable from a walk.
4. A hero at the cone line (x 400) is at least 53 u from a new tyre, plus the 0.4 s attack warning.
5. Phase 3's high honk means no light is a place to wait forever: the floor is safe from both honks but never from tyres.

What hurts: a tyre from the side or below, any touch with either honk. A life and 1.7 s blinking safety, or the shield. Amala is not in the hall. Out of lives: Game over; "Play again" restarts the hall only, never the streets.

### The funny, kind finish

From the third hit:
- 0 s: all throws pop into dust. The hero stands and cannot be hurt.
- 0 to 1.4 s: the light blinks yellow and sighs.
- 1.4 s: it turns green, smiles and waves its pole.
- 1.6 s, 2.05 s, 2.5 s: the last cars honk a happy "pom pom" and drive out through the right doors, which swing open.
- 2.5 s: toast "Green light! The hall is clear!"
- 3.0 s to 4.2 s: the 8 roof lamps come on one by one (0.15 s apart, each with a click and a soft hum), the cones slide aside, the floor arrows light up.
- 4.5 s: toast "Lagos is switched on!" The win tune plays.
- 6.0 s: the Win screen.

Nobody is hurt; the jam just gives up and drives home.

Three tries: the hall alone should be beatable in three tries by a player who finished street 3. If not, tune in this order: every 2.2/1.8/1.4 to 2.4/2.0/1.6; take the high honk out of phase 3 (pattern tyre, honk, tyre); lower the middle light to 190.

## S2.8 Progress, the Streets screen and Nigeria's wheel (R0, Q17)

### Unlocking

Street 1 is always open. Street 2 opens when street 1 is done, street 3 when street 2 is done, Go-Slow Hall when street 3 is done. Any done street or hall can be played again at any time. Lagos is "switched on" when the hall is done.

After Lagos is switched on, its streets draw in their fixed look: street lamps lit, shop signs lit, bunting across the road, smoother road paint. Same layout, same play.

### Save shape

New key `gidi-progress`, one JSON value:

```json
{
  "v": 1,
  "states": {
    "lagos": {
      "streets": { "1": { "done": true, "best": 120 }, "2": { "done": false, "best": 0 } },
      "parcel": true,
      "hall": { "done": false, "best": 0 }
    }
  }
}
```

- `best` is the most kobo ever finished with. Streets missing from `streets` are not done.
- Written only when a street is finished (bus boarded), when the hall is won, and when the parcel is saved. Never in the middle of a street.
- Unknown states and unknown fields are kept as they are when saving (merge, never overwrite), so later regions and later versions add to it safely.
- If it cannot be read (broken JSON or wrong shape), the game starts with nothing done and does not write over the broken copy until the player finishes a street.
- New key `gidi-music` (true or false, default true).
- Slice 1 keys `gidi-look`, `gidi-sound`, `gidi-gentle` load unchanged (look: see S2.3). Slice 1 saved no progress, so a slice 1 player starts at street 1 with their hero and settings.

Save keys list for storage.ts: gidi-look, gidi-sound, gidi-music, gidi-gentle, gidi-progress.

### Nigeria's wheel

A big round wheel with a hub in the middle and 37 small cogs around its rim: one for each state and one for the FCT, in A to Z order clockwise from the top: Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara.

- Every cog starts the same: grey, still. A working cog turns slowly, is warm amber with a white tick on it, and its name shows beside it. Not colour alone: turning plus the tick plus the name.
- When all 37 work, the hub turns too (not in version 1).
- Colours are the game's own warm colours, never a party's. Green and white together for Nigeria is fine.
- The cogs are a picture, not buttons. A list for screen readers says each name and "working" or "not working yet".

### The wheel screen on every size (fit rule, N2)

The problem (art N1, docs/assets.md): the names point out like spokes, so their size is fixed by the wheel's size. Name height in px = wheel side in px / 25.75 (16 units in a 412-unit picture). In the N1 mock, with the words beside it in a card, the wheel is 190 px at 320 x 240 (names 7.4 px).

**Chosen: the wheel fills the screen's height, the words go in a rail beside it, and one button, "All names", opens a big readable list of every name.** The same layout on every landscape size, so gamedev builds one screen and qa tests one screen.

Why this one:
- Full height is the biggest the wheel can be on a short screen. Every name stays on it, all the same size.
- On the tiniest screens the names on the wheel are small (8.5 px at 320 x 240), so they count as part of the picture there. The readable copy of every name is the list, one tap away, 14 px, A to Z, the working ones ticked. Every name is in the list, none first except by A to Z. So yes, about 8 px is fine on the wheel because the list is always one tap away. The "All names" button is never hidden, at any size.
- Not chosen: a line of words above or below the wheel (takes height from the wheel, names drop to about 7.6 px); an info button for the words only (the names stay hard to read); pinch to zoom (a hidden two-finger move many 10 year olds will not find, fights the browser's own zoom, and needs gesture code; one tap to a list does the same job); a list only when names are too small (two layouts to build and test, and the screen changes shape between phones).

**Sizes.** SW and SH are the screen's width and height inside the safe area (notches), in CSS px.

1. Wheel side W = the smallest of (SH - 8), (SW - 100) and 560, rounded down to a whole px. The wheel box is square (wheelSvg needs that), 4 px from the left edge, centred top to bottom.
2. Rail: starts 8 px right of the wheel, ends 8 px from the right edge, at most 360 px wide (R = the smaller of SW - W - 20 and 360). When R hits 360, the wheel and rail sit together in the middle of the screen. Rail contents are centred top to bottom.
3. Phone upright (SH more than SW; only on menus, play shows "Turn phone"): wheel on top, W = the smallest of (SW - 16), (SH - 200) and 560, centred; the rail goes under it at full width, wide-rail words.
4. No card border or padding around the wheel; the cream card fills the screen. The page never scrolls.

| Screen | W | Names on the wheel | R | Rail |
|---|---|---|---|---|
| 320 x 240 | 220 | 8.5 px | 80 | narrow |
| 640 x 200 | 192 | 7.5 px | 360 (wheel and rail centred) | wide |
| 568 x 320 | 312 | 12.1 px | 236 | wide |
| 932 x 430 | 422 | 16.4 px | 360 (centred) | wide |
| 1280 x 720 | 560 | 21.7 px | 360 (centred) | wide |

**Wide rail (R 200 px or more).** Top to bottom, 12 px apart (8 px if it would not fit otherwise):
- "Nigeria's wheel", bold 20 px.
- "Every state is a part of Nigeria Company. Fix a state's problems and its cog starts turning." 15 px, line height 1.3.
- "{n} of 37 cogs turning." in bold, then on the same line "Fix Lagos to turn the first cog." (n is 0) or "More states are coming soon." (n is 1 or more). 15 px.
- One row of two buttons, 8 px apart, each at least 44 px tall: "All names" and "Back".
- Checked: at 568 x 320 this is about 202 px tall in a 312 px rail; at 640 x 200 about 157 px in 192 px. Text never shrinks below 15 px. If a big system font still makes it too tall, the rail (only the rail) scrolls.

**Narrow rail (R under 200 px, so 320 x 240 and similar).** R is 80 px. Top to bottom, 8 px apart, centred:
- "Nigeria's wheel", bold 14 px, wraps to two lines ("Nigeria's" / "wheel").
- "{n} of 37", bold 16 px, one line.
- "cogs turning", 12 px, may wrap to two lines.
- Button "All names", the full rail width (80) x 44 px, bold 13 px, one line.
- Button "Back", 80 x 44 px.
- About 196 px tall in a 232 px rail. The long sentence and the "Fix Lagos" / "More states" line move into the list (below); they are still on this screen for screen readers.

**The "All names" list.** Tapping "All names", or tapping the wheel picture itself, opens the list over the whole screen (same cream card).
- Top row, 8 px from the top: heading "All 36 states and the FCT" (bold 16 px; 14 px if it does not fit one line) on the left, button "Close" (at least 72 x 44) on the right.
- Under it, from 60 px down to 8 px above the bottom, one box that scrolls up and down if it has to. Only this box scrolls, never the page, with a visible scroll bar and a soft fade at the bottom edge while there is more below. In it:
  1. "Every state is a part of Nigeria Company. Fix a state's problems and its cog starts turning." (14 px)
  2. "{n} of 37 cogs turning." and the "Fix Lagos to turn the first cog." / "More states are coming soon." line (14 px).
  3. "✓ means its cog is turning." (14 px)
  4. The 37 names, A to Z, 14 px, rows 20 px tall, in columns at least 100 px wide with 8 px between them, read top to bottom then the next column. A working name has a ✓ before it and is bold in dark ink. A name not working yet has no tick, is indented by the tick's width so all names line up, and is in the wheel's name grey (#5d574b on cream, about 7 to 1). Never colour alone: tick plus bold.
- Fits with no scrolling at 568 x 320 (5 columns of 8 rows) and 932 x 430. Scrolls inside the box at 320 x 240 (2 columns) and 640 x 200.
- "Close" or the Esc key goes back to the wheel and puts focus back on "All names". Opening puts focus on the heading. "Back" on the wheel still goes to Streets (S2.10 flow).

**Screen readers.** The wheel picture stays hidden from them (aria-hidden). There is one list in the page, used both ways: on the wheel view it is visually hidden but read after the count line, and in the "All names" view it is shown. Each item reads "Lagos, working" or "Abia, not working yet" (the ✓ is hidden from them, the words ", working" and ", not working yet" are hidden from sight). The long sentence and the "Fix Lagos" / "More states" line are always in the page for screen readers, also at 320 x 240.

**qa checks (N3):** at 320 x 240, 640 x 200, 568 x 320 and 932 x 430, with 0, 1 and 37 cogs working: all 37 names drawn on the wheel, all the same size, none clipped by the screen edge; the page never scrolls; every button at least 44 x 44 and 8 px apart; "All names" in sight; the list shows all 37 names and only its box scrolls; screen readers hear all 37 with their state.

## S2.9 Music (R1)

All tunes are made in code with WebAudio, like the sound effects: no music files, a few KB of notes. Our own tunes only. Nothing from any game, advert, anthem, hymn, chant, party song or known Nigerian song. qa checks each one against well-known game music first (Mario and other Nintendo music) and then well-known Nigerian songs.

Instruments (all built from oscillators and filtered noise): bass (triangle, low-pass 600 Hz); highlife guitar pluck (two slightly detuned square waves, low-pass 1800 Hz, 0.25 s fall); agogo bell (two sines at 1 : 2.7, 0.12 s); shekere (high-passed hiss, 0.05 s); talking drum (sine bending up then settling, as our jump sound); kalimba (sine plus a soft third partial, 0.6 s fall); horn stab (sawtooth, low-pass 1200 Hz, 0.2 s). At most 6 notes sounding at once.

| Place | Mood | Tempo | Key and chords | Length | Plays |
|---|---|---|---|---|---|
| Title, builder, Streets, wheel | warm, welcoming | 96 BPM | the street tune with bass and guitar only | 16 bars, about 40 s | loops, at 70 percent of music volume |
| Streets | bright, busy, walking-to-work highlife | 108 (street 1), 112 (street 2), 116 (street 3, adds a second agogo line) | G major. A: G, C, D, G (2 bars each). B: Em, C, D, D | 16 bars, about 34 to 36 s | loops |
| Well room | cosy, secret, calm | 84 BPM | A minor pentatonic kalimba over a soft low A drone. Am, G, F, G | 8 bars, about 23 s | loops |
| Go-Slow Hall | tense but funny, honky | 128, 134, 140 BPM (one step per hit) | E minor. Em, Em, C, B. Bass walks a steady eighth-note line; horn stabs answer on beats 2 and 4 | 8 bars, about 14 to 15 s | loops; changes tempo at the next bar after a hit |
| Street cleared | happy, short | 120 BPM | our bus horn, then a 4-note guitar figure ending on G | about 2.5 s | once |
| Win (hall) | proud celebration | 120 BPM | a guitar run up the G major scale, an agogo flourish, a talking-drum "pom pom", ending on a full G chord | about 5 s | once, then quiet |
| Game over | | | the existing gameOver sound; music stops | | |

Art writes the melodies within these chords; a melody must not follow any known tune's opening. Kept as data (notes per 16th step), so qa can read them.

Rules:
1. Music is about a third as loud as the sound effects (music gain 0.3, effects 1.0).
2. Changing place: the old tune fades out in 0.3 s, 0.2 s of quiet, the new tune starts on a bar line.
3. Music starts only after the first tap or key.
4. Music stops when the game pauses (pause screen, phone upright, tab hidden, app switched, a call) and carries on from the same bar when play goes on.
5. "Music: on / off" is its own switch, separate from "Sound: on / off", on the title screen and the pause screen, and the M key. Remembered as `gidi-music`. Music off means no tune anywhere; sound effects follow only the Sound switch.
6. The game never waits for music to start. Notes are scheduled 0.1 s ahead, checked every 25 ms.

## S2.10 Screens and words (slice 2)

Every button at least 44 x 44 px (the in-play buttons at least 56). Screens that open during play ignore taps for their first 0.4 s (part 1). Gentle mode is unchanged: "Gentle mode: 5 lives instead of 3" on the title and game over screens, and it changes only the number of lives.

| Screen | Who sees it | One job | Exact words |
|---|---|---|---|
| Title | Everyone who opens the game | Start playing | "Gbese!" "Fix the streets. Get Nigeria working." Big button "Make your hero" (no hero saved) or "Play" (hero saved). Smaller: "Change hero", "Nigeria's wheel", "Credits", "Sound: on" / "Sound: off", "Music: on" / "Music: off", "Gentle mode: 5 lives instead of 3". How to play: the touch or key words in S2.2 |
| Hero builder | First-time players, and anyone changing their look | Pick a look | See S2.3 |
| Streets | A player who pressed "Play" with at least one street done, or "Streets" anywhere | Pick where to play | Heading "Lagos". Line "Fix 3 streets, then clear Go-Slow Hall." Four cards: "Street 1: Alausa", "Street 2: Computer Village", "Street 3: Ikeja", "Go-Slow Hall" (names decided by Tp, 8 Nov 2026, S2.6 "Street names"; they replace "Your street", "Market road" and "Bus park road"; on the 320 x 240 grid "Street 2" sits small above the bold name, S2.6 "Fit at 320 px"). Under each name one line: done: "Done ✓ Best: {best} kobo"; open, not done: "Ready to play"; locked: a padlock and "Finish street {n} first" (hall: "Finish street 3 first"). On the hall card, if a parcel is saved: "You have a garri parcel." Buttons "Nigeria's wheel", "Home" |
| Nigeria's wheel | Anyone who taps "Nigeria's wheel" | Show how much of Nigeria is working | Heading "Nigeria's wheel". "Every state is a part of Nigeria Company. Fix a state's problems and its cog starts turning." Then "{n} of 37 cogs turning." When n is 0: "Fix Lagos to turn the first cog." When n is 1 or more: "More states are coming soon." Buttons "All names", "Back". The "All names" list: heading "All 36 states and the FCT", "✓ means its cog is turning.", the 37 names, button "Close". On narrow screens the rail says "Nigeria's wheel", "{n} of 37", "cogs turning" and the long lines move into the list. Layout and sizes: S2.8 "The wheel screen on every size" |
| HUD (in play) | The player | Show lives, kobo, food, parcel | "♥ 3", "Kobo 12", food slot (part 1), parcel icon and "Parcel" when carried. In the hall, the three hit circles, and no Kobo chip (nothing to collect there; po M4 note), so the hall row is lives, shield and the hit circles. Top right: sound, pause (spoken "Sound", "Pause"). Bottom: Back, Forward, Jump (S2.2). One row always: see "The HUD row" below |
| Well button | A player standing at a well, or under the room's rope | Go down or up | "Go down" / "Go up". On a computer: "Go down (↓)" / "Go up (Enter)" |
| Pause | A player who pressed pause, left the app, or turned the phone upright | Get back to playing | "Paused". Buttons "Keep playing", "Start again", "Streets", "Home". Switches "Sound: on" / "Sound: off", "Music: on" / "Music: off". Tapping outside the buttons does nothing |
| Turn phone | A player holding the phone upright in play | Get the phone sideways | "Turn your phone sideways to play." (part 1) |
| Street cleared | A player who got on the bus | Celebrate, then go on | "Street cleared!" "{street name} is moving again, thanks to you! You got {kobo} kobo." (decided by Tp in chat, 8 Nov 2026; replaces "{street name} is fixed. You got {kobo} kobo.", see "Cleared words for real places" below) If carrying the parcel: "Your garri parcel is saved for Go-Slow Hall." Big button "Next street" (after street 3: "Go to Go-Slow Hall"). Small "Play again", "Streets" |
| Game over (street) | A player who lost the last life on a street | Try again | "Out of lives". "You got {kobo} kobo. The street is still here. Try again!" Button "Play again". If gentle mode is off: "Want more tries? Gentle mode gives you 5 lives." with the switch. Small "Streets", "Home" |
| Game over (hall) | A player who lost the last life in the hall | Try again | "Out of lives". "General Go-Slow is still jamming the hall. Try again!" Same buttons and gentle offer as above |
| Win | A player who cleared Go-Slow Hall | Celebrate Lagos switching on | "Lagos is switched on!" "You cleared General Go-Slow with {lives} lives left." ("1 life left" when one. No kobo here: the hall has none to collect, and kobo lives on the Street cleared screen and the Streets cards; po M4 note.) "Lagos's cog is turning: {n} of 37." "More of Nigeria is coming soon." Big button "See Nigeria's wheel". Small "Play again", "Streets" |
| Credits | Anyone who taps "Credits" | Say who made it | "Credits". "Made by CoachNaz." "Every picture, sound and tune is our own." Button "Back" |

### Cleared words for real places (Q22: decided by Tp in chat, 8 Nov 2026)

With real names, "Ikeja is fixed." reads as if the place itself was broken. The street cleared line must praise the place and the player, and blame no one.

**Decided line: "{street name} is moving again, thanks to you! You got {kobo} kobo."** Tp chose it in chat on 8 Nov 2026 ("It is moving again"). Example: "Ikeja is moving again, thanks to you! You got 113 kobo." It praises the player and says the go-slow is gone, without saying the place was bad. It replaces "{street name} is fixed. You got {kobo} kobo."

Not used: "You cleared the road in {street name}. Great run!" (the designer's first pick; Tp chose the line above). "{street name} is switched on!" is kept for a whole state ("Lagos is switched on!") so the win screen stays special. "is fixed", "is saved", "beaten", "won": each makes the place the problem or the enemy.

Fit at 320 px. This is a line on the Street cleared card, not a toast, so the hint bar's 35-character toast rule (S2.2) does not apply; it must never be shown as a toast. At 320 px the card has about 272 px for words (16 px text).
- Longest case, "Computer Village" and 3-digit kobo: 66 characters; the first sentence is 48. It wraps to two lines: "Computer Village is moving again," / "thanks to you! You got 113 kobo."
- Short names (Alausa, Ikeja, Ogba, Opebi, Ojota; 54 to 56 characters with 3-digit kobo) also take two lines, for example "Ikeja is moving again, thanks to you!" / "You got 113 kobo."; Alausa breaks after "thanks to".
- So the line is two lines on the narrowest card, never three. With the "Street cleared!" heading, the parcel line ("Your garri parcel is saved for Go-Slow Hall.", two lines at 320 px), the big button and the small buttons in one row, the card must fit 320 x 240 without scrolling (N2's card layout fix, po M4 note). qa checks with "Computer Village", 3-digit kobo and the parcel line on, in N3.

Plain words a 10 year old reads. Go-Slow Hall has no cleared line (its win screen is "Lagos is switched on!"). gamedev changes one string in src/screens/words.ts (cleared text) in N2.

### The HUD row

The HUD is one row, inside the top 56 px, at every width down to 320 px, with every chip shown (lives, kobo, parcel, shield, corn or amala). Never a second row: a second row would sit under the Go up button and the room's high kobo. Sound and Pause never wrap and never shrink below 44 x 44 px. When the chips do not fit, the left side steps down, one step at a time, only as far as it needs (code: src/screens/hud.ts, HUD_TIGHT and Hud.fit; src/screens/screens.css, .hud-tight, .hud-tighter, .hud-tightest):

| Step | What changes | Example, every chip shown |
|---|---|---|
| 0 | Full words in dark chip boxes | "♥ 3" "Kobo 12" [parcel] "Parcel" [bowl] "Shield" [corn] "Fast 5" |
| 1 | The parcel, shield and food chips show only their icon; food keeps its seconds. Less padding inside and between chips | "♥ 3" "Kobo 12" [parcel] [bowl] [corn] "5" |
| 2 | Words, icons and gaps all get smaller (icons 24 px), and the HUD's side margins shrink | as step 1, smaller |
| 3 | No chip boxes (the words keep their dark edge so they read on the sky), icons 20 px, and a coin icon replaces the word "Kobo" | "♥ 3" [coin] "12" [parcel] [bowl] [corn] "5" |

Screen readers read the full words at every step ("Lives: 3", "Kobo 12", "Parcel", "Shield", "Fast 5"): the hidden words stay in the page, only hidden from sight. Never colour alone: each chip is its own icon shape. The HUD fits again (and can step back up) when the screen size changes or a chip comes or goes.

In Go-Slow Hall the Kobo chip is not shown (nothing to collect there; po M4 note). The hall row is lives, the shield chip when on, and the three hit circles. At every width down to 320 px no chip ever covers the hit circles.

320 x 240 fits: Streets puts the four cards in a 2 x 2 grid (each about 140 x 60), heading and line on one row each, the two small buttons in one row. Pause puts its four buttons in a 2 x 2 grid and the two switches in one row.

"Start again" restarts the current street (or the hall) from its beginning with full lives and 0 kobo. "Streets" and "Home" leave without saving anything from the street.

Flow: Title "Play" goes straight into street 1 if no street is done yet, else to Streets. A card starts that street or the hall. Street cleared "Next street" starts the next one. Win "See Nigeria's wheel" opens the wheel, and its "Back" goes to Streets.

Toasts and hints in one place (all also in the level files or in S2.5 and S2.7): "A secret room! Grab the kobo. Stand under the rope to go back up." / "Garri parcel! Keep it safe." (until N2) / "Garri parcel! Shield for the hall." (from N2 on; N2 makes the switch) / "Back on the street!" / "Your garri parcel: the shield is on!" / "General Go-Slow is jamming the hall! Jump onto the green light." / "Green light! 2 more." / "Green light! 1 more." / "PEEP! High honks fly high. Stay low on the floor." / "Green light! The hall is clear!" / "Lagos is switched on!" Part 1's food toasts stay. All of them show in the hint bar (S2.2, "The hint bar"); the long ones have short words there for narrow bars.

## S2.11 Accessibility check (slice 2)

1. Targets: in-play buttons at least 56 px, menus at least 44 px, 8 px or more apart. The direction and jump touch areas are much bigger than the drawings.
2. Sound and music each have their own off switch, remembered on the phone.
3. Never colour alone: pressed buttons shrink, the lit light says "GO" with an arrow, big pits have cones, crates carry picture stamps, the drum and tyre have different shapes, done streets have a tick and words, working cogs turn and carry a tick and a name, the two honks have different shapes and words.
4. Gentle mode: 5 lives on every street and in the hall. No auto-run (Q18); revisit after testing.
5. No time limits anywhere; the hero waits for the player.
6. Reduced motion (`prefers-reduced-motion`): the well room camera snaps (no ease), no wheel spin (the tick and name stay), no crate sway, no lamp flicker or rope sway in the room. The street camera keeps its ease, on purpose: the street must scroll to be played at all, the 10 percent follow is the smoothest way to do it, and snapping it would make each look switch (S2.2 Camera, rule 2) throw the whole street about 40 percent of the screen in one frame, which is harder to follow and more jarring than the ease.
8. Screen readers hear the full HUD words at every HUD step (S2.10, "The HUD row").
7. Hints and toasts never hide anything: they show in the hint bar in the bottom pavement strip, never over kobo, food, crates, hazards, pit lips, the bus, the hero, the buttons or the HUD (S2.2, "The hint bar"). Every level hint is 35 characters or fewer.

## S2.12 What art must make (for pm)

Pictures (all drawn in code, as now):
1. Controls: Back and Forward circles, Jump pill with the word "Jump", each with a pressed look; "Go down" and "Go up" pills with a bucket and arrow.
2. Hero bodies: Male and Female, each as Teen, Adult and Elder (S2.3 table): grey hair for every hair style on elders, elder male beard, female lashes and studs. Poses: stand facing either way, walk (slower leg swing than the run), run with a slight lean and start-of-run dust puff, skid when turning, hold the rope (going down and up). The builder preview uses the same drawing.
3. Crates: wooden crate with four stamps (coin, corn cob, cup, bowl), the rope and overhead line on two poles, the hit swing, the open empty crate, the kobo fan, the food pop.
4. Well: entrance well (plastered round wall, wooden frame, crank, rope, bucket, bobbing down arrow), exit well (no bucket, no arrow), bucket lowering and rising, the fade.
5. Well room: earth walls, three flickering oil lamps, clay pots, woven baskets, plank shelves, the exit rope and bucket, dark earth beyond the walls for wide screens.
6. Garri parcel (leaf wrap, string) and its small HUD icon.
7. Rolling drum (plain, ridged, no writing): rolling, bounce sparkle, smash.
8. Big pit cones (orange and white, two per lip).
9. Street backdrops (the streets are named Alausa, Computer Village and Ikeja, decided by Tp on 8 Nov 2026, S2.6; no government building, crest, flag or office on any street, and no real shop or brand on the Computer Village stalls; the drawings stay our own, with made-up signs, never a copy of a real building or landmark): Computer Village, was Market road (midday, umbrellas, pepper and tomato baskets, cloth stalls, made-up signs as listed) and Ikeja, was Bus park road (evening sky, parked yellow buses, vulcanizer with tyre piles and drums, suya smoke, made-up signs as listed). Alausa, was Your street, stays as slice 1.
10. The fixed look for each street (lamps lit, signs lit, bunting, fresh road paint).
11. Start of street: fence and a parked yellow bus. End of street: bus park with shelter, wall, and the yellow bus with an opening door; hero hop-in and bus pull-away.
12. The 60 u pavement and gutter strip under every scene, plain and darker so buttons read on it.
13. Go-Slow Hall: indoor motor park (roof beams, 8 roof lamps off and on, floor lanes and arrows, left door, right doors closed and open, cone line, drain grate, "GO-SLOW HALL" sign); the slice 1 heap and lights moved inside; the high honk cloud with "PEEP!"; the cones sliding aside.
14. Screens: four street cards (small pictures of each street and the hall), a padlock, a tick, Nigeria's wheel (hub, 37 cogs, grey and working looks, name labels), a music note icon and a music-off icon.

Sounds (code-made, short, original):
1. Run start: a soft dust whoosh.
2. Skid on a turn from a run: a short scuff.
3. Crate: wooden "tok" and a rope creak; the empty "tok".
4. Kobo out of a crate: three quick clinks using our existing kobo sound, pitched up a little each.
5. Food out of a crate: a soft pop.
6. Well down: crank clicks and a rope creak, falling in pitch; well up: the same, rising.
7. Room arrive: a soft hollow echo thump.
8. Parcel pick-up: a warm two-note "got it".
9. Drum: a low "dum" when it wakes, a deep "dong" bounce.
10. High honk: a thin, high two-tone "PEEP" (different from the low "POOO").
11. Bus boarding: door hiss, then the existing "pa-paam" horn.
12. Hall lamps: a click and a soft hum each.
13. Cog turning on: a ratchet click and a small bell.
14. Locked card tapped: a soft low "tuk" (and the words already say why).

Music (S2.9): menu loop, street loop (three tempos), well loop, hall loop (three tempos with layers), street-cleared jingle, win tune.
