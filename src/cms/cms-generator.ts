import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { LayoutNode } from "../types/index.js";

// Initialize Bedrock client with explicit API Key from our configuration
// qwen.qwen3-coder-next is available in us-east-1 region
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

export const CMS_GENERATOR_SYSTEM_PROMPT = `You are an expert CMS schema designer. Your job is to convert a structured visual layout tree representation of a UI section into a single structured CMS JSON configuration.

### OUTPUT FORMAT (STRICT):
Output ONLY a single \`\`\`json fenced code block. No other text, explanations, or commentary.

### JSON STRUCTURE:
The output JSON must contain exactly two top-level keys:
1. "metadata": General section attributes.
2. "elements": A list of CMS element objects matching the UI components in the section description.

### SCHEMA SPECIFICATIONS:

#### 1. Metadata Schema:
\`\`\`json
{
  "sectionId": "<10-digit random number string, e.g., '5293847562'>",
  "sectionName": "<The name of the section, e.g., 'Frequently Asked Questions'>",
  "sectionStatus": "Active",
  "variations": 1,
  "sectionType": "",
  "path": "/client/{project_name}/{section_name_slug}/Variation1",
  "isAiGenerated": true,
  "pageName": "{page_name}",
  "index": {index}
}
\`\`\`
*Note on \`path\`: Convert sectionName to folder-safe slug (e.g. 'Frequently Asked Questions' -> 'Frequently Asked Questions').*

#### 2. Single Text/Media Element Schema (contentType = "Text" or "Image"):
\`\`\`json
{
  "sectionId": "<Same sectionId as in metadata>",
  "elementName": "<camelCase descriptive name, e.g., 'faqSectionSubheadline'>",
  "fieldId": "<10-digit random number string>",
  "content": "<Descriptive placeholder content or text content fitting the component context>",
  "contentType": "<'Text' or 'Image'>",
  "section": "<Same sectionName as in metadata>",
  "projectName": "{project_name}",
  "pageName": "{page_name}",
  "isCustom": true,
  "isCustomEdit": true
}
\`\`\`

#### 3. Cards/Loop Element Schema (contentType = "Cards"):
Used for collections of repeated items (e.g., features, testimonials, FAQ lists, menus, navigation tabs).
\`\`\`json
{
  "sectionId": "<Same sectionId as in metadata>",
  "elementName": "<camelCase name for the collection, e.g., 'faqList'>",
  "fieldId": "<10-digit random number string>",
  "content": "",
  "contentType": "Cards",
  "section": "<Same sectionName as in metadata>",
  "projectName": "{project_name}",
  "pageName": "{page_name}",
  "isCustom": true,
  "isCustomEdit": true,
  "loop": [
    {
      "field1": "<Content for first field of item 1, e.g., 'Question text'>",
      "fieldType1": "<'Text' or 'Image'>",
      "fieldId1": "<10-digit random number string>",
      "field2": "<Content for second field of item 1, e.g., 'Answer text'>",
      "fieldType2": "<'Text' or 'Image'>",
      "fieldId2": "<10-digit random number string>"
    }
  ]
}
\`\`\`
*Rules for \`loop\` items:*
- Each object in the \`loop\` array must contain incremental numbered fields: \`field1\`, \`fieldType1\`, \`fieldId1\`, \`field2\`, \`fieldType2\`, \`fieldId2\`, etc.
- If a card has multiple fields, you must increment the numbers sequentially (e.g., if fields 1 and 2 are defined, do not reuse 1 or 2; you must use \`field3\`, \`fieldType3\`, \`fieldId3\` if a third field is needed).
- Provide 3 to 5 realistic items in the \`loop\` array.

### WHAT MUST ALWAYS BE A CMS ELEMENT:
Every piece of visible text that appears on screen MUST have its own CMS element 
with a unique fieldId. This includes — without exception:
- All button labels: "Log In", "Sign Up", "Submit", "Get Started", "View More", etc.
- All navigation link labels: "Home", "About", "Contact", "Menu", etc.
- All form labels, input placeholders, and helper text.
- All headings, subheadings, taglines, and body text.
- All card titles, descriptions, tags, and captions.
- All footer text, copyright notices, and legal disclaimers.
- All toast/alert/status messages visible to the user.

The rule is simple: if a human user can READ it on the page, it must be in the CMS 
with its own fieldId. There is NO such thing as text too small, too static, or too 
"UI-like" to be a CMS element. A non-technical editor must be able to change every 
word on the page without touching code.

---

### PREVIOUS SECTIONS CONTEXT:
Here is the context of previously generated sections to avoid ID/name collisions and to ensure correct index incrementing:
{previous_cms_summary}

---

### CURRENT SECTION TO GENERATE:
Name: {section_name}
Description:
{section_description}

Remember: Output ONLY the \`\`\`json block. Do not include markdown anywhere else.
`;

export interface CmsMetadata {
  sectionId: string;
  sectionName: string;
  sectionStatus: string;
  variations: number;
  sectionType: string;
  path: string;
  isAiGenerated: boolean;
  pageName: string;
  index: number;
  [key: string]: any;
}

export interface CmsElement {
  sectionId: string;
  elementName: string;
  fieldId: string;
  content: string;
  contentType: "Text" | "Image" | "Cards";
  section: string;
  projectName: string;
  pageName: string;
  isCustom: boolean;
  isCustomEdit: boolean;
  loop?: Record<string, any>[];
  [key: string]: any;
}

export interface CmsSchema {
  metadata: CmsMetadata;
  elements: CmsElement[];
}

/**
 * Invokes the Qwen Coding Model on Bedrock to generate a CMS schema matching the layout tree and metadata.
 */
export async function generateCmsSchema(
  layoutTree: LayoutNode[],
  sectionName: string,
  pageName: string,
  projectName: string,
  currentIndex: number,
  previousSummary: string = "None"
): Promise<CmsSchema> {
  logger.info("CMS Generator", `Requesting Qwen model to design schema for section: "${sectionName}"...`);
  const modelId = env.qwenCodingModel || "qwen.qwen3-coder-next";

  // Build a structured, lightweight representation of the layout tree to send as description
  const layoutDescription = JSON.stringify(
    layoutTree.map((node) => {
      const desc: any = {
        id: node.id,
        class: node.detrClass,
        boundingBox: node.boundingBox,
      };
      if (node.ocr) desc.ocr = node.ocr;
      if (node.vlm) desc.vlm = node.vlm;
      if (node.children && node.children.length > 0) {
        desc.children = node.children.map((c) => ({
          id: c.id,
          class: c.detrClass,
          boundingBox: c.boundingBox,
          ocr: c.ocr,
          vlm: c.vlm,
        }));
      }
      return desc;
    }),
    null,
    2
  );

  const finalPrompt = CMS_GENERATOR_SYSTEM_PROMPT
    .replace(/{project_name}/g, projectName)
    .replace(/{page_name}/g, pageName)
    .replace(/{index}/g, String(currentIndex))
    .replace(/{previous_cms_summary}/g, previousSummary)
    .replace(/{section_name}/g, sectionName)
    .replace(/{section_description}/g, `Below is the structured layout tree representation of the UI section:\n${layoutDescription}`);

  try {
    const { text } = await generateText({
      model: bedrockProvider(modelId),
      prompt: finalPrompt,
      temperature: 0.1,
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const schema = JSON.parse(cleanedText) as CmsSchema;
    
    // Inject DB field extensions for proper tracking
    schema.metadata.projectName = projectName;
    schema.metadata.createdAt = new Date();
    schema.metadata.updatedAt = new Date();

    for (const el of schema.elements) {
      el.projectName = projectName;
      el.pageName = pageName;
      el.createdAt = new Date();
      el.updatedAt = new Date();
    }

    logger.success("CMS Generator", `CMS Schema designed successfully with ${schema.elements.length} elements.`);
    return schema;
  } catch (error) {
    logger.error("CMS Generator", `Failed to generate CMS Schema: ${(error as Error).message}`);
    throw error;
  }
}
