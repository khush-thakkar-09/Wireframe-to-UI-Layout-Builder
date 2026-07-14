import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export interface TokenRecord {
  stepName: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

class TokenTracker {
  private records: TokenRecord[] = [];

  /**
   * Reset all records
   */
  public reset(): void {
    this.records = [];
  }

  /**
   * Track token usage for a step, using character-based estimation as a fallback if usage is missing/zero.
   */
  public track(
    stepName: string,
    modelId: string,
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
    promptText?: string,
    outputText?: string,
    imageCount = 0,
    isCrop = false
  ): void {
    let input = usage?.promptTokens ?? 0;
    let output = usage?.completionTokens ?? 0;

    // Fallback estimation if SDK returns 0 or undefined
    if (input === 0 && promptText) {
      // General rule of thumb: ~4 characters per token for English text
      const textTokens = Math.ceil(promptText.length / 4);
      // Image token estimation
      let imageTokens = 0;
      if (imageCount > 0) {
        // High-res main screenshot takes ~1200 tokens, small crop takes ~250 tokens
        imageTokens = imageCount * (isCrop ? 250 : 1200);
      }
      input = textTokens + imageTokens;
    }

    if (output === 0 && outputText) {
      output = Math.ceil(outputText.length / 4);
    }

    const total = input + output;

    this.records.push({
      stepName,
      modelId,
      inputTokens: input,
      outputTokens: output,
      totalTokens: total,
    });
  }

  /**
   * Get all tracked records
   */
  public getRecords(): TokenRecord[] {
    return this.records;
  }

  /**
   * Get totals
   */
  public getTotals() {
    let totalInput = 0;
    let totalOutput = 0;

    for (const r of this.records) {
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
    }

    return {
      totalInput,
      totalOutput,
      totalTokens: totalInput + totalOutput,
    };
  }

  /**
   * Write report to tracker.txt at workspace root
   */
  public saveReport(): void {
    try {
      const totals = this.getTotals();
      
      let content = "==================================================\n";
      content += "               LLM Token Usage Report             \n";
      content += "==================================================\n\n";

      for (const r of this.records) {
        content += `Step Name:     ${r.stepName}\n`;
        content += `Model ID:      ${r.modelId}\n`;
        content += `Input Tokens:  ${r.inputTokens}\n`;
        content += `Output Tokens: ${r.outputTokens}\n`;
        content += `Total Tokens:  ${r.totalTokens}\n`;
        content += "--------------------------------------------------\n";
      }

      content += "\n==================================================\n";
      content += "                     TOTALS                       \n";
      content += "==================================================\n";
      content += `Total Input Tokens:  ${totals.totalInput}\n`;
      content += `Total Output Tokens: ${totals.totalOutput}\n`;
      content += `Total Tokens:        ${totals.totalTokens}\n`;
      content += "==================================================\n";

      const reportPath = path.resolve(process.cwd(), "tracker.txt");
      fs.writeFileSync(reportPath, content, "utf-8");
      logger.success("Token Tracker", `Token usage report saved to: ${reportPath}`);
    } catch (err) {
      logger.error("Token Tracker", `Failed to save tracker.txt: ${(err as Error).message}`);
    }
  }
}

export const tokenTracker = new TokenTracker();
