/**
 * K0a: Kano level files held fields, foods and a hazard the game did not read yet (kano.md 3.8),
 * so the S2.6 rule tests (street.test.ts) read a copy without them. gamedev added them in turn:
 * K2b `wind`, `gate` and kilishi; K3b `springs`; K4b `sacks` (rocks under another look, so
 * parseLevel adds them to the roofs itself), the "whirl" hazard and fura da nono. The game reads
 * every Kano field now, so the copy is the file as it is, as ogun-level-data.ts became: the S2.6
 * tests hold every hazard but goats to the tyre's placing rules (200 u from a pit, never in a corn
 * fast stretch), so they cover whirls as they are, and the S2.6 food rules cover fura.
 */
/** Kano's own foods (kano.md 4.1), for kano-levels.test.ts. */
export const KANO_FOODS: readonly string[] = ['kilishi', 'fura'];

export function playableKano<T>(raw: T): T {
  return structuredClone(raw);
}
