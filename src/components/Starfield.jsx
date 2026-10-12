import React, { useMemo } from "react";
import useLiteMotion from "@/hooks/useLiteMotion";

// Animated starfield + drifting gold particles + nebula glow.
// Stars are painted as CSS radial-gradient layers instead of one span per
// star (a fraction of the DOM nodes — much cheaper in Android WebView).
// Two layers hold disjoint stars and twinkle out of phase, so the sky still
// shimmers. Rising gold particles keep their spans; lite mode: fewer stars,
// no particle layer.
export default function Starfield() {
  const lite = useLiteMotion();
  const starLayers = useMemo(() => {
    const count = lite ? 18 : 90;
    const stars = Array.from({ length: count }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 4 + 2,
      bright: Math.random() < 0.22,
      gold: Math.random() < 0.25,
    }));
    const paint = (s) => {
      const r = s.size / 2;
      const core = s.gold ? "var(--gold-leaf)" : s.bright ? "#ffffff" : "var(--star-color)";
      const glow = s.gold
        ? "rgba(245,215,122,0.95)"
        : s.bright
        ? "rgba(180,220,255,0.5)"
        : "rgba(255,255,255,0.85)";
      const spread = s.bright ? 10 : 6;
      return `radial-gradient(circle at ${s.left.toFixed(2)}% ${s.top.toFixed(2)}%, ${core} 0 ${r.toFixed(1)}px, ${glow} ${(r + 1.5).toFixed(1)}px ${(r + spread).toFixed(1)}px, transparent ${(r + spread + 2).toFixed(1)}px)`;
    };
    return [
      stars.filter((_, i) => i % 2 === 0).map(paint).join(", "),
      stars.filter((_, i) => i % 2 === 1).map(paint).join(", "),
    ];
  }, [lite]);

  const particles = useMemo(
    () =>
      Array.from({ length: lite ? 0 : 14 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: Math.random() * 10 + 12,
        size: Math.random() * 3 + 1.5,
      })),
    [lite]
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* nebula glows */}
      <div className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-40"
        style={{ background: "radial-gradient(circle, rgba(120,10,20,0.5), transparent 70%)" }} />
      <div className="absolute -bottom-1/3 -right-1/4 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30"
        style={{ background: "radial-gradient(circle, rgba(150,100,20,0.4), transparent 70%)" }} />

      {/* stars: two gradient layers, twinkling out of phase */}
      <div className="absolute inset-0" style={{ backgroundImage: starLayers[0], animation: "twinkleLayer 5s ease-in-out infinite alternate" }} />
      <div className="absolute inset-0" style={{ backgroundImage: starLayers[1], animation: "twinkleLayer 7s ease-in-out 1.2s infinite alternate" }} />

      {/* rising gold particles */}
      {particles.map((p, i) => (
        <span key={`p${i}`} className="absolute bottom-0 rounded-full"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            background: "var(--gold-leaf)",
            boxShadow: "0 0 8px 2px rgba(212,175,55,0.5)",
            animation: `rise ${p.duration}s linear ${p.delay}s infinite`,
          }} />
      ))}

      <style>{`
        @keyframes twinkleLayer { 0% { opacity: 0.55; } 100% { opacity: 1; } }
        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-105vh) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}