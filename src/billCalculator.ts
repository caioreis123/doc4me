import { MyConfig, TOKENS_FILE } from "./myConfig";
import { Utils } from "./utils";
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class BillCalculator{
    static calculateTokens(config: MyConfig): void {
        if (this.hasNoCSVData(config)) {
            const message = 'No token usage data found. Please run one of the other doc4me commands first to start using the OpenAI API.';
            vscode.window.showInformationMessage(message);
            return;
        }
        let input: number = 0;
        let output: number = 0;
        const csvContent = this.getCSVContent(config);
        const lines = csvContent.split('\n');
        lines.shift(); // removes the header
        lines.forEach(line => {
            const [file, inputTokens, outputTokens, totalTokens, time] = line.split(',');
            if (totalTokens) {
                input += parseInt(inputTokens);
                output += parseInt(outputTokens);
            }
        });
        this.showBill(input, output);
    }

    static showBill(input: number, output: number): void {
        const inputDollars = input * 0.0000015;
        const outputDollars = output * 0.000002;
        const bill = inputDollars + outputDollars;
        const message = `U$${bill.toFixed(4)}! (If you are using the default gpt-3.5 model and the OpenAI price for it still $0.0015 for 1K input tokens and $0.002 for 1K output tokens.)`;
        vscode.window.showInformationMessage(message);
    }

    static getCSVContent(config: MyConfig): string {
        const csvFile = path.join(config.docsPath, TOKENS_FILE);
        const content = fs.readFileSync(csvFile, 'utf8');
        return content;
    }

    static hasNoCSVData(config: MyConfig): boolean {
        const content = this.getCSVContent(config);
        return content.endsWith('time\n');
    }

    static async askForCSVOverwriting(config: MyConfig): Promise<void> {
        if (this.hasNoCSVData(config)) {return;}
        const shouldOverWriteCSV = await vscode.window.showInformationMessage('Want to overwrite token usage file?', 'Yes', 'No') === 'Yes';
        if (!shouldOverWriteCSV) {return;}
        config.createCSVTokensFile();
    }

    static async appendCSVFile(content: string, docsPath: string): Promise<void>{
        const filePath = path.join(docsPath, TOKENS_FILE);
        const existingContent = await Utils.getContent(filePath);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(existingContent + content));
    }
}