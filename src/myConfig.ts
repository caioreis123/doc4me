import * as vscode from 'vscode';
import * as path from 'path';
import { PromptTemplate } from 'langchain/prompts';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMResult } from 'langchain/dist/schema';
import { BillCalculator } from './billCalculator';
import * as fs from 'fs';

export type SupportedLanguages = "cpp" | "go" | "java" | "js" | "php" | "proto" | "python" | "rst" | "ruby" | "rust" | "scala" | "swift" | "markdown" | "latex" | "html" | "sol";

export const FILE_EXTENSION_TO_LANGUAGE: { [extension: string]: SupportedLanguages } = {
    "cpp": "cpp",
    "go": "go",
    "java": "java",
    "js": "js",
    "php": "php",
    "proto": "proto",
    "py": "python",
    "rst": "rst",
    "rb": "ruby",
    "rs": "rust",
    "scala": "scala",
    "swift": "swift",
    "md": "markdown",
    "tex": "latex",
    "html": "html",
    "sol": "sol"
};

export const ROOT_PATH: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
export const SUMMARIZE_PROMPT: string = "Summarize the following code explanation in at most one paragraph using the same language used on the explanation, which means to answer in portuguese if the explanation is written in portuguese. The explanation is:\n"; // does not need to be configurable since the output depends on the explainProjectPrompt
export const DOC_EXTENSION = 'md';
export const SUMMARY_FILE_NAME = `projectSummary.${DOC_EXTENSION}`;
export const ERROR_MESSAGE = 'Could not get AI response. ';
export const ASK_FILE = `ask.${DOC_EXTENSION}`;
export const TOKENS_FILE = 'tokens.csv';

const supportedCodeExtensionsThatDoNotHaveTextSplitter = "ts";

const defaultConfig: { [key: string]: string } = {
    model: "gpt-3.5-turbo",
    docsPath: path.join(ROOT_PATH, 'docs'),
    supportedCodeExtensions: Object.keys(FILE_EXTENSION_TO_LANGUAGE).filter((ext) => ext !== "md").join(',') + `,${supportedCodeExtensionsThatDoNotHaveTextSplitter}`, // important to avoid explaining markdown files,
    directoriesToIgnore: "test,tests,docs,node_modules,dist,target,build,out,bin",
    fileExplanationPrompt: 'Use markdown format to explain this code in detail: \n',
    projectExplanationPrompt: 'Explain what this code project do, based on the following file explanations and using the same language of these explanations, which means to answer in portuguese if the explanation are written in portuguese. The explanations are: \n',
};

export class MyConfig {
    private vsCodeConfig: vscode.WorkspaceConfiguration;
    public readonly docsPath: string;
    public readonly supportedFileExtension: string[];
    public readonly directoriesToIgnore: string[];
    public readonly explainFilePrompt: string;
    public readonly explainProjectPrompt: string;
    public readonly refinePrompt: PromptTemplate;
    public tokenFile: string = '';
    public llm: ChatOpenAI | undefined;

    constructor(){
        // we need to create a new config here in order to get values changed by the user after the extension was activated
        this.vsCodeConfig = vscode.workspace.getConfiguration();
        
        // creates the docs directory if it doesn't exist
        this.docsPath = this.getConf('docsPath');
        this.createDocsDirectory();
        this.checkAndCreateCSVTokensFile();

        this.supportedFileExtension = this.getConf('supportedCodeExtensions').split(',');
        this.directoriesToIgnore = this.getConf('directoriesToIgnore').split(',');

        // creates prompts
        this.explainFilePrompt =  this.getConf('fileExplanationPrompt');
        this.explainProjectPrompt = this.getConf('projectExplanationPrompt');
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
            ###${this.explainFilePrompt}###
            `; 
            // this prompting template is necessary to allow model responses in different languages
            // this is used in the last step of explaining a big file, after it is broken in chunks

        this.refinePrompt = new PromptTemplate({
        inputVariables: ["existing_answer", "text"],
        template: refinePromptTemplateString,
        });
    }

    public createDocsDirectory(): void {
        if (!fs.existsSync(this.docsPath)){
            fs.mkdirSync(this.docsPath);
        }
    }

    public createCSVTokensFile(): void {
        const csvHeader = 'file,inputTokens,outputTokens,totalTokens,time\n';
        fs.writeFileSync(this.tokenFile, csvHeader);
    }

    private checkAndCreateCSVTokensFile(): void {
        this.tokenFile = path.join(this.docsPath, TOKENS_FILE);
        const tokenFileExists = fs.existsSync(this.tokenFile);
        if (tokenFileExists) {return;}
        this.createCSVTokensFile();
    }

    public getConf(key: string): string {
        const value = this.vsCodeConfig.get(`doc4me.${key}`, '');
        if (!value  && defaultConfig[key]){
            return defaultConfig[key];
        }
        return value;
    }

    public async buildLLM(): Promise<void>{
        const model: string = this.getConf('model');
        
        let apiKey = this.vsCodeConfig.get('doc4me.openaiAPIKey', '');

        if (!apiKey) {
            await vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true}).then((inputValue) => {
                if (inputValue) {
                    this.vsCodeConfig.update('doc4me.openaiAPIKey', inputValue, true);
                    apiKey = inputValue;
                }
            });
        }
        this.llm =  new ChatOpenAI({modelName:model, temperature: 0, openAIApiKey: apiKey});
    }

    public addCallbackToLLM(filePath: string): void{
        if (!this.llm) {return;}
        const callbacks = [
            {
                handleLLMEnd: async (output: LLMResult) => {
                    const usage = output.llmOutput?.tokenUsage;
                    const inputTokens = usage.promptTokens;
                    const outputTokens = usage.completionTokens;
                    const totalTokens = usage.totalTokens;
                    const now = new Date().toISOString();
                    const csvLine = `${filePath},${inputTokens},${outputTokens},${totalTokens},${now}\n`;
                    BillCalculator.appendCSVFile(csvLine, this.docsPath);
                }
            }
        ];
        this.llm.callbacks = callbacks;
    }
}
