import { DatabaseService } from '..';
import { ConnectionManager } from '../connection_manager';
import { HoldingRecord, NewTokenRecord } from '../../../types';
import { Database } from 'sqlite';
import { EventEmitter } from 'events';

// Mock the ConnectionManager
jest.mock('../connection_manager', () => ({
  ConnectionManager: {
    getInstance: jest.fn()
  }
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;

  // Create mock functions
  const execMock = jest.fn().mockResolvedValue(undefined);
  const runMock = jest.fn().mockResolvedValue(undefined);
  const allMock = jest.fn().mockResolvedValue([]);
  const closeMock = jest.fn().mockResolvedValue(undefined);

  // Create a complete mock of the Database interface
  const mockDb = {
    ...new EventEmitter(),
    exec: execMock,
    run: runMock,
    all: allMock,
    close: closeMock,
    get: jest.fn(),
    each: jest.fn(),
    prepare: jest.fn(),
    configure: jest.fn(),
    serialize: jest.fn(),
    parallelize: jest.fn(),
    interrupt: jest.fn(),
    wait: jest.fn(),
    getDatabaseInstance: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    db: {},
    config: {},
  } as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConnectionManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      executeWithRetry: jest.fn(),
      transaction: jest.fn(),
      getConnection: jest.fn().mockResolvedValue(mockDb),
      closeAll: jest.fn().mockResolvedValue(undefined),
      releaseConnection: jest.fn()
    } as unknown as jest.Mocked<ConnectionManager>;

    (ConnectionManager.getInstance as jest.Mock).mockReturnValue(mockConnectionManager);
    
    // Create a new instance with our mocked manager
    dbService = new DatabaseService(mockConnectionManager);
  });

  describe('initialization', () => {
    it('should create tables and indices', async () => {
      mockConnectionManager.executeWithRetry.mockImplementation(callback => callback(mockDb));

      await dbService.initialize();

      expect(mockConnectionManager.initialize).toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS holdings'));
      expect(execMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS tokens'));
      expect(execMock).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX'));
    });

    it('should handle existing tables gracefully', async () => {
      mockConnectionManager.executeWithRetry.mockImplementation(async (callback) => {
        // First call succeeds (tables)
        if (execMock.mock.calls.length === 0) {
          return callback(mockDb);
        }
        // Second call fails (indices) but should be ignored since table exists
        throw new Error('table holdings already exists');
      });

      await expect(dbService.initialize()).resolves.not.toThrow();
      expect(mockConnectionManager.initialize).toHaveBeenCalled();
      expect(execMock).toHaveBeenCalled();
    });

    it('should handle initialization failures', async () => {
      const error = new Error('SQLITE_BUSY: database is locked');
      mockConnectionManager.executeWithRetry.mockRejectedValue(error);

      await expect(dbService.initialize()).rejects.toThrow(error);
    });
  });

  describe('holdings operations', () => {
    const mockHolding: HoldingRecord = {
      Time: Date.now(),
      Token: 'token123',
      TokenName: 'Test Token',
      Balance: 100,
      SolPaid: 1,
      SolFeePaid: 0.1,
      SolPaidUSDC: 100,
      SolFeePaidUSDC: 10,
      PerTokenPaidUSDC: 1,
      Slot: 1000,
      Program: 'test'
    };

    beforeEach(() => {
      mockConnectionManager.transaction.mockImplementation(async (callback) => {
        await callback({ commit: jest.fn(), rollback: jest.fn() });
      });

      mockConnectionManager.executeWithRetry.mockImplementation(callback => callback(mockDb));
    });

    it('should insert holding', async () => {
      await dbService.insertHolding(mockHolding);

      expect(mockConnectionManager.transaction).toHaveBeenCalled();
      expect(runMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO holdings'),
        expect.arrayContaining([mockHolding.Token])
      );
    });

    it('should handle transaction rollback on insert failure', async () => {
      const error = new Error('Insert failed');
      runMock.mockRejectedValueOnce(error);

      mockConnectionManager.transaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          commit: jest.fn(),
          rollback: jest.fn().mockResolvedValue(undefined)
        };
        try {
          await callback(mockTransaction);
        } catch {
          await mockTransaction.rollback();
          throw error;
        }
      });

      await expect(dbService.insertHolding(mockHolding)).rejects.toThrow(error);
    });

    it('should remove holding', async () => {
      await dbService.removeHolding('token123');

      expect(mockConnectionManager.executeWithRetry).toHaveBeenCalled();
      expect(runMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM holdings'),
        ['token123']
      );
    });

    it('should throw error when removing holding with invalid token', async () => {
      await expect(dbService.removeHolding('')).rejects.toThrow('Invalid token mint');
    });

    it('should get all holdings', async () => {
      const mockHoldings = [mockHolding];
      allMock.mockResolvedValueOnce(mockHoldings);

      const result = await dbService.getHoldings();

      expect(mockConnectionManager.executeWithRetry).toHaveBeenCalled();
      expect(result).toEqual(mockHoldings);
    });

    it('should handle connection failures during query', async () => {
      const error = new Error('Connection lost');
      mockConnectionManager.executeWithRetry.mockRejectedValue(error);

      await expect(dbService.getHoldings()).rejects.toThrow(error);
    });

    it('should handle concurrent operations', async () => {
      const operations = Promise.all([
        dbService.insertHolding(mockHolding),
        dbService.getHoldings(),
        dbService.removeHolding('token123')
      ]);

      await expect(operations).resolves.not.toThrow();
    });
  });

  describe('token operations', () => {
    const mockToken: NewTokenRecord = {
      time: Date.now(),
      name: 'Test Token',
      mint: 'mint123',
      creator: 'creator123'
    };

    beforeEach(() => {
      mockConnectionManager.transaction.mockImplementation(async (callback) => {
        await callback({ commit: jest.fn(), rollback: jest.fn() });
      });

      mockConnectionManager.executeWithRetry.mockImplementation(callback => callback(mockDb));
    });

    it('should insert new token', async () => {
      await dbService.insertNewToken(mockToken);

      expect(mockConnectionManager.transaction).toHaveBeenCalled();
      expect(runMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tokens'),
        expect.arrayContaining([mockToken.mint])
      );
    });

    it('should handle nested transactions', async () => {
      mockConnectionManager.transaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          commit: jest.fn().mockResolvedValue(undefined),
          rollback: jest.fn().mockResolvedValue(undefined)
        };
        await callback(mockTransaction);
      });

      await dbService.insertNewToken(mockToken);
      expect(mockConnectionManager.transaction).toHaveBeenCalled();
    });

    it('should throw error when inserting invalid token', async () => {
      const invalidToken = { ...mockToken, mint: '' };
      await expect(dbService.insertNewToken(invalidToken)).rejects.toThrow('Invalid token data');
    });

    it('should find token by mint', async () => {
      const mockTokens = [mockToken];
      allMock.mockResolvedValueOnce(mockTokens);

      const result = await dbService.findTokenByMint('mint123');

      expect(mockConnectionManager.executeWithRetry).toHaveBeenCalled();
      expect(result).toEqual(mockTokens);
    });

    it('should handle invalid SQL during query', async () => {
      const sqlError = new Error('SQLITE_ERROR: near "INVALID": syntax error');
      runMock.mockRejectedValueOnce(sqlError);

      mockConnectionManager.executeWithRetry.mockRejectedValueOnce(sqlError);

      await expect(dbService.insertNewToken(mockToken)).rejects.toThrow('SQLITE_ERROR: near "INVALID": syntax error');
    });

    it('should throw error when searching with invalid mint', async () => {
      await expect(dbService.findTokenByMint('')).rejects.toThrow('Invalid mint address');
    });

    it('should find token by name and creator', async () => {
      const mockTokens = [mockToken];
      allMock.mockResolvedValueOnce(mockTokens);

      const result = await dbService.findTokenByNameAndCreator('Test Token', 'creator123');

      expect(mockConnectionManager.executeWithRetry).toHaveBeenCalled();
      expect(result).toEqual(mockTokens);
    });

    it('should handle retry exhaustion', async () => {
      mockConnectionManager.executeWithRetry.mockRejectedValue(
        new Error('Operation failed after maximum retries')
      );

      await expect(
        dbService.findTokenByNameAndCreator('Test Token', 'creator123')
      ).rejects.toThrow('Operation failed after maximum retries');
    });

    it('should throw error when searching with invalid name or creator', async () => {
      await expect(dbService.findTokenByNameAndCreator('', 'creator')).rejects.toThrow('Invalid name or creator');
      await expect(dbService.findTokenByNameAndCreator('name', '')).rejects.toThrow('Invalid name or creator');
    });
  });

  describe('cleanup', () => {
    it('should close all connections', async () => {
      await dbService.close();
      expect(mockConnectionManager.closeAll).toHaveBeenCalled();
    });

    it('should handle cleanup failures', async () => {
      const error = new Error('Failed to close connections');
      mockConnectionManager.closeAll.mockRejectedValue(error);

      await expect(dbService.close()).rejects.toThrow(error);
    });
  });
});