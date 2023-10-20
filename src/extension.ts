import * as vscode from 'vscode';
import { Doc4Me } from './commands';

const doc4me = new Doc4Me();

const commands: { [key: string]: () => Promise<void> } = {
    'project': doc4me.documentProject.bind(doc4me),
    'file': doc4me.documentCurrentFile.bind(doc4me),
    'directory': doc4me.documentCurrentDirectory.bind(doc4me),
    'calculate': doc4me.calculate.bind(doc4me),
    'ask': doc4me.askFile.bind(doc4me),
};

function getCompletionMessage(): string {
    const robot = String.fromCodePoint(0x1F916);
    const writtenHand = String.fromCodePoint(0x270D);
    const book = String.fromCodePoint(0x1F4D6);
    const tada = String.fromCodePoint(0x1F389);
    return `Doc4me completed! ${book} ${writtenHand} ${robot} ${tada}`;
}


function registerCommands(context: vscode.ExtensionContext) {
    for (const command in commands) {
        if(commands.hasOwnProperty(command)){
            let cmd = vscode.commands.registerCommand('doc4me.'+ command, () => {
                        commands[command]().then(() => {
                            vscode.window.showInformationMessage(getCompletionMessage());
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

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Doc4me is now active!');
    registerCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
