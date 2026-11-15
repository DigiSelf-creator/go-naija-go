/**
 * Loads the people's chunk (peopleKit.ts) once; a failed load may be tried again later. The
 * title starts it right after it shows (as the moving intro's chunk is fetched early), and a run
 * or the city asks again in case it was missed. Nothing waits for it.
 */
export type PeopleKit = typeof import('./peopleKit');

let load: Promise<PeopleKit> | null = null;
let kit: PeopleKit | null = null;
const ready: ((k: PeopleKit) => void)[] = [];

export function loadPeople(): Promise<PeopleKit> {
  load ??= import('./peopleKit').then(
    (k) => {
      kit = k;
      for (const f of ready.splice(0)) f(k);
      return k;
    },
    (err: unknown) => {
      load = null;
      throw err;
    },
  );
  return load;
}

/** The kit if it has arrived, else null. */
export function peopleKit(): PeopleKit | null {
  return kit;
}

/** Calls `f` once the kit has arrived (at once if it already has). */
export function onPeople(f: (k: PeopleKit) => void): void {
  if (kit) f(kit);
  else ready.push(f);
}
