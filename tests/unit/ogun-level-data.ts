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
 *
 * O2b: the game reads ikokore now (and `mud` and `arch`), so the copy keeps it and the S2.6 food
 * rules cover it as every food.
 *
 * O3b: the game reads `rocks` (as one-way platforms, so parseLevel adds them to the roofs itself),
 * `cracks`, `waterPits` and ofada now, so the copy no longer leaves ofada out or adds the rocks.
 *
 * O0a3: the "gravel" hazard was not a kind the game read yet either (O4b), so the copy turned each
 * gravel into a tyre. O4b: the game reads gravel now, so the copy keeps it; the S2.6 tests hold
 * every hazard but goats to the tyre's placing rules (200 u from a pit, never in a corn fast
 * stretch), so they cover gravel as it is.
 */
export const OGUN_FOODS: readonly string[] = ['ikokore', 'ofada'];

export function playableOgun<T extends { foods: unknown[][] }>(raw: T): T {
  return structuredClone(raw);
}
