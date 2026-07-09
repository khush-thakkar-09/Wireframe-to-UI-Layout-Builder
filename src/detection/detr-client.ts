import sharp from "sharp";
import * as ort from "onnxruntime-node";
import path from "path";
import { logger } from "../utils/logger.js";
import type { RawDetection } from "./types.js";

// Session variable cached for reuse across runs
let session: ort.InferenceSession | null = null;

// Class names mapped from training indexes (0-5, with index 6 as background / unused)
const CLASS_MAPPING: Record<number, string> = {
  0: "Action_Button",
  1: "Icon_Button",
  2: "Input_Container",
  3: "Navigation_Tab",
  4: "Text_Display",
  5: "Visual_Element",
};

/**
 * Runs object detection locally using the exported ONNX model.
 */
export async function detectElements(imageBuffer: Buffer): Promise<RawDetection[]> {
  logger.info("DETR Client", "Running local ONNX model inference...");

  try {
    // 1. Initialize session once
    if (!session) {
      const modelPath = path.resolve(process.cwd(), "dist_model/rfdetr-medium.onnx");
      logger.info("DETR Client", `Loading ONNX model from: ${modelPath}`);
      session = await ort.InferenceSession.create(modelPath);
    }

    // 2. Decode and resize image to 576x576 (Model expects 576x576 based on dynamic check)
    const size = 576;
    const { data, info } = await sharp(imageBuffer)
      .resize(size, size, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 3. Normalize and convert layout to NCHW [1, 3, 576, 576]
    const float32Data = new Float32Array(3 * size * size);
    const pixelCount = size * size;

    for (let i = 0; i < pixelCount; i++) {
      // Input channels are raw RGB (info.channels tells us the channel count, typically 3 or 4)
      const rIdx = i * info.channels;
      const gIdx = rIdx + 1;
      const bIdx = rIdx + 2;

      // Normalization: [0, 255] -> [0, 1]
      float32Data[i] = (data[rIdx] ?? 0) / 255.0;
      float32Data[i + pixelCount] = (data[gIdx] ?? 0) / 255.0;
      float32Data[i + 2 * pixelCount] = (data[bIdx] ?? 0) / 255.0;
    }

    // 4. Create ONNX Tensor
    const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, size, size]);

    // 5. Run Inference
    const outputNames = session.outputNames; // ['dets', 'labels']
    const feeds = { [session.inputNames[0]!]: inputTensor };
    
    logger.debug("DETR Client", "Running model session...");
    const results = await session.run(feeds);

    const detsTensor = results[outputNames[0]!]; // [1, 300, 4] -> bounding boxes
    const labelsTensor = results[outputNames[1]!]; // [1, 300, 7] -> logits/confidence scores

    if (!detsTensor || !labelsTensor) {
      throw new Error("Model session output tensors are undefined");
    }

    // Get original image dimensions to scale coordinates back correctly
    const originalMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = originalMetadata.width ?? size;
    const originalHeight = originalMetadata.height ?? size;

    const detsData = detsTensor.data as Float32Array;
    const labelsData = labelsTensor.data as Float32Array;

    const rawDetections: RawDetection[] = [];

    // The model outputs 300 queries
    const numQueries = 300;
    const numClasses = 7; // 6 classes + background

    for (let q = 0; q < numQueries; q++) {
      // dets shape: [1, 300, 4] -> index offsets: q * 4
      const bboxOffset = q * 4;
      const xCenter = detsData[bboxOffset]!;
      const yCenter = detsData[bboxOffset + 1]!;
      const wNormalized = detsData[bboxOffset + 2]!;
      const hNormalized = detsData[bboxOffset + 3]!;

      // Convert from normalized [x_center, y_center, width, height] to [x, y, w, h] absolute coordinates
      const w = wNormalized * originalWidth;
      const h = hNormalized * originalHeight;
      const x = (xCenter * originalWidth) - (w / 2);
      const y = (yCenter * originalHeight) - (h / 2);

      // labels shape: [1, 300, 7] -> index offsets: q * 7
      // Calculate softmax / probabilities or get max logits to identify the class and confidence
      const labelOffset = q * numClasses;
      let maxScore = -Infinity;
      let maxClassIdx = -1;

      // Find the class index with highest score
      for (let c = 0; c < numClasses; c++) {
        const score = labelsData[labelOffset + c]!;
        if (score > maxScore) {
          maxScore = score;
          maxClassIdx = c;
        }
      }

      // If the highest score is for a valid class (0 to 5) and not background (idx 6)
      if (maxClassIdx >= 0 && maxClassIdx < 6) {
        // Convert logit score to a sigmoid/probability score since raw logits could be out of [0, 1]
        const confidence = 1 / (1 + Math.exp(-maxScore)); 

        rawDetections.push({
          bbox: [x, y, w, h],
          class: CLASS_MAPPING[maxClassIdx]!,
          confidence: confidence,
        });
      }
    }

    logger.success("DETR Client", `Inference complete. Extracted ${rawDetections.length} candidate raw elements.`);
    return rawDetections;
  } catch (error) {
    logger.error("DETR Client", `Inference failed: ${(error as Error).message}`);
    throw error;
  }
}

