/**
 * One call per street look (the level's `theme`, docs/design.md S2.6):
 * - morning: Street 1, Your street (street.ts, as slice 1)
 * - market: Street 2, Market road (market.ts)
 * - evening: Street 3, Bus park road (buspark.ts)
 *
 * drawBackdrop draws every screen-space layer behind the road, back to front, in place of
 * drawSky + drawSkyline + drawShopRow + drawPassingBus. drawThemeStall draws a platform
 * (a stall or shed roof whose top is the landing line) in world space, in place of drawStall.
 * An unknown theme draws the morning street.
 */
import { drawEveningSky, drawEveningSkyline, drawParkRow, drawShedRoof } from './buspark';
import { drawMarketFar, drawMarketRow, drawMarketSky, drawMarketStall, drawPassingKeke } from './market';
import { GROUND_Y, drawPassingBus, drawShopRow, drawSky, drawSkyline, drawStall } from './street';

export type StreetTheme = 'morning' | 'market' | 'evening';
export const THEMES: readonly StreetTheme[] = ['morning', 'market', 'evening'];

export function asTheme(theme: string): StreetTheme {
  return (THEMES as readonly string[]).includes(theme) ? (theme as StreetTheme) : 'morning';
}

/** Screen space (no camera translate). viewH is the world height shown (sky fills it). */
export function drawBackdrop(g: CanvasRenderingContext2D, theme: string, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND_Y): void {
  switch (asTheme(theme)) {
    case 'market':
      drawMarketSky(g, camX, viewW, time, viewH);
      drawMarketFar(g, camX, viewW, groundY);
      drawMarketRow(g, camX, viewW, groundY);
      drawPassingKeke(g, camX, viewW, time, groundY);
      return;
    case 'evening':
      drawEveningSky(g, camX, viewW, time, viewH, groundY);
      drawEveningSkyline(g, camX, viewW, groundY);
      drawParkRow(g, camX, viewW, time, groundY);
      drawPassingBus(g, camX, viewW, time, groundY);
      return;
    default:
      drawSky(g, camX, viewW, time, viewH);
      drawSkyline(g, camX, viewW, groundY);
      drawShopRow(g, camX, viewW, groundY);
      drawPassingBus(g, camX, viewW, time, groundY);
  }
}

/** World space. A platform for this street: its top edge is exactly topY. */
export function drawThemeStall(g: CanvasRenderingContext2D, theme: string, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  switch (asTheme(theme)) {
    case 'market':
      drawMarketStall(g, x, topY, w, groundY);
      return;
    case 'evening':
      drawShedRoof(g, x, topY, w, groundY);
      return;
    default:
      drawStall(g, x, topY, w, groundY);
  }
}
