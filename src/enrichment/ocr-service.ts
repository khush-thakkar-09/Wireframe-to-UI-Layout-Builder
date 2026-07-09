import { PaddleOcrService } from "ppu-paddle-ocr";
import { CanvasProcessor } from "ppu-ocv";
import { logger } from "../utils/logger.js";
import type { OcrResult } from "../types/index.js";

let ocrServiceInstance: any = null;

/**
 * Perform text extraction on cropped image buffer using ppu-paddle-ocr.
 * The buffer must first be converted to a Canvas via ppu-ocv's CanvasProcessor,
 * because PaddleOCR's recognize() expects a canvas object, not a raw buffer.
 */
export async function extractText(cropBuffer: Buffer): Promise<OcrResult> {
  try {
    if (!ocrServiceInstance) {
      logger.info("OCR Service", "Initializing ppu-paddle-ocr engine...");
      ocrServiceInstance = new PaddleOcrService();
      await ocrServiceInstance.initialize();
    }

    // Convert raw image buffer to a Canvas object that PaddleOCR can process
    // CanvasProcessor expects string | ArrayBuffer | CanvasLike. We convert the Node Buffer to an ArrayBuffer.
    const arrayBuffer = cropBuffer.buffer.slice(cropBuffer.byteOffset, cropBuffer.byteOffset + cropBuffer.byteLength) as ArrayBuffer;
    const canvas = await CanvasProcessor.prepareCanvas(arrayBuffer);

    const results = await ocrServiceInstance.recognize(canvas);
    
    // Results is an array of detected text regions. Concatenate all text.
    let text = "";
    if (Array.isArray(results)) {
      text = results.map((r: any) => r.text ?? "").join(" ").trim();
    } else if (results?.text) {
      text = results.text.trim();
    }

    return { text };
  } catch (error) {
    logger.warn("OCR Service", `Failed to run OCR: ${(error as Error).message}. Returning empty string.`);
    return { text: "" };
  }
}

/**
 * Clean up OCR service resources.
 */
export async function destroyOcrService(): Promise<void> {
  if (ocrServiceInstance) {
    await ocrServiceInstance.destroy();
    ocrServiceInstance = null;
  }
}

