/**
 * Fidelity thresholds used by the fidelity assessor.
 * These control when an image is classified as LOW vs MEDIUM_HIGH fidelity.
 */
export const FIDELITY = {
  /** Minimum dimension (px) — below this suggests a low-fidelity sketch */
  MIN_DIMENSION: 400,
  /** Sharpness threshold (Laplacian variance). Below = blurry/hand-drawn */
  SHARPNESS_THRESHOLD: 100,
  /** Edge density threshold. Below = fewer clean edges, likely a sketch */
  EDGE_DENSITY_THRESHOLD: 0.05,
  /** Color variance threshold. Below = near-monochrome, likely a sketch */
  COLOR_VARIANCE_THRESHOLD: 30,
} as const;

/**
 * Confidence threshold for DETR detections.
 * Detections below this are discarded.
 */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.35;
