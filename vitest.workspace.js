const { defineWorkspace } = require('vitest/config');

module.exports = defineWorkspace([
  {
    test: {
      name: 'backend',
      environment: 'node',
      include: ['__tests__/**/*.test.js'],
      exclude: ['__tests__/**/*.ui.test.js'],
      setupFiles: ['./jest.setup.js'], // Re-use backend mocks for now
      globals: true
    }
  },
  {
    test: {
      name: 'ui',
      include: ['__tests__/**/*.ui.test.js'],
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
        headless: true
      },
      // Habilitar compatibilidad global con Jest para TDD rápido
      globals: true,
      setupFiles: ['./__tests__/utils/setup.vitest.js']
    }
  }
]);
