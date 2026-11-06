# Go Naija Go: brief (working name)

Owner: Tp. Drafted 6 November 2026. Only Tp edits this file.

## The idea in one line

A free running and jumping game where you play as yourself, run through Nigerian streets, eat Nigerian food for power, and beat the everyday problems that slow everyone down.

## Who it is for

1. Nigerian phone gamers, teens and adults, most on cheap Android phones with costly data.
2. The diaspora, who want a game that feels like home.
3. Later: schools, with a thinking lesson in each world.

## The story (shown before the first level, can be skipped)

1. Long ago, every town in Naija gave one piece to make the Unity Drum. When it beats, Naija moves: the lights stay on, the roads stay smooth, the buses keep rolling.
2. Mister Red Tape, a heap of files and forms with a big WAIT stamp, tied up the drum. It went quiet and the whole country got stuck.
3. He broke the drum into six pieces (one per main world) and gave them to his gang to guard: General Go-Slow, King Pothole, the Light Taker and more. Each hides in a different place.
4. Grandma gives the hero a plate of amala: "Bring back every piece, so the drum can beat again. Go, Naija, go!"
5. Each world's boss holds one piece, shown glowing above the boss so the player always sees the prize. When the boss falls, the piece flies into the drum at the top of the screen, which fills stave by stave (1 of 6, 2 of 6...). Each piece won makes the drum beat once more, and that part of the country starts moving again. The last piece is in Abuja with Mister Red Tape. Later updates: he runs across the border and friends in other West African countries help.

The story is told in short picture panels with one or two lines each. Grandma comes back between worlds.

## How it plays

1. The player is in control. On a phone: left and right buttons on the left thumb, a big jump button and an action button on the right thumb. On a keyboard: arrow keys, space to jump, X to use. Press jump again in the air for a second jump; hold for a higher jump.
2. Collect kobo coins. Avoid potholes, rolling tyres and wandering goats. Land on a goat or tyre to bounce off it (the goat runs away; no animal is hurt).
3. Potholes must be easy to see: a dark hole with broken edges and muddy water, a warning sign and a cone before each one.
4. Each level is 60 to 120 seconds. A bus stop halfway is the checkpoint.
5. Three hearts per level (five in Easy mode). Falling into a pothole costs one heart, then the hero climbs out just before that pothole to try again, not back at the checkpoint, so it never feels unfair. Getting hit costs one heart.
6. Each world ends with a boss fight. The boss is a problem, never a person.

## Your hero (build your look)

Pick skin tone, hair (low cut, afro, braids, gele and more), and outfit (jersey, ankara, school uniform, agbada and more). Saved on the phone. No photo in version 1. A selfie-to-cartoon option done fully on the phone is a later idea and needs Tp's decision.

## Power-ups: Nigerian food and tools

Version 1:
1. Roasted corn: run faster for a few seconds.
2. Garri, sugar and epa (groundnut): a shield that takes one hit.
3. Amala, gbegiri and ewedu: super strong for a few seconds, smash through anything.
4. Pepper fufu: gives 8 hot fufu balls (up to 16). The player throws one with the action button, in the direction they face; thrown in the air, it aims down. Balls bounce along the road, knock hazards away, cancel honk waves and stun bosses. The count shows on screen.
5. Herder's staff (sanda): the herder's tool for clearing a path. Kept until the player is hit. Action on the ground: swing to clear hazards and honk waves in front. Action in the air: plant the staff and vault far, to cross wide potholes. If the player is hit while holding it, the staff takes the hit and is dropped instead of a heart. It is a proud herding tool, never used to hurt an animal. Goats are shooed away, not hit.
6. The action button shows what the player is holding. The last thing picked up is in hand; when fufu runs out, the staff comes back to hand.

## Fair to everyone

The game must feel like home to the three largest groups, Hausa, Igbo and Yoruba, as equals, and welcome everyone else over time (Ijaw, Kanuri, Tiv, Efik, Ibibio, Edo, Nupe and more).
1. Each of the three gets an equal share in every version: power-ups (amala for Yoruba, pepper fufu for Igbo, the herder's staff for Hausa in version 1), a home world, music sounds and helper characters.
2. Bosses are problems found everywhere. No boss belongs to, looks like, sounds like or is named after any group, faith or region.
3. Each region's world is the same size and quality, and is made with people from that region checking it.
4. Words in Hausa, Igbo, Yoruba and Pidgin are checked by native speakers before release.

## Worlds

1. Your street (version 1). Boss: General Go-Slow, holding the first drum piece, a heap of stuck cars under a grumpy traffic light. Jump onto the green lights three times to clear the jam.
2. The market. Boss: King Pothole.
3. Down the well (bonus worlds hidden in levels). Short, secret, full of kobo.
4. Across Nigeria: a northern world (savannah, city gates, kalangu drums), an eastern world (hills, markets, ogene bells) and a western world (lagoon, markets, talking drum), each equal in size. Bosses there are problems like the Light Taker (power cuts) and the Flood.
5. Abuja. Final boss: Mister Red Tape (the endless queue and forms).
6. West Africa updates: Ghana, Benin, Togo, Senegal and more. Friendly rivalry, never mockery.

## Look and sound

High detail, polished 2D, as good as top mobile platformers: clear side-on characters with fabric patterns, hair texture, shading and smooth running animation. The prototype art is a placeholder. Final art needs a human artist (or an artist working with art tools), with the art agent preparing parts and briefs. Bright, warm colours, Nigerian street detail: shop signs (Mama Put, Vulcanizer, POS Here), yellow buses, market stalls. Our own characters, our own short tunes. Music is original: a bright, bouncy loop with a Nigerian feel (highlife guitar picking, shaker, bending talking-drum hits, bass), using only common scales and rhythms so nobody can claim it. It must not copy or resemble any game theme or any song. Each regional world later adds its own instruments (kalangu and algaita in the north, ogene and udu in the east, talking drum and sekere in the west). It speeds up a little in boss fights. Every sound can be turned off. See docs/prototype.html for the feel. It is a reference, not final art.

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

1. The story plays before level 1, can be skipped, and does not show again unless asked.
2. A player builds a hero and it is remembered on the next visit.
3. World 1 level 1 plays from start to General Go-Slow and the win screen, on a phone, by touch.
4. All five power-ups work and say what they do in plain words.
5. Checkpoint, lives, game over and play again all work.
6. Works offline on the second visit. First load under 3 MB.
7. No network request after load, no trackers, no photo access.
8. Nothing copies another game. No real people.
9. The win screen shows: "Remember: a wrong premise often leads to a misleading conclusion."
