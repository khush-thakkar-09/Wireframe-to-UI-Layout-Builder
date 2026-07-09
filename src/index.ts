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
import { generateCmsSchema, type CmsSchema } from "./cms/cms-generator.js";
import { connectToMongoDB, disconnectFromMongoDB } from "./database/mongo.js";
import type { FidelityResult, PreprocessResult, ProcessedDetection, EnrichedDetection, LayoutNode } from "./types/index.js";

/** Result from running the pipeline */
export interface PipelineResult {
  fidelity: FidelityResult;
  preprocess: PreprocessResult;
  detections: ProcessedDetection[];
  enrichedDetections: EnrichedDetection[];
  layoutTree: LayoutNode[];
  cmsSchema: CmsSchema;
}

/**
 * Run the full pipeline on a single image.
 * Implements:
 * - Phase 1 & 2: Fidelity assessment + conditional preprocessing
 * - Phase 3: RF-DETR object detection + NMS post-processing + Bounding Box visualization output
 * - Phase 4: Class-specific element enrichment (PaddleOCR & Qwen3-VL VLM)
 * - Phase 5: Structural layout and hierarchical nesting tree builder
 * - Phase 6: CMS Schema generation using Qwen3 Coder & saving to MongoDB cluster
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
  
  // Apply filtering (confidence threshold 0.4) and NMS
  const detections = postprocessDetections(rawDetections);

  // Ensure output directory exists
  if (!fs.existsSync(absoluteOutputDir)) {
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
  }

  // Get dimensions of the preprocessed image to draw correctly
  const metadata = await sharp(preprocess.imageBuffer).metadata();
  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  // Create SVG overlay containing bounding boxes, class labels, and confidence scores
  let svgContent = `<svg width="${width}" height="${height}">`;

  for (const det of detections) {
    const { x, y, width: w, height: h } = det.boundingBox;
    const label = `${det.detrClass} (${(det.detrConfidence * 100).toFixed(0)}%)`;
    
    // Choose a color based on the class for better visual distinction
    let color = "red";
    if (det.detrClass === "Action_Button") color = "#00ff00"; // Green
    else if (det.detrClass === "Icon_Button") color = "#00ffff"; // Cyan
    else if (det.detrClass === "Input_Container") color = "#ff00ff"; // Magenta
    else if (det.detrClass === "Navigation_Tab") color = "#ffff00"; // Yellow
    else if (det.detrClass === "Text_Display") color = "#ff9900"; // Orange
    else if (det.detrClass === "Visual_Element") color = "#3366ff"; // Blue

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

    // Draw label background (adjust Y so it draws inside the box if near the top edge)
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
        fill="black"
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

  // ─── Phase 4: Class-Specific Element Enrichment ──────────────────────
  logger.info("Pipeline", "Initiating Phase 4: Class-specific element enrichment...");
  
  // Enrich detections (crops and JSON metadata are saved to outputDir/crops/ locally in enrichDetections)
  const enrichedDetections = await enrichDetections(detections, preprocess.imageBuffer, absoluteOutputDir);

  // Save the master enriched list to output folder as a reference point for next phases
  const masterEnrichedPath = path.join(absoluteOutputDir, "enriched_detections.json");
  fs.writeFileSync(masterEnrichedPath, JSON.stringify(enrichedDetections, null, 2), "utf-8");

  logger.success(
    "Pipeline",
    `Phase 4 completed successfully: Enriched ${enrichedDetections.length} elements. Master file saved to: ${masterEnrichedPath}`
  );

  // ─── Phase 5: Hierarchical Structural Representation ──────────────────
  logger.info("Pipeline", "Initiating Phase 5: Structural representation and nesting...");

  const layoutTree = buildLayoutTree(enrichedDetections);

  // Save structural layout tree output
  const treeOutputPath = path.join(absoluteOutputDir, "layout_tree.json");
  fs.writeFileSync(treeOutputPath, JSON.stringify(layoutTree, null, 2), "utf-8");

  logger.success(
    "Pipeline",
    `Phase 5 completed successfully: Created layout hierarchy. Layout tree saved to: ${treeOutputPath}`
  );

  // ─── Phase 6: CMS Schema Design & Database Save ────────────────────────
  logger.info("Pipeline", "Initiating Phase 6: CMS schema generation & MongoDB save...");

  // Generate CMS Schema
  const sectionName = path.basename(absoluteImagePath, path.extname(absoluteImagePath));
  const cmsSchema = await generateCmsSchema(
    layoutTree,
    sectionName,
    "home",
    "verification",
    6 // Index default placeholder
  );

  // Save CMS json output file locally
  const cmsOutputPath = path.join(absoluteOutputDir, "cms_schema.json");
  fs.writeFileSync(cmsOutputPath, JSON.stringify(cmsSchema, null, 2), "utf-8");

  logger.info("Pipeline", `Saving CMS schema configuration to MongoDB database...`);

  // Connect to cluster, write metadata + elements, and terminate connection cleanly
  const dbClient = await connectToMongoDB();
  if (dbClient) {
    try {
      const db = dbClient.db("wireframe-to-layout");

      // Save Metadata Config
      const metadataCol = db.collection("section-metadata");
      await metadataCol.updateOne(
        { sectionId: cmsSchema.metadata.sectionId },
        { $set: cmsSchema.metadata },
        { upsert: true }
      );
      logger.success("MongoDB", "Saved section metadata successfully.");

      // Save Elements Config
      const elementsCol = db.collection("section-elements");
      for (const el of cmsSchema.elements) {
        await elementsCol.updateOne(
          { fieldId: el.fieldId },
          { $set: el },
          { upsert: true }
        );
      }
      logger.success("MongoDB", `Saved ${cmsSchema.elements.length} elements successfully.`);
    } catch (dbErr) {
      logger.error("MongoDB", `Failed writing schemas: ${(dbErr as Error).message}`);
      throw dbErr;
    } finally {
      await disconnectFromMongoDB();
    }
  }

  logger.success(
    "Pipeline",
    `Phase 6 completed successfully: CMS configuration saved to MongoDB and locally: ${cmsOutputPath}`
  );

  return { fidelity, preprocess, detections, enrichedDetections, layoutTree, cmsSchema };
}






