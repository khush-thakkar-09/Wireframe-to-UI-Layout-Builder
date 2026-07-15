const appWrapperCode = `export default function App() {
  const [cmsData, setCmsData] = useState(cmsDataRaw.resolved_cms);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(true);
  
  const projectId = "__PROJECT_ID__";

  useEffect(() => {
    fetch(\`http://localhost:5001/api/cms/\${projectId}\`)
      .then(res => {
        if (!res.ok) throw new Error("Server not running or project not found");
        return res.json();
      })
      .then(data => {
        if (data.resolved_cms) {
          setCmsData(data.resolved_cms);
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
      const fieldId = e.target.getAttribute('data-field-id');
      if (fieldId) {
        e.target.contentEditable = 'true';
        e.target.focus();
      }
    };

    const handleBlur = (e) => {
      const fieldId = e.target.getAttribute('data-field-id');
      if (fieldId) {
        const newText = e.target.innerText.trim();
        setPendingChanges(prev => ({ ...prev, [fieldId]: newText }));
        setHasChanges(true);
      }
    };

    const handleClick = (e) => {
      if (!editMode) return;
      const fieldId = e.target.getAttribute('data-field-id');
      if (fieldId) {
        e.preventDefault();
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
      setCmsData(refreshData.resolved_cms);
    } catch (err) {
      console.error(err);
      alert("Error saving changes: " + err.message);
    }
  };

  return (
    <div className={\`app-wrapper \${editMode ? 'edit-mode-active' : ''}\`}>
      <div style={{
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

      <GeneratedPage cmsData={cmsData} />
    </div>
  );
}`.replace("__PROJECT_ID__", projectIdVal);

const combinedJsx =
    `import React, { ${hooksImportList} } from 'react';\n` +
    `import cmsDataRaw from './cms_data.json';\n` +
    `import './index.css';\n\n` +
    jsxComponents.join("\n\n") + "\n\n" +
    wrapperLines.join("\n") + "\n\n" +
    appWrapperCode;
