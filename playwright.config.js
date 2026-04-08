import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 120_000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Race conditions testing on UI requires sequential flow to respect single user constraints
  reporter: 'html',
  globalSetup: require.resolve('./__tests__/e2e/global-setup.js'),
  use: {
    // DEV URL de Google Apps Script
    baseURL: process.env.DEV_URL || 'https://script.google.com/a/macros/coppel.com/s/1ZjGYDSsBgXy9mxa9guRoj69oabUJAVZz9GOy9DzJ5280tzYmMIjIBd5q/dev',
    trace: 'on-first-retry',
    storageState: '.auth/user.json', // Utilizar la identidad pre-inyectada
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
