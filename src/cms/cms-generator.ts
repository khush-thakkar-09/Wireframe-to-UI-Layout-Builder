import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { tokenTracker } from "../utils/token-tracker.js";
import { CMS_GENERATOR_SYSTEM_PROMPT } from "./cms_generator_prompt.js";
import type { Section } from "../sections/section-identifier.js";
import type { CmsSectionRecord } from "./cms-mongo.js";

const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

/**
 * Generates the CMS schema for a single section using Qwen Coder.
 */
export async function generateCmsForSection(
  section: Section,
  sectionIndex: number,
  projectName: string,
  pageName: string,
  previousCmsSummary: string
): Promise<CmsSectionRecord> {
  logger.info("CMS Generator", `Generating CMS for section ${sectionIndex}: "${section.section_name}"...`);

  const modelId = env.qwenCodingModel || "qwen.qwen3-coder-next";

  // Build the layout summary list containing only what is needed for CMS generation
  const elementsSummary = section.elements.map((el) => ({
    id: el.id,
    class: el.elementClass,
    text_content: el.vlm?.text_content || "",
    visual_description: el.vlm?.visual_description || "",
    children: el.children?.map((c) => ({
      id: c.id,
      class: c.elementClass,
      text_content: c.vlm?.text_content || "",
      visual_description: c.vlm?.visual_description || "",
    })),
  }));

  // Format the prompt template
  let prompt = CMS_GENERATOR_SYSTEM_PROMPT;

  // Replace variables in system prompt template
  prompt = prompt.replace(/{project_name}/g, projectName);
  prompt = prompt.replace(/{page_name}/g, pageName);
  prompt = prompt.replace(/{index}/g, String(sectionIndex));
  prompt = prompt.replace(/{previous_cms_summary}/g, previousCmsSummary || "None");
  prompt = prompt.replace(/{section_name}/g, section.section_name);
  prompt = prompt.replace(/{section_description}/g, `${section.section_description}\n\nElements:\n${JSON.stringify(elementsSummary, null, 2)}`);

  try {
    const { text, usage } = await generateText({
      model: bedrockProvider(modelId),
      prompt: prompt,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(90000),
    });

    tokenTracker.track(`CMS Generator: ${section.section_name}`, modelId, usage, prompt, text, 0, false);

    // Clean up code block backticks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleanedText) as CmsSectionRecord;

    // Ensure basic required properties are present
    if (!parsed.metadata || !parsed.elements) {
      throw new Error("Invalid CMS JSON structure: missing metadata or elements keys.");
    }

    return parsed;
  } catch (err) {
    logger.error("CMS Generator", `Failed to generate CMS: ${(err as Error).message}`);
    throw err;
  }
}
