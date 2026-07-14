import { DETECTION_CONFIDENCE_THRESHOLD } from "../config/constants.js";
import { applyNMS } from "./nms.js";
import { logger } from "../utils/logger.js";
import type { RawDetection, ProcessedDetection } from "../types/index.js";

/**
 * Filter, format, and apply NMS to raw detections.
 */
export function postprocessDetections(rawDetections: RawDetection[]): ProcessedDetection[] {
  logger.info("DETR Postprocess", "Filtering and postprocessing raw detections...");

  // 1. Filter by confidence and convert structure
  const processed: ProcessedDetection[] = [];

  for (const raw of rawDetections) {
    if (raw.confidence < DETECTION_CONFIDENCE_THRESHOLD) {
      continue;
    }

    const [x, y, w, h] = raw.bbox;
    processed.push({
      boundingBox: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      },
      elementClass: raw.class,
      detectionConfidence: raw.confidence,
    });
  }

  logger.debug("DETR Postprocess", `Filtered ${rawDetections.length} down to ${processed.length} based on confidence threshold of ${DETECTION_CONFIDENCE_THRESHOLD}`);

  // 2. Apply Non-Maximum Suppression to remove duplicates
  const finalDetections = applyNMS(processed, 0.5);

  logger.success(
    "DETR Postprocess",
    `Completed postprocessing successfully. Suppressed ${processed.length - finalDetections.length} overlapping boxes. Total detections: ${finalDetections.length}`
  );

  return finalDetections;
}
