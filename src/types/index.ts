import { DETECTION_CONFIDENCE_THRESHOLD } from "../config/constants.js";

/** Bounding box coordinates */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Raw detection output from the inference server */
export interface RawDetection {
  bbox: [number, number, number, number]; // [x, y, w, h] format
  class: string;
  confidence: number;
}

/** Processed detection output after format normalization and filtering */
export interface ProcessedDetection {
  boundingBox: BoundingBox;
  detrClass: string;
  detrConfidence: number;
}

/** Image fidelity classification */
export type Fidelity = "LOW" | "MEDIUM_HIGH";

/** Result of the fidelity assessment */
export interface FidelityResult {
  fidelity: Fidelity;
  dimensions: { width: number; height: number };
  sharpness: number;
  edgeDensity: number;
  colorVariance: number;
}

/** Result of the preprocessing step */
export interface PreprocessResult {
  /** Whether preprocessing was applied */
  preprocessed: boolean;
  /** The image buffer (original if skipped, processed if applied) */
  imageBuffer: Buffer;
  /** Original image path */
  originalPath: string;
  /** Path where preprocessed image was saved (if applicable) */
  outputPath?: string;
}

/** OCR Extraction Result */
export interface OcrResult {
  text: string;
}

/** VLM Generation Result */
export interface VlmResult {
  description: string;
  subType: string;
}

/** Enriched component detection */
export interface EnrichedDetection extends ProcessedDetection {
  id: string;
  ocr?: OcrResult;
  vlm?: VlmResult;
}

/** Structured tree node representing sorted, nested layout components */
export interface LayoutNode extends EnrichedDetection {
  children?: LayoutNode[];
}


