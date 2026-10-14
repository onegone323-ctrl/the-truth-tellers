import React from "react";

// The Truth 4 Clarity mark — the Oracle's fire globe. Shown in the app header
// and the public page footers.
const LOGO_URL = "https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/4eec5cc5e_globe1.jpg";

export default function CompanyMark({ height = 32, className = "", compact = false }) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        padding: compact ? 2 : 3,
        borderRadius: "50%",
        border: "1px solid color-mix(in srgb, var(--gold-leaf) 35%, transparent)",
        background: "rgba(5,5,5,0.9)",
        boxShadow: "0 0 12px color-mix(in srgb, var(--gold-leaf) 10%, transparent)",
        lineHeight: 0,
      }}
      title="Truth 4 Clarity"
    >
      <img
        src={LOGO_URL}
        alt="Truth 4 Clarity"
        style={{ height, width: height, display: "block", objectFit: "cover", borderRadius: "50%" }}
      />
    </span>
  );
}