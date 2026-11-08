/**
 * Switches for slice 2 pieces whose data is already in the level files but whose rules are
 * not built yet. While a switch is off the game draws nothing for that piece, and any hint
 * tagged with it (a third item in the hint, e.g. [1880, "A crate! ...", "crates"]) never
 * shows, so a first-timer is never told to do something that does not work yet.
 *
 * The piece that builds the rules turns its switch on here (crates: piece J2).
 */
export const FEATURE_NAMES = ['crates'] as const;
export type Feature = (typeof FEATURE_NAMES)[number];

export const FEATURES: Record<Feature, boolean> = {
  /** Hanging crates you knock with your head (S2.4). On in J2. */
  crates: false,
};

/** A hint or a picture that needs this piece can show. No piece named: always. */
export function featureOn(name: Feature | undefined): boolean {
  return name === undefined || FEATURES[name];
}
