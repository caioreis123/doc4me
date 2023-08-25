import * as vscode from 'vscode';
import * as path from 'path';


export const rootDir: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
if (!rootDir) {
    throw new Error('Unable to determine workspace root directory');
}
export const docsPath: string = path.join(rootDir, 'docs');
export const docsDir = vscode.Uri.file(docsPath);

export const summaryFileName = 'project_summary.md';



export const readFile = vscode.workspace.fs.readFile;
export const writeFile = vscode.workspace.fs.writeFile;
export const readDirectory = vscode.workspace.fs.readDirectory;

export let errorMessage = 'Could not get AI response. ';

export interface MyConfig {
    apiKey: string;
    languages: string[];
    ignore: string[];
    summarize: string;
    explainProject: string;
    explainFile: string;
}
