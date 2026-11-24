/**
 * MS3c: Ogun's five quick missions (docs/missions.md part 1), their words, and the two goal
 * pictures only this part draws (the Ijebu garri parcel and the hopping gravel). Data and words
 * only: types from the first load, never its values (the first load works the coin stars out
 * from Ota's level file and runs every rule).
 */
import type { MissionDef, MissionIcon } from '../../game/missions';
import { drawIjebuParcelIcon } from './abeokuta';
import { drawGravel } from './sagamu';

const m = (id: string, goal: MissionDef['goal'], at: number[], stars: number[], icon: MissionIcon, name: string, line: string, places: string[], more: Partial<MissionDef> = {}): MissionDef => ({
  id: `ogun-${id}`,
  state: 'ogun',
  goal,
  at,
  stars,
  icon,
  name,
  line,
  places,
  ...more,
});

/** Easiest first. Coin catch's stars are left empty: the first load fills them from ogun-1.json. */
export const OGUN_MISSIONS: readonly MissionDef[] = [
  m('coins', 'coins', [1], [], 'coin', 'Coin catch', 'Catch coins on Ota!', ['Ota']),
  m('potholes', 'potholes', [2], [1, 3, 5], 'fufu', 'Fill the potholes', 'Throw fufu into the potholes!', ['Abeokuta']),
  m('garri', 'garri', [2, 3], [1, 2], 'parcel', 'Garri for the mill', 'Bring Ijebu garri to the mill!', ['Abeokuta', 'Sagamu'], { thanks: 'The garri mill says thank you!' }),
  m('gravel', 'gravel', [3], [1, 3, 5], 'gravel', 'Stomp the gravel', 'Jump on the hopping gravel!', ['Sagamu']),
  m('chips', 'chips', [0], [3, 6, 8], 'tech', 'Tech chips', 'Catch Tech chips!', ['Expressway']),
];

/** The parcel and the gravel, centred in a `size` square; false: the first load draws its own. */
export function ogunMissionIcon(g: CanvasRenderingContext2D, icon: MissionIcon, size: number): boolean {
  if (icon === 'parcel') drawIjebuParcelIcon(g, size / 2, size / 2, size * 0.9);
  else if (icon === 'gravel') {
    g.save();
    g.translate(size / 2, size * 0.72);
    g.scale(size / 22, size / 22);
    drawGravel(g, 0, 0);
    g.restore();
  } else return false;
  return true;
}
