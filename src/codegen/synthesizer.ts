import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";
import type { Section } from "../sections/section-identifier.js";

/**
 * Merges React JSX components and CSS files generated for all sections
 * into a single unified static App.jsx and index.css inside testing_react/src.
 */
/**
 * Converts a string to camelCase.
 */
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Merges React JSX components and CSS files generated for all sections
 * into a single unified static App.jsx and index.css inside testing_react/src.
 */
export function synthesizeApp(
  sections: Section[],
  generatedCodes: { jsx: string; css: string }[],
  testingReactPath: string,
  projectId: string
) {
  logger.info("Synthesizer", `Synthesizing full React App inside: ${testingReactPath}...`);

  const srcPath = path.join(testingReactPath, "src");
  if (!fs.existsSync(srcPath)) {
    fs.mkdirSync(srcPath, { recursive: true });
  }

  // Copy default_image.png to public directory if it exists in root
  const publicPath = path.join(testingReactPath, "public");
  const defaultImageSrc = path.join(process.cwd(), "default_image.png");
  const defaultImageDest = path.join(publicPath, "default_image.png");
  if (fs.existsSync(defaultImageSrc)) {
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }
    fs.copyFileSync(defaultImageSrc, defaultImageDest);
    logger.info("Synthesizer", `Copied default_image.png to ${defaultImageDest}`);
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

  const appImports = `import React, { useMemo, useState, useEffect } from 'react';
import cmsDataRaw from './cms_data.json';
import './index.css';
`;

  const sectionComponentsStr = sections
    .map((sect) => {
      const compName = sect.section_name.replace(/[^a-zA-Z0-9]/g, "");
      return `<${compName} cmsData={cmsData?.find(s => s?.metadata?.sectionName === "${sect.section_name}")} />`;
    })
    .join("\n        ");

  const appComponentBody = `
export default function App() {
  const [cmsData, setCmsData] = useState(cmsDataRaw.db_records);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(true);
  
  const projectId = "${projectId}";

  useEffect(() => {
    fetch(\`http://localhost:5001/api/cms/\${projectId}\`)
      .then(res => {
        if (!res.ok) throw new Error("Server not running or project not found");
        return res.json();
      })
      .then(data => {
        if (data.db_records) {
          setCmsData(data.db_records);
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn("Using local cms_data.json fallback:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleDblClick = (e) => {
      if (!editMode) return;
      const fieldId = e.target.getAttribute('data-field-id') || e.target.closest('[data-field-id]')?.getAttribute('data-field-id');
      if (fieldId) {
        const editableElement = e.target.closest('[data-field-id]') || e.target;
        editableElement.contentEditable = 'true';
        editableElement.focus();
      }
    };

    const handleBlur = (e) => {
      const target = e.target.closest('[data-field-id]') || e.target;
      const fieldId = target.getAttribute('data-field-id');
      if (fieldId) {
        const newText = target.innerText.trim();
        setPendingChanges(prev => ({ ...prev, [fieldId]: newText }));
        setHasChanges(true);
      }
    };

    const handleClick = (e) => {
      if (!editMode) return;
      if (e.target.closest('.editor-control-panel')) return;
      const isInteractive = e.target.closest('a, button, [role="button"], [data-field-id]');
      if (isInteractive) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('dblclick', handleDblClick);
    document.addEventListener('focusout', handleBlur);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('dblclick', handleDblClick);
      document.removeEventListener('focusout', handleBlur);
      document.removeEventListener('click', handleClick, true);
    };
  }, [editMode]);

  const handleSave = async () => {
    try {
      const res = await fetch(\`http://localhost:5001/api/cms/\${projectId}\`);
      if (!res.ok) throw new Error("Failed to contact server for saving");
      const data = await res.json();
      const records = data.db_records;

      let updatedCount = 0;
      for (const record of records) {
        let sectionUpdated = false;
        
        for (const elem of record.elements) {
          if (pendingChanges[elem.fieldId] !== undefined) {
            elem.content = pendingChanges[elem.fieldId];
            sectionUpdated = true;
            updatedCount++;
          }
          if (elem.loop && Array.isArray(elem.loop)) {
            for (const item of elem.loop) {
              for (let i = 1; i <= 10; i++) {
                const fId = item[\`fieldId\${i}\`];
                if (fId && pendingChanges[fId] !== undefined) {
                  item[\`field\${i}\`] = pendingChanges[fId];
                  sectionUpdated = true;
                  updatedCount++;
                }
              }
            }
          }
        }

        if (sectionUpdated) {
          const sectionId = record.metadata.sectionId;
          const updateRes = await fetch(\`http://localhost:5001/api/cms/\${projectId}/section/\${sectionId}/update\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elements: record.elements })
          });
          if (!updateRes.ok) throw new Error(\`Failed to update section \${sectionId}\`);
        }
      }

      alert(\`Successfully saved \${updatedCount} changes to MongoDB!\`);
      setHasChanges(false);
      setPendingChanges({});
      
      const refreshRes = await fetch(\`http://localhost:5001/api/cms/\${projectId}\`);
      const refreshData = await refreshRes.json();
      setCmsData(refreshData.db_records);
    } catch (err) {
      console.error(err);
      alert("Error saving changes: " + err.message);
    }
  };

  return (
    <div className={\`app-wrapper \${editMode ? 'edit-mode-active' : ''}\`}>
      <div className="editor-control-panel" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        background: '#1e293b',
        border: '1px solid #38bdf8',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontFamily: 'sans-serif'
      }}>
        <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 'bold' }}>
          {editMode ? '✍️ Edit Mode Active (Double Click Text to Edit)' : '👁️ Preview Mode'}
        </span>
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{
            background: editMode ? '#ef4444' : '#38bdf8',
            color: '#0f172a',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          {editMode ? 'Disable Edit' : 'Enable Edit'}
        </button>
        {hasChanges && (
          <button 
            onClick={handleSave}
            style={{
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
          >
            Save to MongoDB
          </button>
        )}
      </div>

      <style>{\`
        .edit-mode-active [data-field-id] {
          outline: 1px dashed #38bdf8 !important;
          cursor: text !important;
          position: relative !important;
          z-index: 10000 !important;
        }
        .edit-mode-active [data-field-id]:hover {
          background: rgba(56, 189, 248, 0.1) !important;
        }
        .edit-mode-active [data-field-id]:focus {
          outline: 2px solid #38bdf8 !important;
          background: rgba(56, 189, 248, 0.15) !important;
        }
      \`}</style>

      <main className="app-container">
        ${sectionComponentsStr}
      </main>
    </div>
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
