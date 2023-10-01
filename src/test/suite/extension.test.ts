import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { MyConfig } from '../../myConfig';
import { AI } from '../../ai';
import { Utils } from '../../utils';
let sinon = require('sinon');


suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	const myConfig = new MyConfig();
	const utils = new Utils();
    const ai = new AI(myConfig, utils);
	
	const askAIStub = sinon.stub(ai, 'askIA');
	askAIStub.returnsArg(0);
	ai.askIA = askAIStub;

	const aiUtilsReadFileStub = sinon.stub(ai.utils, 'readFile');
	ai.utils.readFile = aiUtilsReadFileStub;


	function setReadFileReturnValue(content: string): void {
		aiUtilsReadFileStub.returns(Promise.resolve(Buffer.from(content)));
	}
	
	test('explainCode should return empty string', async () => {
		let codeExplanation: string = await ai.explainCode('some file path', true, false, myConfig);
		assert.strictEqual(codeExplanation, '');

		setReadFileReturnValue('');
		codeExplanation = await ai.explainCode('some file path', false, true, myConfig);
		assert.strictEqual(codeExplanation, '');
	});

	test('explainCode should execute properly', async () => {
		const testContent = 'Test content';
		setReadFileReturnValue(testContent);

		await ai.explainCode('some file path', false, true, myConfig);
		assert(askAIStub.calledWith(myConfig.explainFilePrompt + testContent, myConfig));
	});

	test('getFileSummarizations', async () => {
		const getFilesStub = sinon.stub(ai.utils, 'getFiles');
		getFilesStub.withArgs(ai.myConfig.docsPath).returns([
			ai.utils.summaryFileName,
			'/path/to/file2.txt',
			'/path/to/file3.txt',
			'/path/to/file4.txt'
		]);
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file2.txt')).returns(Promise.resolve(Buffer.from('file2 content')));
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file3.txt')).returns(Promise.resolve(Buffer.from(ai.utils.errorMessage)));
		aiUtilsReadFileStub.withArgs(vscode.Uri.file('/path/to/file4.txt')).returns(Promise.resolve(Buffer.from('file4 content')));
		const fileSummarizations: string = await ai.getFileSummarizations();
		const expectedFileSummarizations = "/path/to/file2.txt\nSummarize the following code explanation in at most one paragraph:\nfile2 content\n\n/path/to/file4.txt\nSummarize the following code explanation in at most one paragraph:\nfile4 content\n\n";
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
		const docFiles = ai.utils.getFiles(testDir, ['js'], ['ignored_dir']);
		let files = await gen2set(docFiles);
		assert.strictEqual(files.size, 3);
	});
});
