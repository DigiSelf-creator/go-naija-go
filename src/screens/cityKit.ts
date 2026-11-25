/**
 * K6b: the first-load pieces handed to a later state's city and road that imports only types
 * (Kano's, KN-R10; src/worlds/ui.ts CityKit). Nothing new is drawn here: every piece is the Lagos
 * city's own, already in the first load.
 */
import type { CityKit } from '../worlds/ui';
import { EDGE_ARROW, MAT, PAY, boardWobble, drawEdgeArrow, drawFlyingMoney, drawPayMat, drawPriceBoard, drawTrayBubble, edgeArrowPlace, flyingCount, payTime, priceBoardBox, trayBubbleBox, trayWords } from '../art/payspot';
import { WALKER, drawCityHero, drawWalkRing, walkDir, walkerSize } from '../art/walker';
import { boomBarSvg, boomIconSvg } from '../art/boomMeter';
import { bucketIconSvg } from '../art/city';
import { formatMoney, spokenMoney } from '../game/money';
import { loadPeople, peopleKit } from '../game/peopleLoad';
import { button, h } from './dom';
import { WORDS } from './words';

export const CITY_KIT: CityKit = {
  words: WORDS,
  pay: { EDGE_ARROW, MAT, PAY, boardWobble, drawEdgeArrow, drawFlyingMoney, drawPayMat, drawPriceBoard, drawTrayBubble, edgeArrowPlace, flyingCount, payTime, priceBoardBox, trayBubbleBox, trayWords },
  walk: { WALKER, drawCityHero, drawWalkRing, walkDir, walkerSize },
  boom: { boomBarSvg, boomIconSvg },
  icon: bucketIconSvg,
  money: (kobo) => formatMoney(kobo),
  spoken: spokenMoney,
  dom: { h, button },
  people: () => peopleKit() ?? (void loadPeople().catch(() => undefined), null),
};
