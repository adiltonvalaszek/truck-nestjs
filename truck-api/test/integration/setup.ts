// Global setup for integration tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';

// Suppress console logs during tests (except our own)
const integrationConsole = global.console;
global.console = {
  ...integrationConsole,
  log: jest.fn(),
  error: integrationConsole.error, // Keep errors visible
  warn: integrationConsole.warn,   // Keep warnings visible
  info: jest.fn(),
  debug: jest.fn(),
};