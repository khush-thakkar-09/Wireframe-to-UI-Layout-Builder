import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { VlmResult } from "../types/index.js";

// Initialize Bedrock client with explicit API Key from our configuration
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

/**
 * Invokes the Qwen VLM model on Amazon Bedrock to classify and describe a cropped UI element.
 */
export async function classifyAndDescribeElement(cropBuffer: Buffer): Promise<VlmResult> {
  const modelId = env.qwenVlm || "qwen.qwen3-vl-235b-a22b";

  const prompt = `You are a expert UI annotation assistant.
Analyze this cropped image from a website screenshot.
Your task is to identify the type (class) of this UI element and provide a one-sentence description of what it looks like and its text/icon content.

Use a flexible, natural language vocabulary for classification. Examples include:
- "logo" (e.g., brand icon, company logo)
- "navigation_link" (e.g., Home, Connect, About links)
- "cta_button" (e.g., 'FIND A WORKOUT', 'Get Started')
- "login_button" or "action_button"
- "input_field" or "search_bar"
- "promotional_banner" or "hero_image"
- "icon" or "social_icon"
- "text_heading" or "text_paragraph"
- "card" or "container"

You MUST reply ONLY with a valid JSON block of this schema:
{
  "class": "natural_language_class_name",
  "description": "one sentence describing the visual content, color, text or icons present"
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
      class: parsedJson.class ?? "unknown",
      description: parsedJson.description ?? "A UI component",
    };
  } catch (error) {
    logger.warn("VLM Service", `VLM classification/description generation failed: ${(error as Error).message}. Returning fallback.`);
    return {
      class: "unknown",
      description: "A UI component",
    };
  }
}

