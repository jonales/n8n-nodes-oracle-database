import { Connection, ConnectionAttributes, InitialiseOptions } from 'oracledb';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let oracledb = require('oracledb');
import { DatabaseConnection } from './interfaces/database.interface';
import { buildOracleConnectionString } from '../../../credentials/Oracle.credentials';
import { OracleCredentials } from './types/oracle.credentials.type';

export interface ConnectionConfig {
	fetchAsStringTypes?: any[]; // Para CLOB, BLOB, etc.
	logLevel?: 'none' | 'info' | 'debug';
}

export class OracleConnection implements DatabaseConnection {
	private databaseConfig: ConnectionAttributes;
	private connectionConfig: ConnectionConfig;
	private static clientInitialized = false;

	constructor(credentials: OracleCredentials, connectionConfig: ConnectionConfig = {}) {
		const { user, password } = credentials;

		this.databaseConfig = {
			user,
			password,
			connectionString: buildOracleConnectionString(credentials),
		} as ConnectionAttributes;

		// Preenche valores padrão
		this.connectionConfig = {
			fetchAsStringTypes: connectionConfig.fetchAsStringTypes ?? [oracledb.CLOB],
			logLevel: connectionConfig.logLevel ?? 'info',
		};

		// A inicialização do cliente será feita de forma síncrona no construtor.
		this.initializeThickClient();
	}

	/**
	 * Inicializa o modo thick (Oracle Client libraries).
	 * Assume que as variáveis de ambiente (LD_LIBRARY_PATH, etc.) estão configuradas
	 * ou que o Instant Client está em um local padrão do sistema.
	 */
	private initializeThickClient(): void {
		if (OracleConnection.clientInitialized) {
			this.log('warn', 'Oracle Client já inicializado anteriormente. Ignorando nova tentativa.');
			return;
		}

		try {
			// initOracleClient pode ser chamado sem parâmetros para usar variáveis de ambiente.
			oracledb.initOracleClient();
			OracleConnection.clientInitialized = true;
			this.log('info', 'Oracle Client inicializado em modo THICK.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('DPI-1072')) {
				// Already initialized
				this.log('warn', 'Oracle Client já foi inicializado. Isso pode acontecer em ambientes com recarregamento a quente.');
				OracleConnection.clientInitialized = true;
				return;
			}

			// Para qualquer outro erro (incluindo DPI-1047: "Cannot locate a 64-bit Oracle Client library"),
			// lança um erro claro e acionável.
			throw new Error(
				'Falha ao inicializar o Oracle Client.\n' +
					'Causas prováveis:\n' +
					'1. O Oracle Instant Client não foi encontrado no seu sistema.\n' +
					'2. As variáveis de ambiente (LD_LIBRARY_PATH no Linux/macOS ou PATH no Windows) não estão configuradas corretamente para apontar para o diretório do Instant Client.\n' +
					'3. O client pode ter dependências de sistema faltando (ex: libaio1 no Linux).\n\n' +
					`--> Consulte o guia de configuração para ajuda.\n` +
					`--> Erro original: ${errorMessage}`,
			);
		}
	}

	/**
	 * Estabelece conexão com Oracle DB
	 */
	async getConnection(): Promise<Connection> {
		try {
			const connection = await oracledb.getConnection(this.databaseConfig);

			this.log(
				'info',
				`Conexão estabelecida como ${this.databaseConfig.user} em ${this.databaseConfig.connectionString}`,
			);

			return connection;
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Falha na conexão com o banco de dados: ${errorMessage}\n` +
					'Verifique se:\n' +
					'- O Oracle Client está instalado e funcionando corretamente.\n' +
					'- O `tnsnames.ora` está configurado (se estiver usando um alias TNS).\n' +
					'- As credenciais (usuário/senha) e a string de conexão estão corretas.\n' +
					'- Há conectividade de rede entre o n8n e o servidor do banco de dados Oracle.',
			);
		}
	}

	/**
	 * Realiza um teste simples de conectividade (Health Check)
	 */
	async testConnection(): Promise<boolean> {
		let conn: Connection | undefined;
		try {
			conn = await this.getConnection();
			await conn.execute('SELECT 1 FROM DUAL');
			this.log('info', 'Teste de conexão Oracle OK');
			return true;
		} catch (err) {
			this.log('warn', `Não foi possível conectar/testar o banco: ${String(err)}`);
			return false;
		} finally {
			if (conn) {
				try {
					await conn.close();
				} catch (closeErr) {
					this.log('warn', `Erro ao fechar conexão de teste: ${String(closeErr)}`);
				}
			}
		}
	}

	/**
	 * Exibe informações da conexão e do cliente Oracle
	 */
	getConnectionInfo(): {
		clientVersion?: string;
	} {
		const info: { clientVersion?: string } = {
			clientVersion: 'unknown',
		};

		try {
			info.clientVersion = (oracledb as any).oracleClientVersionString;
		} catch (e) {
			this.log('warn', 'Não foi possível obter a versão do Oracle Client.');
		}

		return info;
	}

	/**
	 * Função de logging controlada por logLevel do config
	 */
	private log(level: 'info' | 'debug' | 'warn', ...args: any[]) {
		const configuredLevel = this.connectionConfig.logLevel || 'info';
		if (
			(level === 'info' && ['info', 'debug'].includes(configuredLevel)) ||
			(level === 'warn' && ['info', 'debug', 'warn'].includes(configuredLevel))
		) {
			console.log('[n8n-nodes-oracle]', ...args);
		}
		if (level === 'debug' && configuredLevel === 'debug') {
			console.debug('[n8n-nodes-oracle]', ...args);
		}
	}

	/**
	 * Fábrica para criar uma nova conexão Oracle.
	 */
	static createConnection(
		credentials: OracleCredentials,
		options: ConnectionConfig = {},
	): OracleConnection {
		return new OracleConnection(credentials, options);
	}
}
