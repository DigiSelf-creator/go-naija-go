/**
 * O0a1: Ogun level files hold fields and foods the game does not read yet (ogun.md 3.8: `mud`,
 * `arch`, `rocks`, `cracks`, `waterPits`, the "ikokore" and "ofada" foods). gamedev adds them in
 * O2b and O3b. Until then the S2.6 rule tests read a copy with the Ogun-only foods left out;
 * ogun-levels.test.ts checks those foods (and the mud and cracks) against the same rules straight
 * from the file.
 *
 * O0a2: rocks are one-way platforms drawn as rock (ogun.md 3.3: "no new code"), so the copy adds
 * each rock [x, width, height] as a platform [x, groundY - height, width]. That way the S2.6 roof
 * and crate rules cover the rocks too.
 */
export const OGUN_FOODS: readonly string[] = ['ikokore', 'ofada'];

export function playableOgun<T extends { foods: unknown[][] }>(raw: T): T {
  const copy = structuredClone(raw) as T & { platforms?: number[][]; rocks?: number[][]; groundY?: number };
  copy.foods = copy.foods.filter((f) => !OGUN_FOODS.includes(String(f[2])));
  if (copy.rocks) {
    const gy = copy.groundY ?? 300;
    copy.platforms = [...(copy.platforms ?? []), ...copy.rocks.map(([x, w, h]) => [x!, gy - h!, w!])];
  }
  return copy;
}
