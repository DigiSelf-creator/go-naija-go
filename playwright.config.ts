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

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
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
      grepInvert: PERF,
    },
    {
      // Frame-rate tests, after everything else, one at a time (npm run e2e passes --workers=1),
      // so their fps is not measured while other tests share the computer.
      name: 'perf',
      use: phone,
      grep: PERF,
      dependencies: ['phone-landscape'],
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
