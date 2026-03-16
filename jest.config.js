const config = {
  preset: 'ts-jest',
  globalSetup: './tests/setup.ts',
  setupFilesAfterEnv: ['./tests/integration/build-validation/jest-setup.js'],
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/hybrid/programmaticApproach.test.ts'],
  forceExit: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts'],
};

module.exports = config;
