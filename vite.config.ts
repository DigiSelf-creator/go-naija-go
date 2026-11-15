/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Files the service worker must NOT fetch on install. Later worlds load only when reached. */
const PRECACHE_SKIP = [/^sw\.js$/, /\.map$/, /^worlds\//];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Writes dist/sw.js from src/sw/sw.js after the build, filling in the list of
 * built files and a version hash. Paths are relative, so it works under any
 * GitHub Pages sub-path.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'gidi-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    closeBundle() {
      const hash = createHash('sha256');
      const files = listFiles(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => !PRECACHE_SKIP.some((re) => re.test(f)))
        .sort();
      for (const f of files) {
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
      }
      const urls = ['./', ...files.filter((f) => f !== 'index.html').map((f) => `./${f}`), './index.html'];
      const template = readFileSync(resolve(root, 'src/sw/sw.js'), 'utf8');
      const out = template
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify(urls));
      writeFileSync(join(outDir, 'sw.js'), out);
    },
  };
}

// `vite build --mode app` (npm run app:sync) builds the store app (ST1a): the same game into dist,
// with no service worker (the app carries its files) and with the app-only code in src/native.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  plugins: mode === 'app' ? [] : [serviceWorker()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
