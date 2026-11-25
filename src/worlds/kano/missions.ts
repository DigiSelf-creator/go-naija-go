/**
 * Kano's five quick missions KM1 to KM5 (docs/kano.md 6.2, decision 89; the shape, board, stars
 * and saves of docs/missions.md), their words, their own counts and the three goal pictures only
 * this part draws (the wind sign, the springy cloth and the dust whirl). Like every file in this
 * folder it imports only types from outside it (KN-R10): the first load works the coin stars out
 * from Kurmi's level file and runs the save, the stars and the ₦2.
 */
import type { MissionDef, MissionIcon } from '../../game/missions';
import type { GameEvent } from '../../game/game';
import type { Level } from '../../game/level';
import { drawWindSign } from './wind';
import { drawClothFrame } from './cloth';
import { drawWhirlIcon } from './whirl';

/** KM2: a kobo counts as an arc's when it is this near its pit (either side) and above this y. */
const ARC = { slack: 12, aboveY: 250 } as const;

/** The pits (road gaps) that lie wholly inside a wind behind you, [left lip, right lip]. */
const tailPits = new WeakMap<Level, (readonly [number, number])[]>();
export function tailwindPits(level: Level): readonly (readonly [number, number])[] {
  let out = tailPits.get(level);
  if (!out) {
    const g = level.ground;
    out = g.slice(1).map((s, i): readonly [number, number] => [g[i]![1], s[0]]).filter(([a, b]) => level.wind.some((w) => w.dir === 'back' && a > w.x && b < w.x + w.w));
    tailPits.set(level, out);
  }
  return out;
}

/** KM2: a kobo picked up from the arc over a pit inside a tailwind: that pit's key (one each). */
export function arcOf(e: GameEvent, level: Level): string | false {
  if (e.type !== 'kobo' || e.y >= ARC.aboveY) return false;
  const p = tailwindPits(level).find(([a, b]) => e.x >= a - ARC.slack && e.x <= b + ARC.slack);
  return p ? `arc${p[0]}` : false;
}

/** KM3: a bounce off the springy cloth. */
export const isBounce = (e: GameEvent): boolean => e.type === 'spring';

/** KM4: a dust whirl puffed by landing on it, or with fura da nono or amala (never a pit's lip or a fufu ball). */
export const isPuff = (e: GameEvent): boolean => e.type === 'whirlPuff' && (e.why === 'stomp' || e.why === 'fura' || e.why === 'amala');

const m = (id: string, goal: MissionDef['goal'], at: number[], stars: number[], icon: MissionIcon, name: string, line: string, places: string[], more: Partial<MissionDef> = {}): MissionDef => ({
  id: `kano-${id}`,
  state: 'kano',
  goal,
  at,
  stars,
  icon,
  name,
  line,
  places,
  ...more,
});

/** Easiest first. Coin catch's stars are left empty: the first load fills them from kano-1.json (60, 100, 135). */
export const KANO_MISSIONS: readonly MissionDef[] = [
  m('coins', 'coins', [1], [], 'coin', 'Coin catch', 'Catch coins on Kurmi!', ['Kurmi']),
  m('wind', 'arcs', [1], [1, 2], 'wind', 'Ride the wind', 'Jump far with the wind!', ['Kurmi'], { tally: arcOf }),
  m('bounce', 'bounces', [2], [3, 5, 8], 'cloth', 'Bounce high', 'Bounce on the springy cloth!', ['Kofar Mata'], { tally: isBounce }),
  m('dust', 'whirls', [3], [1, 3, 5], 'whirl', 'Puff the dust', 'Puff the dust whirls!', ['Dawanau'], { tally: isPuff }),
  m('power', 'bulbs', [0], [4, 8, 12], 'power', 'Power for the market', 'Catch Power bulbs!', ['Harmattan Road']),
];

/** The wind sign, the cloth and the whirl, centred in a `size` square; false: the first load draws its own. */
export function kanoMissionIcon(g: CanvasRenderingContext2D, icon: MissionIcon, size: number): boolean {
  if (icon === 'whirl') drawWhirlIcon(g, size / 2, size / 2, size * 0.9);
  else if (icon === 'wind' || icon === 'cloth') {
    g.save();
    if (icon === 'wind') {
      g.translate(size * 0.42, size);
      g.scale(size / 84, size / 84);
      drawWindSign(g, 0, 0, 'back', 0, true);
    } else {
      g.translate(size / 2, size * 0.78);
      g.scale(size / 96, size / 96);
      drawClothFrame(g, -50, 100, 0, { look: 0 });
    }
    g.restore();
  } else return false;
  return true;
}
