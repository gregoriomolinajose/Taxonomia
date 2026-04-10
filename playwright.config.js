import { defineConfig, devices } from '@playwright/test';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const authDir = process.env.TEST_CHROME_PROFILE ? path.resolve(process.env.TEST_CHROME_PROFILE) : path.resolve('.auth');
const authFile = path.join(authDir, 'user.json');

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
  reporter: [['list'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    // DEV URL de Google Apps Script
    baseURL: process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        launchOptions: {
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox'
            ]
        }
      },
    }
  ],
});
