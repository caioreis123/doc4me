import { MyConfig } from "./myConfig";
import * as vscode from 'vscode';
import fetch from 'axios';
import { Utils } from "./utils";
import * as path from 'path';

export class AI{
    myConfig: MyConfig;
    utils: Utils;

    constructor(myConfig: MyConfig, utils: Utils){
        this.myConfig = myConfig;
        this.utils = utils;
    }

    docFile(file: string){
        const docPath: string = file.replace(this.myConfig.rootPath, this.myConfig.docsPath).slice(0, -2) + "md";
        const docFile: vscode.Uri = vscode.Uri.file(docPath);
        return docFile;
    }

    async explainFile(file: string){
        const codeExplanation: string = await this.explainCode(file, false, true, this.myConfig);
        await this.utils.createDoc(codeExplanation, this.docFile(file));
    }

    async explainFiles(filesToExplain: AsyncGenerator<string, any, unknown>): Promise<void>{
        let docExists: boolean = false;
        let recreate: boolean = true;
        let askedTheUserForRecreation: boolean = false;

        for await (const file of filesToExplain) {
            const docFile = this.docFile(file);
            docExists = await vscode.workspace.fs.stat(docFile).then(() => true, () => false);
            if (docExists && !askedTheUserForRecreation) {
                recreate = await vscode.window.showInformationMessage('Want to overwrite documentation generated previously?', 'Yes', 'No') === 'Yes';
                askedTheUserForRecreation = true;
            }
            const codeExplanation: string = await this.explainCode(file, docExists, recreate, this.myConfig);
            await this.utils.createDoc(codeExplanation, docFile);
        }
    }
    
    async askIA(prompt: string, config: MyConfig): Promise<string> {
        const model = config.model;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + config.apiKey,
        };
        const jsonData = { model, messages: [{ role: 'user', content: prompt }], temperature: 0 };
        
        const explanation = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers,
            data: JSON.stringify(jsonData),
        }).then(async (res) => {
            const jsonRes = await res.data as { error?: {message: string}, choices: { message: { content: string } }[] };
            if (jsonRes.error) {
                return `${this.utils.errorMessage} Response: ${jsonRes.error.message}`;
            }
            return jsonRes.choices[0].message.content;
        }).catch((err) => {
            return `${this.utils.errorMessage} Error: ${err}`;
        });
        return explanation;
    }

    async explainCode(codePath: string, docExists:boolean, recreate:boolean, myConfig: MyConfig): Promise<string> {
        if(docExists && !recreate){return '';}
        let content: string = await this.utils.readFile(vscode.Uri.file(codePath)).then((res) => res.toString());
        if (!content) {return '';}
    
        const prompt = myConfig.explainFilePrompt + content;
        console.log(`Explaining ${codePath}`);
        const codeExplanation = await this.askIA(prompt, myConfig);
        return codeExplanation;
    }

    async getFileSummarizations(): Promise<string> {
        let fileSummarizations: string = '';
        const docFiles = this.utils.getFiles(this.myConfig.docsPath);
        for await (const file of docFiles) {
            if (file.endsWith(this.utils.summaryFileName)) { continue; }
            const fileContent = await this.utils.readFile(vscode.Uri.file(file));
            const contentString = fileContent.toString();
            if (contentString.startsWith(this.utils.errorMessage)) { continue; }
            const prompt: string = this.myConfig.summarizePrompt + contentString;
            const summarizationSentence: string = await this.askIA(prompt, this.myConfig);
            fileSummarizations += `${file}\n${summarizationSentence}\n\n`;
        }
        return fileSummarizations;
    }

    async summarizeDocs(): Promise<void> {
        let fileSummarizations: string = await this.getFileSummarizations();
        await this.summarizeProject(fileSummarizations, this.myConfig);
    }
    
    async summarizeProject(summarization: string, myConfig: MyConfig): Promise<void> {
        const prompt = myConfig.explainProjectPrompt + summarization;
        const projectSummary = await this.askIA(prompt, myConfig);
        const summaryFilePath = path.join(myConfig.docsPath, this.utils.summaryFileName);
        const summaryFile = vscode.Uri.file(summaryFilePath);
        this.utils.writeFile(summaryFile, Buffer.from(projectSummary));
    }
}
