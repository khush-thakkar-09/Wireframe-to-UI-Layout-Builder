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
  elementClass: string;
  detectionConfidence: number;
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

/** VLM Generation Result */
export interface VlmResult {
  /** Predefined element class (e.g. "cta_button", "text_heading") */
  class: string;
  /** Visible text content extracted from the element, if any */
  text_content: string;
  /** Foreground / text color in HEX (e.g. "#ffffff") */
  text_color: string;
  /** Background color in HEX (e.g. "#ef4444") */
  background_color: string;
  /** One-sentence visual description of the element */
  visual_description: string;
}

/** Enriched component detection */
export interface EnrichedDetection extends ProcessedDetection {
  id: string;
  vlm?: VlmResult;
}

/** Per-section color theme extracted from the original screenshot */
export interface SectionTheme {
  background_color: string;
  primary_text_color: string;
  secondary_text_color: string;
  accent_color: string;
  accent_hover_color: string;
}

/** Structured tree node representing sorted, nested layout components */
export interface LayoutNode extends EnrichedDetection {
  children?: LayoutNode[];
}


