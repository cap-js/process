/**
 * Jest setup file for build validation tests
 * This runs BEFORE any test file imports, ensuring cds.build mock is available
 * when the ProcessValidationPlugin is imported.
 */
const cds = require('@sap/cds');

// Severity constants matching cds.build.Plugin
const SEVERITY = {
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
};

// Mock BuildError class
class MockBuildError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BuildError';
  }
}

// Set up cds.build mock before any test imports the plugin
if (!cds.build) {
  cds.build = {
    BuildError: MockBuildError,
    Plugin: class MockPlugin {
      static ERROR = SEVERITY.ERROR;
      static WARNING = SEVERITY.WARNING;
      static INFO = SEVERITY.INFO;
    },
  };
}
