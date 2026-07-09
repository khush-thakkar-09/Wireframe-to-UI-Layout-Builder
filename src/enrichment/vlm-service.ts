import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { VlmResult } from "../types/index.js";

// Initialize Bedrock client with explicit API Key from our configuration
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "ap-south-1",
});

/**
 * Invokes the Qwen VLM model on Amazon Bedrock to get a description and sub-type for a cropped UI element.
 */
export async function describeElement(cropBuffer: Buffer, detrClass: string): Promise<VlmResult> {
  const modelId = env.qwenVlm || "qwen.qwen3-vl-235b-a22b";

  const prompt = `You are a UI annotation assistant.
Analyze this cropped image, which was classified as a "${detrClass}" component.
Identify its sub-type (e.g. for Icon_Button: "search icon", "hamburger menu icon", "close icon", "cart icon". For Visual_Element: "product image", "promotional banner", "user avatar", "company logo", etc.)
Provide a one-sentence descriptive label.

You MUST reply ONLY with a valid JSON block of this schema:
{
  "description": "one sentence describing the visual content",
  "subType": "specific sub-type name"
}
Do not wrap your answer in markdown codeblocks (no \`\`\`json). Just return raw JSON.`;

  try {
    const { text } = await generateText({
      model: bedrockProvider(modelId),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              image: cropBuffer,
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    // Clean up response text (handling markdown wrappers if returned)
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedJson = JSON.parse(cleanedText);
    return {
      description: parsedJson.description ?? `A ${detrClass} component`,
      subType: parsedJson.subType ?? detrClass,
    };
  } catch (error) {
    logger.warn("VLM Service", `VLM description generation failed: ${(error as Error).message}. Returning fallback.`);
    return {
      description: `A ${detrClass} component`,
      subType: detrClass,
    };
  }
}

