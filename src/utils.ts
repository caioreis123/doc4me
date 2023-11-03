import * as vscode from 'vscode';
import * as path from 'path';
import {MyConfig, ROOT_PATH, TOKENS_FILE} from './myConfig';

export class Utils{
    static readFile = vscode.workspace.fs.readFile;

    static async calculateTokens(config: MyConfig): Promise<void> {
        if (await this.hasNoCSVData(config)) {
            const message = 'No token usage data found. Please run one of the other doc4me commands first to start using the OpenAI API.';
            vscode.window.showInformationMessage(message);
            return;
        }
        let input: number = 0;
        let output: number = 0;
        const csvContent = await Utils.getContent(config.tokenFile);
        const lines = csvContent.split('\n');
        lines.shift(); // removes the header
        lines.forEach(line => {
            const [file, inputTokens, outputTokens, totalTokens, time] = line.split(',');
            if (totalTokens) {
                input += parseInt(inputTokens);
                output += parseInt(outputTokens);
            }
        });
        const inputDollars = input * 0.0000015;
        const outputDollars = output * 0.000002;
        const bill = inputDollars + outputDollars;
        const message = `U$${bill.toFixed(4)}! (If you are using the default gpt-3.5 model and the OpenAI price for it still $0.0015 for 1K input tokens and $0.002 for 1K output tokens.)`;
        vscode.window.showInformationMessage(message);
    }

    static async hasNoCSVData(config: MyConfig): Promise<boolean> {
        const csvFile = path.join(config.docsPath, TOKENS_FILE);
        const content = await Utils.getContent(csvFile);
        return content.endsWith('time\n');
    }

    static async askForCSVOverwriting(config: MyConfig): Promise<void> {
        if (await this.hasNoCSVData(config)) {return;}
        const shouldOverWriteCSV = await vscode.window.showInformationMessage('Want to overwrite token usage file?', 'Yes', 'No') === 'Yes';
        if (!shouldOverWriteCSV) {return;}
        config.createCSVTokensFile();
    }

    static async appendCSVFile(content: string, docsPath: string): Promise<void>{
        const filePath = path.join(docsPath, TOKENS_FILE);
        const existingContent = await Utils.getContent(filePath);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(existingContent + content));
    }

    static async writeFile(fileName: string, content: string, docsPath: string): Promise<void>{
        const filePath = path.join(docsPath, fileName);
        vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content));
    };

    static getContent(filePath: string): string | PromiseLike<string> {
        return Utils.readFile(vscode.Uri.file(filePath)).then((res) => res.toString());
    }

    static async createDoc(codeExplanation: string, docFile: vscode.Uri): Promise<void> {
        if (!codeExplanation) {
            return;
        }
        await vscode.workspace.fs.writeFile(docFile, Buffer.from(codeExplanation));
    }

        /**
     * Recursive function to get all files in a directory that matches the supported language extension.
     * @param {string} dir - The directory to get files from.
     * @param {string[]} supportedCodeLanguages - The file extensions to get.
     * @param {string[]} directoriesToIgnore - The directories to ignore. Important for avoiding explaining directories like node_modules. On explanation it get its value from the directoriesToIgnore config. On summarization has no value.
     */
    static async * getFiles(dir: string, supportedCodeLanguages: string[] = ['md'], directoriesToIgnore: string[] = ['']): AsyncGenerator<string> {
        const fileList = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
        for (const [name, type] of fileList) {
            // skip hidden files/directories
            // skip ignored directories
            const hiddenFile = name.startsWith('.');
            const isDirectory = type === vscode.FileType.Directory;
            const isIgnoredDirectory = isDirectory && directoriesToIgnore.includes(name);
            const filePath = path.join(dir, name);
            console.log(`reading ${filePath}`);
            if (hiddenFile || isIgnoredDirectory) {continue;}

            // process directory
            if (isDirectory) {
                yield* this.getFiles(filePath, supportedCodeLanguages, directoriesToIgnore);
                continue; // without this continue the code below would be executed for directories
            } 

            // skip not supported file
            const fileExtension: string = name.split('.').pop() || '';
            const isSupportedCodeLanguage = supportedCodeLanguages.includes(fileExtension);
            if (!isSupportedCodeLanguage) {continue;}
            
            // return file
            yield filePath;
        }
    }

    static getCurrentFile(): string {
        let currentFile = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!currentFile) {
            throw new Error('No file is currently open');
        }
        return currentFile;
    }

    static getDocFile(file: string, config: MyConfig): vscode.Uri{
        const docPath: string = file.replace(ROOT_PATH, config.docsPath).slice(0, -2) + "md";
        return vscode.Uri.file(docPath);
    }

}
