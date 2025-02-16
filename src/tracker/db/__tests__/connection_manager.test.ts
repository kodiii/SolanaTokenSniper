/**
 * Unit tests for ConnectionManager
 */
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ConnectionManager } from '../connection_manager';
import { EventEmitter } from 'events';

// Set higher timeout for all tests
jest.setTimeout(60000);

// Explicitly mock 'sqlite' so open is a Jest mock.
jest.mock('sqlite', () => ({
  open: jest.fn(),
}));

/**
 * Create a mock instance of the Database.
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

  beforeEach(async () => {
    // Clear previous mocks and reset any singletons.
    jest.clearAllMocks();
    (ConnectionManager as any).instance = undefined;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // For every connection request, return a new mock DB instance.
    (open as jest.Mock).mockImplementation(() => Promise.resolve(createMockDb()));

    // Create and initialize a fresh ConnectionManager instance.
    manager = ConnectionManager.getInstance();
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up all connections after each test.
    await manager.closeAll();
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization and Recovery', () => {
    it('should initialize pool and retry on failures', async () => {
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
  });

  describe('Connection Recovery', () => {
    it('should handle unrecoverable connections', async () => {
      const mockDb = createMockDb({
        run: jest.fn().mockRejectedValue(new Error('Connection lost')),
        close: jest.fn().mockRejectedValue(new Error('Close failed'))
      });

      (open as jest.Mock)
        .mockResolvedValueOnce(mockDb)
        .mockRejectedValue(new Error('Failed to create new connection'));

      const manager = ConnectionManager.getInstance();
      await manager.initialize();

      await expect(
        manager.executeWithRetry(async (db) => {
          await db.run('SELECT 1');
        })
      ).rejects.toThrow(/Database operation failed/);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to recover database connection:',
        'Failed to create new connection'
      );
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle all types of connection errors', async () => {
      const errors = [
        { msg: 'SQLITE_BUSY', name: 'SQLITE_BUSY' },
        { msg: 'database is locked', name: 'SQLITE_BUSY' },
        { msg: 'disk I/O error', name: 'SQLITE_IOERR' },
        { msg: 'no such table', name: 'SQLITE_ERROR' },
        { msg: 'database is corrupt', name: 'SQLITE_CORRUPT' }
      ];

      for (const error of errors) {
        const mockDb = createMockDb();
        mockDb.run = jest.fn().mockRejectedValue(Object.assign(new Error(error.msg), { code: error.name }));

        (open as jest.Mock).mockResolvedValueOnce(mockDb);
        
        const manager = ConnectionManager.getInstance();
        await manager.initialize();

        await expect(
          manager.executeWithRetry(async (db) => {
            await db.run('SELECT 1');
          })
        ).rejects.toThrow(/Database operation failed/);
      }
    });
  });

  describe('Transaction Management', () => {
    it('should handle transaction failures', async () => {
      const mockDb = createMockDb();
      const runSpy = jest.spyOn(mockDb, 'run');
      
      // Mock BEGIN to succeed but COMMIT to fail
      runSpy
        .mockResolvedValueOnce({ lastID: 0, changes: 0 } as any) // BEGIN succeeds
        .mockRejectedValueOnce(new Error('COMMIT failed')); // COMMIT fails

      (open as jest.Mock).mockResolvedValue(mockDb);
      
      await expect(
        manager.transaction(async () => 'test')
      ).rejects.toThrow('COMMIT failed');

      expect(runSpy).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on explicit request', async () => {
      const mockDb = createMockDb();
      const runSpy = jest.spyOn(mockDb, 'run');
      
      (open as jest.Mock).mockResolvedValue(mockDb);
      
      await manager.transaction(async (tx) => {
        await tx.rollback();
      });

      const calls = runSpy.mock.calls.map(call => call[0]);
      expect(calls).toContain('ROLLBACK');
      expect(calls.indexOf('ROLLBACK')).toBeGreaterThan(calls.indexOf('BEGIN TRANSACTION'));
    });
  });
});