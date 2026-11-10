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
| Food | 5600-11000 | 35-70 s | the three foods | Garri at 5900, then a goat at 6400 to spend the shield on. Corn at 7100: 6 s of fast road (slice 1 timing; corn now lasts 12 s, see Power-ups) with kobo, a 50 pothole and two roofs, no hazards. Mixed bit: tyre 8900, 90 hold pothole at 9200. Amala at 9650: goats and a tyre at 10000, 10300, 10550 to smash |
| Boss | 11000-11560 | 70 s on | General Go-Slow | See Boss |

Foods sit on the road at running height with a short kobo row leading in, so a normal run picks up all three without trying: garri x 5900 (37 s), corn x 7100 (45 s), amala x 9650 (61 s). No pothole within 300 u of a food, so nobody jumps over one by accident.

Food when the boss starts (slice 1 history, worked out with 6 s corn and 7 s amala): no timed food is running. Corn ends near x 8470. Amala ends near x 10740, the last hazard it meets is near 10450, and the arena starts at 11000, so amala is over about 1.7 s before the boss. The garri shield has no timer, so an unused shield carries into the fight. That is a fair reward. Timers are never cut at the arena line; the Q6 rule just never comes up in this level.

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
| Roasted corn | Run speed `cornSpeed` (228) instead of `runSpeed` (156), both from the level file | 12 s | "Roasted corn! You run faster for 12 seconds." | corn icon "Fast 12" counting down | speed lines behind | Last 2 s: HUD and hero blink, a soft tick each second, toast "Corn is wearing off!" |
| Garri, sugar and epa | Shield takes one hit for you | Until one hit | "Garri, sugar and epa (groundnut)! A shield takes one hit for you." | cup icon "Shield" | a round bubble outline | On a hit: bubble pops, toast "Shield used up!", 1.2 s of blinking safety, no life lost |
| Amala, gbegiri and ewedu | Smash through goats (they run off unhurt), tyres and boss throws, +2 kobo each | 12 s (was 14; Tp, 10 Nov, city choice 6; gamedev to change) | "Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through!" | bowl icon "Strong 12" counting down | glowing outline and bigger steps | Last 2 s: blink and tick, toast "Amala is wearing off!" |

Times (Tp, 10 Nov, city choice 6: every food lasts 12 s): corn 12 s (built), amala 12 s (built as 14 s; gamedev to change `amalaSteps` in src/game/run.ts and both amala strings in src/screens/words.ts, the toast and its short-words key), garri until one hit. The toast words always say the real seconds. Slice 1 history: foods first lasted 6 s and 7 s, then 12 s and 14 s (quick fixes, 9 Nov).

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
3. No big pit within one corn's reach after a corn. A corn's reach is the road a full corn run covers: corn seconds x `cornSpeed` = 12 x 228 = 2736 u (was 1400 u when corn lasted 6 s). Reason: a corn walk can almost clear a big pit, so a big pit inside the corn would teach the wrong jump. Tests work this out from the corn time in code (S2.13).
4. The first big pit of the game comes right after a bus stop, and a coin arc on solid road just before it shows the shape of a running double jump.

Hazards with a player-moved hero (changes part 1 only where it says so):
1. Hazards still wake when they are within the larger of `wakeDistance` and (visible width ahead of the hero + 40), and then move left as in part 1. A hero standing still is walked up to; jumping over or onto them still works.
2. A woken hazard that is more than 200 u left of the camera's left edge, or more than 200 u right of its right edge, is gone for good this play (it comes back only after a lost life, as in part 1).
3. Hazards and corn (P2, 10 Nov; replaces the old "1370 u" rule, written when corn lasted 6 s). On the narrowest view (560 u, hero at 20 percent, 448 u of road ahead) a hazard comes into view 448 u away. With corn, a tyre closes at 60 + 228 = 288 u/s, so the player gets 1.56 s of warning: that meets the 1.5 s rule. A drum closes at 84 + 228 = 312 u/s: 1.44 s, too short. So, with reach = corn seconds x `cornSpeed` (2736 u):
   a) The fast stretch: no tyre and no drum in the first half of the reach after a corn (1368 u). The corn starts as a treat: speed, kobo and jumps, nothing to dodge.
   b) Tyres may stand in the second half of the reach. They give 1.56 s of warning even at corn speed.
   c) No drum from a corn up to reach + `wakeDistance` after it (2736 + 520 = 3256 u). A drum that far on is still asleep when the corn runs out, so it is never met at corn speed on any screen.
   d) Goats are fine anywhere.
   e) A corn stretch always has a warning and room to slow down: "Corn is wearing off!" and the blink in the last 2 s, and there is no auto-run, so letting go stops a corn run in about 20 u (0.19 s).

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
| Roasted corn! You run faster for 12 seconds. | Roasted corn! You run faster! |
| Garri, sugar and epa (groundnut)! A shield takes one hit for you. | Garri, sugar and epa! Shield on! |
| Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through! | Amala, gbegiri and ewedu! Strong! |
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
| Food | 6400-10000 | 53-83 s | the three foods | "This crate has food inside. Knock it!" Garri crate at 6500; goat at 6900 to spend the shield on. Roasted corn on the road at 7300 (a full corn run lasts to about 10040): fast stretch 7300 to 8670 with kobo, a tap pothole 40 at 7800 and roofs at 7600 (with a kobo crate on it), 8100, 8500; no hazards. Mixed: tyre 8900, hold pothole 60 at 9150. Amala on the road at 9530; goat 9850, tyre 10050, goat 10250 to smash |
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
| Corn | 7300-8670 | | Corn crate at 7300 (corn drops to the road; a full corn run lasts to about 10040). Tap potholes 40 at 7700 and 36 at 8200, roofs at 7900 (kobo crate over it) and 8450. No hazards (fast stretch) |
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
| Corn | 7500-8870 | | Corn crate at 7500 (a full corn run lasts to about 10240; no drum before 10756). Tap 40 at 8100, hold 60 at 8600, roof at 8300 with a kobo crate. No hazards (fast stretch) |
| Mixed | 8870-9900 | | Tyre 9100, goat 9300, tyre 9550 (was a drum; P2), roof at 9700 |
| Amala | 9950-11500 | | Amala on the road at 9950. Tyre 10200 (was a drum; P2), tyre 10350, goat 10500, goat 10650 (was a drum; P2), wide pothole 100 at 10900. Bus door 11500 |

Kobo: 129 (117 loose, 12 in crates), plus 17 in the well room.

### The rolling drum (new hazard, street 3)

An empty, plain oil drum (no writing, no brand) rolling left from the vulcanizer.

| | Number |
|---|---|
| Box | 26 wide x 30 tall, feet on the road |
| Speed | 84 u/s, rolling left (tyre is 60) |
| Rules | as the tyre: wakes like any hazard, drops into potholes, land on it to bounce (vy -480), it then rolls into a sparkle (0.3 s); amala smashes it (+2 kobo); any other touch hurts |
| Placing | never from a corn to reach + `wakeDistance` after it (3256 u; S2.2 hazard rule 3c); at least 200 u from a pit; first one alone with a hint. Street 3's drums: 1800, 4250, 6300 |

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

A level test should check every rule in this part: pit kinds and widths, run-up before big pits, hazard distances from pits and exit wells, the corn rules worked out from the corn time (S2.2 hazard rule 3, big pit rule 3), a warning sign before every pit 90 u or wider, crate heights and spacing, food distances, hints at least 120 u apart, spawn, bus stop, wells and bus door on solid road.

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

**Changed by S2.14 (10 Nov 2026):** no light is lit at the start; each light comes on after two throws and stays green only for a while; phase 3's pattern puts the high honk second. Where S2.14 and this part differ, S2.14 wins.

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
5. "Music: on / off" is its own switch, separate from "Sound: on / off", on the title screen and the pause screen, and the M key. Remembered as `gidi-music`. Sound off makes the game quiet, music too. Music off stops only the tunes. Each switch shows its own setting. (po Ruling 1, 9 Nov, as built: a tune plays only when Sound and Music are both on; "Music: on" stays shown while Sound is off, so the tune comes back by itself when Sound comes back.)
6. The game never waits for music to start. Notes are scheduled 0.1 s ahead, checked every 25 ms.

### Corn tune (Tp, 10 Nov 2026; designer note)

Source: Tp, 10 Nov: when corn is picked up its sound should be different, fast and louder than every other sound, then wear off slowly, 5, 4, 3, 2, 1 (docs/questions.md top block, item 3).

**What the player hears and sees.** You eat roasted corn: our own fast corn tune starts at once, loud and bright, and the street tune and every sound effect go quiet under it. For the last 5 seconds a big "5, 4, 3, 2, 1" counts down, and with each number the tune gets slower and softer. At 0 it is gone and the street tune comes back up.

The tune (art writes the notes in src/art/tunes.ts, as data, like the others):

| | |
|---|---|
| Name | `corn` |
| Tempo | 144 BPM while the corn is fresh (street tunes are 108 to 116) |
| Key | G major pentatonic (G, A, B, D, E), the street tunes' key, so the quiet street tune under it never clashes |
| Chords | G, C, D, G (one bar each), 4 bars, looping (about 6.7 s a loop) |
| Instruments | highlife guitar pluck plays the lead riff in quick 16th notes; bass on beat 1 and the "and" of 2; agogo bell in a two-note pattern; shekere on every 16th; a talking-drum fill in bar 4 |
| The riff | our own short highlife riff, 2 bars, answered by a second 2 bars. Common scale notes only |
| Must not sound like | any game's power-up, star, invincibility or speed music (Mario's star tune first, then Sonic's invincibility and speed shoes, Pac-Man's power pellet and other well-known ones), or any known song. So no bouncy "da da da-da da-da da" star rhythm, no fast rising arpeggio on every beat, no chromatic climb. art adds the openings of those tunes to the check list in tests/unit/music.test.ts if they are not there |
| Size | note data, under 2 KB |

How loud (rules for gamedev, src/engine/music.ts and src/engine/sound.ts):
1. The corn tune plays on its own output at 0.8 (sound effects are 1.0, the music is 0.3 today). So it is about 2.7 times as loud as the street tune.
2. While it plays, the street tune (or the well tune) keeps running underneath but is turned down to 30 percent of its level, and every sound effect is turned down to 30 percent. Turning down takes 0.15 s. (Today effects go straight to the speakers; gamedev adds one effects volume node that every effect goes through, so this is one setting.)
3. The count's own ticks are part of the corn tune and are not turned down.

The last 5 seconds (the count):

| Corn seconds left | Number on screen | Corn tune tempo | Corn tune loudness | Street tune and effects |
|---|---|---|---|---|
| 12 to 5 | none | 144 | 100 percent | 30 percent |
| 5 | "5" | 128 | 80 percent | 44 percent |
| 4 | "4" | 112 | 60 percent | 58 percent |
| 3 | "3" | 96 | 40 percent | 72 percent |
| 2 | "2" | 80 | 20 percent | 86 percent |
| 1 | "1" | 72 | 10 percent | 93 percent |
| 0 | gone | fades to silence in 0.4 s | 0 | back to 100 percent over 0.6 s |

Each step starts on the second the HUD's "Fast" number changes, on the next 16th note of the tune. Only the speed changes, never the pitch (no slowed-tape wobble). One agogo note on each new number, so the count can be heard.

The count on screen:
1. It shows in the hint bar's place (S2.2, "The hint bar"), so it never covers anything you play. It replaces the old "Corn is wearing off!" toast for corn (amala keeps its toast). A hint or toast that comes due during the count waits until the count ends, then shows for its full 3.5 s.
2. Each number: a small corn icon and the number, bold, as tall as the bar allows: 40 px on screens under 280 px tall, 56 px on 280 to 419 px, 72 px from 420 px. Same yellow bar, dark number.
3. Each number pops in (130 percent to 100 percent over 0.15 s). With reduced motion: no pop, the number just changes.
4. Screen readers: the number boxes are hidden from them; once, at 5, they hear "Corn ends in 5 seconds", and at 0, "Corn is done". No reading of every number.
5. The HUD's corn chip keeps its own seconds and its blink in the last 2 s, as built.

Other rules:
1. **Switches (po Ruling 1).** The corn tune is a tune: it plays only when Sound is on and Music is on. Music off: no corn tune and no turning down of the effects; the count still shows. Sound off: everything quiet; the count still shows.
2. **iPhone silent switch.** We leave it be (as built, src/engine/audio-unlock.ts): with the switch on, nothing is heard, the count still shows. In the store app wrapper the audio must keep obeying the silent switch (gamedev: use the "ambient" audio setting there).
3. **A second corn** while corn works: the tune starts again from bar 1 at 144 and full loudness, the count hides, the effects stay turned down.
4. **Pause** (pause screen, phone upright, app switched, a call): the corn tune holds with the corn timer and carries on from the same place, at the same step of the count.
5. **Lost life during corn:** the corn ends at once, so the tune fades out in 0.3 s with no count, and the street tune and effects come back over 0.3 s.
6. **Street end during corn:** the corn tune fades out in 0.3 s as the bus jingle starts (S2.6 "The street end").
7. The corn tune never plays in the hall (there is no corn there).

Tasks:
- art: the `corn` tune data in src/art/tunes.ts (rules above), and the originality check openings in tests/unit/music.test.ts.
- gamedev: the effects volume node (src/engine/sound.ts); the corn tune player with the turn-down, tempo and loudness steps, restart, pause and switches (src/engine/music.ts, src/game/music-cue.ts); the count in the hint bar place with the screen reader lines (src/main.ts, src/screens); remove the corn "wearing off" toast (keep amala's).
- qa done checks: (1) the corn tune is clearly louder than every other sound and they come back after; (2) the 5, 4, 3, 2, 1 shows and the tune slows and fades with it, pitch unchanged; (3) Sound off, Music off and the iPhone silent switch each give no corn tune and the count still shows; (4) a second corn restarts it; pause, lost life and the bus behave as above; (5) the count never covers anything you play, at every qa size; (6) reduced motion: no pop; a screen reader hears two lines only; (7) originality: not like any game's power-up or star music, or any known song.

## S2.10 Screens and words (slice 2)

Every button at least 44 x 44 px (the in-play buttons at least 56). Screens that open during play ignore taps for their first 0.4 s (part 1). Gentle mode: "Gentle mode: 5 lives instead of 3" on the title and game over screens. It gives 5 lives, and on a street a fall in a pothole puts you back just before that pothole, not at the bus stop (Tp, 10 Nov, R6 a; S2.13). Nothing else changes.

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
| Game over (street) | A player who lost the last life on a street | Try again | "Out of lives". "You got {kobo} kobo. The street is still here. Try again!" Button "Play again". If gentle mode is off: "Want more tries? Gentle mode gives you 5 lives, and you climb out of holes." with the switch. Small "Streets", "Home" |
| Game over (hall) | A player who lost the last life in the hall | Try again | "Out of lives". "General Go-Slow is still jamming the hall. Try again!" Same buttons as above. Gentle offer: "Want more tries? Gentle mode gives you 5 lives." (the hall has no holes) |
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
4. Gentle mode: 5 lives on every street and in the hall, and a pothole fall puts you back just before that pothole (S2.13). No auto-run (Q18); revisit after testing.
9. Every pothole you must jump twice for (90 u or wider) has a warning sign before it: a picture, not colour alone (S2.13).
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

## S2.13 P2 polish (designer, 10 Nov 2026): tasks for gamedev and art

Sources: Tp's answers of 10 Nov (city choice 6: every food lasts 12 s; R6 a: potholes) and po's rulings of 9 Nov (quick fixes ruling 1; O music Ruling 1), all in docs/questions.md. Docs only; nothing here is built yet.

### 1. Food times (gamedev)

1. Amala lasts 12 s, not 14 (Tp, 10 Nov, city choice 6). In src/game/run.ts: `amalaSteps: secs(12)`. In src/screens/words.ts: the amala toast and its short-words key both become "Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through!". The HUD then counts "Strong 12".
2. Corn stays 12 s, garri stays until one hit. Toast words always say the real seconds. If a food time ever changes again, its toast changes in the same commit.

### 2. Hazards and corn (gamedev)

Decision: keep the rule's purpose (never meet a hazard you could not see coming), restate it for 12 s corn, and move nothing except three drums in street 3, which become a tyre or a goat at the same x. Tyres at corn speed give 1.56 s of warning on the narrowest screen, which meets the 1.5 s rule; drums give 1.44 s, which does not. Full rule: S2.2, hazard rule 3 a to e, and big pit rule 3.

Changes to src/data/levels/lagos-3.json, `hazards` (x stays the same):
- ["drum", 9550] becomes ["tyre", 9550]
- ["drum", 10200] becomes ["tyre", 10200]
- ["drum", 10650] becomes ["goat", 10650]

Street 3 keeps drums at 1800 (taught alone, with its hint), 4250 and 6300. Streets 1 and 2 do not change: their tyres at 8900 and 8950 sit 1600 and 1650 u after the corn, past the fast stretch (1368 u), and they have no drums. Every big pit comes before its street's corn.

Tests (tests/unit/street.test.ts): stop hard-coding 1370 and 1400. Work the reach out in code: `reach = RULES.cornSteps / STEPS_PER_SECOND * L.cornSpeed` (2736 today). Then check:
- no big pit from a corn to corn + reach;
- no tyre or drum from a corn to corn + reach / 2 (the fast stretch);
- no drum from a corn to corn + reach + `L.wakeDistance`.
So the next change to the corn time is caught by the tests, not by a player.

### 3. Sound and Music (done in the doc; nothing to build)

S2.9 rule 5 now says: "Sound off makes the game quiet, music too. Music off stops only the tunes. Each switch shows its own setting." This is how it is built (po Ruling 1).

### 4. Pothole warning sign (art, then gamedev)

Tp, 10 Nov, R6 a: a small warning sign before each wide pothole. We put it before every pothole you must jump twice for: every wide pothole (90 to 110 u) and every big pit (170 u, which keeps its cones as well). Tap and hold potholes get no sign.

What it looks like (art; our own style, drawn in code):
- A hand-painted wooden board on one wooden post, like the painted signs at Lagos roadsides. Not a copy of any official road sign and not of any game's sign. No words, no brand, no flag.
- Board 34 u wide x 24 u tall, bright yellow from our palette, thick dark ink outline, two small nail dots, leaning about 3 degrees. Post 4 u wide, dark wood. Whole sign 56 u tall: post foot on the back edge of the road (y 300), board top at y 244.
- Painted on the board: a black hole with a ragged rim, and over it a dotted path that goes up, dips a little, and goes up again (a jump and a second jump), ending in a small arrow to the right.
- Not colour alone: the hole and the two-hump path say it, in any colour.
- The fixed look after Lagos is switched on keeps the signs (the board looks freshly painted).

Where it stands (gamedev): worked out from the ground spans in code, no level file change. For every gap 90 u or wider, one sign with its post centre 120 u before the gap's left lip. It is scenery: drawn behind the hero, hazards, kobo, crates and foods, never solid, never hurts. It sits above the road line, so the hint bar (top limit world y 312) never covers it.

Today that gives signs at: street 1: 3880 (wide 100 at 4000), 4930 (big pit at 5050). Street 2: 3480 (wide at 3600), 5680 (big pit at 5800), 10180 (wide at 10300). Street 3: 2580 (wide at 2700), 5180 (big pit at 5300), 6880 (big pit at 7000), 10780 (wide at 10900).

Test: every gap 90 u or wider has exactly one sign 120 u before its left lip; no narrower gap has one; no sign stands in the hall or the well room.

The bus stop restart stays as built for everyone not in Gentle mode.

### 5. Gentle mode: climb out just before the pothole (gamedev, art)

Tp, 10 Nov, R6 a. Gentle mode now gives 5 lives and changes where a pothole fall puts you. Nothing else changes.

Rule (gamedev), only when Gentle mode is on, only on a street:
1. A fall in any pothole or pit costs one life, as now. At 0 lives it is game over, as now.
2. The fall plays as built. Then, instead of the bus stop or the start, the hero comes back at the restart point for that pit: 100 u before its left lip, or 160 u before the left lip of a big pit (the run-up a big pit needs). If that point is behind where Normal mode would put you (the bus stop once reached, else the start), use the Normal mode point instead. If the point is not on solid road with 20 u of road on each side, use the middle of the road span that ends at the pit's lip. In today's streets every restart point is on solid road.
3. The hero stands facing right, still, and the camera jumps there (S2.2 Camera, rule 6). The hero plays a short "dust off" (0.4 s, controls locked; with reduced motion, no dust off, stand at once).
4. Same reset as any fall, measured from this restart point: food effects end (shield too), foods, food crates and hazards at or past the restart point come back, kobo taken stay taken.
5. 1.7 s of blinking safety after the climb-out (a Normal mode fall has none), so nothing that comes back can hit you as you arrive.
6. Reaching the bus stop still counts, as now.

Hint words (in the hint bar, 3.5 s, after every Gentle mode climb-out; all 35 characters or fewer, the same for touch and keys):
- after a tap or hold pothole: "Up you come! Try that jump again."
- after a wide pothole: "Up you come! Jump, then jump again."
- after a big pit: "Up you come! Run, then jump twice."
- In Gentle mode the bus stop hint "Bus stop! Now you start here." is not true any more, so it says "Bus stop! Halfway there." instead.

Words on screens (gamedev): street Game over offer "Want more tries? Gentle mode gives you 5 lives, and you climb out of holes."; the hall's offer stays "Want more tries? Gentle mode gives you 5 lives." The switch label stays "Gentle mode: 5 lives instead of 3" (Tp, R7 a: "lives" and "Gentle mode"; the layout is already tested at 320 px).

Art: the "dust off" pose for every body (S2.3), facing right: a quick crouch, two pats on the knees, a small dust puff, then stand. Two frames are enough.

Tests: in Gentle mode, a fall in each pit kind brings the hero back at the right restart point, with one life fewer, 1.7 s of safety and the right hint; in Normal mode the bus stop restart is unchanged; with Gentle mode on, game over still comes at 0 lives.

## S2.14 Harder (designer, 10 Nov 2026: Tp "it needs to be harder")

Source: Tp, 10 Nov, after playing the PR #3 build (docs/questions.md, top block, item 1), and the plan P2 hall goal (po M4). Gentle mode stays kind: 5 lives, and the climb-out on streets (S2.13 part 5). Nothing here changes Gentle mode.

What stays true on every street: every hazard shows at least 1.5 s before it reaches you, the corn rules (S2.2 hazard rule 3 a to e, big pit rule 3), the four pit kinds, hazards at least 200 u from a pit, foods at least 300 u from a pit, a pothole sign before every pit 90 u or wider (S2.13 part 4, worked out in code, so the new wide potholes get signs by themselves).

### 1. Go-Slow Hall: the goal and the two levers

The goal (plan P2): a first-timer meets at least 2 throws in each phase, sees a high honk before the third hit, wins the first time in about 30 to 60 s, and can still clear the hall in 3 tries. Today the left light is lit at once and each next light comes on straight after the 1.5 s break, so a bot wins in 6 to 7 s.

**Lever 1 (plan P2's first lever): each light comes on later.** No light is lit at the start. In every phase the light waits until two throws are out.

**Lever 2: a light stays green only for a while.** If you miss it, it goes dark, then comes back after two more throws. The green time gets shorter after each hit. This is how the fight gets harder after each hit, along with the faster throws already there.

Phase start: the fight start for phase 1; the end of the 1.5 s break for phases 2 and 3. All times below are seconds from the phase start.

| Phase | Light | Throws come out at | Pattern (repeats) | Throw every | Tyre speed | Light comes on at (`lightAt`) | Green for (`greenFor`) | Then dark for (`darkFor`) | Music |
|---|---|---|---|---|---|---|---|---|---|
| 1 (before any hit) | left | 2.0, 4.2, 6.4, ... | tyre | 2.2 | 156 | 6.0 | 4.0 | 4.4 | 128 BPM |
| 2 (after hit 1) | right | 1.8, 3.6, 5.4, ... | tyre, tyre, honk | 1.8 | 192 | 4.0 | 3.5 | 3.6 | 134 BPM |
| 3 (after hit 2) | middle | 1.4, 2.8, 4.2, 5.6, ... | tyre, **high honk**, tyre, honk | 1.4 | 228 | 4.5 | 3.0 | 2.8 | 140 BPM |

Why these numbers:
- Phase 1: the first tyre comes out at 2.0 s and reaches a hero near the door at about 4.4 s. The second is out at 4.2 s. The light comes on at 6.0 s, so every player has jumped one tyre and has a second one rolling at them.
- Phase 2: two tyres are out (1.8 and 3.6 s) when the right light comes on at 4.0 s; the second tyre is passing under it.
- Phase 3: the pattern now puts the **high honk second** (was fourth). It comes out at 2.8 s and is right over the middle light at about 4.4 s, just as the light comes on at 4.5 s. So every player sees a high honk fly over the middle light before the third hit, and learns to wait for it to pass.
- A light that goes dark comes back after `darkFor`, which is two throw gaps, so the "two throws first" rule holds for every return too.
- A perfect player now wins in about 20 s (phase 1 about 6.5 s, break 1.5, phase 2 about 4.6, break 1.5, phase 3 about 5.6). A first-timer who misses one green time in each phase, or loses a life, takes about 30 to 45 s. That is the goal.
- Still fair: every light is reachable from a walk in under 1 s (S2.7), and the shortest green time is 3.0 s.

What the light shows (never colour alone):
| Light state | Look | Sound |
|---|---|---|
| Dark | grey, no arrow, no word (as built) | |
| Green | green, a bouncing down arrow, the word "GO" (as built) | a soft "ding" as it comes on |
| Last 1.0 s of green | blinks 2 times a second (never faster), the arrow stops bouncing | a "tick" each blink |
| Last 1.0 s, reduced motion on | no blink: the arrow hides, "GO" stays | the ticks |
| Goes dark (missed) | grey again | a low "clunk" |

Rules: only a landing from above while the light is green counts (as built). Standing on a light when it turns green is not a hit: hop off and land again. A light going dark under the hero does nothing to the hero. A hurt or the shield breaking never moves the light's clock.

Words (all in the hint bar):
- Start: "General Go-Slow is jamming the hall! Wait for the green light." (replaces "... Jump onto the green light."). Short words: "Go-Slow! Wait for the green light."
- The first time a light comes on in a try: "Green light! Jump on it!"
- The first time a green light goes dark unhit in a try: "Missed it! Wait for the next one."
- As built: "Green light! 2 more.", "Green light! 1 more.", "PEEP! High honks fly high. Stay low on the floor." (now shown at the start of phase 3, 2.8 s before the high honk comes, and hidden at the third hit, po N4).

Gentle mode in the hall: 5 lives, as now. The lights are the same.

If qa's first-timers find it too hard, tune in this order (S2.7's order still comes after these): green time 4.0/3.5/3.0 to 4.5/4.0/3.5; then `lightAt` 6.0/4.0/4.5 to 5.0/3.6/4.5 (keep phase 3, it carries the high honk); then S2.7's list. If it is still too easy (a first win under 25 s): green time 3.5/3.0/2.5.

Exact change to src/data/levels/lagos-hall.json, `boss.phases` (every other field stays):
```json
"phases": [
  { "every": 2.2, "speed": 156, "pattern": ["tyre"], "bpm": 128, "lightAt": 6.0, "greenFor": 4.0, "darkFor": 4.4 },
  { "every": 1.8, "speed": 192, "pattern": ["tyre", "tyre", "honk"], "bpm": 134, "lightAt": 4.0, "greenFor": 3.5, "darkFor": 3.6 },
  { "every": 1.4, "speed": 228, "pattern": ["tyre", "highHonk", "tyre", "honk"], "bpm": 140, "lightAt": 4.5, "greenFor": 3.0, "darkFor": 2.8 }
]
```

### 2. The streets: one step harder in the second half

Before the bus stop nothing changes on any street: that is where a first-timer learns. After the bus stop: one more wide pothole on each street, one more hazard on each street, and amala in street 1 moved so the rule "food 300 u from a pit" still holds. Pepper fufu (S2.15) is added to each street in the same change.

**Street 1, Alausa (src/data/levels/lagos-1.json).** Kept light: it is the teaching street and must stay "3 tries or fewer".
| Field | Change |
|---|---|
| `ground` | `[9210, 11000]` becomes `[9250, 11000]`: the hold pothole at 9150 (60 wide) becomes a wide pothole (100 wide) |
| `kobo` | `[9156, 220, 3]` becomes `[9160, 220, 2], [9200, 170, 2], [9240, 220, 2]` (an arc over the wide pothole) |
| `hazards` | add `["tyre", 7100]` (a goat at 6900 then a tyre: the garri shield has something to save you from) |
| `foods` | amala `[9530, 272, "amala"]` becomes `[9560, 272, "amala"]`; add `[8700, 272, "fufu"]` (S2.15) |

**Street 2, Computer Village (src/data/levels/lagos-2.json).**
| Field | Change |
|---|---|
| `ground` | `[5970, 7700]` becomes `[5970, 6750], [6850, 7700]` (a new wide pothole, 100, at 6750). `[9360, 10300]` becomes `[9400, 10300]` (the hold pothole at 9300 becomes wide, 100) |
| `kobo` | `[6800, 276, 3]` becomes `[6760, 220, 2], [6800, 170, 2], [6840, 220, 2]`. `[9306, 200, 3]` becomes `[9310, 220, 2], [9350, 170, 2], [9390, 220, 2]` |
| `hazards` | `["tyre", 6600]` becomes `["tyre", 6550]`; `["goat", 7000]` becomes `["goat", 7050]` (both 200 u from the new pothole); add `["tyre", 8750]` (in the second half of the corn reach, after 8668: allowed) |
| `foods` | add `[4800, 272, "fufu"]` (S2.15) |

**Street 3, Ikeja (src/data/levels/lagos-3.json).**
| Field | Change |
|---|---|
| `ground` | `[5470, 7000]` becomes `[5470, 6550], [6650, 7000]` (a new wide pothole, 100, at 6550, between the two big pits; big pit 2 keeps 350 u of clear road before it, more than the 160 it needs) |
| `kobo` | `[6600, 276, 3]` becomes `[6560, 220, 2], [6600, 170, 2], [6640, 220, 2]` |
| `hazards` | `["goat", 5900]` becomes `["goat", 6000]` (room to pick up the fufu first); add `["tyre", 9750]` (under the roof at 9700, so you can hop up out of its way) |
| `foods` | add `[5800, 272, "fufu"]` (S2.15) |

Checked against the rules: every new hazard is at least 200 u from a pit; every food at least 300 u from a pit; no tyre in a fast stretch (street 2's corn crate at 7300, fast to 8668; street 3's at 7500, fast to 8868); no new drum; the big pits keep their run-up. New pothole signs (worked out in code): street 1 at 9030, street 2 at 6630 and 9180, street 3 at 6430. Gentle mode climb-out points (100 u before the lip) are all on solid road: 9050; 6650 and 9200; 6450.

Kobo: each changed arc adds 3. New loose totals: street 1 +3, street 2 +6, street 3 +3.

If qa's first-timers need more than 3 tries on a street, take these back in this order: street 3's tyre at 9750; street 2's tyre at 8750; street 1's tyre at 7100; then the plan P3 order (big pits 170 to 160, one hazard fewer in street 3's group).

### 3. Tasks

gamedev:
1. Hall: read `lightAt`, `greenFor`, `darkFor` per phase (src/game/level.ts, required numbers above 0). src/game/boss.ts: `lit` starts at -1; the light comes on at phase start + `lightAt`, stays green `greenFor`, goes dark `darkFor`, and repeats until hit. New events `bossLightOff` and a "blink" flag for the last 1.0 s (art and sound use them). New pattern for phase 3. The throw clock is not changed by the light.
2. Hall words in src/screens/words.ts as in part 1, with the short words added to the hint bar table. The "PEEP!" toast now shows when phase 3 starts (the end of the break after hit 2), not when the middle light comes on.
3. Street files: the exact changes in part 2. Update the kobo counts and any test that counts hazards or pits (tests/unit/street.test.ts STREETS keeps bigPits 1, 1, 2).
4. Tests: the light timeline (dark at the start, on at 6.0 s, green 4.0 s, dark 4.4 s, on again); a landing on a dark or blinking-out light; the hall bot (tests/unit/hall-bot.ts) with 120 ms jitter now takes 18 s or more for a clean win and meets 2 or more throws in each phase and a high honk before the third hit; the street rule tests still pass.

art:
1. The light's last-second blink (2 times a second, the arrow still) and the reduced-motion look (arrow hidden). src/art/hall.ts.
2. Three short sounds in src/engine/sound.ts, our own: the light's "ding" (a bright two-note agogo hit), the "tick" (a dry wood click), the "clunk" (a low muted thud). Never a game's sound.

qa done checks:
1. A first-timer (Tp first) in the hall: at least 2 throws met in each phase, a high honk seen before the third hit, first win in 30 to 60 s, cleared in 3 tries or fewer. Bots: a clean win takes 18 s or more.
2. Each street still cleared by a first-timer in 3 tries or fewer, Normal mode; Gentle mode climb-outs land on solid road at the new wide potholes.
3. With reduced motion on, nothing blinks; the light still says when it is ending (the arrow hides, the ticks).
4. All street rule tests pass; every new wide pothole has its sign.

## S2.15 Pepper fufu, now (designer, 10 Nov 2026)

Source: Tp, 10 Nov ("I don't see my fufu as my fireballs"), taken by po as item 2 in docs/questions.md's top block. This changes only the timing of R3 / city choice 8 (fufu comes now, not after slice 3). Fufu with egusi is the Igbo-home food of version 1 (R5, equal shares): eaten all over Nigeria, shown with pride, never as a joke.

**Hard rule (CLAUDE.md rule 2):** fufu balls are soft, hot food. Never flames, fire, sparks, glow, a burning trail, a "fwoosh" or any fireball look or sound. A fireball power-up is a Mario signature and is banned. The word "fireball" never appears in the game.

### What it does, in one line

Pick up a bowl of pepper fufu: you get 8 hot fufu balls. Press Throw to toss one the way you face. It plops onto the road, hops twice (each hop smaller), then rolls. It knocks tyres and drums off the road, plugs a pothole it falls into, and feeds a goat, which trots away. It never hurts a goat or anyone.

### The food

| | |
|---|---|
| Look (art) | A white enamel bowl with a blue rim, three soft white fufu balls in it, a small dish of egusi beside it (yellow-orange with green leaf bits), one small curl of steam. 20 u wide x 16 u tall, on the road like the other foods (centre y 272) |
| Gives | 8 balls. Most you can hold: 16 (a second bowl while you hold 12 gives 16) |
| Not timed | Balls stay until thrown. They are not a 12 s food, so no shrinking bar and no corn-style count |
| Lost a life | Like every food power: your balls go to 0. A fufu bowl at or past the restart point comes back (as all foods do). Potholes you plugged stay plugged (like kobo taken) |
| Street cleared | Balls are not carried to the next street; each street and each hall try starts with 0 |

### Where the fufu sits (one per street, one in the hall)

| Place | Fufu at | Why there: what to try it on next |
|---|---|---|
| Street 1, Alausa | road, x 8700 (in the second half of the corn) | tyre 8900, the wide pothole at 9150 (S2.14), goats at 9850 and 10250. After every lesson, so it never teaches two things at once |
| Street 2, Computer Village | road, x 4800 (just before the bus stop) | the big pit at 5800 (a ball falls in and nothing happens: big pits are too deep), goat 6300, tyre 6550, the new wide pothole at 6750, goat 7050 |
| Street 3, Ikeja | road, x 5800 (after big pit 1) | goat 6000, drum 6300, the new wide pothole at 6550, big pit 2 at 7000 (too deep) |
| Go-Slow Hall | a bowl drops onto the floor at x 120 when the break after hit 1 ends (once per try) | the tyres and honks of phases 2 and 3. Phase 1 stays a pure jumping lesson |

Level data: `foods` adds the kind "fufu" (the street changes are listed in S2.14 part 2). Crates may hold "fufu" later; none do now. Hall file, inside `boss`: `"fufu": { "x": 120, "afterHit": 1 }`.

### The Throw button and the key

| | |
|---|---|
| Shape | A circle, size T = max(64, D) CSS px (D as in S2.2 "Phone buttons"). Icon: a white ball with two steam curls and a small forward arrow; the word "Throw" under the icon. Spoken label "Throw fufu, {n} left" |
| Place | Right thumb, beside Jump: its right edge 10 px left of Jump's left edge, same bottom as Jump. With "Swap sides" (Q24, slice 3) everything mirrors and Throw stays on the inner side of Jump |
| Shown | Only while you hold 1 or more balls. It pops in over 0.15 s when you pick up fufu (no pop with reduced motion) and hides when the last ball is thrown |
| Touch | A real button: takes its own taps first (as Pause and Go down). Touch area: the drawn circle plus 5 px all round (never past the 10 px gap's middle). One press = one ball. Holding does not repeat |
| Look | Like the other buttons: white at 35 percent, 2 px dark outline; pressed: fill 60 percent, 94 percent size, icon turns dark (shape and size, not colour alone) |
| Key | X. Key repeat is ignored. Mouse: clicking the drawn button works too |
| Words for hints | New marker {throw}: touch "Throw", keys "X" |

Where the buttons sit on the screens qa tests (CSS px, Throw shown):

| Screen | Jump spans | Throw spans | Hint bar |
|---|---|---|---|
| 320 x 240 | 224 to 308 | 150 to 214 | see "Narrowest screens" |
| 480 x 270 | 370 to 468 | 295 to 360 | 158 to 289 (131 wide) |
| 568 x 230 | 472 to 556 | 398 to 462 | 140 to 392 |
| 640 x 200 | 544 to 628 | 470 to 534 | 140 to 464 |
| 568 x 320 | 437 to 556 | 348 to 427 | 186 to 342 (156 wide: short words) |
| 667 x 375 | 535 to 655 | 445 to 525 | 188 to 439 |
| 851 x 393, home bar 21 | 719 to 839 | 629 to 709 | 210 to 623 (413) |
| 1024 x 768 | 892 to 1012 | 802 to 882 | 480 wide, centred: 252 to 732 |

The hint bar rule (S2.2) gains one line: while Throw is shown, the bar's right side is Throw's left edge - 6 (not Jump's).

Narrowest screens: if that leaves the bar under 96 px wide (of the qa sizes, only 320 x 240), the bar keeps its usual place (Forward + 6 to Jump - 6) and is drawn over the Throw button while a hint or toast shows. Throw still works under it (the bar takes no taps), and its outline shows on both sides of the bar. This is the only time the bar may cover a button; it never covers anything you play.

### How a ball flies

Same units as S2.2: world units, y grows down, 60 steps a second.

| | Number |
|---|---|
| Ball | round, 12 u across (radius 6) |
| Starts at | hero centre + 12 u the way the hero faces; hand height, hero feet - 26 |
| Thrown on the ground (standing, walking, running, or on a roof) | across: 240 u/s + the hero's own speed that way (if moving that way); up: 180 u/s. At a stand it lands about 86 u ahead |
| Thrown in the air (Tp: "aims down") | across: 150 u/s + the hero's speed that way; down: 260 u/s. From a jump it hits the road ahead and below |
| Gravity on the ball | 1400 u/s², falls no faster than 720 u/s |
| Landing (road or a roof top, from above only, like the hero) | first touch: a squash and a "plop", then it hops up at 45 percent of its landing speed; the second touch the same; after that, or when a hop would be under 40 u/s, it rolls along at the same speed across. So: plop, hop, little hop, roll. Never a run of equal bounces |
| Rolls for | up to 1.5 s after its first landing, then it settles and sinks into a small puff of steam (0.3 s) |
| Also gone | 200 u past the edge of the screen; at the start fence, the bus park wall or the bus |
| How many | one per press; at most one every 0.25 s; at most 3 balls flying or rolling at once (a press with 3 out does nothing) |

### What a ball does

| It meets | What happens |
|---|---|
| A pothole 30 to 110 u wide (tap, hold, wide) | The ball falls in and **plugs it**: a "plup", a puff of steam, and the hole becomes a pale, slightly domed fufu patch level with the road. It is solid road for the rest of this play of the street, also after a lost life. The pothole sign stays. One ball fills one pothole |
| A big pit (170 u) | Too deep. The ball drops away with a far-off soft "plop". Nothing changes (the run-up jump lesson stays) |
| A tyre or a drum | It is **knocked off the road**: it tips, rolls off the back of the road into the roadside (0.4 s) and is gone for this play. +1 kobo pops out (amala's smash gives +2). The ball is used up |
| A goat | **Never hit.** A ball that would touch a goat, from any side or from above, stops on the road 16 u in front of the goat (on the hero's side). The goat stops, eats it (0.6 s of chewing), says "meeh" (a small speech bubble with the word, and our own bleat), then trots off the road as built (2.5 s). It cannot hurt you after that |
| A crate | Balls never open crates. A ball touching a crate's side or bottom drops straight down |
| Kobo, foods, the hero | Nothing: balls pass by. They never collect anything and never hurt anyone |
| In the hall: a tyre | The throw is **stunned**: it pops into dust (like the dust at a hit). The ball is used up |
| In the hall: a low or high honk | It pops ("pff") into dust |
| In the hall: the jam | The heap goes "pfft" and shakes for 0.3 s, and its next throw comes 0.5 s later (once per throw at most). Never a hit: **only landing on a green light wins** |

People are never in the way of a ball, and the hero never aims at a person: in Gbese! people are scenery on the pavement, never on the road.

### HUD and words

HUD chip (S2.10 "The HUD row"): a fufu ball icon and "Fufu 8"; from step 1 on, the icon and "8". Screen readers: "Fufu balls: 8". Never colour alone: its own icon shape. It sits after the food chips; it comes and goes like them (the HUD fit steps work it out).

Toasts (hint bar, all 35 characters or fewer, so no short words needed; touch or keys words follow the last thing used, as hints do):

| When | Touch | Keys |
|---|---|---|
| Picking up fufu on a street | "Pepper fufu! Press Throw to throw." | "Pepper fufu! Press X to throw." |
| Picking up fufu in the hall | "Fufu! Press Throw to pop throws." | "Fufu! Press X to pop throws." |
| The first pothole plugged in a play | "Plugged! Fufu fills potholes." | same |
| A goat eats a ball | (no toast) the "meeh" bubble over the goat | same |

How to play words on the title do not change: the toast teaches it where it is needed.

### Sounds (our own, made in code)

Toss: a soft breathy "fff" (filtered hiss, 0.08 s). Landing: "plop" (a sine sliding from 220 to 140 Hz, 0.08 s); the hops, softer. Plug: a deeper "plup" and a short steam hiss (0.3 s). Tyre or drum knocked: a rubbery "bonk". Goat: "meeh", a short bleat (two slightly detuned tones with a wobble). Honk popped: "pff". Never a "fwoosh", a crackle, a rising "pew", or any game's throw or fireball sound.

### Tasks

gamedev:
1. src/game/fufu.ts (new, pure rules): ball flight, hops, roll, the meets table above, the 3-at-once and 0.25 s limits. src/game/level.ts: food kind "fufu"; hall `boss.fufu`.
2. src/game/run.ts: the ball count (8, max 16, 0 on a lost life), throw on X or Throw, plugged potholes (src/game/pits.ts: a plugged gap is solid road and has no Gentle climb-out), tyres and drums knocked off (+1 kobo), goats fed (then run away as built). src/game/boss.ts: balls pop throws; the jam's 0.5 s delay; the bowl drop after hit 1.
3. Input and layout: X key (src/engine/input.ts); the Throw button, its touch area and the hint bar's new right edge (src/screens/controls.ts `buttonLayout`); the narrowest-screen rule.
4. HUD chip, toasts, the {throw} marker (src/screens/hud.ts, src/screens/words.ts).
5. Tests: flight distances (stand throw lands 86 u ahead, within 3 u), two hops then roll, one ball plugs a 100 u pothole and the hero walks over it, a big pit is never plugged, a goat is never hurt and leaves, tyre +1 kobo, 3 at once, count 8/16/0, the button hidden at 0, hall pops, light hits still need a landing.

art:
1. The fufu bowl food, the ball (round, squash frame on landing, two steam curls, an optional small pepper-red dot on top), the plugged patch, the Throw button icon and the HUD chip icon (src/art/items.ts, src/art/controls.ts). Soft white and cream only; no orange or yellow glow, no trail, no flame shape.
2. The hero's throw pose for every body (S2.3), on the ground and in the air: one 0.15 s arm swing, two frames.
3. The goat eating (two frames) and the "meeh" bubble; a tyre and a drum tipping off the road.
4. The sounds above in src/engine/sound.ts.

Size: under 15 KB for all of it.

qa done checks:
1. Nothing on screen or in sound could be taken for fire or a fireball (no flame, glow, sparks, trail, crackle or "fwoosh"); qa compares against Mario's fireball by eye and ear and reports.
2. Throw works by touch (64 px or more at every size, beside Jump) and by X; hidden at 0 balls; screen readers hear "Throw fufu, 8 left".
3. A goat is never hit in 50 tries from every angle, ground and air; it always eats, says "meeh" and leaves.
4. A plugged pothole stays solid after a lost life; big pits are never plugged.
5. The hint bar never overlaps Throw except at the narrowest screens (bar under 96 px), and never covers anything you play.
6. Each street still cleared by a first-timer in 3 tries or fewer; the hall goal (S2.14) still met with fufu picked up.

## S2.16 Birds, the strong look, the tech suit, the dash, thorny gutters (designer, 10 Nov 2026: Tp B1 a to B5 a)

Source: docs/questions.md, top block "Tp, 10 Nov 2026 (later): designer's three choices, and five new ideas", Tp's answers B1 a, B2 a, B3 a, B4 a, B5 a. Docs only; nothing here is built yet.

Built on top of S2.14 part 2 and S2.15. Those street changes are not in the level files yet (P5, P8), so every street change below is written as a change to the S2.14 layout. gamedev makes the S2.14, S2.15 and S2.16 street changes in that order.

Every S2.2 rule still holds: every hazard shows at least 1.5 s before it reaches you on the narrowest view (448 u of road ahead), the corn rules (S2.2 hazard rule 3 a to e, big pit rule 3), the pit kinds, hazards at least 200 u from a pit lip, foods at least 300 u from a pit, a sign before every gap 90 u or wider, hints at least 120 u apart and 35 characters or fewer.

Numbers used below (S2.2 and src/game/run.ts, checked again with a step-by-step sum at dt = 1/60): walk 90, run 156, corn run 228 u/s; jump vy -576, second jump -504, gravity 2232, hold gravity 1152, max fall 720, coyote 5 steps; hero box 14 x 44. A full hold with a held second jump stays in the air 1.47 s and reaches 132 u from a walk, 229 u from a run (242 with coyote), 334 u on corn.

### B1. Birds by the rubbish (street 3)

**The idea.** On Ikeja's evening road, birds peck by the rubbish waiting for collection. They are in the way, never the enemy, and they are never hurt: every way past a bird ends with it flying off, fine.

**Two birds, real Lagos birds, our own drawings:**

| | Cattle egret (hops) | Pied crow (hovers low) |
|---|---|---|
| Look | white, long neck, yellow beak, long legs, calm round eye | black with a white chest band, stout, wings out and flapping slowly |
| Box | 16 wide x 28 tall, feet on the road (y 272 to 300) | 22 wide x 14 tall, y 266 to 280 (its bottom 20 u above the road) |
| Moves | pecks, then hops back and forth inside x0 - 20 to x0 + 20 at 30 u/s; a little 6 u hop is drawn, the box stays on the road | flaps in place over the pile; drawn bob 2 u up and down once a second; the box never moves |
| Never | walks toward you, leaves its 40 u patch, rises, dives, swoops, chases | moves toward you, comes lower, dives, swoops |
| To jump over (its width plus the hero's 14) | 30 u above 28 u high: a walking tap just does it (33 u), a walking hold or a running tap easily | 36 u above 34 u high: a walking hold (66 u) or a running tap (52 u). A walking tap (30 u) is not enough, so the crow teaches "hold" |

Not colour alone: the egret is tall and thin on legs, the crow is a short, wide shape in the air.

Why 1.5 s is always met: birds never come toward you, so the closing speed is your own: at most 228 u/s (corn), 448 / 228 = 1.96 s.

**What happens when you meet a bird:**

| You | The bird | You get |
|---|---|---|
| Land on it from above (the stomp rule, as goats) | flaps up and away | a small bounce, vy -360 (a normal bounce is -480; your second jump is still there), and 2 kobo pop out of the pile |
| Throw fufu (S2.15) and the ball comes within 12 u of it | the crow catches it in the air, or the egret picks it up off the road, and flies off with it | the ball is used up; no kobo (the bird has its lunch) |
| Touch it with the tech suit on (B3) | gets a fright at the suit's hum and flies off before it touches you | the suit stays on. Birds never break the suit |
| Touch it with amala on (B2) | gets a fright and flies off | no kobo; amala goes on |
| Touch it from the side or from below, with no suit and no amala | flaps up and away | **you lose a life** (1.7 s of blinking safety), the same as a goat |

My choice (Tp asked "decide fairly"): a touch costs a life, the same as a goat. Reasons: one rule for everything on the road ("touch it, lose a life; land on it, bounce"); birds are as easy to see and as slow as goats; a bird that costs nothing would teach players to ignore things on the road. Gentle mode has 5 lives, as everywhere.

Flying off: up and to the right at 45 degrees, 200 u/s, gone after 1.2 s. From the moment it starts to fly it has no box and can hurt no one. A bird that flew off comes back after a lost life only if it is at or past the restart point (as hazards do). Birds wake, sleep and leave as hazards do (S2.2 hazard rules 1 and 2). A hopping egret that would come within 30 u of a pit lip turns back.

**Not like any bird game (rule 2).** Real bird shapes with legs, beaks and wings; calm faces; no angry eyebrows; never round ball birds; no slingshot, no launching, no pipes, no tapping to flap, no yellow round bird. The hero never throws a bird, or throws at a bird to hurt it: fufu is food it takes away.

**The rubbish piles (scenery, never solid, never hurt).** A neat pile at the back edge of the road: tied sacks and a woven basket next to a green bin with the painted words "PLEASE USE THE BIN". Never flies, smell lines, rats, a joke about mess, or a word about any person or place. In the fixed look after Lagos is switched on, the piles are gone and the birds peck on clean pavement (same boxes, same play).

**Where they go on street 3, Ikeja (src/data/levels/lagos-3.json).** After the bus stop only (before it, street 3 teaches the drum). Never in a corn fast stretch (a corn starts as a treat).

| Bird | x | Pile at | Why there | Checks |
|---|---|---|---|---|
| Egret | 7400 | 7420 | The lesson: alone, on clear road after big pit 2, before the corn crate. Hint at 7240 | its patch starts 210 u after big pit 2's far lip (7170) |
| Crow | 8960 | 8960 | Just after the corn's fast stretch (ends 8868): a hold jump, then tyre 9100 | 300 u from the hold pothole's far lip (8660) |
| Egret | 10050 | 10070 | Just after amala (9950): try "amala frightens birds" | far from every pit |

Level data: `hazards` gains `["egret", 7400]`, `["crow", 8960]`, `["egret", 10050]`; `hazardSpeeds` gains `"egret": 30`; new scenery field `piles`: `[7420, 8960, 10070]`.

**Words.** Hint `[7240, "Birds! Hop over, or bounce on one."]` (34 characters, touch and keys). No toast for a fright or a fufu catch: the bird's own call says it ("kraa" for the crow, a soft "krk-krk" for the egret).

**Tasks.**
- art: egret (peck, hop, fly away; 2 frames each), crow (flap, fly away), both carrying a fufu ball; the pile and bin; the 2 kobo pop; calls in src/engine/sound.ts (our own: a short filtered-noise "kraa", two clicks "krk-krk"), never a game's bird sound.
- gamedev: hazard kinds `egret` and `crow` (src/game/level.ts; src/game/run.ts `HAZARD_BOX`: egret halfW 8, h 28; crow halfW 11, h 14 with its bottom at y 280); egret pacing; the table above in `touchHazards` (bounce vy -360 and +2 kobo; suit and amala fright with no hit); the fufu catch (src/game/fufu.ts); fly-off with no box; `piles` scenery.
- qa done checks: 1. No bird ever moves toward the hero or lower; each is on screen 1.5 s or more before you reach it at corn speed on the 560 u view. 2. In 50 meetings each way (stomp, fufu, suit, amala, side touch) a bird is never shown hurt and always flies off; only the side touch with nothing on costs a life; the suit survives. 3. Originality: nothing reads as Angry Birds or Flappy Bird (shapes, faces, sounds). 4. Street 3 is still cleared by a first-timer in 3 tries or fewer.

### B2. Amala: the strong look

**The idea.** For amala's 12 s the hero looks and sounds strong: steady, planted and warm. No change of size, nothing that lasts after the 12 s.

| | Exactly |
|---|---|
| Stance | feet drawn 3 u further apart on each side (still inside the 50 u art box), shoulders square, elbows 2 u out from the body. Same run cycle, same lean |
| Warm glow | a soft outline 3 u wide around the whole hero, amala brown-gold #c98a3a, breathing slowly between 35 and 55 percent see-through once a second. With reduced motion: a steady 45 percent |
| Heavier footsteps | each time a foot meets the ground: a small dust thump (a 6 u puff and two pebbles) and a low "dum" (a sine from 90 to 60 Hz, 0.08 s, 30 percent volume), at most one every 0.18 s |
| Smash | a touched tyre, drum or goat goes as built (+2 kobo for tyres and drums; goats trot off unhurt), now with a 24 u dust ring and a hearty "gbam" (a low drum hit and a wood knock together). Gutter weeds (B5): trampled flat, safe for the rest of the run. Birds (B1): frightened off |
| Pick up | a 0.3 s arm flex drawn while you keep moving (the controls never lock); a deep two-note talking drum "gbe-dum" |
| Last 2 s | the glow blinks 2 times a second (reduced motion: the glow thins to 1 u instead); the "Strong" HUD count and the amala toast as built |
| End | a 0.3 s "shake out" of the arms, stance back to normal. A lost life ends it at once, as now |
| Hero box | unchanged: 14 x 44. Not one number in the rules changes |

**Not Mario's grow-and-shrink, and not its star (rule 2).** Never bigger or smaller, never a grow or shrink flash, never flashing or rainbow colours, no stars or sparkles around the hero, no change of music or tempo, no rising "power up" notes. A hit while strong does nothing (as built), never a shrink.

Every body, hair and outfit: the stance moves only the feet and elbows, by the same amount for every body (S2.3 sizes scale it); the glow follows whatever is drawn, hair and headwear included.

Words: none new. The toast stays "Amala, gbegiri and ewedu! Super strong for 12 seconds. Smash through!" (short: "Amala, gbegiri and ewedu! Strong!").

**Tasks.**
- art: the strong stance for every body and both facings; the glow (drawn as a widened outline of the hero shape in one extra pass, no blur filter, so it stays fast); the dust thump; the dust ring; sounds "dum", "gbam", "gbe-dum".
- gamedev: give art the step events (a foot meets the ground), the amala time left (for the blink) and reduced motion. Nothing in the rules changes.
- qa done checks: 1. With amala, the hero box is still 14 x 44 and every drawn pixel stays inside the 50 u art box plus the 3 u glow. 2. The look is gone the moment amala ends or a life is lost. 3. Side by side with Mario's mushroom and star, by eye and ear: no grow, no shrink, no rainbow, no star music. 4. 60 fps on the mid phone, 45 at 4x CPU, with amala on and three smashes.

### B3. The garri shield: our own tech suit

**The idea.** Garri, sugar and epa still gives "a shield takes one hit for you". It now shows as a light suit of plates floating just off the hero's body, in our colours, with a soft hum. It replaces the round bubble outline (part 1, Power-ups).

| | Exactly |
|---|---|
| Plates | 7 plates: 2 shoulder caps, 1 chest plate (a rounded oblong with three short lines like garri grains), 2 forearm bands, 2 shin bands. Each sits 1 to 2 u off the body. Two thin frame lines join the shoulder caps to the chest plate |
| Colours | plates cream #fff8e6 with a 1.5 u ink outline #1d1a14; seams and frame lines sage green #7fc4a4 |
| Hum | the seams brighten softly once every 2 s (reduced motion: steady). Sound: a soft low hum (two sine tones, 110 and 165 Hz, 6 percent volume, a slow wobble) while worn. It follows the Sound switch and stops on pause and when the tab is hidden |
| Put on | the plates click on from the feet up in 0.4 s, "tik-tik-tik-tum" (reduced motion: all at once) |
| One hit | white crack lines on the plates for 0.1 s, then they burst into 10 cream bits (3 to 5 u) that fly out 20 to 40 u, drop and fade over 0.5 s, with a "krink" and three small "tink"s. Reduced motion: the bits fade where they are in 0.3 s. Then, as built: toast "Shield used up!", 1.2 s of blinking safety, no life lost |
| What breaks it | what used up the shield before: a tyre, drum, goat, honk, and now gutter weeds (B5). Never a bird (B1) |
| Hall | the garri parcel's shield is the same suit |

**Every body, hair and outfit.** Plates hang on the same rig points for every body and scale with S2.3's shoulder width and limb thickness. Nothing is drawn above the shoulders, so the face, every hair (Low cut, Afro, Braids, Gele, Headscarf) and grey elder hair stay fully seen. Plates sit over the outfit; on Agbada and Kaftan the forearm bands sit at the wrist over the sleeve. The hero still looks like the player, with a suit on.

**Not like any known suit (rule 2).** No helmet, no face plate, no visor; no red and gold; no round glowing light in the chest; nothing in the palms or on the feet that glows or flies; no arm cannon; no full blue body suit; no robot body; no change-over pose. It is a few light plates over the hero's own clothes.

Words: none new. Toast as built: "Garri, sugar and epa (groundnut)! A shield takes one hit for you." (short: "Garri, sugar and epa! Shield on!"); the HUD cup icon and "Shield" as built.

**Tasks.**
- art: the 7 plates and frame for every body, both facings, in the stand, walk, run, jump and rope poses; put-on; crack and 10 bits; sounds (hum, put-on, "krink", "tink"). Remove the bubble outline.
- gamedev: put-on and break events for art and sound; start and stop the hum with the shield, Sound, pause and a hidden tab; the bird rule (B1) in `touchHazards`.
- qa done checks: 1. Every body x every hair x every outfit: face and hair never covered; the plates stay inside the 50 u art box plus 2 u. 2. Sound off: no hum; paused: no hum. 3. Originality by eye against Iron Man, Mega Man and other robot or hero suits: nothing reads as one of them. 4. The break shows on a hit, and with reduced motion nothing flies.

### B4. The dash

**The idea.** Double tap forward and hold: the hero puts their head down and dashes for 2.5 s, then needs 2 s to catch their breath. A jump from a dash flies further. New, wider gaps after the bus stop on streets 2 and 3 need it.

**How to do it.**

| | Exactly |
|---|---|
| Phone | tap Forward, lift, press Forward again within 0.25 s, and keep holding. The first tap must be 0.25 s or shorter. Both presses must be new fingers on the Forward side (S2.2 "Fingers"): rocking from Back to Forward does not count |
| Keys | double tap Right arrow (or D) and hold. Key repeat never counts as a tap |
| Back | the same with Back (Left arrow, A) dashes left |
| Starts | only on the ground or a roof, or within coyote time (5 steps). In the air a double tap does nothing extra |
| Not | on corn (corn is faster already; a double tap just keeps the corn run); while resting; in Go-Slow Hall or the well room (a double tap is a normal run there); while the controls are locked |
| Turned on | the dash works from the moment the player first reaches the dash hint on street 2 (saved as `dash: true`). Before that a double tap is a normal walk, so street 1 stays exactly as tuned |

**Numbers.**

| | Value | Why |
|---|---|---|
| Dash speed | 210 u/s | Faster than a run (156), slower than corn (228). With a drum (84) coming the other way it closes at 294 u/s: 448 / 294 = 1.52 s, so the 1.5 s rule holds for every hazard. 216 or more would break it for drums |
| Getting up to speed | 1200 u/s² from whatever speed you have (from a stand: 210 in 0.18 s, about 19 u) | |
| Lasts | 2.5 s while held: about 525 u | |
| Ends | at 2.5 s, or when forward is let go, the other way is pressed, you bump a wall, lose a life, or the controls lock. On the ground it eases back to run speed at 300 u/s² if forward is still held, else stops as normal (1200 u/s², about 18 u) | |
| The jump gets longer | a jump that leaves the ground during the dash keeps the dash speed until it lands, even if the 2.5 s run out in the air (S2.2 "In the air" rule 1 already keeps take-off speed). Heights and air time are the same as every jump (full hold plus second jump: 245 u high, 1.47 s), so it lands 1.35 times further than a run jump | |
| Rest | 2.0 s from the moment the dash ends (if it ended in the air, from the landing). A double tap while resting is a normal run | |
| Run timer | after a dash the run timer counts as full, so you are running, not walking | |

How far a dash jump goes (from take-off, dt 1/60; add up to 17 u for coyote): tap 105 u, full hold 182 u, full hold then held second jump **308 u** (325 u with coyote).

**What it looks and sounds like.** The hero leans 12 degrees (more than the run), arms pumping. A dust puff at the feet every 0.1 s and three white speed lines with a thin ink edge, 18 to 30 u long, trailing behind. While resting: two small breath puffs by the mouth every 0.5 s (a shape, not a colour, says "not ready"). Start: a quick wood block "tak-tak", then fast soft footsteps; ready again: a small "tik". Reduced motion: the speed lines stand still (no flicker), one dust puff every 0.3 s. Not Sonic's spin dash (rule 2): never a ball, a spin or a blur, never revving in place; the hero always runs upright on their feet. No "zoom" or "fwoosh" sound.

**The new pit kind: the dash gap.** S2.2 "Pit sizes" gains a fifth kind, and still nothing in between:

| Kind | Width | Crossed by | Not crossed by |
|---|---|---|---|
| Dash gap | 260 u (250 to 270 if qa asks) | a dash jump plus second jump: 308 u, 18 percent slack (more with coyote) | a running jump plus second jump: 229 u, 242 u with coyote, 18 u short at best. Walking: 132 u |

Dash gap rules:
1. Only after the bus stop, on streets 2 and 3. None on street 1, none in the hall or the well room.
2. 320 u of flat, clear road straight before it (no pit, hazard, crate, food or gutter): time to double tap, reach 210 and jump. A dash started at the start of that road still has about 200 u of dash left at the lip.
3. 300 u of clear road after the far lip (no hazard or gutter): you land at speed.
4. No dash gap from a corn to corn + reach (2736 u): a corn run jump (334 u) would cross it and teach the wrong jump (as big pit rule 3).
5. Foods at least 300 u from it (the food rule).
6. Cones on both lips (as big pits), a kobo arc over it, and a sign 120 u before the left lip, worked out in code (S2.13 part 4). For a gap 250 u or wider the sign shows the hole and the two-hump path with three speed lines behind it, so it differs from the big pit sign by shape, not colour.
7. Fufu: too deep, like a big pit. A ball drops away and nothing changes.

**Gentle mode never needs the dash.** In Gentle mode every dash gap has a stack of cement blocks (the hollow blocks seen at every Lagos building site) standing in its middle at road height: 60 u wide, solid. So the gap is two wide potholes of 100 u, each crossed by a walking jump plus second jump (139 u with coyote, 39 percent slack). Worked out in code from the gap (left lip + 100 to + 160), no level data. One dash sign only (no second sign for the far half). Climb-out (S2.13 part 5) works for each half: 100 u before the left lip for the near half; for the far half that point is in the gap, so the rule's own fallback puts you in the middle of the blocks (30 u of block on each side). The dash still works in Gentle mode; it is just never needed.

**Where the dash gaps go.**

Street 2, Computer Village (src/data/levels/lagos-2.json), changes to the S2.14 layout. The lesson comes after big pit 1 and a goat, before the corn crate (7300):

| Field | Change |
|---|---|
| `ground` | S2.14's `[5970, 6750], [6850, 7700]` becomes `[5970, 6700], [6960, 7700]`: S2.14's new wide pothole at 6750 is replaced by a dash gap from 6700 to 6960 |
| `hazards` | `["goat", 6300]` becomes `["goat", 6200]` (230 u after the big pit's far lip, 5970); S2.14's `["tyre", 6550]` is removed (it stood in the lesson road); S2.14's `["goat", 7050]` becomes `["goat", 7450]` (490 u after the far lip) |
| `platforms` | `[7050, 240, 140]` becomes `[7430, 240, 140]` (the roof moves with its goat) |
| `kobo` | remove S2.14's arc `[6760, 220, 2], [6800, 170, 2], [6840, 220, 2]`; `[7065, 216, 5]` becomes `[7445, 216, 5]`; add a road trail `[6420, 276, 3], [6560, 276, 3]` and the dash arc `[6710, 220, 2], [6770, 160, 2], [6830, 130, 2], [6890, 160, 2]` |
| `hints` | add `[6300, "Double tap {forward} and hold to dash!"]` and `[6480, "Dash, then jump twice!"]` |

Checks: clear road 6300 to 6700 (400 u; rule 2 needs 320); landing road 6960 to 7260 clear; the corn crate at 7300 is 340 u past the far lip (food rule) and comes after the gap (rule 4); sign at 6580; Gentle blocks 6800 to 6860; climb-out points 6600 and 6830.

Street 3, Ikeja (src/data/levels/lagos-3.json): the wide pothole at 10900 becomes a dash gap. The corn crate is at 7500, so corn + reach is 10236 and the gap is past it (rule 4).

| Field | Change |
|---|---|
| `ground` | `[8660, 10900], [11000, 11800]` becomes `[8660, 10900], [11160, 11800]` (dash gap 10900 to 11160) |
| `hazards` | `["goat", 10500]` becomes `["goat", 10450]`; `["goat", 10650]` becomes `["goat", 10550]` (both left of the 320 u lesson road, 10580 to 10900; goats walk left, away from it) |
| `kobo` | `[10890, 220, 2], [10935, 170, 2], [10985, 220, 2]` become `[10910, 220, 2], [10970, 160, 2], [11030, 130, 2], [11090, 160, 2]` |
| `hints` | add `[10600, "Dash gap! Dash, then jump twice."]` |

Checks: landing road 11160 to 11460 clear (the bus starts at end.x - 40 = 11460); the sign stays at 10780; Gentle blocks 11000 to 11060; climb-out points 10800 and 11030.

**Words.** All 35 characters or fewer with the markers filled in; touch and keys the same ({forward} shows →).

| When | Words |
|---|---|
| Street 2, x 6300 (the lesson) | "Double tap → and hold to dash!" |
| Street 2, x 6480 | "Dash, then jump twice!" |
| Street 3, x 10600 | "Dash gap! Dash, then jump twice." |
| Gentle mode, in place of either of the last two (`GENTLE_HINTS`) | "Dash, or hop over the blocks." |
| The first double tap while resting, once per play | "Catch your breath! Dash again soon." |
| Gentle climb-out after a dash gap | "Up you come! Jump, then jump again." (the wide pothole words: with the blocks it is two wide potholes) |

How to play words on the title: unchanged (the dash is taught where it is needed).

**Tasks.**
- art: the dash pose for every body, both facings (2 frames); speed lines; dust; breath puffs; the cement block stack (Gentle); the dash sign; sounds "tak-tak", fast steps, "tik".
- gamedev: double tap detection (src/engine/input.ts for keys, src/screens/controls.ts for touch, with the timings above); the dash in src/engine/physics.ts (`dashSpeed: 210`, `dashAccel: 1200`, `dashSteps: secs(2.5)`, `dashRestSteps: secs(2)`) and src/game/run.ts (not on corn, not in the hall or the room, the `dash` save flag set at street 2's lesson hint); pit kind `dash` for 250 to 270 u (src/game/pits.ts); the Gentle blocks; the dash sign; the street changes; hints and `GENTLE_HINTS`.
- Tests: a dash jump plus second jump lands 308 u from take-off (within 3 u); a run jump plus second jump cannot cross 260 u, coyote included; every dash gap has 320 u clear before and 300 u after, is after the bus stop and outside corn reach, and food is 300 u away; Gentle blocks make two 100 u gaps; the rest blocks a dash for 2 s; no dash on corn, in the hall, or before the save flag; dash plus drum closing time 1.5 s or more on the 560 u view.
- qa done checks: 1. Double tap and hold works on a phone with one thumb, and with the keys; a single tap or a rock from Back to Forward never dashes. 2. First-timers cross street 2's dash gap within 3 tries of its hint, and still clear each street in 3 tries or fewer. 3. Gentle mode: both streets cleared without ever dashing. 4. Reduced motion: no flicker. 5. Originality: nothing reads as Sonic's spin dash.

If first-timers need more than 3 tries at a dash gap, tune in this order: gap 260 to 250; rest 2.0 to 1.5 s; dash 2.5 to 3.0 s. Never raise the dash speed past 212 (the drum rule).

### B5. Open gutters with thorny weeds (streets 2 and 3)

**The idea.** An open gutter crosses the road, choked with still, thorny weeds. Touch the weeds and you lose a life. Jump right over, or throw a hot pepper fufu ball: the weeds dry up and the gutter is safe to cross for the rest of that play.

| | Exactly |
|---|---|
| Gutter | a shallow concrete channel across the road with a thin line of dark water. The hero's feet stay at road height across it: it is never a hole, never a pit, and you never fall in. Not a pit kind, so no sign and no climb-out |
| Weeds | fill the gutter from edge to edge: the weed box is the gutter's width x 18 u tall (y 282 to 300). Still, spiky clumps: dark green #2f6b2a with cream thorn tips |
| Widths | two kinds only, learnable by eye: **short gutter 30 u**, **long gutter 44 u** |
| Jumping over | you must be above 18 u for the width + 14 u. Short: 44 u, done by a walking hold (70 u, 59 percent slack) or a running tap (62 u). Long: 58 u, done by a walking hold (70 u, 21 percent slack) or a running hold (122 u). A walking tap (36 u) clears neither |
| Touch | from the side or from above: **you lose a life** (1.7 s of blinking safety). Never a bounce: thorns. With the tech suit on: the suit breaks instead (B3). With amala: the weeds are trampled flat and safe, no life lost |
| Fufu | a ball that lands on or rolls into the weeds stops there: the weeds dry up in 0.5 s (they turn straw brown #9a7b5a and lie flat, 4 u high), with a soft "fsss" and a small steam puff. One ball clears one gutter. Dried weeds are safe for the rest of this play of the street, also after a lost life (like plugged potholes) |
| Other hazards | tyres and drums roll across a gutter (drawn in front of the weeds); goats turn back at its edge; birds are never placed at one |

**Never alive (rule 2: unlike a piranha plant).** The weeds never move: no sway, no bob, no growing, no popping up or down, no mouth, no teeth, no head, no face, no bulb, no stem, no pot and no pipe. They look the same in every frame, with or without reduced motion. They are plants in a drain, nothing more.

**Spacing rules.** Gutters stand still, so the 1.5 s rule is met at any speed (448 / 228 = 1.96 s). Also:
1. At least 200 u from any pit lip.
2. At least 300 u from any food (so nobody jumps over a food by accident).
3. Never in a corn fast stretch, a big pit run-up (160 u), a dash gap run-up (320 u) or its landing road (300 u).
4. Never on the spawn, the bus stop, a well or the bus.
5. The first gutter of the game is a short one, alone, with a hint.
6. Two kobo in the air over each gutter, at y 236.

**Where they go.**

| Street | Gutter (left edge, width) | Changes | Checks |
|---|---|---|---|
| 2, Computer Village | short, 800, 30 (the lesson) | add kobo `[803, 236, 2]`; hint `[650, "Thorny weeds! Jump right over them."]` | The calmest place in the game: the warm-up, after the kobo crate at 600 and before the roof crates. It is the one change before a bus stop in S2.14 to S2.16: the easiest thing to jump, and a touch costs a life without sending you back |
| 2 | long, 9050, 44 | replaces `["goat", 9100]`; add kobo `[9060, 236, 2]` | 206 u before S2.14's wide pothole (9300); after the fast stretch (ends 8668); amala at 9700 is 606 u away |
| 3, Ikeja | long, 6150, 44 | add kobo `[6160, 236, 2]` | 350 u after the fufu (5800), so players can try a ball on it; 680 u from big pit 1, 356 u from the wide pothole at 6550; between goat 6000 and drum 6300 |
| 3 | short, 9300, 30 | replaces `["goat", 9300]`; add kobo `[9303, 236, 2]` | 640 u from the hold pothole (8660); after the fast stretch (8868); amala at 9950 is 620 u away |

Level data: new field `gutters`: `[[left x, width]]`. Street 2: `[[800, 30], [9050, 44]]`. Street 3: `[[6150, 44], [9300, 30]]`. The level test checks every width is 30 or 44 and every spacing rule above.

**Words.** Hint (street 2, x 650): "Thorny weeds! Jump right over them." (35 characters). Toast the first time weeds dry up in a play: "The weeds dried up! Safe to cross." (34 characters).

**Tasks.**
- art: the gutter, the weeds and the dried weeds (our own; no motion at all), the steam puff, "fsss" in src/engine/sound.ts.
- gamedev: `gutters` in src/game/level.ts; weed boxes in src/game/run.ts (a touch costs a life or the suit; amala tramples them; dried weeds stay dried after a lost life); fufu meets weeds in src/game/fufu.ts; goats turn back at a gutter; the street changes; hint and toast in src/screens/words.ts; level tests.
- qa done checks: 1. Nothing about the weeds moves, ever; side by side with a piranha plant by eye: nothing alike. 2. A walking hold clears a long gutter; a walking tap touches a short one. 3. One fufu ball clears a gutter, and it stays safe after a lost life. 4. Streets 2 and 3 still cleared by a first-timer in 3 tries or fewer.

### Street totals after S2.16 (S2.14 and S2.15 counted)

| | Street 2 | Street 3 |
|---|---|---|
| Hazards | 9 (S2.14's 11, minus the tyre at 6550 and the goat at 9100) | 16 (S2.14's 14, plus 3 birds, minus the goat at 9300) |
| Gutters | 2 | 2 |
| Dash gaps | 1 (in place of S2.14's wide pothole at 6750) | 1 (in place of the wide pothole at 10900) |
| Loose kobo | +12 on S2.14 (trail 6, arc 8, gutters 4, minus S2.14's arc 6) | +6 (arc 8 minus 6, gutters 4) |
| Hints | 4 + 3 = 7 | 2 + 2 = 4 |

If first-timers need more than 3 tries on street 3, take back in this order (before S2.14's list): the crow at 8960; the egret at 10050; the short gutter at 9300.
