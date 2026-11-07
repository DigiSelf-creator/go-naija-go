/**
 * A stand-in 2D canvas context for art tests. It records every call and every
 * text drawn, and flags NaN or Infinity (a phone canvas would silently skip it).
 */
export interface Recorder {
  g: CanvasRenderingContext2D;
  calls: { name: string; args: unknown[] }[];
  texts: string[];
  colours: string[];
  bad: string[];
  depth: () => number;
}

export function recorder(): Recorder {
  const calls: { name: string; args: unknown[] }[] = [];
  const texts: string[] = [];
  const colours: string[] = [];
  const bad: string[] = [];
  let depth = 0;
  const props: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
  const grad = { addColorStop: () => undefined };
  const g = new Proxy(props, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
        if (key === 'save') depth++;
        if (key === 'restore') depth--;
        if (key === 'fillText' || key === 'strokeText') texts.push(String(args[0]));
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(`${key}(${args.join(', ')})`);
        if (key === 'getTransform') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        if (key.startsWith('create') && key.endsWith('Gradient')) return grad;
        return undefined;
      };
    },
    set(target, key, value) {
      if (typeof key === 'string') {
        if (typeof value === 'number' && !Number.isFinite(value)) bad.push(`${key} = ${value}`);
        if (value === undefined || value === '') bad.push(`${key} = ${String(value)}`);
        if ((key === 'fillStyle' || key === 'strokeStyle') && typeof value === 'string') colours.push(value);
        target[key] = value;
      }
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, calls, texts, colours, bad, depth: () => depth };
}

/** Hue (0-360), saturation and lightness (0-1) of a #rrggbb colour; null for anything else. */
export function hsl(c: string): { h: number; s: number; l: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const gg = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, gg, b);
  const min = Math.min(r, gg, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((gg - b) / d) % 6 : max === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}
