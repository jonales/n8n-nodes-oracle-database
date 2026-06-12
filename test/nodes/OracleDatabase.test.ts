import { OracleDatabase } from '../../nodes/Oracle/OracleDatabase.node';
import { OracleConnection } from '../../nodes/Oracle/core';
import { DEFAULT_CREDENTIALS, createMockExecuteFns } from '../helpers/mock-execute-fns';

jest.mock('oracledb', () => ({
  NUMBER: 2010,
  STRING: 2001,
  OUT_FORMAT_OBJECT: 4,
  CLOB: 2017,
  BLOB: 2019,
  CURSOR: 2021,
  BIND_OUT: 3003,
  fetchAsString: [],
  initOracleClient: jest.fn(),
}));

jest.mock('../../nodes/Oracle/core', () => ({
  OracleConnection: jest.fn(),
}));

describe('OracleDatabase', () => {
  let node: OracleDatabase;
  let mockConnection: { execute: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    node = new OracleDatabase();
    mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [{ ID: 1, NAME: 'Alice' }] }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (OracleConnection as jest.Mock).mockImplementation(() => ({
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    }));
  });

  describe('node description', () => {
    it('has correct name identifier', () => {
      expect(node.description.name).toBe('oracleDatabase');
    });

    it('has required credential', () => {
      expect(node.description.credentials![0].name).toBe('oracleCredentials');
    });
  });

  describe('execute() — simple SELECT', () => {
    it('returns rows from query result', async () => {
      const mockFns = createMockExecuteFns({ query: 'SELECT id, name FROM users', params: {} });
      const result = await (node as any).execute.call(mockFns);

      expect(result).toHaveLength(1);
      expect(mockFns.helpers.returnJsonArray).toHaveBeenCalledWith([{ ID: 1, NAME: 'Alice' }]);
    });

    it('calls connection.execute with correct SQL and options', async () => {
      const mockFns = createMockExecuteFns({ query: 'SELECT 1 FROM DUAL', params: {} });
      await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT 1 FROM DUAL',
        {},
        { outFormat: 4, autoCommit: true },
      );
    });

    it('returns empty array when rows is empty', async () => {
      mockConnection.execute.mockResolvedValue({ rows: [] });
      const mockFns = createMockExecuteFns({ query: 'SELECT 1 FROM DUAL WHERE 1=0', params: {} });

      const result = await (node as any).execute.call(mockFns);
      expect(result).toEqual([[]]);
    });

    it('uses rows ?? [] when rows is null/undefined', async () => {
      mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });
      const mockFns = createMockExecuteFns({ query: 'UPDATE t SET x=1', params: {} });

      await (node as any).execute.call(mockFns);
      expect(mockFns.helpers.returnJsonArray).toHaveBeenCalledWith([]);
    });
  });

  describe('execute() — connection lifecycle', () => {
    it('closes connection after successful execution', async () => {
      const mockFns = createMockExecuteFns({ query: 'SELECT 1 FROM DUAL', params: {} });
      await (node as any).execute.call(mockFns);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('closes connection even when execute throws', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-00942: table not found'));
      const mockFns = createMockExecuteFns({ query: 'SELECT * FROM BAD_TABLE', params: {} });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('execute() — OracleConnection mode', () => {
    it('uses thin mode by default', async () => {
      const mockFns = createMockExecuteFns({ query: 'SELECT 1 FROM DUAL', params: {} });
      await (node as any).execute.call(mockFns);

      expect(OracleConnection).toHaveBeenCalledWith(
        expect.objectContaining({ thinMode: true }),
        expect.objectContaining({ mode: 'thin' }),
      );
    });

    it('uses thick mode when thinMode is false', async () => {
      const creds = { ...DEFAULT_CREDENTIALS, thinMode: false, libDir: '/opt/oracle' };
      const mockFns = createMockExecuteFns({ query: 'SELECT 1 FROM DUAL', params: {} }, creds);
      await (node as any).execute.call(mockFns);

      expect(OracleConnection).toHaveBeenCalledWith(
        expect.objectContaining({ thinMode: false }),
        expect.objectContaining({ mode: 'thick', libDir: '/opt/oracle' }),
      );
    });
  });

  describe('execute() — bind parameters', () => {
    it('binds a number parameter', async () => {
      const mockFns = createMockExecuteFns({
        query: 'SELECT * FROM users WHERE id = :userId',
        params: {
          values: [{ name: 'userId', value: '42', datatype: 'number', parseInStatement: false }],
        },
      });
      await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = :userId',
        expect.objectContaining({ userId: expect.objectContaining({ val: 42 }) }),
        expect.any(Object),
      );
    });

    it('binds a string parameter', async () => {
      const mockFns = createMockExecuteFns({
        query: 'SELECT * FROM users WHERE name = :uname',
        params: {
          values: [{ name: 'uname', value: 'Alice', datatype: 'string', parseInStatement: false }],
        },
      });
      await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = :uname',
        expect.objectContaining({ uname: expect.objectContaining({ val: 'Alice' }) }),
        expect.any(Object),
      );
    });

    it('expands IN-statement param into individual binds and rewrites query', async () => {
      const mockFns = createMockExecuteFns({
        query: 'SELECT * FROM users WHERE id IN :ids',
        params: {
          values: [{ name: 'ids', value: '1,2,3', datatype: 'number', parseInStatement: true }],
        },
      });
      await (node as any).execute.call(mockFns);

      const [calledQuery, calledBinds] = mockConnection.execute.mock.calls[0];
      expect(calledQuery).not.toContain(':ids');
      expect(calledQuery).toContain('(');
      expect(Object.keys(calledBinds)).toHaveLength(3);
    });
  });
});
