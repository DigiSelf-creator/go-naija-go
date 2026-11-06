import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const pixel5 = devices['Pixel 5'];

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
      use: {
        ...pixel5,
        viewport: { width: pixel5.viewport.height, height: pixel5.viewport.width },
        screen: { width: pixel5.viewport.height, height: pixel5.viewport.width },
        isMobile: true,
        hasTouch: true,
      },
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
