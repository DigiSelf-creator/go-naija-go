# Plan

Owner: pm. Updated 8 Nov 2026. Source: docs/brief.md. Product calls come from po and Tp, never from pm.

## How a task moves

designer note (docs/design.md) -> art -> gamedev -> qa passes -> po accepts -> pm marks done.
One task per branch, small commits. Status: todo, doing, qa, done, blocked.

## Version 1 "Done when" (brief: Done when)

| # | Item | In first slice | Pieces |
|---|------|----------------|--------|
| 1 | Hero built and remembered next visit | yes | B |
| 2 | World 1 level 1 to General Go-Slow and win screen, on a phone, by touch | yes | A, C, E |
| 3 | Three food power-ups work and say what they do | yes | D |
| 4 | Checkpoint, lives, game over, play again | yes | C |
| 5 | Offline on second visit, first load under 3 MB | yes | F |
| 6 | No network after load, no trackers, no photo access | yes | F |
| 7 | Nothing copied, no real people | yes (checked every piece) | all |
| 8 | Win screen shows the closing line | yes | E |

Later in version 1, after the slice: the rest of World 1 (if Tp wants more than level 1), title name (questions.md Q1), sound and tunes polish. Out of scope: Worlds 2 to 6, selfie, accounts, leaderboards, ads, payments, multiplayer, other languages.

## First slice

Goal: build a hero (saved on the phone), play World 1 level 1 by touch, take all three foods, beat General Go-Slow, see the win screen with the closing line, play offline on a second visit, live on GitHub Pages.

### A. Setup and physics (brief: Tech; How it plays 1)

| id | owner | task | done check |
|----|-------|------|------------|
| A1 | gamedev | Pick engine (Phaser 3 or plain canvas), write the reason in docs/design.md under Tech | Reason written, 5 lines or fewer, includes size cost of the choice |
| A2 | gamedev | Vite + TypeScript project, Vitest unit tests, Playwright end to end with a phone profile, `npm test` and `npm run build` scripts (Node 22) | Fresh clone: `npm ci && npm test && npm run build` all pass |
| A3 | gamedev | PWA shell: manifest, icons placeholder, service worker stub, canvas fills the phone screen, pause when tab hidden | Lighthouse marks it installable; tab switch pauses the game |
| A4 | designer | Physics feel note: run speed, jump, second jump, hold-for-higher, landing, using docs/prototype.html as the feel reference | Note in docs/design.md with numbers gamedev can type in |
| A5 | gamedev | Fixed time step run, tap jump, air jump, hold jump, land on ground and platforms. Tap anywhere; Space and up arrow on a computer | Unit tests pass for jump, second jump, hold jump, landing; same jump height at 30 and 60 fps |
| A6 | qa | Test A1 to A5 on phone profile and slowed CPU | Three-line report: passed, failed, not tested |
| A7 | po | Accept A | Note in docs/questions.md |

### B. Hero builder (brief: Your hero)

| id | owner | task | done check |
|----|-------|------|------------|
| B1 | designer | Builder screen note: who, one job, exact words, option lists for skin, hair, outfit (needs po answer Q2) | Note in docs/design.md; po approved the words |
| B2 | art | Hero parts as separate layers (skin tones, hair, outfits), drawn in code or small sprite sheet | Every combo renders; files listed in docs/assets.md; originality check passed |
| B3 | gamedev | Builder screen, live preview, save to local storage with a safe wrapper | Choose look, reload page: same look. With storage blocked the game still runs |
| B4 | qa | Test B; tap targets at least 44px | Report; save/restore and storage-blocked tests in suite |
| B5 | po | Accept B | Note in docs/questions.md |

### C. World 1 level 1 (brief: How it plays 2 to 4; Worlds 1; Look and sound)

| id | owner | task | done check |
|----|-------|------|------------|
| C1 | designer | Level 1 note and level data file: 60 to 120 s, teaches one thing at a time, kobo, potholes, tyres, goats, bus stop checkpoint halfway, food spots | Note in docs/design.md; data file in repo; no code needed to change the layout |
| C2 | art | Street background (shop signs, yellow bus, stalls), kobo, pothole, tyre, goat, bus stop | Assets small, listed in docs/assets.md, originality check passed |
| C3 | gamedev | Level loader from data, camera, kobo pickup and count | Level 1 plays start to arena by touch |
| C4 | gamedev | Hazards: pothole fall, tyre and goat hit; bounce when landing on goat or tyre (goat runs away) | Unit tests for fall, hit, bounce |
| C5 | gamedev | Three lives, bus stop checkpoint, game over screen, play again | Unit tests: lose a life, respawn at checkpoint, game over at 0, play again resets |
| C6 | designer | Game over screen words | Words in docs/design.md, po approved |
| C7 | qa | Test C; first-time player finishes in 3 tries or fewer (designer rule) | Report |
| C8 | po | Accept C | Note in docs/questions.md |

### D. Food power-ups (brief: Power-ups; Done when 3)

| id | owner | task | done check |
|----|-------|------|------------|
| D1 | designer | Power-up note: how long each lasts, the plain words shown, where each sits in level 1 | Note in docs/design.md; words approved by po |
| D2 | art | Roasted corn, garri sugar and epa, amala gbegiri and ewedu icons and pickup effect | Readable on a small screen; originality check passed |
| D3 | gamedev | Corn: faster for a few seconds. Garri: shield takes one hit. Amala: super strong, smash through hazards | Unit tests: each starts, shows its words, ends on time; shield takes exactly one hit |
| D4 | qa | Test D in level 1 by touch | Report |
| D5 | po | Accept D | Note in docs/questions.md |

### E. General Go-Slow and win screen (brief: Worlds 1; Done when 2 and 8)

| id | owner | task | done check |
|----|-------|------|------------|
| E1 | designer | Boss note: pattern, jump onto green lights three times, harder after each hit, funny (not cruel) defeat | Note in docs/design.md; po approved |
| E2 | designer | Win screen note with exact words, including "Remember: a wrong premise often leads to a misleading conclusion." | Words in docs/design.md |
| E3 | art | General Go-Slow: heap of stuck cars under a grumpy traffic light; green light states | Problem not a person; originality check passed |
| E4 | gamedev | Boss arena and rules; win screen with closing line and play again | Unit tests: 3 green-light hits win; boss harder after each hit |
| E5 | qa | Test E | Report |
| E6 | po | Accept E | Note in docs/questions.md |

### F. Offline, size, full pass (brief: Tech 1, 3, 4; Done when 5 to 7)

| id | owner | task | done check |
|----|-------|------|------------|
| F1 | gamedev | Service worker caches everything on first visit; no network call after load | Second visit plays in airplane mode |
| F2 | gamedev | Size and speed budget check in CI | Build output under 3 MB total; fails the build if over |
| F3 | qa | Full end to end on phone profile by touch: build hero, finish level 1, all three foods, boss, win screen with closing line; no network after load; slowed CPU still playable at 30 fps | All qa suite items 1 to 7 pass; three-line report |
| F4 | qa | Originality and no-real-people review of every picture and sound; break tests (fast taps, rotate, switch apps, tiny/huge screens) | Report |
| F5 | po | Accept the slice against Done when 1 to 8 | Acceptance note in docs/questions.md |

### G. Deploy (brief: Tech 6)

| id | owner | task | done check |
|----|-------|------|------------|
| G1 | gamedev | GitHub Actions workflow: test, build, deploy to GitHub Pages; Vite base path set for the repo | Workflow file in repo; runs green on push to main |

Deploy note (13 Nov): the deploy now runs only the quick checks and phone tests before going live. The timing and perf tests run after, in a separate job.
| G2 | gamedev | Push to GitHub once Tp gives the repo (blocked) | Pages URL loads the game on a phone |
| G3 | qa | Test the live URL: first load size, offline second visit, full play | Report |
| G4 | po | Accept the live game | Note in docs/questions.md |

Slice 1 note (7 Nov 2026): Tp took the "wrong premise" line out of the game for good. E2, E4 and F3's checks for the closing line, and Done when 8, no longer apply. Tp still has to edit docs/brief.md Done when 8.

## Slice 2

Goal ("slice 2 done"): a player builds a hero (with male or female and age), plays Lagos streets 1 to 3 by hand, including a run-up jump over a big pit, opens crates from below, visits the well room and gets the garri parcel, beats General Go-Slow inside Go-Slow Hall, sees Lagos's cog switch on in Nigeria's wheel, hears music with its own on/off switch, and it all works offline on a second visit. qa passes it and po accepts it.

Sources: docs/questions.md "Slice 2 requests from Tp, 7 Nov 2026" (R0 to R8, Q16 to Q21), docs/design.md part "Slice 2" (S2.1 to S2.12), level data in src/data/levels/ (lagos-1, lagos-2, lagos-3, lagos-well, lagos-hall; schema 2). Built with po's recommended answers as stand-ins until Tp confirms. The designer notes are written, so each piece starts at art or gamedev.

Rules for every slice 2 piece:
1. qa checks every piece on the phone profile and at 4x CPU slowdown (slow phone), plus: first load under 3 MB, plays offline on a second visit, at least 45 fps at 4x CPU, originality list in R8, no real people.
2. This Mac sleeps. Run e2e as `caffeinate -s -i npm run e2e`.
3. Perf numbers here are noisy (41 to 47 fps at 4x on 7 Nov, not caused by code). qa runs the perf test 3 times and reports the median. If the median is under 45, qa runs main the same way in the same session and reports both; po decides whether it is the piece or the machine.
4. One task per branch, small commits. pm marks a piece done only after qa passes it and po accepts it.
5. Shared files, one branch at a time: src/engine/sound.ts (every art sound task adds effects here; merge, then the next), src/art/hero.ts (H5 then I1), src/art/street.ts (H5, then K1, then N1). gamedev pieces all touch src/game/run.ts and src/game/level.ts, so gamedev works one piece at a time, in order.

### H. Taller view and player controls (S2.1, S2.2; R3, Q18). Street 1 playable by hand

Status: done. Merged 85741b9 (qa H6 passed, po H7 accepted 7 Nov).

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| H1 | gamedev | 420 u view, pavement strip, fall line at the screen bottom, camera look-ahead, 8 to 92 percent rule, start and end limits (src/engine/view.ts, src/game/run.ts) | none | Unit tests for the view widths in the S2.1 table and the camera rules; slice 1 street still plays |
| H2 | gamedev | Walk, run timer, run, stop, turn, air steering; no auto-run (src/engine/physics.ts) | H1 | Unit tests match the S2.2 speed table and the jump distance table within 3 u; same at 30 and 60 fps |
| H3 | gamedev | Phone buttons, touch areas, finger rules, keys, let go of everything on pause, focus loss, upright phone (src/engine/input.ts, src/screens/hud.ts) | H1 | Unit tests for every finger rule and key rule; e2e: two thumbs walk and jump; a pause never leaves the hero moving |
| H4 | gamedev | Schema 2 street loader for lagos-1 (start wall, hints with markers, bus end sequence, hazard wake and leave rules); crates and wells skipped for now; level rule test for S2.6 rules | H2, H3 | Street 1 plays start to bus by hand on phone and keys; a running double jump clears the 170 u big pit and a walking one does not (unit test) |
| H5 | art | Control buttons and pressed look, hero walk, run lean, dust puff, skid poses (current body), pavement strip, big pit cones, start fence and parked bus, bus park and bus with door; sounds: run start, skid, bus boarding (S2.12 pictures 1, 2 poses, 8, 11, 12; sounds 1, 2, 11) | none (can start now) | Drawn in code, listed in docs/assets.md, R8 originality list checked |
| H6 | qa | Test H: phone profile, 4x CPU, two thumbs, break tests (slide off buttons, rotate, switch apps), first-timer tries | H1 to H5 | Three-line report; slow-phone and size checks pass |
| H7 | po | Accept H | H6 | Note in docs/questions.md |

### I. Hero choices (S2.3; R2, Q20)

Status: done. Merged 53a659d (qa I3 passed, po I4 accepted 7 Nov).

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| I1 | art | Male and Female bodies as Teen, Adult, Elder: grey hair on every style, elder male beard, female lashes and studs; all poses; same 50 u box and feet spot (src/art/hero.ts) | H5 merged | Every combo renders in the gallery; same hitbox; respect check (elder never bent or shaky, teen not a child); docs/assets.md updated |
| I2 | gamedev | Builder rows and layout (down to 320 x 240), defaults that follow the picks until hair or outfit is tapped, `gidi-look` body and age, slice 1 save loads, "New!" builder once (src/screens/menus.ts, words.ts, src/game/save.ts, src/storage.ts) | H4, I1 | Unit tests for defaults and old-save loading; e2e: pick, reload, same look; storage blocked still plays |
| I3 | qa | Test I, tap targets, 320 x 240, slow phone | I2 | Report |
| I4 | po | Accept I (words players see) | I3 | Note in docs/questions.md |

### J. Crates hit from below (S2.4; R5)

Status: done. Merged 8636479 (qa J3 passed, po J4 accepted 8 Nov).

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| J1 | art | Crate with four stamps, rope, line and poles, swing, open empty crate, kobo fan, food pop; sounds: tok, creak, empty tok, three clinks, food pop (new src/art/crate.ts; sounds in sound.ts) | none (can start now) | Not yellow or gold, no "?" or "!", no rivets or brick row; listed in docs/assets.md |
| J2 | gamedev | Crate hit rule, amala from any side, contents, refill after a lost life, crate placement checks in the level test; crates on in street 1 | H4, J1 | Unit tests for every hit rule in S2.4; street 1 crates open by hand |
| J3 | qa | Test J, slow phone | J2 | Report |
| J4 | po | Accept J | J3 | Note |

### K. Streets 2 and 3, the rolling drum (S2.6; R7, Q16)

Status: done. Merged 5ee5f06 (qa K3 passed, po K4 accepted 8 Nov).

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| K1 | art | Market road (midday) and Bus park road (evening) backdrops with the made-up signs; rolling drum (plain, ridged), bounce sparkle, smash; sounds: drum wake, drum bounce (src/art/street.ts, hazards.ts) | H5 merged | No brands, no real places; drum and tyre tell apart by shape; docs/assets.md updated |
| K2 | gamedev | Load lagos-2 and lagos-3 by `theme`; drum hazard; corn and drum distance rules in the level test; back-tracking to the street 3 secret well spot; Street cleared screen and "Next street" (no saving yet). Wells drawn as scenery only until L2 | J2, K1 | All three streets play start to bus by hand; level test passes for all three files |
| K3 | qa | Test K: each street first-timer in 3 tries or fewer (if not, designer tunes in S2.6 order), slow phone, size | K2 | Report |
| K4 | po | Accept K | K3 | Note |

### L. The well and its room (S2.5; R4, Q19)

Status: done. Merged cc8e594 (qa L3 passed, po L4 accepted 8 Nov).

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| L1 | art | Entrance and exit wells, bucket lowering and rising, fade; room (earth walls, oil lamps, pots, baskets, shelves, exit rope); garri parcel and HUD icon; sounds: well down, well up, room thump, parcel "got it" (new src/art/well.ts) | none (can start now) | No pipe, tube or green cylinder; no water; docs/assets.md updated |
| L2 | gamedev | Go down and Go up buttons and keys, street frozen while below, room from lagos-well.json, parcel carried (kept on a lost life, lost on game over or leaving), exit with safety and hazard clear, room remembers this play | K2, L1 | Unit tests for S2.5 rules; e2e: street 2 well down, parcel, up, finish street |
| L3 | qa | Test L, slow phone; skipping the well never blocks the street | L2 | Report |
| L4 | po | Accept L | L3 | Note |

### M. Go-Slow Hall (S2.7; R6, Q21)

Status: done. Merged ae69d29 (qa M3 passed, po M4 accepted 8 Nov). qa's four small M3 bugs and the new Win line moved to N2; difficulty tuning moved to P2.

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| M1 | art | Hall inside (beams, 8 roof lamps off and on, lanes, doors, cone line, drain, "GO-SLOW HALL" sign), slice 1 heap and lights moved inside, high honk "PEEP!" cloud, cones slide aside; sounds: high honk, lamp click and hum (new src/art/hall.ts, src/art/boss.ts) | none (can start now; sounds after other sound.ts work merges) | No faith signs, no real building; docs/assets.md updated |
| M2 | gamedev | Hall from lagos-hall.json, boss rules with a player-moved hero, three phases, high honk, kind finish, parcel shield at the start, hall game over, Win screen words; retire w1-l1.json and move its tests (src/game/boss.ts, level.ts). Added from po K4 and L4: (a) the win screen after the hall says "Lagos is switched on!", not slice 1's "Road cleared!" (M2 or N2, whichever lands first); (b) at the hall start, if the parcel is held, turn on one shield; it never stacks | L2, M1 | Unit tests: 3 lit-light hits win, phase table, high honk safe places, parcel gives one shield and never stacks, hall beatable without it; win screen reads "Lagos is switched on!" |
| M3 | qa | Test M: beatable in 3 tries after street 3 (if not, designer tunes in S2.7 order), slow phone | M2 | Report |
| M4 | po | Accept M | M3 | Note |

### N. Progress, Streets screen, Nigeria's wheel, saves (S2.8, S2.10, S2.11; R0, Q17)

Status: N1 next (art), then N2 (gamedev). Street names and the cleared line decided by Tp, 8 Nov.

N1 scope (art, one branch): (1) Streets card look: card frame, padlock, tick, with room for three lines of words (small "Street 2", bold name, one status line; S2.6 "Fit at 320 px", S2.10); the words themselves are gamedev's. (2) Nigeria's wheel: hub, 37 cogs, grey and working looks, state names A to Z clockwise (S2.8). (3) The fixed look of each street after Lagos switches on: lamps lit, signs lit, bunting, fresh road paint (S2.12 picture 10). (4) Music and music-off icons. (5) Sounds: cog ratchet and bell, locked "tuk" (src/engine/sound.ts). Guards: no party colours; no government building, crest, flag or office on any street (Alausa); no real shop or brand on the Computer Village stalls; drawings stay our own. Files: new src/art/wheel.ts, src/art/street.ts, src/engine/sound.ts, docs/assets.md.

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| N1 | art | Street cards (room for three lines), padlock, tick, Nigeria's wheel (hub, 37 cogs, grey and working looks, names), fixed look for each street (lamps, signs lit, bunting, road paint), music and music-off icons; sounds: cog ratchet and bell, locked "tuk" (new src/art/wheel.ts, src/art/street.ts, src/engine/sound.ts). See N1 scope above | K1 merged (done) | No party colours; names A to Z clockwise as S2.8; no government look on any street, no brand on any stall; docs/assets.md updated; R8 originality list checked |
| N2 | gamedev | `gidi-progress` (merge, never overwrite; broken copy rule), unlocking, parcel saved per state, Streets and wheel screens, all S2.10 screen words, fixed street look, reduced motion (src/game/save.ts, src/storage.ts, src/screens/*). Added from po K4, L4 and the c4e538d ruling (docs/questions.md): (a) Parcel toast: switch to "Garri parcel! Shield for the hall." now the parcel is saved. (b) Parcel saving: save `run.parcel` when the street is cleared; pass `parcelSaved` into `Run`; cleared screen shows "Your garri parcel is saved for Go-Slow Hall." (c) HUD second-finger bug: while one thumb holds Forward or Jump, a second-finger tap on Pause or Sound does nothing (Chrome sends no click). Make Pause and Sound act on pointerup or pointerdown, as the well button does. One press does one thing; Sound never switches twice. A press that opens Pause never also presses what appears under it. Keys and screen readers still work. (d) Slice 1 words still in place (qa K3, po K4): Pause reads "Keep playing / Start again / Streets / Home" with the Sound and Music switches; game over says "street", not "road" ("The street is still here."); the Street cleared screen shows "Streets" instead of "Home"; the title says "Start running". (e) "Lagos is switched on!" on the win screen: done in M2. Added from Tp's 8 Nov answers and po M4: (f) **Street names (Tp's choice, 8 Nov):** street 1 is "Alausa", street 2 is "Computer Village", street 3 is "Ikeja". Change only the `name` field in src/data/levels/lagos-1.json, lagos-2.json and lagos-3.json. (g) **Cleared line (Tp's choice):** "{street name} is moving again, thanks to you! You got {kobo} kobo." It replaces "{name} is fixed." (src/screens/words.ts). It is a card line, never a toast. (h) **Streets cards:** three lines per card, as in design S2.6 "Fit at 320 px" and S2.10: small "Street 2", the name in bold, one status line. A name is never cut with "…" and never runs off the card. (i) **The four M3 bugs, each with po's done-when:** 1. Win and both game-over cards fit on short screens (320 x 240, 480 x 200, 640 x 200) without scrolling, with the small buttons in one row and at least 44 px tall. 2. The shield chip no longer covers the hit counter at 320 px, and the hall HUD has no Kobo chip. 3. P and Escape pause the game in play and in the hall, and resume from Pause; they do nothing in the finish or on a card. 4. Every card that opens (Win, both game overs, Street cleared, Pause) puts focus on its big button, so Space or Enter presses it. (j) **Win line:** "You cleared General Go-Slow with {lives} lives left." Use "1 life left" when there is one. No kobo on the Win card. (k) **Saved parcel:** replace `parcelForHall` in src/main.ts with the saved parcel. | M2 (done), N1 | Unit tests for the save shape, merge and broken-save rules; e2e: finish a street, reload, next street open; win shows 1 of 37; e2e: hold Forward and tap Pause, the game pauses once and nothing under Pause is pressed; a Sound tap switches once; parcel saved on clear and shown on the cleared screen; the three level files carry Tp's names; unit tests for the cleared line, the Win line (1 life / 2 lives), P and Escape; e2e: each M3 bug's done-when in (i) holds; qa N3 checks the new parcel toast and every word in (d) |
| N3 | qa | Test N, accessibility list S2.11, slow phone. Also: (a) every street name at 320 px, on the Streets cards and the Street cleared card; (b) the cleared line wraps to two lines, never three, with "Computer Village", 3-digit kobo and the parcel line on; (c) the focus fix on every card, and the Win, game over and Street cleared cards at 320 x 240, 480 x 200 and 640 x 200 with no scrolling; (d) "Computer Village" fits its card in one piece, never cut with "…" | N2 | Report |
| N4 | po | Accept N (every word players see) | N3 | Note |

### O. Music (S2.9; R1)

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| O1 | art | Instruments and our own melodies as note data: menu loop, street loop (3 tempos), well loop, hall loop (3 tempos, layers), street-cleared jingle, win tune (new src/art/tunes.ts, data only) | none (can start now) | Inside the S2.9 keys and chords; qa can read the notes; no known tune's opening |
| O2 | gamedev | Music player: schedule 0.1 s ahead every 25 ms, place changes on a bar line, pause and resume from the same bar, hall tempo step after each hit, "Music: on / off" on title and pause, M key, `gidi-music` (new src/engine/music.ts; menus.ts) | N2, O1 | Unit tests for scheduling, switch and save; the game never waits for music; e2e: music off stays off after reload |
| O3 | qa | Tune originality check (Nintendo music first, then known Nigerian songs), pause and phone-call behaviour, slow phone, size | O2 | Report |
| O4 | po | Accept O | O3 | Note |

### P. Slice 2 full pass

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| P1 | gamedev | Offline cache lists every new file; size budget; nothing loads from the network after the first visit | O2 | Build under 3 MB; second visit plays in airplane mode |
| P2 | designer | Play the whole slice against the S2 notes; list any feel or tuning fixes for gamedev. Hall difficulty goal (po M4; the hall is too easy now, bots win in 6 to 7 s): a first-timer meets at least 2 throws in each phase and sees a high honk before the third hit; a first win takes about 30 to 60 s; the hall can still be cleared in 3 tries. First lever to try: after a hit, the next light comes on later (not faster throws). S2.7's tuning order for "too hard" stays | P1 | Short list in docs/design.md, or "none"; hall goal met in designer's play |
| P3 | qa | Full e2e of "slice 2 done" on the phone profile by touch and at 4x CPU; offline second visit; R8 originality and no-real-people review of every new picture, sound and tune; break tests. Added from po K4: (a) real first-timers (Tp first) clear each street in 3 tries or fewer, and in the hall meet at least 2 throws in each phase, see a high honk before the third hit, win the first time in about 30 to 60 s, and clear it in 3 tries or fewer; if not, designer tunes in this order: big pits 170 to 160, then one hazard fewer in street 3's group at 3700 to 4250; (b) listen to the drum and well sounds for originality; (c) offline on the second visit checked by hand; (d) turn the phone and switch apps on streets 2 and 3; keyboard play on streets 2 and 3 | P2 fixes merged | All pass; three-line report |
| P4 | po | Accept slice 2 against "slice 2 done" | P3 | Acceptance note in docs/questions.md |

Added by po N4 (pm owns this file; one line): P2 polish, gamedev: call `toast.hide()` on `bossDefeat` (src/main.ts) so the "PEEP!" hint never shows in the hall's kind finish; P3 checks it. Later, after slice 2: when every storage write fails, still show the look picked this visit (src/storage.ts probe).

### Order and what runs at the same time

| Step | gamedev (one at a time) | art (can run alongside) | qa and po |
|------|-------------------------|-------------------------|-----------|
| 1 | H1, H2, H3, H4 | H5 first; then J1, L1, O1 (new files only) | |
| 2 | I2 | I1 (after H5), K1 (after H5) | H6, H7 |
| 3 | J2 | M1 | I3, I4 |
| 4 | K2 | N1 (after K1) | J3, J4 |
| 5 | L2 | | K3, K4 |
| 6 | M2 | | L3, L4 |
| 7 | N2 | | M3, M4 |
| 8 | O2 | | N3, N4 |
| 9 | P1, then P2 designer | | O3, O4, then P3, P4 |

Art sound effects all go into src/engine/sound.ts: art merges one sound task before starting the next.

### Tp questions Q16 to Q25 (all answered by Tp, 8 Nov 2026)

All confirmed as recommended except Q22 (street names). Kept as history.

| Question | Answer | Pieces hit |
|----------|--------------|-----------------------------|
| Q16 how regions, states and streets fit; World 1 = Lagos, 3 streets plus hall | answered: option a | K (streets), M (where the hall sits), N (save shape, Streets screen, wheel count), P |
| Q17 progress picture | answered: Nigeria's wheel now, map later | N1, N2, Win screen words (M2, N2) |
| Q18 auto-run as a choice | answered: none anywhere; gentle mode 5 lives | H2, H3, every street layout (H4, K2), L2 (well behind you), S2.11 check (N3) |
| Q19 the well gift | answered: garri parcel, shield on at the hall start | L1, L2, M2 (hall start), N2 (parcel save, card and cleared words) |
| Q20 hair and outfits open to all | answered: all open to all | I1, I2 |
| Q21 the building's name | answered: "Go-Slow Hall" | M1 (sign), M2 and N2 (words) |
| Q22 street names | answered differently: real names "Alausa", "Computer Village", "Ikeja"; cleared line "{street name} is moving again, thanks to you!" | K2 (level files), N1 (cards), N2 (Streets and cleared words) |
| Q23 parcel strength | answered: one shield on every hall try, never stacks | L2, M2, M3 (tuning) |
| Q24 left-handed "Swap sides" | answered: slice 3 | H3, H5 (button layout), N2 (a switch on title or pause, a new save key) |
| Q25 the elder look | answered: no stick, short neat grey beard | I1, I2 |

## Added by designer, 10 Nov 2026: Tp's play of PR #3 (pm to order and own)

Source: docs/questions.md top block "Tp, 10 Nov 2026 (after playing the PR #3 build)". The notes are written; each row starts at art or gamedev. Sizes are the gzipped first load.

### P2 follow-ups: harder, fufu, corn tune

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| P5 | gamedev | Harder (design S2.14): hall lights come on later and stay green for a while (`lightAt`, `greenFor`, `darkFor`), phase 3 pattern, new hall words; the street file changes | none | S2.14 part 3 tests pass; hall bot clean win 18 s or more |
| P6 | art | Hall light blink and reduced-motion look; "ding", "tick", "clunk" sounds (S2.14 part 3) | none | gallery shows it; sounds our own |
| P7 | art | Pepper fufu pictures, throw pose, goat eating and "meeh", knocked tyre and drum, Throw button and HUD icons, sounds (S2.15 tasks) | none | under 15 KB with P8; nothing looks or sounds like fire |
| P8 | gamedev | Pepper fufu: balls, Throw button and X key, plugs, goats fed, hall pops, HUD, words (S2.15 tasks) | P5, P7 | S2.15 tests pass |
| P9 | art | The `corn` tune data and originality check openings (S2.9 "Corn tune") | none | inside the rules; music test passes |
| P10 | gamedev | Corn tune player: effects volume node, turn-down, 5 to 1 count, switches, pause, restart (S2.9 "Corn tune") | P9 | S2.9 corn tune checks pass |
| P11 | qa | Test P5 to P10: S2.14, S2.15 and corn tune qa done checks, phone profile and 4x CPU, first-timers (Tp first) | P5 to P10 | three-line report |
| P12 | po | Accept P5 to P10 | P11 | note in docs/questions.md |

### Slice 3: the city, build order (docs/city.md part 5 "Build order")

(a) and (b) are ready to start now.

| id | owner | task | depends on | done when | size |
|----|-------|------|------------|-----------|------|
| S3a1 | art | The 6 intro frames, drawn in code (src/art/intro.ts) | none: **ready now** | city.md (a) "What the frames show"; qa originality and no real people | 12 KB |
| S3a2 | gamedev | Intro screen (Skip, tap to go on, plays once, `gidi-intro`), Settings screen with "Watch the story" | S3a1 | city.md (a) done checks | 6 KB |
| S3b1 | art | City blocks (12, before and after for the 3 pin spots), roads, lagoon, bridge, buses, pins, bucket icons | none: **ready now** | city.md (b); not like any game's map (part 6) | 40 KB |
| S3b2 | gamedev | City screen: drag, pinch, + and −, double tap, pins, problem cards, counters, money words, `city` save part | S3a2, S3b1 | city.md (b) done checks; 45 fps drag at 4x CPU; idle draws nothing | 20 KB |
| S3c0 | designer | Walk the city note (city.md part 5W) | none | written, with exact numbers and words (done 11 Nov 2026) | |
| S3c1 | art | Hero walking from above (front, back, side, every body) and off the bus; mat and chalk price board (three buckets, part paid, "Done ✓"); chalk outlines; Mama Put with cook and queue; market stalls empty, filling, full; danfo loading goods; tray bubbles; flying coins, bulbs, chips; chink, built, collect sounds; the Potholes fix | S3b1, S3c0 | city.md 5W W1, W2, W3, W11; nothing like the arcade game's look (done: main 12 Nov, PR #8, qa round 5 passed, po accepted) | 18 KB |
| S3c2 | gamedev | Walk: walk grid and path, tap and hold to walk, arrow keys, camera follows, pin edge arrows, hero's saved place, first hint; drag no longer pans, double tap dropped | S3b2, S3c1 | city.md 5W W1, W9, W10; 45 fps walking at 4x CPU (done: main 12 Nov, PR #8, qa round 5 passed, po accepted) | 6 KB |
| S3c3 | gamedev | Pay: boards, stand to pay, part pay, not-enough card, "Walk there" on cards; coins as money, "Take it home", keep everything on a loss, prize top-up; Mission complete in the walkable city | S3c2 | city.md 5W W2, W5, W8; money tests (done: main 12 Nov, PR #8, qa round 5 passed, po accepted) | 5 KB |
| S3c4 | gamedev | Earn and collect: Mama Put and market, play-time filling, caps and "Full", trays saved, collecting, boom points, the two hints | S3c3 | city.md 5W W3, W4, W6, W7; nothing fills while closed; still city at most 2 small redraws a second (done: main 12 Nov, PR #8, qa round 5 passed, po accepted) | 3 KB |
| S3d1a | art | The Booming meter you can see, pictures and sounds: tired ("a bit faded but still warm and proud") and bright pieces for all 12 blocks and the bus park; people per block; market umbrellas; meter icon and bar; first-boom flats, bus shelter, coming-soon padlock pin badge; sounds sting (short highlife, our own), step, boom, horn (src/art/city*.ts, src/engine/sound.ts, docs/assets.md) | S3c4 (done) | city.md (d) d2, d4, d5, d7, d11; d12 item 10 (mock no one); gallery shows 0, 8 and 20 point looks (done: main 13 Nov, PR #9) | ~12 KB |
| S3d1b | gamedev | Booming meter you can see, code: brightness rules (d3); meter in the "Lagos" heading box; small layout up to 640 px (d5); hide a pin at "Done ✓"; the watch-it-change moment and the boom, with skip and reduced motion (d6), at least one danfo drives the new road; boom card and cog link; coming-soon pins and cards; `boomSeen`; bright hint (d8, d9) | S3d1a | city.md (d) d12 items 1 to 9; 45 fps at 4x CPU in the moment, boom and walking; still city at most 2 small redraws a second (done: main 13 Nov, PR #9) | ~11 KB |
| S3a3 | art | **Next (Tp asked 13 Nov).** The moving intro scene, drawn in code: `drawIntroScene(g, w, h, t, { look })` in src/art/intro.ts (or src/art/intro-scene.ts), plus `INTRO_BEATS` and `INTRO_CUES`; gallery shows each beat start and 2, 19.4, 23, 27.8 s | S3a1 (done) | city.md (a2) a2.10 S3a3 row: a2.2 matches by eye at 320 x 240 and 851 x 393; a2.8 list; 45 fps at 4x CPU in the gallery; same `t` draws the same picture (unit test) | ~10 KB |
| S3a4 | gamedev | **Next (Tp asked 13 Nov).** Intro screen: `IntroScene` clock in src/game/intro.ts (unit tested, no DOM), src/screens/intro.ts draws the scene, plays cues, captions in the hidden log, two on-screen lines, "Let's go", Skip, Escape, tap and key jumps, 3 s hold stop; reduced motion keeps the six frames; `heroLine` and `endLine` in `WORDS.intro` | S3a3 (the clock part can start now, alongside S3a3) | city.md (a2) a2.11 "Done when" 1 to 14 | ~4 KB |
| S3e1 | art and gamedev | The challenge road (replaces the Streets screen), plus W17 C "same street, city and run": stop card with the spot from above, run's first screen tired or bright to match its city spot, plain street sign (Alausa follows New road, Computer Village r1c3, Ikeja r2c1) | S3c3, S3d1b | city.md (e), including the W17 C brief; no level gets harder or easier | 12 KB + ~6 KB (W17 C) |
| S3f0 | designer | Lane run note in docs/design.md | none | written, with exact numbers and words | |
| S3f1 | art | Lane run pictures, sounds, tune | S3f0 | city.md (f) | 50 KB |
| S3f2 | gamedev | Lane run engine, swipes, keys, buttons | S3f0, S3f1 | 60 fps mid phone, 45 at 4x CPU | 30 KB |
| S3f3 | gamedev | Blackout, buckets, HUD, end card, keep running; pins 2 and 3 open | S3f2 | city.md (f) done checks; first-timers reach the goal in 3 tries | 15 KB |
| S3f4 | gamedev | Follow-ups from qa round 5 and po (12 Nov) for step (f): packed 320 x 240 layout with Power and Tech, arrows back to 48 x 48 and the drawn arrow matches its tap square; Tech chip and "+" must not cut the Lights out pin word ("Lights ou") | S3f3 | qa at 320 x 240 with all three buckets; po will not accept (f) without it | small |
| S3q | qa | Test each step on the phone profile, 4x CPU, offline, size, originality | each step | report per step | |
| S3p | po | Accept each step; then "slice 3 done" (city.md part 5 goal) | S3q | note in docs/questions.md | |

Lagos first (Tp, 13 Nov, decision line 46 waiting to be pasted): finish (d), (e) and (f) and get them accepted before any second state.

Designer rulings taken under Tp's "I take all you guys recommendations" (13 Nov): Mission complete grows to about 7 to 9 s with the moment (was 4 to 6 s), everything after the bus skippable with one tap; no special message for returning players.

Suggested gamedev order (one at a time): S3c2 to S3c4 and S3d1 done; next S3a4 (clock part now, screen after S3a3), then S3e1, S3f2, S3f3, S3f4. Art: S3a3 first (Tp asked 13 Nov). Art can run P6, P7, P9, S3a1, S3b1, S3c1 side by side (sound tasks one at a time in src/engine/sound.ts).

### B1 to B5: birds, the strong look, the tech suit, the dash, thorny gutters (design S2.16; Tp, 10 Nov)

Added by designer. The street changes sit on top of P5 (S2.14) and P8 (S2.15), so P16 and P17 wait for them.

| id | owner | task | depends on | done when | size |
|----|-------|------|------------|-----------|------|
| P13 | art | Amala strong look and the tech suit for every body, hair and outfit; their sounds (S2.16 B2, B3) | none | B2 and B3 qa checks; nothing reads as Mario's grow or star, Iron Man or Mega Man | 8 KB |
| P14 | gamedev | Hook up B2 and B3: step events, amala blink, suit put-on and break, the hum with Sound, pause and hidden tab | P13 | B2 and B3 done checks | 2 KB |
| P15 | art | Egret, crow, rubbish pile and bin; gutter, weeds, dried weeds; dash pose, speed lines, breath puffs, cement blocks, dash sign; their sounds (S2.16 B1, B4, B5) | none | gallery shows them; nothing reads as Angry Birds, Flappy Bird, a piranha plant or Sonic | 14 KB |
| P16 | gamedev | The dash: double tap input, physics, rest, save flag, dash gap pit kind, Gentle blocks (S2.16 B4) | P5, P15 | B4 tests pass | 4 KB |
| P17 | gamedev | Birds and gutters: hazard kinds, `piles`, `gutters`, fufu meets birds and weeds, the S2.16 street changes, hints, toasts, level tests (S2.16 B1, B5) | P8, P15, P16 | B1 and B5 tests pass; all street rule tests pass | 4 KB |
| P18 | qa | Test P13 to P17: the S2.16 done checks, phone profile and 4x CPU, first-timers (Tp first) on streets 2 and 3, Normal and Gentle | P13 to P17 | three-line report | |
| P19 | po | Accept P13 to P17 | P18 | note in docs/questions.md | |

## Known facts

1. Node 22 via nvm: ~/.nvm/versions/node/v22.19.0.
2. No gh CLI and no GitHub sign-in on this machine.
3. This Mac sleeps: run e2e under `caffeinate -s -i`. Perf at 4x CPU is noisy here (41 to 47 fps on 7 Nov, not caused by code).

## Status

Done: slice 1 A to F and G1. Slice 2 H (85741b9), I (53a659d), J (8636479), K (5ee5f06), L (cc8e594), M (ae69d29): each qa passed and po accepted. Tp answered Q16 to Q25 on 8 Nov.
Done (13 Nov update): walk the city S3c0 to S3c4, merged to main 12 Nov (PR #8), qa round 5 passed, po accepted.
Done (13 Nov): S3d1 (S3d1a and S3d1b), merged to main 13 Nov (PR #9).
Deploy (13 Nov): quick checks and phone tests run before going live; timing and perf tests run after, in a separate job.
Next: the moving intro (Tp asked 13 Nov, city.md (a2)): S3a3 (art, ready now), then S3a4 (gamedev; the clock part can start now). Then S3e1 with W17 C, then S3f0 to S3f4. No second state until Lagos (d) to (f) is accepted.
Waiting on Tp: paste decision lines 44 to 48; play on a real phone; the new sounds by ear, and later the highlife sting once S3d1a makes it.
Blocked: G2 to G4, waiting on Tp's GitHub repo. Nothing in slice 2 is blocked.
P2 (designer, 10 Nov): design.md S2.13 has the P2 doc fixes (foods 12 s, corn hazard rule, pothole signs, Gentle mode climb-out) and the tasks for gamedev and art; the hall difficulty part of P2 is still to do.
Note for Tp: until N2, the Win card says "with 0 kobo" and the parcel is lost when the page closes.

## Waiting on Tp

1. Create the GitHub repo (name, public or private) and push access, or push it yourself. Turn on Pages with source "GitHub Actions". Blocks G2 to G4.
2. Copy the game name (Gbese!) and credits lines into docs/decisions.md (questions.md, first slice note).
3. Paste lines 7 to 21 from docs/questions.md ("Lines for Tp to copy") into docs/decisions.md. Q16 to Q25 are answered.
4. Remove the "wrong premise" line from docs/brief.md Done when 8.
5. Play streets 2 and 3 and Go-Slow Hall on your phone (with and without the parcel); say if any took more than 3 tries, or if the hall felt too easy (feeds P2, P3).

## Questions for po

None open.

Slice 1 questions for po (answered, kept as history): hero options, power-up lengths, lives and checkpoints, gentle mode, sound, title name, credits, orientation, kobo, World 1 length. po answered them in docs/questions.md; Q5 to Q15 there still wait for Tp to confirm.
