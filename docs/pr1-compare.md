# PR #1 against local-build: what is different

Owner: po. Written 9 Nov 2026 in the cloud session.

PR #1 (branch `claude/project-thread-lmmgh6`, one commit 11b934d, made 6 Nov from Tp's project thread) changes the first team pack on `main`. `local-build` (212 commits, built on Tp's Mac 6 to 9 Nov) started from the same first team pack, but never got PR #1. So the two grew apart from the same start.

How to read this:
- **Same**: both say the same thing. Nothing to do.
- **Words**: only wording or a name. po fixes it once Tp picks the name.
- **Choice**: a product choice. It is in docs/questions.md as R1 to R10 for Tp.

Verified: po read both versions of every file PR #1 touches (CLAUDE.md, KICKOFF.md, docs/brief.md, docs/decisions.md, docs/questions.md, docs/prototype.html, the six agent files) and checked the built game in `src/`.

## The list

| # | Topic | PR #1 says | local-build has (built or decided) | Kind |
|---|-------|-----------|-------------------------------------|------|
| 1 | Game name | "Go Naija Go" everywhere (decision "6 Nov, Tp in chat"). The repo is called go-naija-go | "Gbese!" (Tp in chat, 6 Nov, Q1). Title, page title, home-screen name, service worker all say Gbese! | Choice R1 |
| 2 | Who moves the hero | Player is in control, no auto-run | Same: no auto-run anywhere (Q18, pending line 17). Walk, hold to run, jump | Same |
| 3 | Buttons | Left and right on the left thumb; jump and an action button on the right. Keys: arrows, space, X | Left and right, jump. No action button yet, because nothing is thrown or swung yet. "Swap sides" for left-handers comes in slice 3 (Q24) | Follows R3 and R4 |
| 4 | Story | The Unity Drum, broken into six pieces by Mister Red Tape and his gang. Grandma sends the hero. One piece glows over each boss | Nigeria's Wheel, the Stoppers, the Wheel Hero, "Build up Lagos. Get Nigeria working." Lagos city loop. T1 to T4 still open | Choice R2 |
| 5 | Pepper fufu | Version 1 power-up: 8 fufu balls (up to 16), thrown with the action button, bounce, knock hazards, stun bosses | Not built. City choice 8 (open): fufu and egusi, a ball that rolls and plugs potholes, after slice 3. City choice 5 (open): throws only while a throw food works | Choice R3 |
| 6 | Herder's staff (sanda) | Version 1 power-up: swing to clear, vault over wide potholes, takes one hit instead of a heart. Name question for Tp in PR #1's questions.md | Not built, not planned | Choice R4 |
| 7 | Fair shares | Hausa, Igbo and Yoruba get equal foods, tools, worlds, music and helpers. In CLAUDE.md rule 4 and in the brief | CLAUDE.md rule 4: "foods, places and sayings from every part of Nigeria". Built today: corn, garri with epa, amala (often seen as Yoruba); three Lagos streets | Choice R5 |
| 8 | Falling in a pothole | Climb out just before that pothole. A warning sign and cone before every pothole | Back to the bus stop if reached, else the start (design.md, Q14). Cones only on big pits | Choice R6 |
| 9 | Lives and easy play | "Hearts", "Easy mode (5 hearts)" | "Lives", "Gentle mode: 5 lives instead of 3" (Q8, Q15) | Words R7 |
| 10 | Worlds | Your street, the market, down the well, north / east / west worlds of equal size with their own instruments, Abuja, West Africa. New boss idea: the Flood | Lagos is World 1 (3 streets and Go-Slow Hall). Regions are groups of states; the Nigeria wheel has 37 cogs; city loop at home. Wells are already in World 1 | Choice R8 |
| 11 | Art level | "High detail, as good as top mobile platformers. Final art needs a human artist" | All art drawn in code by the art agent. Blender side test is city choice 9 (open) | Choice R9 |
| 12 | Music rules | Original highlife picking, shaker, talking drum, bass; faster in boss fights; regional instruments later | Built (O2): tunes per place, the hall speeds up after each hit, Music switch | Same |
| 13 | Closing line | CLAUDE.md rule 8 and brief Done when 9 keep "Remember: a wrong premise often leads to a misleading conclusion." | Tp said on 7 Nov it is not in the game. Removed from the game; CLAUDE.md rule 8 says so | Choice R10 (already answered by Tp; confirm) |
| 14 | Done when | 9 items: story first, five power-ups, closing line | Brief unchanged from the first pack (8 items). po's suggested brief lines wait in questions.md | Follows R2, R3, R4, R10 |
| 15 | decisions.md | Adds two lines: the name, and "player controls movement, fufu and staff" | 4 lines in the file; lines 5 to 24 wait for Tp to paste them (questions.md) | Follows R1, R3, R4 |
| 16 | Prototype | A new prototype: story panels, on-screen pad, fufu and staff | The first prototype, renamed to Gbese!. The built game is now the real reference | po: keep PR #1's as `docs/prototype-drum.html` for the fufu and staff feel. Not a Tp choice |
| 17 | Agent files | Add: high-detail art, equal shares, story panels for designer, pad, fufu and staff for gamedev | First pack wording, renamed to Gidi Dash | Follows R1, R3, R4, R5, R9 |
| 18 | KICKOFF.md, README | Rename only | First pack | Words, follows R1 |

## What is not a conflict

- Both ban copying any game, real people, parties, trackers, ads and photo access.
- Both keep amala, garri with sugar and epa, and roasted corn, and Grandma-free bosses that are problems.
- Both say every sound can be turned off.

## How to get one main (po's proposal; nothing is merged until Tp says yes)

1. On the cloud branch `claude/serene-hopper-ydve2g`: join `main`'s history to `local-build` with `git merge --allow-unrelated-histories`, keeping local-build's version of every file both have. The game, tests and docs stay exactly as built. (Done on the branch only; `main` is not touched.)
2. With Tp's yes: open a pull request from that branch to `main` and merge it. Because `main` is already inside the branch's history, nothing on `main` is lost. The deploy then runs and the game goes to GitHub Pages.
3. Do not merge PR #1 as it is: it would put the 6 Nov brief and prototype over the built game's docs. Instead, once Tp answers R1 to R10, a small branch brings in the PR #1 parts Tp chose (the name, the agent rules, the prototype file). Tp edits the brief and decisions.md, or tells the lead to paste the agreed lines.
4. Then close PR #1 with a short note saying where each part went. Closing needs Tp's yes too.
