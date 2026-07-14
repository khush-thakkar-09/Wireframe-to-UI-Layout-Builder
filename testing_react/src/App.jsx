import React, { useMemo, useState } from 'react';
import './index.css';

function HeroSection() {
  return (
    <section className="section-1">
      <div className="hero-content">
        <h2 className="hero-chapters">NHRDN CHAPTERS</h2>
        <h3 className="hero-subheading">
          Presence across <span className="hero-accent">major cities</span>
        </h3>
        <h3 className="hero-location">in India</h3>
        <p className="hero-paragraph">
          With a strong community of global HR leaders, NHRDN
        </p>
        <p className="hero-paragraph">
          actively conducts networking events and activities in
        </p>
        <p className="hero-paragraph">
          over 60 cities across India.
        </p>
        <button className="hero-cta">
          Explore Chapters
        </button>
      </div>
    </section>
  );
}

function DestinationGrid() {
  return (
    <section className="section-2">
      <div className="destination-grid">
        {/* Nepal */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/326x403/8b4513/ffffff?text=Nepal" 
            alt="Nepal" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Nepal</h3>
          </div>
        </div>

        {/* Alwar and Rewari */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/328x421/8b4513/ffffff?text=Alwar+and+Rewari" 
            alt="Alwar and Rewari" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Alwar and Rewari</h3>
          </div>
        </div>

        {/* Goa */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/322x420/8b4513/ffffff?text=Goa" 
            alt="Goa" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Goa</h3>
          </div>
        </div>

        {/* Prayagraj */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/323x416/8b4513/ffffff?text=Prayagraj" 
            alt="Prayagraj" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Prayagraj</h3>
          </div>
        </div>

        {/* Shoolini */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/330x411/8b4513/ffffff?text=Shoolini" 
            alt="Shoolini" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Shoolini</h3>
          </div>
        </div>

        {/* Tanjore */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/326x405/8b4513/ffffff?text=Tanjore" 
            alt="Tanjore" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Tanjore</h3>
          </div>
        </div>

        {/* Solan */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/329x410/8b4513/ffffff?text=Solan" 
            alt="Solan" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Solan</h3>
          </div>
        </div>

        {/* Uttarakhand */}
        <div className="destination-card">
          <img 
            src="https://placehold.co/329x408/8b4513/ffffff?text=Uttarakhand" 
            alt="Uttarakhand" 
            className="destination-image"
          />
          <div className="destination-overlay">
            <h3 className="destination-title">Uttarakhand</h3>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className="app-container">
      <HeroSection />
      <DestinationGrid />
    </main>
  );
}

