/**
 * Naira and kobo (docs/city.md, N1 to N4, confirmed by Tp 9 Nov 2026).
 *
 * - A coin picked up in a run is worth 10 kobo (N1). 100 kobo make ₦1.
 * - Money is always kept as whole kobo; ₦ is only how it is shown, so nothing is rounded away.
 * - Shown as "80 kobo" under ₦1, then "₦3.40", "₦12", "₦1,250" (N2). Zero is "₦0" (city counter).
 * - Screen readers hear "3 naira 40 kobo", never "naira sign 3 point 4 0".
 * - Where the phone's font has no ₦ (U+20A6), "N" stands in: "N3.40" (N4).
 */

/** N1: one coin is 10 kobo. */
export const KOBO_PER_COIN = 10;
export const KOBO_PER_NAIRA = 100;
export const NAIRA_SIGN = '₦';

/** Whole kobo, never negative (anything odd counts as 0). */
export function cleanKobo(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "₦0", "80 kobo", "₦1", "₦3.40", "₦124.50", "₦1,250" (sign: "N" where ₦ cannot show). */
export function formatMoney(kobo: number, sign: string = nairaSign()): string {
  const k = cleanKobo(kobo);
  if (k === 0) return `${sign}0`;
  if (k < KOBO_PER_NAIRA) return `${k} kobo`;
  const naira = Math.floor(k / KOBO_PER_NAIRA);
  const rest = k % KOBO_PER_NAIRA;
  return `${sign}${withCommas(naira)}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

/** What screen readers hear: "0 naira", "80 kobo", "1 naira", "3 naira 40 kobo". */
export function spokenMoney(kobo: number): string {
  const k = cleanKobo(kobo);
  const naira = Math.floor(k / KOBO_PER_NAIRA);
  const rest = k % KOBO_PER_NAIRA;
  if (naira === 0 && rest > 0) return `${rest} kobo`;
  return rest ? `${naira} naira ${rest} kobo` : `${naira} naira`;
}

let sign: string | null = null;

/**
 * N4: "₦" when the phone's font draws it, else "N". Worked out once: the ₦ is measured against
 * a character no font has (it shows the empty box); the same width means the box would show.
 */
export function nairaSign(): string {
  if (sign !== null) return sign;
  sign = NAIRA_SIGN;
  try {
    if (typeof document === 'undefined') return sign;
    const g = document.createElement('canvas').getContext('2d');
    if (!g || typeof g.measureText !== 'function') return sign;
    g.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
    const box = g.measureText('\u{10FFFD}').width;
    const naira = g.measureText(NAIRA_SIGN).width;
    if (box > 0 && Math.abs(naira - box) < 0.01) sign = 'N';
  } catch {
    /* keep ₦ */
  }
  return sign;
}

/** For tests: set the sign (or null to work it out again). */
export function setNairaSign(s: string | null): void {
  sign = s;
}
