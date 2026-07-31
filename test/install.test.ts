
import { Downloader } from '../install/utils';
import * as fs from 'fs';
import * as https from 'https';
import { Readable } from 'stream';

jest.mock('fs');
jest.mock('https');
jest.mock('adm-zip', () => {
	return jest.fn().mockImplementation(() => {
		return {
			extractAllTo: jest.fn(),
		};
	});
});

describe('Downloader', () => {
	let downloader: Downloader;

	beforeEach(() => {
		jest.clearAllMocks();
		Object.defineProperty(process, 'platform', {
			value: 'linux',
			writable: true,
		});
		downloader = new Downloader();
	});

	it('should throw an error for unsupported platforms', async () => {
		Object.defineProperty(process, 'platform', { value: 'sunos' });
		downloader = new Downloader();
		await expect(downloader.run()).rejects.toThrow('Unsupported platform: sunos');
	});

	it('should skip download if client is already extracted', async () => {
		(fs.existsSync as jest.Mock).mockReturnValue(true);
		const consoleLogSpy = jest.spyOn(console, 'log');
		await downloader.run();
		expect(consoleLogSpy).toHaveBeenCalledWith('Oracle Instant Client already downloaded and extracted.');
	});

	it('should download, extract, and cleanup', async () => {
		(fs.existsSync as jest.Mock).mockReturnValue(false);

		const mockResponse: any = {
			statusCode: 200,
			pipe: jest.fn().mockReturnThis(),
			on: jest.fn((event: string, callback: () => void) => {
				if (event === 'finish') {
					callback();
				}
				return mockResponse;
			}),
		};

		const getMock = jest.fn((url, callback) => {
			if (callback) {
				callback(mockResponse);
			}
			const req = { on: jest.fn(), end: jest.fn() };
			return req;
		});
		(https.get as jest.Mock).mockImplementation(getMock);

		const createWriteStreamMock = jest.fn().mockReturnValue({
			on: (event: string, callback: () => void) => {
				if (event === 'finish') {
					callback();
				}
			},
			close: jest.fn(),
		});
		(fs.createWriteStream as jest.Mock).mockImplementation(createWriteStreamMock);

		const consoleLogSpy = jest.spyOn(console, 'log');

		await downloader.run();

		expect(https.get).toHaveBeenCalled();
		expect(fs.createWriteStream).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith('Download complete.');
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Extracting/));
		expect(consoleLogSpy).toHaveBeenCalledWith('Extraction complete.');
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Cleaning up/));
		expect(consoleLogSpy).toHaveBeenCalledWith('Cleanup complete.');
		expect(fs.unlinkSync).toHaveBeenCalled();
	});
});
