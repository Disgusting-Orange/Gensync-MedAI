import React from 'react';

export default function SidebarGraphic() {
  return (
    <div className="sidebar-bottom-card" aria-hidden="true">
      <div className="sidebar-wave-art">
        <svg
          viewBox="0 0 220 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sidebar-wave-svg"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Background Soft Hill */}
          <path
            d="M 0 55 C 40 40, 90 25, 140 42 C 170 52, 200 48, 220 40 L 220 70 L 0 70 Z"
            fill="url(#waveGrad1)"
          />

          {/* Midground Gentle Curve */}
          <path
            d="M 0 60 C 50 48, 85 30, 130 35 C 175 40, 195 55, 220 52 L 220 70 L 0 70 Z"
            fill="url(#waveGrad2)"
          />

          {/* Foreground Crisp Hill Wave */}
          <path
            d="M 0 64 C 45 54, 70 38, 105 45 C 145 53, 175 62, 220 58 L 220 70 L 0 70 Z"
            fill="url(#waveGrad3)"
          />
        </svg>
      </div>

      <div className="sidebar-tagline-block">
        <h4 className="sidebar-tagline-title">Better questions.<br />Safer answers.</h4>
        <p className="sidebar-tagline-desc">
          Semantic caching with built-in clinical safety.
        </p>
      </div>
    </div>
  );
}
