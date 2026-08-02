import {
	AIMessage,
	HumanMessage,
	SystemMessage,
	BaseMessage,
} from '@langchain/core/messages';
import { IExecuteFunctions, INode, INodeType, NodeOperationError } from 'n8n-workflow';
import { OracleChatMessageHistory, ChatMemory } from '../../nodes/Oracle/ChatMemory.node';
import { OracleConnectionPool } from '../../nodes/Oracle/core';
import { createMockExecuteFns, DEFAULT_CREDENTIALS } from '../helpers/mock-execute-fns';

// Mock oracledb and the connection pool
jest.mock('oracledb', () => ({
	getPool: jest.fn(),
	getConnection: jest.fn(),
	initOracleClient: jest.fn(),
	OUT_FORMAT_OBJECT: 4,
	STRING: 2001,
}));

jest.mock('../../nodes/Oracle/core/connectionPool', () => ({
	OracleConnectionPool: {
		getPool: jest.fn(),
	},
}));

const mockNode = {
	getCredentials: jest.fn(),
	getNode: jest.fn(),
	getNodeParameter: jest.fn(),
	getWorkflow: jest.fn(),
	createNode: jest.fn(),
} as unknown as INode;

describe('ChatMemory Node', () => {
	let node: ChatMemory;
	let mockPool: { getConnection: jest.Mock };

	beforeEach(() => {
		node = new ChatMemory();
		mockPool = { getConnection: jest.fn() };
		(OracleConnectionPool.getPool as jest.Mock).mockResolvedValue(mockPool);
		jest.clearAllMocks();
	});

	it('should have a correct description', () => {
		expect(node.description.name).toBe('oracleChatMemory');
		expect(node.description.group).toContain('memory');
		expect(node.description.inputs).toEqual([]);
		expect(node.description.outputs).toEqual(['main']);
	});

	describe('execute method', () => {
		let mockFns: IExecuteFunctions;

		it('should return a memory object on successful execution', async () => {
			mockFns = createMockExecuteFns({
				sessionId: 'test-session',
				tableName: 'TEST_TABLE',
				contextWindowLength: 5,
			});

			const result = await node.execute.call(mockFns);

			expect(OracleConnectionPool.getPool).toHaveBeenCalledWith(DEFAULT_CREDENTIALS);
			expect(result.main[0][0].json.memory).toBeInstanceOf(OracleChatMessageHistory);
		});

		it('should throw NodeOperationError if sessionId is missing', async () => {
			mockFns = createMockExecuteFns({
				sessionId: '', // Empty sessionId
				tableName: 'TEST_TABLE',
			});

			await expect(node.execute.call(mockFns)).rejects.toThrow(NodeOperationError);
			await expect(node.execute.call(mockFns)).rejects.toThrow(
				'O Session Key é obrigatório para a memória do chat.',
			);
		});
	});
});

describe('OracleChatMessageHistory Class', () => {
	let memory: OracleChatMessageHistory;
	let mockConnection: { execute: jest.Mock; close: jest.Mock; commit: jest.Mock };
	let mockPool: { getConnection: jest.Mock };

	const SESSION_ID = 'session-123';
	const TABLE_NAME = 'N8N_CHAT_MEMORY';

	beforeEach(() => {
		mockConnection = {
			execute: jest.fn().mockResolvedValue({ rows: [], rowsAffected: 1 }),
			close: jest.fn().mockResolvedValue(undefined),
			commit: jest.fn().mockResolvedValue(undefined),
		};
		mockPool = { getConnection: jest.fn().mockResolvedValue(mockConnection) };
		memory = new OracleChatMessageHistory({
			pool: mockPool as any,
			sessionId: SESSION_ID,
			node: mockNode,
		});
		jest.clearAllMocks();
	});

	describe('ensureTable', () => {
		it('should execute CREATE TABLE and CREATE INDEX on first call', async () => {
			await (memory as any).ensureTable();
			expect(mockConnection.execute).toHaveBeenCalledTimes(2);
			expect(mockConnection.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
			expect(mockConnection.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX'));
			expect(mockConnection.commit).toHaveBeenCalledTimes(1);
			expect(mockConnection.close).toHaveBeenCalledTimes(1);
		});

		it('should not execute SQL on second call', async () => {
			await (memory as any).ensureTable(); // First call
			jest.clearAllMocks();
			await (memory as any).ensureTable(); // Second call
			expect(mockConnection.execute).not.toHaveBeenCalled();
		});

		it('should not throw if table already exists (SQLCODE -955)', async () => {
			const error = new Error('table already exists') as any;
			error.errorNum = 955;
			mockConnection.execute.mockImplementation(async (sql: string) => {
				if (sql.includes('CREATE TABLE')) {
					throw error;
				}
				return { rows: [], rowsAffected: 0 };
			});

			await expect((memory as any).ensureTable()).resolves.not.toThrow();
		});
	});

	describe('addMessage', () => {
		it('should execute an INSERT statement', async () => {
			const message = new HumanMessage('Hello!');
			await memory.addMessage(message);

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining(`INSERT INTO ${TABLE_NAME}`),
				{
					sessionId: SESSION_ID,
					messageType: 'human',
					content: 'Hello!',
					metadata: '{}',
				},
				{ autoCommit: true },
			);
		});
	});

	describe('getMessages', () => {
		it('should execute a SELECT statement and return mapped messages', async () => {
			const dbRows = [
				{
					MESSAGE_TYPE: 'human',
					CONTENT: 'Hi!',
					METADATA: '{}',
				},
				{
					MESSAGE_TYPE: 'ai',
					CONTENT: 'Hello! How can I help you?',
					METADATA: '{"some":"data"}',
				},
			];
			mockConnection.execute.mockResolvedValue({ rows: dbRows });

			const messages = await memory.getMessages();

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining(`SELECT message_type, content, metadata`),
				expect.any(Object),
				expect.any(Object),
			);

			expect(messages.length).toBe(2);
			expect(messages[0]).toBeInstanceOf(HumanMessage);
			expect(messages[1]).toBeInstanceOf(AIMessage);
			expect(messages[1].content).toBe('Hello! How can I help you?');
			expect(messages[1].additional_kwargs).toEqual({ some: 'data' });
		});

		it('should apply context window limit to the query', async () => {
			memory = new OracleChatMessageHistory({
				pool: mockPool as any,
				sessionId: SESSION_ID,
				contextWindowLength: 5,
				node: mockNode,
			});
			await memory.getMessages();

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('FETCH FIRST 10 ROWS ONLY'),
				expect.any(Object),
				expect.any(Object),
			);
		});
	});

	describe('clear', () => {
		it('should execute a DELETE statement for the session', async () => {
			await memory.clear();

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining(`DELETE FROM ${TABLE_NAME}`),
				{ sessionId: SESSION_ID },
				{ autoCommit: true },
			);
		});
	});

	describe('saveContext', () => {
		it('should add both human and AI messages', async () => {
			const inputs = { input: 'User input' };
			const outputs = { output: 'AI output' };

			await memory.saveContext(inputs, outputs);

			expect(mockConnection.execute).toHaveBeenCalledTimes(2);

			// Check Human Message
			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ content: 'User input', messageType: 'human' }),
				expect.any(Object),
			);

			// Check AI Message
			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ content: 'AI output', messageType: 'ai' }),
				expect.any(Object),
			);
		});
	});
});
