import React from 'react';

/**
 * BackgroundWaveMesh
 * Recreates the exact 3D glowing cyan wave mesh ribbon on the left
 * and purple/blue wave mesh ribbon on the right from media_1793304538599_2ca60ade.png
 */
export default function BackgroundWaveMesh() {
  return (
    <div className="background-wave-container" aria-hidden="true">
      <svg
        className="background-wave-svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Saturated cyan glow on left */}
          <radialGradient id="leftGlow" cx="0%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00dcff" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#0099cc" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#005588" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#060d1a" stopOpacity="0" />
          </radialGradient>

          {/* Saturated purple glow on right */}
          <radialGradient id="rightGlow" cx="100%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#6d28d9" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#4c1d95" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#060d1a" stopOpacity="0" />
          </radialGradient>

          {/* Cyan wave ribbon gradients */}
          <linearGradient id="cyanRibbon1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="cyanRibbon2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#00dcff" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>

          {/* Purple wave ribbon gradients */}
          <linearGradient id="purpleRibbon1" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.60" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="purpleRibbon2" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          {/* Neon filters */}
          <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="neonGlowPurple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Ambient Background Backlights */}
        <rect x="0" y="0" width="1600" height="1000" fill="#060d1a" />
        <rect x="0" y="0" width="800" height="1000" fill="url(#leftGlow)" />
        <rect x="800" y="0" width="800" height="1000" fill="url(#rightGlow)" />

        {/* 2. LEFT CYAN WAVE MESH RIBBON (Undulating Sine Curves from screenshot) */}
        <g filter="url(#neonGlowCyan)" opacity="0.85">
          {/* Main glowing wave ribbon 1 */}
          <path
            d="M -100 200 C 120 280, 80 520, -50 680 C -150 800, 100 850, 220 750 C 320 660, 260 480, 140 380 C 40 300, -20 250, -100 200 Z"
            fill="url(#cyanRibbon1)"
          />
          {/* Woven inner mesh lines */}
          <path
            d="M -80 180 C 160 260, 120 540, -20 700 C 60 820, 240 760, 280 620 C 320 480, 180 320, -80 180 Z"
            stroke="#00f0ff"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            fill="none"
          />
          <path
            d="M -60 220 C 180 300, 140 560, 10 720 C 90 840, 260 780, 300 640"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            fill="none"
          />
          <path
            d="M -40 260 C 200 340, 160 580, 40 740 C 120 860, 280 800, 320 660"
            stroke="#00f0ff"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="4 4"
            fill="none"
          />
          <path
            d="M -20 300 C 220 380, 180 600, 70 760 C 150 880, 300 820, 340 680"
            stroke="#7dd3fc"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            fill="none"
          />

          {/* Cross wave mesh lattice */}
          <path
            d="M 50 200 C 80 400, 150 600, 260 800"
            stroke="#00f0ff"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            fill="none"
          />
          <path
            d="M 100 220 C 130 420, 200 620, 290 820"
            stroke="#00f0ff"
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
          <path
            d="M 150 240 C 180 440, 240 640, 320 840"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
            fill="none"
          />
          <path
            d="M 0 350 C 120 400, 200 500, 280 600"
            stroke="#00f0ff"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            fill="none"
          />
          <path
            d="M -20 420 C 100 470, 180 570, 250 670"
            stroke="#00f0ff"
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
        </g>

        {/* 3. RIGHT PURPLE WAVE MESH RIBBON */}
        <g filter="url(#neonGlowPurple)" opacity="0.85">
          <path
            d="M 1700 300 C 1480 380, 1520 620, 1650 780 C 1750 900, 1500 950, 1380 850 C 1280 760, 1340 580, 1460 480 C 1560 400, 1620 350, 1700 300 Z"
            fill="url(#purpleRibbon1)"
          />
          <path
            d="M 1680 280 C 1440 360, 1480 640, 1620 800 C 1540 920, 1360 860, 1320 720 C 1280 580, 1420 420, 1680 280 Z"
            stroke="#a855f7"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            fill="none"
          />
          <path
            d="M 1660 320 C 1420 400, 1460 660, 1590 820 C 1510 940, 1340 880, 1300 740"
            stroke="#c084fc"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            fill="none"
          />
          <path
            d="M 1640 360 C 1400 440, 1440 680, 1560 840 C 1480 960, 1320 900, 1280 760"
            stroke="#818cf8"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="4 4"
            fill="none"
          />

          {/* Cross wave mesh lattice on right */}
          <path
            d="M 1550 300 C 1520 500, 1450 700, 1340 900"
            stroke="#a855f7"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            fill="none"
          />
          <path
            d="M 1500 320 C 1470 520, 1400 720, 1310 920"
            stroke="#c084fc"
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
