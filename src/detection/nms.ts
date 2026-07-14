import type { ProcessedDetection } from "../types/index.js";

/**
 * Calculates the Intersection over Union (IoU) of two bounding boxes.
 */
function calculateIoU(boxA: ProcessedDetection["boundingBox"], boxB: ProcessedDetection["boundingBox"]): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;

  const unionArea = boxAArea + boxBArea - interArea;

  if (unionArea === 0) return 0;
  return interArea / unionArea;
}

/**
 * Applies Non-Maximum Suppression (NMS) to eliminate overlapping redundant bounding boxes.
 * 
 * @param detections List of normalized detections
 * @param iouThreshold Intersection-over-Union limit above which duplicate boxes are suppressed (default: 0.5)
 */
export function applyNMS(detections: ProcessedDetection[], iouThreshold = 0.5): ProcessedDetection[] {
  // Sort by confidence score descending
  const sorted = [...detections].sort((a, b) => b.detectionConfidence - a.detectionConfidence);
  const keep: ProcessedDetection[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    keep.push(current);

    // Filter out any boxes that overlap too much with the current box
    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIoU(current.boundingBox, sorted[i]!.boundingBox);
      if (iou > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return keep;
}
