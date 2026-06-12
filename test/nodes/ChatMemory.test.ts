import { OracleChatMemory } from '../../nodes/Oracle/ChatMemory.node';
import { OracleConnectionPool } from '../../nodes/Oracle/core';
import { DEFAULT_CREDENTIALS, createMockExecuteFns } from '../helpers/mock-execute-fns';

jest.mock('oracledb', () => ({
  OUT_FORMAT_OBJECT: 4,
  STRING: 2001,
  CLOB: 2017,
  fetchAsString: [],
  initOracleClient: jest.fn(),
}));

jest.mock('../../nodes/Oracle/core', () => ({
  OracleConnectionPool: {
    getPool: jest.fn(),
  },
}));

describe('OracleChatMemory', () => {
  let node: OracleChatMemory;
  let mockConnection: { execute: jest.Mock; close: jest.Mock; commit: jest.Mock };
  let mockPool: { getConnection: jest.Mock };

  beforeEach(() => {
    node = new OracleChatMemory();

    mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [], rowsAffected: 1 }),
      close: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    mockPool = { getConnection: jest.fn().mockResolvedValue(mockConnection) };
    (OracleConnectionPool.getPool as jest.Mock).mockResolvedValue(mockPool);
  });

  describe('node description', () => {
    it('has correct name identifier', () => {
      expect(node.description.name).toBe('oracleChatMemory');
    });
  });

  describe('execute() — setup operation', () => {
    it('creates table and index then commits', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        sessionId: '',
        memoryType: 'user',
        tableName: 'CHAT_MEMORY',
      });

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(result[0][0].json).toMatchObject({ success: true, operation: 'setup' });
    });
  });

  describe('execute() — addMessage operation', () => {
    it('inserts message from input data', async () => {
      mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const mockFns = createMockExecuteFns(
        {
          operation: 'addMessage',
          sessionId: 'session-123',
          memoryType: 'user',
          tableName: 'CHAT_MEMORY',
        },
        DEFAULT_CREDENTIALS,
        [{ json: { content: 'Hello, how are you?' }, pairedItem: { item: 0 } }],
      );

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO CHAT_MEMORY'),
        expect.objectContaining({
          sessionId: 'session-123',
          messageType: 'user',
          content: 'Hello, how are you?',
        }),
        expect.any(Object),
      );
      expect(result[0][0].json).toMatchObject({ success: true, operation: 'addMessage' });
    });

    it('throws when no input data is provided', async () => {
      const mockFns = createMockExecuteFns(
        { operation: 'addMessage', sessionId: 'session-123', memoryType: 'user', tableName: 'CHAT_MEMORY' },
        DEFAULT_CREDENTIALS,
        [],
      );

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
    });
  });

  describe('execute() — getMessages operation', () => {
    it('selects messages by session ID and maps to camelCase', async () => {
      mockConnection.execute.mockResolvedValue({
        rows: [
          {
            ID: 1,
            SESSION_ID: 'session-123',
            MESSAGE_TYPE: 'user',
            CONTENT: 'Hello',
            TIMESTAMP_CREATED: new Date('2024-01-01'),
            METADATA: '{"key":"val"}',
          },
        ],
      });

      const mockFns = createMockExecuteFns({
        operation: 'getMessages',
        sessionId: 'session-123',
        tableName: 'CHAT_MEMORY',
      });

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = :sessionId'),
        { sessionId: 'session-123' },
        expect.any(Object),
      );
      expect(result[0][0].json).toMatchObject({
        id: 1,
        sessionId: 'session-123',
        messageType: 'user',
        metadata: { key: 'val' },
      });
    });
  });

  describe('execute() — clearMemory operation', () => {
    it('deletes messages for given session', async () => {
      mockConnection.execute.mockResolvedValue({ rowsAffected: 3 });

      const mockFns = createMockExecuteFns({
        operation: 'clearMemory',
        sessionId: 'session-123',
        tableName: 'CHAT_MEMORY',
      });

      const result = await (node as any).execute.call(mockFns);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM CHAT_MEMORY'),
        { sessionId: 'session-123' },
        expect.any(Object),
      );
      expect(result[0][0].json).toMatchObject({ success: true, messagesDeleted: 3 });
    });
  });

  describe('execute() — getSummary operation', () => {
    it('returns message count summary', async () => {
      mockConnection.execute.mockResolvedValue({
        rows: [{
          TOTAL_MESSAGES: 10,
          USER_MESSAGES: 5,
          ASSISTANT_MESSAGES: 4,
          SYSTEM_MESSAGES: 1,
          FIRST_MESSAGE: new Date('2024-01-01'),
          LAST_MESSAGE: new Date('2024-01-02'),
        }],
      });

      const mockFns = createMockExecuteFns({
        operation: 'getSummary',
        sessionId: 'session-123',
        tableName: 'CHAT_MEMORY',
      });

      const result = await (node as any).execute.call(mockFns);

      expect(result[0][0].json).toMatchObject({
        sessionId: 'session-123',
        totalMessages: 10,
        userMessages: 5,
        assistantMessages: 4,
        systemMessages: 1,
      });
    });
  });

  describe('execute() — connection lifecycle', () => {
    it('closes connection after successful execution', async () => {
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        sessionId: '',
        memoryType: 'user',
        tableName: 'CHAT_MEMORY',
      });
      await (node as any).execute.call(mockFns);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('closes connection even when operation throws', async () => {
      mockConnection.execute.mockRejectedValue(new Error('ORA-00942: table not found'));
      const mockFns = createMockExecuteFns({
        operation: 'setup',
        sessionId: '',
        memoryType: 'user',
        tableName: 'CHAT_MEMORY',
      });

      await expect((node as any).execute.call(mockFns)).rejects.toThrow();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
