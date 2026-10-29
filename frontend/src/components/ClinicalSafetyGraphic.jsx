import React from 'react';

export default function ClinicalSafetyGraphic() {
  return (
    <div className="hero-graphic-container" aria-hidden="true">
      <svg
        viewBox="0 0 340 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hero-graphic-svg"
      >
        <defs>
          {/* Ambient Glow Gradient */}
          <radialGradient
            id="ambientGlow"
            cx="65%"
            cy="45%"
            r="60%"
            fx="65%"
            fy="45%"
          >
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#a78bfa" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#34d399" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Cube Gradients */}
          <linearGradient id="cubeTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="cubeLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="cubeRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Glass Medical Cross Gradients */}
          <linearGradient id="crossGlassFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="crossGlassTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="crossGlassSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#581c87" stopOpacity="0.95" />
          </linearGradient>

          {/* Floating Bubble Gradients */}
          <linearGradient id="bubble1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="bubble2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Backdrop Ambient Light */}
        <circle cx="210" cy="110" r="105" fill="url(#ambientGlow)" />

        {/* Small Floating Pastel Cube Left */}
        <g transform="translate(68, 70) scale(0.65)">
          {/* Top Face */}
          <polygon points="20,0 40,11 20,22 0,11" fill="url(#cubeTop)" opacity="0.85" />
          {/* Left Face */}
          <polygon points="0,11 20,22 20,44 0,33" fill="url(#cubeLeft)" opacity="0.75" />
          {/* Right Face */}
          <polygon points="20,22 40,11 40,33 20,44" fill="url(#cubeRight)" opacity="0.85" />
        </g>

        {/* Small Floating Pastel Sphere */}
        <circle cx="165" cy="55" r="5" fill="#34d399" opacity="0.8" />
        <circle cx="280" cy="165" r="7" fill="#c084fc" opacity="0.7" />
        <circle cx="150" cy="170" r="4" fill="#38bdf8" opacity="0.6" />

        {/* Primary 3D Isometric Clinical Cross Shield */}
        <g transform="translate(155, 30)">
          {/* Outer Glass Shield Plate */}
          <rect
            x="20"
            y="20"
            width="100"
            height="115"
            rx="20"
            fill="url(#crossGlassFront)"
            filter="drop-shadow(0 12px 28px rgba(37, 99, 235, 0.28))"
          />

          {/* Frosted Border Highlight */}
          <rect
            x="20"
            y="20"
            width="100"
            height="115"
            rx="20"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Crisp White Medical Cross inside Shield */}
          <path
            d="M 62 48 
               L 78 48 
               L 78 68 
               L 98 68 
               L 98 84 
               L 78 84 
               L 78 104 
               L 62 104 
               L 62 84 
               L 42 84 
               L 42 68 
               L 62 68 Z"
            fill="#ffffff"
            filter="drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))"
          />

          {/* Soft inner glow accent on Cross */}
          <circle cx="70" cy="76" r="22" fill="#38bdf8" opacity="0.25" filter="blur(8px)" />
        </g>

        {/* Floating Pastel Glass Ring/Torus Accent */}
        <ellipse cx="265" cy="95" rx="14" ry="26" fill="url(#bubble2)" transform="rotate(-25 265 95)" />

        {/* "Safe by design" Whimsical Curved Arrow & Annotation */}
        <g className="safe-by-design-annotation">
          {/* Handwritten Annotation Text */}
          <text
            x="235"
            y="32"
            fill="#475569"
            fontSize="12.5"
            fontFamily="'Newsreader', Georgia, cursive, sans-serif"
            fontStyle="italic"
            fontWeight="500"
            textAnchor="middle"
          >
            Safe
          </text>
          <text
            x="248"
            y="46"
            fill="#475569"
            fontSize="12"
            fontFamily="'Newsreader', Georgia, cursive, sans-serif"
            fontStyle="italic"
            fontWeight="500"
            textAnchor="middle"
          >
            by design
          </text>

          {/* Curved Hand-Drawn Arrow */}
          <path
            d="M 245 52 
               C 242 65, 238 72, 232 78 
               C 228 82, 222 84, 218 85"
            stroke="#64748b"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Arrowhead */}
          <path
            d="M 221 81 
               L 216 85 
               L 221 89"
            stroke="#64748b"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
