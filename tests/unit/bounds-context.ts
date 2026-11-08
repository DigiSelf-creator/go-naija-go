/**
 * A stand-in 2D context that follows save, restore, translate, rotate and scale,
 * and grows a box round every point a path or rectangle touches (curve control
 * points and whole circles included, so the box is a safe outer limit).
 * Also notes any NaN or Infinity, and how deep save() is left.
 */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface BoundsContext {
  g: CanvasRenderingContext2D;
  box: Box;
  bad: string[];
  depth: () => number;
  drew: () => boolean;
}

type M = [number, number, number, number, number, number];

export function boundsContext(): BoundsContext {
  let m: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const box: Box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  const bad: string[] = [];
  let drew = false;
  const pt = (x: number, y: number, r = 0): void => {
    const X = m[0] * x + m[2] * y + m[4];
    const Y = m[1] * x + m[3] * y + m[5];
    const s = r * Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
    box.left = Math.min(box.left, X - s);
    box.right = Math.max(box.right, X + s);
    box.top = Math.min(box.top, Y - s);
    box.bottom = Math.max(box.bottom, Y + s);
  };
  const mul = (n: M): void => {
    const [a, b, c, d, e, f] = m;
    m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
  };
  const ops: Record<string, (...a: number[]) => void> = {
    save: () => void stack.push([...m] as M),
    restore: () => {
      m = stack.pop() ?? m;
    },
    translate: (x, y) => mul([1, 0, 0, 1, x!, y!]),
    scale: (x, y) => mul([x!, 0, 0, y!, 0, 0]),
    rotate: (a) => mul([Math.cos(a!), Math.sin(a!), -Math.sin(a!), Math.cos(a!), 0, 0]),
    moveTo: (x, y) => pt(x!, y!),
    lineTo: (x, y) => pt(x!, y!),
    quadraticCurveTo: (cx, cy, x, y) => {
      pt(cx!, cy!);
      pt(x!, y!);
    },
    bezierCurveTo: (a, b, c, d, x, y) => {
      pt(a!, b!);
      pt(c!, d!);
      pt(x!, y!);
    },
    arc: (x, y, r) => pt(x!, y!, r!),
    ellipse: (x, y, rx, ry) => pt(x!, y!, Math.max(rx!, ry!)),
    rect: (x, y, w, h) => {
      pt(x!, y!);
      pt(x! + w!, y! + h!);
      pt(x! + w!, y!);
      pt(x!, y! + h!);
    },
    fillRect: (x, y, w, h) => {
      drew = true;
      ops['rect']!(x!, y!, w!, h!);
    },
    fill: () => {
      drew = true;
    },
    stroke: () => {
      drew = true;
    },
  };
  const props: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
  const g = new Proxy(props, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (k in t) return t[k];
      return (...args: unknown[]) => {
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${k}(${args.join(', ')})`);
        ops[k]?.(...(args as number[]));
        return undefined;
      };
    },
    set(t, k, v) {
      if (typeof k === 'string') {
        if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${k} = ${v}`);
        if (v === undefined || v === '') bad.push(`${k} = ${String(v)}`);
        t[k] = v;
      }
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, box, bad, depth: () => stack.length, drew: () => drew };
}
