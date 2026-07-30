﻿import { ICredentialType, INodeProperties } from 'n8n-workflow';

export type IOracleCredentials = {
	user: string;
	password: string;
	host: string;
	port: number;
	serviceName: string;
	connectionString: string;
	thinMode: boolean;
	libDir?: string;
	configDir?: string;
	errorUrl?: string;
};

/**
 * Monta a connection string final que deve ser usada pelo driver oracledb.
 * Regra: se o campo "Connection String (Avançado)" estiver preenchido, ele
 * tem prioridade total (permite TNS alias, Easy Connect Plus, Wallet, etc).
 * Caso contrário, monta um Easy Connect a partir de host/port/serviceName,
 * respeitando portas customizadas (não fica preso à 1521).
 */
export function buildOracleConnectionString(credentials: IOracleCredentials): string {
	if (credentials.connectionString && credentials.connectionString.trim() !== '') {
		return credentials.connectionString.trim();
	}

	const host = credentials.host || 'localhost';
	const port = credentials.port || 1521;
	const serviceName = credentials.serviceName || 'XEPDB1';

	return `${host}:${port}/${serviceName}`;
}

export class Oracle implements ICredentialType {
	name = 'oracleCredentials';
	displayName = 'Oracle Credentials';
	documentationUrl = 'oracleCredentials';
	logo = 'file:credentials/oracle.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'system',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
			placeholder: 'oracle.host.com',
			description: 'O nome do host ou endereço IP do seu servidor Oracle.',
			displayOptions: {
				show: {
					connectionString: [''],
				},
			},
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 65535,
			},
			default: 1521,
			description:
				'A porta na qual o listener do Oracle está sendo executado. Aceita qualquer porta customizada, não precisa ser 1521.',
			displayOptions: {
				show: {
					connectionString: [''],
				},
			},
		},
		{
			displayName: 'Service Name / SID',
			name: 'serviceName',
			type: 'string',
			default: 'XEPDB1',
			placeholder: 'ORCL ou my_service.domain.com',
			description: 'O Service Name ou SID do banco de dados Oracle.',
			displayOptions: {
				show: {
					connectionString: [''],
				},
			},
		},
		{
			displayName: 'Connection String (Avançado)',
			name: 'connectionString',
			type: 'string',
			default: '',
			placeholder: '(opcional) ex: my_tns_alias ou (DESCRIPTION=...)',
			description:
				'Use este campo para fornecer uma string de conexão completa ou um alias TNS. Se preenchido, os campos Host, Porta e Serviço/SID serão ignorados.',
		},
		{
			displayName: 'Connection Mode',
			name: 'thinMode',
			type: 'options',
			default: true,
			description: 'Choose the Oracle client connection mode',
			options: [
				{
					name: 'Thin Mode (No Oracle Client Required)',
					value: true,
					description: 'Pure JavaScript driver - no Oracle Client installation needed',
				},
				{
					name: 'Thick Mode (Oracle Client Required)',
					value: false,
					description: 'Uses Oracle Client libraries for enhanced features and performance',
				},
			],
		},
		{
			displayName: 'Oracle Client Library Directory',
			name: 'libDir',
			type: 'string',
			default: '',
			placeholder: 'e.g., /opt/oracle/instantclient_21_1',
			description: 'Path to Oracle Instant Client libraries (leave empty to use LD_LIBRARY_PATH)',
			displayOptions: {
				show: {
					thinMode: [false],
				},
			},
		},
		{
			displayName: 'Oracle Configuration Directory',
			name: 'configDir',
			type: 'string',
			default: '',
			placeholder: 'e.g., /opt/oracle/network/admin',
			description: 'Path to Oracle network configuration files (tnsnames.ora, sqlnet.ora)',
			displayOptions: {
				show: {
					thinMode: [false],
				},
			},
		},
		{
			displayName: 'Error URL',
			name: 'errorUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g., https://oracle.com/pls/topic/lookup?ctx=dblatest&id=ERRMG',
			description: 'Custom URL for Oracle error message documentation',
			displayOptions: {
				show: {
					thinMode: [false],
				},
			},
		},
		// Informational sections
		{
			displayName: 'Thin Mode Information',
			name: 'thinModeInfo',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					thinMode: [true],
				},
			},
			typeOptions: {
				theme: 'info',
			},
			description: `
        <strong>Thin Mode (Recomendado para a maioria dos casos)</strong><br/>
        <strong>Vantagens:</strong><br/>
        • Não requer instalação do Oracle Client<br/>
        • Funciona em qualquer ambiente Node.js<br/>
        • Mais fácil para deploy em containers<br/>
        • Menor complexidade de configuração<br/>
        • Suporta a maioria das funcionalidades Oracle<br/>
        <br/>
        <strong>Limitações:</strong><br/>
        • Não suporta alguns recursos avançados (ex: Oracle Wallets, Kerberos)<br/>
        • Performance pode ser ligeiramente inferior para algumas operações<br/>
        • Não suporta Oracle Net Services avançados
      `,
		},
		{
			displayName: 'Thick Mode Information',
			name: 'thickModeInfo',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					thinMode: [false],
				},
			},
			typeOptions: {
				theme: 'warning',
			},
			description: `
        <strong>Thick Mode (Para recursos avançados)</strong><br/>
        <strong>Vantagens:</strong><br/>
        • Suporte completo a todos os recursos Oracle<br/>
        • Melhor performance para operações complexas<br/>
        • Suporte a Oracle Wallets, Kerberos, LDAP<br/>
        • Suporte completo ao Oracle Net Services<br/>
        <br/>
        <strong>Requisitos:</strong><br/>
        • Oracle Instant Client deve estar instalado<br/>
        • LD_LIBRARY_PATH deve estar configurado (Linux/macOS)<br/>
        • PATH deve incluir Oracle Client (Windows)<br/>
        • Configuração adicional pode ser necessária
      `,
		},
		{
			displayName: 'Installation Guide',
			name: 'installationGuide',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					thinMode: [false],
				},
			},
			typeOptions: {
				theme: 'info',
			},
			description: `
        <strong>Guia de Instalação - Oracle Instant Client</strong><br/>

        <strong>Linux:</strong><br/>
        1. Baixe Oracle Instant Client: <a href="https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html" target="_blank">Download</a><br/>
        2. Descompacte: <code>unzip instantclient-*.zip -d /opt/oracle</code><br/>
        3. Configure variável: <code>export LD_LIBRARY_PATH=/opt/oracle/instantclient_21_1:$LD_LIBRARY_PATH</code><br/>

        <strong>macOS:</strong><br/>
        1. Baixe Oracle Instant Client: <a href="https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html" target="_blank">Download</a><br/>
        2. Descompacte e configure: <code>export DYLD_LIBRARY_PATH=/opt/oracle/instantclient_21_1</code><br/>

        <strong>Windows:</strong><br/>
        1. Baixe Oracle Instant Client: <a href="https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html" target="_blank">Download</a><br/>
        2. Descompacte em C:\\oracle\\instantclient_21_1<br/>
        3. Adicione ao PATH do sistema<br/>

        <strong>Docker:</strong><br/>
        Use imagem com Oracle Client pré-instalado ou instale durante o build.
      `,
		},
	];
}