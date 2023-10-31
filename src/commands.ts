import * as vscode from "vscode";
import * as path from "path";
import { AI } from "./ai/ai";
import { MyConfig, ROOT_PATH } from "./myConfig";

class Commands{
    public ai: AI;
    public commands: { [key: string]: () => Promise<void> };

    constructor() {
        vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
        this.ai  = new AI();
        this.commands = { // we need to make all this binding so when we call the function it has the correct this of the class instead of the commands object
            'project': this.documentProject.bind(this),
            'file': this.documentCurrentFile.bind(this),
            'directory': this.documentCurrentDirectory.bind(this),
            'calculate': this.calculate.bind(this),
            'ask': this.askFile.bind(this),
        };
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

export default new Commands().commands;
