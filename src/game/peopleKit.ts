/**
 * The people's chunk (task S3g1b): the people kit (art's folk.ts), the casts, the bake and the
 * rules for the streets, the well room, the hall and the city. It loads on its own soon after the
 * title shows (peopleLoad.ts), so the first page stays light; a place opened before it arrives
 * simply has no people at first.
 */
export { GamePeople } from './people';
export { CityPeople } from './cityPeople';
/** O6b2 (OG-R43 a): the pieces a later state's city uses for its own walkers (Ogun's, from its part). */
export { CityWalkers, cityWalkerAt, ambientCount, CITY_FOLK } from './cityFolk';
export { CastSheet } from './crowdDraw';
