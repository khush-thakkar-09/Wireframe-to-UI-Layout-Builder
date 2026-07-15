import React, { useMemo, useState } from 'react';
import './index.css';

function NavigationBar() {
  return (
    <section className="section-1">
      <nav className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          <span className="logo-text">HRX</span>
        </div>

        {/* Navigation Links */}
        <ul className="nav-links">
          <li className="nav-item nav-item-home">
            <a href="#home" className="nav-link">Home</a>
          </li>
          <li className="nav-item">
            <a href="#collection" className="nav-link">Collection</a>
          </li>
          <li className="nav-item">
            <a href="#community" className="nav-link">Community</a>
          </li>
          <li className="nav-item">
            <a href="#blog" className="nav-link">Blog</a>
          </li>
          <li className="nav-item">
            <a href="#press-release" className="nav-link">Press Release</a>
          </li>
          <li className="nav-item">
            <a href="#connect" className="nav-link">Connect</a>
          </li>
        </ul>

        {/* Right Actions */}
        <div className="nav-actions">
          <button className="nav-login-btn">Login</button>
          <button className="nav-cart-btn" aria-label="Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6H18L16.5 15H7.5L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L5 3H19L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </nav>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="section-2">
      <div className="hero-container">
        <div className="hero-image-wrapper">
          <div className="hero-image" />
        </div>
        
        <div className="hero-content">
          <div className="hero-subheading">HRX MIND FUEL</div>
          <h2 className="hero-heading">CHALLENGE YOUR LIMITS</h2>
          <p className="hero-paragraph">
            Be a part of the tribe that's limitless. Are you looking for some exciting challenges? Then you have it all with Hrx workout sessions that are specially designed with out trainers to kickstart your fitness journey. Then why limit yourselves when having your fitness convenience in your own hands with Hrx.
          </p>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">150+</div>
              <div className="stat-label">Fitness channels</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">40+</div>
              <div className="stat-label">Fitness Programmes</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">0+</div>
              <div className="stat-label">Community Members</div>
            </div>
          </div>
          
          <button className="hero-button">FIND A WORKOUT</button>
        </div>
      </div>
    </section>
  );
}

function EventBanner() {
  return (
    <section className="section-3">
      <div className="event-banner-container">
        <div className="yoga-event-card">
          <h2 className="yoga-heading">International YOGA DAY celebration</h2>
        </div>
        <div className="dublin-event-card">
          <h2 className="dublin-heading">DUBLIN SQUARE</h2>
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
      <EventBanner />
    </main>
  );
}

