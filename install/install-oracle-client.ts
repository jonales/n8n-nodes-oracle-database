
import { Downloader } from './utils';

const downloader = new Downloader();

async function main() {
	console.log('Starting Oracle Instant Client download...');
	await downloader.run();
}

main().catch(error => {
	console.error('Failed to download and extract Oracle Instant Client.', error);
	process.exit(1);
});
