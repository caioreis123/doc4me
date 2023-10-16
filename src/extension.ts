import * as vscode from 'vscode';
import { MyConfig } from './myConfig';
import { AI } from './ai';
import { Utils } from './utils';
import * as path from 'path';

const commands: { [key: string]: () => Promise<void> } = {
    'project': documentProject,
    'file': documentCurrentFile,
    'directory': documentCurrentDirectory,
    'calculate': calculate,
    'ask': qaFile,
};

async function qaFile(){
    const { utils, myConfig, ai } = getInstances();
    const question = await vscode.window.showInputBox({prompt: 'What do you want to ask?', ignoreFocusOut: true});
    if (question){
        await ai.askFile(getCurrentFile(), question);
    }
}

async function calculate(){
    const { utils, myConfig, ai } = getInstances();
    const files = utils.getFiles(myConfig.rootPath, myConfig.supportedFileExtension, myConfig.directoriesToIgnore);
    await ai.calculateTokens(files);
}

async function documentCurrentDirectory(){
    const { utils, myConfig, ai } = getInstances();
    const directoryPath = path.dirname(getCurrentFile());
    const files = utils.getFiles(directoryPath, myConfig.supportedFileExtension, myConfig.directoriesToIgnore);
    await ai.explainFiles(files);
}

function getCurrentFile() {
    let currentFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!currentFile) {
        throw new Error('No file is currently open');
    }
    return currentFile;
}

async function documentProject(): Promise<void> {
    const { utils, myConfig, ai } = getInstances();
    const filesToExplain = utils.getFiles(myConfig.rootPath, myConfig.supportedFileExtension, myConfig.directoriesToIgnore);
    await ai.explainFiles(filesToExplain);
    await ai.summarizeDocs();
}

function getInstances() {
    vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
    const myConfig = new MyConfig();
    const utils = new Utils(myConfig);
    const ai = new AI(myConfig, utils);
    return { utils, myConfig, ai };
}

async function documentCurrentFile(): Promise<void> {
    const { utils, myConfig, ai } = getInstances();
    const currentFile = getCurrentFile();
    await ai.explainFile(currentFile);
}

export function activate(context: vscode.ExtensionContext) {
    registerCommands(context);
}

function registerCommands(context: vscode.ExtensionContext) {
    for (const command in commands) {
        if(commands.hasOwnProperty(command)){
            let cmd = vscode.commands.registerCommand('doc4me.'+ command, () => {
                        commands[command]().then(() => {
                            vscode.window.showInformationMessage('Doc4me completed!');
                            console.log('Doc4me completed!');
                        }).catch((err) => {
                            let message = 'Doc4me failed. ' + err;
                            console.error(message);
                            vscode.window.showErrorMessage(message);
                        });
                    });
            context.subscriptions.push(cmd);
        } 
    }
}

export function deactivate() {} // This method is called when your extension is deactivated
