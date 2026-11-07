# Open questions for the product owner

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
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

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
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

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
