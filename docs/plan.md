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

Status: M1 doing (art, started 8 Nov). M2 todo, next for gamedev, needs M1.

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| M1 | art | Hall inside (beams, 8 roof lamps off and on, lanes, doors, cone line, drain, "GO-SLOW HALL" sign), slice 1 heap and lights moved inside, high honk "PEEP!" cloud, cones slide aside; sounds: high honk, lamp click and hum (new src/art/hall.ts, src/art/boss.ts) | none (can start now; sounds after other sound.ts work merges) | No faith signs, no real building; docs/assets.md updated |
| M2 | gamedev | Hall from lagos-hall.json, boss rules with a player-moved hero, three phases, high honk, kind finish, parcel shield at the start, hall game over, Win screen words; retire w1-l1.json and move its tests (src/game/boss.ts, level.ts). Added from po K4 and L4: (a) the win screen after the hall says "Lagos is switched on!", not slice 1's "Road cleared!" (M2 or N2, whichever lands first); (b) at the hall start, if the parcel is held, turn on one shield; it never stacks | L2, M1 | Unit tests: 3 lit-light hits win, phase table, high honk safe places, parcel gives one shield and never stacks, hall beatable without it; win screen reads "Lagos is switched on!" |
| M3 | qa | Test M: beatable in 3 tries after street 3 (if not, designer tunes in S2.7 order), slow phone | M2 | Report |
| M4 | po | Accept M | M3 | Note |

### N. Progress, Streets screen, Nigeria's wheel, saves (S2.8, S2.10, S2.11; R0, Q17)

Status: todo. N1 (art) can start after M1's sound work merges.

| id | owner | task | depends on | done when |
|----|-------|------|------------|-----------|
| N1 | art | Street cards, padlock, tick, Nigeria's wheel (hub, 37 cogs, grey and working looks, names), fixed look for each street (lamps, signs lit, bunting, road paint), music and music-off icons; sounds: cog ratchet and bell, locked "tuk" (new src/art/wheel.ts, src/art/street.ts) | K1 merged | No party colours; names A to Z clockwise as S2.8; docs/assets.md updated |
| N2 | gamedev | `gidi-progress` (merge, never overwrite; broken copy rule), unlocking, parcel saved per state, Streets and wheel screens, all S2.10 screen words, fixed street look, reduced motion (src/game/save.ts, src/storage.ts, src/screens/*). Added from po K4, L4 and the c4e538d ruling (docs/questions.md): (a) Parcel toast: switch to "Garri parcel! Shield for the hall." now the parcel is saved. (b) Parcel saving: save `run.parcel` when the street is cleared; pass `parcelSaved` into `Run`; cleared screen shows "Your garri parcel is saved for Go-Slow Hall." (c) HUD second-finger bug: while one thumb holds Forward or Jump, a second-finger tap on Pause or Sound does nothing (Chrome sends no click). Make Pause and Sound act on pointerup or pointerdown, as the well button does. One press does one thing; Sound never switches twice. A press that opens Pause never also presses what appears under it. Keys and screen readers still work. (d) Slice 1 words still in place (qa K3, po K4): Pause reads "Keep playing / Start again / Streets / Home" with the Sound and Music switches; game over says "street", not "road" ("The street is still here."); the Street cleared screen shows "Streets" instead of "Home"; the title says "Start running". (e) "Lagos is switched on!" on the win screen if M2 has not done it | M2, N1 | Unit tests for the save shape, merge and broken-save rules; e2e: finish a street, reload, next street open; win shows 1 of 37; e2e: hold Forward and tap Pause, the game pauses once and nothing under Pause is pressed; a Sound tap switches once; parcel saved on clear and shown on the cleared screen; qa N3 checks the new parcel toast and every word in (d) |
| N3 | qa | Test N, accessibility list S2.11, slow phone | N2 | Report |
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
| P2 | designer | Play the whole slice against the S2 notes; list any feel or tuning fixes for gamedev | P1 | Short list in docs/design.md, or "none" |
| P3 | qa | Full e2e of "slice 2 done" on the phone profile by touch and at 4x CPU; offline second visit; R8 originality and no-real-people review of every new picture, sound and tune; break tests. Added from po K4: (a) real first-timers (Tp first) clear each street in 3 tries or fewer; if not, designer tunes in this order: big pits 170 to 160, then one hazard fewer in street 3's group at 3700 to 4250; (b) listen to the drum and well sounds for originality; (c) offline on the second visit checked by hand; (d) turn the phone and switch apps on streets 2 and 3; keyboard play on streets 2 and 3 | P2 fixes merged | All pass; three-line report |
| P4 | po | Accept slice 2 against "slice 2 done" | P3 | Acceptance note in docs/questions.md |

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

### Open Tp questions and what each would change

| Question | Stand-in now | Pieces hit if Tp changes it |
|----------|--------------|-----------------------------|
| Q16 how regions, states and streets fit; World 1 = Lagos, 3 streets plus hall | option a | K (streets), M (where the hall sits), N (save shape, Streets screen, wheel count), P |
| Q17 progress picture | Nigeria's wheel now, map later | N1, N2, Win screen words (M2, N2) |
| Q18 auto-run as a choice | none anywhere; gentle mode 5 lives | H2, H3, every street layout (H4, K2), L2 (well behind you), S2.11 check (N3) |
| Q19 the well gift | garri parcel, shield on at the hall start | L1, L2, M2 (hall start), N2 (parcel save, card and cleared words) |
| Q20 hair and outfits open to all | all open to all | I1, I2 |
| Q21 the building's name | "Go-Slow Hall" | M1 (sign), M2 and N2 (words) |
| Designer: street names ("Your street", "Market road", "Bus park road") | as in S2.6 | K2 (level files), N1 (cards), N2 (Streets and cleared words) |
| Designer: parcel strength (one free hit at the hall start) | one shield, never stacks | L2, M2, M3 (tuning) |
| Designer: a left-handed swap (Jump on the left, arrows on the right) | not in slice 2 | H3, H5 (button layout), N2 (a switch on title or pause, a new save key) |
| Designer: the elder look (walking stick carried or not; R2 allows one, S2.3 says none in slice 2) | no stick | I1, I2 |

The designer's four are not yet written in docs/questions.md. po to add them there with recommended answers.

## Known facts

1. Node 22 via nvm: ~/.nvm/versions/node/v22.19.0.
2. No gh CLI and no GitHub sign-in on this machine.
3. This Mac sleeps: run e2e under `caffeinate -s -i`. Perf at 4x CPU is noisy here (41 to 47 fps on 7 Nov, not caused by code).

## Status

Done: slice 1 A to F and G1. Slice 2 H (85741b9), I (53a659d), J (8636479), K (5ee5f06), L (cc8e594): each qa passed and po accepted.
Doing: M1, art (hall art and sounds).
Next: gamedev M2 once M1 merges; then N1 (art), N2, O2, P. N2 now carries the parcel save, the parcel toast switch, the HUD second-finger fix and the leftover slice 1 words.
Blocked: G2 to G4, waiting on Tp's GitHub repo. Nothing in slice 2 is blocked; Q16 to Q25 run on po's recommended answers.
Note for Tp: the garri parcel does nothing in a fight until M2 and N2 are both in.

## Waiting on Tp

1. Create the GitHub repo (name, public or private) and push access, or push it yourself. Turn on Pages with source "GitHub Actions". Blocks G2 to G4.
2. Copy the game name (Gbese!) and credits lines into docs/decisions.md (questions.md, first slice note).
3. Q16 to Q25 in docs/questions.md, and the lines to copy into docs/decisions.md.
4. Remove the "wrong premise" line from docs/brief.md Done when 8.
5. Play streets 2 and 3 on your phone and say if any took more than 3 tries (feeds P3).

## Questions for po

None open. (The designer's four are now Q22 to Q25 in docs/questions.md.)

Slice 1 questions for po (answered, kept as history): hero options, power-up lengths, lives and checkpoints, gentle mode, sound, title name, credits, orientation, kobo, World 1 length. po answered them in docs/questions.md; Q5 to Q15 there still wait for Tp to confirm.
