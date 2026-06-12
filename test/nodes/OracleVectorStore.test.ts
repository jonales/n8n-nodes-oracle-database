import { OracleVectorStore } from '../../nodes/Oracle/OracleVectorStore.node';
import { OracleConnectionPool } from '../../nodes/Oracle/core';
import { DEFAULT_CREDENTIALS, createMockExecuteFns } from '../helpers/mock-execute-fns';

jest.mock('oracledb', () => ({
  OUT_FORMAT_OBJECT: 4,
  STRING: 2001,
  NUMBER: 2010,
  CLOB: 2017,
  fetchAsString: [],
  initOracleClient: jest.fn(),
}));

jest.mock('../../nodes/Oracle/core', () => ({
  OracleConnectionPool: {
    getPool: jest.fn(),
  },
}));

describe('OracleVectorStore', () => {
  let node: OracleVectorStore;
  let mockConnection: { execute: jest.Mock; close: jest.Mock; commit: jest.Mock };
  let mockPool: { getConnection: jest.Mock };

  beforeEach(() => {
    node = new OracleVectorStore();

    mockConnection = {
      execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
      close: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    mockPool = { getConnection: jest.fn().mockResolvedValue(mockConnection) };
    (OracleConnectionPool.getPool as jest.Mock).mockResolvedValue(mockPool);
  });

  describe('node description', () => {
    it('has correct name identifier', () => {
      expect(node.description.name).toBe('oracleVectorStore');
    });
  });

  describe('execute() — setup operation', () => {
    it('creates table and index, then commits', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        collectionName: 'DOCS',
        vectorDimension: 1536,
      });

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(result[0][0].json).toMatchObject({ success: true, operation: 'setup' });
    });

    it('throws for invalid collection name', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        collectionName: '123invalid',
        vectorDimension: 1536,
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
    });

    it('throws for invalid vector dimension (zero)', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        collectionName: 'VALID_NAME',
        vectorDimension: 0,
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
    });
  });

  describe('execute() — addDocument operation', () => {
    it('inserts document with valid embedding', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const mockFns = createMockExecuteFns(
        { operation: 'addDocument', collectionName: 'DOCS' },
        DEFAULT_CREDENTIALS,
        [{ json: { id: 'doc-1', content: 'Hello world', embedding }, pairedItem: { item: 0 } }],
      );

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO DOCS'),
        expect.objectContaining({
          id: 'doc-1',
          content: 'Hello world',
          embedding: expect.objectContaining({ val: embedding }),
        }),
        expect.any(Object),
      );
      expect(result[0][0].json).toMatchObject({ success: true, operation: 'addDocument' });
    });

    it('returns success=false when embedding is missing', async () => {
      const mockFns = createMockExecuteFns(
        { operation: 'addDocument', collectionName: 'DOCS' },
        DEFAULT_CREDENTIALS,
        [{ json: { id: 'doc-1', content: 'No embedding here' }, pairedItem: { item: 0 } }],
      );

      const result = await (node as any).execute.call(mockFns);
      expect(result[0][0].json.success).toBe(false);
      expect(result[0][0].json.error).toContain('Embedding');
    });

    it('throws when no input data is provided', async () => {
      const mockFns = createMockExecuteFns(
        { operation: 'addDocument', collectionName: 'DOCS' },
        DEFAULT_CREDENTIALS,
        [],
      );

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
    });
  });

  describe('execute() — searchSimilarity operation', () => {
    it('queries with vector and returns rows', async () => {
      mockConnection.execute.mockResolvedValue({
        rows: [{ ID: 'doc-1', CONTENT: 'Hello', DISTANCE: 0.1, SIMILARITY: 0.9 }],
      });

      const mockFns = createMockExecuteFns({
        operation: 'searchSimilarity',
        collectionName: 'DOCS',
        searchVector: '[0.1, 0.2, 0.3]',
        limit: 10,
        threshold: 0.7,
        distanceMetric: 'COSINE',
      });

      const result = await (node as any).execute.call(mockFns);
      expect(mockConnection.execute).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('throws for invalid JSON search vector', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'searchSimilarity',
        collectionName: 'DOCS',
        searchVector: 'not-json',
        limit: 10,
        threshold: 0.7,
        distanceMetric: 'COSINE',
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
    });
  });

  describe('execute() — connection lifecycle', () => {
    it('closes connection after successful execution', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        collectionName: 'DOCS',
        vectorDimension: 1536,
      });
      await (node as any).execute.call(mockFns);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('closes connection even when operation throws', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-00942: table not found'));
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        collectionName: 'DOCS',
        vectorDimension: 1536,
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('acquires connection from pool using correct credentials', async () => {
      const creds = { ...DEFAULT_CREDENTIALS, thinMode: false, libDir: '/opt/oracle' };
      const mockFns = createMockExecuteFns(
        { operation: 'setup', collectionName: 'DOCS', vectorDimension: 128 },
        creds,
      );
      await (node as any).execute.call(mockFns);

      expect(OracleConnectionPool.getPool).toHaveBeenCalledWith(
        expect.objectContaining({ thinMode: false, libDir: '/opt/oracle' }),
      );
    });
  });
});
