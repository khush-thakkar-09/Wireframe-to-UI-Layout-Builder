import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import sharp from "sharp";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { tokenTracker } from "../utils/token-tracker.js";
import type { LayoutNode, SectionTheme } from "../types/index.js";

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
  theme: SectionTheme;
  elements: LayoutNode[];
}

/**
 * Invokes the Qwen VLM model on Bedrock to identify layout sections and directly assign element IDs to each section.
 *
 * Unlike the previous y-coordinate-range approach (which suffered from coordinate-system mismatches between the
 * resized VLM input image and the original full-resolution bounding boxes), this approach asks the VLM to
 * semantically group elements by their IDs. The VLM sees the screenshot + the element list and outputs which
 * element_ids belong to which section — no pixel guessing required.
 */
export async function identifySections(
  layoutTree: LayoutNode[],
  imageBuffer: Buffer
): Promise<Section[]> {
  logger.info("Section Identifier", `Starting element-ID-based section grouping for ${layoutTree.length} root elements...`);

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

  // Collect all root-level element IDs for the prompt (children are included with their parent)
  const rootElementIds = layoutTree.map((node) => node.id);

  // Build a lightweight visual layout text summary including element-level styling
  const layoutSummary = JSON.stringify(
    layoutTree.map((node) => {
      const desc: any = {
        id: node.id,
        class: node.elementClass,
        boundingBox: node.boundingBox,
        text_content: node.vlm?.text_content || "",
        text_color: node.vlm?.text_color || "",
        background_color: node.vlm?.background_color || "",
        visual_description: node.vlm?.visual_description || "",
      };
      if (node.children && node.children.length > 0) {
        desc.children = node.children.map((c) => ({
          id: c.id,
          class: c.elementClass,
          boundingBox: c.boundingBox,
          text_content: c.vlm?.text_content || "",
          text_color: c.vlm?.text_color || "",
          background_color: c.vlm?.background_color || "",
          visual_description: c.vlm?.visual_description || "",
        }));
      }
      return desc;
    }),
    null,
    2
  );

  const prompt = `You are a UI section analysis and color extraction expert.
Analyze this website screenshot AND the provided hierarchical JSON layout tree of detected elements.

Your task is to:
1. Identify the logical UI sections visible on the page (e.g., Header/Navbar, Hero section, Feature list, Footer).
2. For EACH section, directly assign the element IDs that belong to it.
3. For EACH section, extract the EXACT color scheme visible in the screenshot for that region.

### ELEMENT ASSIGNMENT RULES (CRITICAL — READ CAREFULLY):
- Below is the list of ROOT element IDs you must assign: ${JSON.stringify(rootElementIds)}
- Every single root element ID above MUST appear in exactly ONE section's "element_ids" array. Do NOT skip any element.
- When you assign a root element, its children (nested elements) are automatically included — do NOT list child IDs separately.
- Assign elements to sections based on their VISUAL POSITION in the screenshot and their SEMANTIC role.
- An element belongs to the section where it is VISUALLY LOCATED in the screenshot. Look at the image carefully.
- If an element spans across two sections (e.g., a large image that overlaps the hero and stats area), assign it to the section where MOST of its visual area resides OR where it makes the most semantic sense.

### CROSS-REFERENCE VALIDATION (ANTI-HALLUCINATION):
Before finalizing your output, perform this self-check:
- If your section_description mentions an element (e.g., "contains a hero image of a man with dumbbells"), then that element's ID MUST be in that section's element_ids array.
- If an element's ID is in a section's element_ids array, your section_description should be consistent with that element being part of this section.
- Do NOT describe elements in one section but assign their IDs to a different section.

For each section, provide:
1. "section_name": A short name (e.g., "Navigation Bar", "Hero Section", "Feature Cards", "Footer")
2. "section_description": A detailed description (4-5 sentences) covering:
   - The PURPOSE of this section (what it does for the user)
   - The LAYOUT description (how elements are arranged — e.g. horizontal row, grid, stack, centered)
   - The SPECIFIC ELEMENTS it contains (reference them by their visual content, not IDs)
   - The POSITION on the screen (e.g. top of the page, center, bottom, full-width)
3. "element_ids": An array of root element IDs that belong to this section (e.g., ["element_4", "element_17", "element_1"])
4. "theme": An object containing the EXACT HEX color codes extracted from the screenshot for this section:
   - "background_color": The dominant background color of this section (e.g., "#0b0f19", "#ffffff")
   - "primary_text_color": The main heading/title text color in this section
   - "secondary_text_color": The body text or subtitle color in this section
   - "accent_color": The primary accent or highlight color (e.g., button fills, link highlights, badges)
   - "accent_hover_color": A slightly darker or lighter variation of the accent for hover states

### COLOR EXTRACTION RULES (CRITICAL):
- Extract colors EXACTLY as they appear in the screenshot. Do NOT guess or approximate.
- Use HEX format (e.g., "#ef4444", "#0b0f19", "#ffffff").
- Look at the actual pixel colors in each section region of the image.
- The section background color is the large fill behind all elements in that vertical region.
- Accent colors are typically used for buttons, links, tags, or highlighted elements.

Below is the layout tree JSON of the UI elements (root elements with their nested children):
${layoutSummary}

You MUST reply ONLY with a valid JSON block of this schema (an array of section descriptors):
[
  {
    "section_name": "Navigation Bar",
    "section_description": "A full-width horizontal navigation bar at the top of the page. Contains the company logo on the left, navigation links (Home, Collection, Community, Connect, Blog, Press Release) in the center, and a Login button and cart icon on the right. Serves as the primary site-wide navigation.",
    "element_ids": ["element_4", "element_17", "element_20", "element_18", "element_10", "element_11", "element_19", "element_1", "element_26"],
    "theme": {
      "background_color": "#000000",
      "primary_text_color": "#ffffff",
      "secondary_text_color": "#9ca3af",
      "accent_color": "#ef4444",
      "accent_hover_color": "#dc2626"
    }
  }
]
Do not wrap your answer in markdown codeblocks (no \`\`\`json). Just return raw JSON.`;

  const defaultTheme: SectionTheme = {
    background_color: "#0b0f19",
    primary_text_color: "#f3f4f6",
    secondary_text_color: "#9ca3af",
    accent_color: "#ef4444",
    accent_hover_color: "#dc2626",
  };

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
              data: resizedImageBuffer,
              mediaType: "image/png",
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    tokenTracker.track("Section Identifier", modelId, usage, prompt, text, 1, false);

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    interface VlmSectionOutput {
      section_name: string;
      section_description: string;
      element_ids: string[];
      theme?: SectionTheme;
    }

    const vlmSections = JSON.parse(cleanedText) as VlmSectionOutput[];
    logger.info("Section Identifier", `VLM identified ${vlmSections.length} logical sections.`);

    // Build a lookup map from element ID to its LayoutNode
    const elementMap = new Map<string, LayoutNode>();
    for (const node of layoutTree) {
      elementMap.set(node.id, node);
    }

    // Track which elements have been assigned to prevent duplicates
    const assignedElementIds = new Set<string>();

    // Build sections from VLM output using direct ID assignment
    const sections: Section[] = vlmSections.map((vlmSect, idx) => {
      const sectionElements: LayoutNode[] = [];

      for (const eid of vlmSect.element_ids) {
        const node = elementMap.get(eid);
        if (node && !assignedElementIds.has(eid)) {
          sectionElements.push(node);
          assignedElementIds.add(eid);
        } else if (!node) {
          logger.warn("Section Identifier", `VLM assigned unknown element ID "${eid}" to section "${vlmSect.section_name}". Skipping.`);
        }
        // If already assigned, skip silently (VLM may have duplicated an ID)
      }

      // Sort elements within section by their y-coordinate (top to bottom)
      sectionElements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);

      return {
        section_id: `section_${idx + 1}`,
        section_name: vlmSect.section_name,
        section_description: vlmSect.section_description,
        theme: vlmSect.theme ?? defaultTheme,
        elements: sectionElements,
      };
    });

    // Safety net: assign any unassigned root elements to the closest section by y-coordinate
    for (const node of layoutTree) {
      if (!assignedElementIds.has(node.id)) {
        logger.warn("Section Identifier", `Element "${node.id}" was not assigned by VLM. Assigning to closest section by position.`);

        const nodeY = node.boundingBox.y + (node.boundingBox.height / 2);
        let bestSection = sections[0]!;
        let bestDistance = Infinity;

        for (const sect of sections) {
          if (sect.elements.length === 0) continue;
          // Calculate average Y of existing section elements
          const avgY = sect.elements.reduce((sum, el) => sum + el.boundingBox.y + (el.boundingBox.height / 2), 0) / sect.elements.length;
          const dist = Math.abs(nodeY - avgY);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestSection = sect;
          }
        }

        bestSection.elements.push(node);
        bestSection.elements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
        assignedElementIds.add(node.id);
      }
    }

    // If no sections were returned at all, create a fallback single section
    if (sections.length === 0) {
      sections.push({
        section_id: "section_1",
        section_name: "Main Section",
        section_description: "General section containing all layout elements.",
        theme: defaultTheme,
        elements: [...layoutTree],
      });
    }

    logger.success("Section Identifier", `Assigned all ${layoutTree.length} root elements to ${sections.length} sections successfully.`);
    return sections;
  } catch (error) {
    logger.error("Section Identifier", `Failed to identify sections: ${(error as Error).message}. Returning fallback.`);
    return [
      {
        section_id: "section_1",
        section_name: "Main Page",
        section_description: "The full visual layout of the page elements.",
        theme: defaultTheme,
        elements: [...layoutTree],
      },
    ];
  }
}
