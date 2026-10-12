import React from "react";
import { ArrowLeft } from "lucide-react";
import useGoBack from "@/hooks/useGoBack";

// Sticky back-button header for pages that render both publicly and inside
// the authenticated app — mirrors the mobile back header Layout renders.
export default function DetailBackHeader({ title, fallback = "/" }) {
  const goBack = useGoBack(fallback);
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-2 px-4 sm:px-[54px]"
      style={{
        minHeight: 82,
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        borderBottom: "1px solid var(--neo-border)",
        background: "var(--surface-glass)",
        backdropFilter: "blur(18px)",
      }}
    >
      <button onClick={goBack} className="neo-navlink" title="Go back" aria-label="Go back">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <span
        style={{
          color: "var(--gold-leaf)",
          fontSize: 15,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {title}
      </span>
    </header>
  );
}