import * as vscode from 'vscode';
import * as path from 'path';

export class Utils{
    public readonly summaryFileName = 'projectSummary.md';
    public readFile = vscode.workspace.fs.readFile;
    public writeFile = vscode.workspace.fs.writeFile;
    public readonly readDirectory = vscode.workspace.fs.readDirectory;
    public readonly errorMessage = 'Could not get AI response. ';

    async createDoc(codeExplanation: string, docFile: vscode.Uri): Promise<void> {
        if (!codeExplanation) {
            return;
        }
        await this.writeFile(docFile, Buffer.from(codeExplanation));
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
}