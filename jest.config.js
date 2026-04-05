module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '\\.ui\\.test\\.js$'],
  verbose: true,
  rootDir: '.',
  transformIgnorePatterns: [
    "node_modules/(?!(@exodus/bytes|jsdom|html-encoding-sniffer|@asamuzakjp/css-color|cssstyle)/)"
  ],
  setupFiles: ['<rootDir>/jest.setup.js']
};
