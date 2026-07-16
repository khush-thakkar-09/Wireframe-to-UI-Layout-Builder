import React, { useMemo, useState, useEffect } from 'react';
import cmsDataRaw from './cms_data.json';
import './index.css';

function HeroSection({ cmsData }) {
  // Extract fields for clean access from elements array
  const mainHeadingEl = cmsData?.elements?.find(e => e.elementName === 'heroMainHeading');
  const mainHeading = mainHeadingEl?.content || "NHRDN KEY MOMENTS";
  const mainHeadingId = mainHeadingEl?.fieldId;

  const subheadingPart1El = cmsData?.elements?.find(e => e.elementName === 'heroSubheadingPart1');
  const subheadingPart1 = subheadingPart1El?.content || "Celebrating milestones and creating";
  const subheadingPart1Id = subheadingPart1El?.fieldId;

  const subheadingPart2El = cmsData?.elements?.find(e => e.elementName === 'heroSubheadingPart2');
  const subheadingPart2 = subheadingPart2El?.content || "impact";
  const subheadingPart2Id = subheadingPart2El?.fieldId;

  return (
    <section className="section-1">
      <div className="hero-content">
        <h1 data-field-id={mainHeadingId} className="hero-main-heading">
          {mainHeading}
        </h1>
        <div className="hero-subheading-container">
          <h2 data-field-id={subheadingPart1Id} className="hero-subheading-part1">
            {subheadingPart1}
          </h2>
          <h2 data-field-id={subheadingPart2Id} className="hero-subheading-part2">
            {subheadingPart2}
          </h2>
        </div>
      </div>
    </section>
  );
}

function EventCarousel({ cmsData }) {
  // Extract fields for clean access from elements array
  const event1ImageEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselMainImage1');
  const event1CaptionEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselCaption1');
  const event2ImageEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselMainImage2');
  const event2CaptionEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselCaption2');
  const event3ImageEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselMainImage3');
  const event3CaptionEl = cmsData?.elements?.find(e => e.elementName === 'eventCarouselCaption3');
  const prevBtnEl = cmsData?.elements?.find(e => e.elementName === 'carouselPrevButton');
  const nextBtnEl = cmsData?.elements?.find(e => e.elementName === 'carouselNextButton');

  const event1Image = event1ImageEl?.content || "";
  const event1Caption = event1CaptionEl?.content || "Event 1";
  const event2Image = event2ImageEl?.content || "";
  const event2Caption = event2CaptionEl?.content || "Event 2";
  const event3Image = event3ImageEl?.content || "";
  const event3Caption = event3CaptionEl?.content || "Event 3";
  const prevBtnText = prevBtnEl?.content || "Previous";
  const nextBtnText = nextBtnEl?.content || "Next";

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const totalEvents = 3;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalEvents - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalEvents - 1 ? 0 : prev + 1));
  };

  return (
    <section className="section-2">
      <div className="carousel-container">
        {/* Carousel Items */}
        <div 
          className="carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {/* Event 1 */}
          <div className="carousel-slide">
            <div className="event-card">
              <div className="event-image-wrapper">
                <img 
                  src={event1Image} 
                  alt={event1Caption}
                  className="event-image"
                />
              </div>
              <h3 data-field-id={event1CaptionEl?.fieldId} className="event-caption">
                {event1Caption}
              </h3>
            </div>
          </div>

          {/* Event 2 */}
          <div className="carousel-slide">
            <div className="event-card">
              <div className="event-image-wrapper">
                <img 
                  src={event2Image} 
                  alt={event2Caption}
                  className="event-image"
                />
              </div>
              <h3 data-field-id={event2CaptionEl?.fieldId} className="event-caption">
                {event2Caption}
              </h3>
            </div>
          </div>

          {/* Event 3 */}
          <div className="carousel-slide">
            <div className="event-card">
              <div className="event-image-wrapper">
                <img 
                  src={event3Image} 
                  alt={event3Caption}
                  className="event-image"
                />
              </div>
              <h3 data-field-id={event3CaptionEl?.fieldId} className="event-caption">
                {event3Caption}
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <button 
          onClick={handlePrev}
          className="carousel-btn prev-btn"
          aria-label="Previous Event"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="sr-only">{prevBtnText}</span>
        </button>

        <button 
          onClick={handleNext}
          className="carousel-btn next-btn"
          aria-label="Next Event"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="sr-only">{nextBtnText}</span>
        </button>
      </div>
    </section>
  );
}

function CarouselPagination({ cmsData }) {
  // Extract pagination dots and active indicator from CMS
  const dots = [
    cmsData?.elements?.find(e => e.elementName === 'paginationDot1'),
    cmsData?.elements?.find(e => e.elementName === 'paginationDot2'),
    cmsData?.elements?.find(e => e.elementName === 'paginationDot3'),
    cmsData?.elements?.find(e => e.elementName === 'paginationDot4'),
    cmsData?.elements?.find(e => e.elementName === 'paginationDot5'),
    cmsData?.elements?.find(e => e.elementName === 'paginationDot6'),
  ].filter(Boolean);

  const activeIndicatorEl = cmsData?.elements?.find(e => e.elementName === 'paginationActiveIndicator');
  const activeIndicatorId = activeIndicatorEl?.fieldId;

  // Determine active dot index (for demo purposes, we'll assume first dot is active)
  // In a real app, this would be controlled by the parent carousel component
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="section-3">
      <div className="pagination-container">
        {dots.map((dot, index) => (
          <button
            key={dot?.fieldId || index}
            className={`pagination-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? 'page' : undefined}
          >
            <div className="dot-inner" />
          </button>
        ))}
        
        {/* Active indicator element - rendered as a separate element if needed */}
        {activeIndicatorEl && (
          <div 
            className="active-indicator" 
            data-field-id={activeIndicatorId}
          />
        )}
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
  
  const projectId = "nhrd4_a9ppm2";

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
        <HeroSection cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Hero Section")} />
        <EventCarousel cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Event Carousel")} />
        <CarouselPagination cmsData={cmsData?.find(s => s?.metadata?.sectionName === "Carousel Pagination")} />
      </main>
    </div>
  );
}

