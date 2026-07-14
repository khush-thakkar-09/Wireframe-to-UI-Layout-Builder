import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import sharp from "sharp";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { LayoutNode } from "../types/index.js";

// Initialize Bedrock client with explicit API Key from our configuration
// using the Qwen VLM model (which supports both image and text inputs)
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

export interface Section {
  section_id: string;
  section_name: string;
  section_description: string;
  elements: LayoutNode[];
}

/**
 * Invokes the Qwen VLM model on Bedrock to identify layout sections from the hierarchical layout tree and the original image.
 * Uses a two-pass approach:
 * 1. Pass 1: The VLM detects sections, their names, descriptions, and bounding vertical y-ranges.
 * 2. Pass 2: The code programmatically groups the layout nodes into those sections using their coordinates.
 */
export async function identifySections(
  layoutTree: LayoutNode[],
  imageBuffer: Buffer
): Promise<Section[]> {
  logger.info("Section Identifier", `Starting two-pass section grouping for ${layoutTree.length} elements...`);

  // Resize image buffer to a max width of 1024px to prevent request size limit exceptions in Bedrock Qwen3-VL VLM.
  let resizedImageBuffer = imageBuffer;
  try {
    resizedImageBuffer = await sharp(imageBuffer)
      .resize(1024, null, { withoutEnlargement: true })
      .toBuffer();
    logger.info("Section Identifier", "Resized screenshot image to max width of 1024px for VLM input.");
  } catch (resizeErr) {
    logger.warn("Section Identifier", `Failed to resize image for VLM: ${(resizeErr as Error).message}. Using original.`);
  }


  const modelId = env.qwenVlm || "qwen.qwen3-vl-235b-a22b";

  // Build a lightweight visual layout text summary to help the VLM
  const layoutSummary = JSON.stringify(
    layoutTree.map((node) => {
      const desc: any = {
        id: node.id,
        class: node.elementClass,
        boundingBox: node.boundingBox,
        description: node.vlm?.description || "",
      };
      if (node.children && node.children.length > 0) {
        desc.children = node.children.map((c) => ({
          id: c.id,
          class: c.elementClass,
          boundingBox: c.boundingBox,
          description: c.vlm?.description || "",
        }));
      }
      return desc;
    }),
    null,
    2
  );

  const prompt = `You are a UI section analysis expert.
Analyze this website screenshot and the provided hierarchical JSON layout tree of detected elements.
Your task is to identify logical UI sections on the screen (e.g., Header/Navbar, Hero section, Feature list, Footer) by checking their vertical y-coordinates.

Identify each section by specifying a bounding y-range (start_y and end_y in pixels).
For each section, provide:
1. "section_name": A short name (e.g., "Navigation Bar", "Hero Section", "Feature Cards", "Footer")
2. "section_description": A detailed description (4-5 sentences) covering:
   - The PURPOSE of this section (what it does for the user)
   - The LAYOUT description (how elements are arranged — e.g. horizontal row, grid, stack, centered)
   - The POSITION on the screen (e.g. top of the page, center, bottom, full-width)
3. "start_y": The top vertical coordinate in pixels where this section begins.
4. "end_y": The bottom vertical coordinate in pixels where this section ends.

Below is the layout tree JSON of the UI elements:
${layoutSummary}

You MUST reply ONLY with a valid JSON block of this schema (an array of section descriptors):
[
  {
    "section_name": "Navigation Bar",
    "section_description": "A full-width horizontal navigation bar at the top of the page (y: 0-150px). Contains the company logo on the left, navigation links in the center, and a login button on the right. Serves as the primary site-wide navigation.",
    "start_y": 0,
    "end_y": 150
  }
]
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
              image: resizedImageBuffer,
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    interface SectionBoundary {
      section_name: string;
      section_description: string;
      start_y: number;
      end_y: number;
    }

    const boundaries = JSON.parse(cleanedText) as SectionBoundary[];
    logger.info("Section Identifier", `VLM identified ${boundaries.length} logical sections.`);

    // Pass 2: Programmatic assignment
    const sections: Section[] = boundaries.map((b, idx) => ({
      section_id: `section_${idx + 1}`,
      section_name: b.section_name,
      section_description: b.section_description,
      elements: [],
    }));

    // If no sections were returned, create a fallback single section
    if (sections.length === 0) {
      sections.push({
        section_id: "section_1",
        section_name: "Main Section",
        section_description: "General section containing all layout elements.",
        elements: [...layoutTree],
      });
      return sections;
    }

    // Assign each root layout node to a section based on y-coordinate overlap
    for (const node of layoutTree) {
      const nodeY = node.boundingBox.y + (node.boundingBox.height / 2); // Use center Y coordinate of the box
      let assigned = false;

      for (const sect of sections) {
        const boundary = boundaries[sections.indexOf(sect)]!;
        if (nodeY >= boundary.start_y && nodeY <= boundary.end_y) {
          sect.elements.push(node);
          assigned = true;
          break;
        }
      }

      // If outside boundaries, assign to the closest section vertically
      if (!assigned) {
        let minDistance = Infinity;
        let closestSection: Section = sections[0]!;

        for (const sect of sections) {
          const boundary = boundaries[sections.indexOf(sect)]!;
          const midY = (boundary.start_y + boundary.end_y) / 2;
          const dist = Math.abs(nodeY - midY);
          if (dist < minDistance) {
            minDistance = dist;
            closestSection = sect;
          }
        }
        closestSection.elements.push(node);
      }
    }

    // Ensure elements within each section remain sorted top-to-bottom
    for (const sect of sections) {
      sect.elements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
    }

    logger.success("Section Identifier", "Assigned all layout tree elements to logical sections successfully.");
    return sections;
  } catch (error) {
    logger.error("Section Identifier", `Failed to identify sections: ${(error as Error).message}. Returning fallback.`);
    return [
      {
        section_id: "section_1",
        section_name: "Main Page",
        section_description: "The full visual layout of the page elements.",
        elements: [...layoutTree],
      },
    ];
  }
}
