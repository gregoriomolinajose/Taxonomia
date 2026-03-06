module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  rootDir: '.',
  transformIgnorePatterns: [
    "node_modules/(?!(@exodus/bytes|jsdom|html-encoding-sniffer|@asamuzakjp/css-color|cssstyle)/)"
  ]
};
