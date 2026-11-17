/**
 * O6b: the Expressway run's look for the lane run (docs/ogun.md 6.6; art O6a's ./expressway.ts).
 * The lane view (src/lane/view.ts) keeps Lagos's rules, camera and sizes and asks this look for
 * the sky, the road, its ready-made things (the tipper, tanker and danfo looks of the `danfo`
 * kind, Ogun's garri and corn, the bus stop under the small arch), the verge scenery and the
 * roadside house fronts.
 */
import type { LaneLook } from '../../lane/view';
import { bake } from '../../art/lane-shade';
import {
  EXPRESSWAY_SCENERY,
  EXPRESSWAY_STOP_BOX,
  bakeExpresswayScenery,
  bakeExpresswaySky,
  bakeExpresswayThings,
  drawExpresswayBusStop,
  drawExpresswayFront,
  drawExpresswayRoad,
  expresswayVehicleAt,
  vehicleKey,
} from './expressway';

export const EXPRESSWAY_LOOK: LaneLook = {
  sky: bakeExpresswaySky,
  road: drawExpresswayRoad,
  things: (ppm) => {
    const out = bakeExpresswayThings(ppm);
    // The goal's bus stop, near and far, so the view finds it with the road things.
    for (const bright of [false, true]) {
      const b = bake(EXPRESSWAY_STOP_BOX, ppm, (g) => drawExpresswayBusStop(g, 0, bright));
      if (b) out.set(bright ? 'busStopBright' : 'busStop', b);
    }
    return out;
  },
  scenery: bakeExpresswayScenery,
  sceneryKeys: EXPRESSWAY_SCENERY,
  danfo: (d, lane, frame) => vehicleKey(expresswayVehicleAt(d, lane), frame),
  front: (g, o) => drawExpresswayFront(g, o),
};
