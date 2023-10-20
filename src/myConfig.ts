import * as vscode from 'vscode';
import * as path from 'path';
import { PromptTemplate } from 'langchain/prompts';

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


export class MyConfig {
    public vsCodeConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
    private defaultRootPath: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    private defaultDocsPath: string = path.join(this.defaultRootPath, 'docs');
    public readonly summarizePrompt: string = "Summarize the following code explanation in at most one paragraph:\n"; // does not need to be configurable since the output depends on the explainProjectPrompt
    
    public readonly rootPath: string = this.vsCodeConfig.get('rootPath', this.defaultRootPath);
    public readonly docsPath: string = this.vsCodeConfig.get('docsPath', this.defaultDocsPath);
    public readonly model: string = this.vsCodeConfig.get('model', 'gpt-3.5-turbo');
    public readonly explainFilePrompt: string =  this.vsCodeConfig.get('fileExplanationPrompt', 'Explain the following code: \n');
    public readonly explainProjectPrompt: string = this.vsCodeConfig.get('projectExplanationPrompt', 'Explain what this code project do, given the following explanations of each file: \n');
    public apiKey: string = this.vsCodeConfig.get('openAiApiKey', '');
    public readonly supportedFileExtension: string[] = this.vsCodeConfig.get('supportedCodeExtensions', ["py", "js", "ts"]);
    public readonly directoriesToIgnore: string[] = this.vsCodeConfig.get('directoriesToIgnore', ["docs", "node_modules", "dist"]);

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

    constructor(){
        const docsDir = vscode.Uri.file(this.docsPath);
        vscode.workspace.fs.createDirectory(docsDir);
    }
}