# Gbese!: design notes

Owner: designer. World is 360 units tall; road top at y = 300 (y grows downward). Feel reference: docs/prototype.html.

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
