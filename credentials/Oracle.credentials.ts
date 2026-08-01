﻿import { ICredentialType, INodeProperties } from 'n8n-workflow';

export type IOracleCredentials = {
	user: string;
	password: string;
	host: string;
	port: number;
	serviceName: string;
	connectionString: string;
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
	icon = 'file:oracle.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Pré-requisito: Oracle Client',
			name: 'setupNotice',
			type: 'notice',
			default: '',
			typeOptions: {
				theme: 'warning',
			},
			description: `
        <strong>Atenção:</strong> Para usar este nó, o <strong>Oracle Instant Client</strong> deve estar instalado e configurado no seu ambiente n8n.<br/>
        As variáveis de ambiente (ex: <code>LD_LIBRARY_PATH</code> no Linux ou <code>PATH</code> no Windows) precisam estar corretamente ajustadas para que o n8n possa encontrar as bibliotecas do Oracle.<br/><br/>
        Consulte o <strong><a href="https://github.com/JonatasAP/n8n-nodes-oracle-database/blob/main/INSTRUCOES_CONFIGURACAO.md" target="_blank">Guia de Configuração</a></strong> para um passo a passo detalhado.
      `,
		},
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
	];
}