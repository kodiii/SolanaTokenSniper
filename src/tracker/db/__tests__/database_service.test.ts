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
    
    // Create a new instance with our mocked manager instead of using getInstance
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
  });
});