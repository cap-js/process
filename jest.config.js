const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ["**/*.test.ts"],
  forceExit: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts']
}

module.exports = config
