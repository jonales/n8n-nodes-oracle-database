import { PLSQLExecutor, PLSQLExecutorFactory } from '../../nodes/Oracle/core/plsqlExecutor';

jest.mock('oracledb', () => ({
  OUT_FORMAT_OBJECT: 4,
  STRING: 2001,
  NUMBER: 2010,
  DATE: 2011,
  CLOB: 2017,
  BLOB: 2019,
  CURSOR: 2021,
  BIND_IN: 3001,
  BIND_INOUT: 3002,
  BIND_OUT: 3003,
  fetchAsString: [],
}));

describe('PLSQLExecutor', () => {
  let mockConnection: { execute: jest.Mock };

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn().mockResolvedValue({
        outBinds: {},
        rowsAffected: 0,
        implicitResults: undefined,
      }),
    };
  });

  describe('validatePLSQLBlock (via executeAnonymousBlock)', () => {
    it('throws when block does not start with BEGIN or DECLARE', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await expect(
        executor.executeAnonymousBlock('SELECT 1 FROM DUAL'),
      ).rejects.toThrow('Bloco PL/SQL deve começar com BEGIN ou DECLARE');
    });

    it('throws when block does not end with END;', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await expect(
        executor.executeAnonymousBlock('BEGIN NULL'),
      ).rejects.toThrow('Bloco PL/SQL deve terminar com END;');
    });

    it('throws when BEGIN/END are unbalanced', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await expect(
        executor.executeAnonymousBlock('BEGIN BEGIN NULL; END;'),
      ).rejects.toThrow('Desbalanceamento de BEGIN/END');
    });

    it('accepts a valid DECLARE...BEGIN...END block', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock('DECLARE v NUMBER; BEGIN NULL; END;');
      expect(result.success).toBe(true);
    });

    it('accepts a simple BEGIN...END; block', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock('BEGIN NULL; END;');
      expect(result.success).toBe(true);
    });
  });

  describe('executeAnonymousBlock() — success path', () => {
    const validBlock = 'BEGIN NULL; END;';

    it('calls connection.execute with the block and binds', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await executor.executeAnonymousBlock(validBlock, { myParam: 'value' });

      expect(mockConnection.execute).toHaveBeenCalledWith(
        validBlock,
        expect.objectContaining({ myParam: 'value' }),
        expect.any(Object),
      );
    });

    it('returns success: true with execution metadata', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock(validBlock);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.outBinds).toEqual({});
      expect(result.implicitResults).toEqual([]);
      expect(result.warnings).toHaveLength(0);
      expect(result.compilationErrors).toHaveLength(0);
    });

    it('returns outBinds from connection result', async () => {
      mockConnection.execute.mockResolvedValue({
        outBinds: { result: 'OK' },
        rowsAffected: 0,
      });
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock(validBlock);
      expect(result.outBinds).toEqual({ result: 'OK' });
    });

    it('returns rowsAffected from connection result', async () => {
      mockConnection.execute.mockResolvedValue({ outBinds: {}, rowsAffected: 3 });
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock(validBlock);
      expect(result.rowsAffected).toBe(3);
    });
  });

  describe('executeAnonymousBlock() — error path', () => {
    it('returns success: false when connection.execute throws', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-06550: compilation error'));
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock('BEGIN NULL; END;');

      expect(result.success).toBe(false);
      expect(result.warnings[0]).toContain('ORA-06550');
    });
  });

  describe('executeAnonymousBlock() — output parameter detection', () => {
    it('auto-detects := assignment params and adds BIND_OUT', async () => {
      const block = 'BEGIN :result := 42; END;';
      const executor = new PLSQLExecutor(mockConnection as any);
      await executor.executeAnonymousBlock(block, {});

      const calledBinds = mockConnection.execute.mock.calls[0][1];
      expect(calledBinds).toHaveProperty('result');
      expect(calledBinds.result).toMatchObject({ dir: 3003 }); // BIND_OUT = 3003
    });

    it('does not override an explicitly provided bind', async () => {
      const block = 'BEGIN :result := 42; END;';
      const userBind = { result: { dir: 3001, type: 2001, val: 'explicit' } }; // BIND_IN
      const executor = new PLSQLExecutor(mockConnection as any);
      await executor.executeAnonymousBlock(block, userBind);

      const calledBinds = mockConnection.execute.mock.calls[0][1];
      expect(calledBinds.result.dir).toBe(3001); // original not overridden
    });
  });

  describe('executeAnonymousBlock() — implicit results', () => {
    it('processes implicit result cursors and closes them', async () => {
      const cursor = {
        getRow: jest.fn()
          .mockResolvedValueOnce({ ID: 1 })
          .mockResolvedValueOnce({ ID: 2 })
          .mockResolvedValueOnce(null),
        close: jest.fn().mockResolvedValue(undefined),
      };
      mockConnection.execute.mockResolvedValue({
        outBinds: {},
        rowsAffected: 0,
        implicitResults: [cursor],
      });

      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeAnonymousBlock('BEGIN NULL; END;');

      expect(result.implicitResults).toHaveLength(1);
      expect(result.implicitResults[0]).toEqual([{ ID: 1 }, { ID: 2 }]);
      expect(cursor.close).toHaveBeenCalled();
    });
  });

  describe('executeBatch()', () => {
    it('executes anonymous blocks in sequence', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      const results = await executor.executeBatch([
        { type: 'anonymous', sql: 'BEGIN NULL; END;' },
        { type: 'anonymous', sql: 'BEGIN NULL; END;' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('stops on first failure when stopOnError is true', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-06550'));
      const executor = new PLSQLExecutor(mockConnection as any);
      const results = await executor.executeBatch(
        [
          { type: 'anonymous', sql: 'BEGIN NULL; END;' },
          { type: 'anonymous', sql: 'BEGIN NULL; END;' },
        ],
        { stopOnError: true },
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
    });

    it('continues after failure when stopOnError is false', async () => {
      mockConnection.execute
        .mockRejectedValueOnce(new Error('ORA-06550'))
        .mockResolvedValueOnce({ outBinds: {}, rowsAffected: 0 });

      const executor = new PLSQLExecutor(mockConnection as any);
      const results = await executor.executeBatch(
        [
          { type: 'anonymous', sql: 'BEGIN NULL; END;' },
          { type: 'anonymous', sql: 'BEGIN NULL; END;' },
        ],
        { stopOnError: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe('executeDynamicPLSQL()', () => {
    it('replaces template placeholders and executes block', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      const result = await executor.executeDynamicPLSQL(
        'BEGIN INSERT INTO ${tableName} VALUES (1); END;',
        { tableName: 'MY_TABLE' },
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'BEGIN INSERT INTO MY_TABLE VALUES (1); END;',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('throws when dynamic SQL contains DROP TABLE', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await expect(
        executor.executeDynamicPLSQL(
          'BEGIN DROP TABLE ${tableName}; END;',
          { tableName: 'MY_TABLE' },
        ),
      ).rejects.toThrow('padrão perigoso');
    });

    it('throws when dynamic SQL contains TRUNCATE', async () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      await expect(
        executor.executeDynamicPLSQL(
          'BEGIN TRUNCATE TABLE ${tbl}; END;',
          { tbl: 'MY_TABLE' },
        ),
      ).rejects.toThrow('padrão perigoso');
    });
  });

  describe('setDebugMode()', () => {
    it('can be toggled without throwing', () => {
      const executor = new PLSQLExecutor(mockConnection as any);
      expect(() => executor.setDebugMode(true)).not.toThrow();
      expect(() => executor.setDebugMode(false)).not.toThrow();
    });
  });
});

describe('PLSQLExecutorFactory', () => {
  const mockConnection = {} as any;

  it('createProductionExecutor returns a PLSQLExecutor', () => {
    const executor = PLSQLExecutorFactory.createProductionExecutor(mockConnection);
    expect(executor).toBeInstanceOf(PLSQLExecutor);
  });

  it('createDevelopmentExecutor returns a PLSQLExecutor', () => {
    const executor = PLSQLExecutorFactory.createDevelopmentExecutor(mockConnection);
    expect(executor).toBeInstanceOf(PLSQLExecutor);
  });
});
