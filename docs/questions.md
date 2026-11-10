# Open questions for the product owner

## Tp, 10 Nov 2026 (later): designer's three choices, and five new ideas

**Answered by Tp: 1 a, 2 a, 3 a.** Fufu plops, hops twice (smaller each time), then rolls; with Music off there is no corn tune but the 5, 4, 3, 2, 1 still shows; players who already have a hero see the intro once on their next Play.

**Answered by Tp in chat, 10 Nov 2026: B1 a, B2 a, B3 a, B4 a, B5 a** (birds on street 3 that are never hurt; amala gives a strong look with no size change; the garri shield shows as our own tech suit; a 2.5 s dash from double tap and hold; open gutters with still thorny weeds that fufu clears). Tp also: the city view angle in art's drawing is OK. Intro frame 3 (the Nigeria shape): use the country's colours (green and white), keep every cog inside the borders, and make the border itself out of cogs/wheels, "the borders are the wheels that make it keep working". (National colours are not party colours, so rule 3 is kept.)

Lines for Tp to paste into docs/decisions.md:
43. Street 3 has birds by the rubbish; they are never hurt. Amala gives a strong look, never a size change. The garri shield looks like our own tech suit. Double tap and hold forward for a short dash. Open gutters with still thorny weeds; fufu clears them. (B1 to B5)

Tp's new ideas, in short, with po's read. CLAUDE.md rule 2 bans copying Mario, so two of them need a safe version (marked).
- **B1. Birds on street 3.** Because of dirt and rubbish, birds gather and get in the way. Dodge them by throwing fufu, jumping on them, or running into them with the shield on. po: yes, with our rule for animals: birds are never hurt. Fufu: a bird catches the ball and flies off with it. Jump on one: it flaps away. Shield: it gets a fright and flies off. They gather by rubbish piles, so cleaning up is the real fix (a later city fix). Not like Angry Birds, Flappy Bird or any game's bird. Recommended: a) yes, as written; b) birds only fly overhead as scenery.
- **B2. Amala makes the hero big, and you only go small when hit with no protection.** **po flag: this is Mario's best-known rule** (a power-up makes you big, a hit makes you small). Rule 2 forbids it.
  - a) (po's pick) Amala stays a 12 s power-up with a strong look: wider shoulders, a warm glow, heavier footsteps, smashing through hazards. No change of size, no lasting big state.
  - b) The hero grows a little (about 15%) for the 12 s only, then back to normal. Closer to Tp's idea; still a risk.
  - c) Tp's full idea. po cannot recommend it.
- **B3. A protection look: a halo or a robot build.** po: a halo is a faith sign (angels, saints), so rule 4 says no. A robot-style **tech suit** fits the game well (it matches the Tech bucket).
  - a) (po's pick) The garri shield shows as a light tech suit frame around the hero, our own design: no famous robot or superhero look (not Iron Man or Mega Man). It still takes one hit.
  - b) Keep the round shield bubble as now.
- **B4. Fast run.** Double tap forward and hold = a fast run for a few seconds, for faster, longer jumps. The two jump taps stay, and holes get wider to need it. po: yes; many runner games have a dash, and ours is our own.
  - a) (po's pick) A 2.5 s dash, dust and speed lines, then a short rest before the next. Some new wide holes need it; Gentle mode never needs it.
  - b) No dash.
- **B5. Gutters with thorn plants that harm you.** Fufu destroys the thorns, or you jump over. **po flag:** a harmful plant coming out of a pipe or hole is Mario's "piranha plant". Ours must never bite, have a mouth, or pop up and down.
  - a) (po's pick) An open gutter (a wide drain) choked with thorny weeds that stay still. Touching them costs a life. A fufu ball clears them: they wither and the gutter turns to safe ground. Or jump over. Drawn our own way, no "fire".
  - b) Gutters with no plants.
Also: Tp says "fufu fireball". In the game it is always a hot fufu ball, never fire (rule 2).

## Tp, 10 Nov 2026 (after playing the PR #3 build)

Tp's words, in short: it works; it needs to be harder; "I don't see my fufu as my fireballs"; when corn is picked up its sound should be different, fast and louder than every other sound, then wear off slowly 5, 4, 3, 2, 1; and when do we see the city and the journey?

Taken as Tp's instructions (po):
1. **Harder:** designer tunes the streets and Go-Slow Hall (plan P2 hall goal, plus the streets), keeping Gentle mode kind.
2. **Fufu now, not after slice 3** (changes R3 a, the timing only): pepper fufu as hot, steaming fufu balls thrown with a new action button, bouncing along the road, knocking problems away and plugging potholes; at problems only, never people; goats are shooed, never hit (city choice 5 a). **No flames, no fire, no fireball look or sound** (CLAUDE.md rule 2: a fireball power-up is a Mario signature).
3. **Corn tune (Tp's new idea 2):** while corn works, our own fast corn tune plays over everything (other sounds and the street tune duck under it); for the last 5 seconds it slows and fades with a 5, 4, 3, 2, 1 count on screen. Never like any game's power-up music.
4. **City now:** slice 3 starts now beside the polish: the intro story first, then Lagos from above with its problem pins, then "Mission complete!".

Line for Tp to paste into docs/decisions.md:
42. Pepper fufu comes now: hot fufu balls thrown with an action button, never fire. While corn works, our own corn tune plays over every other sound and fades 5, 4, 3, 2, 1. Slice 3 (the city) starts now, beside the polish.

## po acceptance, 10 Nov 2026: P1 and P2 (code part)

**Verdict: accepted**, branch claude/serene-hopper-ydve2g. qa passed it (reported): tsc clean, unit 672/672, first load 336.6 KB, offline cache check proven by breaking it on purpose; e2e phone-landscape 37/38 and timing 89/91, where the 3 failures fail the same way on the unchanged base 73640ec (older sandbox browser: hall first toast, a late icon request, "installable" in incognito). Perf in the sandbox is slow on the base too (worst 29.3 fps), so it is not a regression; real fps is checked by CI and on a real phone.
Checked against the brief and Tp's answers: amala and corn 12 s (city choice 6); hazards after corn (design S2.2); the "PEEP!" hint hides at the third hit (po N4); a pothole sign before every wide pothole and Gentle climb-out (R6 a); no words on the sign, nothing copied, nothing mocks anyone (qa's screenshots).
Still to do in P2: the hall difficulty goal (plan P2). Then P3, with Tp's listen to the tunes.
Next: with Tp's yes, merge into main; CI runs the full suite on the right browser before the test link updates.

## Tp, 10 Nov 2026: the game is for the app stores, not the web

Tp's words: "This game is for the stores not web." This changes brief "Tech" and decision 4 ("Version 1 is a free web game"). Only Tp edits those files.

What it means (po, for pm and gamedev):
- The same game is wrapped as an app (for example with Capacitor, a free open tool) for the Apple App Store and Google Play. The game code, art, sound and saves stay as they are. Saves inside an installed app are not cleared by Safari, so the iPhone tip (A2) is no longer needed.
- The Pages link stays as the team's **test link** only, never shared with players.
- Still true: free, no accounts, no ads, no trackers, no buying in version 1, small download, works offline, runs on cheap phones.
- New work (pm to plan): app wrapper and app icons/splash; Android build (can be made in the cloud); iPhone build (needs Apple's tools on a Mac; can be done with a cloud Mac build service or GitHub's Mac build machines, never the company Mac); store pictures and words; a privacy page (we collect nothing); store age rating; each update goes through store review (Apple takes about 1 to 2 days).

Line for Tp to paste into docs/decisions.md:
39. Gbese! is an app for the Apple App Store and Google Play. The web link is for the team's testing only. (replaces "free web game" in decision 4)

**Answered by Tp in chat, 10 Nov 2026: A3 a, A4 b, A5 a, A6 a.** Tp's own (or Tp's own company's) store accounts, kept apart from the employer; Google Play and Apple **together** (not po's pick, Google first); a closed invited test (Google Play internal testing and TestFlight) once slice 2 polish is done, public after the city part; everyone 10 and up, not the kids-only section.

Lines for Tp to paste into docs/decisions.md:
40. Store accounts are Tp's own, kept apart from any employer. Google Play and the App Store launch together. (A3, A4)
41. First a closed invited test once slice 2 polish passes; public release after the city part. Age group: everyone 10 and up, not the kids-only section. (A5, A6)

What Tp needs to do (no rush; needed before the closed test): create the Apple developer account (developer.apple.com, about $99 a year) and the Google Play developer account (play.google.com/console, one-time $25), in Tp's own name or Tp's own company. Never paste passwords or keys in chat; the lead will explain how to add them safely when the build is ready.

Options asked (kept for the record):
- **A3. Who owns the store accounts?** a) Tp's own (or Tp's own company's) Apple developer account (about $99 a year) and Google Play account (one-time $25), kept apart from the employer. b) An existing company account.
- **A4. Which store first?** a) Google Play first (cheaper, faster review, most Nigerian phones are Android), Apple soon after. b) Both together. c) Apple first.
- **A5. When to release?** a) A closed test (Google Play internal testing and Apple TestFlight, a few invited testers) once slice 2 polish is done; public release after the city part. b) Public as soon as possible.
- **A6. Age group.** a) Everyone, 10 and up, not in the kids-only section (fewer extra rules, still nothing unsafe for children). b) The kids section (stricter store rules).

## po note, 10 Nov 2026: app stores and saves on iPhone (answered: stores, see above)

Tp asked how players get the game and whether saves are kept. Today Gbese! is a web game (brief: version 1 is a free web game), opened from the Pages link. Saves stay on the phone. On iPhone, Safari may clear a site's saves after about 7 days without play unless the game is added to the home screen (Share, then Add to Home Screen); Android Chrome offers "Install app" by itself.

**A1. App stores.**
- a) Keep the web link for testing now; plan App Store and Google Play versions (the same game wrapped as an app) when the city part is done. Needs an Apple developer account (about $99 a year), a Google Play account (one-time $25), store pictures, a privacy page, and Apple's review. (po's pick)
- b) Start the store versions now.
- c) Web only.
**A2. iPhone home-screen tip.** a) Show a one-time tip on iPhones only, after the first street is finished: "Keep your progress: tap Share, then Add to Home Screen." (po's pick); b) no tip.
Blocks: nothing now.

## Tp, 10 Nov 2026: the lane run gets pickups, chasers and buckets (po note, read this first)

**Answered by Tp in chat, 10 Nov 2026: L1 a, L2 a, L3 a, L4 a, L5 a, L6 a, L7 a** (all as po recommended). Three buckets (Naira, Power, Tech); the Blackout chases; stumbles let it close in and you keep what you collected; Lagos seen from above; "Mission complete!" walk-in after every win; the Booming meter; safety missions against the Shadow with a made-up Safety Team, never people as enemies. The challenge road map (part of L4) was not answered on its own; designer drafts it as an option, to confirm with Tp.

**Tp, 10 Nov (later): yes to all five city.md questions** (challenge road map replaces the Challenges list; every lost challenge keeps everything; a win pays for its fix at once; the Booming meter replaces the people counter; safety missions after slice 3). Full words at the end of docs/city.md.

Lines for Tp to paste into docs/decisions.md:
34. The lane run has three buckets: Naira, Power and Tech. Each city fix costs its own kind. Things you bump give values; goats say "meeh" and are never hurt. (L1; replaces city choice 7 "any Naira fixes anything")
35. In the lane run, the Blackout chases from behind. Stumbles let it close in, Power pushes it back; if it catches you the run ends and you keep what you collected. (L2, L3)
36. The Lagos city is seen from above, like a model town. After every win the hero walks into that part of the city: "Mission complete!", and the fix plays out. A Booming meter rises with each fix and never goes down by itself. (L4, L5, L7)
37. Safety missions: the enemy is the Shadow (dark, empty, broken places), never people. The hero helps a made-up Safety Team; no real police, uniforms or badges, and no place shown as dangerous. (L6)
38. The challenge road map replaces the Challenges list. Losing any challenge keeps everything collected. A win pays for the fix it was played for at once. The Booming meter replaces the people counter. Safety missions come after slice 3.

Tp's words, in short: the lane run has power-ups like electricity and technology; what you collect is used to fix Lagos. Enemies chase you; if they catch you, you lose. Goats say "meeh" when hit. Anything you hit gives a value (Naira, light or technology) that goes into its bucket. Like the minions lane run game.

How po reads it (to check with Tp), and the rules it must keep:
1. **Three buckets: Naira, Power and Tech.** Pickups on the lane run: coins (Naira), a glowing bulb or lightning bolt (Power), a small chip or signal bars (Tech). Each fix in the city needs its own kind: "Lights out" costs Power, "Slow internet" costs Tech, "Potholes" costs Naira. This changes city choice 7 ("any Naira fixes anything"), so it needs Tp's yes.
2. **Things you hit give value.** Crates, junk piles and old broken signs burst when you run into them or jump on them, and pop out Naira, Power or Tech. Goats are never hurt: you bounce off a goat, it says "meeh" and trots off the road, and a few kobo pop out. Our own sounds and our own pop, never another game's coin or block sound (CLAUDE.md rule 2).
3. **The chaser is a problem, never a person or an animal.** po's pick: **the Blackout**, a creeping darkness from the Light Taker that switches the street lamps off behind you. Other options: the Go-Slow, a jam of honking cars rolling up behind; or a storm of Red Tape forms. Never police, guards, area boys, a dog or any group (CLAUDE.md rules 3 and 4).
4. **How you lose.** Instead of lives, the top of the screen shows how far behind the chaser is ("Blackout: 40 m behind"). Bumping into something you should dodge, like a stuck car, makes you stumble and the chaser gets 15 m closer. Power pickups push it back. If it catches you, the run ends, and everything you collected still goes home (losing never takes your pickups). Gentle mode: the chaser starts further back and gains more slowly.
5. **Change to the designer's guard list.** City.md 2B said "nobody chasing the hero at all", to stay far from Subway Surfers (the guard and dog) and Temple Run (the monster). A creeping Blackout is our own idea, but designer must keep it clearly different: no person, no animal, no monster face, and no "stumble once, caught the second time" rule.

**Waiting for Tp (recommended answer first), L1 to L7:**
- **L1. Buckets:** a) three buckets (Naira, Power, Tech), each fix needs its own kind; b) everything turns into Naira.
- **L2. The chaser:** a) the Blackout; b) the Go-Slow jam; c) the Red Tape storm.
- **L3. How you lose:** a) the chaser's distance, closing in when you stumble, and you keep everything you collected; b) lives, as on the streets, plus the chaser.
- **L4. City view (asked 10 Nov):** a) Lagos from above, like a model town (Tp's castle-game cue); b) the side view first planned. And the challenge road map: yes or no (po: yes).

**Tp, 10 Nov (later): mission complete, safety, and the boom.** Tp's words, in short: after a successful run we always see the hero walk into that part of the city, "mission complete", and see what the win did to it. Some places have a lot of crime because of the problems; the hero helps the police and the people on a mission to fight crime. It never ends: Lagos booms as a centre of excellence, and we keep fixing to keep it booming.

- **L5. Mission complete walk-in.** po: yes, no problem. After a win: the hero gets off the bus in that part of the city, the heading says "Mission complete!", and the fix plays out around them (tarmac rolls, lamps switch on, people and buses come back). 4 to 6 s, tap to skip. Recommended: a) yes, after every won challenge.
- **L6. Crime and safety.** po flags three rules. CLAUDE.md rule 3 says bosses are problems, never people, and a criminal is a person. Decision line 19 (waiting to be pasted) and city.md "Words" say no place is shown as dangerous or to blame, and a "high crime" area of Lagos would be read as a real place. Police are a sensitive topic in Nigeria, so real police uniforms, badges or raids would read as real and political. And the game is for young players, so no fighting people.
  - a) **Safety missions where the enemy is the cause, not people (po's pick).** A part of town goes quiet and unsafe because of problems: dark streets, broken bus stops, no jobs. The boss is a problem with a shape: **"the Shadow"**, which grows where lamps are out and places are empty. The hero, with a made-up neighbourhood Safety Team (our own bright vests, no real badge), switches the lights on, opens a skills hub and a busy market, and the Shadow shrinks away. The area gets a "Safe ✓" badge. Best case: keeps Tp's idea (help the people, make it safe, never ends) with no person as an enemy.
  - b) Hero helps a made-up Safety Team stop made-up "Grabbers", shown as faceless shadow shapes that drop what they grabbed and run off. Best case: closer to "fight crime". Risk: still reads as chasing people.
  - c) Real police and criminals. po does not recommend it: it breaks rules 3 and 4, and some players have hard memories with police.
- **L7. The boom.** po: yes, already the plan (city.md "It never ends"). Add one visible "Lagos is booming" meter: each fix raises it, and at set marks Lagos gets bigger (new buildings, a busier skyline, more people). It never goes down by itself. Recommended: a) yes.

Next for designer: once Tp answers, rewrite city.md 2B with these, and draw the three pickups and the chaser with art. Nothing is built before that.

## po note, 9 Nov 2026 (cloud, read this first): one main, PR #1, and the intro

Accepted: nothing new (no built work came in).
Settled: the intro story (T1 to T4), reported by the lead from Tp, below. One check with Tp before building.
Waiting for Tp: R1 to R10 (PR #1 against the built game), city choices 2 to 9, and a yes to the merge plan. Recommendation: the first option in each.
Blocks: the name (R1) blocks only the title and page name. Nothing else stops P1 and P2.

### Answered by Tp in chat, 10 Nov 2026 (cloud session, tap cards)

- **Merge: yes.** The built game goes onto main (one main). PR #1 stays open until R2 to R10 are answered.
- **R1 name: Gbese!** Not po's pick (Go Naija Go). The game keeps "Gbese!" as built; the repo name stays go-naija-go. When PR #1's parts come in, "Go Naija Go" is not used as the game name.
- **Intro: confirmed as Tp reads it, and the new caption 2 is right:** "The Wheel turned, and Lagos grew. More people came, and they need more roads, more light and more buses."
- **The rest:** answered one by one in chat, below.

Rounds 1 to 4 (all 10 Nov, tap cards):
- **R2 story:** settled by the intro answer: the Wheel. The Unity Drum story is dropped; Mister Red Tape stays the Abuja boss, as one of the Stoppers.
- **R3 / city choice 8, pepper fufu:** a), fufu and egusi, a ball that rolls and plugs potholes, after slice 3, with an action button then.
- **R4 herder's staff:** c), **not now.** Not po's pick (a, after slice 3). The staff is left out of the plan; the north's first food or tool is chosen later with Hausa and Fulani speakers.
- **R5 equal shares:** a), yes, as a rule kept over updates. Next foods and tools and the next regions (north and east) keep the balance. Other groups join over time.
- **R6 potholes:** a), the bus stop restart stays; a small warning sign before each wide pothole; in Gentle mode the hero climbs out just before the pothole.
- **R7 words:** a), "lives" and "Gentle mode".
- **R8 worlds:** a), keep the built plan; PR #1's equal north / east / west worlds, their instruments and the Flood are the plan for later regions.
- **R9 art:** a), code art now; a human artist before a public launch.
- **R10 closing line:** a), not in the game. Tp to remove Done when 8 from the brief.
- **City 2:** a), finish slice 2 polish and P3, designer writes slice 3. **City 3:** a), the lane run moves by itself, there only. **City 4:** a), on foot past a go-slow to a bus stop, "Lane run" for now. **City 5:** a), throws only while a throw food works, at problems only. **City 6:** a), 12 s for every food (amala 14 to 12). **City 7:** a), any Naira fixes anything, no timers, never sold for real money. **City 9:** a), code art; Blender side test on one city picture.

Nothing waits for Tp now except pasting the lines into docs/decisions.md and the brief edits.

Lines for Tp to paste into docs/decisions.md:
26. One main: the built game is merged into main (10 Nov 2026).
27. The game is called Gbese! (confirms line 5).
28. The story is the Wheel; the Unity Drum is dropped. (R2)
29. Fufu and egusi plug potholes, after slice 3. No herder's staff for now. (R3, R4)
30. Hausa, Igbo and Yoruba get an equal share of foods, tools, worlds, music and helpers over the updates; other groups join over time; bosses belong to no group. (R5)
31. Pothole falls: back to the bus stop, a warning sign before wide potholes, and in Gentle mode climb out just before the pothole. (R6)
32. City choices 2 to 9 as po recommended: slice 2 polish first, lane run moves by itself there only, on foot past a go-slow, throws only with a throw food, every food 12 s, Naira spent on fixes with no timers, code art with a Blender side test. (City 2 to 9)
33. Code art for the test; a human artist before a public launch. North, east and west worlds of equal size come in later regions. (R8, R9)

### Intro story: answered by Tp, 9 Nov 2026 (reported by the lead)

Tp's words: "I accepted your proposal on the intro." That is the lead's rewrite: the people of West Africa make the Wheel themselves; no outside group arrives and finds them.
- T1: the people made the Wheel. No faith words.
- T2: "the Stoppers", made-up troubles, never people.
- T3: "the Wheel Hero".
- T4: 6 still frames, "Skip" from the first frame, plays once, then "Watch the story" in Settings.

Captions for designer (po's recommended set, caption 1 replaced by Tp's chosen opening):
1. "Long ago, light shone on West Africa. Its people and its rich land made the Wheel, so everyone could share, stay safe and keep going."
2. "More people need more roads, more light and more buses."
3. "Nigeria's Wheel keeps it all moving. The Wheel was made for everyone."
4. "But the Stoppers want it stuck: traffic, potholes, power cuts and red tape."
5. "Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you."
6. "Your journey starts now. Build up Lagos. Get Nigeria working." Button "Let's go"

po flag for designer: the old caption 1 said Lagos grows and people keep coming. Without it, caption 2 ("More people...") comes from nowhere. Suggested caption 2: "The Wheel turned, and Lagos grew. More people came, and they need more roads, more light and more buses." Caption 1 is long for 320 x 240; designer may split it over two lines, never cut its words.

**Checked with Tp, 10 Nov:** yes, and the new caption 2 is right.

Line for Tp to paste into docs/decisions.md:
25. The intro story: the people of West Africa made the Wheel for everyone; the Stoppers (traffic, potholes, power cuts, red tape) want it stuck; the player is the Wheel Hero. Six skippable frames before the first hero build. (T1 to T4)

### PR #1 against the built game (R1 to R10)

Full list of differences: docs/pr1-compare.md. First option is po's pick.

**R1. What is the game called?** You chose "Gbese!" on the Mac (6 Nov, Q1), and the game shows it. PR #1, made the same day in your project thread, says "Go Naija Go", and the repo is named go-naija-go.
- a) Go Naija Go. Best case: matches the repo, the Pages link and the "Get Nigeria working" story; warm and easy in every part of Nigeria.
- b) Gbese!. Best case: short and already built. But "gbese" means debt in Yoruba, so it reads as one group's word and an odd fit for a building game.
- c) Something else.
Why a): it matches the link players will see and fits the Wheel story. A one-setting change (GAME_NAME, page title, manifest). Blocks: title and page name only.

**R2. Unity Drum or Wheel?** PR #1's story is the Unity Drum, broken in six pieces by Mister Red Tape. The built game has the Nigeria wheel, and you just chose the Wheel intro.
- a) The Wheel. Drop the Drum story. Mister Red Tape stays the Abuja boss, as one of the Stoppers.
- b) Both: the Wheel, and each boss holds a glowing cog piece (PR #1's "see the prize" idea, as a cog).
- c) The Drum instead.
Why a): your intro answer already picks the Wheel. b) is a nice later add for the boss halls; designer can pitch it.

**R3. Pepper fufu.** PR #1: a version 1 power-up, 8 balls thrown with an action button. City choices 5 and 8 (open): throws only while a throw food works, fufu and egusi plug potholes, after slice 3.
- a) City choice 8 a: fufu and egusi, a ball that rolls and plugs potholes, after slice 3, with an action button then.
- b) PR #1's fufu (8 throwing balls) in slice 3.
- c) No fufu yet.
Why a): it fixes a problem instead of hitting things, and it fits the city loop. It is the first Igbo-home food, so it matters for R5.

**R4. Herder's staff (sanda).** PR #1: a version 1 tool (swing, vault, takes a hit). Not in the built game.
- a) Yes, after slice 3, named "Herder's staff (sanda)", checked by Hausa and Fulani speakers first, used only to clear and vault, never against an animal.
- b) Yes, in slice 3.
- c) Not now.
Why a): it gives the north its first tool and a fun vault, but herding is sensitive; it needs speakers' checks before it ships.

**R5. Equal shares for Hausa, Igbo and Yoruba.** PR #1 puts this in CLAUDE.md rule 4 and the brief. The built game has three Lagos streets and amala.
- a) Yes, as a rule, kept over each update: the next foods and tools are pepper fufu (R3) and the staff (R4), and the next regions are north and east before more of the west. Other groups join over time.
- b) Yes, and rush fufu and staff into slice 3.
- c) Keep the softer rule "every part of Nigeria".
Why a): the rule is right, and keeping it over the next updates is honest about what one Lagos world can hold.

**R6. Falling in a pothole.** PR #1: climb out just before that pothole, and a warning sign and cone before every pothole. Built: back to the bus stop or start; cones only on big pits.
- a) Keep the bus stop restart; add a small warning sign before each wide pothole. Gentle mode climbs out just before the pothole.
- b) Always climb out just before the pothole (PR #1).
- c) Keep it as built.
Why a): the streets are tuned for "3 tries or fewer" with today's rule; b) would make them too easy. a) is kind to gentle players and adds the warning PR #1 asked for.

**R7. "Lives" or "hearts", "Gentle" or "Easy"?**
- a) Keep "lives" and "Gentle mode" as built. b) "Hearts" and "Easy mode" (PR #1).
Why a): built, tested, and "gentle" judges no one (po, 6 Nov).

**R8. Worlds.** PR #1's world list (market, north / east / west worlds of equal size with their own instruments, the Flood boss) against the built plan (regions of states, the wheel, the Lagos city loop).
- a) Keep the built plan; add PR #1's equal north / east / west worlds, instruments and the Flood as the plan for later regions.
- b) Use PR #1's list instead.
Why a): it keeps both. Nothing changes in slice 3.

**R9. Art level.** PR #1: "high detail, final art needs a human artist". Built: drawn in code by the art agent.
- a) Keep drawing in code for the test; plan a human artist (paid or volunteer) before a public launch. Linked to city choice 9 (Blender test).
- b) Find a human artist now.
- c) Code art only.
Why a): code art keeps the game tiny and the test moving; a real artist is the biggest step up before launch.

**R10. The closing line.** PR #1 keeps "Remember: a wrong premise often leads to a misleading conclusion." in CLAUDE.md rule 8 and the brief. You said on 7 Nov it is not in the game.
- a) Not in the game, as you said. When PR #1 is closed, its rule 8 and brief Done when 9 are dropped. Please also remove Done when 8 from the brief.
- b) Put it back.
Why a): your 7 Nov answer.

**Merge plan (needs your yes):** see "How to get one main" in docs/pr1-compare.md. In short: the cloud branch already holds main's history joined to the built game. With your yes, we merge it into main (the game goes to Pages), then bring in the PR #1 parts you choose in R1 to R10, then close PR #1.

## Tp, 9 Nov 2026 (third message): handover notes

**Lead note.** Work moves off Tp's company Mac to the GitHub repo DigiSelf-creator/go-naija-go (branch `local-build`). Cloud sessions continue from there.

Confirmed by Tp:
- N1 to N4 (Naira): all as po recommended. Coins are worth 10 kobo, 100 kobo = ₦1, money shows as "80 kobo" / "₦3.40", old bests x10 with the purse starting at ₦0, and ₦ falls back to "N".
- S1 a (respect the silent switch). City choice 1 (city loop). City choice 10: "Build up Lagos. Get Nigeria working."

Tp's story, in their words (for po and designer to shape into T1 to T4 and the intro):
- "Light shone on a group of people and they proceeded to a continent named Africa. On the western part they found a set of people and resources that ensured all will be sustainable and secured the region by creating the wheel....."
- Lead's flag for po: "a group … proceeded to Africa and found a set of people" can read as outsiders arriving and finding the people already there (a colonial picture). Suggest keeping the light and the wheel but making the people of West Africa the makers. For example: "Long ago, light shone on West Africa. Its people and its rich land made the Wheel, so everyone could share, stay safe and keep going." Tp to choose.

Still open: T1 to T4 and the intro version, city choices 2 to 9, and reconciling PR #1 ("Go Naija Go" rename and brief changes) with this work.

Tp's new game ideas (9 Nov), for designer, art and gamedev in the cloud:
1. Something to swing on (Tp said crates; designer proposes our own swing object).
2. While corn works, a corn tune of our own plays over everything until it ends (never Mario's star music).
3. Each street gets soft city noise (buses, okadas, market) under the music, still orderly.

## po acceptance, 9 Nov 2026: O music

**po note (read this first).** Accepted: O (music), branch gamedev/s2-o2-music at b2c21d5. Waiting for Tp: nothing new; one ruling below Tp may overturn (recommend: keep it). Blocks: nothing. pm: merge O2, then P1.

**Verdict: accepted.** qa O3 passed it with no bugs (reported): unit 633/633, e2e 137/137, worst 56.5 fps at 4x CPU with music on or off, first load 330.2 KB (limit 3 MB). po checked in the code (verified): each place gets the S2.9 tune (menus, streets 108/112/116, well, hall 128/134/140 stepping at the next bar after a hit, cleared and win once, game over silent); Pause, a hidden page and the phone turned upright hold the tune and carry on from the same bar; "Music: on / off" sits on the title and Pause, M toggles it, `gidi-music` remembers it. This meets O2's done-when, R1 (confirmed by Tp, 8 Nov) and the slice 2 goal "hears music with its own on/off switch". No network, no trackers, nothing to download (brief "Done when" 5 and 6).

**Ruling 1, Sound and Music (po ruling, Tp may overturn).** Keep gamedev's choice: music plays only when Sound and Music are both on.
- Why (reasoned): in play the HUD has one quiet button, Sound (S2.10 HUD). A teen who taps it when a teacher walks in or a sibling is asleep expects the game to go quiet. If music kept playing, that button would not do its job.
- R1 still holds: Music is its own switch. Music off stops the tunes and keeps the sound effects.
- The Music switch keeps showing the player's own choice ("Music: on") while Sound is off, so the tune comes back by itself when Sound comes back. Accepted as is.
- Proposed wording for designer, S2.9 rule 5 (design.md, not Tp's files): "Sound off makes the game quiet, music too. Music off stops only the tunes. Each switch shows its own setting."

**Ruling 2, the two 5-note fragments: wait for the P3 listen, no change now.** qa reasoned from the note data and did not listen (reported).
- E G E D C: a major key with a different rhythm, mid-phrase. The riff it brushes is minor, starts on a repeated note and is known by its rhythm (reasoned).
- D C E G C: the same steps as the end of a famous phone ringtone, but a different rhythm, mid-phrase (reasoned).
- S2.9 bans following a known tune's opening; neither is an opening, and five common notes alone do not make a song (opinion). If a listener in P3 hears either song, art moves one note in that spot; it is a data change in src/art/tunes.ts, so it cannot hold up slice 2.

**For pm to add to P3 (po asks; pm owns plan.md):**
1. A human listen to every tune, the two fragments first. If either sounds like the known song, art changes one note there.
2. On a real iPhone: the silent switch silences music too (Tp chose S1 a; confirmed line 22), and a call mid-level holds the tune and brings it back on the same bar.
3. Street 3 really plays faster than street 1 (116 BPM, measured or by ear).
4. Sound off in play makes everything quiet, then Sound on brings the music back if Music is on (Ruling 1).

## Tp, 9 Nov 2026 (second message)

Tp's words, in short: respect the switch; sound works, no music yet; GitHub access is back; kobo becomes Naira (100 kobo = ₦1), more Naira builds more city; "Build up Lagos"; an intro story about Lagos growing and the Wheel Hero.

**po note (read this first).**
Accepted: nothing new (no built work came in).
Settled: S1, city choice 1 and city choice 10 (lines below). Tp also hears game sound on the iPhone now (reported by Tp), so the quick fix works on a real phone.
Waiting for Tp: N1 to N4 (Naira), T1 to T4 (story, hero name, intro). Recommendation: the first option in each.
Still open from "City direction": choices 2 to 9 (end of this block).
Blocks: nothing today. Naira and the intro go into slice 3. designer can draft both with the recommended answers; nothing is built until Tp says yes.

### Confirmed lines for Tp to paste into docs/decisions.md

22. On iPhone the silent switch wins: in silent mode the game makes no sound. The Pause screen shows, on iPhones only, next to Sound: "No sound? Turn off silent mode on your phone." (S1, a)
23. The game becomes a city loop: the Lagos city screen is home, challenges earn money, money fixes and builds the city, and it never ends. (City choice 1, a; Tp's story, 9 Nov)
24. The title line is "Build up Lagos. Get Nigeria working." (City choice 10, a)

No decision needed: no music yet is expected; gamedev is building the music (O2) now.
GitHub access is back: noted for pm and gamedev (hosting, brief "Tech" 6). No product choice.

### Naira: what changes

Today (verified in code): a run counts kobo, 1 per coin. HUD "Kobo 87". Cleared line "...You got {kobo} kobo." Game over "You got {kobo} kobo." Streets card "Best: {best} kobo". The save `gidi-progress` keeps only a `best` per street. There is no saved purse yet, so no spending money has to move over.

po's plain rule (recommended):
- You pick up kobo coins in a run. 100 kobo make ₦1.
- One way to show money everywhere (HUD, cards, city): under 100 kobo, "80 kobo". From 100 kobo up: "₦3.40", "₦12", "₦1,250".
- The game stores whole kobo only. ₦ is only how it is shown, so nothing is ever rounded away.
- A run's kobo goes into the city purse when you take it home. No exchange step: 340 kobo simply is ₦3.40.
- Fixes cost Naira. Win prizes are in Naira.
- Game money is never sold for real money and never turns into real naira (CLAUDE.md rule 5; brief "Money (not in version 1)").

**N1. How big is a coin?** Today a street run gives about 60 to 150 coins.
- a) Each coin is 10 kobo. A run gives about ₦6 to ₦15, plus a ₦5 win prize. Fixes cost ₦10 to ₦30; the hall pays ₦15. Best case: kobo rolls into a new Naira every 10 coins, and a fix still takes one or two wins (city choice 7 a).
- b) Each coin is 1 kobo, as now. A run gives about ₦1; fixes cost ₦1 to ₦3. Best case: nothing changes in runs.
- c) 10-kobo coins plus a rare ₦1 coin on harder paths. Best case: a big Naira moment that rewards risk. Needs new art and a design note.
Why a): b) makes Naira feel tiny, the opposite of what Tp asked. c) is fun but more work; it can come later on top of a).

**N2. What the player sees (exact words, with N1 a).**
- HUD chip: "₦3.40" (under ₦1: "80 kobo"), with a small pop each time a new Naira is reached.
- Street cleared: "{street name} is moving again, thanks to you! You got ₦8.70."
- Game over: "You got 90 kobo. The street is still here. Try again!"
- Streets card: "Done ✓ Best: ₦8.70"
- Hall win (once the city is built): "You cleared General Go-Slow with {lives} lives left. You got ₦15 for Lagos."
- City: counter "₦24.50". Problem card: "Run the street to raise money for the repair." Button "Fix it (₦10)". End-card button "Take it home" (was "Take the kobo home").
- Fix costs (slice 3): Potholes ₦10, Go-slow bus stop ₦15, Lights out ₦10.
- Screen readers hear "8 naira 70 kobo", not "naira sign 8 point 7 0".
Recommend: yes, as written. Other option: keep "Kobo 870" in runs and show ₦ only in the city (best case: no HUD change). po does not pick it: two ways to show one purse confuses a 10 year old.
Note: pending line 19 says "You got {kobo} kobo." With N2 it reads "You got {money}." under the rule above.

**N3. Old saves.** Only a `best` per street is saved today, at 1 kobo a coin.
- a) On first load after the change, multiply each saved best by 10 once and mark the save as moved (`v: 2`), so it never happens twice. Merge, never overwrite, as now. The purse starts at ₦0. Best case: old and new bests compare fairly, and no money appears from nothing.
- b) Keep old bests as they are. Best case: nothing to build; old bests look small next to new runs.
- c) Also give returning players a welcome gift (say ₦10). Best case: early testers can fix one thing at once.
Why a): fair and small. Bests are records, never money (docs/city.md, "Kobo" row), so they must not fill the purse.

**N4. The ₦ sign on cheap phones.** ₦ is in Unicode (U+20A6). Android's usual fonts (Roboto, Noto) have it (reasoned, not tested on a phone). Very old phones may show an empty box.
- a) Use ₦. qa checks the slow-phone profile and one real cheap Android. If any shows a box, show "N" instead ("N3.40"), which Nigerians already write. Best case: the real sign where it works, still clear where it does not.
- b) Always "N". Best case: never a box.
- c) Draw our own ₦ in code, like the rest of the art. Best case: the same on every phone; a bit more work.

### The story

Tp's story is strong and fits the game: Lagos grows, people come from everywhere, it needs more roads, light and buses to stay great, and a hero keeps Nigeria's Wheel turning. It matches the wheel already in the game. Four parts clash with our rules, so po proposes wording.

1. "Some group wanted it only for themselves after independence." Players will read this as a real party, elite, tribe or government. That breaks CLAUDE.md rule 3 (no real people, parties or officials) and rule 4 (mock no one). The enemies must be made-up problems with shapes, never people or groups.
2. "The leaders need more strategy." This points at real government; the Alausa guard (design S2.6) says no word about government anywhere. Proposed: the story says what Lagos needs, and the player builds it.
3. "The principalities" and "the creator sent" are faith words. "Principalities" comes from one faith's idea of evil spirits; it would make the bosses spirits and the game a faith story. The game is for every faith in Nigeria (rule 4). Proposed: no faith words. "The Creator" stays only if Tp wants it (T1 b).
4. "He." The player picks male or female (brief "Your hero"). The story says "the hero" or "you".

**T1. Where the Wheel comes from.**
- a) No faith words, no dates: "The Wheel was made for everyone." "Nigeria called a hero." Best case: every player, of any faith or none, feels it is their story.
- b) One gentle line: "The Creator gave the Wheel to everyone." Best case: closest to Tp's words; many faiths in Nigeria share the idea of a creator.
- c) Independence as a happy moment, with no one to blame: "At independence, the Wheel was given to everyone." Best case: real pride in Nigeria's story.
Why a): it keeps Tp's meaning (the Wheel belongs to all) with nothing to argue about. "Principalities" is in no option.

**T2. Who stops the Wheel?**
- a) "The Stoppers": made-up troubles with shapes, not people. They are our bosses (General Go-Slow, King Pothole, the Light Taker, Mister Red Tape); greed, waste and delay can be later bosses. Best case: plain, says what they do, keeps Tp's "evils" with no group to point at.
- b) "The Wahala" (Pidgin for trouble). Best case: warm and Nigerian.
- c) No group name, just "traffic, potholes, power cuts and red tape". Best case: plainest.

**T3. The hero's name.**
- a) "the Wheel Hero". Best case: Tp's words, short enough for 320 px.
- b) "the Wheel Hero of Nigeria". Best case: Tp's full words; long on small screens, so use it once.
- c) "Keeper of the Wheel". Best case: sounds old and grand.

**T4. Intro captions.** Six still frames drawn in code (well under 50 KB), plain words. "Skip" shows from the first frame; a tap moves on. It plays once, before the hero builder on the first visit, then lives under Settings as "Watch the story". A call or a turned phone pauses it, and that frame starts again. Words are real text, so screen readers read them.

Recommended (T1 a, T2 a, T3 a):
1. "Lagos never sleeps. Every day, more people come to build a dream here."
2. "More people need more roads, more light and more buses."
3. "Nigeria's Wheel keeps it all moving. The Wheel was made for everyone."
4. "But the Stoppers want it stuck: traffic, potholes, power cuts and red tape."
5. "Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you."
6. "Your journey starts now. Build up Lagos. Get Nigeria working." Button "Let's go"

Variant (T1 b and c, T3 b; closer to Tp's words):
1. "At independence, the Creator gave Nigeria's Wheel to everyone."
2. "The Wheel turned, and Lagos grew. People came from every part of Nigeria."
3. "Lagos needs more roads, more light and more buses to stay great."
4. "But the Stoppers want the Wheel for themselves: traffic, potholes, power cuts and red tape."
5. "So a hero was sent: the Wheel Hero of Nigeria. That hero is you."
6. "Your journey starts now. Build up Lagos. Get Nigeria working." Button "Let's go"

Both are po drafts; designer fits them to 320 x 240 and po checks the final words.
If Tp agrees, a line for the brief (only Tp edits it): "Story: Nigeria's Wheel was made for everyone. The Stoppers (traffic, potholes, power cuts, red tape) want it stuck. You are the Wheel Hero: build up Lagos, then Nigeria, and keep the Wheel turning."

### City choices still open

Settled now: 1 (a, by Tp's story) and 10 (a). Still open, po's pick in brackets (full options under "City direction (9 Nov 2026)" below):
- 2. What first (a). The team is already doing a), so Tp only needs to object.
- 3. Lane run moves by itself (a).
- 4. Lane run setting and name (a).
- 5. Food throws (a).
- 6. Food length (a, 12 s).
- 7. Money spent on fixes (a). Tp's "more Naira, more money to build the city" says yes to spending; only the detail (no timers, nothing breaks while away) is left.
- 8. Fufu (a).
- 9. Blender side test (a).
Also still waiting: pasting lines 5, 6, the "wrong premise" line, 7 to 21 and the new 22 to 24, plus the "Lines for Tp" at the end of docs/city.md.

## po note, 9 Nov 2026, later: quick fixes accepted

Accepted: the quick fixes (sound on iPhone, longer foods, HUD step 4), branch gamedev/s2-quick-fixes at ff810d3. See "po acceptance, 9 Nov 2026: quick fixes" just below.
Waiting for Tp: one new sound choice (S1, below). Recommendation: a), keep the silent switch working as it does now and add one plain hint. The 10 city choices and the decisions.md paste still wait too.
Please, Tp: when you test sound on your iPhone, turn silent mode off first (the side switch shows no orange; on newer iPhones, check the Action button or Control Centre) and turn the volume up. In silent mode, iPhones mute game sound, so it can look like the fix failed.

## po acceptance, 9 Nov 2026: quick fixes

Verdict: **accepted.** Branch gamedev/s2-quick-fixes at ff810d3 (cut from main 06982ab). Merge it and get it onto Tp's phone.
Why, against the brief:
- Done when 3 ("All three food power-ups work and say what they do in plain words"): verified in the diff. The toasts now say "for 12 seconds" and "for 14 seconds", the short toasts still match, and the HUD counts from 12 and 14. Brief "Power-ups" says "for a few seconds"; 12 and 14 still fit that, and Tp asked for longer.
- Done when 6 ("No network request after load, no trackers, no photo access"): verified in the diff. audio-unlock.ts only listens to taps and keys and plays a silent sample. Nothing is fetched, stored or sent.
- Done when 7 (nothing copied): the silent sample is one blank sample; nothing new to see or hear.
- qa PASS (reported by qa): unit 609/609, e2e 133/133, first load 317 KB, durations, 2 s warning, HUD one row at 320 x 240, amala in the hall.
What is not proven: sound on a real iPhone. qa tested a fake iOS-style audio, not real Safari (WebKit is not installed). The fix matches how iOS is known to work (reasoned), but only Tp's phone settles it. If Tp still hears nothing with the silent switch off, it comes back to gamedev as a bug.

Rulings on qa's follow-ups:
1. **Hazards inside the longer corn (design.md "1370 u" and "1400 u" rules): P2, designer.** Not a blocker: there is no auto-run (Tp, Q18), so a player can let go and slow down before the tyre or drum. But 12 s of corn is about 2740 u of road, so the rule no longer protects what it was written for: street 1 tyre 8900; street 2 tyre 8950; street 3 tyre 9100, drums 9550 and 10200. Designer decides in P2: move those hazards, or restate the rule (for example "a corn stretch has a warning and room to slow down"). Wait for Tp's city choice 6 first (12 s for every food), so this is done once. The tests that hard-code 1370 and 1400 should then be worked out from the corn time in code, so they catch the next change. Tp's own play of the streets also feeds this.
2. **design.md still says 6 s, "Fast 6" and the old toasts: now, designer, a small doc fix on its own branch.** Change the Power-ups table, the toast table and the S2 short-words table to 12 s, 14 s and the toasts as built. Note there that amala may go to 12 s if Tp picks 6 a). design.md is what gamedev builds from, so a stale line could undo this fix.
3. **iPhone silent switch: to Tp, choice S1 below.** Nothing is blocked: the game already respects the switch, which is po's pick.
4. **Test flake at progress.spec:108: now, qa, a small test-only fix on its own branch** (poll after setViewportSize). Not a game bug and does not block this merge, but a gate that fails at random gets ignored.

## Sound choice (9 Nov 2026): answered by Tp, a) (see "Tp, 9 Nov 2026 (second message)", line 22)

**S1. iPhone silent switch.** With the silent switch on, iPhones mute the game's sound. First option is po's pick.
- a) Keep it: the switch wins. Add one line on the pause screen, next to Sound, on iPhones only: "No sound? Turn off silent mode on your phone." Best case: the player stays in charge; no surprise noise in class, church or at night.
- b) Play through the switch (Safari 16.4 and newer). Best case: sound always works once Sound is on in the game.
- c) Keep it, with no hint. Best case: nothing to build.
Why a): a teen who set their phone to silent should not be caught out by game music. The game's own Sound button is still there. b) also stops the player's own music or podcast when the game starts.
Blocks: nothing. Only the hint line (if a) waits; designer writes it into the pause screen note and po checks the words.

## po note, 9 Nov 2026 (read this first): city direction

Accepted: nothing new. docs/city.md is a proposal, not built work.
po checked city.md against the brief, decisions, the pending lines 7 to 21 and CLAUDE.md, and fixed it in place: no real place name in a "something is wrong" line (line 19, Alausa guard); beggars never in the game at all; no brands on signs or masts; bridges drawn our own way; the lane run is phone sideways and pauses on a call with a "3, 2, 1" restart; more "must not copy" guards for Subway Surfers and for Homescapes and Township; the hall's 150 kobo changes the M4 Win line; kobo is never sold for real money.
Waiting for Tp: the 10 choices below. Recommendation: the first option in each. Still waiting too: pasting lines 5, 6, the "wrong premise" line and 7 to 21 into docs/decisions.md.
Blocks: slice 3 only. O, P and the no-sound fix can go on now.

## City direction (9 Nov 2026): 1 and 10 answered (a), 2 to 9 waiting for Tp

Full detail: docs/city.md. First option is po's pick.

1. **Make Lagos a city you fix, as home?** a) Yes: the city is home, challenges earn kobo, kobo fixes it, never ends. b) Yes, later, after more streets. c) No, stay a side-view game.
2. **What first?** a) Finish music and slice 2 polish plus the no-sound fix, while designer writes slice 3. b) Only the sound fix, rest goes to slice 3. c) Stop slice 2, start slice 3.
3. **May the lane run move by itself?** You said "no auto-run anywhere" (Q18). a) Yes, in the lane run only; it cannot work otherwise. b) No, drop the lane run.
4. **Lane run setting and name?** a) Running on foot past a go-slow to a bus stop; nothing drives at you; "Lane run" for now. b) Market road on market day. c) New road before it opens.
5. **Food throws?** a) Only while a throw food works, at problems only, never people; goats fed off the road. b) Throwing all the time, food changes the throw (makes dodging pointless). c) No throws yet.
6. **How long do foods last?** a) 12 s. b) 10 s. c) 15 s.
7. **Kobo becomes money you spend on fixes?** a) Yes: any kobo fixes anything, one or two wins per fix, no timers, nothing breaks while away, never sold for real money. b) A fix also needs a win in its own challenge. c) Fixes take real time to finish (leans to paying later).
8. **Fufu?** a) Fufu and egusi: a fufu ball rolls and plugs potholes, after slice 3. b) Same, in slice 3. c) Fufu is a shield, no throw.
9. **Art: try Blender?** a) Keep drawing in code; try Blender (free, about 300 to 400 MB) on one city picture as a side test. b) Install now, render the city and lane run. c) No Blender.
10. **New title line?** a) "Build up Lagos. Get Nigeria working." (po: "development never ends", and no real place called broken). b) "Fix Lagos. Get Nigeria working." (designer; matches the wheel's "Fix Lagos to turn the first cog."). c) Keep "Fix the streets. Get Nigeria working."

If 1 is a): the brief and decisions need new lines. Suggested wording is at the end of docs/city.md ("Lines for Tp"). Only Tp edits those files.

## po note, 8 Nov 2026, night (read this first): N accepted

Accepted: N (saving, Streets cards, Nigeria's wheel), branch gamedev/s2-n2-progress at 1ab6bca, after qa's N3 retest passed. See "po acceptance, 8 Nov 2026: N2" under Slice 2.
Waiting for Tp: nothing new. Only pasting lines 5, 6, the "wrong premise" line and 7 to 21 into docs/decisions.md. Recommendation: paste them as written.
Moved on: one hint fix to P2 polish; one storage edge case to later; two edge cases need no action. po added one line under P2 in docs/plan.md (pm owns plan.md; pm, please keep or reword it).

## po note, 8 Nov 2026, evening (read this first): N2 open choices ruled

Accepted: nothing new. N is not accepted yet (N4 waits for gamedev's one change below and qa's re-check).
Ruled: gamedev's six N2 open choices (a) to (f), see "po ruling, 8 Nov 2026: N2 open choices" under Slice 2. Five stay as built; one changes: the garri parcel is used up when Go-Slow Hall is won (decision line 18, Q23).
Waiting for Tp: nothing new. Only pasting lines 5, 6, the "wrong premise" line and 7 to 21 into docs/decisions.md. Recommendation: paste them as written.

## po note, 8 Nov 2026, later: Q22 street names fully answered

Accepted: nothing new to accept in this note. No code has changed yet; the names go in with N2.
Answered: Q22 is fully answered. Tp confirmed the street names in chat on 8 Nov 2026, choosing the recommended option: Street 1 (home) **Alausa**, Street 2 (market) **Computer Village**, Street 3 (bus park) **Ikeja**. The backups (Ogba, Opebi, Ojota) are not used. Earlier the same day Tp chose the cleared line "{street name} is moving again, thanks to you! You got {kobo} kobo." (already decided in docs/design.md S2.10).
Tp's override, on the record: the Q22 rule (rule 2 below) says "if you are not sure, skip it". Alausa is also a Yoruba family name, and no one has confirmed whether the area honours a person or a family. Tp was told this, and was told Alausa is the seat of the Lagos State Government, and chose Alausa knowing both. So Alausa stands by Tp's own choice, not because it passed rule 2. The guards in design S2.6 ("Alausa, two checks") still apply: no government building, crest, flag, office sign, uniform or official on the street, and no word about government anywhere. If anyone later confirms the name honours a person or family, po will bring it back to Tp with Ogba as the swap.
Waiting for Tp: only pasting the lines into docs/decisions.md (5, 6, the "wrong premise" line, 7 to 21 below). Line 19 is new wording with the exact names and the cleared line. Recommendation: paste them as written.
Moving now:
- **designer (please do, po does not own design.md):** in docs/design.md, change S2.6 "Street names" from "proposed" / "until Tp says OK" to "decided by Tp, 8 Nov 2026". Do the same in the places that still say the names wait for Tp: the S2.10 Streets card row ("proposed, waiting for Tp's OK"), the S2.10 cleared-line note ("Until Tp OKs the street names"), and art list item 9 ("names may change ... if Tp agrees"). Keep the "Alausa, two checks" guards as rules, and add that Tp chose Alausa knowing both checks.
- **gamedev (N2):** put the three names in the `name` field of lagos-1.json, lagos-2.json and lagos-3.json, the Streets cards, and the cleared line, word for word. Nothing else in the level files changes.
- **pm:** update the Q22 row and N2's task line in docs/plan.md: names decided.
- **qa (N3):** "Computer Village" with 3-digit kobo and the parcel line on, at 320 x 240, as S2.10 says.
Blocks: nothing.

## po note, 8 Nov 2026: Tp answered Q16 to Q25

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
  - **Fully answered by Tp in chat, 8 Nov 2026:** Street 1 Alausa, Street 2 Computer Village, Street 3 Ikeja (designer's recommended option). Tp knowingly overrode "if you are not sure, skip it" for Alausa. See the note at the top of this file.
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

Outcome, 8 Nov 2026: Tp chose the names directly (Alausa, Computer Village, Ikeja), so they are decided. po checked them against this rule: Computer Village and Ikeja pass (reasoned, from design S2.6). Alausa does not pass rule 2 on its own, because no one is sure it is not a family name; Tp chose it knowing that, which overrides the rule for this one name. Rule 1's spread (mainland and island) was also set aside by Tp, who asked for names around Ikeja and Alausa.

## Slice 2 requests from Tp, 7 Nov 2026

### po acceptance, 8 Nov 2026: N2

**Verdict: accepted.** Branch gamedev/s2-n2-progress at 1ab6bca. Ready to merge.

Why (reported by qa, N3 retest at 1ab6bca: PASS):
- 597 of 597 unit tests and 133 of 133 e2e. The hall's worst frame rate is 56.4 fps at 4x CPU. First load is 316.2 KB, well under brief "Done when" 5 (under 3 MB). Offline, reloads, 320 x 240, and corrupt, blocked and full storage all passed at 5fffa90.
- The N3 bug is fixed. Pausing during the hall's kind finish no longer loses the win, even with a reload mid-finish. Pause still works on streets, in the well room and in the hall before the third hit. It does nothing on cards or in the bus finish (po M4 rule).
- Ruling (d) holds. A win uses the parcel up and a lost try keeps it. A new parcel found after the win shields the next hall try. There is never more than one.
- Brief "Done when" 1, 5, 6 and 7 still hold. Saves stay on the phone, with no accounts, network calls, trackers or photo access (CLAUDE.md rule 5). qa's originality and no-real-people checks passed.

Verified by po: the fix commits read as qa says. `Run.inPlay` is false in the hall once the boss is beaten. `bossDefeat` saves the hall win. `mergeFinish` writes `parcel: false` on a hall win (src/game/run.ts, src/main.ts, src/game/progress.ts).

qa's two notes:
1. **"Done ✓" and "You have a garri parcel." together on the hall card: confirmed fine.** Ruling (b) covers this. The line shows only after the player finds a new parcel on a street replay, and then it is true: the parcel shields the next hall try. No change.
2. **"PEEP! High honks fly high. Stay low on the floor." can stay up to 3.5 s into the kind finish: goes to P2 polish.** It is not new (it was the same before N2) and it is not wrong, only out of place for a few seconds. Reopening an accepted branch for it would cost a full qa round. Fix as qa says: call `toast.hide()` on `bossDefeat` in src/main.ts. Check it in P3.

Open from N3 (all low):
- **A tab left open shows old cards until reload: no action.** The merge keeps the best of both copies, so nothing is lost. A reload shows the truth. This is reasoned from the merge rule, and qa reports the same.
- **Clearing site data mid-run, then the open tab writes its copy back: no action.** The player's own progress goes back onto the player's own phone, and nothing leaves it. A player who clears data and then keeps playing in the same tab gets a game that keeps working. That is the kinder result (opinion).
- **A phone where every write fails hides the saved look: later, after slice 2.** It comes from the storage.ts probe, not N2, and it is rare. On such a phone nothing can be saved anyway, and the game still plays. Fix later so the look chosen this visit still shows in memory. Not a blocker for slice 2.

plan.md: po added one line under P2 for the hint fix and the later storage item. pm owns plan.md and may reword or move it. pm, please also mark N done after the merge.

### po ruling, 8 Nov 2026: N2 open choices (from gamedev N2, confirmed in the build by qa N3)

Not an acceptance. Branch gamedev/s2-n2-progress. Sources: decisions 1 to 4 and lines 7 to 21 above (Tp, 8 Nov: "All answers are Ok"), design S2.5, S2.6, S2.8, S2.10, S2.11, plan N2. No question for Tp.

- **(a) Hall card says "Done ✓" with no Best line: keep.** The hall has no kobo (po M4 note, S2.10 Win row), so "Best: 0 kobo" would be a zero at the big moment. Words: "Done ✓". designer: S2.10 Streets row, add "(hall: "Done ✓")" after the done line.
- **(b) Hall card with a parcel saved: keep.** Lines: "Go-Slow Hall" (bold), the status line, then "You have a garri parcel." The hall card has no small "Street n" line, so nothing is lost. After the hall is won the parcel is used up (d), so the line beside "Done ✓" shows only if the player picks up a new parcel on a street replay, and then it is true: it will shield the next hall try.
- **(c) Street cards in three lines at every size: keep.** Plan N2 (h) asks for three lines; one layout is one thing to build and test (the same reason as the wheel fit rule, S2.8), and the bold place name reads better than a long one-line label (opinion). Words per card: "Street 2" (small), "Computer Village" (bold), the status line. designer: S2.6 "Fit at 320 px", change "Wider screens show "Street 2: Computer Village" on one line, as before." to "Every size uses the same three lines." and the S2.10 Streets row to match.
- **(d) Parcel stays saved after the hall win: change.** Decision line 18 (Q23): "It starts every Go-Slow Hall try with the shield on, until the hall is cleared." So winning the hall uses it up: write `parcel: false` with `hall.done: true` in the same save. A lost hall try keeps it (every try until cleared). After that, a street replay can find a new parcel in the well room (S2.5 gift rule 6 shows the parcel again once none is saved), which shields the next hall replay; still one at a time, never stacked. No new words: the hall card's "You have a garri parcel." simply goes away on the win. Tests: unit, hall win clears the parcel and keeps unknown fields (merge); e2e, win with a parcel, reload, the hall card has no parcel line and the next hall try starts with no shield.
- **(e) Wheel "Back" goes to where the wheel was opened from: keep.** From the title, back to the title; from Streets, back to Streets; from the Win card, to Streets (S2.10 flow). A player who opens the wheel from the title may have no street done or no hero, so Streets would be the wrong place (S2.10 says Streets is for a player with a street done). designer: S2.8 last list line and the S2.10 flow line, "Back goes to the screen that opened the wheel; from the Win card, to Streets."
- **(f) Cog ratchet and bell each time the wheel opens from the Win card, also with reduced motion: keep.** Reduced motion stops movement, not sound (S2.11 item 6: no wheel spin, tick and name stay); the Sound switch silences it (S2.11 item 2). A replay win is still a win and earns the same cheer (opinion). It plays only from the Win card, never when the wheel opens from the title or Streets.

Who does what:
- gamedev: (d) only, with its tests. Nothing else changes.
- designer: the S2.6, S2.8 and S2.10 wording in (a), (c) and (e), and S2.5 gift rule 5: add "until the hall is won; the win uses it up."
- pm: add (d) to N2's fix line in docs/plan.md.
- qa: re-check (d) in the N3 follow-up; (a), (b), (c), (e), (f) stand as tested.

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
19. World 1's streets are Alausa (street 1, home), Computer Village (street 2, market) and Ikeja (street 3, bus park). When a street is cleared, the game says "{street name} is moving again, thanks to you! You got {kobo} kobo." Future street names are popular, real places: never a real person, a faith body or a holy place, and no place shown as broken or to blame. Drawings stay our own, with no real building, crest or brand. (Q22)
20. Left-handed players get a "Swap sides" switch in slice 3, after testers try the layout. (Q24)
21. Elders stand tall with no walking stick; elder men have a short, neat grey beard. The row word is "Elder". (Q25)

Number note: the 7 Nov note also suggested a "7." (the "wrong premise" line is not in the game). The numbers are only a guide; Tp can renumber freely when pasting.

### Designer's questions for Tp (Q22 to Q25), from the slice 2 design (all answered 8 Nov 2026)
Each was built with the recommendation until Tp answered.
- **Q22 Street names.** Made-up names ("Your street", "Market road", "Bus park road") or real Lagos areas (Oshodi, Balogun)? Recommended: made-up for now, so no area feels singled out. Affects K2, N1, N2.
  - **Answered by Tp in chat, 8 Nov 2026: real, popular Lagos names** ("We should use popular ones"). Not the recommendation. Designer is choosing the names now, under the Q22 rule at the top of this file.
  - **Fully answered by Tp in chat, 8 Nov 2026: Alausa, Computer Village, Ikeja** (streets 1, 2 and 3), the recommended option from design S2.6. Backups Ogba, Opebi and Ojota are not used. Tp chose Alausa knowing it is also a Yoruba family name and the seat of the state government.
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
