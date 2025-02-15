const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

// Cleanup function to run after each test
afterEach(async () => {
  jest.useRealTimers();
  // Allow any pending timers/promises to resolve
  await setTimeoutPromise(100);
});

// Global test timeout
jest.setTimeout(10000);

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
console.error = (...args) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  originalConsoleError(...args);
};