/**
 * The one "is this the store app" switch (ST1a). True only inside the Capacitor app on a phone,
 * where the native bridge puts `Capacitor` on the page before the game starts. On the web test
 * link it is false. It reads a global only: no Capacitor code is loaded for this check, so the
 * web first load stays the same. U1 (the update prompt) reads it: no prompt in the app (decision 55).
 */
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

export function isNativeApp(scope: { Capacitor?: CapacitorGlobal } = globalThis as { Capacitor?: CapacitorGlobal }): boolean {
  try {
    return scope.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}
