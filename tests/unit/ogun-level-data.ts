/**
 * O0a1: Ogun level files hold fields and foods the game does not read yet (ogun.md 3.8: `mud`,
 * `arch`, the "ikokore" and "ofada" foods). gamedev adds them in O2b and O3b. Until then the
 * S2.6 rule tests read a copy with the Ogun-only foods left out; ogun-levels.test.ts checks
 * those foods (and the mud) against the same rules straight from the file.
 */
export const OGUN_FOODS: readonly string[] = ['ikokore', 'ofada'];

export function playableOgun<T extends { foods: unknown[][] }>(raw: T): T {
  const copy = structuredClone(raw);
  copy.foods = copy.foods.filter((f) => !OGUN_FOODS.includes(String(f[2])));
  return copy;
}
