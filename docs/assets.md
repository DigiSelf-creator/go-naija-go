# Assets

Owner: art. Every picture below is drawn in code on a canvas (no image files), so it adds only a few KB of script to the first load. No outside assets, fonts or sounds are used. The text uses the phone's own sans-serif font.

| Asset | File | Source | Licence |
|---|---|---|---|
| Shared colours | src/art/palette.ts | Drawn in code, original | No outside licence |
| Hero layers: 5 skin tones, hair (Low cut, Afro, Braids, Gele, Headscarf), outfits (Green jersey, Ankara, School uniform, Agbada, Kaftan); run, jump, stand, blink, amala glow, corn speed lines | src/art/hero.ts | Drawn in code, original | No outside licence |
| Sky, sun, clouds, far skyline | src/art/street.ts | Drawn in code, original | No outside licence |
| Shop row with made-up signs (MAMA PUT, VULCANIZER, POS HERE, PURE WATER, TAILOR, PROVISIONS, PHONE REPAIRS, BARBING SALON) and small shop pictures; cached to one offscreen canvas | src/art/street.ts | Drawn in code, original | No outside licence |
| Yellow bus (passing and parked), road with lane marks, potholes, market stall roofs, bus stop (unlit and lit) | src/art/street.ts | Drawn in code, original | No outside licence |
| Goat (walking, and running away unhurt with a "MEEH!" bubble), rolling tyre | src/art/hazards.ts | Drawn in code, original | No outside licence |
| Kobo coin (spinning), roasted corn, garri sugar and epa, amala gbegiri and ewedu, HUD food icons, pickup sparkle, shield bubble and pop | src/art/items.ts | Drawn in code, original | No outside licence |
| General Go-Slow (idle, hit, honk attack, defeat), "POOO!" honk cloud, dust pop, GO light platform (off, lit, done), hit counter | src/art/boss.ts | Drawn in code, original | No outside licence |
| Art gallery (debug view of every asset) | src/art/gallery.ts | Drawn in code, original | No outside licence |
| Slice 2 gallery pages (?gallery=1 and up; &t=1.5 holds the time) | src/art/gallery2.ts | Drawn in code, original | No outside licence |
| Phone buttons: Back, Forward (circle, triangle), Jump (pill, chevron, word), Go down and Go up (pill, bucket, arrow), each with a pressed look; as SVG for HTML buttons and as canvas drawing | src/art/controls.ts | Drawn in code, original | No outside licence |
| Hero walk, run with dust puff, skid on a turn (same rig, face, skins and hitbox) | src/art/hero.ts, src/art/dust.ts | Drawn in code, original | No outside licence |
| Pavement and gutter strip, big pit cones, start fence (zinc sheets, posts, arrow board) with a parked bus, bus park (shelter, "BUS PARK" board, wall), big yellow market bus with roof rack and sliding door, bus end timeline | src/art/roadside.ts | Drawn in code, original | No outside licence |

## Originality check

- No red caps, plumbers, pipes, question blocks, mushrooms, or shapes from any other game.
- No real people, brands or logos. Shop names are everyday words. The bus is plain yellow with black stripes and no writing.
- General Go-Slow is a traffic light and a heap of cars: no uniform, cap, medals, flag, party colours, and no faces in the cars.
- Slice 2 (R8 list checked): no run button (buttons are plain arrows and "Jump"); the street ends at a bus park with a market bus (roof rack, sliding door), never a flagpole or castle; the start is a zinc compound fence. The end bus was reshaped from a long rounded body to a boxy van with a sloped nose and roof load, so it does not read as a school bus.

## Pride check (things we chose not to do)

- Every skin tone gets the same face: white eyes with a dark pupil and a white smile, so features read on the darkest tone too. No tone is used for a "baddie".
- Gele was reshaped to a wide, swept, pleated wrap so it does not look like a crown or a church hat. The agbada chest embroidery is loops, not a cross, so it carries no faith sign.
- Headscarf is a soft wrap shown as a normal, proud choice, never a costume.
- The goat is never hurt: it smiles and trots off. The boss is a problem, not a tribe, job or official, and its defeat is a happy green light.

## Sound

All sounds are made in code with WebAudio in src/engine/sound.ts: original, no sound files, no outside licence. Soft sine and triangle tones plus a little filtered hiss, each under half a second (the win tune is about 1.5 s). Nothing plays until the first tap, and the sound button turns every one off.

| Sound | What it is |
|---|---|
| jump / airJump | Talking-drum style pitch bend, up then settling; the air jump is higher |
| kobo | Shekere-style hiss tick with one soft high pling that dips |
| food | "Yum" drum bend up and down, then a small sparkle |
| bounce | Springy sine boing |
| meeh | Friendly, wobbly two-part goat bleat |
| smash | Soft thump, dust puff, tiny ping |
| hit | One sagging "oof" bend |
| shieldPop | Bubble pop: quick rise and a tick |
| fall | Drip then puddle splash |
| checkpoint | One bright bell ding at the bus stop |
| tick | Woodblock tick as a food wears off |
| gameOver | A dip, then a hopeful lift ("try again") |
| arena | Low two-tone bus-style horn, "pa-paaam" (no real horn copied) |
| honk | Boss honk-cloud throw: one sagging two-tone "POOO" |
| greenHit | Drum knock and bright ding when landing on the green light |
| bossWin | Happy "pom pom" from the cars, then our own short highlife-style tune |
| runStart | Soft dust whoosh: low hiss over a faint low swell |
| skid | Short gritty scuff: two rough hisses and a low drag |
| busBoard | Door hiss, then our "pa-paam" horn |

Avoided on purpose: the square-wave B5-to-E6 coin pair, rising square power-up runs, descending "lose" runs, and pipe or warp slides. tests/unit/sound-originality.test.ts checks the coin pair.
