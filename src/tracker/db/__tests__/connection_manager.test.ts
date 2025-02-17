/**
 * Unit tests for ConnectionManager
 */
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ConnectionManager } from '../connection_manager';
import { EventEmitter } from 'events';

// Explicitly mock 'sqlite' so open is a Jest mock
jest.mock('sqlite', () => ({
  open: jest.fn()
}));

/**
 * Create a mock instance of the Database
 */
const createMockDb = (overrides = {}): Database => ({
  ...new EventEmitter(),
  run: jest.fn().mockResolvedValue({
    lastID: 0,
    changes: 0
  } as any),
  get: jest.fn().mockResolvedValue({}),
  all: jest.fn().mockResolvedValue([]),
  close: jest.fn().mockResolvedValue(undefined),
  configure: jest.fn().mockResolvedValue(undefined),
  exec: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  ...overrides
}) as unknown as Database;

describe('ConnectionManager', () => {
  let manager: ConnectionManager;
  let consoleErrorSpy: jest.SpyInstance;
  let operations: string[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    (ConnectionManager as any).instance = undefined;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    operations = [];

    // For every connection request, return a new mock DB instance
    (open as jest.Mock).mockImplementation(() => Promise.resolve(createMockDb({
      run: jest.fn().mockImplementation(async (sql: string) => {
        operations.push(sql);
        return { lastID: 0, changes: 0 };
      })
    })));

    // Create and initialize a fresh ConnectionManager instance
    manager = ConnectionManager.getInstance();
    await manager.initialize();
  });

  afterEach(async () => {
    if (manager) {
      await manager.closeAll();
    }
    consoleErrorSpy.mockRestore();
  });

  describe('Error Recovery', () => {
    it('should handle initialization failures with retries', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;

      // Mock first 2 attempts to fail, then succeed
      let attempts = 0;
      (open as jest.Mock).mockImplementation(() => {
        if (attempts++ < 2) {
          throw new Error('Init error');
        }
        return Promise.resolve(createMockDb());
      });

      const manager = ConnectionManager.getInstance();
      await manager.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create connection:', 'Init error');
      expect(attempts).toBeGreaterThan(2);
    });

    it('should fail after max retries with no connections', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;

      // Always fail
      (open as jest.Mock).mockRejectedValue(new Error('Persistent failure'));

      const manager = ConnectionManager.getInstance();
      await expect(manager.initialize()).rejects.toThrow('Failed to initialize connection pool');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create connection:', 'Persistent failure');
    });

    // Set explicit timeout for this test
    it('should handle unrecoverable connections', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;

      const connectionError = new Error('Connection lost');
      const recoverError = new Error('Failed to create new connection');

      // Create a mock DB that fails immediately
      const mockDb = createMockDb({
        run: jest.fn().mockRejectedValue(connectionError),
        close: jest.fn().mockResolvedValue(undefined)
      });

      // First return our failing DB, then fail all subsequent connection attempts
      (open as jest.Mock)
        .mockResolvedValueOnce(mockDb)
        .mockRejectedValue(recoverError);

      manager = ConnectionManager.getInstance();
      
      // Configure for fast failure
      Object.assign(manager, {
        maxRetries: 1,
        retryDelay: 1,
        connectionTimeout: 1,
        maxConnections: 1
      });

      await manager.initialize();

      await expect(
        manager.executeWithRetry((db) => db.run('SELECT 1'), 1)
      ).rejects.toThrow('Failed to create new connection');

      expect(mockDb.run).toHaveBeenCalledWith('SELECT 1');
      expect(mockDb.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to recover database connection:',
        'Failed to create new connection'
      );
    }, 30000);

    it('should handle connection close failures', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;

      const closeError = new Error('Failed to close connection');
      const mockDb = createMockDb({
        close: jest.fn().mockRejectedValue(closeError)
      });

      // Return our DB with failing close
      (open as jest.Mock).mockResolvedValue(mockDb);

      manager = ConnectionManager.getInstance();
      await manager.initialize();

      // This will trigger closeAll in the afterEach
      await manager.closeAll();

      expect(mockDb.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error closing connection:',
        'Failed to close connection'
      );
    });
  });

  describe('Transaction Management', () => {
    it('should handle transaction failures', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;

      const mockDb = createMockDb({
        run: jest.fn().mockImplementation(async (sql: string) => {
          operations.push(sql);
          if (sql === 'COMMIT') {
            throw new Error('COMMIT failed');
          }
          return { lastID: 0, changes: 0 };
        })
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.transaction(async () => 'test')
      ).rejects.toThrow('COMMIT failed');

      expect(operations).toEqual(['BEGIN TRANSACTION', 'COMMIT', 'ROLLBACK']);
    });

    it('should handle explicit transaction rollback', async () => {
      jest.clearAllMocks();
      (ConnectionManager as any).instance = undefined;
      operations = [];

      let hasRolledBack = false;
      const mockDb = createMockDb({
        run: jest.fn().mockImplementation(async (sql: string) => {
          if (sql === 'ROLLBACK' && hasRolledBack) {
            return { lastID: 0, changes: 0 }; // Skip second rollback
          }
          operations.push(sql);
          if (sql === 'ROLLBACK') {
            hasRolledBack = true;
          }
          return { lastID: 0, changes: 0 };
        })
      });

      (open as jest.Mock).mockResolvedValue(mockDb);
      manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.transaction(async (tx) => {
          await tx.rollback();
          throw new Error('Rollback requested'); // Prevent automatic commit
        })
      ).rejects.toThrow('Rollback requested');

      expect(operations).toEqual(['BEGIN TRANSACTION', 'ROLLBACK']);
    });
  });
});