/**
 * K0a: Kano level files hold fields, foods and a hazard the game does not read yet (kano.md 3.8:
 * `gate`, `wind`, `springs`, `sacks`, the "whirl" hazard, the "kilishi" and "fura" foods).
 * gamedev adds them in K2b to K4b. Until then the S2.6 rule tests (street.test.ts) read a copy:
 * - kilishi and fura are left out (kano-levels.test.ts checks them by the same food rules);
 * - each whirl is read as a tyre, since its placing rules are the tyre's (kano.md 3.3);
 * - each sack stack [x, width, height] is read as a rock (ogun.md 3.3 rock rules: "no new code"),
 *   which parseLevel turns into a one-way platform, so the S2.6 roof and crate rules cover it.
 * When the game reads a field, take it out of this copy, as ogun-level-data.ts did.
 */
export const KANO_FOODS: readonly string[] = ['kilishi', 'fura'];

type RawStreet = { foods: unknown[][]; hazards: unknown[][]; sacks?: number[][] };

export function playableKano<T extends RawStreet>(raw: T): T {
  const copy = structuredClone(raw) as T & { rocks?: number[][] };
  copy.foods = copy.foods.filter((f) => !KANO_FOODS.includes(String(f[2])));
  copy.hazards = copy.hazards.map(([kind, x]) => [kind === 'whirl' ? 'tyre' : kind, x]);
  if (copy.sacks) {
    copy.rocks = copy.sacks;
    delete copy.sacks;
  }
  return copy;
}
