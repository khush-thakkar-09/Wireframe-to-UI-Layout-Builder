import sharp from "sharp";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.js";
import type { PreprocessResult } from "../types/index.js";

/**
 * Preprocess a low-fidelity image to improve DETR detection quality.
 *
 * Pipeline:
 * 1. Grayscale conversion — removes color noise from sketches
 * 2. Contrast enhancement — normalize to use full dynamic range
 * 3. Noise reduction — median filter to smooth rough pencil/pen strokes
 * 4. Binarisation — threshold to clean black/white for sharp edges
 *
 * Only called when fidelity = LOW.
 */
export async function preprocessImage(imagePath: string, outputDir: string): Promise<PreprocessResult> {
  logger.info("Preprocess", `Starting preprocessing for: ${imagePath}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  const outputPath = path.join(outputDir, `${basename}_preprocessed.png`);

  const processedBuffer = await sharp(imagePath)
    // Step 1: Grayscale — strip color, focus on structure
    .greyscale()
    // Step 2: Normalize — stretch histogram for full contrast
    .normalize()
    // Step 3: Median filter — reduces pen/pencil noise while preserving edges
    .median(3)
    // Step 4: Threshold — binarise to clean black and white
    .threshold(128)
    // Output as PNG (lossless)
    .png()
    .toBuffer();

  // Save the preprocessed image
  await sharp(processedBuffer).toFile(outputPath);

  logger.success("Preprocess", `Preprocessed image saved to: ${outputPath}`);

  return {
    preprocessed: true,
    imageBuffer: processedBuffer,
    originalPath: imagePath,
    outputPath,
  };
}

/**
 * Skip preprocessing for medium/high fidelity images.
 * Just loads the original image buffer.
 */
export async function skipPreprocessing(imagePath: string): Promise<PreprocessResult> {
  logger.info("Preprocess", "Fidelity is MEDIUM_HIGH — skipping preprocessing");

  const imageBuffer = await sharp(imagePath).toBuffer();

  return {
    preprocessed: false,
    imageBuffer,
    originalPath: imagePath,
  };
}
