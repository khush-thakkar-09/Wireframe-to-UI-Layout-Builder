import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { tokenTracker } from "../utils/token-tracker.js";
import type { Section } from "../sections/section-identifier.js";

// Initialize Bedrock client with explicit API Key from our configuration
// qwen.qwen3-coder-next is available in us-east-1 region
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

export const SECTION_CODER_SYSTEM_PROMPT = `You are an expert frontend React developer specializing in modern, responsive, visually stunning web design. You will be given:
1. A detailed description of a single section of a web page
2. Its layout tree elements (with per-element styling data)
3. The section's EXACT color theme
4. The exact CMS schema definition generated for this section

Your job is to write the React JSX and CSS code for ONLY this section, making sure all text is bound dynamically to the CMS data.

### OUTPUT FORMAT (STRICT):
You MUST output EXACTLY two fenced code blocks. Do NOT use <style> tags.
Do not include any text before or after the code blocks.

Example Expected Output:
\`\`\`jsx
export default function {section_component_name}({ cmsData }) {
  // Extract fields for clean access from elements array
  const headlineEl = cmsData?.elements?.find(e => e.elementName === 'exampleHeadline');
  const headline = headlineEl?.content || "Default Headline";
  const headlineId = headlineEl?.fieldId;

  const featureListEl = cmsData?.elements?.find(e => e.elementName === 'featureList');
  const featureList = featureListEl?.loop || [];

  return (
    <section className="section-{section_number}">
      <h1 data-field-id={headlineId}>{headline}</h1>
      
      {/* Example loop */}
      <div className="cards-grid">
        {featureList.map((item, idx) => (
          <div key={idx} className="card">
            <h3 data-field-id={item.fieldId1}>{item.field1}</h3>
            <p data-field-id={item.fieldId2}>{item.field2}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
\`\`\`
\`\`\`css
.section-{section_number} {
  /* section styling */
}
\`\`\`

### REACT & JSX RULES (THE 3 GOLDEN RULES):
1. **Single Root Element**: The component must return a single wrapping \`<section>\` element with \`className="section-{section_number}"\`.
2. **className instead of class**: All HTML classes MUST use \`className\`. Use \`htmlFor\` instead of \`for\`.
3. **CMS Bindings (CRITICAL)**: Do NOT hardcode visible text. Bind all text elements to the \`cmsData\` prop passed to the component.
   - For standard Text/Image items, query the elements array: \`const el = cmsData?.elements?.find(e => e.elementName === 'yourElementName')\`. Use \`el?.content\` and add the \`data-field-id={el?.fieldId}\` attribute.
   - For Cards/Loop items, query the loop array: \`const loopItems = cmsData?.elements?.find(e => e.elementName === 'yourCollectionName')?.loop || []\`. Map over \`loopItems\`, access text as \`item.field1\`, \`item.field2\` etc., and add \`data-field-id={item.fieldId1}\`, \`data-field-id={item.fieldId2}\` to the corresponding tags.
   - Use 'useState' for simple interactive state changes if needed (like accordion toggle or tab selection).
   - Do NOT add any 'id' attribute to the section.

### CSS RULES:
1. Scope ALL selectors under .section-{section_number}. Example: \`.section-{section_number} h2 { font-size: 2rem; }\`
2. NEVER write unscoped global selectors like \`h1 { }\`, \`* { }\`, or \`body { }\`.
3. **Section Color Theme (USE THESE EXACT COLORS)**:
   You will receive a "Section Theme" object with EXACT HEX colors extracted from the original design. You MUST use these colors directly in your CSS — NOT through CSS variables, but as literal HEX values in your styles:
   - **background_color**: Use as the section's main background-color.
   - **primary_text_color**: Use for headings and primary text.
   - **secondary_text_color**: Use for body text, labels, and secondary content.
   - **accent_color**: Use for buttons, links, badges, and highlights.
   - **accent_hover_color**: Use for hover states on buttons and links.
   
   **Per-Element Colors**: Each element in the layout tree also has its own extracted text_color and background_color. Use these for element-specific styling (e.g., a button's own background differs from the section background). When an element has a specific background_color that differs from the section background, apply it directly to that element's CSS class.
   
4. **Typography**: Use font-family: 'Outfit', sans-serif for body text, 'Space Grotesk', sans-serif for headings.
5. Make the section fully responsive:
   - Mobile-first approach
   - Use @media queries SCOPED under .section-{section_number}
   - Breakpoints: 768px (tablet), 1024px (desktop)
6. Use modern CSS: flexbox, grid, clamp(), gap, aspect-ratio. No floats.
7. Write clean, well-structured CSS with logical grouping and comments.

### DUPLICATE DETECTION HANDLING (IMPORTANT):
The object detection model sometimes produces overlapping bounding boxes — two SAME detections covering nearly the same area. When you see elements in the layout tree that appear to be duplicates (same text_content, overlapping coordinates, same class), you should:
- **Merge them**: Render the element ONLY ONCE in your JSX output.
- **BUT preserve valid nested components**: If a parent container genuinely wraps a child element (e.g., a "container_card" containing a "text_heading" inside it), that is NOT a duplicate — render both the container and its child.
- **Rule of thumb**: If two elements share >80% of the same bounding box area AND have the same or very similar text_content, treat them as duplicates and render only one. If one element clearly contains the other (the parent is significantly larger), keep both as a proper parent-child relationship.

### DYNAMIC DESIGN & ANIMATIONS:
1. **Layout Variety**: Avoid boring, flat, vertical stacked blocks. Use creative grid systems, asymmetric layouts (e.g., 60/40 splits, overlapping elements, grid items with varying visual weight), and side-by-side structures where appropriate.
2. **Micro-interactions**: Every button, link, and interactive card must have smooth hover transitions (\`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)\`). Use subtle scaling (\`transform: translateY(-4px)\`), card lifting shadows, or glowing outlines on hover.
3. **CSS Animations**: Use subtle entry animations with CSS keyframes (e.g., fade-in, slide-up, or pulse effects). Ensure all \`@keyframes\` names are unique to this section by prefixing them (e.g., \`@keyframes section-{section_number}-fade-in { ... }\`).
4. **Depth & Contrast**: Use subtle borders (\`1px solid rgba(255,255,255,0.08)\` or similar) to separate items.
5. **Text Hierarchy**: Set proper line-height (1.5-1.7 for body, 1.2 for headings) and letter-spacing for premium readability.

### WHAT NOT TO DO (ANTI-HALLUCINATION):
- Do NOT use un-scoped global keyframes or styles.
- Do NOT invent text — bind strictly to the CMS elements provided.
- Do NOT hardcode the CMS text strings. Always fetch via \`cmsData\`.

Rule for image_media:
- Make sure that whenever you come across Image Media, the image_media should have the height and width exactly as provided in the layout tree elements. DO NOT code any text into that image to represent it. Either use an external image of similar description or just let the Image outline be. NEVER use "Image" or any text as a placeholder for the image. Either you put the right image in its place or just let the Image outline be. NEVER add any text on your own inside the Image.
`;

/**
 * Calls the Qwen Coder model to generate React JSX (CMS-bound) and CSS for a specific section.
 */
export async function generateSectionCode(
  section: Section,
  sectionNumber: number,
  cmsSectionData: any
): Promise<{ jsx: string; css: string }> {
  const componentName = section.section_name.replace(/[^a-zA-Z0-9]/g, "");
  logger.info("Coding Agent", `Generating code for section ${sectionNumber}: "${section.section_name}"...`);

  const modelId = env.qwenCodingModel || "qwen.qwen3-coder-next";

  // Build section description containing layout elements, metadata, theme colors, and the CMS schema
  const sectionDescription = `
Section Name: ${section.section_name}
Section Number: ${sectionNumber}
Component Name: ${componentName}
Detailed Section Description: ${section.section_description}

Section Theme (EXACT colors from the original design — use these directly):
  background_color: ${section.theme.background_color}
  primary_text_color: ${section.theme.primary_text_color}
  secondary_text_color: ${section.theme.secondary_text_color}
  accent_color: ${section.theme.accent_color}
  accent_hover_color: ${section.theme.accent_hover_color}

Section UI Layout Elements:
${JSON.stringify(section.elements, null, 2)}

---
CMS Schema Definition (Bind JSX text / loops to these elementName keys strictly):
${JSON.stringify(cmsSectionData, null, 2)}
`;

  const prompt = `${SECTION_CODER_SYSTEM_PROMPT}

---
### CURRENT SECTION TO GENERATE:
${sectionDescription}
`;

  try {
    const { text, usage } = await generateText({
      model: bedrockProvider(modelId),
      prompt: prompt,
      temperature: 0.15,
      abortSignal: AbortSignal.timeout(90000),
    });

    tokenTracker.track(`Coding Agent: ${section.section_name}`, modelId, usage, prompt, text, 0, false);

    // Parse JSX and CSS blocks using basic regex matches
    const jsxMatch = text.match(/```jsx([\s\S]*?)```/);
    const cssMatch = text.match(/```css([\s\S]*?)```/);

    const jsx = jsxMatch ? jsxMatch[1]!.trim() : "";
    const css = cssMatch ? cssMatch[1]!.trim() : "";

    if (!jsx || !css) {
      throw new Error("Failed to extract both JSX and CSS blocks from model response.");
    }

    return { jsx, css };
  } catch (error) {
    logger.error("Coding Agent", `Failed to generate code for section ${sectionNumber}: ${(error as Error).message}`);
    throw error;
  }
}
