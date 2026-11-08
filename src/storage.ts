/**
 * Safe saves. Everything stays on the phone (localStorage). If storage is blocked
 * (private mode, settings, full disk) the game keeps working with an in-memory copy.
 */
/**
 * Keys on the phone (docs/design.md S2.8 "Save shape"): gidi-look (skin, hair, outfit, body, age),
 * gidi-sound, gidi-music, gidi-gentle, gidi-progress.
 */
const PREFIX = 'gidi-';

export interface Store {
  load<T>(key: string, isValid?: (v: unknown) => v is T): T | undefined;
  save(key: string, value: unknown): boolean;
  remove(key: string): void;
  /** True when something is saved under the key, readable or not (S2.8 broken copy rule). */
  has(key: string): boolean;
  /** True when saves will survive a reload. */
  readonly persistent: boolean;
}

function probe(get: () => Storage | null | undefined): Storage | null {
  try {
    const s = get();
    if (!s) return null;
    const k = `${PREFIX}probe`;
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function createStore(get: () => Storage | null | undefined = () => globalThis.localStorage): Store {
  const backing = probe(get);
  const memory = new Map<string, string>();

  // Memory holds every value written this visit, so it is always the newest copy,
  // even when a write to the phone failed (storage full) after reads worked.
  const read = (key: string): string | null => {
    const mem = memory.get(key);
    if (mem !== undefined) return mem;
    if (!backing) return null;
    try {
      return backing.getItem(PREFIX + key);
    } catch {
      return null;
    }
  };

  return {
    persistent: backing !== null,
    load<T>(key: string, isValid?: (v: unknown) => v is T): T | undefined {
      const raw = read(key);
      if (raw === null) return undefined;
      try {
        const v: unknown = JSON.parse(raw);
        if (isValid && !isValid(v)) return undefined;
        return v as T;
      } catch {
        return undefined;
      }
    },
    save(key: string, value: unknown): boolean {
      let raw: string;
      try {
        raw = JSON.stringify(value);
      } catch {
        return false;
      }
      memory.set(key, raw);
      if (!backing) return false;
      try {
        backing.setItem(PREFIX + key, raw);
        return true;
      } catch {
        return false;
      }
    },
    has(key: string): boolean {
      return read(key) !== null;
    },
    remove(key: string): void {
      memory.delete(key);
      try {
        backing?.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },
  };
}
