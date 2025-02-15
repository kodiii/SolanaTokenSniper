import { ConnectionManager } from '../connection_manager';
import { Database, Statement } from 'sqlite';
import { config } from '../../../config';
import { open } from 'sqlite';
import { EventEmitter } from 'events';

// Set a global timeout for all tests
jest.setTimeout(10000);

// Mock sqlite module
jest.mock('sqlite', () => ({
  open: jest.fn()
}));

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  // Create a full mock Database implementation
  const createMockDb = () => ({
    ...new EventEmitter(),
    run: jest.fn().mockResolvedValue('success'),
    get: jest.fn().mockResolvedValue({}),
    all: jest.fn().mockResolvedValue([]),
    exec: jest.fn().mockResolvedValue(undefined),
    each: jest.fn().mockResolvedValue(undefined),
    prepare: jest.fn().mockResolvedValue({} as Statement),
    close: jest.fn().mockResolvedValue(undefined),
    configure: jest.fn(),
    migrate: jest.fn().mockResolvedValue(undefined),
    serialize: jest.fn(cb => cb()),
    parallelize: jest.fn(cb => cb()),
    interrupt: jest.fn(),
    open: jest.fn().mockResolvedValue(undefined),
    wait: jest.fn().mockResolvedValue(undefined),
    getDatabaseInstance: jest.fn().mockReturnValue({}),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    db: {},
    config: {}
  }) as unknown as Database;

  const mockDb = createMockDb();

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
    (open as jest.Mock).mockResolvedValue(mockDb);
    manager = ConnectionManager.getInstance();
    await manager.initialize(); // Initialize in beforeEach
  });

  afterEach(async () => {
    jest.useRealTimers();
    await manager.closeAll();
  });

  describe('initialization', () => {
    it('should create a pool of connections', () => {
      expect(open).toHaveBeenCalledTimes(5);
      expect(open).toHaveBeenCalledWith({
        filename: config.swap.db_name_tracker_holdings,
        driver: expect.any(Function)
      });
    });
  });

  describe('connection management', () => {
    it('should get and release connections', async () => {
      const connection = await manager.getConnection();
      expect(connection).toBeDefined();
      manager.releaseConnection(connection);
    });

    it('should retry getting connection when pool is full', async () => {
      // Create a pool with known connections
      const pool: Database[] = Array(5).fill(null).map(() => createMockDb());
      manager['pool'] = pool;

      // Get all but one connection
      const connections: Database[] = [];
      for (let i = 0; i < 4; i++) {
        connections.push(await manager.getConnection());
      }

      // Start getting a new connection (which must wait)
      const getNewConnectionPromise = manager.getConnection();
      
      // Release one connection after a delay
      setTimeout(() => {
        manager.releaseConnection(connections[0]);
      }, 100);

      // Wait for the connection to be released and acquired
      jest.advanceTimersByTime(200);
      const newConnection = await getNewConnectionPromise;
      
      expect(newConnection).toBeDefined();

      // Cleanup
      connections.slice(1).forEach(conn => manager.releaseConnection(conn));
      manager.releaseConnection(newConnection);
    });

    it('should throw error after max retries', async () => {
      // Create a full pool
      const pool: Database[] = Array(5).fill(null).map(() => createMockDb());
      manager['pool'] = pool;

      // Get all available connections
      const connections: Database[] = [];
      for (let i = 0; i < 5; i++) {
        connections.push(await manager.getConnection());
      }

      // Try to get one more connection with no retries
      await expect(manager.getConnection(0)).rejects.toThrow(
        'No database connections available after retries'
      );

      // Cleanup
      connections.forEach(conn => manager.releaseConnection(conn));
    });
  });

  describe('transaction handling', () => {
    it('should handle successful transactions', async () => {
      const result = await manager.transaction(async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback failed transactions', async () => {
      const error = new Error('Transaction failed');

      await expect(
        manager.transaction(async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('error handling', () => {
    it('should handle query timeout', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        reject(new Error('Query timeout'));
      });

      const queryPromise = manager.executeWithRetry(async () => {
        await timeoutPromise;
        return 'result';
      });

      await expect(queryPromise).rejects.toThrow('Query timeout');
    });

    it('should retry on connection errors', async () => {
      let attempts = 0;
      const result = await manager.executeWithRetry(async () => {
        attempts++;
        if (attempts === 1) throw new Error('database is locked');
        return 'success';
      });

      expect(attempts).toBe(2);
      expect(result).toBe('success');
    });

    it('should handle connection recovery', async () => {
      let attempts = 0;
      const result = await manager.executeWithRetry(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('database is locked');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });
});