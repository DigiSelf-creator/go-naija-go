/**
 * Safe saves. Everything stays on the phone (localStorage). If storage is blocked
 * (private mode, settings, full disk) the game keeps working with an in-memory copy.
 */
const PREFIX = 'gidi-dash:';

export interface Store {
  load<T>(key: string, isValid?: (v: unknown) => v is T): T | undefined;
  save(key: string, value: unknown): boolean;
  remove(key: string): void;
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

  const read = (key: string): string | null => {
    if (backing) {
      try {
        return backing.getItem(PREFIX + key);
      } catch {
        /* fall through to memory */
      }
    }
    return memory.get(key) ?? null;
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
