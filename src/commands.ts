import * as vscode from "vscode";
import * as path from "path";
import { Utils } from "./utils";
import { MyConfig } from "./myConfig";
import { AI } from "./ai/ai";

function getAI(): AI {
    vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
    const myConfig = new MyConfig();
    const utils = new Utils(myConfig);
    const ai = new AI(utils);
    return ai;
}

class Doc4Me{
    public ai: AI;

    constructor() {
        this.ai = getAI();
    }

    public async askFile(): Promise<void> {
        const question = await vscode.window.showInputBox({prompt: 'What do you want to ask?', ignoreFocusOut: true});
        if (question) {
            await this.ai.askFile(this.ai.utils.getCurrentFile(), question);
        }
    }
    
    public async calculate(): Promise<void> {
        const files = this.ai.utils.getFiles(this.ai.myConfig.rootPath, this.ai.myConfig.supportedFileExtension, this.ai.myConfig.directoriesToIgnore);
        await this.ai.calculateTokens(files);
    }
    
    public async documentCurrentDirectory(): Promise<void> {
        const directoryPath = path.dirname(this.ai.utils.getCurrentFile());
        const files = this.ai.utils.getFiles(directoryPath, this.ai.myConfig.supportedFileExtension, this.ai.myConfig.directoriesToIgnore);
        await this.ai.explainer.explainFiles(files);
    }
    
    public async documentProject(): Promise<void> {
        const filesToExplain = this.ai.utils.getFiles(this.ai.myConfig.rootPath, this.ai.myConfig.supportedFileExtension, this.ai.myConfig.directoriesToIgnore);
        await this.ai.explainer.explainFiles(filesToExplain);
        await this.ai.summarizer.summarizeDocs();
    }
    
    public async documentCurrentFile(): Promise<void> {
        const currentFile = this.ai.utils.getCurrentFile();
        await this.ai.explainer.explainFile(currentFile);
    }
}

const doc4me = new Doc4Me();

const commands: { [key: string]: () => Promise<void> } = {
    'project': doc4me.documentProject.bind(doc4me),
    'file': doc4me.documentCurrentFile.bind(doc4me),
    'directory': doc4me.documentCurrentDirectory.bind(doc4me),
    'calculate': doc4me.calculate.bind(doc4me),
    'ask': doc4me.askFile.bind(doc4me),
};

export default commands;