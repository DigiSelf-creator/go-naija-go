/**
 * MS3b: the mission words (docs/missions.md part 2), exactly as the note writes them: the board,
 * the cards, the run's chip and end card line, and Lagos's five. They load with the board's chunk
 * (missionBoard.ts), as Ogun's part words do with Ogun (partWords.ts), so the first load stays
 * small. Only the city's Missions button is in words.ts (WORDS.missions).
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
  /** In the run: the toast, its spoken line, and the end cards' line (stars won in this go). */
  star: 'Star!',
  starSpoken: (n: number, of: number) => `Star! ${n} of ${of}.`,
  got: (n: number, total: number, of: number) => (total >= of ? (of === 2 ? 'Both stars!' : `All ${of} stars!`) : n === 1 ? 'You got a star!' : `You got ${n} stars!`),
  /** Lagos's five. */
  lagos: {
    coins: { name: 'Coin catch', line: 'Catch coins on Alausa!' },
    lunch: { name: 'Lunch for Mama Put', line: 'Mama Put needs corn, fufu and amala!', thanks: 'Mama Put says thank you!' },
    goats: { name: 'Goat friends', line: 'Throw fufu to the hungry goats!' },
    wells: { name: 'Secret wells', line: 'Find the secret wells!', help: ['Look for a well by the road!', 'Look back, behind the start!'] },
    bulbs: { name: 'Light it up', line: 'Catch Power bulbs!' },
  },
} as const;
