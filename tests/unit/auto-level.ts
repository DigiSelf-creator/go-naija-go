/**
 * A small slice 1 shape street for engine tests: the hero runs by itself (no `schema`). No slice
 * 1 file ships since piece M2 retired w1-l1, but the auto-run rules stay covered with this.
 */
import { parseLevel, type Level } from '../../src/game/level';

export const AUTO_LEVEL = {
  id: 'auto-test',
  name: 'Test road',
  groundY: 300,
  runSpeed: 156,
  cornSpeed: 228,
  spawnX: 80,
  koboSpacing: 24,
  wakeDistance: 520,
  hazardSpeeds: { goat: 36, tyre: 60 },
  ground: [[-400, 20000]],
  platforms: [[1150, 250, 140]],
  kobo: [[300, 276, 5]],
  foods: [],
  hazards: [],
  hints: [],
  checkpoint: 5600,
};

export function autoLevel(patch: Record<string, unknown> = {}): Level {
  return parseLevel({ ...structuredClone(AUTO_LEVEL), ...patch });
}
