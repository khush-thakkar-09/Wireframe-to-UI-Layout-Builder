import React, { useMemo, useState } from 'react';
import './index.css';

function NavigationBar() {
  return (
    <section className="section-1">
      <nav className="nav-container">
        <div className="nav-left">
          <a href="#" className="logo-link">
            <div className="logo">
              <span className="logo-text">HRX</span>
              <svg className="checkmark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="trademark">®</span>
            </div>
          </a>
        </div>

        <div className="nav-center">
          <ul className="nav-links">
            <li><a href="#" className="nav-link nav-link-home">Home</a></li>
            <li><a href="#" className="nav-link">Collection</a></li>
            <li><a href="#" className="nav-link">Connect</a></li>
            <li><a href="#" className="nav-link">Community</a></li>
            <li><a href="#" className="nav-link">Blog</a></li>
            <li><a href="#" className="nav-link">Press Release</a></li>
          </ul>
        </div>

        <div className="nav-right">
          <button className="login-btn">Login</button>
          <div className="shopping-bag-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 2H18V6H6V2Z" fill="white"/>
              <path d="M4 6H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" fill="white"/>
              <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="white"/>
              <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </nav>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="section-2">
      <div className="hero-container">
        {/* Left Side: Hero Image */}
        <div className="hero-image-wrapper">
          <div className="hero-image">
            <img 
              src="https://placehold.co/600x800/1f2937/ef4444?text=Muscular+Man+with+Dumbbells" 
              alt="Muscular man holding dumbbells" 
              className="hero-img"
            />
            <div className="hero-overlay"></div>
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-subtitle">
              <span className="accent-text">HRX MIND FUEL</span>
            </div>
            <h1 className="hero-heading">CHALLENGE YOUR LIMITS</h1>
            <p className="hero-paragraph">
              Take control of your fitness journey with expert-led HRX workout sessions. 
              Train with the best trainers and unlock your true potential.
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">0+</div>
              <div className="stat-label">Community Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">40+</div>
              <div className="stat-label">Fitness Programmes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">150+</div>
              <div className="stat-label">Fitness channels</div>
            </div>
          </div>

          {/* CTA Button */}
          <button className="cta-button">
            FIND A WORKOUT
          </button>
        </div>
      </div>
    </section>
  );
}

function EventBannerSection() {
  return (
    <section className="section-3">
      <div className="container">
        <div className="banner-content">
          <div className="event-text-group">
            <h2 className="main-heading">
              International 
              <span className="highlight-text">YOGA DAY</span>
              <span className="decorative-line" aria-hidden="true">—</span>
              <span className="sub-text">celebration</span>
            </h2>
          </div>
          
          <div className="location-badge">
            <span className="location-text">DUBLIN SQUARE</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className="app-container">
      <NavigationBar />
      <HeroSection />
      <EventBannerSection />
    </main>
  );
}

