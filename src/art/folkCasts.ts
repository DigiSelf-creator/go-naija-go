/**
 * Who is where (S3g1a; design.md "People everywhere" parts 4, 5, 7, 9): suggested casts for each
 * place, written as short look codes (folkLook), the store keeper, the queue and market spots,
 * and the check that skips the player's own hero look. Data for gamedev's casts (S3g1b).
 */
import { FOLK_DRESSES, FOLK_HOLDS, type FolkAge, type FolkBody, type FolkHair, type FolkHeadwear, type FolkLook } from './folk';


/** Plain made-up cloth colours, A to T in a look code (no party sets, no team colours). */
export const FOLK_CLOTH: readonly string[] = '#e0572b #2b59c3 #f2b300 #1aa39a #7d3c98 #efe6d2 #d6336c #3f8f4a #5aa9e6 #8e2a3a #d8b384 #3b5a8a #2a2a33 #f6f4ee #6b4a2b #f08a24 #a98bd6 #8fd1b5 #2f6fd6 #f4ead2'.split(' ');

const AGES: readonly FolkAge[] = ['child', 'teen', 'adult', 'elder'];
const BODIES: readonly FolkBody[] = ['slim', 'medium', 'round'];
export const FOLK_HAIRS: readonly FolkHair[] = ['lowcut', 'afro', 'braids', 'cornrows', 'grey', 'puffs', 'bun'];
export const FOLK_HEADWEAR: readonly FolkHeadwear[] = ['none', 'gele', 'headscarf', 'hijab', 'fila', 'kaftanCap', 'rigaCap', 'helmet'];

/** Held-thing letters in FOLK_HOLDS order; j (the broom, decision 75) is retired so old codes keep their meaning. */
const HOLD_LETTERS = 'abcdefghiklmnopq';

/**
 * Reads a look written as a short code, one letter a field:
 * skin (0 to 6), age (c t a e), sex (m f), body (s m r), hair (l a c b g p u: low cut, afro,
 * braids, cornrows, grey, puffs, bun), headwear (- G S H F K R M: none, gele, headscarf, hijab,
 * fila, kaftan cap, riga cap, helmet), dress (a to n: FOLK_DRESSES then sport), cloth a, cloth b,
 * headwear colour (A to T in FOLK_CLOTH, or .), held thing (a to q in FOLK_HOLDS, or .; j is
 * retired, it was the broom: decision 75), then
 * any of g (glasses), y (baby), d (beard), w (wheelchair), s (stool).
 */
export function folkLook(code: string): FolkLook {
  const ch = (i: number): string => code[i] ?? '.';
  const cloth = (i: number): string => FOLK_CLOTH[code.charCodeAt(i) - 65] ?? FOLK_CLOTH[0]!;
  const l: FolkLook = {
    skin: Number(ch(0)) || 0,
    age: AGES['ctae'.indexOf(ch(1))] ?? 'adult',
    sex: ch(2) === 'f' ? 'f' : 'm',
    body: BODIES['smr'.indexOf(ch(3))] ?? 'medium',
    hair: FOLK_HAIRS['lacbgpu'.indexOf(ch(4))] ?? 'lowcut',
    head: FOLK_HEADWEAR['-GSHFKRM'.indexOf(ch(5))] ?? 'none',
    dress: [...FOLK_DRESSES, 'sport' as const][code.charCodeAt(6) - 97] ?? 'jeansTee',
    a: cloth(7),
    b: cloth(8),
  };
  if (ch(9) !== '.') l.h = cloth(9);
  const hold = FOLK_HOLDS[HOLD_LETTERS.indexOf(ch(10))];
  if (hold) l.hold = hold;
  const f = code.slice(11);
  if (f.includes('g')) l.glasses = true;
  if (f.includes('y')) l.baby = true;
  if (f.includes('d')) l.beard = true;
  if (f.includes('w')) l.chair = true;
  if (f.includes('s')) l.stool = true;
  return l;
}
const cast = (codes: string): FolkLook[] => codes.split(' ').map(folkLook);

/** The well room's store keeper (PE-R4): an elder woman in a wrapper and headscarf on a low stool. Frames: sit, wave0/1, clap0/1. */
export const STORE_KEEPER: FolkLook = folkLook('4efrgSgICE.s');
/** Where she sits in the room (room units): at the back, between the baskets and pots, away from the rope. */
export const STORE_KEEPER_SPOT = { x: 80, y: 292 } as const;

/**
 * Suggested casts (part 4): 16 looks per street, every skin tone at least twice, every age,
 * a wheelchair user, someone in glasses, dress from every part of Nigeria. gamedev picks from
 * these with the street's seed and skips the player's own look (isHeroLook).
 */
export const STREET_CASTS: Record<'alausa' | 'village' | 'ikeja', readonly FolkLook[]> = {
  // Walkers to work (one with a basin, not a broom: a held broom can read as a party sign; Tp), a shop keeper, the reader, a mother with a baby, an elder, the bread seller, children with a ball
  alausa: cast('2afmcGaABAa 4amsl-lIM.kg 0tfsp-mNJ.b 3afrcSgCHDe 6emsgKdFON.d 5afmuSgGCE.y 1afrcSaPDDn 4afmlSgQAAd 2cmsl-mNB.o 5cfsp-kRB.. 0efmgGaECE.g 1ammlFbDFD.w 6tmsb-kCB.i 3amrl-iNJ.. 5amsa-jFB.c 6afsa-kAB.l'),
  // Buyers with phones, a porter with a basin, traders with a phone case and cloth, the pepper seller, a student
  village: cast('3amsl-kBC.i 1afrcSgCGGe 5afmuHfHFQl 0tmsl-lRM.cg 2amml-kAB.p 6afrcGaDCEq 4afmbSgPHHh 3amrl-hJM.. 1afsa-kEB.. 0emmgReINF.d 5cfsp-mNH.b 2amma-lNM..w 6tfsc-jCA.i 4efrgSgIEC. 5amsb-bKO.f 2cmsl-kCB..'),
  // Travellers with bags and boxes, babban riga and agbada, a buka cook's customer, children holding hands
  ikeja: cast('4ammlReFHN. 2afrcSgJCCh 0amsl-lIM.c 6afmuGaHGGa 3emrgFcBCB.d 5efmgSaQDD. 1amma-kPB.f 4afsbHfEFIn 2tmsl-jFB.i 6cfsp-mNB.. 0afrcSgDPP.w 5amslKdNBH.g 3cmsl-kAB.. 1afma-kCB.l 6amrl-iFB.. 4tfsc-mNE.b'),
};
/** The hall (part 5): 3 door people (first three: a woman with a basket, a teen, an elder in agbada), then 4 more for the walk-in. */
export const HALL_CROWD: readonly FolkLook[] = cast('3afmcSgDCCh 0tmsl-kAB.c 6emmgFcECE.d 1afruGaCBB. 5amsb-lRM.. 4afmaHfBFG. 2cfsp-mNJ..');
/** The bus park crowd (part 5): an elder (sit him), a child, one with a box on the head, two more. */
export const BUS_PARK_CROWD: readonly FolkLook[] = cast('4emsgKdFBN.d 1cmsl-mNB.b 6amml-kCB.f 2afmcGaGDGa 5afsuHfJFKl');
/** Lane run pavements (part 7): with the scenery, walking with and against the run. */
export const LANE_CAST: readonly FolkLook[] = cast('3afrcSgCHHh 0amsl-kBC.i 6afmuGaABAa 5tmsb-lRM.c 2emmgReNHF.d 4afsaHfEFDl 1cfsp-mNJ.b 3amml-hJM.. 5afmcSgPBBp 6amrl-iFB.. 0afrcSjCAA.w 2tfsc-kGB..');
/** The friendly joggers and the two children who run alongside for a while (part 7). Use backRun0..3. */
export const LANE_JOGGER: FolkLook = folkLook('4amsl-nBN..');
export const LANE_JOGGER_2: FolkLook = folkLook('1afmc-nHM..');
export const LANE_CHILDREN: readonly [FolkLook, FolkLook] = [folkLook('2cfsp-mNJ.b'), folkLook('6cmsl-mNJ.b')];
/** The okada rider (plain helmet) and passenger, and the keke's three (part 4). */
export const OKADA_RIDERS: readonly [FolkLook, FolkLook] = [folkLook('3ammlMkHBS.'), folkLook('1afmcSgCEG.')];
export const KEKE_RIDERS: readonly [FolkLook, FolkLook, FolkLook] = [folkLook('6amsl-lIM..'), folkLook('0afmcGaDCD.'), folkLook('5emmgKdFBN.d')];
/** The city (part 9): ambient walkers, drawn from the kit at CITY_FOLK_SCALE (no wheelchairs or balls at city size). */
export const CITY_CAST: readonly FolkLook[] = [...STREET_CASTS.alausa.slice(0, 6), ...STREET_CASTS.village.slice(0, 5), ...STREET_CASTS.ikeja.slice(0, 5)];
/** The Mama Put's cook (waves when the hero collects the tray) and the queue, each leaving with a plate or a pack. */
export const MAMA_PUT_COOK: FolkLook = folkLook('3afrcSgNAB.');
export const MAMA_PUT_QUEUE: readonly FolkLook[] = cast('1amml-lIM.n 6afrcSgCHHm 2tmsb-kAB.n 4emmgKdNHFmd 5afmuHfDFEn');
/** Queue spot i, relative to drawMamaPut's (x, y), the same places as today's queue (places.ts). */
export function mamaPutQueueSpot(i: number): { x: number; y: number } {
  return { x: 40 + i * 11, y: 4 - (i % 2) * 2 };
}
/** The Market's 5 shoppers (part 9): a basket on her head, two looking at goods, a trader showing cloth, one with a bag. */
export const MARKET_SHOPPERS: readonly FolkLook[] = cast('4afmcSgABCg 0amsl-kHB.. 5afraHfQFG. 2afmuGaCDDq 6emmgReINFld');
/** Market shopper spots relative to drawMarketPlace's (x, y): in front of the tables. Move between neighbouring spots every few seconds. */
export const MARKET_SHOPPER_SPOTS: readonly { x: number; y: number }[] = [-56, -34, -8, 14, 36, 58].map((x, i) => ({ x, y: 6 + (i % 2) * 2 }));

/**
 * True when a person would wear the player's own hero look (the same skin, hair and outfit
 * together, part 3), so a cast can skip it. The hero's hair and outfit indices are those of
 * hero.ts (HAIRS: lowcut, afro, braids, gele, headscarf; OUTFITS: jersey, ankara, school,
 * agbada, kaftan).
 */
export function isHeroLook(look: FolkLook, hero: { skin: number; hair: number; outfit: number }): boolean {
  if (look.skin !== hero.skin) return false;
  const hairs: ((l: FolkLook) => boolean)[] = [
    (l) => l.hair === 'lowcut' && (l.head ?? 'none') === 'none',
    (l) => l.hair === 'afro' && (l.head ?? 'none') === 'none',
    (l) => l.hair === 'braids' && (l.head ?? 'none') === 'none',
    (l) => l.head === 'gele',
    (l) => l.head === 'headscarf',
  ];
  const outfits: ((l: FolkLook) => boolean)[] = [
    (l) => l.dress === 'sport' || l.dress === 'jeansTee',
    (l) => l.dress === 'iroBuba' || l.dress === 'wrapperBlouse',
    (l) => l.dress === 'school',
    (l) => l.dress === 'agbada',
    (l) => l.dress === 'kaftan',
  ];
  return (hairs[hero.hair]?.(look) ?? false) && (outfits[hero.outfit]?.(look) ?? false);
}

/* ---------------- windows for the heads (drawWindowHeads) ---------------- */

/** drawBusShape's four side windows (bus units, origin at the bus's wheel line, as drawn there). */
export const BUS_SHAPE_WINDOWS: readonly { x: number; y: number; w: number; h: number }[] = [0, 1, 2, 3].map((i) => ({ x: -40 + i * 18, y: -38, w: 13, h: 10 }));

/**
 * The big bus at the bus park and the start of the lane (roadside.ts drawEndBus): its side
 * windows, in world units, for drawWindowHeads (endX and dx as given to drawEndBus).
 */
export function endBusWindows(endX: number, dx = 0, groundY = 300): { x: number; y: number; w: number; h: number }[] {
  const x0 = endX - 40 + dx;
  const x1 = endX + 160 + dx;
  const door = endX + dx;
  const top = groundY - 74;
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let wx = x0 + 8; wx + 22 < door - 13 - 2; wx += 26) out.push({ x: wx, y: top + 8, w: 22, h: 20 });
  for (let wx = door + 13 + 6; wx + 22 < x1 - 38; wx += 26) out.push({ x: wx, y: top + 8, w: 22, h: 20 });
  return out;
}

/* ---------------- sizes and places ---------------- */

/** Street: feet sit 8 u above the hero's feet (part 3), at 0.85 of the hero's size (the kit's own size). */
export const FOLK_FEET_ABOVE_GROUND = 8;
/** City size: an adult about 15 u tall, like the city's other people (places.ts). */
export const CITY_FOLK_SCALE = 0.41;
/** The okada's size in its own units (drawOkada: side on, facing right, wheels on y = 0). */
export const OKADA_BOX = { l: -26, r: 26, t: -44, b: 2 } as const;
/** Height in u, feet to top of head (part 3): adults 37, elders 36, teens 33, children 26. */
export function folkHeight(look: FolkLook): number {
  return { child: 26, teen: 33, adult: 37, elder: 36 }[look.age];
}
