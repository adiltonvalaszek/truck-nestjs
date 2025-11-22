module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/test/integration/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  testTimeout: 180000, // 3 minutes
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  collectCoverage: false,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts',
};