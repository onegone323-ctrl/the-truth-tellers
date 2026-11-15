import React from "react";

// The ADPOV Media & Ent company mark, drawn in vector type rather than loaded
// from a file: the previously hosted logo image failed on the image host and
// rendered as a broken box in every footer. Proportions are fixed, so the mark
// is crisp at any size and can never crop, stretch or fail to load.
export default function CompanyMark({ height = 32, className = "", compact = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ lineHeight: 0, maxWidth: "100%" }}
      title="ADPOV Media & Ent"
    >
      <svg
        role="img"
        aria-label="ADPOV Media & Ent"
        viewBox="0 0 268 64"
        style={{ height, width: "auto", maxWidth: "100%", display: "block" }}
      >
        <defs>
          <linearGradient id="adpovMarkGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8eec8" />
            <stop offset="42%" stopColor="#e2c163" />
            <stop offset="72%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#a87718" />
          </linearGradient>
        </defs>

        {/* Company name — the gold wordmark */}
        <text
          x="134"
          y="32"
          textAnchor="middle"
          fill="url(#adpovMarkGold)"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: compact ? 3 : 4,
          }}
        >
          ADPOV
        </text>

        {/* Hairline between the name and the descriptor */}
        <line x1="66" y1="41" x2="202" y2="41" stroke="#d4af37" strokeWidth="0.9" opacity="0.55" />

        {/* Descriptor */}
        <text
          x="134"
          y="56"
          textAnchor="middle"
          fill="#ede4d4"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: 4.2,
          }}
        >
          MEDIA &amp; ENT
        </text>
      </svg>
    </span>
  );
}