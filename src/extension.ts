// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';

const rootDir: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
if (!rootDir) {
    throw new Error('Unable to determine workspace root directory');
}
const docsPath: string = path.join(rootDir, 'docs');
const docsDir = vscode.Uri.file(docsPath);


const readFile = vscode.workspace.fs.readFile;
const writeFile = vscode.workspace.fs.writeFile;
const readDirectory = vscode.workspace.fs.readDirectory;


const question = 'what this codes does?\n';
const summarizeCommand = 'summarize the following code explanation in at most one paragraph:\n';
const explainCommand = 'explain what this code project does given the following explanations of each file: \n';
const supportedCodeLanguages = ['py', 'js', 'ts'];
const directoriesToIgnore = ['docs', 'node_modules', 'dist'];
const errorMessage = 'Could not get AI response. ';

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


console.log('Congratulations, your extension "doc4me" is now active!');

async function generateProjectSummary(summarization: string): Promise<void> {
    const prompt = explainCommand + summarization;
    const projectSummary = await askIA(prompt);
    const summaryFilePath = path.join(docsPath, 'project_summary.md');
    const summaryFile = vscode.Uri.file(summaryFilePath);
    writeFile(summaryFile, Buffer.from(projectSummary));
}

async function summarizeDocs(): Promise<void> {
    directoriesToIgnore.shift();
    const docFiles = getFiles(docsPath, ['md'] );
    let summarizations: string = '';
    for await (const file of docFiles) {
        if (file.endsWith('project_summary.md')){continue;}
        const fileContent = await readFile(vscode.Uri.file(file));
        const contentString = fileContent.toString();
        if(contentString.startsWith(errorMessage)){continue;}
        const prompt: string = summarizeCommand + contentString;
        const summarizationSentence: string = await askIA(prompt);
        summarizations += `${file}\n${summarizationSentence}\n\n`;
    }
    await generateProjectSummary(summarizations);
}


async function* getFiles(dir: string): AsyncGenerator<string> {
    let _supportedCodeLanguages = supportedCodeLanguages;
    if (dir.startsWith(docsPath) ){
        console.log('analyzing docs folder');
        _supportedCodeLanguages = ['md'];
    }
    const fileList = await readDirectory(vscode.Uri.file(dir));
    for (const [name, type] of fileList) {
        const filePath = path.join(dir, name);
        if (name.startsWith('.') || directoriesToIgnore.includes(name)) {
            continue;
        }
        if (type === vscode.FileType.Directory) {
            yield* getFiles(filePath);
        } else {
            const fileExtension: string = name.split('.').pop() || '';
            const isSupportedCodeLanguage = _supportedCodeLanguages.includes(fileExtension);
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
    
    const explanation = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers,
        body: JSON.stringify(jsonData),
    }).then(async (res) => {
        const jsonRes = await res.json() as { error?: {message: string}, choices: { message: { content: string } }[] };
        if (jsonRes.error) {
            return `${errorMessage} Response: ${jsonRes.error.message}`;
        }
        return jsonRes.choices[0].message.content;
    }).catch((err) => {
        return `${errorMessage} Error: ${err}`;
    });
    return explanation;
}

async function explainCode(codePath: string, docExists:boolean, recreate:boolean): Promise<string> {
    if(docExists && !recreate){return '';}
    
    let content: string = await readFile(vscode.Uri.file(codePath)).then((res) => res.toString());
    
    if (!content) {return '';}

    const prompt = question + content;
    console.log(`Explaining ${codePath}`);
    const codeExplanation = await askIA(prompt);
    return codeExplanation;
}

async function createDoc(codeExplanation: string, docFile: vscode.Uri): Promise<void> {
    if (!codeExplanation) {
        return;
    }
    await writeFile(docFile, Buffer.from(codeExplanation));
}


async function generateDocs(): Promise<void> {
    let docExists: boolean = false;
    let recreate: boolean = true;
    let askedTheUserForRecreation: boolean = false;
    
  

    if (!openaiApiKey){
        openaiApiKey = await vscode.window.showInputBox({
            prompt: 'Enter your openai api key',
            placeHolder: 'api key',
            }) || '';
            
        await myConfig.update(keyFieldName, openaiApiKey, vscode.ConfigurationTarget.Global);
    }

    const filesToExplain = getFiles(rootDir);
    for await (const file of filesToExplain) {
        const docPath: string = file.replace(rootDir, docsPath).slice(0, -2) + "md";
        const docFile: vscode.Uri = vscode.Uri.file(docPath);
        docExists = await vscode.workspace.fs.stat(docFile).then(() => true, () => false);
        if (docExists && !askedTheUserForRecreation) {
            recreate = await vscode.window.showInformationMessage('Want to overwrite documentation generated previously?', 'Yes', 'No') === 'Yes';
            askedTheUserForRecreation = true;
        }
        const codeExplanation: string = await explainCode(file, docExists, recreate);
        createDoc(codeExplanation, docFile);
    }
    await summarizeDocs();
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
        vscode.window.showInformationMessage('doc4me working...');
        vscode.workspace.fs.createDirectory(docsDir);
        generateDocs().then(() => {
            vscode.window.showInformationMessage('doc4me completed!');
        });
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
