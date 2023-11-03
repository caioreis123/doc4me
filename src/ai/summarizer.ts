import * as vscode from "vscode";
import { AI } from "./ai";
import { ASK_FILE, ERROR_MESSAGE, MyConfig, SUMMARIZE_PROMPT, SUMMARY_FILE_NAME, TOKENS_FILE } from "../myConfig";
import { Utils } from "../utils";


export class Summarizer {
    /**
         * Summarize all docs in the docs folder into a single file.
         */
    static async summarizeDocs(config: MyConfig): Promise<void> {
        let fileSummarizations: string = await this.getFileSummarizations(config);
        await this.summarizeProject(fileSummarizations, config);
    }

    static async getFileSummarizations(config: MyConfig): Promise<string> {
        let fileSummarizations: string = '';
        const docFiles = Utils.getFiles(config.docsPath);
        for await (const file of docFiles) {
            if (file.endsWith(SUMMARY_FILE_NAME) || file.endsWith(ASK_FILE) || file.endsWith(TOKENS_FILE)) { continue; } // avoids auxiliary files
            const fileContent = await Utils.readFile(vscode.Uri.file(file));
            const contentString = fileContent.toString();
            if (contentString.startsWith(ERROR_MESSAGE)) { continue; } // avoids summarizing files that failed to be explained
            const summarizationSentence: string = await AI.askIA(SUMMARIZE_PROMPT, contentString, file, config);
            fileSummarizations += `${file}\n${summarizationSentence}\n\n`;
        }
        return fileSummarizations;
    }

    /**
     * @param {string} summarization - A string with a paragraph for each file explanation separated by \n\n. This string will be used as input to generate a unified summary of the project.
     * @param {MyConfig} myConfig - The configuration object.
     * @returns {Promise<void>} - A promise that resolves when the summary file is written.
     */
    static async summarizeProject(summarization: string, myConfig: MyConfig): Promise<void> {
        const projectSummary = await AI.askIA(myConfig.explainProjectPrompt, summarization, '.md', myConfig);
        Utils.writeFile(SUMMARY_FILE_NAME, projectSummary, myConfig.docsPath);
    }
}
