import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

export const DEFAULT_CREDENTIALS = {
  user: 'testuser',
  password: 'testpass123',
  connectionString: 'localhost:1521/TESTDB',
  thinMode: true,
  libDir: undefined as string | undefined,
  configDir: undefined as string | undefined,
  errorUrl: undefined as string | undefined,
};

export type MockCredentials = typeof DEFAULT_CREDENTIALS;

export function createMockExecuteFns(
  nodeParams: Record<string, any> = {},
  credentials: MockCredentials = DEFAULT_CREDENTIALS,
  inputData: INodeExecutionData[] = [],
): IExecuteFunctions {
  return {
    getNodeParameter: jest.fn((name: string, _index: number, defaultValue?: any) =>
      name in nodeParams ? nodeParams[name] : defaultValue,
    ),
    getCredentials: jest.fn().mockResolvedValue(credentials),
    getInputData: jest.fn().mockReturnValue(inputData),
    getNode: jest.fn().mockReturnValue({ id: 'test-node-id', name: 'Oracle Test Node' }),
    getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
    helpers: {
      returnJsonArray: jest.fn((items: any[]) =>
        items.map((item, i) => ({ json: item, pairedItem: { item: i } })),
      ),
    },
  } as unknown as IExecuteFunctions;
}
