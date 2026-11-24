/**
 * MS3b: the Missions board's and the mission cards' words (docs/missions.md part 2), exactly as
 * the note writes them. They load with the board's chunk (missionBoard.ts), as Ogun's part words
 * do with Ogun (partWords.ts), so the first load stays small. The run's words (the button,
 * "Star!", the end cards' line) and Lagos's five are in words.ts (WORDS.missions).
 */
export const BOARD_WORDS = {
  heading: 'Missions',
  sub: 'Get stars! Tap a mission.',
  helper: 'Star helper',
  total: (n: number, of: number) => `Stars: ${n} of ${of}`,
  locked: (place: string) => `Open ${place} first`,
  tile: (name: string, place: string, n: number, of: number) => `${name}. ${place}. ${n} of ${of} stars.`,
  tileLocked: (name: string, place: string) => `${name}. Locked. Open ${place} first.`,
  best: (n: number) => `Best: ${n}`,
  play: 'Play',
  back: 'Back',
  ok: 'OK',
  /** "Every Lagos star!" / "You are a Lagos star helper." */
  every: (state: string) => `Every ${state} star!`,
  everyLine: (state: string) => `You are ${/^[AEIOU]/.test(state) ? 'an' : 'a'} ${state} star helper.`,
} as const;
