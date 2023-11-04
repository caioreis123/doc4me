import * as vscode from 'vscode';
import * as path from 'path';
import {MyConfig, ROOT_PATH} from './myConfig';

export class Utils{
    static readFile = vscode.workspace.fs.readFile;

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
