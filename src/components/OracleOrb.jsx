import React from "react";
import useViewportWidth from "@/hooks/useViewportWidth";

// The OracleOrb — an obsidian neon sphere with a holographic cyan sheen.
// States: idle, listening, thinking, speaking. Her colors are never fixed —
// they drift and cycle through the spectrum on their own, just because.
const CORE = {
  idle: "radial-gradient(circle at 35% 28%, #f5e6b8 0 2%, rgba(139,26,43,.9) 14%, rgba(48,10,18,.95) 48%, #020206 76%)",
  listening: "radial-gradient(circle at 35% 28%, #f5e6b8 0 2%, rgba(212,175,55,.85) 14%, rgba(58,38,8,.95) 48%, #020206 76%)",
  thinking: "radial-gradient(circle at 35% 28%, #fff4cf 0 2%, color-mix(in srgb, var(--gold-leaf) 90%, transparent) 14%, rgba(58,36,8,.95) 48%, #020206 76%)",
  speaking: "radial-gradient(circle at 35% 28%, #ffe9ec 0 2%, rgba(212,55,90,.9) 14%, rgba(70,10,30,.95) 48%, #020206 76%)",
};

const AURA = {
  idle: "0 0 25px #8b1a2b, 0 0 80px rgba(139,26,43,.65), inset -25px -28px 45px #020205",
  listening: "0 0 25px #d4af37, 0 0 80px rgba(212,175,55,.6), inset -25px -28px 45px #020205",
  thinking: "0 0 25px var(--gold-leaf), 0 0 90px color-mix(in srgb, var(--gold-leaf) 60%, transparent), inset -25px -28px 45px #020205",
  speaking: "0 0 30px #ff2d6a, 0 0 110px rgba(255,45,106,.6), inset -25px -28px 45px #020205",
};

export default function OracleOrb({ state = "idle", size = 215 }) {
  const breatheDur = state === "speaking" ? "1.6s" : state === "thinking" ? "2.4s" : "4s";
  // She changes hue all by herself — faster while she speaks.
  const hueDur = state === "speaking" ? "9s" : "16s";
  // On phones the orb shrinks with the screen instead of overflowing it.
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.6)) : size;

  return (
    <div className="relative flex items-center justify-center" style={{ width: effective, height: effective }}>
      <div
        className="relative rounded-full"
        style={{
          width: effective,
          height: effective,
          background: CORE[state] || CORE.idle,
          boxShadow: AURA[state] || AURA.idle,
          animation: `breathe ${breatheDur} ease-in-out infinite, hueDrift ${hueDur} linear infinite alternate`,
          transition: "background .7s, box-shadow .7s",
        }}
      >
        {/* holographic sheen ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: effective * 0.056,
            border: "1px solid var(--gold-leaf)",
            background: "linear-gradient(130deg, transparent 35%, rgba(212,175,55,.3), transparent 62%)",
            animation: "sheen 4s ease-in-out infinite",
          }}
        />
        {/* gold + cyan inner caustics */}
        <div
          className="absolute rounded-full"
          style={{
            inset: effective * 0.14,
            background:
              "radial-gradient(circle at 54% 42%, color-mix(in srgb, var(--gold-leaf) 70%, transparent), transparent 3%, transparent 27%, rgba(212,175,55,.22) 28%, transparent 65%)",
            filter: "blur(6px)",
          }}
        />
      </div>
    </div>
  );
}