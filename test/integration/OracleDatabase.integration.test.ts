import { OracleConnection } from '../../nodes/Oracle/core';
import credentials from './credentials.json';
import oracledb from 'oracledb';

describe('OracleDatabase Integration Test', () => {
  let connection: any;

  // This test suite requires a running Oracle database.
  // Add your credentials to test/integration/credentials.json
  // IMPORTANT: This file is in .gitignore and will not be committed.
  if (!credentials.connectString.includes('host:port')) {
    it('should connect to Oracle, run a query, and disconnect', async () => {
      let queryResult;
      try {
        // Initialize connection
        const explicitCredentials = {
          user: credentials.user,
          password: credentials.password,
          connectionString: credentials.connectString,
        };
        const oracleConnection = new OracleConnection(explicitCredentials as any, { mode: 'thin' });
        connection = await oracleConnection.getConnection();

        // Execute a simple query
        const result = await connection.execute(
					'SELECT 1 AS "result" FROM DUAL',
					[],
					{ outFormat: oracledb.OUT_FORMAT_OBJECT },
				);
        queryResult = result.rows[0];

        // Assert the result
        expect(queryResult).toEqual({ result: 1 });
      } finally {
        // Ensure connection is closed
        if (connection) {
          await connection.close();
        }
      }
      // Re-throw error if query failed to ensure test fails
      if (!queryResult) {
        throw new Error('Query did not return expected result.');
      }
    }, 30000); // 30-second timeout for potentially slow connections
  } else {
    it('skips integration tests because credentials are not configured', () => {
      console.log('Skipping integration tests. Please configure test/integration/credentials.json');
      expect(true).toBe(true);
    });
  }
});

