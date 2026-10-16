import React from "react";

// The ADPOV Media & Ent company mark. Shown in the app header
// and the public page footers.
const LOGO_URL = "https://base44.app/api/apps/6a97b3175d08a6bc8bc635af/files/mp/public/6a97b3175d08a6bc8bc635af/f58dd7dc4_887c082c6_ADPOVMEDIAENTLOGO.png";

// The logo file is a wide ~10:7 image on black.
export default function CompanyMark({ height = 32, className = "", compact = false }) {
  const width = Math.round((height * 10) / 7);
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        padding: compact ? 2 : 3,
        borderRadius: 4,
        border: "1px solid color-mix(in srgb, var(--gold-leaf) 35%, transparent)",
        background: "rgba(5,5,5,0.9)",
        boxShadow: "0 0 12px color-mix(in srgb, var(--gold-leaf) 10%, transparent)",
        lineHeight: 0,
      }}
      title="ADPOV Media & Ent"
    >
      <img
        src={LOGO_URL}
        alt="ADPOV Media & Ent"
        style={{ height, width, display: "block", objectFit: "cover", borderRadius: 3 }}
      />
    </span>
  );
}