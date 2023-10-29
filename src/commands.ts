import * as vscode from "vscode";
import * as path from "path";
import { AI } from "./ai/ai";
import { MyConfig, ROOT_PATH } from "./myConfig";

class Doc4Me{
    public ai: AI;

    constructor() {
        vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
        this.ai  = new AI();
    }

    public async askFile(): Promise<void> {
        const question = await vscode.window.showInputBox({prompt: 'What do you want to ask?', ignoreFocusOut: true});
        if (question) {
            const config = new MyConfig();
            const currentFile = this.ai.utils.getCurrentFile();
            await this.ai.askFile(currentFile, question, config);
        }
    }
    
    public async calculate(): Promise<void> {
        const config = new MyConfig();
        const files = this.ai.utils.getFiles(ROOT_PATH, config.supportedFileExtension, config.directoriesToIgnore);
        await this.ai.calculateTokens(files, config);
    }
    
    public async documentCurrentDirectory(): Promise<void> {
        const config = new MyConfig();
        const directoryPath = path.dirname(this.ai.utils.getCurrentFile());
        const files = this.ai.utils.getFiles(directoryPath, config.supportedFileExtension, config.directoriesToIgnore);
        await this.ai.explainer.explainFiles(files, config);
    }
    
    public async documentProject(): Promise<void> {
        const config = new MyConfig();
        const filesToExplain = this.ai.utils.getFiles(ROOT_PATH, config.supportedFileExtension, config.directoriesToIgnore);
        await this.ai.explainer.explainFiles(filesToExplain, config);
        await this.ai.summarizer.summarizeDocs(config);
    }
    
    public async documentCurrentFile(): Promise<void> {
        const config = new MyConfig();
        const currentFile = this.ai.utils.getCurrentFile();
        await this.ai.explainer.explainFile(currentFile, config);
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
