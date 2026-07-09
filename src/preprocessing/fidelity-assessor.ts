import sharp from "sharp";
import { FIDELITY } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import type { Fidelity, FidelityResult } from "../types/index.js";

/**
 * Computes the Laplacian variance of a grayscale image buffer as a sharpness metric.
 * Higher value = sharper/more detailed image. Low value = blurry or hand-drawn.
 *
 * We approximate the Laplacian by computing the variance of pixel intensity
 * differences with their neighbors (horizontal + vertical gradients).
 */
function computeSharpness(rawPixels: Buffer, width: number, height: number): number {
  let sumSq = 0;
  let sum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Laplacian kernel: center*4 - top - bottom - left - right
      const laplacian =
        4 * rawPixels[idx]! -
        rawPixels[(y - 1) * width + x]! -
        rawPixels[(y + 1) * width + x]! -
        rawPixels[y * width + (x - 1)]! -
        rawPixels[y * width + (x + 1)]!;

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance
}

/**
 * Computes edge density: what fraction of pixels are "edge" pixels.
 * Uses a simple Sobel-like gradient magnitude threshold.
 */
function computeEdgeDensity(rawPixels: Buffer, width: number, height: number): number {
  const EDGE_THRESHOLD = 30;
  let edgeCount = 0;
  let totalPixels = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Horizontal gradient
      const gx = rawPixels[y * width + (x + 1)]! - rawPixels[y * width + (x - 1)]!;
      // Vertical gradient
      const gy = rawPixels[(y + 1) * width + x]! - rawPixels[(y - 1) * width + x]!;
      // Gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > EDGE_THRESHOLD) {
        edgeCount++;
      }
      totalPixels++;
    }
  }

  return totalPixels === 0 ? 0 : edgeCount / totalPixels;
}

/**
 * Computes the standard deviation of color values across all channels.
 * Low color variance = near-monochrome (sketch-like). High = colorful digital UI.
 */
function computeColorVariance(rawPixels: Buffer, channels: number): number {
  if (channels < 3) {
    // Already grayscale, very low color variance by definition
    return 0;
  }

  // Sample every 4th pixel for performance on large images
  const step = 4;
  let sumR = 0, sumG = 0, sumB = 0;
  let sumSqR = 0, sumSqG = 0, sumSqB = 0;
  let count = 0;

  for (let i = 0; i < rawPixels.length; i += channels * step) {
    const r = rawPixels[i]!;
    const g = rawPixels[i + 1]!;
    const b = rawPixels[i + 2]!;
    sumR += r; sumG += g; sumB += b;
    sumSqR += r * r; sumSqG += g * g; sumSqB += b * b;
    count++;
  }

  if (count === 0) return 0;

  const varR = sumSqR / count - (sumR / count) ** 2;
  const varG = sumSqG / count - (sumG / count) ** 2;
  const varB = sumSqB / count - (sumB / count) ** 2;

  // Average standard deviation across channels
  return (Math.sqrt(Math.max(0, varR)) + Math.sqrt(Math.max(0, varG)) + Math.sqrt(Math.max(0, varB))) / 3;
}

/**
 * Assess the fidelity of an input image.
 *
 * Classification:
 * - LOW: hand-drawn sketches, rough wireframes → needs preprocessing
 * - MEDIUM_HIGH: clean digital screenshots, Figma exports → skip preprocessing
 *
 * Uses a weighted scoring system based on:
 * 1. Image dimensions (very small = likely low fidelity)
 * 2. Sharpness (Laplacian variance)
 * 3. Edge density (clean edges = digital)
 * 4. Color variance (monochrome = sketch)
 */
export async function assessFidelity(imagePath: string): Promise<FidelityResult> {
  logger.info("Fidelity", `Assessing fidelity of: ${imagePath}`);

  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const width = metadata.width!;
  const height = metadata.height!;
  const channels = metadata.channels ?? 3;

  logger.debug("Fidelity", `Image dimensions: ${width}x${height}, channels: ${channels}`);

  // Get grayscale raw pixels for sharpness and edge analysis
  // Resize for performance if image is very large (analysis doesn't need full res)
  const analysisWidth = Math.min(width, 800);
  const analysisHeight = Math.round(analysisWidth * (height / width));

  const grayscaleBuffer = await sharp(imagePath)
    .resize(analysisWidth, analysisHeight, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  // Get color raw pixels for color variance
  const colorBuffer = await sharp(imagePath)
    .resize(analysisWidth, analysisHeight, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Compute metrics
  const sharpness = computeSharpness(grayscaleBuffer, analysisWidth, analysisHeight);
  const edgeDensity = computeEdgeDensity(grayscaleBuffer, analysisWidth, analysisHeight);
  const colorVariance = computeColorVariance(colorBuffer, 3);

  logger.debug("Fidelity", "Computed metrics", {
    sharpness: sharpness.toFixed(2),
    edgeDensity: edgeDensity.toFixed(4),
    colorVariance: colorVariance.toFixed(2),
  });

  // Scoring: count how many signals suggest LOW fidelity
  let lowSignals = 0;
  const totalSignals = 4;

  if (Math.min(width, height) < FIDELITY.MIN_DIMENSION) lowSignals++;
  if (sharpness < FIDELITY.SHARPNESS_THRESHOLD) lowSignals++;
  if (edgeDensity < FIDELITY.EDGE_DENSITY_THRESHOLD) lowSignals++;
  if (colorVariance < FIDELITY.COLOR_VARIANCE_THRESHOLD) lowSignals++;

  // Classify: if majority of signals say LOW → LOW
  const fidelity: Fidelity = lowSignals >= Math.ceil(totalSignals / 2) ? "LOW" : "MEDIUM_HIGH";

  const result: FidelityResult = {
    fidelity,
    dimensions: { width, height },
    sharpness: Math.round(sharpness * 100) / 100,
    edgeDensity: Math.round(edgeDensity * 10000) / 10000,
    colorVariance: Math.round(colorVariance * 100) / 100,
  };

  logger.info("Fidelity", `Classification: ${fidelity} (${lowSignals}/${totalSignals} low signals)`);

  return result;
}
