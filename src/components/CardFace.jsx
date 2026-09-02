import React, { useState, useEffect } from "react";

// Luxury tarot card — deals itself onto the table, then auto-flips to reveal. No tapping.
export default function CardFace({ card, deck, revealed = false, index = 0, clarifiers = [], dealDelay = 0 }) {
  const [dealt, setDealt] = useState(revealed);
  const [flipped, setFlipped] = useState(revealed);
  const show = flipped || revealed;

  useEffect(() => {
    if (revealed) return;
    const t1 = setTimeout(() => setDealt(true), dealDelay);
    const t2 = setTimeout(() => setFlipped(true), dealDelay + 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [dealDelay, revealed]);

  const isMajor = card?.card?.arcana === "Major" || card?.arcana === "Major";
  const accent = deck?.accent || "#d4af37";
  const suitGlyph = isMajor ? "✶" : card?.card?.suit === "Cups" ? "♥" : card?.card?.suit === "Wands" ? "♣" : card?.card?.suit === "Swords" ? "♠" : "♦";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ perspective: "1000px" }}>
        {/* deal-in wrapper: card slides down from above and settles */}
        <div
          style={{
            width: 120, height: 200,
            transform: dealt ? "translateY(0) scale(1) rotate(0deg)" : "translateY(-280px) scale(0.78) rotate(-8deg)",
            opacity: dealt ? 1 : 0,
            transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease",
          }}
        >
          <div
            className="relative transition-transform"
            style={{
              width: 120, height: 200,
              transformStyle: "preserve-3d",
              transform: show ? "rotateY(180deg)" : "rotateY(0deg)",
              transitionDuration: "1100ms",
            }}
          >
            {/* Back — velvet with gold sigil */}
            <div className="absolute inset-0 rounded-lg flex items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                background: "linear-gradient(145deg, #1a0306, #3a0810 50%, #1a0306)",
                border: `1.5px solid ${accent}`,
                boxShadow: `0 10px 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5), 0 0 12px ${accent}33`,
              }}>
              <div className="absolute inset-1.5 rounded-md" style={{ border: `1px solid ${accent}66` }} />
              <span style={{ fontSize: 44, color: accent, textShadow: `0 0 14px ${accent}99` }} className="opacity-80">
                {deck?.backGlyph || "✦"}
              </span>
              <div className="absolute inset-0 rounded-lg opacity-30"
                style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }} />
            </div>

            {/* Face */}
            <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-between p-2 text-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(160deg, #0a0a0f, #14100c 60%, #0a0a0f)",
                border: `1.5px solid ${accent}`,
                boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 14px ${accent}44, inset 0 0 16px rgba(0,0,0,0.6)`,
              }}>
              {show && (
                <div className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ background: "linear-gradient(115deg, transparent 30%, rgba(245,215,122,0.25) 50%, transparent 70%)",
                    animation: "sweep 1.1s ease-out" }} />
              )}
              <div className="absolute inset-1 rounded-md" style={{ border: `1px solid ${accent}55` }} />
              <div className="mt-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: accent, opacity: 0.85 }}>
                {card?.position || `Card ${index + 1}`}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span style={{ fontSize: 30, color: accent, textShadow: `0 0 12px ${accent}aa` }}>{suitGlyph}</span>
              </div>
              <div className="mb-2 px-1">
                <div className="text-[10px] font-serif leading-tight" style={{ color: "#f0e6d2" }}>
                  {card?.name}{card?.reversed ? " (R)" : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clarifier cards — fade in once the main card has flipped */}
      {clarifiers?.length > 0 && (
        <div className="flex gap-1.5 items-start transition-opacity duration-500"
          style={{ opacity: show ? 1 : 0 }}>
          <div className="w-px h-3 mx-auto" style={{ background: `linear-gradient(${accent}, transparent)` }} />
          {clarifiers.map((c, i) => (
            <div key={i} className="relative rounded" style={{ width: 38, height: 62 }}>
              <div className="absolute inset-0 rounded flex flex-col items-center justify-center p-1 text-center"
                style={{
                  background: "linear-gradient(160deg, #0a0a0f, #14100c)",
                  border: `1px solid ${accent}aa`,
                  boxShadow: `0 0 8px ${accent}44`,
                }}>
                <span style={{ fontSize: 14, color: accent }}>{c.card?.arcana === "Major" ? "✶" : "•"}</span>
                <div className="text-[6px] font-serif leading-tight mt-0.5" style={{ color: "#d4c8a8" }}>
                  {c.name}{c.reversed ? " (R)" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
    </div>
  );
}