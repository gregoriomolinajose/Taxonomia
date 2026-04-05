import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' }
      ]
    },
    include: ['__tests__/**/*.ui.test.js'],
    setupFiles: ['./__tests__/utils/setup.vitest.js'],
    globals: true
  }
});
