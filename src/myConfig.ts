import * as vscode from 'vscode';
import * as path from 'path';

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
    private vsCodeConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
    private defaultRootPath: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    private defaultDocsPath: string = path.join(this.defaultRootPath, 'docs');
    public readonly rootPath: string = this.vsCodeConfig.get('rootPath', this.defaultRootPath);
    public readonly docsPath: string = this.vsCodeConfig.get('docsPath', this.defaultDocsPath);
    public readonly model: string = this.vsCodeConfig.get('model', 'gpt-3.5-turbo');
    public readonly explainFilePrompt: string =  this.vsCodeConfig.get('fileExplanationPrompt', 'Explain the following code: \n');
    public readonly explainProjectPrompt: string = this.vsCodeConfig.get('projectExplanationPrompt', 'Explain what this code project do, given the following explanations of each file: \n');
    public apiKey: string = this.vsCodeConfig.get('openAiApiKey', '');
    public readonly supportedFileExtension: string[] = this.vsCodeConfig.get('supportedCodeExtensions', ["py", "js", "ts"]);
    public readonly directoriesToIgnore: string[] = this.vsCodeConfig.get('directoriesToIgnore', ["docs", "node_modules", "dist"]);
    public readonly summarizePrompt: string = this.vsCodeConfig.get('summarizationPrompt', 'Summarize the following code explanation in at most one paragraph:\n');

    constructor(){
        const docsDir = vscode.Uri.file(this.docsPath);
        vscode.workspace.fs.createDirectory(docsDir);
        if (!this.apiKey){
                vscode.window.showInputBox({prompt: 'Please enter your OpenAI API key', ignoreFocusOut: true}).then((apiKey) => {
                    if (apiKey) {
                        this.apiKey = apiKey;
                        this.vsCodeConfig.update('openAiApiKey', apiKey, true);
                    }
                }
            );};
    }
}