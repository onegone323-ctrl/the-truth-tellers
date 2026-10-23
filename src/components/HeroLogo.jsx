import React from "react";

// The homepage hero logo: five moon phases above the wordmark, mirroring the
// uploaded truth4clarity-logo.png. No image file is rendered here — flat SVG
// shapes, lit one at a time (red, white, red, white, red) by a pure-CSS loop
// defined in src/index.css.
export default function HeroLogo() {
  return (
    <div className="hero-moon-logo" role="img" aria-label="Truth 4 Clarity">
      <div className="hero-moon-row" aria-hidden="true">
        {/* 1 — dark red crescent */}
        <svg viewBox="0 0 100 100" className="hero-moon hero-moon1">
          <defs>
            <mask id="heroMoon1Mask">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="76" cy="50" r="44" fill="#000" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#8b1a2b" mask="url(#heroMoon1Mask)" />
        </svg>
        {/* 2 — red crescent */}
        <svg viewBox="0 0 100 100" className="hero-moon hero-moon2">
          <defs>
            <mask id="heroMoon2Mask">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="76" cy="50" r="44" fill="#000" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#c0392b" mask="url(#heroMoon2Mask)" />
        </svg>
        {/* 3 — gold half moon (flat edge left) */}
        <svg viewBox="0 0 100 100" className="hero-moon hero-moon3">
          <defs>
            <mask id="heroMoon3Mask">
              <rect width="100" height="100" fill="#000" />
              <rect x="50" width="50" height="100" fill="#fff" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#d4af37" mask="url(#heroMoon3Mask)" />
        </svg>
        {/* 4 — pale gold gibbous with a dark sliver along its left edge */}
        <svg viewBox="0 0 100 100" className="hero-moon hero-moon4">
          <circle cx="50" cy="50" r="48" fill="#f2dd9b" />
          <path d="M50 2 A48 48 0 0 0 50 98 A62 62 0 0 1 50 2 Z" fill="#0a0a0a" />
        </svg>
        {/* 5 — white full moon */}
        <svg viewBox="0 0 100 100" className="hero-moon hero-moon5">
          <circle cx="50" cy="50" r="48" fill="#ffffff" />
        </svg>
      </div>
      <div className="hero-moon-word" aria-hidden="true">
        TRUTH <span className="hero-moon-four">4</span> CLARITY
      </div>
    </div>
  );
}