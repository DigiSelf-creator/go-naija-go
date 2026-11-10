/**
 * Nigeria's wheel (docs/design.md S2.8, S2.12 picture 14). Our own drawing: a big round wheel
 * with a hub in the middle and 37 small cogs on its rim, one for each of the 36 states and one
 * for the FCT, in A to Z order clockwise from the top. Each cog's name sits beside it, pointing
 * out from the middle like the spokes of a wheel.
 *
 * Grey cog: still, grey, its name in plain grey letters.
 * Working cog: warm amber, a little bigger, a white tick on it, its name in bold dark letters,
 * and it turns slowly. Never colour alone: size, the tick, the bold name and the turning.
 * Reduced motion: no turning (the tick, size and bold name stay).
 *
 * Colours: the game's own warm colours only. The working amber is our kobo and lamp glow
 * colour; everything else is warm grey, cream and our dark ink. No green, no red, no blue, so
 * no two of the wheel's colours together can read as any party's colours, and it carries no
 * symbol, star, flag or crest.
 *
 * Every state looks the same: same cog, same size, same letters. Only the player's own progress
 * changes a cog. The hub turns only when all 37 work (not in version 1).
 *
 * The wheel is an SVG picture for the HTML wheel screen (aria-hidden): the screen gives screen
 * readers a list of every name with "working" or "not working yet" (S2.8).
 */

export interface WheelState {
  /** Save key under gidi-progress `states` (lower case, spaces as dashes). */
  id: string;
  /** The name as players see it, spelled as Nigerians write it. */
  name: string;
}

/** The 36 states and the FCT, A to Z, as S2.8 lists them. Clockwise from the top. */
export const WHEEL_STATES: readonly WheelState[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
].map((name) => ({ id: name.toLowerCase().replace(/ /g, '-'), name }));

/** The wheel's colours (all warm; no party colour set). */
export const WHEEL_COLOURS = {
  ink: '#1d1a14',
  /** Rim, spokes and hub. */
  rim: '#d9c9a6',
  rimEdge: '#8f7d5c',
  hub: '#efe2c4',
  hubEdge: '#6f5f44',
  /** A cog that is not working yet. */
  cogGrey: '#c9c4ba',
  cogGreyEdge: '#7f786c',
  nameGrey: '#5d574b',
  /** A working cog: our warm amber, with a white tick. */
  cogOn: '#f4a62a',
  cogOnEdge: '#7a4e0e',
  tick: '#ffffff',
} as const;

/** The SVG's viewBox is WHEEL_VIEW units square, centred on the hub. */
export const WHEEL_VIEW = 412;

/** Sizes inside the viewBox (centre 0, 0). Worked so the longest name, bold, fits. */
export const WHEEL_SIZES = {
  hub: 30,
  rim: 80,
  /** A grey cog's outer radius (tooth tips). */
  cog: 6.6,
  /** A working cog is this much bigger. */
  onScale: 1.55,
  /** Names start here and run outwards. */
  nameFrom: 93,
  nameSize: 16,
} as const;

/** Seconds for one full turn of a working cog. */
export const COG_TURN_S = 9;

/** Angle of cog i in radians: 0 is straight up, then clockwise (screen y points down). */
export function cogAngle(i: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / WHEEL_STATES.length;
}

/** Centre of cog i in the viewBox. */
export function cogCentre(i: number): { x: number; y: number } {
  const a = cogAngle(i);
  return { x: Math.cos(a) * WHEEL_SIZES.rim, y: Math.sin(a) * WHEEL_SIZES.rim };
}

const f1 = (n: number): string => (Math.round(n * 100) / 100).toString();

/** A cog outline: `teeth` square-ish teeth between radius r0 (roots) and r1 (tips). */
export function cogPath(teeth: number, r0: number, r1: number): string {
  const pts: string[] = [];
  const step = (2 * Math.PI) / teeth;
  for (let t = 0; t < teeth; t++) {
    const a = t * step - Math.PI / 2;
    // root, tip, tip, root: a tooth takes the middle 44 percent of its step
    const k = [
      [a - step * 0.5, r0],
      [a - step * 0.22, r0],
      [a - step * 0.16, r1],
      [a + step * 0.16, r1],
      [a + step * 0.22, r0],
    ] as const;
    for (const [ang, r] of k) pts.push(`${f1(Math.cos(ang) * r)} ${f1(Math.sin(ang) * r)}`);
  }
  return `M${pts.join('L')}Z`;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The CSS for the wheel: the slow turn, and none of it under reduced motion. Inside the SVG,
 * so the picture carries its own rule. Class names start with gdw- so they clash with nothing.
 */
export const WHEEL_CSS =
  `.gdw-turn{animation:gdw-spin ${COG_TURN_S}s linear infinite;transform-box:fill-box;transform-origin:center}` +
  '@keyframes gdw-spin{to{transform:rotate(360deg)}}' +
  '@media (prefers-reduced-motion: reduce){.gdw-turn{animation:none}}';

export interface WheelOptions {
  /** Turn the working cogs (default true). Off also when the player asks for reduced motion. */
  turn?: boolean;
}

/**
 * The whole wheel as SVG markup. `working` holds state ids (WHEEL_STATES[i].id, e.g. 'lagos')
 * whose cogs work. Fills its box (width and height 100%); keep the box square.
 */
export function wheelSvg(working: Iterable<string> = [], opts: WheelOptions = {}): string {
  const on = new Set(working);
  const C = WHEEL_COLOURS;
  const S = WHEEL_SIZES;
  const turn = opts.turn ?? true;
  const half = WHEEL_VIEW / 2;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${WHEEL_VIEW} ${WHEEL_VIEW}" width="100%" height="100%" aria-hidden="true" focusable="false" class="gd-wheel">`,
    `<style>${WHEEL_CSS}</style>`,
    '<defs>',
    `<path id="gdw-cog" d="${cogPath(8, S.cog * 0.74, S.cog)}"/>`,
    '</defs>',
  );
  // Rim (a thick ring) and six spokes from the hub
  out.push(`<g stroke="${C.rimEdge}" stroke-width="1.5">`);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push(`<path d="M${f1(c * (S.hub - 2))} ${f1(s * (S.hub - 2))}L${f1(c * (S.rim - 4))} ${f1(s * (S.rim - 4))}" stroke="${C.rim}" stroke-width="6" stroke-linecap="round"/>`);
  }
  out.push(`<circle r="${S.rim}" fill="none" stroke="${C.rimEdge}" stroke-width="9"/>`);
  out.push(`<circle r="${S.rim}" fill="none" stroke="${C.rim}" stroke-width="6"/>`);
  out.push('</g>');
  // Hub: a big still cog with a round middle
  out.push(`<path d="${cogPath(12, S.hub * 0.82, S.hub)}" fill="${C.hub}" stroke="${C.hubEdge}" stroke-width="2" stroke-linejoin="round"/>`);
  out.push(`<circle r="${f1(S.hub * 0.5)}" fill="${C.rim}" stroke="${C.hubEdge}" stroke-width="1.5"/>`);
  out.push(`<circle r="${f1(S.hub * 0.18)}" fill="${C.hubEdge}"/>`);

  // Grey cogs first, working cogs on top (a working cog is bigger and may touch its neighbours)
  const grey: string[] = [];
  const lit: string[] = [];
  WHEEL_STATES.forEach((st, i) => {
    const { x, y } = cogCentre(i);
    const at = `translate(${f1(x)} ${f1(y)})`;
    if (on.has(st.id)) {
      const sc = S.onScale;
      const r = S.cog * sc;
      lit.push(
        `<g transform="${at}" class="gdw-on" data-state="${st.id}">`,
        `<g${turn ? ' class="gdw-turn"' : ''}><use href="#gdw-cog" transform="scale(${sc})" fill="${C.cogOn}" stroke="${C.cogOnEdge}" stroke-width="${f1(1.4 / sc)}" stroke-linejoin="round"/></g>`,
        // White tick with a dark edge, standing still on the turning cog
        `<path d="M${f1(-r * 0.42)} ${f1(r * 0.02)}L${f1(-r * 0.1)} ${f1(r * 0.34)}L${f1(r * 0.46)} ${f1(-r * 0.32)}" fill="none" stroke="${C.cogOnEdge}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M${f1(-r * 0.42)} ${f1(r * 0.02)}L${f1(-r * 0.1)} ${f1(r * 0.34)}L${f1(r * 0.46)} ${f1(-r * 0.32)}" fill="none" stroke="${C.tick}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
        '</g>',
      );
    } else {
      grey.push(`<use href="#gdw-cog" x="${f1(x)}" y="${f1(y)}" class="gdw-off" data-state="${st.id}"/>`);
      grey.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="${C.cogGreyEdge}"/>`);
    }
  });
  out.push(`<g fill="${C.cogGrey}" stroke="${C.cogGreyEdge}" stroke-width="1.2" stroke-linejoin="round">${grey.join('')}</g>`);
  out.push(...lit);

  // Names, pointing out from the middle. On the left half they are turned round so every
  // name reads left to right.
  out.push(`<g font-family="'Trebuchet MS', Verdana, sans-serif" font-size="${S.nameSize}" dominant-baseline="central">`);
  WHEEL_STATES.forEach((st, i) => {
    const a = cogAngle(i);
    const deg = (a * 180) / Math.PI;
    const left = Math.cos(a) < -1e-6;
    const working = on.has(st.id);
    const from = S.nameFrom + (working ? 3 : 0);
    const x = Math.cos(a) * from;
    const y = Math.sin(a) * from;
    const rot = left ? deg + 180 : deg;
    const anchor = left ? 'end' : 'start';
    const style = working ? ` font-weight="bold" fill="${C.ink}"` : ` fill="${C.nameGrey}"`;
    out.push(`<text x="${f1(x)}" y="${f1(y)}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})" text-anchor="${anchor}"${style}>${esc(st.name)}</text>`);
  });
  out.push('</g></svg>');
  return out.join('');
}
