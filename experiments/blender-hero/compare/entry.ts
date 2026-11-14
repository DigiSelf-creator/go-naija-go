// Test only: bundles the real code hero and street so compare.mjs can draw them
// next to the Blender frames. Not part of the game build.
import { drawHero } from '../../../src/art/hero';
import { drawSky, drawSkyline, drawShopRow, drawRoad, GROUND_Y } from '../../../src/art/street';

(window as unknown as { G: unknown }).G = { drawHero, drawSky, drawSkyline, drawShopRow, drawRoad, GROUND_Y };
