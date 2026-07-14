import { classifyAndDescribeElement } from "./vlm-service.js";
import type { VlmResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

interface BatchItem {
  id: string;
  buffer: Buffer;
}

/**
 * Classifies a batch of cropped images in parallel with a limited concurrency.
 * 
 * @param items List of crop elements containing ID and image buffers.
 * @param concurrency Limit of concurrent API calls (default: 8).
 */
export async function batchClassifyElements(
  items: BatchItem[],
  concurrency = 8
): Promise<Map<string, VlmResult>> {
  logger.info("VLM Batcher", `Starting batch classification for ${items.length} elements (concurrency: ${concurrency})...`);
  
  const resultsMap = new Map<string, VlmResult>();

  // Process items in chunks of size 'concurrency'
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    logger.debug("VLM Batcher", `Processing chunk ${Math.floor(i / concurrency) + 1}/${Math.ceil(items.length / concurrency)} (elements ${i + 1} to ${Math.min(i + concurrency, items.length)})`);

    const chunkPromises = chunk.map(async (item) => {
      try {
        const result = await classifyAndDescribeElement(item.buffer);
        resultsMap.set(item.id, result);
      } catch (err) {
        logger.error("VLM Batcher", `Failed to process element ${item.id}: ${(err as Error).message}`);
        resultsMap.set(item.id, {
          class: "unknown",
          description: "A UI component",
        });
      }
    });

    // Wait for all items in the current chunk to finish before proceeding
    await Promise.allSettled(chunkPromises);
  }

  logger.success("VLM Batcher", `Batch classification completed for all ${items.length} elements.`);
  return resultsMap;
}
