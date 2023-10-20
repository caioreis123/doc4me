import * as vscode from 'vscode';
import * as path from 'path';
import { PromptTemplate } from 'langchain/prompts';
import { OpenAI } from "langchain/llms/openai";

export type SupportedLanguages = "cpp" | "go" | "java" | "js" | "php" | "proto" | "python" | "rst" | "ruby" | "rust" | "scala" | "swift" | "markdown" | "latex" | "html" | "sol";

export const fileExtensionToLanguage: { [extension: string]: SupportedLanguages } = {
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

const noMDExtensions = Object.keys(fileExtensionToLanguage).filter((ext) => ext !== "md");
const defaultDirToIgnore = ["test", "tests", "docs", "node_modules", "dist", "target", "build", "out", "bin"];


export class MyConfig {
    public vsCodeConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
    private defaultRootPath: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    private defaultDocsPath: string = path.join(this.defaultRootPath, 'docs');
    public readonly summarizePrompt: string = "Summarize the following code explanation in at most one paragraph:\n"; // does not need to be configurable since the output depends on the explainProjectPrompt
    
    public readonly rootPath: string = this.vsCodeConfig.get('doc4me.rootPath', this.defaultRootPath);
    public readonly docsPath: string = this.vsCodeConfig.get('doc4me.docsPath', this.defaultDocsPath);
    public readonly model: string = this.vsCodeConfig.get('doc4me.model', 'gpt-3.5-turbo');
    public readonly explainFilePrompt: string =  this.vsCodeConfig.get('doc4me.fileExplanationPrompt', 'Explain the following code: \n');
    public readonly explainProjectPrompt: string = this.vsCodeConfig.get('doc4me.projectExplanationPrompt', 'Explain what this code project do, given the following explanations of each file: \n');
    public apiKey: string = this.vsCodeConfig.get('doc4me.openAiApiKey', '');
    
    private sce = this.vsCodeConfig.get('doc4me.supportedCodeExtensions', []);
    public readonly supportedFileExtension: string[] = this.sce.length === 0 ? noMDExtensions : this.sce;
    
    private dti = this.vsCodeConfig.get('doc4me.directoriesToIgnore', []);
    public readonly directoriesToIgnore: string[] = this.dti.length === 0 ? defaultDirToIgnore : this.dti;

    private refinePromptTemplateString = `
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
        `; // this prompting template is necessary to allow model responses in different languages

    public refinePrompt = new PromptTemplate({
    inputVariables: ["existing_answer", "text"],
    template: this.refinePromptTemplateString,
    });

    public async getLLM(): Promise<OpenAI>{
        if (!this.apiKey) {
            await vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true}).then((inputValue) => {
                if (inputValue) {
                    this.vsCodeConfig.update('doc4me.openAiApiKey', inputValue, true);
                    this.apiKey = inputValue;
                }
            });
        }
        return new OpenAI({modelName:this.model, temperature: 0, openAIApiKey: this.apiKey });
    }

    constructor(){
        const docsDir = vscode.Uri.file(this.docsPath);
        vscode.workspace.fs.createDirectory(docsDir);
    }
}