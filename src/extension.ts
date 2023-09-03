import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import {
    writeFile, readFile, readDirectory,
    summaryFileName,
    errorMessage,
    MyConfig
} from './constants';


async function generateDocs(): Promise<void> {
    let docExists: boolean = false;
    let recreate: boolean = true;
    let askedTheUserForRecreation: boolean = false;

     const defaultRootPath: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
     const defaultDocsPath: string = path.join(defaultRootPath, 'docs');

    const vsCodeConfig = vscode.workspace.getConfiguration();
    const myConfig: MyConfig = {
        apiKey: vsCodeConfig.get('openAiApiKey', ''),
        languages: vsCodeConfig.get('supportedCodeExtensions', ["py", "js", "ts"]),
        ignore: vsCodeConfig.get('directoriesToIgnore', ["docs", "node_modules", "dist"]),
        summarize: vsCodeConfig.get('summarizationPrompt', 'Summarize the following code explanation in at most one paragraph:\n'),
        explainProject: vsCodeConfig.get('projectExplanationPrompt', 'Explain what this code project do, given the following explanations of each file: \n'),
        explainFile: vsCodeConfig.get('fileExplanationPrompt', 'Explain the following code: \n'),
        model: vsCodeConfig.get('model', 'gpt-3.5-turbo'),
        rootPath: vsCodeConfig.get('rootPath', defaultRootPath),
        docsPath: vsCodeConfig.get('docsPath', defaultDocsPath),
    };

    const docsDir = vscode.Uri.file(myConfig.docsPath);
    vscode.workspace.fs.createDirectory(docsDir);

    if (!myConfig.apiKey){
        vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true}).then((apiKey) => {
            if (apiKey) {
                myConfig.apiKey = apiKey;
                vsCodeConfig.update('openAiApiKey', apiKey, true);
            }
        }
    );};

    vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');

    const filesToExplain = getFiles(myConfig.rootPath, myConfig.languages, myConfig.ignore);
    for await (const file of filesToExplain) {
        const docPath: string = file.replace(myConfig.rootPath, myConfig.docsPath).slice(0, -2) + "md";
        const docFile: vscode.Uri = vscode.Uri.file(docPath);
        docExists = await vscode.workspace.fs.stat(docFile).then(() => true, () => false);
        if (docExists && !askedTheUserForRecreation) {
            recreate = await vscode.window.showInformationMessage('Want to overwrite documentation generated previously?', 'Yes', 'No') === 'Yes';
            askedTheUserForRecreation = true;
        }
        const codeExplanation: string = await explainCode(file, docExists, recreate, myConfig);
        createDoc(codeExplanation, docFile);
    }
    await summarizeDocs(myConfig);
}

async function* getFiles(dir: string, _supportedCodeLanguages: string[] = ['md'], _directoriesToIgnore: string[] = ['']): AsyncGenerator<string> {
    const fileList = await readDirectory(vscode.Uri.file(dir));
    for (const [name, type] of fileList) {
        const filePath = path.join(dir, name);
        if (name.startsWith('.') || _directoriesToIgnore.includes(name)) {
            continue;
        }
        if (type === vscode.FileType.Directory) {
            yield* getFiles(filePath, _supportedCodeLanguages, _directoriesToIgnore);
        } else {
            const fileExtension: string = name.split('.').pop() || '';
            const isSupportedCodeLanguage = _supportedCodeLanguages.includes(fileExtension);
            if (isSupportedCodeLanguage) {
                yield filePath;
            }
        }
    }
}


async function explainCode(codePath: string, docExists:boolean, recreate:boolean, myConfig: MyConfig): Promise<string> {
    if(docExists && !recreate){return '';}
    let content: string = await readFile(vscode.Uri.file(codePath)).then((res) => res.toString());
    if (!content) {return '';}

    const prompt = myConfig.explainFile + content;
    console.log(`Explaining ${codePath}`);
    const codeExplanation = await askIA(prompt, myConfig);
    return codeExplanation;
}

async function createDoc(codeExplanation: string, docFile: vscode.Uri): Promise<void> {
    if (!codeExplanation) {
        return;
    }
    await writeFile(docFile, Buffer.from(codeExplanation));
}

async function summarizeDocs(myConfig: MyConfig): Promise<void> {
    const docFiles = getFiles(myConfig.docsPath);
    let summarizations: string = '';
    for await (const file of docFiles) {
        if (file.endsWith(summaryFileName)){continue;}
        const fileContent = await readFile(vscode.Uri.file(file));
        const contentString = fileContent.toString();
        if(contentString.startsWith(errorMessage)){continue;}
        const prompt: string = myConfig.summarize + contentString;
        const summarizationSentence: string = await askIA(prompt, myConfig);
        summarizations += `${file}\n${summarizationSentence}\n\n`;
    }
    await generateProjectSummary(summarizations, myConfig);
}

async function generateProjectSummary(summarization: string, myConfig: MyConfig): Promise<void> {
    const prompt = myConfig.explainProject + summarization;
    const projectSummary = await askIA(prompt, myConfig);
    const summaryFilePath = path.join(myConfig.docsPath, summaryFileName);
    const summaryFile = vscode.Uri.file(summaryFilePath);
    writeFile(summaryFile, Buffer.from(projectSummary));
}

async function askIA(prompt: string, config: MyConfig): Promise<string> {
    const model = config.model;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey,
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
