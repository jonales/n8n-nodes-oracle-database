
import { constants } from 'os';
import * as path from 'path';

export const ORACLE_CLIENT_VERSION = '21.3.0';
export const DOWNLOAD_BASE_URL = `https://download.oracle.com/otn_software/linux/instantclient/${ORACLE_CLIENT_VERSION}`;

export const PLATFORM_CONFIG = {
	win32: {
		url: `https://download.oracle.com/otn_software/winsoft/${ORACLE_CLIENT_VERSION}/instantclient-basic-windows.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
		zipFileName: `instantclient-basic-windows.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
	},
	linux: {
		url: `${DOWNLOAD_BASE_URL}/instantclient-basic-linux.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
		zipFileName: `instantclient-basic-linux.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
	},
	darwin: {
		url: `${DOWNLOAD_BASE_URL}/instantclient-basic-macos.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
		zipFileName: `instantclient-basic-macos.x64-${ORACLE_CLIENT_VERSION}.0.0.0dbru.zip`,
	},
};

export const EXTRACTION_DIR = path.join(__dirname, '..', '.oracledb');
