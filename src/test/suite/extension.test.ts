import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { AI } from '../../ai/ai';
import { ERROR_MESSAGE, MyConfig, SUMMARY_FILE_NAME } from '../../myConfig';
import { Utils } from '../../utils';
import { Explainer } from '../../ai/explainer';
import { Summarizer } from '../../ai/summarizer';
import { BillCalculator } from '../../billCalculator';
import * as fs from 'fs';

let sinon = require('sinon');

class MockedConfig extends MyConfig {
	// so we do not create any files while testing
	createDocsDirectory(): void {
		return;
	}
	createCSVTokensFile(): void {
		return;
	}
}


suite('Extension Test Suite', () => {
	const conf = new MockedConfig();
	const filePath = 'some file path';
	const askAIStub = sinon.stub(AI, 'askIA');
	askAIStub.callsFake((arg1:string, arg2:string) => {
		return arg1 + arg2;
	});
	AI.askIA = askAIStub;
	const aiUtilsReadFileStub = sinon.stub(Utils, 'readFile');
	Utils.readFile = aiUtilsReadFileStub;
	function setReadFileReturnValue(content: string): void {
		aiUtilsReadFileStub.returns(Promise.resolve(Buffer.from(content)));
	}
	
	test('explainCode should return empty string', async () => {
		let codeExplanation: string = await Explainer.explainCode(filePath, true, false, conf);
		assert.strictEqual(codeExplanation, '');

		setReadFileReturnValue('');
		codeExplanation = await Explainer.explainCode(filePath, false, true, conf);
		assert.strictEqual(codeExplanation, '');
	});

	test('explainCode should execute properly', async () => {
		const testContent = 'Test content';
		setReadFileReturnValue(testContent);

		await Explainer.explainCode(filePath, false, true, conf);
		
		assert(askAIStub.calledWith(conf.explainFilePrompt, testContent, filePath));
	});

	test('getFileSummarizations', async () => {
		const getFilesStub = sinon.stub(Utils, 'getFiles');
		getFilesStub.withArgs(conf.docsPath).returns([
			SUMMARY_FILE_NAME,
			'/path/to/file2.txt',
			'/path/to/file3.txt',
			'/path/to/file4.txt'
		]);
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file2.txt')).returns(Promise.resolve(Buffer.from('file2 content')));
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file3.txt')).returns(Promise.resolve(Buffer.from(ERROR_MESSAGE)));
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file4.txt')).returns(Promise.resolve(Buffer.from('file4 content')));
		const expectedFileSummarizations = "/path/to/file2.txt\nSummarize the following code explanation in at most one paragraph:\nfile2 content\n\n/path/to/file4.txt\nSummarize the following code explanation in at most one paragraph:\nfile4 content\n\n";
		
		const fileSummarizations: string = await Summarizer.getFileSummarizations(conf);
		
		assert.strictEqual(fileSummarizations, expectedFileSummarizations);
		getFilesStub.restore();
	});

	test('getFiles', async () => {
		async function gen2set<T>(gen: AsyncIterable<T>){
			const out = new Set();
			for await(const x of gen) {
				out.add(x);
			}
			return out;
		}
	    const testDir = path.resolve(__dirname, '..');
		process.chdir(testDir);
		
		const docFiles = Utils.getFiles(testDir, ['js'], ['ignored_dir']);
		
		let files = await gen2set(docFiles);
		assert.strictEqual(files.size, 3);
	});

	test('should calculate bill properly', async () => {
		sinon.stub(BillCalculator, 'hasNoCSVData').returns(false);
		const tokenFixture = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'test', 'suite', 'tokensFixture.csv'), 'utf8');
		sinon.stub(BillCalculator, 'getCSVContent').returns(tokenFixture);
		const showBillStub = sinon.stub(BillCalculator, 'showBill');
		BillCalculator.calculateTokens(conf);
		assert(showBillStub.calledWith(10964, 3566));
	});
});
