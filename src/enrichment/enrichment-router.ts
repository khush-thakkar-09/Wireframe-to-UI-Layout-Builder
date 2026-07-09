import path from "path";
import fs from "fs";
import sharp from "sharp";
import { cropBoundingBox } from "./cropper.js";
import { extractText, destroyOcrService } from "./ocr-service.js";
import { describeElement } from "./vlm-service.js";
import { logger } from "../utils/logger.js";
import type { ProcessedDetection, EnrichedDetection } from "../types/index.js";

/**
 * Route components to their class-specific enrichment flow.
 * Save individual cropped parts and their respective output to folder for verification and testing.
 */
export async function enrichDetections(
  detections: ProcessedDetection[],
  originalImageBuffer: Buffer,
  outputDir: string
): Promise<EnrichedDetection[]> {
  logger.info("Enrichment Router", `Beginning enrichment process for ${detections.length} elements...`);

  // Create crop test output folder inside the specified output directory
  const cropOutputDir = path.join(outputDir, "crops");
  if (!fs.existsSync(cropOutputDir)) {
    fs.mkdirSync(cropOutputDir, { recursive: true });
  }

  const enrichedDetections: EnrichedDetection[] = [];

  // Iterate sequentially to avoid overwhelming Bedrock/ONNX APIs in parallel
  for (let idx = 0; idx < detections.length; idx++) {
    const det = detections[idx]!;
    const elementId = `element_${idx + 1}`;
    logger.info("Enrichment Router", `Processing ${elementId} (${det.detrClass})...`);

    // 1. Crop part from original image buffer
    const cropBuffer = await cropBoundingBox(originalImageBuffer, det.boundingBox);

    // Save cropped image for testing/debugging
    const cropImageFilename = `${elementId}_crop.png`;
    const cropImagePath = path.join(cropOutputDir, cropImageFilename);
    await sharp(cropBuffer).toFile(cropImagePath);

    const enriched: EnrichedDetection = {
      ...det,
      id: elementId,
    };

    let detailsOutput: any = {};

    // 2. Class specific routing logic
    if (det.detrClass === "Navigation_Tab" || det.detrClass === "Text_Display") {
      // OCR Route
      logger.debug("Enrichment Router", `Routing ${elementId} to PaddleOCR...`);
      const ocrResult = await extractText(cropBuffer);
      enriched.ocr = ocrResult;
      detailsOutput = { ocr: ocrResult };
    } else if (det.detrClass === "Icon_Button" || det.detrClass === "Visual_Element") {
      // VLM Route
      logger.debug("Enrichment Router", `Routing ${elementId} to Qwen3-VL VLM...`);
      const vlmResult = await describeElement(cropBuffer, det.detrClass);
      enriched.vlm = vlmResult;
      detailsOutput = { vlm: vlmResult };
    } else {
      // Action_Button and Input_Container - no separate enrichment as per dataset structure comments
      logger.debug("Enrichment Router", `Skipping enrichment for ${elementId} (${det.detrClass})`);
      detailsOutput = { skipped: true };
    }

    // Save corresponding JSON output for the crop
    const jsonOutputFilename = `${elementId}_output.json`;
    const jsonOutputPath = path.join(cropOutputDir, jsonOutputFilename);
    fs.writeFileSync(jsonOutputPath, JSON.stringify({ id: elementId, class: det.detrClass, ...detailsOutput }, null, 2), "utf-8");

    enrichedDetections.push(enriched);
  }

  // Gracefully clean up OCR engine resources
  await destroyOcrService();

  logger.success("Enrichment Router", "All components successfully processed and enriched.");
  return enrichedDetections;
}
export { destroyOcrService };
