import React from "react";
import { Image } from "@/components/ui/image";

// The ADPOV Media and Entertainment mark ("We Make It Make Sense"), shown in
// a dark chip so the white-on-dark logo stays legible in both light and dark
// themes. Used in the app header and the public page footers.
const LOGO_URL = "https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/297c1ce17_adpovtvlogo.jpg";

export default function CompanyMark({ height = 32, className = "" }) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        padding: "6px 11px",
        borderRadius: 6,
        border: "1px solid rgba(212,175,55,0.35)",
        background: "rgba(5,5,5,0.9)",
        boxShadow: "0 0 12px rgba(212,175,55,0.1)",
        lineHeight: 0,
      }}
      title="ADPOV Media and Entertainment — We Make It Make Sense"
    >
      <Image
      src={LOGO_URL}
      alt="ADPOV Media and Entertainment"
      fittingType="fit"
      style={{ height, width: height * 2, display: "block" }}
      />
    </span>
  );
}