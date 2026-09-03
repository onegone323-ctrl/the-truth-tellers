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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div
        ref={boxRef}
        className="max-w-2xl mx-auto max-h-28 overflow-y-auto rounded-lg px-4 py-3 text-sm leading-relaxed font-body"
        style={{
          background: "rgba(0,0,0,0.82)",
          border: "1px solid rgba(212,175,55,0.45)",
          boxShadow: "0 0 28px rgba(212,175,55,0.18), inset 0 0 18px rgba(212,175,55,0.05)",
          scrollbarWidth: "none",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ color: "#e8dcae" }}>{visible}</span>
        <span className="animate-pulse text-gold-leaf"> ▍</span>
      </div>
    </div>
  );
}