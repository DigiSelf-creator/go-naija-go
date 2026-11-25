/**
 * K0a: Kano level files hold fields, foods and a hazard the game does not read yet (kano.md 3.8:
 * `sacks`, the "whirl" hazard, the "fura" food). gamedev adds them in K4b (K2b added `wind`,
 * `gate` and kilishi, K3b `springs`, so the copy keeps those). Until then the S2.6 rule tests
 * (street.test.ts) read a copy:
 * - fura is left out (kano-levels.test.ts checks it by the same food rules);
 * - each whirl is read as a tyre, since its placing rules are the tyre's (kano.md 3.3);
 * - each sack stack [x, width, height] is read as a rock (ogun.md 3.3 rock rules: "no new code"),
 *   which parseLevel turns into a one-way platform, so the S2.6 roof and crate rules cover it.
 * When the game reads a field, take it out of this copy, as ogun-level-data.ts did.
 */
/** Kano's own foods (kano.md 4.1), for kano-levels.test.ts. */
export const KANO_FOODS: readonly string[] = ['kilishi', 'fura'];
/** The Kano foods the game does not read yet (K4b: fura). */
const UNREAD_FOODS: readonly string[] = ['fura'];

type RawStreet = { foods: unknown[][]; hazards: unknown[][]; sacks?: number[][] };

export function playableKano<T extends RawStreet>(raw: T): T {
  const copy = structuredClone(raw) as T & { rocks?: number[][] };
  copy.foods = copy.foods.filter((f) => !UNREAD_FOODS.includes(String(f[2])));
  copy.hazards = copy.hazards.map(([kind, x]) => [kind === 'whirl' ? 'tyre' : kind, x]);
  if (copy.sacks) {
    copy.rocks = copy.sacks;
    delete copy.sacks;
  }
  return copy;
}
