# Open questions for the product owner

## po note, 8 Nov 2026 (read this first): Tp answered Q16 to Q25

Accepted: nothing new in this note (L was accepted earlier today, see L4 below).
Answered: Q16 to Q21 and Q23 to Q25 confirmed as recommended. Q22 answered differently: real, popular Lagos names.
Waiting for Tp: only pasting the lines into docs/decisions.md (lines 5, 6, the "wrong premise" line, 7 to 15, and new 16 to 21 below). Recommendation: paste them as written. Nothing else waits on Tp.
Moving now: designer picks the three street names under the Q22 rule below; po checks them before gamedev puts them in.

## Answered by Tp in chat, 8 Nov 2026

Tp's exact words: "All answers are Ok. The only one is the street name. We should use popular ones,"

- Q16 regions, states and streets: **confirmed, option a.** World 1 in version 1 is Lagos: 3 streets, then Go-Slow Hall. Already built that way (K).
- Q17 progress picture: **confirmed, option c.** The Nigeria wheel now, a map when there is more than one region.
- Q18 auto-run: **confirmed, option a.** No auto-run anywhere, gentle mode too. Gentle mode stays 5 lives.
- Q19 the well gift: **confirmed, option a.** A garri parcel carried to Go-Slow Hall; the fight starts with the shield on. One parcel at a time, no stacking, and the boss stays beatable without it.
- Q20 hair and outfits: **confirmed, option a.** All open to every hero; the first look picked for you fits the choice.
- Q21 the building's name: **confirmed, option a.** "Go-Slow Hall". Never "temple" or any holy word in player words.
- Q22 street names: **answered differently.** Tp wants popular, real Lagos names, not made-up ones. Designer is choosing the names now, under the rule below.
- Q23 parcel strength: **confirmed.** The parcel starts every hall try with the shield on, until the hall is cleared.
- Q24 left-handed players: **confirmed.** A "Swap sides" switch comes in slice 3, after testers try the layout.
- Q25 elder look: **confirmed.** No walking stick; elder men have a short, neat grey beard. "Elder" stays the row word.

Nothing already built has to change except the street names and the cleared-screen line (Q22). Everything else was built with these answers.

### Q22 rule for choosing real street names (po, under CLAUDE.md rules 3 and 4)

Designer picks the names; po checks each one against this list before gamedev puts it in.
1. Popular: a name most Lagos teens would know at once (a busy market, area, road or bus stop). Spread them across Lagos, mainland and island, so no one part carries all the problems.
2. No street named after a real person. Not Awolowo Road, Herbert Macaulay Way, Adeola Odeku or Allen Avenue. Many Lagos roads honour people, so check where every name comes from; if a name is a person, a family or a ruler's title, or if you are not sure, skip it.
3. No name that is a faith body or a holy place. Reasoned example: CMS (it stands for a church mission). Check the meaning of each name.
4. No area shown as broken or to blame. The go-slow, potholes and power cuts are the same everyday problems on every street. No sign, hint or line says the place itself is bad, dirty, dangerous or behind. No jokes about a place's name, its people or how they talk.
5. The cleared-screen words must not say a real place "is fixed", "works now" or anything that mocks it. They praise the run and the place. po suggestion for designer: "Street cleared!" then "Great run through {street name}! You got {kobo} kobo." This replaces "{street name} is fixed." (design S2.10). "Lagos is switched on!" on the hall win stays: every state switches on the same way (R0).
6. Names only. Drawings stay our own style: no real landmark, government building, church or mosque drawn to look real, no brands, no real shop names. The made-up shop signs (VULCANIZER, SUYA SPOT, BUKA) stay.
7. Spelled the way Lagos people write it. Short enough to fit the Streets cards and the cleared screen at 320 x 240.

Who does what:
- designer: three names (street 1 may keep "Your street" only if designer gives a reason; po leans to a real name for all three, to match Tp's words), the new cleared line, and docs/design.md S2.6, S2.10 and the Streets card words.
- po: check the names against the rule above, then pass them to gamedev.
- gamedev: put the names and the cleared line in with N2, which already owns the S2.10 screen words (level files from K2, cards from N1).
- pm: add this to N2's task line and update the Q22 row in docs/plan.md.
- qa (N3): every street name and the cleared line, on the smallest screen.

Blocks: nothing. The made-up names stay until designer's names pass po.

## Slice 2 requests from Tp, 7 Nov 2026

### po acceptance note, 8 Nov 2026: slice 2 piece M (M4)

**Accepted** on branch gamedev/s2-m2-hall (at 14f6b78): the Go-Slow Hall fight from lagos-hall.json, entered by "Go to Go-Slow Hall" after street 3. The attack pose, high honks from light 3, three lit-light hits, the kind finish (doors, cars out, lamps, cones, arrows), the win words "Lagos is switched on!", the hall game over "General Go-Slow is still jamming the hall. Try again!", one parcel shield on every hall try (Q23), and w1-l1, the road boss and the slice 1 specs retired. No fix round: every small bug below lands in N2, which rebuilds the same Win, game over, HUD and Pause code anyway.

Tp's request, checked honestly: "Fighting the boss should be in the bosses temple not still on the road".
- In the boss's own building, not on the road: **met** (verified on qa's shots a02, a07 and a10). The hero walks into a roofed motor park with roof beams, 8 roof lamps, floor arrows, a cone line and the jam behind it; the three lights stand inside. No road fight is left in the game (w1-l1 is gone).
- "Temple": **met the way Q21 recommends.** The building is "Go-Slow Hall"; "temple" is in no word a player sees (verified in src/screens/words.ts). No dome, tower, cross, crescent or carved figure in the shots.
- The parcel helps in the fight: **met within one sitting** (verified on shot a02: "Your garri parcel: the shield is on!" and the Shield chip; qa reports the shield takes exactly one hit). It is lost when the page closes until N2 saves it.

Why:
1. qa passed M3 (reported): tsc clean, 536/536 unit, build OK, first load 285.7 KB (limit 3 MB), 120/120 e2e, worst hall part 56.7 fps median at 4x CPU (bar 45). Hand play at 932 x 430, 320 x 240, 568 x 230 and 480 x 200, by keys and with reduced motion; pause, turning the phone and app switch; offline with no network calls; the S2.7 safe places hold; taps in the finish are ignored.
2. Matches S2.7 (verified on the shots): the left light lit first with "GO" and an arrow, the hit circles fill with ticks, a high honk "PEEP!" hits a hero on the right light (a07) while the low "POOO!" is a different shape, and the hall ends with lamps on and cars gone (a10, behind the card).
3. Originality and respect (verified on the shots): our own motor park, made-up sign, the same grumpy traffic light on a heap of cars as slice 1. No castle, pipe, flagpole or any game's look. The boss is a problem, not a person; nobody is hurt.
4. Plain, warm words (verified in words.ts): "1 life left" is handled; the win, game over and toast lines match S2.10 word for word.

qa's small bugs, decided (all **N2**, none blocks M):
1. Win and game over cards overflow on short screens (640 x 200, 480 x 200, 320 x 240; Home is below the edge but can be scrolled to): **N2.** N2 rebuilds the Win card with more on it (the cog line, "See Nigeria's wheel", "Play again", "Streets"), so fixing the layout now means doing it twice. Done looks like: at 320 x 240, 480 x 200 and 640 x 200 every line and every button of the Win and both game over cards shows without scrolling; the small buttons sit in one row (qa's idea); 44 x 44 px stays the button floor.
2. At 320 px the HUD shield chip covers the top of the hit counter: **N2**, with the HUD work it already owns. Part of the fix (po ruling): the Kobo chip is not shown in the hall, since there is nothing to collect there (see the kobo ruling); that frees room. Done looks like: the three hit circles are never covered at any width down to 320 px with every hall chip shown (lives, shield).
3. P and Escape do not pause, though S2.2's key table says they do: **N2**, together with its Pause rebuild (task line c). Done looks like: P and Escape pause in play and in the hall, and resume from Pause; they do nothing in the finish or on a card. M comes with O2.
4. Nothing has keyboard focus when the Win screen opens: **N2.** Done looks like: every card that opens (Win, both game overs, Street cleared, Pause) puts focus on its big button, so Space or Enter presses it. qa N3 checks it with the S2.11 list.
Why not P for any of these: P should find nothing new, and N2 touches each of these exact screens.

qa's questions, decided:
- **The kobo words: drop the kobo part, for good.** Win line from N2 on: "You cleared General Go-Slow with {lives} lives left." ("1 life left" when one.) Until N2 the build says "with 0 kobo"; Tp, please ignore that number. Why (reasoned): the hall has no kobo, so any number here is either always 0 or a total the kid did not earn in this fight; a total also changes meaning with replays (best? sum?). Kobo already has its home on the Street cleared screen and the Streets cards ("Best: {best} kobo"). Lives left is the number this fight earned. Opinion: a winner should never read "0" at the big moment. Also hide the Kobo chip in the hall HUD (above). designer: update S2.10 (Win row and HUD row) to match. gamedev: N2 task line.
- **Difficulty: tune in P2, not now.** It is too easy (reported: bots win in 6 to 7 s with 3 presses and meet almost no throws), but beatable is the M3 bar and it is met; the hall music that marks each phase (O2) is not in yet, and P2 is where designer plays the whole slice for tuning. Aim for P2 (opinion, designer decides how): a first-time player meets at least two throws in each phase and sees a high honk before the third hit; a first win takes about 30 to 60 s; still clearable in 3 tries. Suggested first lever: the next light comes on later after a hit (for example with the phase's second throw), not faster throws, so the fight gets longer without getting meaner. S2.7's tuning order is for "too hard" and stays as it is. pm: add this to P2's line, and to P3's first-timer check.
- **"General": no question for Tp.** The name is Tp's own, in the brief (Worlds, item 1), and po cannot change the brief. "Go-slow" is everyday Nigerian English for a traffic jam, and the boss is plainly a heap of cars under a traffic light (verified on the shots): no uniform, cap, medals, rank badge, salute or march. The guard that keeps it a joke at traffic, not at soldiers: no military look, words or sounds, ever (art and designer, qa in P3). po already steered away from "Go-Slow HQ" (Q21 b) for this reason. FYI line for Tp below, not a blocker.
- **The sign inside, over the left door (S2.7 says outside): keep it.** Verified on a02: it sits on the inside wall above the door the hero came in by, the only wall a player sees, and reads clearly. Outside would never be on screen. designer: change S2.7 to "On the inside wall, over the left door, a sign 'GO-SLOW HALL'."

For Tp:
- Please play Lagos on your phone: street 3, "Go to Go-Slow Hall", with and without the garri parcel. The fight is now in Go-Slow Hall. Two things you will see and can ignore: "with 0 kobo" on the win screen (gone in N2), and the parcel being lost if you close the page (saved in N2). Tell us if the fight felt too easy; we plan to make it last longer in P.
- FYI, no answer needed: the boss keeps your name "General Go-Slow". We keep him a heap of cars with a traffic light face, never a soldier, so no one reads it as a jab at the military. Tell us only if you want a different name.

### po acceptance note, 8 Nov 2026: slice 2 piece L (L4)

**Accepted** on branch gamedev/s2-l2-wells (at 98c30fd): the wells and the underground gift room. Go down and Go up buttons and keys, the street frozen while the hero is below, the room with 14 kobo, a kobo crate worth 3 and the garri parcel, the HUD chip "Parcel", the way back up with 1 s of safety, a room that stays as you left it on a second visit, and the parcel kept after a lost life and lost on game over, Start again or Home. Includes the L3 fixes: the HUD stays one row down to 320 px (942c649), a well press never presses the button under it (c142925), and the toast "Garri parcel! Keep it safe." (23490c0).

Tp's request, checked honestly: "enter a well to an underground and win some gifts that help me fight the boss".
- Enter a well to an underground: **met** (verified on qa's shots a02, a03, a05 and h-320x236-2). A stone well with a small roof, a crank and a bucket; the hero goes down and comes up by the rope. A dry, lamp-lit store room with earth walls, clay pots, woven baskets and shelves. No water, no pipe.
- Win some gifts: **met** (verified on shot h-320x236-2: 3 kobo from the street, then 14 room kobo and the crate's 3 make Kobo 20, with the parcel chip on).
- That help me fight the boss: **not yet, and that is planned.** Today the parcel lives only for one street. The shield at the hall start comes with M2 (Go-Slow Hall), and carrying the parcel from a street to the hall comes with N2 (saving). Until both are in, the parcel does nothing in a fight. That is why the toast says only "Keep it safe." and makes no promise. Tp should not expect the boss help when playing this build.

Why:
1. qa passed L3b (reported): tsc clean, 512/512 unit, build OK, first load 269.5 KB (limit 3 MB); full e2e 121/121; timing 42/42 and perf 7/7 at 57.7 to 60 fps at 4x CPU (bar 45). Hand play at 320 x 236, 320 x 240, 340 x 240, 350 x 240, 400 x 240 and 932 x 430, and with reduced motion: Pause never opened from Go up; the HUD stayed one row with every chip at 12 widths; turning the phone, resizing, keys and mouse, the screen reader and no network all passed; every first-round L3 check still passes.
2. The L3 bug is fixed (reported by qa, and the cause verified in src/screens/controls.ts): the well button acts on pointerdown and hides, so the phone's follow-up click fell on Pause. Its touches now cancel that click, and for 400 ms any other tap click is dropped. Keys are not affected.
3. Design S2.5 rules (reported by qa, checked against the plan's L2 line): going down is a choice and skipping it never blocks the street; the street waits while you are below; you come up with safety and hazards cleared; a lost life keeps the parcel, game over loses it.
4. Originality (verified on the shots): our own village well and store room, never a pipe, green tube, blue bricks or any game's underground. Signs are made up. Nothing looks like Mario or any Nintendo game.
5. Plain words (verified in src/screens/words.ts): "Go down", "Go up", "A secret room! Grab the kobo. Stand under the rope to go back up.", "Garri parcel! Keep it safe.", "Parcel". Clear for a 10 year old, and no promise the build cannot keep.
6. Privacy and size (reported, spot-checked in the branch diff): no network call added, no photo, no account; the build grew only 17 KB.

qa's notes, decided:
- (1) The toast line in my c4e538d ruling: **corrected.** Verified on shot d-320x236-03-room-parcel: at 320 x 236 the toast wraps to four short lines ("Garri / parcel! / Keep it / safe.") in the yellow bar, readable, nothing clipped. Corrected line, now in that ruling: "It fits every bar with no short words: one line on wide bars, and at 320 x 236 it wraps to four short lines of 12 px words in the 78 px bar, which design S2.2 allows; nothing is clipped." The same goes for the N2 words, "Garri parcel! Shield for the hall.", fixed in the same ruling. gamedev changes nothing.
- (2) A second-finger tap on Pause or Sound does nothing while a thumb holds Forward or Jump: **a real bug, small, fix in N2. Not blocking L.** It came before L. Why a bug and not polish: a player on a cheap phone who sees a goat coming, or hears the phone ring, keeps a thumb on Forward and taps Pause with the other hand; the button looks ready and does nothing, which feels broken. Why not now: there is a workaround (lift the thumb), and switching apps or a call already pauses the game by itself (tested in H and J). Why N2: N2 already rebuilds the Pause screen and its words, so the HUD buttons get fixed and tested once, together (qa N3, with the S2.11 accessibility list). Not P: P should find nothing new. What done looks like: Pause and Sound act on a second-finger tap while Forward or Jump is held; one press does one thing (Sound must never switch twice from a pointer event plus a click); a press that opens Pause never also presses what appears under it (the same guard as the well button); keys and screen readers still work. pm: please add this to N2's task line, with an e2e that holds Forward and taps Pause.
- (3) design.md for the HUD steps and the toast stages: **designer, please do it** with the c4e538d toast work: S2.10 HUD (icon only, then smaller, then a coin icon for the word Kobo, words kept for screen readers) and the two toast stages. Not blocking L.

For Tp: nothing new to decide. Q19 and Q23 (the well gift and how strong it is) still wait, built with my recommended answers: a garri parcel that starts every Go-Slow Hall try with the shield on. Please play street 2 or 3 on your phone, go down a well and pick up the parcel. It helps in the boss fight only after M2 and N2.

### po ruling, 8 Nov 2026: piece L parcel toast and the Go up button (from qa L3)

Not an acceptance. L still waits for gamedev's narrow-screen fix and qa's re-test. These rulings go into that same fix round.

**(1) The parcel toast words.**
- Now (until N2 lands): **"Garri parcel! Keep it safe."** (27 characters). It fits every bar with no short words: one line on wide bars, and at 320 x 236 it wraps to four short lines of 12 px words in the 78 px bar, which design S2.2 allows; nothing is clipped. (Wording corrected in the L4 note, 8 Nov 2026; it said "one line on every bar", which qa found is not true at 320 x 236.)
- From N2 on: **"Garri parcel! Shield for the hall."** (34 characters). It is the short form already in the table and fits the narrowest bar (78 px at 320 x 240) as short wrapped lines, so one string serves every screen and the short-words row goes away.
- Switch it in N2, not M2. N2 owns all S2.10 words, and the promise only comes true when both are in: M2 gives the shield at the hall start, N2 carries the parcel from a street to the hall. With M2 alone, every street is still a new run and the parcel never reaches the hall.

Why:
1. The interim words must not promise. Verified in src/screens/words.ts and the plan: today the parcel is lost when the street ends and the hall is still the slice 1 boss, so "Your shield will be on when the Go-Slow Hall fight starts" is not true in any build before N2. Tp plays these builds on a phone; a kid (or Tp) who carries the parcel to the boss and gets no shield learns the game breaks its word. "Keep it safe" is true today: a lost life keeps it, game over loses it (S2.5 gift rules 2 and 3).
2. The old words are too long (73 characters, two lines, the longest toast in the game) and say "Go-Slow Hall fight starts" when a kid only needs "this is a shield for later". The details are said again where they matter: the cleared screen "Your garri parcel is saved for Go-Slow Hall." (N2) and the hall toast "Your garri parcel: the shield is on!" (M2). Opinion: the short pickup line plus those two lines teach it better than one long line.
3. Plain test (reasoned): "Keep it safe" and "Shield for the hall" are words a 10 year old reads in one glance mid-jump. By N2 the player has seen "Go-Slow Hall" on the Streets card and the street 3 button, so "the hall" is known.

Who does what:
- gamedev (L fix round): WORDS.toast.parcel = "Garri parcel! Keep it safe."; drop its row from the short-words map (it is under 36 characters); update tests/unit/well.test.ts lines 304 and 305 and any e2e that reads the toast.
- designer: update docs/design.md in three places to show both stages: S2.2 short-words table (remove the parcel row), S2.5 "The gift" item 1, and the S2.10 list of toasts. Note "until N2" and "from N2".
- pm: add the switch to N2's task line: parcel toast becomes "Garri parcel! Shield for the hall."; qa N3 checks it.

**(2) Go up button over a kobo above shelf 3 at 932 x 430: fine, no change.**
Why (reasoned from design S2.2 and S2.5 and lagos-well.json): the button shows only while the hero stands at the rope (x 480 to 520), which is the moment the player is leaving. The kobo row over shelf 3 (x 415 to 463, y 216) is seen in full on the way there, and the button is 35 percent see-through, so the coin is still visible behind it. Stepping left out of the zone hides the button at once. Kobo are picked up by the hero's body, not by a tap, so nothing a player wants to press is lost. The "nothing collectable under it" rule is the hint bar's rule (S2.2), not the buttons'. If qa sees a kobo fully hidden on any tested size, designer moves that kobo, not the button: the button's place over the bucket is what tells the player "this is the way up".

Note on references: the parcel is Q19 (and Q23, parcel strength), not Q17 (the wheel). Q19 and Q23 still wait for Tp; these words fit the recommended answers (a parcel that starts every hall try with the shield on). If Tp picks "only the next try" for Q23, the N2 words still hold.

For Tp: nothing new to decide here.

### po acceptance note, 8 Nov 2026: slice 2 piece K (K4)

**Accepted** on branch gamedev/s2-k2-streets (at d56959b): Street 2 (Market road) and Street 3 (Bus park road) drawn by theme with art's K1 pieces, the rolling drum, wells as scenery only until L2, the Street cleared screen with "Next street" (and "Go to Go-Slow Hall" after street 3), and the level rule test for all three streets.

Why:
1. qa passed K3 (reported): tsc clean, 462/462 unit, build OK, first load 252.7 KB (limit 3 MB); full e2e 107/107; 4x slow phone worst part 57.7 / 58.1 / 57.8 fps on streets 1 / 2 / 3 (bar 45). Hand play: every crate, the big pits, the drum jumped, bounced and smashed (+2 kobo), lives lost and restart, pause restart, the cleared screen, the 0.4 s tap guard, the secret well; four short screens under 238 px; the hint bar covers nothing and every hint is 35 characters or fewer; no network request after load.
2. Tp's R7 is met for version 1 (verified in src/main.ts and the level files): Lagos has three streets, each ending on the yellow bus, then the boss. Street 3's big button says "Go to Go-Slow Hall"; the slice 1 boss stands in for the hall until M. That is "many streets, then the region's boss", built as Q16's recommended answer.
3. "Fix", never "conquer" (verified): the cleared screen says "Market road is fixed. You got 113 kobo." (qa shot A). No "conquer", "defeat", "backward" or "underdeveloped" in any word a player sees; "defeat" appears only in code names.
4. Matches design S2.6 and S2.10 (verified in code): street names "Your street", "Market road", "Bus park road"; drum 84 u/s, bounce, sparkle, amala smash +2; heading "Street cleared!" and the line, word for word. Each street starts with full lives and 0 kobo, nothing saved yet (N2).
5. Originality and respect (verified on qa's shots B and C, reported for the rest): a stone well with a bucket and a small roof, never a pipe; a plain blue drum with no writing; made-up signs (VULCANIZER, SUYA SPOT, TICKETS, BATTERY CHARGING, BUKA). Yellow buses and a bus park finish, never a flagpole or castle. Proud Lagos, no brands, no real places.
6. Wells stay quiet until L2 (verified in src/game/features.ts): the "A well! ... Press {down}." hint is tagged "wells" and hidden, so no first-timer is told to press a button that is not there.

qa's three word gaps, decided (all go to N2, which owns "all S2.10 screen words"; none blocks K):
- (1) Pause says "Keep running / Start the level again": **fix in N2** to "Keep playing", "Start again", "Streets", "Home", with the Sound and Music switches (Music comes with O). "Keep running" is wrong now that nothing runs by itself.
- (2) Game over says "The road is still here": **fix in N2** to "The street is still here." One word, but it sits with the other screen words, so it changes once, together.
- (3) Cleared screen shows "Home" instead of "Streets": **keep Home until N2.** There is no Streets screen yet, and since nothing is saved, Home loses nothing. N2 swaps it to "Streets".
- Also for M/N2 (po's own find): the win screen after the stand-in boss still says the slice 1 "Road cleared!". S2.10 wants "Lagos is switched on!". Fix in M or N2, wherever the hall's win lands first.

qa's untested items, decided:
- (a) Real first-timers in 3 tries or fewer: **waits for Tp's own phone test**, with qa's P3 fresh play as a stand-in. It needs real new players, and Tp is the first one we have. If streets 2 or 3 need more than 3 tries, designer picks the tuning order (S2.6 gives one only for street 1; po suggests big pits 170 to 160 first, then one hazard fewer in street 3's goat, tyre, drum group at 3700 to 4250, which is the hardest part before its bus stop). Not blocking K: the layouts match S2.6, and a fall after a bus stop costs only a few seconds.
- (b) Listening to the drum sounds for originality: **P3** (qa's R8 review of every new sound). art K1 made them as our own; reported, not yet heard by qa.
- (c) Offline for streets 2 and 3 alone: **enough for K.** Verified: lagos-2 and lagos-3 are imported into the main bundle (src/main.ts), so they are cached with it, and the whole-bundle offline e2e passed. P1/P3 re-check offline by hand.
- (d) Turning the phone or switching apps on streets 2 and 3: **P3.** The pause code is shared by all streets and qa tested it on street 1 in H and J. Reasoned, low risk.
- (e) Keyboard play on streets 2 and 3: **P3.** Same keys code as street 1, tested in H.

For Tp: nothing new to decide. Q16 to Q25 still wait, built with my recommended answers; K builds Q16 option a (Lagos, 3 streets, then the hall). Please play streets 2 and 3 on your phone when you can and tell us if any took more than 3 tries.

### po acceptance note, 8 Nov 2026: slice 2 piece J (J4)

**Accepted** on branch gamedev/s2-j2-crates (at fbc303d): hanging market crates you knock from below, with kobo and food inside, switched on for the Lagos streets, plus the test runner split (parallel, then timing one at a time, then frame rate).

Why:
1. qa passed J3 (reported): tsc clean, 429/429 unit, build OK, first load 248 KB (limit 3 MB); full e2e 96/96; 4x slow phone worst part 57.9 fps (bar 45). Hand play at 932 x 430 (4x CPU, and reduced motion) and 480 x 230: crates open only from below, kobo crates give 3, the garri crate gives the shield, empty crates stay empty, after a lost life food crates fill again and kobo crates stay open, app switch and turning the phone are fine.
2. Tp's R5 is met (verified in src/game/crates.ts and design S2.4): coins and foods inside boxes you hit from below. The head-hit rule, the push down, amala opening from any side, 3 kobo per kobo crate, food that drops straight down and never into a pit, empty crates that stay open, all as S2.4 says.
3. Originality (verified on qa's 932 x 430 shot, reported for the rest): pale wooden slat crates hanging on a rope line between wooden poles, a coin stamp on the front, lids hanging open when empty. No "?" or "!", no gold, no rivets, no bricks; our own "tok" and rope creak. It plays like other runners but looks like a Lagos street.
4. Plain words (verified in the level files, matching design S2.2): "Crate! Jump up under it.", "Food in this crate! Knock it.", "High crate? Jump from the roof." Short and clear for a 10 year old.
5. Brief Done when 3 and 5 (reported): all three foods still work, now also from crates; offline on the second visit still passes.

qa's notes, decided:
- (a) Hair overlaps the crate's bottom by a few pixels at the head stop: **keep.** The hit uses the head line (feet y - 44), and design S2.3 does not count hair or headwear in the hero's height, so tall hair, an afro or a gele will touch a little first. On a small screen it reads as the hero's head meeting the crate, which is what the player should feel. No change. Reasoned.
- (b) The well-room crate is untested: **test in L**, where the room is built. Not part of J.
- (c) Offline on the second visit covered only by the existing e2e: **enough for J.** Crates add no files to fetch and no network call. qa re-checks offline by hand at the slice end.

For Tp: nothing new to decide. Q16 to Q25 still wait, built with my recommended answers. The crates line (number 11 in "Lines for Tp to copy into docs/decisions.md") still waits for Tp to paste; recommend pasting it as written, since the built crates match it.

### po acceptance note, 7 Nov 2026: slice 2 piece I (I4)

**Accepted** on branch gamedev/s2-i2-builder (at c70791a): Male and Female heroes at Teen, Adult and Elder, the two new builder rows, defaults that follow the picks, the saved look with body and age, old slice 1 looks loading as Adult, and the once-only "New!" line.

Why:
1. qa passed I3 (reported): respect and looks on all 30 body x age x skin; same physics and the same 14 x 44 hitbox for every hero; builder words exact; layouts down to 320 x 240; saves and old-save loading; tsc, 388/388 unit; first load 216 KB (limit 3 MB); offline; 4x slow phone worst 57.7 fps. The full e2e run is flaky only under heavy machine load; the timing tests pass alone and a config fix is coming. Not blocking.
2. Tp's R2 is met (verified in code and design S2.3): "Male or female" and "Age" rows with Male, Female and Teen, Adult, Elder. Every hero has the same moves and size. Elders have grey hair and stand straight; elder men have a short neat grey beard; no walking stick (Q25 stand-in). Every hair and outfit is open to every hero (Q20 stand-in).
3. Plain words (verified): src/screens/words.ts matches S2.3 word for word: "Make your hero", "Male or female", "Age", "Start running", "Your hero is saved on this phone only.", "New! Pick male or female, and your age." Warm and clear for a 10 year old.
4. Respect and privacy (reported by qa, spot-checked in src/art/hero.ts): no age, gender or skin is a joke; teens are not small children. Saves stay on the phone, no photo, no network.

qa's notes, decided:
- (a) Upright builder, "Start running" reached by scrolling: **keep.** It is what S2.3 says ("as part 1, scrolling if needed"), and the game is played sideways. Small follow-up for P (designer note, then gamedev): give the upright rows the same scroll cue as short landscape (bottom fade and a scroll bar while more is below), so a player knows there is a button further down. No sticky button: it would cover rows on small phones. Reasoned, not blocking.
- (b) Gele and Headscarf hide the brow ends: **fine.** Headwear sits over the forehead in real life too; the eyes and smile, which carry the face, stay the same on every skin. qa judged it fine at game size. No change.
- (c) Label wrap at 932 x 430: **accept now, polish in P.** Cosmetic only; every word still shows and every chip can be tapped.

For Tp: Q20 and Q25 are built with the recommended answers (all hair and outfits open to all; elder with no stick, elder men with a short grey beard). Row word "Elder" stands in for Tp's "Old"; po recommends keeping "Elder" for respect. Q16 to Q25 still wait; my recommendations are unchanged.

### po acceptance note, 7 Nov 2026: slice 2 piece H (H7)

**Accepted** at dc7c108 (branch s2-h-integrate): the hero you move yourself, the taller view, phone buttons and keys, the schema 2 loader, Street 1 (lagos-1) played by hand, art H5, and Tp's iPhone fix (the hint bar, so hints never hide coins).

Why:
1. qa passed H6 in full (reported): the music tick is gone with a guard test; 4x slow phone worst part 57.7 fps; the hint bar clean at 6 sizes plus 1024 x 768, keys only and the boss fight; tsc, 367/367 unit, 80/80 phone e2e; offline on the second visit; first load 204.9 KB (limit 3 MB).
2. Tp's requests (verified by reading the code and design): R3 is met. No auto-run, hold to walk then run, back and forward, Jump on the right, arrows and Space on a computer (design S2.2). The view is 420 u tall with the buttons in the pavement strip (S2.1). Tp's iPhone note is met: every hint and toast sits in the bar between Forward and Jump, never over the road, kobo or hero.
3. Plain words (verified): src/screens/words.ts and all 15 lagos-1 hints match design S2.2 word for word, each 35 characters or fewer for touch and keys. How to play is clear for a 10 year old.
4. Originality (verified): no Nintendo or Mario names, shapes or sounds in the code; tunes carry the hymn and game-music checks. The street ends by boarding a yellow bus.
5. Respect (verified test, reported pictures): every skin, hair and outfit draws every new pose (walk, run, skid, dust) with no broken drawing (tests/unit/street-art-s2.test.ts).
6. Privacy (verified): no network call in the game code; the service worker only fetches our own files. No accounts, photos, trackers or ads.

Knowingly left for later (not part of H): crates (J), the well (L), Go-Slow Hall (M), music wiring (O), and the old boss on the road after the bus, which stays until M.

qa's small notes, logged for later, not blocking:
1. w1-l1 hints over 35 characters (and still in old one-tap words, "Tap to jump"). No menu leads there; only ?level=w1-l1 does. Fix in M: retire w1-l1 when the hall replaces the road boss.
2. Boss lights and throws are missing from the drawn-boxes list in the hint bar test. Today the boss stays above the road line, and qa saw the bar clean in the boss fight. Add them to the list in M, where the boss fight is rebuilt.

For Tp (no change to po's earlier recommendations): Q16 to Q25 still wait, built with the recommended answers. Also, CLAUDE.md rule 8 still asks for the "wrong premise" line, but Tp said on 7 Nov it is not in the game, and the game does not show it. Recommend Tp updates rule 8 and brief Done when 8 to match.

### po note, 7 Nov 2026 (read this first)

Accepted: nothing new today. Nothing for slice 2 has been built or passed by qa yet.

What happened: Tp played the first slice and asked for eight changes (R1 to R8 below), then gave the big idea behind the game (R0). Tp's word overrides the brief. Where a request changes docs/brief.md or docs/decisions.md, it says so plainly, and section "Lines for Tp to copy" at the end gives the wording. Only Tp edits those two files.

Waiting for Tp: Q16 to Q21. My recommendations in short:
- Q16 how the game is built: a region is a group of states; each state has 3 streets; the region's last state ends in the boss's hall. Version 1: World 1 is Lagos only, 3 streets plus General Go-Slow's hall; Lagos's neighbours join World 1 in later updates.
- Tp's "the game never ends" is recorded under R0 as a goal (grow state by state, big finish, gentle "keep it working" mode). It only changes how slice 2 saves progress, so no question.
- Q17 progress picture: the "Nigeria wheel", one cog per state, in version 1. A full map later.
- Q18 auto-run: no auto-run anywhere in slice 2. Gentle mode stays 5 lives.
- Q19 the well gift: a food parcel you carry into the boss hall (a ready-made garri shield). The boss stays beatable without it.
- Q20 hair and outfits: every hair and outfit open to every hero.
- Q21 the boss's building: "Go-Slow Hall", never "temple" in words players see.

Nothing is fully blocked. The team can build with my recommended answers as provisional defaults, as in slice 1. Safe to start now: music (R1), boxes (R5), the well and its bonus room (R4, except the gift), controls (R3), the elder and male or female heroes (R2).

Superseded by Tp: Q13 (one level in World 1) is replaced by R7 and Q16. Q9 (beeps only) is replaced by R1: music is now wanted in version 1.

### R0. The big idea: Nigeria Company (Tp, 7 Nov 2026)

Tp's words, in short: Nigeria is like a company. Its states are the departments. When every state does its job, Nigeria's wheel keeps turning. The game takes Nigeria from not yet developed to developed, one state at a time.

How it shows in the game:
1. Regions are groups of states. Each state is a department of "Nigeria Company". Streets are tasks inside a state.
2. Beating a problem (go-slow, bad roads, power cuts, red tape) "fixes the department". The state switches on where you can see it: lights come on, the road gets paved, the market gets busy.
3. A progress picture fills in as states start working: one cog per state on the Nigeria wheel (Q17).
4. The big goal: every department working, so Nigeria's wheel turns. That is a developed Nigeria.

Rules (CLAUDE.md rules 3 and 4, and po's own):
1. Words players see say "fix", "switch on" or "get working". Never "conquer", "defeat the state", "backward" or "underdeveloped". No state is an enemy. The problems are the enemy, never the people or the place.
2. Every state starts with the same kinds of everyday problems and ends proud. No state, region, faith or group is shown as worse, slower or to blame. Lagos starts with grey cogs and broken lights like everyone else.
3. Each state shows its real strengths with pride: its foods, crafts, music, markets, landscapes and well-known kinds of places, drawn in our own style. No real government buildings, no religious buildings, no real people, no logos.
4. No party colours or logos. The wheel and the map use the game's own warm colours, and no state colour may match a party. Green and white together means Nigeria, which is fine.
5. "Nigeria Company" has no boss person: no chairman, no governor, no president. The player is a worker who gets things working.
6. A map, if drawn, must have correct state borders and names, all 36 states and the FCT.

The game never ends (Tp, 7 Nov 2026: "That way the game never ends."). po recommendation:
1. The game keeps growing one region at a time: World 1 is Lagos, then its neighbours (Ogun, Oyo, Osun, Ondo, Ekiti), then the other regions, until all 36 states and the FCT work. Then West Africa, as the brief says, as friendly neighbours, never mocked.
2. A big finish when all 37 departments work: Nigeria's wheel spins and the nation celebrates.
3. After that, a light "keep it working" mode: now and then a fixed state gets a new everyday problem to clear. All on the phone, offline, no accounts, no server. Never punishing: a fixed state never loses its cog or the player's progress; the new problem is a bonus job, not a loss.
4. What it changes in slice 2: only the save. Progress is saved per state and per street (not as "level 1"), so new states and regions can be added later without breaking saves on phones. No question for Tp; it is built that way.

Changes to the brief: the brief's Worlds list (Your street, The market, Down the well, Across Nigeria, Abuja) becomes regions of states. "The idea in one line" gains the company goal. Line for Tp: see the end of this section.

### R1. Music

Requirement: the game has music while you play, not only sound effects.
- Our own tunes only. No known song, game tune, advert jingle, anthem, hymn, chant or party song, and nothing that sounds like one. qa checks every tune against well-known game music (Mario and other Nintendo music first) and well-known Nigerian songs.
- A Nigerian street feel is welcome (highlife guitar lines, talking drum, shekere, agogo), played by us, not taken from recordings.
- Light: World 1 music counts toward the 3 MB first load. Best is music made in code, like our sound effects (a few KB). If files are used, all of World 1's music stays under 300 KB. Later worlds' music downloads only when that world is reached.
- Suggested set for slice 2: one street tune, one short well tune, one boss hall tune, one short win tune.
- A "Music: on / off" switch, apart from "Sound: on / off", on the title screen and the pause screen, remembered on the phone. Music starts only after the first tap.
- Music stops when the game pauses (phone turned, tab hidden, a call coming in) and comes back when play goes on.
- On weak data the game must start without waiting for music.
- Brief: settled. "Our own characters, our own short tunes" (Look and sound). Changes Q9's provisional "beeps only" answer.

### R2. Hero choices: male or female, teen, adult or elder

Requirement: in "Make your hero" the player also picks male or female, and teen, adult or elder, as well as skin, hair and outfit.
- Rows: "Male or female" (Male, Female) and "Age" (Teen, Adult, Elder). po wording: Tp said "Old"; "Elder" says the same thing with respect. Tp can change it.
- Every choice is respectful. An elder is a dignified grown-up: grey hair, maybe a few lines on the face, standing tall, moving with energy. A walking stick may be carried (on the back or in hand), never leaned on. Never bent over, shaky or slow, and no jokes about age.
- Teens look like teens, not small children, and wear ordinary clothes.
- Every hero has the same moves, the same speed, the same jump and the same hitbox. The drawing fits inside the same box. No choice is weaker or stronger.
- Hair and outfits: open to every hero (Q20, recommended). Gele and headscarf stay in the list for everyone; agbada and kaftan too. The defaults change with the picks so the first look feels right.
- Saved looks from slice 1 must still load: new rows go at the end, and an old save opens as Adult with the look it had.
- Brief: "Pick skin tone, hair ... and outfit" (Your hero). This adds two rows. Line for Tp below.

### R3. You move the hero yourself (no auto-run)

Requirement: the hero stands still until the player moves. The player can go forward and back, build up a run, and jump. A long running jump clears a big pit; a standing jump does not.
- Keep from the brief: tap jumps, hold jumps higher, tap again in the air for a second jump, land on a goat or tyre to bounce. Designer tunes the big pits so they need a run-up even with the second jump.
- Phone layout (po default, Tp may change):
  - Left thumb: a "back" button and a "forward" button, bottom left.
  - Right thumb: one big jump button, bottom right.
  - Run: keep holding forward (or back) and the hero picks up speed by itself after about half a second of walking. No separate run button. Fewer buttons fit small screens, and a run button would also echo a famous game's run button.
  - Buttons at least 56 px, see-through, inside the screen's safe edges, never over the road where hazards come. Pause stays top right.
  - Holding a direction and jumping at the same time must work (two fingers).
  - A call coming in, the phone turned, the app switched, or a finger sliding off a button: every button lets go at once, and the hero stops. No hero running off alone after a pause.
- Gentle mode: same controls, 5 lives (Q18 asks if one-tap auto-run should stay as a choice; recommend no).
- Computer: left and right arrows (and A, D) move, holding builds speed, Space or up arrow jumps.
- The title "How to play" words change. Draft for designer: "Use the arrows to walk. Keep holding to run. Tap the jump button to jump. Tap again in the air to jump again. Hold to jump higher."
- Brief: changes "a free one-tap runner" (The idea in one line), "The hero runs by itself. One tap jumps" (How it plays 1), and decision 1 "plays like a one-tap runner". Lines for Tp below.

### R4. A well to an underground bonus room

Requirement: some streets have a village well. The hero can go down it to an underground room with kobo and a gift that helps in the boss fight, then come back up further along the street.
- Look (originality rule): a Nigerian village well: a round wall of plastered brick or stone, a wooden frame with a crank, a rope and a bucket. The hero goes down by holding the rope while the bucket lowers, and comes up the same way from another well. Never a pipe, tube or green cylinder.
- The room below: a dry, cool, lamp-lit store room with clay pots, woven baskets and kobo. Not blue bricks, not a copy of any game's underground.
- Safety (po opinion): it is a dry, magic bonus well, clearly a game place. No water, no one stuck, nothing that makes climbing into a real well look like a good idea.
- The gift: Q19 (recommended: a food parcel carried into the boss hall).
- Going down is a choice. Skipping it never blocks finishing the street or beating the boss.
- Brief: "Down the well (bonus worlds hidden in levels). Short, secret, full of kobo." is World 3 and sits under "Out of scope for version 1" (Worlds 2 to 6). Tp's request brings a small well room into World 1. The gift that helps in the boss fight is new. Line for Tp below.

### R5. Kobo and foods inside boxes you hit from below

Requirement: some kobo and foods sit inside boxes. The hero jumps up and hits the box from below to get what is inside.
- The mechanic is a common platform game idea and is allowed. The look must be our own (CLAUDE.md rule 2). Tp said "just like Mario or Luigi": we take the idea, never the look, sound or name.
- Our box: a wooden market crate or woven basket hanging from a rope across the street (like goods hung outside a shop), or tied under a stall awning. When hit from below it swings on its rope and the item drops out to the side or pops on top.
- Stamped with a kobo coin mark or a small food picture to hint at what is inside. Never a "?" or "!" mark. Never yellow or gold, no rivets, no row of bricks around it.
- After it is empty the crate hangs open and swings gently; it does not turn into a plain brown block.
- Sound: a wooden "tok" and a soft rope creak, then our own kobo clink. No rising chime that sounds like any game.
- Kobo still also lie in the open, as now. Amala strength may smash crates open from any side (designer's call).
- Brief: "Collect kobo coins" (How it plays 2) and the three foods stay; this adds a way to find them. Line for Tp below.

### R6. The boss fight in the boss's hall, not on the road

Requirement: after the last street of a region the hero walks into the boss's own building and fights there.
- Name: "Go-Slow Hall" (Q21). In words players see, never "temple", "shrine", "church", "mosque" or any holy word.
- Look: our own building that tells you about the problem. For General Go-Slow, a huge jammed indoor motor park or a roofed junction full of stuck cars, horns and a giant grumpy traffic light. No domes, towers, steeples, crosses, crescents, carved shrine figures, masquerades or any faith's signs. Not a real building (no real government house, stadium or landmark).
- After the win the hall changes: cars drive off, lights turn green, and the state switches on (R0).
- The boss rule stays: jump onto the green lights three times (brief, Worlds 1).
- Brief: "Each world ends with a boss fight" (How it plays 5) stays true; where it happens is new. Line for Tp below.

### R7. Many streets, then the region's final boss, then the next region

Requirement: a region has several streets with hurdles. After them comes the region's final boss in its hall. Beating it opens the next region.
- Each street keeps the brief's rules: 60 to 120 seconds, a bus stop checkpoint halfway, three lives (five in gentle mode).
- A street ends at our own finish, for example the hero hopping onto a yellow bus at a bus park. Never a flagpole or a castle.
- The game remembers on the phone which streets are done, so a player can come back to the next street.
- How many streets and how regions and states fit together: Q16 (recommended: World 1 is Lagos, 3 streets plus Go-Slow Hall).
- Scope: the next region is World 2 and later, which are "Out of scope for version 1". In version 1, beating General Go-Slow shows the win screen with the closing line and "Next region coming soon." The next region waits.
- Brief: changes Done when 2 ("World 1 level 1 plays from start to General Go-Slow"). Line for Tp below.

### R8. How it all looks: originality check (po verdict)

Each idea alone is a common platform game idea and is allowed. Together (run button, boxes hit from below, a pipe to an underground, a castle at the end of a world) they could remind players of one famous game. That is the risk to guard. So:
1. No run button; speed builds by holding a direction (R3).
2. Crates on ropes, never floating yellow "?" blocks (R5).
3. A rope-and-bucket village well, never a pipe (R4).
4. Go-Slow Hall, a jammed motor park, never a castle or temple (R6).
5. Streets end by boarding a bus, never at a flagpole (R7).
6. No red caps, overalls, moustache pairs, mushrooms, stars, fire flowers, turtles, princesses, or their sounds or fonts.
qa checks every new picture, sound and tune against this list.

### Open questions for Tp (Q16 to Q21), all answered 8 Nov 2026

16. How are regions, states and streets built, and what is World 1 in version 1?
   - Asked by po from R0 and R7. Tp said "many streets ... before fighting the final boss of the region" and "going through the states".
   - Options:
     a. A region is a group of states. Each state has 3 streets; finishing them switches the state on. The region's last state ends with the boss hall. Version 1: World 1 is Lagos only (the slice is set there; "Gidi" is Lagos), 3 streets plus Go-Slow Hall. Neighbours (Ogun, Oyo, Osun, Ondo, Ekiti) come later. Best case: small, matches the street already built, and one boss per region keeps bosses special.
     b. Every state ends with its own boss hall. Best case: every state gets a big moment, but 37 bosses from a few problem types would repeat a lot.
     c. Version 1 World 1 is the whole South-West, one street per state. Best case: more states in version 1, but six new street sets is far more art and much more than 3 MB.
   - Recommended: a. It is the smallest build that shows the full idea: streets, a well, crates, the hall, and one cog switching on.
   - Blocks: designer's street notes for streets 2 and 3, the progress save. Not blocking: street 1 exists and can be reworked now.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

17. How does the player see Nigeria getting to work?
   - Asked by po from R0.
   - Options:
     a. The "Nigeria wheel": a big wheel with one cog per state and the FCT. Each fixed state's cog lights up and turns. Best case: tiny to draw, easy to read on a small phone, and it is Tp's own picture ("Nigeria's wheel").
     b. A map of Nigeria with all states, each lighting up when fixed. Best case: teaches geography, but borders must be exactly right and it is more art.
     c. Both: wheel in version 1, map later. Best case: fast now, richer later.
   - Recommended: c. The wheel now; the map when more than one region exists.
   - Blocks: the win screen and a new progress screen. Not blocking.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

18. Should one-tap auto-run stay as a choice, for example in gentle mode?
   - Asked by po from R3. Tp said "It should not move by itself."
   - Options:
     a. No auto-run anywhere. Gentle mode stays 5 lives. Best case: exactly Tp's words, and every street is tested one way.
     b. A "Run by itself" switch in gentle mode. Best case: helps one-handed and younger players, but every street must work both ways, and wells and crates behind you are hard to reach.
     c. Decide after Tp plays slice 2. Best case: learn first.
   - Recommended: a now, c later if testers struggle.
   - Blocks: nothing.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

19. What is the gift in the well, and how does it help in the boss fight?
   - Asked by po from R4. Tp said "win some gifts that help me fight the boss". Decision 3 says power-ups are Nigerian food.
   - Options:
     a. A food parcel (garri, sugar and epa) the hero carries to the boss hall. The fight starts with the shield on, so one hit is free. Best case: uses a food we already have, keeps decision 3, simple to explain.
     b. An extra heart for the boss fight only. Best case: easy to understand, but not food.
     c. A choice of one stored food (corn, garri or amala), eaten with a button in the hall. Best case: most fun, but a new button and more words on a small screen.
   - Recommended: a. One well per street, one parcel each; carrying more than one does not stack. The boss must stay beatable without any gift.
   - Blocks: the well room's gift and the hall start. Not blocking the well itself.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

20. Are all hair and outfits open to every hero, male or female, any age?
   - Asked by po from R2. Gele and headscarf are mostly worn by women; agbada and kaftan mostly by men.
   - Options:
     a. All open to all; the first look picked for you fits the choice (for example gele for a female elder, agbada for a male elder). Best case: no one is told what they may wear; one list to draw for every body.
     b. Some items only for one gender. Best case: closer to custom, but it limits players and means more rules.
   - Recommended: a.
   - Blocks: art B2 rework for the new bodies. Not blocking.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

21. What do we call the boss's building?
   - Asked by po from R6. Tp said "the bosses temple".
   - Options:
     a. "Go-Slow Hall" (later "Pothole Hall", "Red Tape Hall"). Best case: plain, grand, no faith meaning.
     b. "Go-Slow HQ". Best case: fits "Nigeria Company", but "General" plus "HQ" can sound military.
     c. "The Big Junction". Best case: fun for a traffic boss, but does not work for later bosses.
   - Recommended: a. "Temple" is kept out of player words so no faith is touched (rule 4).
   - Blocks: one line of words. Not blocking.
   - Status: answered by Tp in chat, 8 Nov 2026: confirmed, recommended option.

### Lines for Tp to copy into docs/decisions.md

(Lines 5 and 6 from the 6 Nov note, the name and credits, are still waiting to be copied, so these start at 7.)

7. The big idea: Nigeria is a company, its states are the departments. The player fixes everyday problems state by state until every department works and Nigeria's wheel turns. Players see "fix" and "switch on", never "conquer". No state or group is shown as backward or to blame.
8. The hero does not run by itself. The player walks forward and back, builds a run by holding a direction, and jumps; a running jump clears big pits. This replaces "one-tap runner" in decision 1.
9. The hero builder adds Male or Female, and Teen, Adult or Elder. Every hero has the same moves and size. All hair and outfits are open to all.
10. Version 1 has music: our own tunes, light, with a Music on/off switch.
11. Kobo and foods can be inside crates the hero hits from below. They look and sound like our own market crates, never like another game.
12. Streets can hide a village well that leads to a small bonus room with kobo and a food parcel for the boss fight. This brings a small part of "Down the well" into World 1.
13. Boss fights happen in the boss's hall (for World 1, "Go-Slow Hall"), not on the road.
14. A region is a group of states, each state has 3 streets, and the region ends in the boss hall. Version 1: World 1 is Lagos, 3 streets plus Go-Slow Hall.
15. The game never ends: it grows region by region until all 36 states and the FCT work, then West Africa. After the big finish, a gentle offline "keep it working" mode gives fixed states new problems, never taking progress away.

Added 8 Nov 2026, from Tp's answers in chat to Q16 to Q25. Q16 is covered by line 14, Q20 by line 9, Q21 by line 13. These cover the rest:

16. Progress shows on the Nigeria wheel, one cog per state and the FCT. A map comes when there is more than one region. (Q17)
17. No auto-run anywhere, gentle mode too. Gentle mode gives 5 lives instead of 3. (Q18)
18. The well gift is a garri parcel. It starts every Go-Slow Hall try with the shield on, until the hall is cleared. One parcel at a time, no stacking, and the boss can be beaten without it. (Q19, Q23)
19. Streets use popular, real Lagos names. No street named after a real person, no faith body or holy place, no area shown as broken or to blame, and the words praise the run and the place, never saying a real place "is fixed". Drawings stay our own. (Q22)
20. Left-handed players get a "Swap sides" switch in slice 3, after testers try the layout. (Q24)
21. Elders stand tall with no walking stick; elder men have a short, neat grey beard. The row word is "Elder". (Q25)

Number note: the 7 Nov note also suggested a "7." (the "wrong premise" line is not in the game). The numbers are only a guide; Tp can renumber freely when pasting.

### Designer's questions for Tp (Q22 to Q25), from the slice 2 design (all answered 8 Nov 2026)
Each was built with the recommendation until Tp answered.
- **Q22 Street names.** Made-up names ("Your street", "Market road", "Bus park road") or real Lagos areas (Oshodi, Balogun)? Recommended: made-up for now, so no area feels singled out. Affects K2, N1, N2.
  - **Answered by Tp in chat, 8 Nov 2026: real, popular Lagos names** ("We should use popular ones"). Not the recommendation. Designer is choosing the names now, under the Q22 rule at the top of this file.
- **Q23 Parcel strength.** Does the garri parcel start every hall try with a shield, or only the next try? Recommended: every try. Affects L2, M2, M3.
  - **Answered by Tp in chat, 8 Nov 2026: confirmed, every try.**
- **Q24 Left-handed players.** A "Swap sides" switch to put the jump button on the left? Recommended: add it in slice 3, after testers try the layout. Affects H3, H5, N2.
  - **Answered by Tp in chat, 8 Nov 2026: confirmed, slice 3.**
- **Q25 Elder look.** No walking stick, so the elder never looks frail, and elder men have a short grey beard. Recommended: yes to both. Affects I1, I2.
  - **Answered by Tp in chat, 8 Nov 2026: confirmed, yes to both.**

Suggested brief wording for Tp (po does not edit the brief):
- The idea in one line: "A free run-and-jump game where you play as yourself, fix the everyday problems in each state of Nigeria Company, eat Nigerian food for power, and get Nigeria's wheel turning."
- How it plays 1: "You move the hero yourself: walk forward or back, hold to build a run, tap to jump. Tap again in the air to jump again. Holding jumps higher."
- Done when 2: "World 1 (Lagos) plays from street 1, through streets 2 and 3, into Go-Slow Hall, to General Go-Slow and the win screen, on a phone, by touch."
- Done when, new: "Music plays, with an on/off switch." and "The hero builder offers male or female and teen, adult or elder."

## Answered by Tp in chat, 7 Nov 2026
- The line "Remember: a wrong premise often leads to a misleading conclusion." is **not** in the game. It belongs to another project. It has been removed from the win and credits screens, and CLAUDE.md rule 8 now says so. For Tp: docs/brief.md (Done when 8) still asks for it; please edit or remove that line there. Suggested decision line: "7. The 'wrong premise' line is not in the game."

## Answered by Tp in chat, 6 Nov 2026

- Q1 game name: **Gbese!** Title, home-screen name and page title now say "Gbese!".
- Q11 credits: **"Made by CoachNaz."** Credits screen updated.
- Tp also asked for a better-drawn hero with a normal-looking head and human-like running. Art is redrawing it.
- For Tp to copy into docs/decisions.md (only Tp edits that file): "5. The game is called Gbese!" and "6. Credits read: Made by CoachNaz."

## po acceptance note, 6 Nov 2026 (first slice: A7, B5, C8, D5, E6, F5)

Accepted: pieces A to F, the whole first slice, against the brief's "Done when" 1 to 8 and the CLAUDE.md rules. G1 (deploy workflow) is in the repo. qa passed every piece.

How I checked:
- Verified by po: 140 unit tests pass and the build is clean (run today). First load 137.6 KB of the 3 MB budget. Every word in src/screens/words.ts matches docs/design.md. The win and credits screens both show "Remember: a wrong premise often leads to a misleading conclusion." No fetch, XMLHttpRequest, sendBeacon, getUserMedia, file input, analytics or outside address in src/; the only fetch is the service worker, same site only. Saves are localStorage only. 17 qa screenshots looked at: builder (5 skins, 5 hair, 5 outfits), street, goat, tyre, bus stop, all three foods with their words, pause, game over, boss, defeat, win, upright warning, tiny screen. No real people, no party marks, nothing mocks anyone, nothing looks like Mario or any other game. General Go-Slow is a grumpy traffic light on a heap of cars and ends smiling.
- Reported by qa, not rerun by po: 56 phone end-to-end tests and 3 slowed-CPU tests pass; 46 to 52 fps at 4x slowed CPU; offline second visit works; no network after load; full slice won by touch in 78.8 s; sloppy bots beat the boss 93 to 98% of the time; every sound checked against well-known game sounds.
- Small things for later, not blocking: the bus stop sign sits over a shop sign; a debug art view (?gallery, 2 KB) ships in the build.

Waiting for Tp. Each is built with my recommended option as a provisional default. Please confirm or change:
- Q5 hero looks: confirm 5 skin tones, 5 hair (adds Headscarf), 5 outfits (adds Kaftan).
- Q6 amala in the boss fight: confirm it smashes what the boss throws, but only green lights beat him.
- Q7 play again: confirm it starts the level from the start with full lives.
- Q8 gentle mode: confirm one switch, 5 lives instead of 3, in version 1.
- Q9 sound: confirm code-made beeps and a sound switch now, our own short tunes before a public launch.
- Q10 title on the test build: confirm "Gidi Dash" (one setting), and do not share the link widely until Q1 is settled.
- Q11 credits: confirm the credits screen, and tell us how you want to be named (it says "Made by Tp and team.").
- Q12 phone: confirm play sideways only; title and menus work either way.
- Q13 World 1: confirm one level plus the boss in version 1, more levels after you play it.
- Q14 after a fall: confirm food effects end, foods and hazards come back, kobo already picked up stay counted.
- Q15 gentle mode switch: confirm it sits on the title and game over screens only.

Deploy (G2 to G4) waits for Tp: please create the GitHub repo (or give push access) and turn on Pages with source "GitHub Actions". Q1 (the game name) should be settled before the link goes out widely.

## po session note, 6 Nov 2026 (design review)

Accepted: nothing yet. docs/design.md wording is approved by po, but no task has passed qa.

Words checked in docs/design.md: plain, warm, no real people, nothing mocks anyone, nothing echoes another game. General Go-Slow is a heap of cars under a traffic light, loses by untangling and driving off happily. The win and credits screens carry the closing line. Two word changes made:
- Garri toast: "Garri, sugar and epa!" is now "Garri, sugar and epa (groundnut)!" so players outside the south-west know what epa is (brief, Power-ups 2, uses the same words).
- Game over: "Too hard?" is now "Want more tries?" so no player feels judged.

Waiting for Tp: Q14 and Q15 below, both built with the recommended option. Recommendations in short:
- Q14 after a fall: food effects end, foods and hazards past the restart point come back, kobo already picked up stay counted and do not come back.
- Q15 gentle mode switch: on the title and game over screens only, never mid-level.

## po session note, 6 Nov 2026

Accepted: nothing yet. No task has passed qa.

Answered from the brief (no Tp call needed):
- pm Q2, the numbers: designer sets power-up lengths inside the brief's "a few seconds" (brief, Power-ups). Default from the prototype: roasted corn 6 s, amala 7 s, garri lasts until one hit, no timer.
- pm Q3, lives at the bus stop: lives do not refill at the bus stop. The brief says "Three lives per level" (How it plays 4).
- pm Q9, kobo: score only. The brief says "Collect kobo coins" and "Three lives per level" (How it plays 2 and 4). An extra life for kobo would break the three-lives rule. A kobo shop would be outfit packs, which is money, and that is out of scope for version 1.
- pm Q10, for the first slice: level 1 ends with General Go-Slow (brief, Done when 2). Whether World 1 gets more levels is Q13 below.

Waiting for Tp: Q5 to Q13 below. Each one is being built with my recommended option as a provisional default, so no work stops. None is blocking. Recommendations in short:
- Q5 hero lists: 5 skin tones, 5 hair, 5 outfits (prototype lists plus a headscarf and a kaftan).
- Q6 amala in the boss fight: it smashes what the boss throws, but only green lights beat the boss.
- Q7 play again: start from the beginning of the level with 3 lives.
- Q8 gentle mode: in version 1, one switch, 5 lives.
- Q9 sound: our own code-made beeps now, with a sound-off button. Short tunes before a public launch.
- Q10 title: "Gidi Dash" on the test build, kept in one setting.
- Q11 credits: a small text credits screen with the closing line.
- Q12 phone: play sideways; menus work either way.
- Q13 World 1: one level plus the boss in version 1. More levels after Tp plays it.

Format: question, options, recommended option, what is blocked.

1. What is the game called?
   - Options: Gidi Dash, Wahala Run, Go Naija Go, something else.
   - Recommended: pick after checking the Play Store, App Store and web for clashes. Gidi Dash is the working name.
   - Blocks: title screen and share text only.

2. Which foods come next, so every region feels at home?
   - Options to choose from: suya, puff-puff, zobo, kunu, tuwo shinkafa with miyan kuka, fura da nono, abacha, ofe nsala, banga soup with starch, boli and groundnut, akara, moi moi.
   - Recommended: one food from each region per new world, chosen with people from that region.
   - Blocks: nothing in version 1.

3. Should players be able to use a selfie later?
   - Options: never; later, turned into a cartoon on the phone and the photo thrown away, adults only; later, any age.
   - Recommended: later, on the phone only, adults only, after a privacy check under Nigeria's data protection law.
   - Blocks: nothing in version 1.

4. How will the game make money after the test?
   - Options: rewarded ads; small outfit packs in naira; a sponsor per world; a school edition; grants.
   - Recommended: start with a sponsor per world plus rewarded ads. Add outfit packs once players come back daily.
   - Blocks: nothing in version 1.

5. Which hero looks are in version 1?
   - Asked by pm (plan Q1). The brief says "low cut, afro, braids, gele and more" and "jersey, ankara, school uniform, agbada and more" (Your hero). "And more" is not a list.
   - Options:
     a. The prototype lists: 5 skin tones; hair Low cut, Afro, Braids, Gele; outfits Green jersey, Ankara, School uniform, Agbada. Best case: already drawn and tested, least art.
     b. The prototype lists plus one more each: hair adds Headscarf, outfit adds Kaftan (5 skin, 5 hair, 5 outfits). Best case: more players from the north and from every faith see themselves on day one.
     c. A bigger set, 6 or more of each. Best case: the most choice, but slower art and a busier screen on a small phone.
   - Recommended: b. The brief wants every part of Nigeria shown with pride, and gele and agbada lean south-west. Two more items is small art work.
   - Build note: keep each list as data, and only ever add to the end of a list, so looks already saved on a phone still load.
   - Blocks: B1, B2. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

6. Does amala, gbegiri and ewedu work in the General Go-Slow fight?
   - Asked by pm (plan Q2). The brief says "smash through anything" (Power-ups) and the boss is beaten by "Jump onto the green lights three times" (Worlds 1). It does not say how the two meet.
   - Options:
     a. Amala smashes what the boss throws (cars, tyres) but does not hurt the boss. Only green lights win. Best case: keeps "smash through anything" true and keeps the boss rule clear.
     b. No food in the boss arena at all. Best case: the simplest, fairest test of jumping.
     c. Amala also counts as a hit on the boss. Best case: a big, fun moment, but it makes the boss too easy.
   - Recommended: a. It matches both lines of the brief.
   - Blocks: D1, E1. Not blocking (one rule in code).
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

7. After game over, where does "Play again" start?
   - Asked by pm (plan Q3). The brief has "Three lives per level" and a bus stop checkpoint, but does not say where play again starts.
   - Options:
     a. Start of the level, 3 lives, kobo back to 0. Best case: clear meaning of "game over", and the level is only 60 to 120 seconds. Same as the prototype.
     b. From the bus stop if reached, 3 lives. Best case: kinder to players stuck near the boss.
   - Recommended: a. Gentle mode (Q8) helps players who struggle, so game over can stay simple.
   - Blocks: C5. Not blocking (one line).
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

8. Is there a gentler mode with more lives in version 1?
   - Asked by pm (plan Q4). The designer rules ask for one. The brief does not mention it and does not rule it out.
   - Options:
     a. Yes, in the first slice: one switch, "Gentle mode: 5 lives instead of 3". Best case: younger and first-time players finish, and it costs one number.
     b. After the slice, before version 1 goes public. Best case: keeps the slice small.
     c. Not in version 1. Best case: the brief's three lives stay the only rule.
   - Recommended: a. It is cheap, kind, and helps the "finish level 1 in three tries" goal.
   - Blocks: nothing.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

9. What sound goes in the first slice?
   - Asked by pm (plan Q5). The brief says "our own short tunes" (Look and sound) but not when.
   - Options:
     a. Short beeps made in code (like the prototype), a sound-off button, and the choice saved on the phone. Best case: zero download size and fully our own.
     b. Wait for original short tunes. Best case: the slice sounds finished.
     c. No sound in the slice. Best case: least work.
   - Recommended: a now, original short tunes before any public launch. Sound starts only after the first tap.
   - Blocks: F4 sound review. Not blocking.
   - Status: changed by Tp, 7 Nov 2026: music is wanted in version 1 (see R1). Code-made sound effects stay.

10. What name does the title screen show on the test build?
   - Asked by pm (plan Q6). Linked to Q1.
   - Options:
     a. "Gidi Dash", the working name. Best case: matches the prototype and all the docs.
     b. A plain title like "Street Runner" until Q1 is settled. Best case: no name is used before the clash check.
   - Recommended: a, with the name kept in one setting so it is a one-line change. Do not share the link widely until Q1 is settled.
   - Blocks: G2, which already waits for Tp's GitHub repo. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

11. Is there a credits screen in version 1, and who is named?
   - Asked by pm (plan Q7). CLAUDE.md says the credits show "Remember: a wrong premise often leads to a misleading conclusion." The brief's Done when only asks for it on the win screen.
   - Options:
     a. A small text credits screen from the title screen: "Made by Tp and team. Every picture and sound is our own." and the closing line. Best case: cheap, honest, and keeps the CLAUDE.md rule.
     b. No credits screen until later. Best case: smaller slice.
   - Recommended: a. Tp, please say how you want to be named (Tp, a full name, or a studio name).
   - Blocks: nothing in the slice.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

12. Which way is the phone held?
   - Asked by pm (plan Q8). The brief does not say. The prototype plays sideways and shows "Turn your phone sideways to play."
   - Options:
     a. Play sideways only; the title, hero builder and other menus work either way. Best case: players see hazards coming early, as the prototype does.
     b. Upright only. Best case: one-hand play on a bus, but much less road ahead to see.
     c. Both. Best case: plays any way, but two layouts and twice the testing.
   - Recommended: a. The run needs width. If the phone is turned upright mid-level, the game pauses and asks to turn it back.
   - Build note: keep how much road the camera shows as one setting, so a later change is a retune, not a rebuild.
   - Blocks: A3, C1. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

13. How many levels does World 1 have in version 1?
   - Asked by pm (plan Q10). The brief's Done when 2 needs "World 1 level 1 ... to General Go-Slow and the win screen". It does not say if more levels come before version 1 ends.
   - Options:
     a. One level with the boss at its end. Best case: exactly the Done when list; ship and learn sooner.
     b. Three levels, boss at the end of level 3. Best case: a fuller world, but it moves the boss away from level 1 and changes Done when 2.
     c. Ship a, then add levels 2 and 3 in an update, with the boss moving to the end. Best case: test the fun first, then grow.
   - Recommended: a for version 1, then c once Tp has played it.
   - Blocks: the plan after the slice only.
   - Status: superseded by Tp, 7 Nov 2026: many streets, then the boss hall (see R7 and Q16).

14. After falling in a pothole, what happens to food and to things already passed?
   - Asked by designer (docs/design.md, Level 1, Losing a life). The brief says only "A bus stop halfway is the checkpoint" and "Falling into a pothole ... costs one" (How it plays 3 and 4).
   - Options:
     a. Food effects end (the garri shield too). Foods and hazards past the restart point come back. Kobo already picked up stay counted and do not come back. Best case: every try is the same fair road, the foods are there to use again, and nobody can farm kobo by falling.
     b. Food effects carry on after the restart. Best case: kinder, but a shield or corn could carry across the whole level and the teaching order breaks.
     c. Everything resets, kobo too, back to what it was at the restart point. Best case: cleanest rule, but losing kobo feels harsh after a fall.
   - Recommended: a. It keeps the level teaching in order and matches the prototype. Build note: picked-up kobo must not reappear, or falling becomes a way to earn more.
   - Blocks: C5, D1. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

15. Where does the Gentle mode switch sit?
   - Asked by designer (docs/design.md, Screens). Follows Q8, which is itself provisional. The brief does not mention gentle mode.
   - Options:
     a. On the title screen and the game over screen, never during a level. Best case: easy to find when it helps (after running out of lives), and lives never change mid-run.
     b. Title screen only. Best case: simplest, but a struggling player may never find it.
     c. Also on the pause screen. Best case: most reachable, but switching mid-level muddles the lives count.
   - Recommended: a. The game over line "Want more tries? Gentle mode gives you 5 lives." offers it at the right moment without judging anyone. A change takes effect on the next "Play again".
   - Blocks: C6. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.
