// Copies the store app's icons and splash pictures (ST2, made by scripts/make-app-icons.mjs)
// into the app projects:
// - `node scripts/copy-app-res.mjs` (or `android`): app-assets/android/res into
//   android/app/src/main/res (ST1a). Run by `npm run app:sync`.
// - `node scripts/copy-app-res.mjs ios`: app-assets/ios (AppIcon.appiconset, Splash.imageset)
//   into ios/App/App/Assets.xcassets (ST1c). Run by `npm run app:sync:ios`.
// Safe to run again and again.
//
// docs/design.md ST0 part 6: the splash is the same dark green (#0f1a12) in light and dark mode.
// make-app-icons.mjs now draws one set for both, so there are no -night splash files to pick from.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const platform = process.argv[2] ?? 'android';
if (platform === 'ios') {
  copyIos();
  process.exit(0);
}
if (platform !== 'android') {
  console.error(`Unknown platform "${platform}". Use android or ios.`);
  process.exit(1);
}

/** ST1c: the iPhone icon set and splash replace Capacitor's starter ones, whole. */
function copyIos() {
  const from = 'app-assets/ios';
  const to = 'ios/App/App/Assets.xcassets';
  if (!existsSync(from) || !existsSync(to)) {
    console.error(`Missing ${from} or ${to}. Run npm run app-icons, and npx cap add ios once.`);
    process.exit(1);
  }
  let count = 0;
  for (const set of ['AppIcon.appiconset', 'Splash.imageset']) {
    if (!existsSync(join(from, set, 'Contents.json'))) {
      console.error(`Missing ${join(from, set, 'Contents.json')}. Run npm run app-icons.`);
      process.exit(1);
    }
    rmSync(join(to, set), { recursive: true, force: true });
    mkdirSync(join(to, set), { recursive: true });
    for (const file of readdirSync(join(from, set))) {
      copyFileSync(join(from, set, file), join(to, set, file));
      count++;
    }
  }
  console.log(`Copied ${count} app pictures and files into ${to}.`);
}

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
