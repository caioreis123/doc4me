import * as vscode from 'vscode';
import commands from './commands';

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
    console.log('Doc4me is now active and ai instantiated!');
    registerCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
