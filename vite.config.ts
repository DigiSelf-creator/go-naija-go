/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Files the service worker must NOT fetch on install. Later worlds load only when reached. */
const PRECACHE_SKIP = [/^sw\.js$/, /\.map$/, /^worlds\//];

/** The later state a source file belongs to (src/worlds/<id>/...), or null. */
function worldOf(file: string | null | undefined): string | null {
  const m = file ? /[\\/]src[\\/]worlds[\\/]([a-z0-9-]+)[\\/]/.exec(file) ?? /^src\/worlds\/([a-z0-9-]+)\//.exec(file) : null;
  return m ? m[1]! : null;
}

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
      // O1b1: each later state's files, so an update can carry a part the player already has.
      const worlds: Record<string, string[]> = {};
      for (const f of listFiles(outDir).map((x) => relative(outDir, x).split(sep).join('/'))) {
        const m = /^worlds\/([^/]+)\//.exec(f);
        if (!m || f.endsWith('.map')) continue;
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
        (worlds[m[1]!] ??= []).push(`./${f}`);
      }
      const template = readFileSync(resolve(root, 'src/sw/sw.js'), 'utf8');
      const out = template
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify(urls))
        .replace('__WORLDS__', JSON.stringify(worlds));
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
    rollupOptions: {
      output: {
        // O1b1: a later state's part (src/worlds/<id>/ and what only it imports) is built into
        // dist/worlds/<id>/, outside the first load and the first-visit cache.
        chunkFileNames: (chunk) => {
          const id = worldOf(chunk.facadeModuleId) ?? worldOf(chunk.moduleIds.find((m) => worldOf(m)) ?? null);
          return id ? `worlds/${id}/[name]-[hash].js` : 'assets/[name]-[hash].js';
        },
        assetFileNames: (asset) => {
          const id = (asset.originalFileNames ?? []).map((f) => worldOf(f)).find(Boolean);
          return id ? `worlds/${id}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: mode === 'app' ? [] : [serviceWorker()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
