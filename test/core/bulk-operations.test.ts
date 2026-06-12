import {
  BulkOperations,
  BulkOperationsFactory,
} from '../../nodes/Oracle/core/bulkOperations';

describe('BulkOperations', () => {
  let mockConnection: {
    executeMany: jest.Mock;
    execute: jest.Mock;
    commit: jest.Mock;
  };

  beforeEach(() => {
    mockConnection = {
      executeMany: jest.fn().mockResolvedValue({ batchErrors: [] }),
      execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
      commit: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('bulkInsert()', () => {
    const sampleData = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];

    it('returns correct operation result', async () => {
      const ops = new BulkOperations(mockConnection as any);
      const result = await ops.bulkInsert('USERS', sampleData);

      expect(result.operation).toBe('INSERT');
      expect(result.totalRows).toBe(2);
      expect(result.successfulRows).toBe(2);
      expect(result.failedRows).toBe(0);
      expect(result.batchCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('calls executeMany with Oracle positional placeholders and row arrays', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await ops.bulkInsert('USERS', sampleData);

      expect(mockConnection.executeMany).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO USERS.*:1.*:2/s),
        [[1, 'Alice'], [2, 'Bob']],
        expect.any(Object),
      );
    });

    it('commits after each batch when autoCommit is true', async () => {
      const ops = new BulkOperations(mockConnection as any, 1);
      await ops.bulkInsert('USERS', sampleData, { autoCommit: true });
      expect(mockConnection.commit).toHaveBeenCalledTimes(2);
    });

    it('does not commit per-batch when autoCommit is false', async () => {
      const ops = new BulkOperations(mockConnection as any, 1);
      await ops.bulkInsert('USERS', sampleData, { autoCommit: false });
      // Final commit is called since there were successes
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    });

    it('processes data in correct number of batches', async () => {
      const largeData = Array.from({ length: 250 }, (_, i) => ({ id: i, name: `User${i}` }));
      const ops = new BulkOperations(mockConnection as any, 100);
      const result = await ops.bulkInsert('USERS', largeData);

      expect(mockConnection.executeMany).toHaveBeenCalledTimes(3);
      expect(result.batchCount).toBe(3);
      expect(result.totalRows).toBe(250);
    });

    it('throws when data array is empty', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(ops.bulkInsert('USERS', [])).rejects.toThrow(
        'Dados para inserção não podem estar vazios',
      );
    });

    it('throws when row is missing a column (validateDataStructure)', async () => {
      const ops = new BulkOperations(mockConnection as any);
      const badData = [{ id: 1, name: 'Alice' }, { id: 2 } as any];
      await expect(ops.bulkInsert('USERS', badData)).rejects.toThrow("coluna 'name' não encontrada");
    });

    it('collects errors and continues when continueOnError is true and executeMany throws', async () => {
      mockConnection.executeMany.mockRejectedValue(new Error('ORA-00001: unique constraint'));
      const ops = new BulkOperations(mockConnection as any);
      const result = await ops.bulkInsert('USERS', sampleData, { continueOnError: true });

      expect(result.errors).toHaveLength(1);
      expect(result.failedRows).toBe(2);
      expect(result.successfulRows).toBe(0);
    });

    it('throws on first batch error when continueOnError is false', async () => {
      mockConnection.executeMany.mockRejectedValue(new Error('ORA-00001: unique constraint'));
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkInsert('USERS', sampleData, { continueOnError: false }),
      ).rejects.toThrow('Erro no lote 1');
    });

    it('tracks batchErrors from executeMany result', async () => {
      mockConnection.executeMany.mockResolvedValue({
        batchErrors: [{ offset: 0, error: { message: 'duplicate key' } }],
      });
      const ops = new BulkOperations(mockConnection as any);
      const result = await ops.bulkInsert('USERS', sampleData, { continueOnError: true });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].batchIndex).toBe(0);
    });
  });

  describe('bulkUpdate()', () => {
    it('requires whereColumns to be non-empty', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkUpdate('USERS', [{ id: 1, name: 'New' }], { whereColumns: [] }),
      ).rejects.toThrow('whereColumns deve ser especificado para bulk update');
    });

    it('throws when data is empty', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkUpdate('USERS', [], { whereColumns: ['id'] }),
      ).rejects.toThrow('Dados para atualização não podem estar vazios');
    });

    it('returns UPDATE result with correct totals', async () => {
      const ops = new BulkOperations(mockConnection as any);
      const result = await ops.bulkUpdate(
        'USERS',
        [{ id: 1, name: 'Updated Alice' }],
        { whereColumns: ['id'] },
      );

      expect(result.operation).toBe('UPDATE');
      expect(result.totalRows).toBe(1);
      expect(result.successfulRows).toBe(1);
    });

    it('throws when no columns remain after excluding where columns', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkUpdate('USERS', [{ id: 1 }], { whereColumns: ['id'] }),
      ).rejects.toThrow('Nenhuma coluna para atualizar encontrada');
    });
  });

  describe('bulkDelete()', () => {
    it('requires whereColumns to be non-empty', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkDelete('USERS', [{ id: 1 }], { whereColumns: [] }),
      ).rejects.toThrow('whereColumns deve ser especificado para bulk delete');
    });

    it('throws when data is empty', async () => {
      const ops = new BulkOperations(mockConnection as any);
      await expect(
        ops.bulkDelete('USERS', [], { whereColumns: ['id'] }),
      ).rejects.toThrow('Dados para exclusão não podem estar vazios');
    });

    it('returns DELETE result with correct totals', async () => {
      const ops = new BulkOperations(mockConnection as any);
      const result = await ops.bulkDelete(
        'USERS',
        [{ id: 1 }, { id: 2 }],
        { whereColumns: ['id'] },
      );

      expect(result.operation).toBe('DELETE');
      expect(result.totalRows).toBe(2);
      expect(result.successfulRows).toBe(2);
    });
  });
});

describe('BulkOperationsFactory', () => {
  const mockConnection = {} as any;

  it('createHighVolumeOperations returns BulkOperations with batch size 5000', () => {
    const ops = BulkOperationsFactory.createHighVolumeOperations(mockConnection);
    expect(ops).toBeInstanceOf(BulkOperations);
    expect(ops.getPerformanceStats().defaultBatchSize).toBe(5000);
  });

  it('createFastOperations returns BulkOperations with batch size 10000', () => {
    const ops = BulkOperationsFactory.createFastOperations(mockConnection);
    expect(ops.getPerformanceStats().defaultBatchSize).toBe(10000);
  });

  it('createConservativeOperations returns BulkOperations with batch size 500', () => {
    const ops = BulkOperationsFactory.createConservativeOperations(mockConnection);
    expect(ops.getPerformanceStats().defaultBatchSize).toBe(500);
  });
});
