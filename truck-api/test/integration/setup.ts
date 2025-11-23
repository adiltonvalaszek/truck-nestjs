// Global setup for integration tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';

// Load test environment variables from globalSetup
try {
  const fs = require('fs');
  const path = require('path');
  const testEnv = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-env.json'), 'utf8'));
  
  // Set database and Redis URLs from test containers
  if (testEnv.TEST_DB_URL) {
    process.env.DATABASE_URL = testEnv.TEST_DB_URL;
  }
  if (testEnv.REDIS_HOST && testEnv.REDIS_PORT) {
    process.env.REDIS_HOST = testEnv.REDIS_HOST;
    process.env.REDIS_PORT = testEnv.REDIS_PORT;
  }
} catch (error) {
  console.warn('⚠️ Could not load test-env.json, using default values');
}

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