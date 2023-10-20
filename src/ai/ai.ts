import { MyConfig, SupportedLanguages, fileExtensionToLanguage } from "../myConfig";
import * as vscode from 'vscode';
import { Utils } from "../utils";
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';
import { loadSummarizationChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { Explainer } from "./explainer";
import { Summarizer } from "./summarizer";
import { throws } from "assert";


export class AI{
    myConfig: MyConfig;
    utils: Utils;
    // llm: OpenAI;
    explainer: Explainer;
    summarizer: Summarizer;

    getLLM(): any{
        if (!this.myConfig.apiKey){
            vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true})
            .then((apiKey) => {
                if (apiKey) {
                    this.myConfig.apiKey = apiKey;
                    this.myConfig.vsCodeConfig.update('openAiApiKey', apiKey, true);
                    const llm = new OpenAI({modelName:this.utils.myConfig.model, temperature: 0, openAIApiKey: apiKey });
                    return llm;
                }
            }
        )
        ;};
    }

    constructor(){
        const utils = new Utils();
        this.myConfig = utils.myConfig;
        this.utils = utils;
        this.explainer = new Explainer(this);
        this.summarizer = new Summarizer(this);
    }

    async queryTextFragments(llm: OpenAI, content: string, filePath: string): Promise<string> {
        console.log(`Splitting big file in chunks: ${filePath}`);
        try{
            const fileExtension: string = filePath.split('.').pop() || '';
            const fileLanguage: SupportedLanguages = fileExtensionToLanguage[fileExtension];
           
            const splitConfig = {
                chunkSize: 10000, // this number was found empirically trying to find the maximum number of tokens that OpenAI can process per call
                chunkOverlap: 0,
            };
            
            const textSplitter = fileLanguage
            ? RecursiveCharacterTextSplitter.fromLanguage(fileLanguage, splitConfig)
            : new RecursiveCharacterTextSplitter(splitConfig);

            
            const docs = await textSplitter.createDocuments([content]);
            console.log(docs.length+ " chunks created");

            const chain = loadSummarizationChain(llm, {type:"refine", refinePrompt: this.myConfig.refinePrompt});
            return chain.run(docs);
        }
        catch(err){
            return `${this.myConfig.errorMessage}The file was to big and Doc4Me failed on breaking it in chunks due to the following error: ${err}`;
        }
    }
    
    async askIA(llm: OpenAI, prompt: string, content: string, filePath: string): Promise<string> {

        try{
            return await llm.predict(prompt + content);
        }
        catch(error: any){
            if(error.code === 'context_length_exceeded'){
                return await this.queryTextFragments(llm, content, filePath);
            }
            throw error;
        }
    }

    async askFile(file: string, question: string){
        const llm = this.getLLM();

        const content: string = await this.utils.getContent(file);
        if (!content) {return;}
        
        const answer = await this.askIA(llm, question, content, file);
        
        vscode.window.showInformationMessage(answer);
        const answerWithLineBreaks = answer.split('. ').join('.\n');
        this.utils.writeFile('.qa.txt', answerWithLineBreaks);
        vscode.window.showInformationMessage('The full answer is in the file .qa.txt');
    }

    async calculateTokens(filesToCalculate: AsyncGenerator<string, any, unknown>): Promise<void>{
        const llm = this.getLLM();

        let csvContent = 'Tokens,File\n';
        let tokensTotal = 0;
        for await (const file of filesToCalculate) {
            let content: string = await this.utils.getContent(file);
            if (!content) {continue;}
            const tokensAmount = await llm.getNumTokens(content);
            console.log(`${tokensAmount} tokens for ${file}`);
            const csvLine = `${tokensAmount},${file}\n`;
            csvContent += csvLine;
            tokensTotal += tokensAmount;
        }
        csvContent += `${tokensTotal},All files\n`;
        this.utils.writeFile('tokens.csv', csvContent);
    }
}


