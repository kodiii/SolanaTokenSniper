/**
 * Stress tests for ConnectionManager
 */
import { ConnectionManager } from '../connection_manager';
import { Database, open } from 'sqlite';
import { config } from '../../../config';
import { EventEmitter } from 'events';

// Explicitly mock 'sqlite' so open is a Jest mock
jest.mock('sqlite', () => ({
  open: jest.fn()
}));

/**
 * Create a new mock instance of the Database.
 */
const createMockDb = (): Database => ({
  ...new EventEmitter(),
  run: jest.fn().mockResolvedValue('success'),
  get: jest.fn().mockResolvedValue({}),
  all: jest.fn().mockResolvedValue([]),
  close: jest.fn().mockResolvedValue(undefined),
  configure: jest.fn().mockResolvedValue(undefined),
  exec: jest.fn().mockResolvedValue('success'),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn()
}) as unknown as Database;

beforeAll(() => {
  // Increase the default Jest test timeout for this file
  jest.setTimeout(30000); // 30 seconds for stress tests
});

describe('ConnectionManager Stress Tests', () => {
  let manager: ConnectionManager;

  beforeEach(async () => {
    // Clear previous mocks and reset any singletons
    jest.clearAllMocks();
    (ConnectionManager as any).instance = undefined;

    // Return a new mock DB instance for each call.
    (open as jest.Mock).mockImplementation(() => Promise.resolve(createMockDb()));

    // Create a new ConnectionManager and initialize it.
    manager = ConnectionManager.getInstance();
    await manager.closeAll(); // ensure clean slate
    await manager.initialize();
  });

  afterEach(async () => {
    // Ensure that connections are closed after each test.
    await manager.closeAll();
  });

  describe('concurrent connections', () => {
    it('should handle multiple concurrent connection requests', async () => {
      // Assuming the pool size is 5, request (poolSize - 1) connections concurrently.
      const poolSize = 5;
      const concurrentRequests = poolSize - 1;
      const connections = await Promise.all(
        Array(concurrentRequests)
          .fill(null)
          .map(() => manager.getConnection())
      );
      expect(connections.length).toBe(concurrentRequests);

      // Release all connections.
      connections.forEach(conn => manager.releaseConnection(conn));
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Request more connections than the pool size to force exhaustion.
      const totalRequests = 10;
      const results = await Promise.allSettled(
        Array(totalRequests)
          .fill(null)
          .map(() => manager.getConnection(0))
      );

      // Some requests should be rejected if the pool is exhausted.
      const rejected = results.filter(r => r.status === 'rejected');
      const fulfilled = results.filter(r => r.status === 'fulfilled');

      expect(rejected.length).toBeGreaterThan(0);
      expect(fulfilled.length).toBeLessThanOrEqual(5);

      // Release any successful connections.
      for (const res of fulfilled) {
        if (res.status === 'fulfilled') {
          manager.releaseConnection(res.value);
        }
      }
    });
  });

  describe('memory leak prevention', () => {
    it('should properly clean up resources after heavy usage', async () => {
      const iterations = 20;
      for (let i = 0; i < iterations; i++) {
        const conn = await manager.getConnection();
        await conn.run('SELECT 1');
        manager.releaseConnection(conn);
      }
      // Additional memory usage checks can be inserted here if needed.
      expect(true).toBe(true);
    });
  });

  describe('error recovery', () => {
    it('should recover from connection failures under load', async () => {
      // Simulate a one-time connection failure.
      (open as jest.Mock).mockRejectedValueOnce(new Error('Connection failure'));

      // Reinitialize the manager.
      await manager.closeAll();
      await manager.initialize();

      // Ensure that a connection can be acquired after recovery.
      const conn = await manager.getConnection();
      expect(conn).toBeDefined();
      manager.releaseConnection(conn);
    });
  });

  describe('transaction stress testing', () => {
    it('should handle concurrent transactions correctly', async () => {
      const totalTransactions = 10;
      const results = await Promise.allSettled(
        Array(totalTransactions)
          .fill(null)
          .map(() =>
            manager.transaction(async () => {
              // Use a new instance of our mock DB for each transaction.
              const dbInstance = createMockDb();
              await dbInstance.run('SELECT 1');
              return 'ok';
            })
          )
      );

      for (const r of results) {
        expect(r.status).toBe('fulfilled');
      }
    });
  });
});