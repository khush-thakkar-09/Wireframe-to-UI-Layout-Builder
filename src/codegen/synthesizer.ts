import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";
import type { Section } from "../sections/section-identifier.js";

/**
 * Merges React JSX components and CSS files generated for all sections
 * into a single unified static App.jsx and index.css inside testing_react/src.
 */
export function synthesizeApp(
  sections: Section[],
  generatedCodes: { jsx: string; css: string }[],
  testingReactPath: string
) {
  logger.info("Synthesizer", `Synthesizing full React App inside: ${testingReactPath}...`);

  const srcPath = path.join(testingReactPath, "src");
  if (!fs.existsSync(srcPath)) {
    fs.mkdirSync(srcPath, { recursive: true });
  }

  // 1. Synthesize App.jsx containing imports, local React wrappers, and main App assembly
  const jsxComponents = generatedCodes.map((c, idx) => {
    const compName = sections[idx]!.section_name.replace(/[^a-zA-Z0-9]/g, "");
    
    // Clean up 'export default' inside generated JSX component so we can declare them locally
    let cleanedJsx = c.jsx
      .replace(/export\s+default\s+function\s+\w+/, `function ${compName}`)
      .replace(/export\s+function\s+\w+/, `function ${compName}`);

    // If imports are present in the block, move them out
    cleanedJsx = cleanedJsx.replace(/import\s+[\s\S]*?;/g, "");

    return cleanedJsx;
  });

  const appImports = `import React, { useMemo, useState } from 'react';
import './index.css';
`;

  const appComponentBody = `
export default function App() {
  return (
    <main className="app-container">
      ${sections
        .map((sect) => {
          const compName = sect.section_name.replace(/[^a-zA-Z0-9]/g, "");
          return `<${compName} />`;
        })
        .join("\n      ")}
    </main>
  );
}
`;

  const finalAppJsx = `${appImports}
${jsxComponents.join("\n\n")}
${appComponentBody}
`;

  fs.writeFileSync(path.join(srcPath, "App.jsx"), finalAppJsx, "utf-8");
  logger.success("Synthesizer", "Synthesized App.jsx successfully.");

  // 2. Synthesize index.css combining a minimal global reset and section styles
  const themeCss = `/* === Global Reset & Typography === */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === Section Layout Styles === */
`;

  const combinedCss = `${themeCss}
${generatedCodes.map((c) => c.css).join("\n\n")}
`;

  fs.writeFileSync(path.join(srcPath, "index.css"), combinedCss, "utf-8");
  logger.success("Synthesizer", "Synthesized index.css successfully.");
}
