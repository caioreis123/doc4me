import * as vscode from "vscode";
import * as path from "path";
import { AI } from "./ai/ai";
import { MyConfig, ROOT_PATH } from "./myConfig";
import { Utils } from "./utils";
import { Explainer } from "./ai/explainer";
import { Summarizer } from "./ai/summarizer";

class Commands{
    public commands: { [key: string]: () => Promise<void> };

    constructor() {
        vscode.window.showInformationMessage('Doc4me started! Wait for the message of completion at the end.');
        this.commands = { // we need to make all this binding so when we call the function it has the correct this of the class instead of the commands object
            'project': this.documentProject.bind(this),
            'file': this.documentCurrentFile.bind(this),
            'directory': this.documentCurrentDirectory.bind(this),
            'ask': this.askFile.bind(this),
            'calculate': this.calculate.bind(this),
        };
    }

    public async askFile(): Promise<void> {
        const question = await vscode.window.showInputBox({prompt: 'What do you want to ask?', ignoreFocusOut: true});
        if (question) {
            const config = new MyConfig();
            const currentFile = Utils.getCurrentFile();
            await AI.askFile(currentFile, question, config);
        }
    }
    
    public async calculate(): Promise<void> {
        const config = new MyConfig();
        await Utils.calculateTokens(config);
    }
    
    public async documentCurrentDirectory(): Promise<void> {
        const config = new MyConfig();
        const directoryPath = path.dirname(Utils.getCurrentFile());
        const files = Utils.getFiles(directoryPath, config.supportedFileExtension, config.directoriesToIgnore);
        await Explainer.explainFiles(files, config);
    }
    
    public async documentProject(): Promise<void> {
        const config = new MyConfig();
        await Utils.askForCSVOverwriting(config);
        const filesToExplain = Utils.getFiles(ROOT_PATH, config.supportedFileExtension, config.directoriesToIgnore);
        await Explainer.explainFiles(filesToExplain, config);
        await Summarizer.summarizeDocs(config);
    }
    
    public async documentCurrentFile(): Promise<void> {
        const config = new MyConfig();
        const currentFile = Utils.getCurrentFile();
        await Explainer.explainFile(currentFile, config);
    }
}

export default new Commands().commands;
