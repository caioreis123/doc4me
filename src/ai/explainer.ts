import * as vscode from "vscode";
import { AI } from "./ai";
import { MyConfig } from "../myConfig";
import { Utils } from "../utils";


export class Explainer {
    static async explainCode(codePath: string, docExists: boolean, recreate: boolean, myConfig: MyConfig): Promise<string> {
        if (docExists && !recreate) { return ''; }
        let content: string = await Utils.getContent(codePath);
        if (!content) { return ''; }

        console.log(`Explaining ${codePath}`);
        const codeExplanation = await AI.askIA(myConfig.explainFilePrompt, content, codePath, myConfig);
        return codeExplanation;
    }

    static async explainFile(file: string, config: MyConfig): Promise<void> {
        const codeExplanation: string = await this.explainCode(file, false, true, config);
        await Utils.createDoc(codeExplanation, Utils.getDocFile(file, config));
    }

    static async explainFiles(filesToExplain: AsyncGenerator<string, any, unknown>, config: MyConfig): Promise<void> {
        let docExists: boolean = false;
        let recreate: boolean = true;
        let askedTheUserForRecreation: boolean = false;

        for await (const file of filesToExplain) {
            const docFile = Utils.getDocFile(file, config);
            docExists = await vscode.workspace.fs.stat(docFile).then(() => true, () => false);
            if (docExists && !askedTheUserForRecreation) {
                recreate = await vscode.window.showInformationMessage('Want to overwrite documentation generated previously?', 'Yes', 'No') === 'Yes';
                askedTheUserForRecreation = true;
            }
            const codeExplanation: string = await this.explainCode(file, docExists, recreate, config);
            await Utils.createDoc(codeExplanation, docFile);
        }
    }
}
