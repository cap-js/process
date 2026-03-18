const config = {
  preset: 'ts-jest',
  globalSetup: './tests/setup.ts',
  setupFilesAfterEnv: ['./tests/integration/build-validation/jest-setup.js'],
  testEnvironment: 'node',
  testTimeout: 600000,
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  forceExit: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
};

module.exports = config;
