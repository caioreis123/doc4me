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

const noMDExtensions = Object.keys(fileExtensionToLanguage).filter((ext) => ext !== "md"); // important to avoid explaining markdown files with markdown
const defaultDirToIgnore = ["test", "tests", "docs", "node_modules", "dist", "target", "build", "out", "bin"];
const vsCodeConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
const userCodeExtensionsConfig = vsCodeConfig.get('doc4me.supportedCodeExtensions', []);
const userIgnoredDirsConfig = vsCodeConfig.get('doc4me.directoriesToIgnore', []);
let apiKey: string = vsCodeConfig.get('doc4me.openAiApiKey', '');
const defaultRootPath: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
const defaultDocsPath: string = path.join(defaultRootPath, 'docs');
const model: string = vsCodeConfig.get('doc4me.model', 'gpt-3.5-turbo');


export class MyConfig {
    constructor(){
        const docsDir = vscode.Uri.file(this.docsPath);
        vscode.workspace.fs.createDirectory(docsDir);
    }

    public readonly summarizePrompt: string = "Summarize the following code explanation in at most one paragraph:\n"; // does not need to be configurable since the output depends on the explainProjectPrompt
    public readonly summaryFileName = 'projectSummary.md';
    public readonly errorMessage = 'Could not get AI response. ';

    public readonly supportedFileExtension: string[] = userCodeExtensionsConfig.length === 0 ? noMDExtensions : userCodeExtensionsConfig;
    public readonly directoriesToIgnore: string[] = userIgnoredDirsConfig.length === 0 ? defaultDirToIgnore : userIgnoredDirsConfig;
    // this two step process to set configurations of array type is necessary because empty arrays are truthy in javascript

    public readonly rootPath: string = vsCodeConfig.get('doc4me.rootPath', defaultRootPath);
    public readonly docsPath: string = vsCodeConfig.get('doc4me.docsPath', defaultDocsPath);

    public readonly explainFilePrompt: string =  vsCodeConfig.get('doc4me.fileExplanationPrompt', 'Explain the following code: \n');
    public readonly explainProjectPrompt: string = vsCodeConfig.get('doc4me.projectExplanationPrompt', 'Explain what this code project do, given the following explanations of each file: \n');
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
        `; 
        // this prompting template is necessary to allow model responses in different languages
        // this is used in the last step of explaining a big file, after it is broken in chunks

    public refinePrompt = new PromptTemplate({
    inputVariables: ["existing_answer", "text"],
    template: this.refinePromptTemplateString,
    });

    public async getLLM(): Promise<OpenAI>{
        if (!apiKey) {
            await vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true}).then((inputValue) => {
                if (inputValue) {
                    vsCodeConfig.update('doc4me.openAiApiKey', inputValue, true);
                    apiKey = inputValue;
                }
            });
        }
        return new OpenAI({modelName:model, temperature: 0, openAIApiKey: apiKey });
    }
}