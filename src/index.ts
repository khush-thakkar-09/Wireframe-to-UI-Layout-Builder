import path from "path";
import fs from "fs";
import sharp from "sharp";
import { logger } from "./utils/logger.js";
import { assessFidelity } from "./preprocessing/fidelity-assessor.js";
import { preprocessImage, skipPreprocessing } from "./preprocessing/image-preprocessor.js";
import { detectElements } from "./detection/detr-client.js";
import { postprocessDetections } from "./detection/postprocessor.js";
import { enrichDetections } from "./enrichment/enrichment-router.js";
import { buildLayoutTree } from "./layout/layout-builder.js";
import { identifySections } from "./sections/section-identifier.js";
import { generateSectionCode } from "./codegen/coding-agent.js";
import { synthesizeApp } from "./codegen/synthesizer.js";
import type { FidelityResult, PreprocessResult, ProcessedDetection, EnrichedDetection, LayoutNode } from "./types/index.js";

/** Result from running the pipeline */
export interface PipelineResult {
  fidelity: FidelityResult;
  preprocess: PreprocessResult;
  detections: ProcessedDetection[];
  enrichedDetections: EnrichedDetection[];
  layoutTree: LayoutNode[];
  testingReactPath: string;
}

/**
 * Run the full pipeline on a single image.
 */
export async function runPipeline(imagePath: string, outputDir: string): Promise<PipelineResult> {
  const absoluteImagePath = path.resolve(imagePath);
  const absoluteOutputDir = path.resolve(outputDir);

  // Validate input
  if (!fs.existsSync(absoluteImagePath)) {
    throw new Error(`Image not found: ${absoluteImagePath}`);
  }

  logger.info("Pipeline", `Processing: ${absoluteImagePath}`);
  logger.info("Pipeline", `Output dir: ${absoluteOutputDir}`);

  // Clear previous runs' output files to avoid stale elements
  if (fs.existsSync(absoluteOutputDir)) {
    logger.info("Pipeline", `Clearing previous outputs from: ${absoluteOutputDir}`);
    fs.rmSync(absoluteOutputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  // ─── Phase 2: Fidelity Assessment ────────────────────────────────
  logger.info("Pipeline", "Initiating Phase 2: Fidelity assessment...");
  const fidelity = await assessFidelity(absoluteImagePath);

  // ─── Phase 2: Conditional Preprocessing ──────────────────────────
  let preprocess: PreprocessResult;
  if (fidelity.fidelity === "LOW") {
    preprocess = await preprocessImage(absoluteImagePath, absoluteOutputDir);
  } else {
    preprocess = await skipPreprocessing(absoluteImagePath);
  }

  logger.success("Pipeline", "Fidelity assessment and preprocessing completed successfully.", {
    fidelity: fidelity.fidelity,
    preprocessed: preprocess.preprocessed,
  });

  // ─── Phase 3: DETR Object Detection ────────────────────────────────
  logger.info("Pipeline", "Initiating Phase 3: RF-DETR object detection...");
  
  // Detect elements from preprocessed image buffer
  const rawDetections = await detectElements(preprocess.imageBuffer);
  
  // Apply filtering (confidence threshold 0.35) and NMS
  const detections = postprocessDetections(rawDetections);

  // Get dimensions of the preprocessed image to draw correctly
  const metadata = await sharp(preprocess.imageBuffer).metadata();
  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  // Create SVG overlay containing bounding boxes and confidence scores
  let svgContent = `<svg width="${width}" height="${height}">`;

  for (const det of detections) {
    const { x, y, width: w, height: h } = det.boundingBox;
    const label = `${det.elementClass} (${(det.detectionConfidence * 100).toFixed(0)}%)`;
    const color = "#3366ff"; // Standard blue bounding box for class-agnostic elements

    // Bounding Box Rectangle
    svgContent += `
      <rect 
        x="${x}" 
        y="${y}" 
        width="${w}" 
        height="${h}" 
        fill="none" 
        stroke="${color}" 
        stroke-width="3" 
      />`;

    // Bounding Box Label background and text
    const fontSize = 14;
    const labelWidth = label.length * 8.5;
    const labelHeight = 20;
    const labelY = y - labelHeight >= 0 ? y - labelHeight : y;
    
    svgContent += `
      <rect 
        x="${x}" 
        y="${labelY}" 
        width="${labelWidth}" 
        height="${labelHeight}" 
        fill="${color}" 
      />
      <text 
        x="${x + 4}" 
        y="${labelY + 15}" 
        font-family="monospace, sans-serif" 
        font-size="${fontSize}px" 
        font-weight="bold"
        fill="white"
      >${label}</text>`;
  }

  svgContent += "</svg>";

  const visualizationOutputPath = path.join(absoluteOutputDir, "detections_visualized.png");

  // Composite the SVG overlay onto the preprocessed image
  await sharp(preprocess.imageBuffer)
    .composite([{ input: Buffer.from(svgContent), top: 0, left: 0 }])
    .toFile(visualizationOutputPath);

  logger.success(
    "Pipeline",
    `Phase 3 completed successfully: Detected ${detections.length} elements. Visualized image saved to: ${visualizationOutputPath}`
  );

  // ─── Phase 4: VLM Classification ────────────────────────────────
  logger.info("Pipeline", "Initiating Phase 4: VLM classification...");
  const enrichedDetections = await enrichDetections(detections, preprocess.imageBuffer, absoluteOutputDir);

  const masterEnrichedPath = path.join(absoluteOutputDir, "enriched_detections.json");
  fs.writeFileSync(masterEnrichedPath, JSON.stringify(enrichedDetections, null, 2), "utf-8");

  logger.success(
    "Pipeline",
    `Phase 4 completed successfully: Enriched ${enrichedDetections.length} elements. Master file saved to: ${masterEnrichedPath}`
  );

  // ─── Phase 5: Hierarchical Structural Representation ──────────────────
  logger.info("Pipeline", "Initiating Phase 5: Structural representation and nesting...");
  const layoutTree = buildLayoutTree(enrichedDetections);

  const treeOutputPath = path.join(absoluteOutputDir, "layout_tree.json");
  fs.writeFileSync(treeOutputPath, JSON.stringify(layoutTree, null, 2), "utf-8");

  logger.success(
    "Pipeline",
    `Phase 5 completed successfully: Created layout hierarchy. Layout tree saved to: ${treeOutputPath}`
  );

  // ─── Phase 6: Section Identification ─────────────────────────────────
  logger.info("Pipeline", "Initiating Phase 6: Section identification grouping...");
  const sections = await identifySections(layoutTree, preprocess.imageBuffer);

  const sectionsOutputPath = path.join(absoluteOutputDir, "sectioned_layout.json");
  fs.writeFileSync(sectionsOutputPath, JSON.stringify(sections, null, 2), "utf-8");

  logger.success(
    "Pipeline",
    `Phase 6 completed successfully: Identified ${sections.length} UI sections. Sectioned layout saved to: ${sectionsOutputPath}`
  );

  // ─── Phase 7: Code Generation (Static) ──────────────────────────────
  logger.info("Pipeline", "Initiating Phase 7: Generating static React components & CSS...");
  const staticCodes: { jsx: string; css: string }[] = [];
  for (let idx = 0; idx < sections.length; idx++) {
    const sect = sections[idx]!;
    const code = await generateSectionCode(sect, idx + 1);
    staticCodes.push(code);
  }
  logger.success("Pipeline", `Phase 7 completed successfully: Generated code blocks for ${sections.length} sections.`);

  // ─── Phase 8: Synthesize React App ──────────────────────────────────
  logger.info("Pipeline", "Initiating Phase 8: Synthesizing static React App components and stylesheet...");
  const testingReactPath = path.resolve(process.cwd(), "testing_react");
  synthesizeApp(sections, staticCodes, testingReactPath);

  logger.success("Pipeline", `Phase 8 completed successfully: Synthesized static React App to: ${testingReactPath}`);

  return {
    fidelity,
    preprocess,
    detections,
    enrichedDetections,
    layoutTree,
    testingReactPath,
  };
}
