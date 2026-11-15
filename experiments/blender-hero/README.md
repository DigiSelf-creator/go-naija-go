# Blender hero test (decision 60, part 2)

Test only. This is not part of the game. Nothing here is in `src/` or `public/`, the build or the offline cache.

The question from Tp was whether our hero could look like the 3D-rendered heroes in big studio runner games. To find out, I built one of our own heroes in Blender, made a run cycle, rendered sprite frames and put them next to the code hero.

## What was built

- Look: Adult, Male, skin tone 5 (`#4b2c1a`), low cut, green jersey (white side stripe, white cuffs, white socks and trainers). The colours come from `src/art/hero.ts`. The shapes follow our code hero: a big round head, a big eye with a glint, a small rose smile, short sleeves, shorts. There is no cap, no moustache and no overalls, and it does not look like any real person.
- It is a low-poly, stylised model made from simple parts (spheres and capsules on a jointed rig). The script builds everything, so it can be rebuilt.
- The shading is toon shading done with emission: two tones and a small highlight, plus a lit rim that helps dark skin show against the ink line. The ink outline is an inverted hull. All of this runs on CPU Cycles, with no GPU.
- Frames: a 10-frame run cycle, plus jump, fall and land (13 frames). They are rendered sideways with the camera turned 22 degrees, so the body shows some depth, on a transparent background. The 1x frames are 48 x 64 px (1 px per game unit) and the 2x frames are 96 x 128 px. There is also a 512 px hero shot.

## Files

| File | What |
|---|---|
| `build_hero.py` | Builds, poses and renders the hero (bpy). `--layers` also renders skin, hair and outfit as separate layers. `--scales 8` gives big frames. |
| `measure.py` | Packs the frames into strips and measures them as PNG, PNG8 and WebP. |
| `sheet.py` | Contact sheet for checking frames by eye. |
| `compare/entry.ts`, `compare/compare.mjs` | Draw the real code hero (`drawHero`) and street next to the Blender frames, using headless Chrome. |
| `samples/` | `strip_1x.png`, `strip_2x.png`, `strip_2x.webp` (13 frames), `layer_outfit_2x.png`, `hero_shot_512.png`, `compare_ingame.png`, `compare_enlarged.png`. |

Rebuild (run from the repo root):

```
pip install bpy                                   # Blender 5.3 as a Python module, about 2 minutes
python3 experiments/blender-hero/build_hero.py --out /tmp/frames --shot --layers
python3 experiments/blender-hero/build_hero.py --out /tmp/frames --only run02,run07,jump --scales 8
python3 experiments/blender-hero/measure.py /tmp/frames /tmp/strips
node_modules/.bin/rolldown experiments/blender-hero/compare/entry.ts -o /tmp/bundle.js -f iife
CHROME=/usr/bin/google-chrome node experiments/blender-hero/compare/compare.mjs /tmp/bundle.js /tmp/frames /tmp
```

`CHROME` is optional. It points Playwright at an installed Chrome when its own browser is missing.

Getting Blender: `pip install bpy` worked. EEVEE will not start here because `libEGL.so.1` is missing (there is no GPU), so the script uses CPU Cycles with emission-only materials. All 66 images render in about 10 seconds.

## Sizes (one look, 13 frames)

| | PNG (optimised) | PNG8 (256 colours) | WebP lossless | WebP q80 |
|---|---|---|---|---|
| Strip 1x (624 x 64) | 22.9 KB | 6.3 KB | 13.3 KB | 8.6 KB |
| Strip 2x (1248 x 128) | 63.5 KB | 14.4 KB | 32.9 KB | 18.9 KB |
| Skin layer 2x | 42.9 KB | 10.9 KB | 20.0 KB | 14.1 KB |
| Hair layer 2x (low cut) | 12.1 KB | 3.0 KB | 3.7 KB | 2.6 KB |
| Outfit layer 2x | 35.2 KB | 9.5 KB | 17.3 KB | 15.0 KB |
| Hero shot 512 px | 83.7 KB | | | 8.7 KB |

The loose frames straight from Blender are 46.7 KB (1x) and 111 KB (2x).

### All builder looks

The builder has 5 skins x 5 hairs x 5 outfits x 2 bodies x 3 ages = 750 looks. The game also uses more poses than these 13: walk, skid, stand and breathe, blink, dust off, throw, push and the intro poses. A full set is about 40 frames, roughly 3 times what this test has.

- **Every look baked in full:** 750 x 18.9 KB is about 14 MB for these 13 frames at 2x, and about 45 MB for the full pose set. That is far over the 3 MB limit and not possible.
- **Layers (skin, hair, outfit rendered apart):** this works, because `--layers` makes them. Each part is cut out where another part sits in front of it, so the three layers add up to the full frame. The skin can be one grey sheet per body, tinted to the 5 tones when the game loads, because the toon shading is a plain multiply. That gives 6 skin, 30 hair and 30 outfit sheets: about 0.7 MB for 13 frames at 2x, about 2 MB for the full pose set, and about 3 MB with 1x added. That is still too much for the first load.
- **Catch with layers:** the cut-outs are baked for the outfit they were rendered with. Swap in an outfit with a different shape (agbada or kaftan robes) and you get gaps or overlaps where the near arm or leg crosses the body. Doing it properly means splitting every part into depth slices (far limbs, body, head, near limbs), the way `drawHero` already paints them. That is several times more sheets and a cut-out rig in the engine.
- **Fit to the 3 MB limit:** one chosen look on its own is small: about 20 to 30 KB for 13 frames, or 60 to 90 KB for the full set. But the builder has to show every option, and a player changing their hero offline needs all of them cached. The code hero draws all 750 looks, every pose, at any size, from `src/art/hero.ts`, which is 77 KB of source (much less once built and gzipped).

## How it looks

- **Enlarged** (`compare_enlarged.png`, `hero_shot_512.png`): the Blender hero has real volume and a three-quarter turn, so it reads as a 3D toy. It is closer to the studio look Tp saw.
- **At in-game size** (`compare_ingame.png`): at 2 px per unit the two heroes read about the same. The code hero's bolder ink line and bigger face read a little better. At 1 px per unit on a cheap phone, the Blender eyes and smile blur into a few pixels, and the dark skin edge is softer against the ink. On our flat drawn street, the rendered hero looks a little out of place.
- I checked for anything a player might feel mocks them: nothing. The face keeps the same small rose smile as the code hero. There are no exaggerated lips or features on the dark skin tone, and that must stay true for any 3D work.

## Effort

- This test took a few hours. The setup is quick and the renders are cheap.
- Doing it for real means modelling 5 hairs (gele and afro are harder), 5 outfits (agbada and kaftan need cloth), 2 bodies and 3 ages, about 40 poses, a blink and facing left. Then the engine needs a sprite pipeline (packing, loading, layered tinting and depth slices), and every later look change means rendering and shipping again. My estimate is 2 to 4 weeks of art and engine work, and the download grows with every new hair or outfit.

## Recommendation

Keep the code-drawn hero. Do not switch the game to Blender sprites. At the size players actually see, the gain is small. The cost is large: either too many megabytes or a complex layer rig, and the hero builder loses its freedom.

Take the good parts of this test into decision 60 part 1 (the richer code redraw) instead:

- two-tone shading with a small highlight on cloth and hair;
- a lit rim on dark skin;
- rounder limbs;
- a slight three-quarter turn of the head and chest.

If Tp still wants a 3D look somewhere, the only place I would consider it is store or marketing art (one image, about 9 KB as WebP). It should not go in the builder, because it would not match the player's own hero.
