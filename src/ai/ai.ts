import { ASK_FILE, ERROR_MESSAGE, MyConfig, SupportedLanguages, FILE_EXTENSION_TO_LANGUAGE } from "../myConfig";
import * as vscode from 'vscode';
import { Utils } from "../utils";
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';
import { loadSummarizationChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models/openai";


export class AI{
    static async queryTextFragments(content: string, filePath: string, llm: ChatOpenAI, refinePrompt: PromptTemplate): Promise<string> {
        console.log(`Splitting big file in chunks: ${filePath}`);
        try{
            const fileExtension: string = filePath.split('.').pop() || '';
            const fileLanguage: SupportedLanguages = FILE_EXTENSION_TO_LANGUAGE[fileExtension];
            const splitConfig = {
                chunkSize: 10000, // this number was found empirically trying to find the maximum number of tokens that OpenAI can process per call
                chunkOverlap: 0,
            };
            const textSplitter = fileLanguage
            ? RecursiveCharacterTextSplitter.fromLanguage(fileLanguage, splitConfig)
            : new RecursiveCharacterTextSplitter(splitConfig);
            
            const docs = await textSplitter.createDocuments([content]);
            console.log(docs.length+ " chunks created");

            const chain = loadSummarizationChain(llm, {type:"refine", refinePrompt: refinePrompt});
            return chain.run(docs);
        }
        catch(err){
            return `${ERROR_MESSAGE}The file was to big and Doc4Me failed on breaking it in chunks due to the following error: ${err}`;
        }
    }
    
    static async askIA(prompt: string, content: string, filePath: string, config: MyConfig): Promise<string> {
        if(!config.llm){
            throw new Error('LLM model not loaded');
        }
        try{
            config.addCallbackToLLM(filePath);
            const llmResponse = await config.llm.predict(prompt + content);
            console.log('got llm response');
            return llmResponse;
        }
        catch(error: any){
            if(error.code === 'context_length_exceeded'){
                return await this.queryTextFragments(content, filePath, config.llm, config.refinePrompt);
            }
            throw error;
        }
    }

    static async askFile(file: string, question: string, config: MyConfig): Promise<void>{
        const content: string = await Utils.getContent(file);
        if (!content) {return;}
        
        const answer = await AI.askIA(question, content, file, config);
        
        vscode.window.showInformationMessage(answer);
        const answerWithLineBreaks = answer.split('. ').join('.\n');
        Utils.writeFile(ASK_FILE, answerWithLineBreaks, config.docsPath);
        vscode.window.showInformationMessage(`The full answer is in the file ${ASK_FILE}`);
    }
}


