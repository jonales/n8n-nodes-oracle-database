import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { PLATFORM_CONFIG, EXTRACTION_DIR } from './config';
const AdmZip = require('adm-zip');

type Platform = 'win32' | 'linux' | 'darwin';

export class Downloader {
	private platform: Platform = process.platform as Platform;
	private config = PLATFORM_CONFIG[this.platform];

	public async run() {
		if (!this.config) {
			throw new Error(`Unsupported platform: ${this.platform}`);
		}

		if (this.isAlreadyDownloaded()) {
			console.log('Oracle Instant Client already downloaded and extracted.');
			return;
		}

		const zipPath = await this.download();
		this.extract(zipPath);
		this.cleanup(zipPath);

		console.log(`Oracle Instant Client extracted to: ${EXTRACTION_DIR}`);
	}

	private isAlreadyDownloaded(): boolean {
		if (!this.config.zipFileName) return false;
		const expectedDirName = this.config.zipFileName.replace('.zip', '');
		return fs.existsSync(path.join(EXTRACTION_DIR, expectedDirName));
	}

	private async download(): Promise<string> {
		const url = this.config.url;
		const zipFileName = this.config.zipFileName;
		const zipPath = path.join(EXTRACTION_DIR, zipFileName);

		if (!fs.existsSync(EXTRACTION_DIR)) {
			fs.mkdirSync(EXTRACTION_DIR, { recursive: true });
		}

		const file = fs.createWriteStream(zipPath);

		console.log(`Downloading from ${url}...`);

		return new Promise((resolve, reject) => {
			const req = https.get(url, (response) => {
				if (response.statusCode !== 200) {
					reject(new Error(`Failed to download file: ${response.statusCode}`));
					return;
				}
				response.pipe(file);
				file.on('finish', () => {
					file.close();
					console.log('Download complete.');
					resolve(zipPath);
				});
			});
			req.on('error', (err) => {
				fs.unlink(zipPath, () => reject(err));
			});
			req.end();
		});
	}

	private extract(zipPath: string) {
		console.log(`Extracting ${zipPath}...`);
		const zip = new AdmZip(zipPath);
		zip.extractAllTo(EXTRACTION_DIR, true);
		console.log('Extraction complete.');
	}

	private cleanup(zipPath: string) {
		console.log(`Cleaning up ${zipPath}...`);
		fs.unlinkSync(zipPath);
		console.log('Cleanup complete.');
	}
}
