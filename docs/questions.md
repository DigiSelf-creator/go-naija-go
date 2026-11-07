# Open questions for the product owner

## Slice 2 requests from Tp, 7 Nov 2026

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

### Open questions for Tp (Q16 to Q21)

16. How are regions, states and streets built, and what is World 1 in version 1?
   - Asked by po from R0 and R7. Tp said "many streets ... before fighting the final boss of the region" and "going through the states".
   - Options:
     a. A region is a group of states. Each state has 3 streets; finishing them switches the state on. The region's last state ends with the boss hall. Version 1: World 1 is Lagos only (the slice is set there; "Gidi" is Lagos), 3 streets plus Go-Slow Hall. Neighbours (Ogun, Oyo, Osun, Ondo, Ekiti) come later. Best case: small, matches the street already built, and one boss per region keeps bosses special.
     b. Every state ends with its own boss hall. Best case: every state gets a big moment, but 37 bosses from a few problem types would repeat a lot.
     c. Version 1 World 1 is the whole South-West, one street per state. Best case: more states in version 1, but six new street sets is far more art and much more than 3 MB.
   - Recommended: a. It is the smallest build that shows the full idea: streets, a well, crates, the hall, and one cog switching on.
   - Blocks: designer's street notes for streets 2 and 3, the progress save. Not blocking: street 1 exists and can be reworked now.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

17. How does the player see Nigeria getting to work?
   - Asked by po from R0.
   - Options:
     a. The "Nigeria wheel": a big wheel with one cog per state and the FCT. Each fixed state's cog lights up and turns. Best case: tiny to draw, easy to read on a small phone, and it is Tp's own picture ("Nigeria's wheel").
     b. A map of Nigeria with all states, each lighting up when fixed. Best case: teaches geography, but borders must be exactly right and it is more art.
     c. Both: wheel in version 1, map later. Best case: fast now, richer later.
   - Recommended: c. The wheel now; the map when more than one region exists.
   - Blocks: the win screen and a new progress screen. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

18. Should one-tap auto-run stay as a choice, for example in gentle mode?
   - Asked by po from R3. Tp said "It should not move by itself."
   - Options:
     a. No auto-run anywhere. Gentle mode stays 5 lives. Best case: exactly Tp's words, and every street is tested one way.
     b. A "Run by itself" switch in gentle mode. Best case: helps one-handed and younger players, but every street must work both ways, and wells and crates behind you are hard to reach.
     c. Decide after Tp plays slice 2. Best case: learn first.
   - Recommended: a now, c later if testers struggle.
   - Blocks: nothing.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

19. What is the gift in the well, and how does it help in the boss fight?
   - Asked by po from R4. Tp said "win some gifts that help me fight the boss". Decision 3 says power-ups are Nigerian food.
   - Options:
     a. A food parcel (garri, sugar and epa) the hero carries to the boss hall. The fight starts with the shield on, so one hit is free. Best case: uses a food we already have, keeps decision 3, simple to explain.
     b. An extra heart for the boss fight only. Best case: easy to understand, but not food.
     c. A choice of one stored food (corn, garri or amala), eaten with a button in the hall. Best case: most fun, but a new button and more words on a small screen.
   - Recommended: a. One well per street, one parcel each; carrying more than one does not stack. The boss must stay beatable without any gift.
   - Blocks: the well room's gift and the hall start. Not blocking the well itself.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

20. Are all hair and outfits open to every hero, male or female, any age?
   - Asked by po from R2. Gele and headscarf are mostly worn by women; agbada and kaftan mostly by men.
   - Options:
     a. All open to all; the first look picked for you fits the choice (for example gele for a female elder, agbada for a male elder). Best case: no one is told what they may wear; one list to draw for every body.
     b. Some items only for one gender. Best case: closer to custom, but it limits players and means more rules.
   - Recommended: a.
   - Blocks: art B2 rework for the new bodies. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

21. What do we call the boss's building?
   - Asked by po from R6. Tp said "the bosses temple".
   - Options:
     a. "Go-Slow Hall" (later "Pothole Hall", "Red Tape Hall"). Best case: plain, grand, no faith meaning.
     b. "Go-Slow HQ". Best case: fits "Nigeria Company", but "General" plus "HQ" can sound military.
     c. "The Big Junction". Best case: fun for a traffic boss, but does not work for later bosses.
   - Recommended: a. "Temple" is kept out of player words so no faith is touched (rule 4).
   - Blocks: one line of words. Not blocking.
   - Status: waiting for Tp. provisional: built with recommended option, Tp can change.

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
