/**
 * Music icons (24 x 24, currentColor), the same build as the HUD speaker: two joined notes.
 * MUSIC_SVG carries both looks: the path with class "off" (a slash) is shown or hidden by CSS,
 * as the speaker's is. musicIconSvg(on) is a fixed picture of one look.
 */
export const NOTES =
  '<path d="M9 17.5V6.2l11-2.4v11.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M9 6.2l11-2.4v3.2L9 9.4z" fill="currentColor"/>' +
  '<ellipse cx="6.2" cy="17.8" rx="3.2" ry="2.5" transform="rotate(-20 6.2 17.8)" fill="currentColor"/>' +
  '<ellipse cx="17.2" cy="15.5" rx="3.2" ry="2.5" transform="rotate(-20 17.2 15.5)" fill="currentColor"/>';
export const SLASH = '<path class="off" d="M3 3l18 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>';

export const MUSIC_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${NOTES}${SLASH}</svg>`;

export function musicIconSvg(on: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${NOTES}${on ? '' : SLASH}</svg>`;
}
