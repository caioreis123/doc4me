// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from 'vscode';
// import * as path from 'path';

// const rootDir: string | undefined = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
// if (!rootDir) {
//     throw new Error('Unable to determine workspace root directory');
// }
// const docsDir = path.join(rootDir || '', 'docs');

// const python = '.py';
// const markdown = '.md';

// const recreate = false;
// const update = true;

// const question = 'what this codes does?\n';
// const summarizeCommand = 'summarize the following code explanation in one sentence:\n';
// const explainCommand = 'explain what this code project does given the following explanation of each file: \n';

// async function walkSync(dir: string, filelist: string[] = []): Promise<string[]> {
//     const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
//     filelist = filelist || [];
//     for (const [file, fileType] of files) {
//         const filePath = path.join(dir, file);
//         if (fileType === vscode.FileType.Directory) {
//             filelist = await walkSync(filePath, filelist);
//         } else {
//             filelist.push(filePath);
//         }
//     }
//     return filelist;
// }


//   function getDocPath(codePath: string): [string, string] {
//     const codeDir = path.dirname(codePath);
//     const docDir = path.join(docsDir, codeDir.substring(rootDir.length + 1));
//     const docName = path.basename(codePath).replace(python, markdown);
//     const docPath = path.join(docDir, docName);
//     return [docDir, docPath];
// }

//   function getPaths(subdir: string, file: string): [string, string, string] {
//     const codePath = path.join(subdir, file);
//     const [docDir, docPath] = getDocPath(codePath);
//     return [codePath, docPath, docDir];
// }

// async function askIA(prompt: string): Promise<string> {return "this is a test";}

// async function explainCode(codePath: string): Promise<string> {
//     console.log(`working on ${codePath}\n`);
//     const content = vscode.workspace.fs.readFileSync(codePath, 'utf-8');
//     if (!content) {
//         return '';
//     }
//     const prompt = question + content;
//     const codeExplanation = await askIA(prompt);
//     return codeExplanation;
// }

// function createDoc(codeExplanation: string, docDir: string, docPath: string): void {
//     if (!codeExplanation) {
//         return;
//     }
//     if (!vscode.workspace.fs.existsSync(docDir)) {
//         vscode.workspace.fs.mkdirSync(docDir);
//     }
//     vscode.workspace.fs.writeFileSync(docPath, codeExplanation);
// }

// async function generateProjectSummary(summarization: string): Promise<void> {
//     const prompt = explainCommand + summarization;
//     const projectSummary = await askIA(prompt);
//     vscode.workspace.fs.writeFileSync(path.join(docsDir, 'project_summary.md'), projectSummary);
// }

// async function summarizeDocs(): Promise<void> {
//     let summarization = '';
//     for (const [subdir, dirs, files] of walkSync(docsDir)) {
//         for (const file of files) {
//             const filePath = path.join(subdir, file);
//             const fileContent = vscode.workspace.fs.readFileSync(filePath, 'utf-8');
//             const prompt = summarizeCommand + fileContent;
//             const summarizationSentence = await askIA(prompt);
//             summarization += `${filePath}\n${summarizationSentence}\n\n`;
//         }
//     }
//     generateProjectSummary(summarization);
// }


import * as vscode from 'vscode';
import * as path from 'path';

const rootDir: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
if (!rootDir) {
    throw new Error('Unable to determine workspace root directory');
}
const docsDir: string = path.join(rootDir, 'docs');

const supportedCodeLanguages = ['py', 'js', 'ts'];
const directoriesToIgnore = ['docs', 'node_modules', 'dist'];

const openai_api_key = "";

const recreate = false;
const update = true;

const question = 'what this codes does?\n';
const summarizeCommand = 'summarize the following code explanation in one sentence:\n';
const explainCommand = 'explain what this code project does given the following explanation of each file: \n';

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
    const token = await vscode.credentials.getPassword(vscode.CredentialScope.Global, 'open_ai_token');

    const model = 'gpt-3.5-turbo';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openai_api_key,
    };
    const json_data = { model, messages: [{ role: 'user', content: prompt }], temperature: 0 };

    return prompt;
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

async function generateDocs(): Promise<void> {
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

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "doc4me" is now active!');

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
