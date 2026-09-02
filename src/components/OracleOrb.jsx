import React from "react";

// The OracleOrb — a crystal-ball glass sphere. States: idle, listening, thinking, speaking.
export default function OracleOrb({ state = "idle", size = 220 }) {
  const spinDur = state === "thinking" ? "2s" : state === "speaking" ? "4s" : "14s";
  const innerGlow =
    state === "speaking"
      ? "radial-gradient(circle at 40% 40%, rgba(220,60,50,0.85), rgba(150,40,30,0.4) 45%, transparent 70%)"
      : state === "thinking"
      ? "radial-gradient(circle at 45% 45%, rgba(212,175,55,0.7), rgba(120,90,20,0.3) 50%, transparent 72%)"
      : state === "listening"
      ? "radial-gradient(circle at 50% 50%, rgba(180,40,50,0.5), rgba(80,20,30,0.3) 55%, transparent 75%)"
      : "radial-gradient(circle at 45% 40%, rgba(60,60,90,0.45), rgba(20,20,40,0.3) 55%, transparent 75%)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* outer aura */}
      <div className="absolute inset-0 rounded-full blur-2xl transition-all duration-700"
        style={{
          background: state === "speaking" ? "rgba(200,40,40,0.35)" : state === "listening" ? "rgba(180,40,50,0.25)" : "rgba(212,175,55,0.18)",
          transform: state === "speaking" ? "scale(1.25)" : "scale(1.05)",
          opacity: state === "idle" ? 0.5 : 0.9,
        }} />

      {/* glass sphere */}
      <div className="relative rounded-full overflow-hidden"
        style={{
          width: size, height: size,
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25), rgba(10,10,18,0.6) 40%, rgba(0,0,0,0.85) 100%)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.7), inset 12px 12px 30px rgba(255,255,255,0.12), 0 8px 40px rgba(0,0,0,0.6)",
          border: "1px solid rgba(212,175,55,0.35)",
        }}>
        {/* spinning inner glow + stars */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: innerGlow, animation: `spin ${spinDur} linear infinite`, transition: "background 0.7s" }} />
        <div className="absolute inset-0 rounded-full"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 30% 60%, #fff, transparent), radial-gradient(1px 1px at 70% 35%, #f5d77a, transparent), radial-gradient(1px 1px at 50% 80%, #fff, transparent), radial-gradient(1px 1px at 20% 25%, #f5d77a, transparent), radial-gradient(1px 1px at 85% 70%, #fff, transparent)",
            animation: `spin ${spinDur} linear infinite reverse`,
            opacity: 0.8,
          }} />

        {/* glass highlight */}
        <div className="absolute top-[12%] left-[18%] w-[35%] h-[30%] rounded-full blur-md"
          style={{ background: "rgba(255,255,255,0.35)" }} />
        <div className="absolute bottom-[15%] right-[20%] w-[12%] h-[10%] rounded-full blur-sm"
          style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* speaking ripple */}
        {state === "speaking" && (
          <div className="absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 0 30px rgba(220,60,50,0.6)", animation: "pulseGlow 1.2s ease-in-out infinite" }} />
        )}
        {state === "listening" && (
          <div className="absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 0 25px rgba(180,40,50,0.5)", animation: "pulseGlow 1.6s ease-in-out infinite" }} />
        )}
      </div>

      {/* gold ring */}
      <div className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.02, height: size * 1.02,
          border: "1px solid rgba(212,175,55,0.4)",
          boxShadow: "0 0 20px rgba(212,175,55,0.15)",
        }} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}