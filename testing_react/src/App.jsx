import React, { useMemo, useState } from 'react';
import './index.css';

function HeroSection() {
  return (
    <section className="section-1">
      <div className="hero-content">
        <h2 className="hero-subheading">NHRDN KEY MOMENTS</h2>
        <h1 className="hero-main-heading">
          Celebrating milestones and creating
          <span className="hero-highlight">impact</span>
        </h1>
      </div>
    </section>
  );
}

function EventGalleryCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      id: 1,
      image: "https://placehold.co/673x557/ef4444/ffffff?text=Inquizition+2026",
      caption: "Inquizition 2026",
      subCaption: "NHRDN INQUIZITION 2026",
      logo: "NHRD",
      logoBg: "#fef3c7",
      logoColor: "#ef4444",
      textBg: "#fff5e6",
      textColor: "#5c4033"
    },
    {
      id: 2,
      image: "https://placehold.co/821x536/ef4444/ffffff?text=Inquizition+2026",
      caption: "Inquizition 2026",
      subCaption: "NHRDN INQUIZITION 2026",
      logo: "NHRD",
      logoBg: "#fef3c7",
      logoColor: "#ef4444",
      textBg: "#fff5e6",
      textColor: "#5c4033"
    },
    {
      id: 3,
      image: "https://placehold.co/821x536/ef4444/ffffff?text=NCCL+2026",
      caption: "NCCL 2026",
      subCaption: "National Corporate Cricket League",
      logo: null,
      logoBg: null,
      logoColor: null,
      textBg: "#ffffff",
      textColor: "#4b5563"
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <section className="section-2">
      <div className="carousel-container">
        <div className="carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {slides.map((slide) => (
            <div key={slide.id} className="carousel-slide">
              <div className="slide-image-wrapper">
                <img src={slide.image} alt={slide.caption} className="slide-image" />
                <div className="slide-overlay">
                  <div className="slide-content">
                    {slide.logo && (
                      <div 
                        className="slide-logo" 
                        style={{ 
                          backgroundColor: slide.logoBg, 
                          color: slide.logoColor 
                        }}
                      >
                        {slide.logo}
                      </div>
                    )}
                    <h3 
                      className="slide-subtitle" 
                      style={{ 
                        backgroundColor: slide.textBg, 
                        color: slide.textColor 
                      }}
                    >
                      {slide.subCaption}
                    </h3>
                    <h2 className="slide-title">{slide.caption}</h2>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="carousel-btn prev-btn" 
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19L8 12L15 5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button 
          className="carousel-btn next-btn" 
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L16 12L9 19" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="carousel-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className="app-container">
      <HeroSection />
      <EventGalleryCarousel />
    </main>
  );
}

