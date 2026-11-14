// Copies the store app's icons and splash pictures (ST2, app-assets/android/res, made by
// scripts/make-app-icons.mjs) into the Android project (ST1a): android/app/src/main/res.
// Run by `npm run app:sync`; safe to run again and again.
//
// docs/design.md ST0 part 6: the splash is the same dark green (#0f1a12) in light and dark mode.
// make-app-icons.mjs now draws one set for both, so there are no -night splash files to pick from.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FROM = 'app-assets/android/res';
const TO = 'android/app/src/main/res';

if (!existsSync(FROM) || !existsSync(TO)) {
  console.error(`Missing ${FROM} or ${TO}. Run npm run app-icons, and npx cap add android once.`);
  process.exit(1);
}

// Capacitor's starter pictures, replaced by ours (left in place they would clash).
for (const old of ['values/ic_launcher_background.xml', 'drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) rmSync(join(TO, old), { force: true });
for (const dir of readdirSync(TO)) if (dir.startsWith('drawable-port-')) rmSync(join(TO, dir), { recursive: true, force: true });
// Older night splash copies and colours (ST2 now makes one set for light and dark).
for (const dir of readdirSync(TO)) if (dir === 'drawable-night' || dir.startsWith('drawable-land-night-')) rmSync(join(TO, dir), { recursive: true, force: true });
rmSync(join(TO, 'values-night', 'gbese_colours.xml'), { force: true });
if (existsSync(join(TO, 'values-night')) && readdirSync(join(TO, 'values-night')).length === 0) rmSync(join(TO, 'values-night'), { recursive: true });

let n = 0;
for (const dir of readdirSync(FROM)) {
  if (!statSync(join(FROM, dir)).isDirectory()) continue;
  for (const file of readdirSync(join(FROM, dir))) {
    mkdirSync(join(TO, dir), { recursive: true });
    copyFileSync(join(FROM, dir, file), join(TO, dir, file));
    n++;
  }
}
console.log(`Copied ${n} app pictures and files into ${TO}.`);
