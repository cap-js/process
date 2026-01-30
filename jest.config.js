const config = {
  preset: 'ts-jest',
  globalSetup: './tests/setup.ts',
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ["**/*.test.ts"],
  forceExit: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts']
}

module.exports = config;
