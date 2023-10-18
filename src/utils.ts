import * as vscode from 'vscode';
import * as path from 'path';
import {MyConfig} from './myConfig';
import {AI} from "./ai/ai";

export class Utils{
    myConfig: MyConfig;

    constructor (config: MyConfig) {
        this.myConfig = config;
    }

    public readonly summaryFileName = 'projectSummary.md';
    public readFile = vscode.workspace.fs.readFile;
    public readonly readDirectory = vscode.workspace.fs.readDirectory;
    public readonly errorMessage = 'Could not get AI response. ';

    public async writeFile(fileName: string, content: string): Promise<void>{
        const filePath = path.join(this.myConfig.docsPath, fileName);
        vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(content));
    };

    public getContent(filePath: string): string | PromiseLike<string> {
        return this.readFile(vscode.Uri.file(filePath)).then((res) => res.toString());
    }

    async createDoc(codeExplanation: string, docFile: vscode.Uri): Promise<void> {
        if (!codeExplanation) {
            return;
        }
        await vscode.workspace.fs.writeFile(docFile, Buffer.from(codeExplanation));
    }

        /**
     * Recursive function to get all files in a directory that matches the supported language extension.
     * @param {string} dir - The directory to get files from.
     * @param {string[]} _supportedCodeLanguages - The file extensions to get.
     * @param {string[]} _directoriesToIgnore - The directories to ignore. Important for avoiding explaining directories like node_modules. On explanation it get its value from the directoriesToIgnore config. On summarization has no value.
     */
    async * getFiles(dir: string, _supportedCodeLanguages: string[] = ['md'], _directoriesToIgnore: string[] = ['']): AsyncGenerator<string> {
        const fileList = await this.readDirectory(vscode.Uri.file(dir));
        for (const [name, type] of fileList) {
            const filePath = path.join(dir, name);
            if (name.startsWith('.') || _directoriesToIgnore.includes(name)) {
                continue;
            }
            if (type === vscode.FileType.Directory) {
                yield* this.getFiles(filePath, _supportedCodeLanguages, _directoriesToIgnore);
            } else {
                const fileExtension: string = name.split('.').pop() || '';
                const isSupportedCodeLanguage = _supportedCodeLanguages.includes(fileExtension);
                if (isSupportedCodeLanguage) {
                    yield filePath;
                }
            }
        }
    }

    public getCurrentFile() {
        let currentFile = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!currentFile) {
            throw new Error('No file is currently open');
        }
        return currentFile;
    }

    public getDocFile(file: string): vscode.Uri{
        const docPath: string = file.replace(this.myConfig.rootPath, this.myConfig.docsPath).slice(0, -2) + "md";
        return vscode.Uri.file(docPath);
    }

}
