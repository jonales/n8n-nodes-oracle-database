import { TransactionManager, TransactionManagerFactory } from '../../nodes/Oracle/core/transactionManager';

describe('TransactionManager', () => {
  let mockConnection: {
    execute: jest.Mock;
    commit: jest.Mock;
    rollback: jest.Mock;
  };

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('beginTransaction()', () => {
    it('marks transaction as active', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      expect(tm.getTransactionInfo().isActive).toBe(true);
    });

    it('throws when transaction is already active', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await expect(tm.beginTransaction()).rejects.toThrow('Transação já está ativa');
    });

    it('records start time', async () => {
      const before = Date.now();
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      const info = tm.getTransactionInfo();
      expect(info.startTime?.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('commit()', () => {
    it('calls connection.commit and clears active state', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.commit();

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(tm.getTransactionInfo().isActive).toBe(false);
    });

    it('throws when no transaction is active', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await expect(tm.commit()).rejects.toThrow('Nenhuma transação ativa para commit');
    });

    it('clears savepoints after commit', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.createSavepoint('SP1');
      await tm.commit();
      expect(tm.getTransactionInfo().savepoints).toHaveLength(0);
    });
  });

  describe('rollback()', () => {
    it('calls connection.rollback and clears active state', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.rollback();

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(tm.getTransactionInfo().isActive).toBe(false);
    });

    it('throws when no transaction is active', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await expect(tm.rollback()).rejects.toThrow('Nenhuma transação ativa para rollback');
    });
  });

  describe('createSavepoint()', () => {
    it('executes SAVEPOINT SQL and tracks savepoint info', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.createSavepoint('MY_SP');

      expect(mockConnection.execute).toHaveBeenCalledWith('SAVEPOINT MY_SP');
      expect(tm.getTransactionInfo().savepoints).toHaveLength(1);
      expect(tm.getTransactionInfo().savepoints[0].name).toBe('MY_SP');
    });

    it('throws when there is no active transaction', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await expect(tm.createSavepoint('SP1')).rejects.toThrow('Nenhuma transação ativa');
    });

    it('throws on duplicate savepoint name', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.createSavepoint('SP1');
      await expect(tm.createSavepoint('SP1')).rejects.toThrow("Savepoint 'SP1' já existe");
    });

    it('throws for invalid savepoint name (starts with digit)', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await expect(tm.createSavepoint('1bad')).rejects.toThrow('Nome do savepoint inválido');
    });

    it('throws for savepoint name with special chars', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await expect(tm.createSavepoint('bad-name')).rejects.toThrow('Nome do savepoint inválido');
    });
  });

  describe('rollbackToSavepoint()', () => {
    it('rolls back to named savepoint', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await tm.createSavepoint('SP1');
      await tm.createSavepoint('SP2');
      await tm.rollbackToSavepoint('SP1');

      expect(mockConnection.execute).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT SP1');
      expect(tm.getTransactionInfo().savepoints).toHaveLength(1);
    });

    it('throws when savepoint does not exist', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();
      await expect(tm.rollbackToSavepoint('NONEXISTENT')).rejects.toThrow(
        "Savepoint 'NONEXISTENT' não encontrado",
      );
    });
  });

  describe('executeBatch()', () => {
    it('executes all operations and returns success results', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();

      const results = await tm.executeBatch([
        { sql: 'INSERT INTO t1 VALUES (1)' },
        { sql: 'INSERT INTO t1 VALUES (2)' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('begins transaction automatically if not active', async () => {
      const tm = new TransactionManager(mockConnection as any);
      await tm.executeBatch([{ sql: 'SELECT 1 FROM DUAL' }]);
      expect(tm.getTransactionInfo().isActive).toBe(true);
    });

    it('stops on first error when stopOnError is true', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('ORA-00001: unique constraint'));

      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();

      await expect(
        tm.executeBatch(
          [{ sql: 'INSERT INTO t1 VALUES (1)' }, { sql: 'INSERT INTO t1 VALUES (2)' }],
          { stopOnError: true },
        ),
      ).rejects.toThrow('unique constraint');

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
    });

    it('continues after error when stopOnError is false', async () => {
      mockConnection.execute
        .mockRejectedValueOnce(new Error('ORA-00001: unique constraint'))
        .mockResolvedValueOnce({ rowsAffected: 1 });

      const tm = new TransactionManager(mockConnection as any);
      await tm.beginTransaction();

      const results = await tm.executeBatch(
        [{ sql: 'INSERT INTO t1 VALUES (1)' }, { sql: 'INSERT INTO t1 VALUES (2)' }],
        { stopOnError: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe('getTransactionInfo()', () => {
    it('returns correct initial state', () => {
      const tm = new TransactionManager(mockConnection as any);
      const info = tm.getTransactionInfo();
      expect(info.isActive).toBe(false);
      expect(info.savepoints).toHaveLength(0);
    });
  });
});

describe('TransactionManagerFactory', () => {
  let mockConnection: { execute: jest.Mock; commit: jest.Mock; rollback: jest.Mock };

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
  });

  it('createBatchManager returns TransactionManager with batch options', () => {
    const tm = TransactionManagerFactory.createBatchManager(mockConnection as any);
    expect(tm).toBeInstanceOf(TransactionManager);
    expect(tm.getTransactionInfo().options.timeout).toBe(1800);
  });

  it('createOLTPManager returns TransactionManager with OLTP options', () => {
    const tm = TransactionManagerFactory.createOLTPManager(mockConnection as any);
    expect(tm).toBeInstanceOf(TransactionManager);
    expect(tm.getTransactionInfo().options.timeout).toBe(30);
  });
});
