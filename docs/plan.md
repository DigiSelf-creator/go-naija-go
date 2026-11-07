# Plan

Owner: pm. Updated 6 Nov 2026. Source: docs/brief.md. Product calls come from po and Tp, never from pm.

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

## Known facts

1. Node 22 via nvm: ~/.nvm/versions/node/v22.19.0.
2. Repo is a fresh git repo on main. No gh CLI and no GitHub sign-in on this machine.

## Status

Done: A to F (first slice, qa passed, po accepted 6 Nov 2026) and G1.
Next: G2 to G4 (push, test the live URL, accept it).
Blocked: G2 to G4, waiting on Tp's GitHub repo. Q5 to Q15 wait for Tp to confirm (docs/questions.md).

## Waiting on Tp

1. Create the GitHub repo (name, public or private) and push access, or push it yourself. Turn on Pages with source "GitHub Actions". Blocks G2 to G4.
2. Game name before a public URL goes out (questions.md Q1).

## Questions for po

1. Hero options for version 1: brief says "low cut, afro, braids, gele and more" and "jersey, ankara, school uniform, agbada and more". Which exact list and how many skin tones? Blocks B1, B2.
2. Power-up lengths: brief says "a few seconds". Does designer set the numbers, or does po? Does amala smash the boss's attacks too? Blocks D1.
3. Lives: on game over, does play again start at the level start or the bus stop? Do lives reset at the checkpoint? Blocks C5.
4. Gentler mode with more lives (designer rule): in the first slice or later? Blocks nothing now.
5. Sound in the slice: placeholder beeps with a sound-off button, or wait for original tunes? Blocks C2, F4.
6. Title screen name: show "Gidi Dash" (working name) on the public Pages build, or a neutral title until Q1 is settled? Blocks G2.
7. Credits screen: CLAUDE.md says credits show the closing line. Is a credits screen in version 1? Blocks nothing in the slice.
8. Phone orientation: landscape only, portrait only, or both? Blocks A3, C1.
9. Kobo: score only in version 1, or does it do anything (for example extra life)? Blocks C1.
10. Does "World 1 level 1" mean World 1 is only one level in version 1, with the boss at its end? Blocks the plan after the slice.
