# Gbese! store listing (task ST3)

Designer note, 20 Nov 2026. For Google Play and the Apple App Store (decisions 39, 40, 51). po checks and approves the words; Tp approves anything that goes live (decision 64: store releases wait for Tp).

Rules for every word here:
- Plain words a smart 10 year old follows (CLAUDE.md rule 7).
- Only what is built now: Lagos and Ogun, the hero builder, the food power-ups, the city you fix, and bosses that are everyday problems. Nothing promised for later.
- No real people, no party names or colours, no brand. Mock no one. Nothing compared to, or named after, another game.
- No "best", "number 1", "free" or prize words in the title or short text (both stores reject them there).

Character counts below were checked by script (spaces count). Upper limits: Play title 30, Play short description 80, Play full description 4000; Apple name 30, Apple subtitle 30, Apple promotional text 170, Apple description 4000, Apple keywords 100.

## 1. Name

| Where | Words | Characters |
|---|---|---|
| Play title | Gbese! | 6 |
| Apple name | Gbese! | 6 |
| Name under the icon on the phone | Gbese! (ST0 part 1) | 6 |
| Developer name shown on both stores | Tp to set when making the accounts (decision 40). The game's own credits say "Made by CoachNaz." and the app id is com.coachnaz.gbese (decision 54), so "CoachNaz" would match. | |

## 2. Short words

**Play short description** (80 max):

> Build your hero. Run Lagos and Ogun. Eat Naija food. Beat traffic and potholes!

(79 characters.)

**Apple subtitle** (30 max, shows under the name):

> Run, fix and light up Naija

(27 characters.)

**Apple promotional text** (170 max, can change any time without a new build):

> Run the streets of Lagos and Ogun, eat roasted corn and amala for power, and help the city work again. No ads, no accounts, no internet needed.

(143 characters.)

## 3. Long description (Play full description and Apple description: the same words)

Plain text, no web links (the description must not send people elsewhere). Line breaks as shown. About 2,400 characters of the 4,000 allowed. The dashes are plain hyphens so both stores show them the same.

```
Nigeria's Wheel keeps everything moving. But the Stoppers want it stuck: traffic, potholes, power cuts and slow internet. You are the Wheel Hero. Run, jump and fix your way across Nigeria.

MAKE A HERO WHO LOOKS LIKE YOU
Pick male or female, teen, adult or elder, your skin tone, your hair (low cut, afro, braids, gele and more) and your outfit (ankara, agbada, kaftan, school uniform and more). Your hero runs every street and every boss fight.

RUN THE STREETS OF LAGOS
- Alausa, Computer Village and Ikeja, each with its own sights, sellers and shouts.
- Jump potholes, open gutters and rolling drums. Hop over tyres and goats (the goats are never hurt, they just trot off).
- Knock crates from below and find a hidden well with a secret room.

THEN CROSS INTO OGUN
- Ota, Abeokuta and Sagamu, each with something new: sticky mud, rock steps, cracks in the road and hopping gravel.
- Pick the high road or the low road.

NIGERIAN FOOD IS YOUR POWER
- Roasted corn: run faster.
- Garri, sugar and groundnut: a shield that takes one hit for you.
- Amala, gbegiri and ewedu: super strong, smash through.
- Pepper fufu: throw hot fufu balls that fill potholes.
- Ikokore: mud cannot slow you.
- Ofada rice and sauce: cracks stay shut.

BOSSES ARE EVERYDAY PROBLEMS
- General Go-Slow, a huge traffic jam that throws tyres and honks. Land on the green lights to clear the road.
- King Pothole, a hole in the road that will not stay filled. Drop bags of road mix in him until he is smooth.
- The Blackout, chasing you down the road and switching off the lamps. Run, collect Power and push it back.

FIX THE CITY
Win Naira, Power and Tech on the streets, then spend them on the city map: new roads, lamps that come on, fast internet, water in the taps. Watch each part of the city brighten as you fix it. The Booming meter shows how far you have come.

MADE FOR EVERYONE
- One-tap jumps and big buttons.
- Gentle mode gives you 5 lives instead of 3.
- A Sound button and a Music button, and nothing that depends on colour alone.
- Plays sideways, offline, on a cheap phone.

NO ADS. NO ACCOUNTS. NOTHING COLLECTED.
Your hero and your progress are saved on this phone only. No trackers, no ads, no sign-up, and no internet needed to play. The Naira in the game is pretend money: there is nothing to buy.

Every picture, sound and tune in Gbese! is our own. More of Nigeria is on the way.
```

Notes for po:
- "More of Nigeria is on the way." is a plain hope, not a promise of a date or a place. Cut it if po wants nothing about later.
- "Water in the taps" is Ogun's "Dry taps" fix (ogun.md 6). "Lamps that come on" and "fast internet" are Lagos fixes (city.md).
- "Garri, sugar and groundnut" is the store spelling of the game's "Garri, sugar and epa (groundnut)": the store reader may not know "epa". The game keeps its own words.
- Before upload, gamedev reads this list against the build: if anything here is cut or renamed in the game, this text changes too.

## 4. Keywords (Apple only, 100 max)

Apple: commas, no spaces, never the app name or a category name (Apple adds those), never another game's or brand's name.

```
runner,Nigeria,Naija,Lagos,Ogun,Abeokuta,Africa,platform,jump,hero,amala,garri,city,offline,potholes
```

(100 characters.) Play has no keyword box; it reads the description.

## 5. Category

| Store | Pick | Why |
|---|---|---|
| Google Play | App type: Game. Category: **Arcade**. Tags (pick up to 5 from Play's list): Platformer, Runner, Casual, Offline, Single player (take the nearest ones Play offers on the day) | It is a short-run jump-and-run game |
| Apple | Primary: **Games**, subcategory **Arcade**. Secondary: Games, **Adventure** | Same reason; Adventure fits the journey across states |

Not a "Kids" category on either store (decision 41).

## 6. Age rating

Who it is for: everyone 10 and up, not the kids-only section (decision 41). The game has no violence against people (goats are never hurt; bosses are a jam, a pothole and a power cut, beaten by landing on lights and dropping road mix), no scary scenes, no bad words, no dating, no drugs or drink, no gambling, no chat, no web browser, no ads, nothing to buy.

### 6.1 Google Play (IARC questionnaire, in Play Console, "Content rating")

| Question | Answer |
|---|---|
| Category | Game |
| Violence (any kind, including cartoon) | No. (If the form asks about jumping on objects: the hero bounces on tyres and gravel and on traffic lights; no character is hurt. Answer No.) |
| Fear / horror | No |
| Sexuality, nudity | No |
| Bad language | No |
| Drugs, alcohol, tobacco | No |
| Crude humour | No |
| Gambling, simulated gambling, real money | No. The in-game Naira is pretend; it is never bought or cashed out |
| Users can talk to each other, share content, or share location | No |
| Digital purchases | No |
| Unrestricted web browsing | No |

Expected result: Everyone / PEGI 3 / USK 0 or the nearest in each country. We do not claim a rating; the form gives it.

**Target audience and content** (Play Console, "Target audience"):
- Age groups to tick: **9 to 12, 13 to 15, 16 to 17, 18 and over.** Not 5 and under, not 6 to 8.
- Ticking 9 to 12 is honest (we aim at 10 year olds) and means Play's Families rules apply. We already meet them: no ads, no data collected, a privacy page, nothing to buy, no outside links.
- "Could the app appeal to children by mistake?": not asked once 9 to 12 is ticked.
- Do **not** apply for "Teacher Approved" (that is the kids section; decision 41).

**Other App content forms:**
| Form | Answer |
|---|---|
| Privacy policy | The privacy page link (part 8) |
| Ads | No, the app does not contain ads |
| App access | All of the app works with no special access (no sign-in) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |
| COVID-19 tracing | No |

### 6.2 Apple (App Store Connect, "Age Rating")

Answer honestly; Apple works out the rating.

| Question | Answer |
|---|---|
| Parental controls, age checks | None |
| Unrestricted web access | No |
| User-generated content | No |
| Messaging and chat | No |
| Advertising | No |
| Profanity or crude humour | None |
| Horror or fear themes | None |
| Alcohol, tobacco, drug use | None |
| Mature or suggestive themes | None |
| Sexual content, nudity | None |
| Cartoon or fantasy violence | None (see part 6 lead: no one is hurt) |
| Realistic violence, guns, weapons | None |
| Medical or treatment information | None |
| Contests | None |
| Gambling, simulated gambling, loot boxes | None |

Expected result: **4+**. Apple shows the lowest age the content is fine for; 4+ does not put us in the Kids category, and we do not pick "Made for Kids" (decision 41). Apple lets a developer raise the rating by hand to 9+; we recommend leaving the honest 4+ (see "For Tp" below).

## 7. Privacy answers

What is true of the built app (checked 20 Nov 2026 in the repo):
- No accounts, no sign-in, no ads, no trackers, no analytics, no crash reporter.
- The game saves (hero look, progress, settings) in the app's own storage on the phone and nowhere else.
- Backup is off (decision 59): Android `allowBackup` false with backup and data-extraction rules that leave the save out; on iPhone the save folders are marked "exclude from backup" (ios/App/App/AppDelegate.swift).
- The Android release build has no internet permission at all (android: the release manifest removes INTERNET). The iPhone app loads the game from inside the app and fetches nothing.
- Tilt to steer reads the phone's lean only while playing, only to steer; nothing is saved or sent (the in-game line "Tilt is only used to steer. Nothing is saved or sent.").
- No camera, microphone, photos, contacts or location.

### 7.1 Google Play "Data safety"

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| (then) Is all user data encrypted in transit? | Not asked when the answer above is No |
| Do you provide a way for users to request that their data is deleted? | Not asked when nothing is collected. If shown: no data is collected; deleting the app deletes the save |
| Account creation | The app does not let users create an account |

The store will show: "No data collected", "No data shared with third parties".

### 7.2 Apple "App Privacy" (the privacy label)

| Question | Answer |
|---|---|
| Do you or your third-party partners collect data from this app? | **No, we do not collect data from this app** |
| Tracking | None |

The store will show: **Data Not Collected**.

Build notes for ST4b (gamedev, not for the listing):
- The Capacitor parts ship their own privacy files (PrivacyInfo.xcprivacy in node_modules/@capacitor/ios). The app has none of its own. If App Store Connect warns about a missing reason at the first TestFlight upload, add an app PrivacyInfo.xcprivacy saying no tracking and no data collected, with only the reasons the warning names.
- Info.plist already says the app uses no special encryption (ITSAppUsesNonExemptEncryption false), so no export papers.

## 8. The privacy page (decision 56)

- File: `public/privacy.html`, built to `dist/privacy.html`, so it goes live with the test link site.
- Link to give both stores: `https://digiself-creator.github.io/go-naija-go/privacy.html` (the test link plus `privacy.html`).
- One small page (about 2 KB): plain HTML, a few lines of style inside the page, no scripts, no outside links, no outside fonts, light and dark colours. Its one link is "Back to the game".
- It says: no accounts, no ads, no trackers, no data collected or shared, the save stays on this phone, backup is off, what tilt does, that the app needs no internet, who it is for, and how to ask a question (by the store page's contact email, so the page names no email of its own).
- Not part of the game download: the service worker does not fetch it on the first visit and never answers it from its cache (vite.config.ts `PRECACHE_SKIP`, src/sw/sw.js), so the page is always the live one and a player never downloads it with the game. `npm run check-size` leaves it out of the first-load total and fails if it is ever cached or missing.
- The store app also carries the file (the app is built from the same dist), about 2 KB; the game never opens it.
- If the page ever changes, change its "Last changed" date and tell Tp.

## 9. Screenshots (later; not made yet)

Made from the real game (the hero may be the code-drawn one; a 3D hero render may be used for store pictures, decision 65). Sideways. iPhone only on Apple (decision 57). Best made after S3e1b.

Sizes:
- Apple: 6.9 inch iPhone set, sideways, 2868 x 1320 (Apple sizes the smaller iPhones from it). No iPad set (decision 57).
- Google Play: phone set, sideways, 1920 x 1080. (Play does not take the Apple size: the long side may be at most twice the short side.) The feature picture is already made: app-assets/store/play-feature-1024x500.png (ST2).

The eight, in this order (the first three show in search results, so they carry the game):

| # | Screen | What must be in it | Caption on the picture (plain, short) |
|---|---|---|---|
| 1 | Alausa street, mid-run | the hero mid-jump over a pothole with its warning sign, kobo row, shop signs, people at the bus stop | Run the streets of Lagos |
| 2 | Hero builder | the big preview and the rows, a non-default look picked (for example elder, female, gele, ankara) | Make a hero who looks like you |
| 3 | Go-Slow Hall | General Go-Slow throwing a tyre, one green light lit, the hit counter with one tick | Beat traffic, the everyday boss |
| 4 | A street with food working | roasted corn speed lines and the "Fast" chip with its seconds (or amala smashing a tyre) | Nigerian food is your power |
| 5 | The lane run | the hero from behind on a Lagos main road at dusk, the Blackout behind, Power pickups | Outrun the Blackout |
| 6 | The city from above | a bright fixed block next to a faded one, a pin, the Booming meter | Fix the city, watch it light up |
| 7 | Ogun street | Abeokuta rock steps or Ota mud with the gateway arch | Cross into Ogun |
| 8 | Pothole Hall | King Pothole with a "PLOP!" as the bag drops in | Smooth out King Pothole |

Swap-in if po prefers: the challenge road (the stops before and after their fix) in place of 4.

Rules for the pictures: the HUD may show (it is the real game); no debug lines; captions in plain words, our own font look, never colour alone to carry meaning; no phone frames that copy a real phone maker's look; no real place's logo or sign.

## 10. Still to give (Tp)

The stores ask for these. We must not invent them.

1. **Contact email** for both listings (Play shows it to everyone; Apple shows it to reviewers). Tp's own, kept apart from any employer (decision 40).
2. **Support URL** (Apple needs one). Recommend: the privacy page link until there is a support page, with the contact email on the listing. Tp to agree.
3. **Developer name** shown under the app (part 1).
4. **Price**: free, nothing to buy (as the description says). Tp confirms.
5. **Countries**: recommend all countries where both stores sell. Tp confirms.
6. **Apple age rating**: recommend the honest 4+ that Apple works out, not a hand-raised 9+. "Everyone 10 and up" is who we make it for; the store rating is what is in it.
7. **Play "9 to 12" age group**: recommend ticking it (honest), which brings Play's Families rules; we already meet them.
