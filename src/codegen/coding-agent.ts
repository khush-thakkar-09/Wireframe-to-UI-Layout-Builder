import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { Section } from "../sections/section-identifier.js";
import type { CmsSchema } from "../cms/cms-generator.js";

// Initialize Bedrock client with explicit API Key from our configuration
// qwen.qwen3-coder-next is available in us-east-1 region
const bedrockProvider = createAmazonBedrock({
  apiKey: env.qwenApiKey,
  region: "us-east-1",
});

export const SECTION_CODER_SYSTEM_PROMPT = `You are an expert frontend React developer specializing in modern, responsive, visually stunning web design. You will be given a detailed description of a single section of a web page and its layout tree elements. Your job is to write the React JSX and CSS code for ONLY this section.

### OUTPUT FORMAT (STRICT):
You MUST output EXACTLY two fenced code blocks. Do NOT use <style> tags.
Do not include any text before or after the code blocks.

Example Expected Output:
\`\`\`jsx
export default function {section_component_name}() {
  return (
    <section className="section-{section_number}">
      <h1>Example Headline</h1>
      ...
    </section>
  );
}
\`\`\`
\`\`\`css
.section-{section_number} {
  /* section styling */
}
\`
\`\`

### REACT & JSX RULES (THE 3 GOLDEN RULES):
1. **Single Root Element**: The component must return a single wrapping \`<section>\` element with \`className="section-{section_number}"\`.
2. **className instead of class**: All HTML classes MUST use \`className\`. Use \`htmlFor\` instead of \`for\`.
3. **Static Content**: Write clean, hardcoded semantic JSX using realistic placeholder text and visual elements matching the section elements' descriptions. Do NOT use any cmsData prop or variable mapping.
   - Use 'useState' for simple interactive state changes if needed (like accordion toggle or tab selection).
   - Do NOT add any 'id' attribute to the section.

### CSS RULES:
1. Scope ALL selectors under .section-{section_number}. Example: \`.section-{section_number} h2 { font-size: 2rem; }\`
2. NEVER write unscoped global selectors like \`h1 { }\`, \`* { }\`, or \`body { }\`.
3. **Global Theme (ALREADY DEFINED — USE THESE AS YOUR BASE)**:
   The following CSS custom properties have been pre-defined globally for the entire page. You should use them as your primary visual foundation (especially for fonts, primary typography colors, and spacing).
   
   **Active Design Tokens:**
   \`\`\`css
   :root {
     --bg-primary: #0b0f19;
     --bg-secondary: #111827;
     --bg-tertiary: #1f2937;
     --text-primary: #f3f4f6;
     --text-secondary: #9ca3af;
     --accent-color: #ef4444;
     --accent-hover: #dc2626;
     --font-family: 'Outfit', sans-serif;
     --font-heading: 'Space Grotesk', sans-serif;
     --spacing-xs: 4px;
     --spacing-sm: 8px;
     --spacing-md: 16px;
     --spacing-lg: 32px;
     --spacing-xl: 64px;
     --border-radius: 8px;
     --border-radius-lg: 16px;
   }
   \`\`\`
   
   **Variable Reference:**
   - Colors: var(--bg-primary), var(--bg-secondary), var(--bg-tertiary), var(--text-primary), var(--text-secondary), var(--accent-color), var(--accent-hover)
   - Typography: var(--font-family), var(--font-heading)
   - Spacing: var(--spacing-xs), var(--spacing-sm), var(--spacing-md), var(--spacing-lg), var(--spacing-xl)
   - Borders: var(--border-radius), var(--border-radius-lg)
   
   **Design Distinction & Creative Freedom**:
   - **Section Alternation**: Use either \`var(--bg-primary)\` or \`var(--bg-secondary)\` as the base background for your section wrapper to keep the page visually dynamic and alternate layout segments cleanly.
   - **Creative Freedom**: You are encouraged to add custom section-specific local styles (such as background gradients, soft color overlays, glassmorphism backdrops, subtle accent borders, or glowing element drop-shadows) using opacity adjustments (e.g., \`rgba()\`, \`hsla()\`) or matching highlight colors to prevent the layout from looking plain or flat. Avoid pure black/white backdrops unless requested.
4. Make the section fully responsive:
   - Mobile-first approach
   - Use @media queries SCOPED under .section-{section_number}
   - Breakpoints: 768px (tablet), 1024px (desktop)
5. Use modern CSS: flexbox, grid, clamp(), gap, aspect-ratio. No floats.
6. Write clean, well-structured CSS with logical grouping and comments.

### DYNAMIC DESIGN & ANIMATIONS:
1. **Layout Variety**: Avoid boring, flat, vertical stacked blocks. Use creative grid systems, asymmetric layouts (e.g., 60/40 splits, overlapping elements, grid items with varying visual weight), and side-by-side structures where appropriate.
2. **Micro-interactions**: Every button, link, and interactive card must have smooth hover transitions (\`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)\`). Use subtle scaling (\`transform: translateY(-4px)\`), card lifting shadows, or glowing outlines on hover.
3. **CSS Animations**: Use subtle entry animations with CSS keyframes (e.g., fade-in, slide-up, or pulse effects). Ensure all \`@keyframes\` names are unique to this section by prefixing them (e.g., \`@keyframes section-{section_number}-fade-in { ... }\`).
4. **Depth & Contrast**: Alternate background colors using \`var(--bg-secondary)\` or \`var(--bg-tertiary)\` for card backgrounds or layout subdivisions. Use subtle borders (\`1px solid rgba(255,255,255,0.08)\` or similar) to separate items.
5. **Text Hierarchy**: Set proper line-height (1.5-1.7 for body, 1.2 for headings) and letter-spacing for premium readability.

### WHAT NOT TO DO (ANTI-HALLUCINATION):
- Do NOT reference any external assets, images, logos, or icons from other websites (use \`https://placehold.co/WIDTHxHEIGHT/HEXBG/HEXFG\` or inline SVGs only).
- Do NOT invent or use CSS variables other than the ones defined in CSS Rules.
- Do NOT use un-scoped global keyframes or styles.
`;

/**
 * Calls the Qwen Coder model to generate React JSX (with raw static text placeholders) and CSS for a specific section.
 */
export async function generateSectionCode(
  section: Section,
  sectionNumber: number
): Promise<{ jsx: string; css: string }> {
  const componentName = section.section_name.replace(/[^a-zA-Z0-9]/g, "");
  logger.info("Coding Agent", `Generating code for section ${sectionNumber}: "${section.section_name}"...`);

  const modelId = env.qwenCodingModel || "qwen.qwen3-coder-next";

  // Build section description containing layout elements and metadata
  const sectionDescription = `
Section Name: ${section.section_name}
Section Number: ${sectionNumber}
Component Name: ${componentName}
Detailed Section Description: ${section.section_description}

Section UI Layout Elements:
${JSON.stringify(section.elements, null, 2)}
`;

  const prompt = `${SECTION_CODER_SYSTEM_PROMPT}

---
### CURRENT SECTION TO GENERATE:
${sectionDescription}
`;

  try {
    const { text } = await generateText({
      model: bedrockProvider(modelId),
      prompt: prompt,
      temperature: 0.15,
    });

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
