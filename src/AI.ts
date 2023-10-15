import { MyConfig, SupportedLanguages, fileExtensionToLanguage } from "./myConfig";
import * as vscode from 'vscode';
import { Utils } from "./utils";
import * as path from 'path';
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';
import { loadSummarizationChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";


export class AI{
    myConfig: MyConfig;
    utils: Utils;
    llm: OpenAI;
    

    constructor(myConfig: MyConfig, utils: Utils){
        this.myConfig = myConfig;
        this.utils = utils;
        this.llm = new OpenAI({modelName:myConfig.model, temperature: 0, openAIApiKey: myConfig.apiKey });
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

    async calculateTokens(filesToCalculate: AsyncGenerator<string, any, unknown>): Promise<void>{
        let csvContent = 'Tokens,File\n';
        let tokensTotal = 0;
        const csvFilePath = path.join(this.myConfig.docsPath, 'tokens.csv');
        const csvFile = vscode.Uri.file(csvFilePath);
        for await (const file of filesToCalculate) {
            let content: string = await this.utils.readFile(vscode.Uri.file(file)).then((res) => res.toString());
            if (!content) {continue;}
            const tokensAmount = await this.llm.getNumTokens(content);
            console.log(`${tokensAmount} tokens for ${file}`);
            const csvLine = `${tokensAmount},${file}\n`;
            csvContent += csvLine;
            tokensTotal += tokensAmount;
        }
        csvContent += `${tokensTotal},All files\n`;
        this.utils.writeFile(csvFile, Buffer.from(csvContent));
    }

    async queryTextFragments(content: string, filePath: string): Promise<string> {
        console.log(`Splitting big file in chunks: ${filePath}`);
        try{
            const fileExtension: string = filePath.split('.').pop() || '';
            const fileLanguage: SupportedLanguages = fileExtensionToLanguage[fileExtension];
            const splitConfig = {
                chunkSize: 10000, // this number was found empirically trying to find the maximum number of tokens that OpenAI can process per call
                chunkOverlap: 0,
            };
            let textSplitter;
            if (!!fileLanguage){
                textSplitter = RecursiveCharacterTextSplitter.fromLanguage(fileLanguage, splitConfig);
            }
            else{
                textSplitter = new RecursiveCharacterTextSplitter(splitConfig);
            }
            const docs = await textSplitter.createDocuments([content]);
            console.log(docs.length+ " chunks created");

            const refinePromptTemplateString = `
            Your job is to produce a final summary
            We have provided an existing summary up to a certain point: "{existing_answer}"
            We have the opportunity to refine the existing summary
            (only if needed) with some more context below.
            ------------
            "{text}"
            ------------

            If the context isn't useful, return the original summary.
            Given the new context, refine the original summary in the same language as the following prompt between ###:\n
            ###${this.myConfig.explainFilePrompt}###
            `; // this prompting template is necessary to allow model responses in different languages

            const refinePrompt = new PromptTemplate({
            inputVariables: ["existing_answer", "text"],
            template: refinePromptTemplateString,
            });

            const chain = loadSummarizationChain(this.llm, {type:"refine", refinePrompt: refinePrompt});
            const outputSummary = chain.run(docs);
            return outputSummary;
        }
        catch(err){
            return `${this.utils.errorMessage}The file was to big and Doc4Me failed on breaking it in chunks due to the following error: ${err}`;
        }
    }
    
    async askIA(prompt: string, content: string, filePath: string): Promise<string> {
        try{
            return await this.llm.predict(prompt + content);
        }
        catch(error: any){
            if(error.code === 'context_length_exceeded'){
                return await this.queryTextFragments(content, filePath);
            }
            throw error;
        }
    }

    async explainCode(codePath: string, docExists:boolean, recreate:boolean, myConfig: MyConfig): Promise<string> {
        if(docExists && !recreate){return '';}
        let content: string = await this.utils.readFile(vscode.Uri.file(codePath)).then((res) => res.toString());
        if (!content) {return '';}
    
        console.log(`Explaining ${codePath}`);
        const codeExplanation = await this.askIA(myConfig.explainFilePrompt, content, codePath);
        return codeExplanation;
    }

     /**
     * Summarize all docs in the docs folder into a single file.
     */
     async summarizeDocs(): Promise<void> {
        let fileSummarizations: string = await this.getFileSummarizations();
        await this.summarizeProject(fileSummarizations, this.myConfig);
    }

    async getFileSummarizations(): Promise<string> {
        let fileSummarizations: string = '';
        const docFiles = this.utils.getFiles(this.myConfig.docsPath);
        for await (const file of docFiles) {
            if (file.endsWith(this.utils.summaryFileName)) { continue; } // avoids endless recursion
            const fileContent = await this.utils.readFile(vscode.Uri.file(file));
            const contentString = fileContent.toString();
            if (contentString.startsWith(this.utils.errorMessage)) { continue; } // avoids summarizing files that failed to be explained
            const summarizationSentence: string = await this.askIA(this.myConfig.summarizePrompt, contentString, file);
            fileSummarizations += `${file}\n${summarizationSentence}\n\n`;
        }
        return fileSummarizations;
    }
    
    /**
     * @param {string} summarization - A string with a paragraph for each file explanation separated by \n\n. This string will be used as input to generate a unified summary of the project.
     * @param {MyConfig} myConfig - The configuration object.
     * @returns {Promise<void>} - A promise that resolves when the summary file is written.
     */ 
    async summarizeProject(summarization: string, myConfig: MyConfig): Promise<void> {
        const projectSummary = await this.askIA(myConfig.explainProjectPrompt, summarization, '.md');
        const summaryFilePath = path.join(myConfig.docsPath, this.utils.summaryFileName);
        const summaryFile = vscode.Uri.file(summaryFilePath);
        this.utils.writeFile(summaryFile, Buffer.from(projectSummary));
    }
}
