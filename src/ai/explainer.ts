import * as vscode from "vscode";
import { AI } from "./ai";
import { MyConfig } from "../myConfig";


export class Explainer {
    ai: AI;
    
    constructor(ai: AI) {
        this.ai = ai;
    }
    async explainCode(codePath: string, docExists: boolean, recreate: boolean, myConfig: MyConfig): Promise<string> {
        if (docExists && !recreate) { return ''; }
        let content: string = await this.ai.utils.getContent(codePath);
        if (!content) { return ''; }

        console.log(`Explaining ${codePath}`);
        const codeExplanation = await this.ai.askIA(myConfig.explainFilePrompt, content, codePath, myConfig);
        return codeExplanation;
    }

    async explainFile(file: string, config: MyConfig): Promise<void> {
        const codeExplanation: string = await this.explainCode(file, false, true, config);
        await this.ai.utils.createDoc(codeExplanation, this.ai.utils.getDocFile(file, config));
    }

    async explainFiles(filesToExplain: AsyncGenerator<string, any, unknown>, config: MyConfig): Promise<void> {
        let docExists: boolean = false;
        let recreate: boolean = true;
        let askedTheUserForRecreation: boolean = false;

        for await (const file of filesToExplain) {
            const docFile = this.ai.utils.getDocFile(file, config);
            docExists = await vscode.workspace.fs.stat(docFile).then(() => true, () => false);
            if (docExists && !askedTheUserForRecreation) {
                recreate = await vscode.window.showInformationMessage('Want to overwrite documentation generated previously?', 'Yes', 'No') === 'Yes';
                askedTheUserForRecreation = true;
            }
            const codeExplanation: string = await this.explainCode(file, docExists, recreate, config);
            await this.ai.utils.createDoc(codeExplanation, docFile);
        }
    }
}
