# Picture style

Owner: designer. Written 17 Nov 2026 for decision 85 (Tp, 17 Nov): "A richer picture style, all our own." Inputs: art's picture study and sample page (one Ogun block, drawn in code). The tasks are slice P in docs/plan.md.

This note says how Gbese! should look from now on, what we must never do while making it look better, and the order we do it in. Every new drawing and every changed screen follows it. If this note and an older note disagree about looks, this note wins; if it disagrees with docs/brief.md or docs/decisions.md, those win and the designer fixes this note.

## 0. The idea, in one line

Thick warm outlines, round corners, one simple shading recipe, soft flat shadows, and chunky buttons you want to press. Drawn once and reused, so a cheap phone runs it as fast as today.

Where the ideas come from: we learn general drawing skills from many games (clear outlines, simple shading, soft shadows, friendly buttons). We copy nothing: no characters, logos, letters, fonts, icons, buildings, colours or layouts from any game. Tp's reference pictures are of another game; nobody on the team draws from them, traces them or describes their contents in our files.

---

## 1. The rules of the style

### 1.1 Colours everyone uses

| Name | Colour | Used for |
|---|---|---|
| Warm ink | `#3a2618` | Outlines on buildings, city people, buttons, cards, icons; button words |
| Hero ink | `#1d1a14` (today's `INK`) | The hero's outline only (and things the hero must read against, like hazards that hurt, which keep their own looks). Darker than warm ink on purpose (1.6) |
| Cream | `#fff8e6` (today's `CREAM`) | Button and card faces |
| Main green | `#0e7a3e` | The one main action on a screen (today's `.go` green). Not the sample's `#138a4a`: white bold 15 px words on `#138a4a` are only 4.4 to 1, under the 4.5 to 1 we need; on `#0e7a3e` they are 5.4 to 1 |
| Soft sand | `#ead9b5` | Back, Close, Settings icon discs; empty part of meters |
| Shadow brown | `rgba(80,40,15,a)` | Every soft shadow (1.5) |
| Roof-edge shadow | `rgba(70,35,15,0.20)` | Under every roof edge (1.3) |
| Light edge | `rgba(255,255,255,0.22)` | The lit side of every wall (1.3) |
| Far haze | `rgba(250,236,214,0.45)` | Over the next block back (1.6) |

Warm ink on cream is about 14 to 1. Every word on a button or card is warm ink on cream or white on main green. Nothing else.

### 1.2 The button recipe

Every button outside the run looks like this. Exact numbers:

| Part | Normal button | Big button (main action, bottom rows) | Status chip (not a button: money, Power, Tech) |
|---|---|---|---|
| Shape | pill, `border-radius: 999px` | pill | pill; a place box (city name and meter) uses `border-radius: 14px` |
| Face | cream `#fff8e6` | main action: green `#0e7a3e`; others cream | cream |
| Outline | `2.5px solid #3a2618` | same | same |
| Lip (the pressable edge) | `box-shadow: 0 3px 0 #3a2618, 0 6px 8px rgba(58,38,24,0.22)` | same | same |
| Height you see | 44 px at least | 52 px at least (today's `.go`) | 34 px is fine (it is not tapped) |
| Tap area | 44 x 44 px at least, always | same | none; if a chip is ever made tappable it becomes a button and is 44 px |
| Icon disc | round, 30 px, `2px solid #3a2618`, its own fill colour (table below), icon 70 percent of the disc, drawn in warm ink | 36 px | 26 px |
| Padding | 4 px on the disc side, 14 px on the word side | 4 px and 16 px | 3 px and 13 px |
| Words | bold (weight 800), 15 px, `'Trebuchet MS', Verdana, sans-serif`, warm ink | 16 px; on green: white with `text-shadow: 0 1.5px 0 rgba(0,0,0,0.35)` | 15 px bold (12 px for a meter's "20 of 50") |
| Pressed | `transform: translateY(3px)` and the lip goes to `0 0 0 #3a2618`; no transition | same | n/a |
| Keyboard focus | `outline: 3px solid #2b59c3; outline-offset: 2px` (today's focus ring) | same | n/a |

Rules that go with it:

1. **Words always kept.** Every button shows its word next to its picture. The picture helps; the word says it. The only buttons without a word are zoom `+` and `−`, where the sign is the word; they keep their spoken names ("Zoom in", "Zoom out") and are round, 44 x 44 px.
2. **One green button per screen**, the thing most players want next (Play, Go, Next street, Try again). Everything else is cream.
3. **Never meaning by colour alone.** A switch that is on shows a tick and the word "on" and a 3.5 px outline; off shows the word "off" and the 2.5 px outline. A locked thing shows a lock picture and the word.
4. **Text never shrinks below 15 px** on a button, at any of the six screen sizes. This holds on very short screens too (320 x 240, 480 x 200, 640 x 200): there is no smaller size for them. If a row is too long, the row wraps, a button's words go onto two lines, or the words go to their short form from words.ts (decided per screen in that screen's note, and listed in "Short screens" below); the picture never replaces the word. A short form only changes what you see: the spoken name keeps the full words.
5. **The soft part of the lip (`0 6px 8px`) never goes on anything that moves or fades.** Static buttons only. A banner that slides in (the update banner) uses the hard lip `0 3px 0` only.
6. **Our own icons only**, drawn as small SVG in code by art, in warm ink on the disc. No emoji as icons (they look different on every phone).

Icon disc colours (one colour per job, the same everywhere):

| Job | Disc colour | Icon |
|---|---|---|
| Play, Go, Next street, Challenge road | `#ffe066` | own drawing per button (a road with lane lines for Challenge road, a running foot for Play) |
| Money (₦) | `#f6c34a` | naira sign |
| Power | `#ffe066` | a lightning shape |
| Tech | `#7fd3c7` | a small chip |
| Sound | `#9fd0ff` | a speaker with waves (on) or a cross (off) |
| Music | `#9fd0ff` | today's music note (src/art/musicIcon.ts), redrawn in warm ink |
| Settings | `#ead9b5` | a cog |
| Travel | `#f6c90e` | a yellow bus front |
| Hero | `#f3b38a` | a round smiling face (skin shown on it is a mid tone, `#7a4a2e`) |
| Nigeria's wheel | `#8fd17a` | a wheel with spokes |
| Back, Close, Not now | `#ead9b5` | an arrow pointing left, a cross |
| Try again | `#ffe066` | a round arrow |
| Gentle mode | `#f9c6d3` | a heart |

#### Short screens (rule 4, designer ruling 18 Nov 2026)

Older short-screen rules in src/screens/screens.css (the ones for screens 300 px tall or less) made some button words 12.8 to 13.6 px so everything fit. Each screen was checked at 320 x 240, 480 x 200 and 640 x 200 with 15 px words. Every one fits at 15 px, so there is **no exception**: 15 px is the floor everywhere. Here is how each one fits.

| Screen | Buttons | How 15 px fits on a short screen |
|---|---|---|
| Hero builder | the choice chips (Male, Female, Teen, Adult, Elder, Hair, Outfit) | Words stay as they are. At 320 x 240 the Age row may wrap: "Teen" and "Adult" on one line, "Elder" under them. The right side already scrolls, so this only adds one line. "Male or female" still fits one line. At 480 x 200 and 640 x 200 both rows fit one line. Do not squeeze the chips' side padding below 6 px to stop the wrap: the words then touch the pill's round ends. |
| City (Lagos and Ogun) | top row (Sound, Settings) and bottom row (Challenge road, Hero, Nigeria's wheel) | Words stay as they are. "Challenge road" and "Nigeria's wheel" already sit on two lines at 320 x 240. Sound and Settings still clear the place box at 320 x 240, even with "Sound: off" (7 px apart). |
| Game over (street, hall and lane run) | the Gentle mode switch | Short form **"Gentle mode"**, with its "(off)" shown again (rule 3: off says "off"). The sentence beside it already says "Gentle mode gives you 5 lives", so nothing is lost. The spoken name stays "Gentle mode: 5 lives instead of 3". The lane run's switch already says "Gentle mode: off" / "Gentle mode: on"; it only goes up to 15 px (two lines at 320 x 240 is fine). |
| Game over, Pause, Win (every run card) | the small cream buttons ("Challenge road", "Home", "Take it home") | Words stay as they are; they may go onto two lines ("Challenge / road"). The green button stays at least 80 px wide so it is never the squeezed one. |
| Settings | every switch and "Watch the story" | The Gentle mode switch reads like Sound at every size (po polish note): **"Gentle mode: off"**, or **"Gentle mode: on"** and the tick. It is short already, so it has no short form. The spoken name stays "Gentle mode: 5 lives instead of 3". The other words stay. On screens 260 px tall or less the card's top and bottom padding is 4 px (was 8), so the card does not scroll at 480 x 200 or 640 x 200. |
| Lane run Pause | Keep playing, Start again, Back to Lagos / Back to Ogun, Sound, Music, Buttons instead of swipes | Words stay as they are. At 320 x 240 "Buttons instead of swipes: off" takes four short lines in its pill; the card still fits (about 190 px tall). |

How a short form works: the button holds both the full words and the short words; on a short screen only the short words show. Its spoken name (`aria-label`) is always the full words, and the short words are the start of the full words, so a person using voice control can still say what they see.

### 1.3 The building shading recipe

One recipe for every building, stall, kiosk and shed, in streets and cities. Light always comes from the upper left. Numbers are in drawing units at the scale the thing is baked (1 unit = 1 CSS pixel at zoom 1).

1. **Outline:** warm ink `#3a2618`, 2 units around the whole building; 1.5 units for windows, doors, signs and other inner details. Line joins round. This replaces today's thin dark-grey city outline (about 1 px).
2. **Corners:** 3 units round on walls; 2 on windows; 1 on window glass.
3. **Wall foot:** the bottom 7 units of the wall are the wall colour made 16 percent darker (mix toward black by 0.16).
4. **Roof-edge shadow:** the top 7 units of the wall get `rgba(70,35,15,0.20)` over them.
5. **Light edge:** a strip 4 units wide, 2 units in from the left side, from 7 units below the top to 7 units above the foot: `rgba(255,255,255,0.22)`.
6. **Zinc roof:** roof colour; ridges every 5 units as 1.2 unit lines in the roof colour made 22 percent darker; a light strip 4 units tall along the back edge, `rgba(255,255,255,0.28)`; a front lip 4 units tall made 28 percent darker. The roof hangs 6 units past each wall side.
7. **Flat concrete roof:** a low wall round it in the roof colour made 25 percent lighter with the normal outline; the inside 8 percent darker; a 3 unit shadow line `rgba(70,35,15,0.15)` along the inside back edge.
8. **No gradients**, no glow, no texture images. Flat fills plus these bands only.

Today's wall colours (`SHOP_WALLS` in src/art/palette.ts) stay. Grey roofs that fill most of a city picture become zinc (`#a9a49c` with the recipe) or flat concrete (`#d8cbb2`), mixed, so no area is one big grey.

### 1.4 People in cities

City people grow from about 8 px to **about 32 units tall** (feet to top of head, at zoom 1), so you can see who they are.

1. Head about a third of the body: head circle radius 7, body and legs about 20 below it.
2. Face: two dot eyes (`#1f150f`, 1 x 1.3), a tiny white catch-light in each eye (`rgba(255,255,255,0.8)`, radius 0.35), a small smile (1 unit line), warm cheeks (`rgba(230,110,90,0.28)`).
3. Outline warm ink, 1.6 units on body and head, 1.1 to 1.4 on hands and arms.
4. Everyone smiles. Wide range of skin tones (the seven tones art uses, `#3e2619` to `#bf8558`, plus the lighter `#d9a172` and `#f1c9a5` from the hero builder), hair (gele, fila, braids, afro, puffs, low cut, head tie) and clothes (kaftan, agbada for an older man, wrapper and blouse, ankara, school uniform, work clothes). A wheelchair user and an older person with a walking stick are in every city.
5. A small foot shadow: an oval 8 by 2.6 units, `rgba(70,35,15,0.28)`.
6. Street people (about 30 px) already have this size; they take the warm outline and the face recipe when their street is redone in phase 2, nothing more.

### 1.5 Soft shadows, no blur

Soft shadows are **two flat see-through shapes**, never a blur:

1. A wide faint shape: `rgba(80,40,15,0.09)`, reaching 18 units to the right of the thing and 11 units below its foot.
2. A tight darker shape on top: `rgba(80,40,15,0.16)`, reaching 11 units right and 6 units below.
3. Shadows fall to the right and down (light from the upper left), on buildings, trees, palms, buses, kekes and people.
4. **Never** canvas `shadowBlur`, `shadowColor`, `ctx.filter`, CSS `filter: blur()` or `backdrop-filter`. They are slow on cheap phones. qa checks the code for these words (part 5).

### 1.6 Colour with depth

1. Near things are warm and strong; far things are paler.
2. In the city, the next block back gets the far haze `rgba(250,236,214,0.45)` laid over it once, when baked.
3. In streets, the far row of the backdrop gets the same haze, also baked once; the near shopfront row does not.
4. Ground colours tell places apart: laterite `#dca06a` with specks, paving stones `#e6cfa2` with joint lines `rgba(140,100,60,0.28)`, grass `#9fcf6a`, road `#5d585c`. Detail on the ground stays faint (phase 4) so it never fights the hero, kobo, food or tap targets.

### 1.7 The hero stays easiest to see

1. The hero keeps hero ink `#1d1a14` at today's width (2.6 for the outline, 1.3 for inner lines, src/art/hero.ts). No background thing uses a darker or thicker outline than the hero.
2. Kobo, food and hazards keep their current looks and outlines; the background may never be busier right behind them than today (qa compares, part 5).

---

## 2. Limits

### 2.1 Drawn once and reused

1. Every new drawing is **baked**: drawn once into a canvas and then only copied (drawImage). The city already does this (src/screens/city.ts, src/worlds/ogun/city.ts). Streets use the pixel layer helper in src/art/street.ts.
2. **Nothing new is drawn per frame on streets.** A frame on a street may not draw more paths or fills than today. Shopfronts move into cached strips: each shopfront is drawn once into a strip and the strip is copied as the camera moves. This should make streets faster, not slower.
3. A bake happens when a place opens, when zoom changes a step, or when a block changes look (tired to bright). A bake must take **under 50 ms at 4x CPU slowdown** per block, so it never shows as a hitch. If a bake is bigger, it is split over frames or done while a card is on screen.
4. The city still draws nothing when nobody touches it (idle draws nothing, O6c).
5. Memory: one baked copy of each picture. No second copy for evening (part 7).

### 2.2 Size per phase (gzip)

| Phase | First load grows by at most | Ogun part grows by at most | Why |
|---|---|---|---|
| 1 Buttons | 3 KB | 0 KB | CSS and about 14 small SVG icons |
| 2 Shading | 3 KB | 1 KB | one shared helper file; small changes in each street and city |
| 3 Angled cities, people, shadows | 7 KB (Lagos city is in the first load) | 6 KB (Ogun city) | block fronts, people pieces |
| 4 Everyday detail, paler far blocks | 3 KB | 2 KB | detail helpers, used by both |
| **All four** | **16 KB** | **9 KB** | first load stays under 3 MB; Ogun stays under 150 KB |

The CI size check (`npm run check-size`) prints both lines. Each task in slice P says its own share. Over budget means the task is not done.

### 2.3 Dark skin stays easy to see

1. Faces on the darkest tones (`#3e2619`, `#4b2c1a`, `#5a3825`) keep the white eye catch-light and the cheek blush, so the face reads even where the outline and skin are close in colour.
2. On those three tones the head outline uses hero ink `#1d1a14` instead of warm ink, so the head edge still shows.
3. No person stands in front of a wall foot, roof-edge shadow or soft shadow so that the shade covers their face. Shadows reach the ground and lower legs only.
4. Later, any evening tint gives people a lighter tint than buildings.
5. qa looks at faces of every skin tone at 320 x 240 and 640 x 200 (the smallest sizes) and in greyscale.

### 2.4 Fonts

No font download. Buttons and cards use bold `'Trebuchet MS', Verdana, sans-serif`, already on the phone. A rounded web font would cost 15 to 25 KB and is not needed.

### 2.5 The standing rules

1. **Original only** (CLAUDE.md rule 2). Our own drawings, in code. No traced pictures. No other game's characters, logos, letters, fonts, icons, buildings, colours or layouts. No red caps, plumbers, pipes, question blocks or mushrooms.
2. **No real people** (rule 3). No real person's face or name; no real building, bridge, gantry or landmark drawn as itself; no brands or logos on signs; signs are made-up words (MAMA PUT, POS HERE, VULCANIZER, Kola market).
3. **No party signs.** No party names, colours or logos. **No one holds a broom**, up or at their side (decision 75). **No umbrellas in new art**: market and stall shade is a flat cloth shade on poles (the sample's way), because a big open umbrella can read as a party sign the same way a broom does. Green and white appear only as ordinary colours, never as a flag-like pair on a person or a building.
4. **Mock no one** (rule 4). No person is the "funny" one because of clothes, job, body, faith or region. Every job (trader, mechanic, food seller, POS agent, okada and keke rider) is shown with pride. Nothing religious drawn.
5. **No shop, gift, sign-in or ad-style parts** in the buttons or cards (no price tags on buttons, no "free" badges, no timers).

---

## 3. The plan, in four phases

The tasks are slice P in docs/plan.md, named ST-A (phase 1) to ST-D (phase 4). Each phase finishes (qa passes, po accepts, Tp sees the screenshots) before the next starts. The evening look is not in this plan (part 7).

Six screen sizes for every check: **320 x 240, 568 x 320, 640 x 200, 851 x 393, 1280 x 720, 1920 x 1080**, each also with a 24 px safe area (notch) on the long side. Slow phone profile: 4x CPU slowdown.

Every task also gives Tp **before and after screenshots** at 851 x 393 and 320 x 240, side by side, in the PR.

### Phase 1: Buttons on every screen (ST-A)

What it changes: the button recipe (1.2) on every screen in part 4's "new buttons" list, in Lagos and Ogun. Menus, cards, the city top and bottom rows, the road screen, HUD status chips. Words do not change: every button keeps its words from src/screens/words.ts and docs/ogun.md part 8.

| id | owner | what changes | files likely touched | size | perf rule | qa checks | screenshots for Tp |
|---|---|---|---|---|---|---|---|
| ST-A1 | art | Our own icon set (the disc table in 1.2), as SVG strings in code; one gallery page `?gallery=style-buttons` showing every button, plain and pressed, on and off | new src/art/icons.ts; src/art/musicIcon.ts; src/art/galleries.ts; docs/assets.md | 1.5 KB | none (static) | icons our own; read at 26 px; each icon makes sense with its word hidden (a 10 year old test with 3 icons); listed in assets.md | the gallery page |
| ST-A2 | gamedev | Recipe as shared CSS (`.go`, `.minor`, switches, `.chip`) and a `button()` helper that takes an icon; menus and cards: title, hero builder, pause (street and lane), game over, street cleared, win, mission complete, settings, Nigeria's wheel, travel, download, arrival, the bus ride Skip, the intro Skip and Go, the update banner button | src/screens/screens.css, menus.ts, travel.ts, intro.ts, dom.ts, update-banner.ts, src/worlds/ogun/ride.ts | 1 KB | no new box-shadow on anything animated; cards open no slower on the slow profile | every button 44 x 44 px tap area at all 6 sizes; text never under 15 px; one green button per screen; words kept; keyboard focus ring shows; screen reader names unchanged (e2e names still pass); switches show on/off by tick and word, not colour | title, builder, pause, game over, win, settings, travel card |
| ST-A3 | gamedev | City top row (place box with meter, ₦, Power, Tech, Sound, Settings) and bottom row (Challenge road, Travel, Hero, Nigeria's wheel, zoom + and −) in Lagos and Ogun; the road screen top row, Back and the stop card buttons; HUD status chips during a run (lives, kobo, food, parcel) as cream chips, no bigger than today's boxes | src/screens/city.ts, road.ts, hud.ts, screens.css; src/worlds/ogun/cityScreen.ts | 0.5 KB | the HUD chips are static DOM: no per-frame style change beyond today's number updates; street fps on the slow profile not lower than before (same e2e perf run) | rows fit at all 6 sizes with the safe area; nothing covers a city pin, sign or edge arrow that was visible before; HUD chips do not cover more of the street than today (box sizes compared); 44 px tap areas | Lagos city, Ogun city, road screen, a street with the HUD |
| ST-A4 | qa | Phase 1 pass | ST-A2, ST-A3 | | slow profile; first load +3 KB at most | everything above; greyscale screenshots of every changed screen still say what each button is; originality check of icons | qa's full set, kept in the PR |
| ST-A5 | po | Accept phase 1; Tp sees screenshots | ST-A4 | | | | |

### Phase 2: Building shading in streets and cities (ST-B)

What it changes: the shading recipe (1.3) and warm outlines on every building. In streets, each shopfront is baked once into a cached strip, with its soft shadow (1.5) baked into the same strip. In cities, the recipe goes on today's blocks, still seen from straight above; city shadows wait for phase 3 and the far haze for phase 4.

| id | owner | what changes | files likely touched | size | perf rule | qa checks | screenshots for Tp |
|---|---|---|---|---|---|---|---|
| ST-B1 | art | One shared helper file: `wall()`, `zincRoof()`, `flatRoof()`, `softShadow()`, `mix()`; warm ink and the 1.1 colours in palette.ts; gallery page `?gallery=style-shading` with one Lagos shop, one Ogun shed, one stall with a flat cloth shade, before and after | new src/art/shade.ts; src/art/palette.ts; src/art/galleries.ts; docs/assets.md | 1 KB | the helpers only draw into a bake canvas; never called in a frame loop | numbers match 1.3 and 1.5 exactly; no `shadowBlur` or `filter` | the gallery page |
| ST-B2 | gamedev | Streets: shopfronts drawn with the recipe and baked into cached strips, in all Lagos streets (Alausa, Computer Village, Ikeja), the Ogun streets (Ota, Abeokuta, Sagamu), the well rooms and both halls' walls; street people get the warm outline and face recipe (1.4 point 6) | src/art/street.ts, backdrop.ts, market.ts, buspark.ts, roadside.ts, folk.ts, folkBake.ts, well.ts, wellRoom.ts, hall.ts; src/worlds/ogun/ (Ota, Abeokuta, Sagamu, Pothole Hall art) | 1.5 KB first load, 1 KB Ogun | **nothing new drawn per frame**: frame draw calls on a street equal or fewer than today (count them in the perf test); fps at 4x CPU equal or better than today on Alausa, Ota and Go-Slow Hall; strip memory under 4 MB for a street | every street plays the same (level tests, e2e); hero, kobo, food and hazards read as well as before (side by side and greyscale); no held brooms; any market umbrella in these streets is listed for Tp (part 6, question 1) | Alausa, Computer Village, Ota, Abeokuta, Go-Slow Hall |
| ST-B3 | gamedev | Cities: the recipe on every Lagos and Ogun city block, kiosk and stall, still in today's top-down view; thin grey outlines become warm ink; grey roofs become zinc and flat concrete mixed | src/art/city.ts, src/screens/city.ts, src/worlds/ogun/city.ts | 0.5 KB first load | bake under 50 ms per block at 4x CPU; drag at least 45 fps at 4x CPU; idle draws nothing | tap areas and pins unchanged (same positions); tired and bright blocks still easy to tell apart without colour (the tired marks stay) | Lagos city, Ogun city, tired and bright |
| ST-B4 | qa | Phase 2 pass | ST-B2, ST-B3 | | slow profile; first load +3 KB, Ogun +1 KB at most | as above; plus the code search for `shadowBlur`, `filter =`, `filter:` blur in src/ | qa's full set |
| ST-B5 | po | Accept phase 2; Tp sees screenshots | ST-B4 | | | | |

### Phase 3: Angled cities, bigger people, soft shadows (ST-C)

What it changes: the Lagos city and the Ogun city are seen at an angle (you see the roof and the front of each block: doors, louvre windows, made-up signs, water tanks), on the **same street grid** as today. City people grow to about 32 units (1.4). Soft shadows (1.5) under every block, tree, vehicle and person. These three go together; one without the others looks wrong.

The hard part: the fronts make each block taller on screen, so front rows can cover the back rows a little. Every tap area, place label, sign and edge arrow must still work at all 6 sizes.

| id | owner | what changes | files likely touched | size | perf rule | qa checks | screenshots for Tp |
|---|---|---|---|---|---|---|---|
| ST-C1 | designer | A short note in docs/city.md: how far up each block's front reaches on the grid (at most 40 percent of the block depth), which way the view tilts, where labels and signs sit so a front never covers them, how pins and edge arrows move, how many people show at each zoom step (fewer when zoomed out: 6 per block close in, 2 far out) | docs/city.md | 0 | | po checks the note | a sketch at 851 x 393 |
| ST-C2 | art | Angled drawings for every Lagos and Ogun city block kind (tired and bright), places, pins; the bigger people pieces (hair, clothes, wheelchair, walking stick, head tray); soft shadows; gallery page `?gallery=style-city` | src/art/city.ts, src/art/places.ts, src/art/folk.ts, folkCasts.ts, galleryCity.ts, galleryOgunCity.ts; src/worlds/ogun/city.ts; docs/assets.md | 5 KB first load (Lagos), 4 KB Ogun | baked only; each block bake under 50 ms at 4x CPU | own buildings only, no real building or landmark; cloth shades not umbrellas; people rules 1.4 and 2.3 | the gallery page |
| ST-C3 | gamedev | Lagos city in the angled view, people and shadows; tap areas, pins, place labels, signs, the Tax and price signs and edge arrows moved to match | src/screens/city.ts, src/game/city.ts, cityCamera.ts, cityPeople.ts, cityLife.ts, walkGrid.ts | 2 KB first load | people sheet baked per zoom step as today; the same number of drawImage calls per frame as today or fewer; drag at least 45 fps at 4x CPU; idle draws nothing | every tap area hits its place at all 6 sizes and with the safe area; no label or sign covered by a front; edge arrows still point to off-screen places; the city walk (S3c) still works; turned and opened-at-size cases as in O7 | Lagos city, zoomed in and out, tired and boomed |
| ST-C4 | gamedev | Ogun city the same | src/worlds/ogun/city.ts, cityScreen.ts | 2 KB Ogun | same as ST-C3 | same as ST-C3, Ogun places and the Booming meter | Ogun city, first visit and boomed |
| ST-C5 | qa | Phase 3 pass | ST-C3, ST-C4 | | first load +7 KB, Ogun +6 KB at most | as above; faces of every skin tone at 320 x 240 and 640 x 200 and in greyscale; mock-no-one check of every person drawn | qa's full set |
| ST-C6 | po | Accept phase 3; Tp sees screenshots | ST-C5 | | | | |

### Phase 4: Everyday detail and paler far blocks (ST-D)

What it changes: small real things that make a place feel lived in, and the far haze (1.6). All faint, all baked.

| id | owner | what changes | files likely touched | size | perf rule | qa checks | screenshots for Tp |
|---|---|---|---|---|---|---|---|
| ST-D1 | art | Detail helpers: interlocking paving stones, rust patches on zinc (3 per roof at most), black roof water tanks, louvre windows, burglar-proof bars, light poles and wires, a pot with steam (still under reduced motion), a goat, grass tufts and ground specks, the four ground colours; gallery page `?gallery=style-detail` | src/art/shade.ts (or new src/art/detail.ts), galleries.ts, docs/assets.md | 1.5 KB first load | baked only | detail contrast low: never darker than the wall foot; never inside a tap target's outline | the gallery page |
| ST-D2 | gamedev | Detail and far haze in both cities; far haze on the far backdrop row of every street (baked) | src/art/city.ts, src/screens/city.ts, src/worlds/ogun/city.ts, src/art/backdrop.ts, street.ts | 1.5 KB first load, 2 KB Ogun | baked only; street frame draw calls not more than after phase 2; city bake still under 50 ms per block | hero, kobo, food, hazards and tap targets read as well as before (side by side and greyscale); nothing blinks or moves that did not before | Lagos city, Ogun city, Alausa, Sagamu |
| ST-D3 | qa | Phase 4 pass, and the whole slice P size and speed check | ST-D2 | | first load +16 KB and Ogun +9 KB at most for all of slice P; first load under 3 MB | full run on the slow profile; one Lagos street, one Ogun street and Pothole Hall frame times compared with before slice P | qa's full set |
| ST-D4 | po | Accept phase 4 and slice P | ST-D3 | | | | |

---

## 4. Which screens get the new buttons, and which stay

### 4.1 New buttons (phase 1)

| Screen | Buttons that change |
|---|---|
| Title | every button; the start button is green |
| Hero builder | the green done button and the choice chips (chips keep their swatches and get the warm outline and lip; the chosen chip keeps its tick and 3.5 px outline) |
| Pause card (street and lane run) | every button on the card (the go-on button is green) and the Sound, Music and lane-buttons switches |
| Game over | every button (try again is green) and the Gentle mode switch |
| Street cleared, Win, Mission complete, Pothole Hall win | the next-step button (green), the others cream |
| Settings | every switch and Back |
| Nigeria's wheel | All names, Close, Back |
| City (Lagos and Ogun) | top row and bottom row, zoom + and −, Back, See stop |
| Road screen | Back, the stop card buttons |
| Travel, download and arrival cards | every button (the go button is green) |
| Intro and the bus ride | the go button (green) and Skip |
| Update banner | the update button, hard lip only (1.2 rule 5) |
| HUD in a run | lives, kobo, food and parcel counters become cream status chips (not buttons) |

### 4.2 Stay as they are

| Thing | Why it stays |
|---|---|
| Run controls: left, right and jump pads (src/art/controls.ts) | They sit over the street while you play. Today's see-through drawings let you see the street under them, and their touch areas are far bigger than the pictures. Cream pills would hide the street. |
| Pause and Sound buttons on the run HUD (`.hud-btn`) | Solid green with a white edge reads over sky and sun at a glance. They are pressed mid-run and must not change place or size. |
| The Go down / Go up well button and the throw button | Art's own pictures for one moment of play; they already have a thick edge and a pressed look. |
| The lane run's on-screen buttons | Same reason as the run controls. |
| City pins and place signs | They are part of the city picture, not menu buttons. They take the building outline (phase 2) and stay where tap areas expect them (phase 3). |
| The hint bar and toasts | Messages, not buttons. Unchanged. |

---

## 5. Done checks for qa (every ST task)

1. The six sizes, with and without the 24 px safe area.
2. Slow phone profile (4x CPU): street fps not lower than before the task; city drag at least 45 fps; idle city draws nothing; each bake under 50 ms.
3. Size check: the task's share and the phase's total (2.2).
4. Code search: no `shadowBlur`, `shadowColor`, `ctx.filter`, `filter: blur`, `backdrop-filter` added in src/.
5. Every button: 44 x 44 px tap area, words kept, text 15 px or more, focus ring, spoken name unchanged.
6. Nothing by colour alone: greyscale screenshots of every changed screen.
7. Hero, kobo, food and hazards read as well as before, side by side.
8. Faces of every skin tone at 320 x 240 and 640 x 200.
9. Originality, no real people, no party signs, no held brooms, no new umbrellas, mock no one.
10. Before and after screenshots at 851 x 393 and 320 x 240 for Tp.

## 6. Questions for Tp (through po)

1. **SP-Q1, old umbrellas.** Some streets drawn before this note have market umbrellas (Computer Village stalls, the kola market in Sagamu, the lane run's market umbrella). New art uses flat cloth shades. Should phase 2 also swap the old umbrellas for flat cloth shades? Recommended: **yes**, in ST-B2, at no extra size; it keeps one look everywhere and avoids anything that can read as a party sign, as decision 75 did for brooms.

Small choices made here and reported in one line (decision 64): the main green stays today's `#0e7a3e`, not the sample's lighter green, so white words pass the 4.5 to 1 contrast rule; run controls, the run's Pause and Sound buttons, the well and throw buttons stay as they are; no new font.

## 7. Later, not now

**The evening look**: a blue tint over the baked city, warm glow in windows and lamps, people tinted lighter than buildings so faces stay clear. It could grow with Power ("More lights on!"), never worded as teasing a place for power cuts. It needs a second baked copy or a re-bake, so it waits for its own note and Tp's go (decision 85).
