export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  // Basic settings
  verbose: true,
  bail: true,
  testTimeout: 30000, // Increased to 30 seconds
  // Performance settings
  maxWorkers: 1,
  maxConcurrency: 1,
  // Test execution
  runInBand: true,
  // Cleanup settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Additional settings
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Error handling
  forceExit: true,
  errorOnDeprecated: true
};