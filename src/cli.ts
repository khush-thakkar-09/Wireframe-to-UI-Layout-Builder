import { Command } from "commander";
import path from "path";
import fs from "fs";
import { logger } from "./utils/logger.js";
import { runPipeline } from "./index.js";

const program = new Command();

program
  .name("wireframe-to-ui")
  .description("Wireframe-to-UI-Code pipeline CLI")
  .version("1.0.0");

// Single entry point to run the entire pipeline
program
  .argument("<image>", "Path to the input image")
  .option("-o, --output <dir>", "Output directory", "./output")
  .action(async (image: string, options: { output: string }) => {
    try {
      const imagePath = path.resolve(image);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Input image file not found at: ${imagePath}`);
      }

      logger.info("Pipeline", "Starting the Wireframe-to-UI-Code execution pipeline...");
      
      const result = await runPipeline(imagePath, options.output);

      logger.success("Pipeline", "Entire pipeline execution flow completed successfully!");
      
      console.log("\n┌─────────────────────────────────────────┐");
      console.log("│           Pipeline Results               │");
      console.log("├─────────────────────────────────────────┤");
      console.log(`│  Fidelity:      ${result.fidelity.fidelity.padEnd(22)} │`);
      console.log(`│  Dimensions:    ${`${result.fidelity.dimensions.width}×${result.fidelity.dimensions.height}`.padEnd(22)} │`);
      console.log(`│  Preprocessed:  ${String(result.preprocess.preprocessed).padEnd(22)} │`);
      if (result.preprocess.outputPath) {
        console.log(`│  Output Path:   ${path.basename(result.preprocess.outputPath).padEnd(22)} │`);
      }
      console.log(`│  Detections:    ${String(result.detections.length).padEnd(22)} │`);
      console.log(`│  Enriched:      ${String(result.enrichedDetections.length).padEnd(22)} │`);
      console.log(`│  React Path:    ${path.basename(result.testingReactPath).padEnd(22)} │`);
      console.log("└─────────────────────────────────────────┘\n");
    } catch (err) {
      logger.error("Pipeline", `Pipeline execution failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();



