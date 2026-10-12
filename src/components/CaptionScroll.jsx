import React, { useEffect, useRef } from "react";

// The Oracle's words roll along the bottom while she speaks — a scroll that
// follows her voice, revealed word by word.
export default function CaptionScroll({ text, progress, active }) {
  const boxRef = useRef(null);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const visibleCount = Math.floor(progress * words.length);
  const visible = words.slice(0, visibleCount).join(" ");

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [visibleCount, active]);

  if (!active || !text) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div
        ref={boxRef}
        className="max-w-2xl mx-auto max-h-28 overflow-y-auto rounded-lg px-4 py-3 text-sm leading-relaxed font-body"
        style={{
          background: "var(--surface-glass-strong)",
          border: "1px solid color-mix(in srgb, var(--gold-leaf) 45%, transparent)",
          boxShadow: "0 0 28px color-mix(in srgb, var(--gold-leaf) 18%, transparent), inset 0 0 18px color-mix(in srgb, var(--gold-leaf) 5%, transparent)",
          scrollbarWidth: "none",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ color: "var(--ivory)" }}>{visible}</span>
        <span className="animate-pulse text-gold-leaf"> ▍</span>
      </div>
    </div>
  );
}