/**
 * Comprehensive stress tests for ConnectionManager
 */
import { Database, open } from 'sqlite';
import { RunResult } from 'sqlite3';
import sqlite3 from 'sqlite3';
import { ConnectionManager } from '../connection_manager';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// Configure test timeouts and retries
jest.setTimeout(35000);

// We override getInstance() so we can manipulate protected fields.
jest.mock('../connection_manager', () => {
  const actual = jest.requireActual('../connection_manager');
  class MockedConnectionManager extends actual.ConnectionManager {
    constructor() {
      super();
      // Override these after construction, since they are private in the original.
      (this as any).maxConnections = 10;
      (this as any).maxRetries = 2;
      (this as any).retryDelay = 50;
      (this as any).connectionTimeout = 1000;
    }
  }
  return {
    ...actual,
    ConnectionManager: {
      getInstance: () => {
        // Force the instance to be recreated every time (for tests).
        (actual.ConnectionManager as any).instance = undefined;
        return new MockedConnectionManager();
      }
    }
  };
});

jest.mock('sqlite', () => ({
  open: jest.fn()
}));

// SQLite error types for comprehensive testing
const SQLITE_ERRORS = {
  BUSY: { name: 'SQLITE_BUSY', message: 'database is locked' },
  CONSTRAINT: { name: 'SQLITE_CONSTRAINT', message: 'UNIQUE constraint failed' },
  READONLY: { name: 'SQLITE_READONLY', message: 'attempt to write a readonly database' },
  INTERRUPT: { name: 'SQLITE_INTERRUPT', message: 'interrupted' }
};

/**
 * Create a mock database with provided overrides (e.g., for run/get/all).
 */
function createMockDb(overrides: Partial<Database> = {}): Database {
  const mockDb = {
    ...new EventEmitter(),
    run: jest.fn().mockResolvedValue({ lastID: 0, changes: 0 } as RunResult),
    get: jest.fn().mockResolvedValue({}),
    all: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
    configure: jest.fn().mockResolvedValue(undefined),
    exec: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    ...overrides
  };

  // Force the return type to Database
  return mockDb as unknown as Database;
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager;
  let consoleErrorSpy: jest.SpyInstance;
  let operations: string[] = [];
  let mockPool: Database[];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    operations = [];
    mockPool = new Array(10).fill(null).map(() => createMockDb());
  });

  afterEach(async () => {
    if (manager) {
      await manager.closeAll();
    }
    consoleErrorSpy.mockRestore();
  });

  describe('Error Recovery and Connection Management', () => {
    it('should handle initialization failures with retries', async () => {
      const errors = ['Network error', 'Disk error', 'Permission denied'];
      let attempt = 0;

      (open as jest.Mock).mockImplementation(() => {
        if (attempt < errors.length) {
          return Promise.reject(new Error(errors[attempt++]));
        }
        return Promise.resolve(createMockDb());
      });

      manager = ConnectionManager.getInstance();
      await expect(manager.initialize()).rejects.toThrow('Failed to initialize connection pool');
      expect(attempt).toBe(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle connection errors and recovery', async () => {
      const mockDb = createMockDb({
        run: jest.fn()
          .mockRejectedValueOnce(new Error('database is locked'))
          .mockResolvedValueOnce({ lastID: 0, changes: 0 })
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      // Should retry and succeed
      await manager.executeWithRetry(async (db) => {
        await db.run('SELECT 1');
      });

      expect(mockDb.run).toHaveBeenCalledTimes(2);
    });

    it('should handle pool exhaustion and recovery', async () => {
      // Initialize with a fresh pool
      const freshPool = new Array(10).fill(null).map(() => createMockDb());
      let poolIndex = 0;
      (open as jest.Mock).mockImplementation(() => Promise.resolve(freshPool[poolIndex++]));

      manager = ConnectionManager.getInstance();
      await manager.initialize();

      // Request all connections plus some extras
      const allConnections = await Promise.all(
        Array(10).fill(null).map(() => manager.getConnection())
      );

      expect(allConnections).toHaveLength(10); // All connections are obtained

      // Try to get more connections (should fail)
      const extraAttempts = await Promise.all(
        Array(2).fill(null).map(async () => {
          try {
            await manager.getConnection();
            return null;
          } catch (error) {
            return error;
          }
        })
      );

      const errors = extraAttempts.filter(r => r instanceof Error);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toMatch(/No database connections available/);

      // Release connections and verify they can be reused
      allConnections.forEach(conn => manager.releaseConnection(conn));
      const reusedConn = await manager.getConnection();
      expect(reusedConn).toBe(allConnections[0]); // Should reuse the first released connection
    });

    it('should handle connection timeouts', async () => {
      const mockDb = createMockDb({
        run: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)))
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.executeWithRetry(async (db) => {
          await db.run('SELECT 1');
        })
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('Transaction Management', () => {
    it('should handle transaction errors and rollbacks', async () => {
      const mockDb = createMockDb({
        run: jest.fn().mockImplementation(async (sql: string) => {
          operations.push(sql);
          if (sql === 'UPDATE test') {
            throw new Error('Update failed');
          }
          return { lastID: 0, changes: 0 };
        })
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.transaction(async () => {
          await mockDb.run('UPDATE test');
        })
      ).rejects.toThrow('Update failed');

      expect(operations).toEqual([
        'BEGIN TRANSACTION',
        'UPDATE test',
        'ROLLBACK'
      ]);
    });

    it('should handle SQLite error types', async () => {
      const testError = { name: 'SQLITE_BUSY', message: 'database is locked' };
      const mockDb = createMockDb({
        run: jest.fn().mockImplementation(async (sql: string) => {
          operations.push(sql);
          if (sql === 'COMMIT') {
            const err = new Error(testError.message);
            err.name = testError.name;
            throw err;
          }
          return { lastID: 0, changes: 0 };
        })
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.transaction(async () => {
          return 'test';
        })
      ).rejects.toThrow(testError.message);

      expect(operations).toEqual([
        'BEGIN TRANSACTION',
        'COMMIT',
        'ROLLBACK'
      ]);
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      let poolIndex = 0;
      (open as jest.Mock).mockImplementation(() => Promise.resolve(mockPool[poolIndex++ % mockPool.length]));
      manager = ConnectionManager.getInstance();
      await manager.initialize();
    });

    it('should maintain consistent response times under load', async () => {
      const iterations = 10;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await manager.transaction(async () => {
          await new Promise(r => setTimeout(r, 10));
        });
        timings.push(performance.now() - start);
      }

      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const maxTime = Math.max(...timings);
      const stdDev = Math.sqrt(
        timings.reduce((acc, t) => acc + (t - avgTime) ** 2, 0) / timings.length
      );

      expect(stdDev / avgTime).toBeLessThan(0.5);
      expect(maxTime).toBeLessThan(avgTime * 3);
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrentOps = 5;
      const start = performance.now();

      await Promise.all([...Array(concurrentOps)].map(async (_, i) => {
        return manager.transaction(async () => {
          await new Promise(r => setTimeout(r, 10));
          return i;
        });
      }));

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});