import path from "path";
import fs from "fs";
import sharp from "sharp";
import { cropBoundingBox } from "./cropper.js";
import { batchClassifyElements } from "./batch-vlm-classifier.js";
import { logger } from "../utils/logger.js";
import type { ProcessedDetection, EnrichedDetection } from "../types/index.js";

/**
 * Perform VLM enrichment for all detected bounding boxes in parallel batches.
 * Save individual cropped parts and their respective output to folder for verification and testing.
 */
export async function enrichDetections(
  detections: ProcessedDetection[],
  originalImageBuffer: Buffer,
  outputDir: string
): Promise<EnrichedDetection[]> {
  logger.info("Enrichment Router", `Beginning class-agnostic VLM enrichment for ${detections.length} elements...`);

  // Create crop test output folder inside the specified output directory
  const cropOutputDir = path.join(outputDir, "crops");
  if (!fs.existsSync(cropOutputDir)) {
    fs.mkdirSync(cropOutputDir, { recursive: true });
  }

  const batchItems: { id: string; buffer: Buffer }[] = [];
  const enrichedDetections: EnrichedDetection[] = [];

  // 1. Crop all components first
  for (let idx = 0; idx < detections.length; idx++) {
    const det = detections[idx]!;
    const elementId = `element_${idx + 1}`;
    
    // Crop part from original image buffer
    const cropBuffer = await cropBoundingBox(originalImageBuffer, det.boundingBox);

    // Save cropped image for testing/debugging
    const cropImageFilename = `${elementId}_crop.png`;
    const cropImagePath = path.join(cropOutputDir, cropImageFilename);
    await sharp(cropBuffer).toFile(cropImagePath);

    batchItems.push({
      id: elementId,
      buffer: cropBuffer,
    });

    enrichedDetections.push({
      ...det,
      id: elementId,
    });
  }

  // 2. Perform batched classification in parallel chunks
  const classificationResults = await batchClassifyElements(batchItems, 8);

  // 3. Map classification details back and save crop metadata JSONs
  for (const enriched of enrichedDetections) {
    const vlmResult = classificationResults.get(enriched.id);
    if (vlmResult) {
      enriched.vlm = vlmResult;
      // Overwrite raw "unknown" detection class with the natural language class returned by VLM
      enriched.elementClass = vlmResult.class;
    }

    // Save corresponding JSON output for the crop
    const jsonOutputFilename = `${enriched.id}_output.json`;
    const jsonOutputPath = path.join(cropOutputDir, jsonOutputFilename);
    fs.writeFileSync(
      jsonOutputPath,
      JSON.stringify(
        {
          id: enriched.id,
          class: enriched.elementClass,
          description: enriched.vlm?.description,
          boundingBox: enriched.boundingBox,
          detectionConfidence: enriched.detectionConfidence,
        },
        null,
        2
      ),
      "utf-8"
    );
  }

  logger.success("Enrichment Router", "All components successfully processed and enriched.");
  return enrichedDetections;
}

