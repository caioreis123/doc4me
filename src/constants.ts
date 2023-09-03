import * as vscode from 'vscode';

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
    model: string;
    docsPath: string;
    rootPath: string;
}
