import * as vscode from 'vscode';
import { MyConfig } from './myConfig';
import { AI } from './ai';
import { Utils } from './utils';


async function generateDocs(): Promise<void> {
    const { utils, myConfig, ai } = getInstances();
    const filesToExplain = utils.getFiles(myConfig.rootPath, myConfig.supportedFileExtension, myConfig.directoriesToIgnore);
    await ai.explainFiles(filesToExplain);
    await ai.summarizeDocs();
}

function getInstances() {
    const myConfig = new MyConfig();
    vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
    const utils = new Utils();
    const ai = new AI(myConfig, utils);
    return { utils, myConfig, ai };
}

async function documentCurrentFile(): Promise<void> {
    const { utils, myConfig, ai } = getInstances();
    let currentFile = vscode.window.activeTextEditor?.document.uri.fsPath || "";
    await ai.explainFile(currentFile);
}

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let docProject = vscode.commands.registerCommand('doc4me.doc4me', () => {
        generateDocs().then(() => {
            vscode.window.showInformationMessage('Doc4me completed!');
            console.log('Doc4me completed!');
        }).catch((err) => {
            vscode.window.showErrorMessage('Doc4me failed. ' + err);
        });
    });
    context.subscriptions.push(docProject);

    let docFile = vscode.commands.registerCommand('doc4me.file', () => {
        documentCurrentFile().then(() => {
            vscode.window.showInformationMessage('Doc4me completed!');
            console.log('Doc4me completed!');
        }).catch((err) => {
            vscode.window.showErrorMessage('Doc4me failed. ' + err);
        });
    });
    context.subscriptions.push(docFile);
}

// This method is called when your extension is deactivated
export function deactivate() {}
