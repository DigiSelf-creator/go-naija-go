/**
 * Phone buttons (docs/design.md S2.2 "Phone buttons", S2.5 well buttons, S2.15 Throw): Back,
 * Forward, Jump, Go down, Go up, Throw. Our own simple shapes: circles with a triangle,
 * a pill with an up chevron above a word, a pill with a bucket and an arrow.
 *
 * One description of each button is turned into either:
 * - controlSvg(kind, pressed): SVG markup for an HTML button (the HUD is HTML), or
 * - drawControl(g, ...): the same drawing on a canvas (gallery, or a canvas HUD).
 *
 * Look: fill white at 35 percent, a 2 px near-black outline at 50 percent, the icon
 * white with a dark edge. Pressed: fill 60 percent, the whole button shrinks to
 * 94 percent and the icon turns solid dark. The press shows by shape and size,
 * not colour alone. Each button is drawn in a box 100 units tall.
 */
export type ControlKind = 'back' | 'forward' | 'jump' | 'down' | 'up' | 'throw';

/** Width of each button when its height is 1 (S2.2: circles D x D, Jump 1.5 D, well pills 2.2 D; S2.15 Throw a circle T x T). */
export const CONTROL_ASPECT: Record<ControlKind, number> = { back: 1, forward: 1, jump: 1.5, down: 2.2, up: 2.2, throw: 1 };

/** Words on the buttons that carry words (also their spoken labels). */
export const CONTROL_WORDS: Record<ControlKind, string> = { back: 'Back', forward: 'Forward', jump: 'Jump', down: 'Go down', up: 'Go up', throw: 'Throw' };

/** Throw's spoken label (S2.15): "Throw fufu, {n} left". */
export function throwLabel(n: number): string {
  return `Throw fufu, ${Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0} left`;
}

export const CONTROL_LOOK = {
  face: 'rgba(255,255,255,0.35)',
  facePressed: 'rgba(255,255,255,0.6)',
  /** 2 CSS px when the button is about 80 px tall: 2.5 in the 100-unit box. */
  edge: 'rgba(29,26,20,0.5)',
  edgeW: 2.5,
  icon: '#ffffff',
  iconEdge: 'rgba(29,26,20,0.75)',
  iconPressed: '#1d1a14',
  pressedScale: 0.94,
} as const;

type Prim =
  | { t: 'circle'; cx: number; cy: number; r: number; face: true }
  | { t: 'pill'; x: number; y: number; w: number; h: number; face: true }
  | { t: 'poly'; pts: readonly (readonly [number, number])[]; closed: boolean; fill: boolean; w: number }
  | { t: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; w: number }
  | { t: 'dot'; cx: number; cy: number; r: number; w: number }
  | { t: 'text'; x: number; y: number; size: number; text: string };

/** The parts of one button, in a box (aspect x 100) wide and 100 tall. */
export function controlParts(kind: ControlKind, label?: string): Prim[] {
  const W = CONTROL_ASPECT[kind] * 100;
  switch (kind) {
    case 'back':
    case 'forward': {
      const d = kind === 'forward' ? 1 : -1;
      return [
        { t: 'circle', cx: 50, cy: 50, r: 46, face: true },
        {
          t: 'poly',
          pts: [
            [50 - d * 13, 29],
            [50 + d * 19, 50],
            [50 - d * 13, 71],
          ],
          closed: true,
          fill: true,
          w: 5,
        },
      ];
    }
    case 'jump': {
      const text = label ?? CONTROL_WORDS.jump;
      // The chevron sits above the word, both centred, so neither crowds the other
      // or the outline at any size.
      const cx = W / 2;
      return [
        { t: 'pill', x: 4, y: 4, w: W - 8, h: 92, face: true },
        {
          t: 'poly',
          pts: [
            [cx - 17, 33],
            [cx, 16],
            [cx + 17, 33],
          ],
          closed: false,
          fill: false,
          w: 9,
        },
        { t: 'text', x: cx, y: 67, size: fitSize(text, 96, 30), text },
      ];
    }
    case 'down':
    case 'up': {
      const text = label ?? CONTROL_WORDS[kind];
      const up = kind === 'up';
      // Bucket: a tapered pail with a handle, then an arrow beside it.
      const bucket: Prim[] = [
        { t: 'arc', cx: 40, cy: 44, r: 13, a0: Math.PI, a1: Math.PI * 2, w: 4 },
        {
          t: 'poly',
          pts: [
            [26, 42],
            [54, 42],
            [50, 70],
            [30, 70],
          ],
          closed: true,
          fill: true,
          w: 4,
        },
      ];
      const ay0 = up ? 72 : 30;
      const ay1 = up ? 30 : 72;
      const head = up ? 12 : -12;
      const arrow: Prim[] = [
        {
          t: 'poly',
          pts: [
            [72, ay0],
            [72, ay1],
          ],
          closed: false,
          fill: false,
          w: 8,
        },
        {
          t: 'poly',
          pts: [
            [62, ay1 + head],
            [72, ay1],
            [82, ay1 + head],
          ],
          closed: false,
          fill: false,
          w: 8,
        },
      ];
      const tx = 92 + (W - 8 - 92) / 2;
      return [{ t: 'pill', x: 4, y: 4, w: W - 8, h: 92, face: true }, ...bucket, ...arrow, { t: 'text', x: tx, y: 52, size: fitSize(text, W - 8 - 100, 30), text }];
    }
    case 'throw': {
      // A white fufu ball with two small steam curls and a small forward arrow, the word under it.
      // Soft round shapes only: no flame, spark or trail.
      const text = label ?? CONTROL_WORDS.throw;
      return [
        { t: 'circle', cx: 50, cy: 50, r: 46, face: true },
        { t: 'arc', cx: 38, cy: 21, r: 4.5, a0: Math.PI / 2, a1: (Math.PI * 3) / 2, w: 3.5 },
        { t: 'arc', cx: 50, cy: 18, r: 4.5, a0: -Math.PI / 2, a1: Math.PI / 2, w: 3.5 },
        { t: 'dot', cx: 44, cy: 42, r: 13, w: 4 },
        {
          t: 'poly',
          pts: [
            [64, 42],
            [78, 42],
          ],
          closed: false,
          fill: false,
          w: 6,
        },
        {
          t: 'poly',
          pts: [
            [71, 35],
            [78, 42],
            [71, 49],
          ],
          closed: false,
          fill: false,
          w: 6,
        },
        { t: 'text', x: 50, y: 74, size: fitSize(text, 68, 22), text },
      ];
    }
  }
}

/** Font size so a word fits in `room` units (bold sans, about 0.6 em per letter). */
function fitSize(text: string, room: number, max: number): number {
  const n = Math.max(1, [...text].length);
  return Math.round(Math.max(12, Math.min(max, room / (0.6 * n))));
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * SVG markup for an HTML button. It fills its button (width 100%, height 100%).
 * aria-hidden: the button itself carries the spoken label (CONTROL_WORDS).
 */
export function controlSvg(kind: ControlKind, pressed = false, label?: string): string {
  const W = CONTROL_ASPECT[kind] * 100;
  const L = CONTROL_LOOK;
  const s = pressed ? L.pressedScale : 1;
  const iconFill = pressed ? L.iconPressed : L.icon;
  const iconEdge = pressed ? 'none' : L.iconEdge;
  const out: string[] = [];
  for (const p of controlParts(kind, label)) {
    switch (p.t) {
      case 'circle':
        out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${pressed ? L.facePressed : L.face}" stroke="${L.edge}" stroke-width="${L.edgeW}"/>`);
        break;
      case 'pill':
        out.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.h / 2}" fill="${pressed ? L.facePressed : L.face}" stroke="${L.edge}" stroke-width="${L.edgeW}"/>`);
        break;
      case 'poly': {
        const pts = p.pts.map(([x, y]) => `${x},${y}`).join(' ');
        const tag = p.closed ? 'polygon' : 'polyline';
        if (p.fill) {
          out.push(`<${tag} points="${pts}" fill="${iconFill}" stroke="${pressed ? iconFill : L.iconEdge}" stroke-width="${p.w}" stroke-linejoin="round"/>`);
        } else {
          // A white line with a dark edge: a wider dark line under a white one.
          if (!pressed) out.push(`<${tag} points="${pts}" fill="none" stroke="${iconEdge}" stroke-width="${p.w + 4}" stroke-linecap="round" stroke-linejoin="round"/>`);
          out.push(`<${tag} points="${pts}" fill="none" stroke="${iconFill}" stroke-width="${p.w}" stroke-linecap="round" stroke-linejoin="round"/>`);
        }
        break;
      }
      case 'arc': {
        const x0 = p.cx + Math.cos(p.a0) * p.r;
        const y0 = p.cy + Math.sin(p.a0) * p.r;
        const x1 = p.cx + Math.cos(p.a1) * p.r;
        const y1 = p.cy + Math.sin(p.a1) * p.r;
        const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} A${p.r} ${p.r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
        if (!pressed) out.push(`<path d="${d}" fill="none" stroke="${iconEdge}" stroke-width="${p.w + 4}" stroke-linecap="round"/>`);
        out.push(`<path d="${d}" fill="none" stroke="${iconFill}" stroke-width="${p.w}" stroke-linecap="round"/>`);
        break;
      }
      case 'dot':
        out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${iconFill}" stroke="${pressed ? iconFill : L.iconEdge}" stroke-width="${p.w}"/>`);
        break;
      case 'text':
        out.push(
          `<text x="${p.x}" y="${p.y}" font-family="sans-serif" font-weight="bold" font-size="${p.size}" text-anchor="middle" dominant-baseline="middle" fill="${iconFill}"` +
            (pressed ? '' : ` stroke="${iconEdge}" stroke-width="5" paint-order="stroke" stroke-linejoin="round"`) +
            `>${esc(p.text)}</text>`,
        );
        break;
    }
  }
  // Shrink about the centre: both numbers of the second translate are negative.
  const cx = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 100" width="100%" height="100%" aria-hidden="true" focusable="false"><g transform="translate(${cx} 50) scale(${s}) translate(${-cx} -50)">${out.join('')}</g></svg>`;
}

/**
 * Canvas version. (x, y) is the button's centre, h its height in the canvas's
 * units; the width follows CONTROL_ASPECT.
 */
export function drawControl(g: CanvasRenderingContext2D, kind: ControlKind, x: number, y: number, h: number, pressed = false, label?: string): void {
  const L = CONTROL_LOOK;
  const W = CONTROL_ASPECT[kind] * 100;
  const k = (h / 100) * (pressed ? L.pressedScale : 1);
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.translate(-W / 2, -50);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const iconFill = pressed ? L.iconPressed : L.icon;
  const stroke2 = (w: number): void => {
    if (!pressed) {
      g.strokeStyle = L.iconEdge;
      g.lineWidth = w + 4;
      g.stroke();
    }
    g.strokeStyle = iconFill;
    g.lineWidth = w;
    g.stroke();
  };
  for (const p of controlParts(kind, label)) {
    switch (p.t) {
      case 'circle':
      case 'pill':
        g.beginPath();
        if (p.t === 'circle') g.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        else g.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
        g.fillStyle = pressed ? L.facePressed : L.face;
        g.fill();
        g.strokeStyle = L.edge;
        g.lineWidth = L.edgeW;
        g.stroke();
        break;
      case 'poly':
        g.beginPath();
        p.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
        if (p.closed) g.closePath();
        if (p.fill) {
          g.strokeStyle = pressed ? iconFill : L.iconEdge;
          g.lineWidth = p.w;
          g.stroke();
          g.fillStyle = iconFill;
          g.fill();
        } else stroke2(p.w);
        break;
      case 'arc':
        g.beginPath();
        g.arc(p.cx, p.cy, p.r, p.a0, p.a1);
        stroke2(p.w);
        break;
      case 'dot':
        g.beginPath();
        g.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        g.strokeStyle = pressed ? iconFill : L.iconEdge;
        g.lineWidth = p.w;
        g.stroke();
        g.fillStyle = iconFill;
        g.fill();
        break;
      case 'text':
        g.font = `bold ${p.size}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (!pressed) {
          g.strokeStyle = L.iconEdge;
          g.lineWidth = 5;
          g.strokeText(p.text, p.x, p.y);
        }
        g.fillStyle = iconFill;
        g.fillText(p.text, p.x, p.y);
        break;
    }
  }
  g.restore();
}
