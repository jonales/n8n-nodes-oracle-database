import { OracleDatabaseAdvanced } from '../../nodes/Oracle/OracleDatabaseAdvanced.node';
import {
  OracleConnection,
  OracleConnectionPool,
  PLSQLExecutorFactory,
  BulkOperationsFactory,
  TransactionManagerFactory,
  AQOperations,
} from '../../nodes/Oracle/core';
import { DEFAULT_CREDENTIALS, createMockExecuteFns } from '../helpers/mock-execute-fns';

jest.mock('oracledb', () => ({
  NUMBER: 2010,
  STRING: 2001,
  DATE: 2011,
  OUT_FORMAT_OBJECT: 4,
  CLOB: 2017,
  BLOB: 2019,
  CURSOR: 2021,
  BIND_IN: 3001,
  BIND_INOUT: 3002,
  BIND_OUT: 3003,
  fetchAsString: [],
  initOracleClient: jest.fn(),
}));

jest.mock('../../nodes/Oracle/core', () => ({
  OracleConnection: jest.fn(),
  OracleConnectionPool: {
    getPool: jest.fn(),
    getHighVolumeConfig: jest.fn().mockReturnValue({}),
    getOLTPConfig: jest.fn().mockReturnValue({}),
    getAnalyticsConfig: jest.fn().mockReturnValue({}),
  },
  PLSQLExecutorFactory: {
    createProductionExecutor: jest.fn(),
  },
  BulkOperationsFactory: {
    createHighVolumeOperations: jest.fn(),
  },
  TransactionManagerFactory: {
    createBatchManager: jest.fn(),
  },
  AQOperations: jest.fn(),
}));

describe('OracleDatabaseAdvanced', () => {
  let node: OracleDatabaseAdvanced;
  let mockConnection: { execute: jest.Mock; close: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  let mockPool: { getConnection: jest.Mock };

  beforeEach(() => {
    node = new OracleDatabaseAdvanced();

    mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [{ RESULT: 1 }] }),
      close: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    mockPool = { getConnection: jest.fn().mockResolvedValue(mockConnection) };

    (OracleConnection as unknown as jest.Mock).mockImplementation(() => ({
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    }));
    (OracleConnectionPool.getPool as jest.Mock).mockResolvedValue(mockPool);
  });

  describe('node description', () => {
    it('has correct name identifier', () => {
      expect(node.description.name).toBe('oracleDatabaseAdvanced');
    });
  });

  describe('execute() — query operation (pool)', () => {
    it('executes SQL query and returns rows', async () => {
      const mockFns = createMockExecuteFns({
        operationType: 'query',
        connectionPool: 'standard',
        statement: 'SELECT * FROM employees',
        params: {},
      });

      const result = await (node as any).execute.call(mockFns);

      expect(result).toHaveLength(1);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM employees',
        {},
        expect.objectContaining({ outFormat: 4, autoCommit: true }),
      );
    });
  });

  describe('execute() — query operation (single connection)', () => {
    it('creates direct OracleConnection when pool is single', async () => {
      const mockFns = createMockExecuteFns({
        operationType: 'query',
        connectionPool: 'single',
        statement: 'SELECT 1 FROM DUAL',
        params: {},
      });

      await (node as any).execute.call(mockFns);

      expect(OracleConnection).toHaveBeenCalled();
      expect(OracleConnectionPool.getPool).not.toHaveBeenCalled();
    });
  });

  describe('execute() — plsql operation', () => {
    it('calls PLSQLExecutorFactory and executes anonymous block', async () => {
      const mockExecutor = {
        executeAnonymousBlock: jest
          .fn()
          .mockResolvedValue({ success: true, outBinds: {}, implicitResults: [], warnings: [] }),
      };
      (PLSQLExecutorFactory.createProductionExecutor as jest.Mock).mockReturnValue(mockExecutor);

      const mockFns = createMockExecuteFns({
        operationType: 'plsql',
        connectionPool: 'standard',
        statement: 'BEGIN NULL; END;',
        params: {},
      });

      await (node as any).execute.call(mockFns);

      expect(PLSQLExecutorFactory.createProductionExecutor).toHaveBeenCalledWith(mockConnection);
      expect(mockExecutor.executeAnonymousBlock).toHaveBeenCalledWith('BEGIN NULL; END;', {});
    });

    it('procedure and function operations also route to executePLSQL', async () => {
      const mockExecutor = {
        executeAnonymousBlock: jest.fn().mockResolvedValue({ success: true, outBinds: {} }),
      };
      (PLSQLExecutorFactory.createProductionExecutor as jest.Mock).mockReturnValue(mockExecutor);

      for (const opType of ['procedure', 'function']) {
        jest.clearAllMocks();
        (OracleConnectionPool.getPool as jest.Mock).mockResolvedValue(mockPool);
        (PLSQLExecutorFactory.createProductionExecutor as jest.Mock).mockReturnValue(mockExecutor);

        const mockFns = createMockExecuteFns({
          operationType: opType,
          connectionPool: 'standard',
          statement: 'BEGIN my_proc(); END;',
          params: {},
        });

        await (node as any).execute.call(mockFns);
        expect(mockExecutor.executeAnonymousBlock).toHaveBeenCalled();
      }
    });
  });

  describe('execute() — bulk operation', () => {
    it('calls BulkOperationsFactory and bulk inserts input data', async () => {
      const mockBulkOps = {
        bulkInsert: jest.fn().mockResolvedValue({
          operation: 'INSERT',
          totalRows: 2,
          successfulRows: 2,
          failedRows: 0,
          batchCount: 1,
          duration: 10,
          errors: [],
        }),
      };
      (BulkOperationsFactory.createHighVolumeOperations as jest.Mock).mockReturnValue(mockBulkOps);

      const mockFns = createMockExecuteFns(
        { operationType: 'bulk', connectionPool: 'standard', bulkTableName: 'MY_TABLE', params: {} },
        DEFAULT_CREDENTIALS,
        [
          { json: { id: 1, name: 'Alice' }, pairedItem: { item: 0 } },
          { json: { id: 2, name: 'Bob' }, pairedItem: { item: 1 } },
        ],
      );

      await (node as any).execute.call(mockFns);

      expect(BulkOperationsFactory.createHighVolumeOperations).toHaveBeenCalledWith(mockConnection);
      expect(mockBulkOps.bulkInsert).toHaveBeenCalledWith(
        'MY_TABLE',
        [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
        expect.objectContaining({ batchSize: 5000 }),
      );
    });
  });

  describe('execute() — transaction operation', () => {
    it('calls TransactionManagerFactory and commits on success', async () => {
      const mockTxManager = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        executeBatch: jest.fn().mockResolvedValue([{ success: true, rowsAffected: 1 }]),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      (TransactionManagerFactory.createBatchManager as jest.Mock).mockReturnValue(mockTxManager);

      const mockFns = createMockExecuteFns({
        operationType: 'transaction',
        connectionPool: 'standard',
        statement: 'INSERT INTO t1 VALUES (1)',
        params: {},
      });

      await (node as any).execute.call(mockFns);

      expect(mockTxManager.beginTransaction).toHaveBeenCalled();
      expect(mockTxManager.commit).toHaveBeenCalled();
      expect(mockTxManager.rollback).not.toHaveBeenCalled();
    });

    it('rolls back on transaction error', async () => {
      const mockTxManager = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        executeBatch: jest.fn().mockRejectedValue(new Error('ORA-00001: constraint')),
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      (TransactionManagerFactory.createBatchManager as jest.Mock).mockReturnValue(mockTxManager);

      const mockFns = createMockExecuteFns({
        operationType: 'transaction',
        connectionPool: 'standard',
        statement: 'INSERT INTO t1 VALUES (1)',
        params: {},
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
      expect(mockTxManager.rollback).toHaveBeenCalled();
      expect(mockTxManager.commit).not.toHaveBeenCalled();
    });
  });

  describe('execute() — queue operation', () => {
    it('creates AQOperations and calls getQueueInfo', async () => {
      const mockAqOps = {
        getQueueInfo: jest.fn().mockResolvedValue({ queueName: 'TEST_Q', messageCount: 5 }),
      };
      (AQOperations as jest.Mock).mockImplementation(() => mockAqOps);

      const mockFns = createMockExecuteFns({
        operationType: 'queue',
        connectionPool: 'standard',
        queueName: 'TEST_Q',
        params: {},
      });

      await (node as any).execute.call(mockFns);

      expect(AQOperations).toHaveBeenCalledWith(mockConnection);
      expect(mockAqOps.getQueueInfo).toHaveBeenCalledWith('TEST_Q');
    });
  });

  describe('execute() — connection lifecycle', () => {
    it('closes connection after successful execution', async () => {
      const mockFns = createMockExecuteFns({
        operationType: 'query',
        connectionPool: 'standard',
        statement: 'SELECT 1 FROM DUAL',
        params: {},
      });
      await (node as any).execute.call(mockFns);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('closes connection even when operation throws', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-00942: table not found'));
      const mockFns = createMockExecuteFns({
        operationType: 'query',
        connectionPool: 'standard',
        statement: 'SELECT * FROM BAD_TABLE',
        params: {},
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
