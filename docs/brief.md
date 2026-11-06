# Gidi Dash: brief (working name)

Owner: Tp. Drafted 6 November 2026. Only Tp edits this file.

## The idea in one line

A free one-tap runner where you play as yourself, run through Nigerian streets, eat Nigerian food for power, and beat the everyday problems that slow everyone down.

## Who it is for

1. Nigerian phone gamers, teens and adults, most on cheap Android phones with costly data.
2. The diaspora, who want a game that feels like home.
3. Later: schools, with a thinking lesson in each world.

## How it plays

1. The hero runs by itself. One tap jumps. A second tap in the air jumps again. Holding jumps higher.
2. Collect kobo coins. Avoid potholes, rolling tyres and wandering goats. Land on a goat or tyre to bounce off it (the goat runs away; no animal is hurt).
3. Each level is 60 to 120 seconds. A bus stop halfway is the checkpoint.
4. Three lives per level. Falling into a pothole or getting hit costs one.
5. Each world ends with a boss fight. The boss is a problem, never a person.

## Your hero (build your look)

Pick skin tone, hair (low cut, afro, braids, gele and more), and outfit (jersey, ankara, school uniform, agbada and more). Saved on the phone. No photo in version 1. A selfie-to-cartoon option done fully on the phone is a later idea and needs Tp's decision.

## Power-ups: Nigerian food

Version 1:
1. Roasted corn: run faster for a few seconds.
2. Garri, sugar and epa (groundnut): a shield that takes one hit.
3. Amala, gbegiri and ewedu: super strong for a few seconds, smash through anything.

Later worlds add foods from every region (see docs/questions.md).

## Worlds

1. Your street (version 1). Boss: General Go-Slow, a heap of stuck cars under a grumpy traffic light. Jump onto the green lights three times to clear the jam.
2. The market. Boss: King Pothole.
3. Down the well (bonus worlds hidden in levels). Short, secret, full of kobo.
4. Across Nigeria, one world per region. Boss: The Light Taker (power cuts).
5. Abuja. Final boss: Mister Red Tape (the endless queue and forms).
6. West Africa updates: Ghana, Benin, Togo, Senegal and more. Friendly rivalry, never mockery.

## Look and sound

Bright, drawn 2D, warm colours, Nigerian street detail: shop signs (Mama Put, Vulcanizer, POS Here), yellow buses, market stalls. Our own characters, our own short tunes. See docs/prototype.html for the feel. It is a reference, not final art.

## Tech

1. A web game that runs in the phone browser and installs to the home screen (PWA). Plays offline after the first visit.
2. Engine: Phaser 3 or plain canvas, gamedev's call with a reason. TypeScript. Vite.
3. First load under 3 MB. Each later world downloads only when reached.
4. 60 frames a second on a mid-range phone; still playable at 30 on a cheap one.
5. Later: wrap for the Google Play Store.
6. Hosting: GitHub Pages.

## Money (not in version 1)

Version 1 is free with no ads, to test the fun. Later options: rewarded ads (watch to get a life back), small outfit packs in naira through a local payment provider, a sponsor per world, a school edition. Never pay to unlock the whole game.

## Out of scope for version 1

Worlds 2 to 6, selfie avatars, accounts, leaderboards, ads, payments, multiplayer, other languages.

## Done when (version 1)

1. A player builds a hero and it is remembered on the next visit.
2. World 1 level 1 plays from start to General Go-Slow and the win screen, on a phone, by touch.
3. All three food power-ups work and say what they do in plain words.
4. Checkpoint, lives, game over and play again all work.
5. Works offline on the second visit. First load under 3 MB.
6. No network request after load, no trackers, no photo access.
7. Nothing copies another game. No real people.
8. The win screen shows: "Remember: a wrong premise often leads to a misleading conclusion."
