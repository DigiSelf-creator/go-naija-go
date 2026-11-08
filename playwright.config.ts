import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const pixel5 = devices['Pixel 5'];
const phone = {
  ...pixel5,
  viewport: { width: pixel5.viewport.height, height: pixel5.viewport.width },
  screen: { width: pixel5.viewport.height, height: pixel5.viewport.width },
  isMobile: true,
  hasTouch: true,
};
/** Tests that measure frames per second: their titles say "slowed". */
const PERF = /slowed/i;
/**
 * Tests that drive the game in real time (bots, held jumps, taps per second, speeds). They pass
 * alone but can fail when four browsers share a loaded computer, so they run one at a time.
 * Playwright matches grep against "project file describe title", so file names work here.
 */
const TIMING = /(^|\s)(level|level-qa|slice|slice-qa|hands|break|hint-banner)\.spec\.ts\s|then street 1 plays|the pick is announced/;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Room for a busy computer: a test that is only slow is not broken.
  timeout: 60_000,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // A phone held sideways: Pixel 5 in landscape, touch on.
      name: 'phone-landscape',
      use: phone,
      grepInvert: [PERF, TIMING],
    },
    {
      // Real-time play tests, after the parallel ones, one at a time.
      name: 'timing',
      use: phone,
      grep: TIMING,
      grepInvert: PERF,
      workers: 1,
      dependencies: ['phone-landscape'],
    },
    {
      // Frame-rate tests, after everything else, one at a time,
      // so their fps is not measured while other tests share the computer.
      name: 'perf',
      use: phone,
      grep: PERF,
      workers: 1,
      dependencies: ['timing'],
    },
  ],
  webServer: {
    // Always test the built game, the same files players get.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
