import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    projects: [
      // ── Browser UI tests (Chromium / Playwright) ─────────────────────────
      {
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          },
          include: ['__tests__/**/*.ui.test.js'],
          setupFiles: ['./__tests__/utils/setup.vitest.js'],
          globals: true
        }
      },
      // ── Node unit tests (pure JS, no DOM) ────────────────────────────────
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/**/*.test.js', '!__tests__/**/*.ui.test.js'],
          setupFiles: ['./jest.setup.js'],
          globals: true
        }
      }
    ]
  }
});
