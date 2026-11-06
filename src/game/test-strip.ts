/**
 * A short practice strip so people can feel the jump on a phone (task A5).
 * Temporary: piece C replaces it with levels loaded from src/data/levels/.
 * Gaps: 60 u (tap), 100 u (hold), 160 u (second jump). Roofs: 50 u (tap), 110 u (hold), 170 u (second jump).
 */
import { FALL_Y, GROUND_Y, type Terrain } from '../engine/physics';

export const STRIP_START_X = 80;
/** When the hero passes this x, the strip starts again. */
export const STRIP_END_X = 3000;

export const TEST_STRIP: Terrain = {
  groundY: GROUND_Y,
  fallY: FALL_Y,
  ground: [
    { x0: -400, x1: 700 },
    { x0: 760, x1: 1300 },
    { x0: 1400, x1: 2200 },
    { x0: 2360, x1: 3400 },
  ],
  platforms: [
    { x: 450, y: 250, w: 110 },
    { x: 900, y: 190, w: 120 },
    { x: 1080, y: 130, w: 100 },
    { x: 1650, y: 240, w: 130 },
    { x: 1880, y: 190, w: 110 },
    { x: 2550, y: 230, w: 140 },
  ],
};
