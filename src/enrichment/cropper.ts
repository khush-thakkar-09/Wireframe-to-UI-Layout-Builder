import sharp from "sharp";
import { logger } from "../utils/logger.js";
import type { BoundingBox } from "../types/index.js";

/**
 * Extracts a sub-region (crop) of an image buffer based on a bounding box.
 */
export async function cropBoundingBox(imageBuffer: Buffer, box: BoundingBox): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width ?? 0;
  const imgHeight = metadata.height ?? 0;

  // Normalise/clamp crop dimensions to fit inside the image boundary
  const left = Math.max(0, Math.min(Math.round(box.x), imgWidth - 1));
  const top = Math.max(0, Math.min(Math.round(box.y), imgHeight - 1));
  
  // Ensure width and height are positive integers and do not overflow
  const width = Math.max(1, Math.min(Math.round(box.width), imgWidth - left));
  const height = Math.max(1, Math.min(Math.round(box.height), imgHeight - top));

  try {
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .toBuffer();
    return croppedBuffer;
  } catch (error) {
    logger.error("Cropper", `Failed to crop box {x:${left}, y:${top}, w:${width}, h:${height}}: ${(error as Error).message}`);
    // If extraction fails for sub-pixel boundary edge cases, return the original image
    return imageBuffer;
  }
}
