// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
// async function generateProjectSummary(summarization: string): Promise<void> {
//     const prompt = explainCommand + summarization;
//     const projectSummary = await askIA(prompt);
//     vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(docsDir, 'project_summary.md')), Buffer.from(projectSummary));
// }

// async function summarizeDocs(): Promise<void> {
//     let summarization = '';
//     for (const [subdir, dirs, files] of await walkSync(docsDir)) {
//         for (const file of files) {
//             const filePath = path.join(subdir, file);
//             const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
//             const prompt = summarizeCommand + fileContent.toString();
//             const summarizationSentence = await askIA(prompt);
//             summarization += `${filePath}\n${summarizationSentence}\n\n`;
//         }
//     }
//     await generateProjectSummary(summarization);
// }

const rootDir: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
if (!rootDir) {
    throw new Error('Unable to determine workspace root directory');
}
const docsDir: string = path.join(rootDir, 'docs');

const recreate = false;
const update = true;

const question = 'what this codes does?\n';
const summarizeCommand = 'summarize the following code explanation in one sentence:\n';
const explainCommand = 'explain what this code project does given the following explanation of each file: \n';
const supportedCodeLanguages = ['py', 'js', 'ts'];
const directoriesToIgnore = ['docs', 'node_modules', 'dist'];

const keyFieldName = 'apikey';
const myConfig = vscode.workspace.getConfiguration();
let openaiApiKey = myConfig.get(keyFieldName, '');

// const ai_service = configuration.get('ai');

vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(keyFieldName)) {
    let openAiKey = myConfig.get(keyFieldName, '');
    myConfig.update(keyFieldName, openAiKey);
    }
});
// Use the console to output diagnostic information (console.log) and errors (console.error)
// This line of code will only be executed once when your extension is activated
console.log('Congratulations, your extension "doc4me" is now active!');


async function* walkSync(dir: string): AsyncGenerator<string> {
    const fileList = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
    for (const [name, type] of fileList) {
        const filePath = path.join(dir, name);
        if (name.startsWith('.') || directoriesToIgnore.includes(name)) {
            continue;
        }
        if (type === vscode.FileType.Directory) {
            yield* walkSync(filePath);
        } else {
            const fileExtension = name.split('.').pop();
            const isSupportedCodeLanguage = supportedCodeLanguages.includes(fileExtension || 'not supported');
            if (isSupportedCodeLanguage) {
                yield filePath;
            }
        }
    }
}

async function askIA(prompt: string): Promise<string> {
    const model = 'gpt-3.5-turbo';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openaiApiKey,
    };
    const jsonData = { model, messages: [{ role: 'user', content: prompt }], temperature: 0 };
    
    await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonData),
    }).then((res) => {
        const jsonRes = res.json() as {error: string,  choices: { message: {content: string} }[] };
    if (jsonRes.error){
        return `Could not get explanation for this code due to: ${jsonRes.error}`
    }
    const explanation = jsonRes.choices[0].message.content;

    return explanation;
    })
    
    .catch((err) => {
        return `Could not get explanation for this code due to: ${err}`
    });
    
}

async function explainCode(codePath: string): Promise<string> {
    const content = await vscode.workspace.fs.readFile(vscode.Uri.file(codePath));
    if (!content) {
        return '';
    }
    const prompt = question + content.toString();
    const codeExplanation = await askIA(prompt);
    return codeExplanation;
}

async function createDoc(codeExplanation: string, filePath: string): Promise<void> {
    if (!codeExplanation) {
        return;
    }
    const docPath = filePath.replace(rootDir, docsDir).slice(0, -2) + "md";
    console.log(`creating doc for ${filePath}\n`);
    console.log(`on ${docPath}\n`);
    await vscode.workspace.fs.writeFile(vscode.Uri.file(docPath), Buffer.from(codeExplanation));
}


async function generateDocs(): Promise<void> {
    vscode.window.showInformationMessage(`your api key original is ${openaiApiKey}`);
    if (!openaiApiKey){
        openaiApiKey = await vscode.window.showInputBox({
            prompt: 'Enter your openai api key',
            placeHolder: 'api key',
            }) || '';
            
        await myConfig.update(keyFieldName, openaiApiKey, vscode.ConfigurationTarget.Global);
    }

    const files = walkSync(rootDir);
    for await (const file of files) {
        const codeExplanation = await explainCode(file);
        createDoc(codeExplanation, file);
    }
    // await summarizeDocs();
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('doc4me.doc4me', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('doc4me starting...');
        vscode.workspace.fs.createDirectory(vscode.Uri.file(docsDir));
        generateDocs().then(() => {
            vscode.window.showInformationMessage('doc4me completed!');
        });
    });

    context.subscriptions.push(disposable);
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

// 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// 	// This line of code will only be executed once when your extension is activated
// 	console.log('Congratulations, your extension "doc4me" is now active!');

// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// let disposable = vscode.commands.registerCommand('doc4me.doc4me', () => {
//     // The code you place here will be executed every time your command is executed
//     // Display a message box to the user
//     vscode.window.showInformationMessage('doc4me starting...');
//     vscode.workspace.fs.createDirectory(vscode.Uri.file(docsDir));
//     generateDocs();
//     // vscode.window.showInformationMessage('doc4me completed!');
// });


// 	context.subscriptions.push(disposable);
// }

// This method is called when your extension is deactivated
export function deactivate() {}
