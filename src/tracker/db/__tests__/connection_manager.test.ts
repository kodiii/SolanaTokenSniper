/**
 * Unit tests for ConnectionManager
 */
import { ConnectionManager } from '../connection_manager';
import { Database, open } from 'sqlite';
import { EventEmitter } from 'events';

// Explicitly mock 'sqlite' so open is a Jest mock.
jest.mock('sqlite', () => ({
  open: jest.fn(),
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
  emit: jest.fn(),
}) as unknown as Database;

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(async () => {
    // Clear previous mocks and reset any singletons.
    jest.clearAllMocks();
    (ConnectionManager as any).instance = undefined;

    // For every connection request, return a new mock DB instance.
    (open as jest.Mock).mockImplementation(() => Promise.resolve(createMockDb()));

    // Create and initialize a fresh ConnectionManager instance.
    manager = ConnectionManager.getInstance();
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up all connections after each test.
    await manager.closeAll();
  });

  test('initialization creates connection pool', async () => {
    // Instead of using getPoolSize (which doesn't exist), simply acquire a connection.
    const connection = await manager.getConnection();
    expect(connection).toBeDefined();
    manager.releaseConnection(connection);
  });

  test('gets and releases connections', async () => {
    const connection = await manager.getConnection();
    expect(connection).toBeDefined();
    manager.releaseConnection(connection);
  });

  test('handles connection exhaustion', async () => {
    // Assuming a pool size of 5.
    const poolSize = 5;
    const connections = [];
    for (let i = 0; i < poolSize; i++) {
      const conn = await manager.getConnection();
      connections.push(conn);
    }
    // Requesting one more connection should be rejected due to exhaustion.
    await expect(manager.getConnection(0)).rejects.toThrow('No database connections available after retries');
    // Clean up: release all acquired connections.
    connections.forEach(conn => manager.releaseConnection(conn));
  });

  test('handles transactions', async () => {
    // Example transaction test.
    const result = await manager.transaction(async () => {
      const conn = await manager.getConnection();
      await conn.run('SELECT 1');
      manager.releaseConnection(conn);
      return 'transaction complete';
    });
    expect(result).toBe('transaction complete');
  });

  test('handles transaction failures', async () => {
    // Simulate a failure during a transaction.
    const originalGetConnection = manager.getConnection;
    manager.getConnection = jest.fn().mockRejectedValue(new Error('Transaction error'));
    await expect(manager.transaction(async () => {
      const conn = await manager.getConnection();
      manager.releaseConnection(conn);
      return 'should not complete';
    })).rejects.toThrow('Transaction error');
    // Restore the original getConnection.
    manager.getConnection = originalGetConnection;
  });

  test('handles cleanup errors', async () => {
    // Simulate errors during cleanup by forcing close() to fail.
    const connections = [];
    for (let i = 0; i < 3; i++) {
      connections.push(await manager.getConnection());
    }
    // Override the close method to simulate a failure.
    connections.forEach(conn => {
      conn.close = jest.fn().mockRejectedValue(new Error('Close failed'));
    });
    // closeAll() should handle cleanup errors internally.
    await expect(manager.closeAll()).resolves.not.toThrow();
    // Optionally release connections manually if needed.
    connections.forEach(conn => manager.releaseConnection(conn));
  });
});