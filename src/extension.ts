import * as vscode from 'vscode';
import { MyConfig } from './myConfig';
import { AI } from './ai';
import { Utils } from './utils';


async function generateDocs(): Promise<void> {
    const myConfig = new MyConfig();
    vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
    const utils = new Utils();
    const ai = new AI(myConfig);
    const filesToExplain = utils.getFiles(myConfig.rootPath, myConfig.supportedFileExtension, myConfig.directoriesToIgnore);
    await ai.explainProject(filesToExplain);
    await ai.summarizeDocs();
}

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('doc4me.doc4me', () => {
        // The code you place here will be executed every time your command is executed
        generateDocs().then(() => {
            vscode.window.showInformationMessage('doc4me completed!');
            console.log('doc4me completed!');
        }).catch((err) => {
            vscode.window.showErrorMessage('doc4me failed. ' + err);
        });
    });
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
