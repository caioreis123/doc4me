import * as vscode from "vscode";
import { AI } from "./ai";
import { ERROR_MESSAGE, MyConfig, SUMMARIZE_PROMPT, SUMMARY_FILE_NAME } from "../myConfig";


export class Summarizer {
    ai: AI;
    constructor(ai: AI) {
        this.ai = ai;
    }
    /**
         * Summarize all docs in the docs folder into a single file.
         */
    async summarizeDocs(config: MyConfig): Promise<void> {
        let fileSummarizations: string = await this.getFileSummarizations(config);
        await this.summarizeProject(fileSummarizations, config);
    }

    async getFileSummarizations(config: MyConfig): Promise<string> {
        let fileSummarizations: string = '';
        const docFiles = this.ai.utils.getFiles(config.docsPath);
        for await (const file of docFiles) {
            if (file.endsWith(SUMMARY_FILE_NAME)) { continue; } // avoids endless recursion
            const fileContent = await this.ai.utils.readFile(vscode.Uri.file(file));
            const contentString = fileContent.toString();
            if (contentString.startsWith(ERROR_MESSAGE)) { continue; } // avoids summarizing files that failed to be explained
            const summarizationSentence: string = await this.ai.askIA(SUMMARIZE_PROMPT, contentString, file, config);
            fileSummarizations += `${file}\n${summarizationSentence}\n\n`;
        }
        return fileSummarizations;
    }

    /**
     * @param {string} summarization - A string with a paragraph for each file explanation separated by \n\n. This string will be used as input to generate a unified summary of the project.
     * @param {MyConfig} myConfig - The configuration object.
     * @returns {Promise<void>} - A promise that resolves when the summary file is written.
     */
    async summarizeProject(summarization: string, myConfig: MyConfig): Promise<void> {
        const projectSummary = await this.ai.askIA(myConfig.explainProjectPrompt, summarization, '.md', myConfig);
        this.ai.utils.writeFile(SUMMARY_FILE_NAME, projectSummary, myConfig.docsPath);
    }
}
