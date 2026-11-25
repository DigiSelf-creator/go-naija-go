/**
 * K-size: the run as the game plays a Kano street. Kano's wind, gate and dust whirls live in the
 * Kano part (src/worlds/kano/rules.ts) and the game hands them to each play (RunOptions.rules),
 * Borehole Hall included (its whirls drift and puff by them), so Kano tests make their run here
 * (the rules do nothing where there is no wind, gate or whirl).
 */
import { Run as PlainRun, type RunOptions } from '../../src/game/run';
import type { Level } from '../../src/game/level';
import { kanoRules } from '../../src/worlds/kano/rules';

export { KANO_RUN, windAt, windFactor } from '../../src/worlds/kano/rules';

export class Run extends PlainRun {
  constructor(level: Level, opts: RunOptions = {}) {
    super(level, { rules: kanoRules, ...opts });
  }
}
