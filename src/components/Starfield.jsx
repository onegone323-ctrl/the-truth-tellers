import React, { useMemo } from "react";

// Animated starfield + drifting gold particles + nebula glow.
export default function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 4 + 3,
        gold: Math.random() < 0.25,
      })),
    []
  );
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: Math.random() * 10 + 12,
        size: Math.random() * 3 + 1.5,
      })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* nebula glows */}
      <div className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-40"
        style={{ background: "radial-gradient(circle, rgba(120,10,20,0.5), transparent 70%)" }} />
      <div className="absolute -bottom-1/3 -right-1/4 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30"
        style={{ background: "radial-gradient(circle, rgba(150,100,20,0.4), transparent 70%)" }} />

      {/* stars */}
      {stars.map((s, i) => (
        <span key={i} className="absolute rounded-full"
          style={{
            top: `${s.top}%`, left: `${s.left}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            background: s.gold ? "#f5d77a" : "#fff",
            boxShadow: s.gold ? "0 0 6px 1px rgba(245,215,122,0.8)" : "0 0 4px 1px rgba(255,255,255,0.7)",
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
          }} />
      ))}

      {/* rising gold particles */}
      {particles.map((p, i) => (
        <span key={`p${i}`} className="absolute bottom-0 rounded-full"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            background: "rgba(212,175,55,0.7)",
            boxShadow: "0 0 8px 2px rgba(212,175,55,0.5)",
            animation: `rise ${p.duration}s linear ${p.delay}s infinite`,
          }} />
      ))}

      <style>{`
        @keyframes twinkle { 0% { opacity: 0.15; } 100% { opacity: 1; } }
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