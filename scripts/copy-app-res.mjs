// Copies the store app's icons and splash pictures (ST2, app-assets/android/res, made by
// scripts/make-app-icons.mjs) into the Android project (ST1a): android/app/src/main/res.
// Run by `npm run app:sync`; safe to run again and again.
//
// docs/design.md ST0 part 6: the splash is the same dark green (#0f1a12) in light and dark mode,
// so the dark pictures and colour are used for both here.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FROM = 'app-assets/android/res';
const TO = 'android/app/src/main/res';
const SPLASH_BG = '#0f1a12';

if (!existsSync(FROM) || !existsSync(TO)) {
  console.error(`Missing ${FROM} or ${TO}. Run npm run app-icons, and npx cap add android once.`);
  process.exit(1);
}

// Capacitor's starter pictures, replaced by ours (left in place they would clash).
for (const old of ['values/ic_launcher_background.xml', 'drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) rmSync(join(TO, old), { force: true });
for (const dir of readdirSync(TO)) if (dir.startsWith('drawable-port-')) rmSync(join(TO, dir), { recursive: true, force: true });

let n = 0;
for (const dir of readdirSync(FROM)) {
  if (!statSync(join(FROM, dir)).isDirectory()) continue;
  for (const file of readdirSync(join(FROM, dir))) {
    // ST0: one dark splash for light and dark. drawable-land-mdpi takes drawable-land-night-mdpi's.
    let src = join(FROM, dir, file);
    if (file === 'splash.png' && !dir.includes('night')) {
      const night = dir === 'drawable' ? 'drawable-night' : dir.replace('drawable-land-', 'drawable-land-night-');
      if (existsSync(join(FROM, night, file))) src = join(FROM, night, file);
    }
    mkdirSync(join(TO, dir), { recursive: true });
    copyFileSync(src, join(TO, dir, file));
    n++;
  }
}
const colours = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Gbese! icon and splash colours. Copied by scripts/copy-app-res.mjs: edit app-assets. -->
    <color name="ic_launcher_background">#0e7a3e</color>
    <color name="splash_background">${SPLASH_BG}</color>
</resources>
`;
for (const dir of ['values', 'values-night']) writeFileSync(join(TO, dir, 'gbese_colours.xml'), colours);
console.log(`Copied ${n} app pictures into ${TO}; splash background ${SPLASH_BG}.`);
