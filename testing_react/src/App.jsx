import React, { useMemo, useState, useEffect } from 'react';
import cmsDataRaw from './cms_data.json';
import './index.css';

function NavigationBar({ cmsData }) {
  // Extract CMS data fields
  const navLogoEl = cmsData?.elements?.find(e => e.elementName === 'navLogo');
  const navLogo = navLogoEl?.content || "NHRD NETWORK";
  const navLogoId = navLogoEl?.fieldId;

  const navLinksCollectionEl = cmsData?.elements?.find(e => e.elementName === 'navLinksCollection');
  const navLinks = navLinksCollectionEl?.loop?.[0] || {};

  const studentLoginBtnEl = cmsData?.elements?.find(e => e.elementName === 'studentLoginButton');
  const studentLoginText = studentLoginBtnEl?.content || "Student Login";
  const studentLoginId = studentLoginBtnEl?.fieldId;

  const memberLoginBtnEl = cmsData?.elements?.find(e => e.elementName === 'memberLoginButton');
  const memberLoginText = memberLoginBtnEl?.content || "Member Login";
  const memberLoginId = memberLoginBtnEl?.fieldId;

  const becomeMemberBtnEl = cmsData?.elements?.find(e => e.elementName === 'becomeMemberButton');
  const becomeMemberText = becomeMemberBtnEl?.content || "Become A Member";
  const becomeMemberId = becomeMemberBtnEl?.fieldId;

  return (
    <section className="section-1">
      <nav className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          <span data-field-id={navLogoId}>{navLogo}</span>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          {navLinks.field1 && <a href="#" data-field-id={navLinks.fieldId1}>{navLinks.field1}</a>}
          {navLinks.field2 && <a href="#" data-field-id={navLinks.fieldId2}>{navLinks.field2}</a>}
          {navLinks.field3 && <a href="#" data-field-id={navLinks.fieldId3}>{navLinks.field3}</a>}
          {navLinks.field4 && <a href="#" data-field-id={navLinks.fieldId4}>{navLinks.field4}</a>}
          {navLinks.field5 && <a href="#" data-field-id={navLinks.fieldId5}>{navLinks.field5}</a>}
          {navLinks.field6 && <a href="#" data-field-id={navLinks.fieldId6}>{navLinks.field6}</a>}
        </div>

        {/* Action Buttons */}
        <div className="nav-actions">
          <button className="btn-login" data-field-id={studentLoginId}>
            {studentLoginText}
          </button>
          <button className="btn-login" data-field-id={memberLoginId}>
            {memberLoginText}
          </button>
          <button className="btn-cta" data-field-id={becomeMemberId}>
            {becomeMemberText}
          </button>
        </div>
      </nav>
    </section>
  );
}

function HeroSection({ cmsData }) {
  // Extract fields for clean access from elements array
  const headlinePart1El = cmsData?.elements?.find(e => e.elementName === 'heroHeadlinePart1');
  const headlinePart1 = headlinePart1El?.content || "Empowering India's";
  const headlinePart1Id = headlinePart1El?.fieldId;

  const headlinePart2El = cmsData?.elements?.find(e => e.elementName === 'heroHeadlinePart2');
  const headlinePart2 = headlinePart2El?.content || "HR Leaders of Tomorrow";
  const headlinePart2Id = headlinePart2El?.fieldId;

  const subheadlineEl = cmsData?.elements?.find(e => e.elementName === 'heroSubheadline');
  const subheadline = subheadlineEl?.content || "Join the national apex body...";
  const subheadlineId = subheadlineEl?.fieldId;

  const ctaJoinNetworkEl = cmsData?.elements?.find(e => e.elementName === 'ctaJoinNetwork');
  const ctaJoinNetwork = ctaJoinNetworkEl?.content || "Join the Network";
  const ctaJoinNetworkId = ctaJoinNetworkEl?.fieldId;

  const ctaExploreChaptersEl = cmsData?.elements?.find(e => e.elementName === 'ctaExploreChapters');
  const ctaExploreChapters = ctaExploreChaptersEl?.content || "Explore Chapters";
  const ctaExploreChaptersId = ctaExploreChaptersEl?.fieldId;

  const featureCardsEl = cmsData?.elements?.find(e => e.elementName === 'heroFeatureCards');
  const featureCards = featureCardsEl?.loop || [];

  return (
    <section className="section-2">
      <div className="hero-container">
        {/* Left Content */}
        <div className="hero-content">
          <h1 className="hero-headline">
            <span data-field-id={headlinePart1Id} className="headline-part-1">{headlinePart1}</span>
            <span data-field-id={headlinePart2Id} className="headline-part-2">{headlinePart2}</span>
          </h1>
          
          <p data-field-id={subheadlineId} className="hero-subheadline">
            {subheadline}
          </p>
          
          <div className="hero-cta-group">
            <button data-field-id={ctaJoinNetworkId} className="cta-button primary">
              {ctaJoinNetwork}
            </button>
            <button data-field-id={ctaExploreChaptersId} className="cta-button secondary">
              {ctaExploreChapters}
            </button>
          </div>
        </div>

        {/* Right Feature Cards */}
        <div className="hero-features">
          <div className="feature-grid">
            {featureCards.map((card, idx) => (
              <div key={idx} className="feature-card">
                <h3 data-field-id={card.fieldId1} className="feature-title">{card.field1}</h3>
                <div className="feature-stats">
                  <span data-field-id={card.fieldId2} className="stat-number">{card.field2}</span>
                  <span data-field-id={card.fieldId3} className="stat-desc">{card.field3}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Chess piece placeholder */}
          <div className="chess-piece-container">
            <img 
              src="/default_image.png" 
              alt="3D Red Chess Piece" 
              className="chess-piece"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatisticsFooter({ cmsData }) {
  const statsCollectionEl = cmsData?.elements?.find(e => e.elementName === 'statsCollection');
  const stats = statsCollectionEl?.loop || [];

  return (
    <section className="section-3">
      <div className="stats-container">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-item">
            <div className="stat-number" data-field-id={stat.fieldId1}>
              {stat.field1}
            </div>
            <div className="stat-label" data-field-id={stat.fieldId2}>
              {stat.field2}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [cmsData, setCmsData] = useState(cmsDataRaw.db_records);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(true);
  
  const projectId = "nhrd1_r3i14c";

  useEffect(() => {
    fetch(`http://localhost:5001/api/cms/${projectId}`)
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
      const res = await fetch(`http://localhost:5001/api/cms/${projectId}`);
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
                const fId = item[`fieldId${i}`];
                if (fId && pendingChanges[fId] !== undefined) {
                  item[`field${i}`] = pendingChanges[fId];
                  sectionUpdated = true;
                  updatedCount++;
                }
              }
            }
          }
        }

        if (sectionUpdated) {
          const sectionId = record.metadata.sectionId;
          const updateRes = await fetch(`http://localhost:5001/api/cms/${projectId}/section/${sectionId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elements: record.elements })
          });
          if (!updateRes.ok) throw new Error(`Failed to update section ${sectionId}`);
        }
      }

      alert(`Successfully saved ${updatedCount} changes to MongoDB!`);
      setHasChanges(false);
      setPendingChanges({});
      
      const refreshRes = await fetch(`http://localhost:5001/api/cms/${projectId}`);
      const refreshData = await refreshRes.json();
      setCmsData(refreshData.db_records);
    } catch (err) {
      console.error(err);
      alert("Error saving changes: " + err.message);
    }
  };

  return (
    <div className={`app-wrapper ${editMode ? 'edit-mode-active' : ''}`}>
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

      <style>{`
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
      `}</style>

      <main className="app-container">
        <NavigationBar cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Navigation Bar")} />
        <HeroSection cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Hero Section")} />
        <StatisticsFooter cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Statistics Footer")} />
      </main>
    </div>
  );
}

