/**
 * Debug only: the art galleries behind ?gallery=… (art checks on the test link). This file and
 * every gallery it opens are built into dist/assets/debug/, which the service worker never puts in the
 * first-visit cache (qa O2: no player downloads them). main.ts loads this file only when the link
 * asks for a gallery.
 *
 *   ?gallery            every picture at once (?gallery=2 for page 2)
 *   ?gallery=lane, lane2 … lane4       the lane run (S3f1)
 *   ?gallery=folk, folk2 … folk5       the people kit (S3g1a)
 *   ?gallery=ogun-city, ogun-city2, ogun-city3   Ogun's city, road and Expressway (O6a)
 *   ?gallery=ogun, ogun2, ogun3        Ogun's gateway pieces (O1a)
 *   ?gallery=kano, kano2 … kano6       Kano's wall, gate, "To Kano" stop, the ride north (K1a); Kurmi (K2a); Kofar Mata (K3a)
 *   ?gallery=ota | abeokuta | sagamu   each Ogun street's pieces (O2a, O3a, O4a)
 *   ?gallery=hall-ogun                 Pothole Hall and King Pothole (O5a)
 *   ?gallery=road, road2 … road8       the challenge road (S3e1a)
 *   ?gallery=style-buttons             the button icons on their discs and the button recipe (ST-A1)
 *   ?gallery=style-people, style-people2, style-people3   characters before and after the crisp recipe (ST-H2)
 *
 * &t=1.5 holds the time; &still=1 shows the reduced-motion look where a gallery has one.
 */
import type { View } from '../engine/view';

/** Draws one frame: time in seconds, the page (0 = first) and the still (reduced-motion) look. */
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number, page: number, still: boolean) => void;

/** Which gallery a ?gallery= value opens, and its page. The first match wins (ogun-city before ogun). */
const GALLERIES: readonly { match: (v: string) => number | null; load: () => Promise<Draw> }[] = [
  { match: pages('lane'), load: () => import('./galleryLane').then((m) => (g, w, h, t, p) => m.drawLaneGallery(g, w, h, t, p)) },
  { match: pages('folk'), load: () => import('./galleryFolk').then((m) => (g, w, h, t, p) => m.drawFolkGallery(g, w, h, t, p)) },
  { match: pages('ogun-city'), load: () => import('./galleryOgunCity').then((m) => (g, w, h, t, p, s) => m.drawOgunCityGallery(g, w, h, t, p, s)) },
  { match: pages('ogun'), load: () => import('./galleryOgun').then((m) => (g, w, h, t, p) => m.drawOgunGallery(g, w, h, t, p)) },
  { match: pages('kano'), load: () => import('./galleryKano').then((m) => (g, w, h, t, p) => m.drawKanoGallery(g, w, h, t, p)) },
  { match: only('ota'), load: () => import('./galleryOta').then((m) => (g, w, h, t, _p, s) => m.drawOtaGallery(g, w, h, t, s)) },
  { match: only('abeokuta'), load: () => import('./galleryAbeokuta').then((m) => (g, w, h, t, _p, s) => m.drawAbeokutaGallery(g, w, h, t, s)) },
  { match: only('sagamu'), load: () => import('./gallerySagamu').then((m) => (g, w, h, t, _p, s) => m.drawSagamuGallery(g, w, h, t, s)) },
  { match: only('hall-ogun'), load: () => import('./galleryHallOgun').then((m) => (g, w, h, t, _p, s) => m.drawHallOgunGallery(g, w, h, t, s)) },
  { match: pages('road'), load: () => import('./galleryRoad').then((m) => (g, w, h, t, p) => m.drawRoadGallery(g, w, h, t, p)) },
  { match: pages('style-people'), load: () => import('./galleryStylePeople').then((m) => (g, _w, _h, _t, p) => m.drawStylePeopleGallery(g, p)) },
  { match: only('style-buttons'), load: () => import('./galleryStyleButtons').then((m) => (g, w, h) => m.drawStyleButtonsGallery(g, w, h)) },
  { match: (v) => Number(v) || 0, load: () => import('./gallery').then((m) => (g, w, h, t, p) => m.drawGallery(g, w, h, t, p)) },
];

/** "lane", "lane2" … : page 0, 1 … */
function pages(name: string): (v: string) => number | null {
  return (v) => (v.startsWith(name) ? Math.max(0, (Number(v.slice(name.length)) || 1) - 1) : null);
}

function only(name: string): (v: string) => number | null {
  return (v) => (v === name ? 0 : null);
}

/** Opens the gallery the link asks for and draws it every frame. `view` is read each frame (it changes on resize). */
export async function openGallery(query: URLSearchParams, g: CanvasRenderingContext2D, view: () => View): Promise<void> {
  const v = query.get('gallery') ?? '';
  let page = 0;
  const pick = GALLERIES.find((x) => (page = x.match(v) ?? -1) >= 0)!;
  const draw = await pick.load();
  const t0 = performance.now();
  const hold = query.has('t') ? Number(query.get('t')) : NaN;
  const still = query.get('still') === '1';
  const frame = (now: number): void => {
    const vw = view();
    g.setTransform(vw.scale, 0, 0, vw.scale, 0, 0);
    draw(g, vw.width, vw.height, Number.isFinite(hold) ? hold : (now - t0) / 1000, page, still);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
