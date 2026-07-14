import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { tokenTracker } from "../utils/token-tracker.js";
import type { VlmResult } from "../types/index.js";

// Initialize Bedrock client with explicit API Key from our configuration
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

/**
 * Invokes the Qwen VLM model on Amazon Bedrock to classify and describe a cropped UI element.
 * Uses a strict predefined class vocabulary and returns structured style fields.
 */
export async function classifyAndDescribeElement(cropBuffer: Buffer, elementId = "unknown"): Promise<VlmResult> {
  const modelId = env.qwenVlm || "qwen.qwen3-vl-235b-a22b";

  const prompt = `You are an expert UI annotation assistant.
Analyze this cropped image from a website screenshot.
Your task is to:
1. Classify this UI element into ONE of the predefined classes below.
2. Extract the visible text content (if any).
3. Identify the exact foreground (text) color and background color in HEX format.
4. Write a one-sentence visual description.

### PREDEFINED CLASSES (you MUST pick exactly one):
- "logo" — brand icon, company logo, or wordmark
- "navigation_link" — a navigation menu link (e.g., Home, About, Contact)
- "cta_button" — a primary call-to-action button (e.g., "Get Started", "FIND A WORKOUT")
- "action_button" — a secondary or utility button (e.g., Login, Sign Up, Submit)
- "icon_button" — a small clickable icon (e.g., cart, search, hamburger menu)
- "input_field" — a text input, email input, or form field
- "search_bar" — a search input with optional search icon
- "image_media" — a photograph, illustration, hero image, or banner graphic
- "text_heading" — a headline, title, or prominent heading text
- "text_subheading" — a subtitle, tagline, or secondary heading text
- "text_paragraph" — body text, description, or multi-line paragraph content
- "text_label" — a short label, badge, tag, or stat label
- "container_card" — a card, tile, or boxed container grouping related content

### COLOR EXTRACTION RULES:
- Return colors in HEX format (e.g., "#ef4444", "#ffffff", "#0b0f19").
- For "text_color": use the dominant foreground/text color visible in the crop.
- For "background_color": use the dominant background fill color visible in the crop. If the background is transparent or part of a larger image, return "transparent".

You MUST reply ONLY with a valid JSON block of this exact schema:
{
  "class": "one_of_the_predefined_classes",
  "text_content": "the visible text in this element, or empty string if none",
  "text_color": "#hexcolor",
  "background_color": "#hexcolor",
  "visual_description": "one sentence describing the visual content"
}
Do not wrap your answer in markdown codeblocks (no \`\`\`json). Just return raw JSON.`;

  try {
    const { text, usage } = await generateText({
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
              type: "file",
              data: cropBuffer,
              mediaType: "image/png",
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    tokenTracker.track(`VLM Crop: ${elementId}`, modelId, usage, prompt, text, 1, true);

    // Clean up response text (handling markdown wrappers if returned)
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedJson = JSON.parse(cleanedText);
    return {
      class: parsedJson.class ?? "unknown",
      text_content: parsedJson.text_content ?? "",
      text_color: parsedJson.text_color ?? "#ffffff",
      background_color: parsedJson.background_color ?? "transparent",
      visual_description: parsedJson.visual_description ?? "A UI component",
    };
  } catch (error) {
    logger.warn("VLM Service", `VLM classification/description generation failed: ${(error as Error).message}. Returning fallback.`);
    return {
      class: "unknown",
      text_content: "",
      text_color: "#ffffff",
      background_color: "transparent",
      visual_description: "A UI component",
    };
  }
}

