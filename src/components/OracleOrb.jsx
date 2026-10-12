import React from "react";

// The OracleOrb — an obsidian neon sphere with a holographic cyan sheen.
// States: idle, listening, thinking, speaking.
const CORE = {
  idle: "radial-gradient(circle at 35% 28%, #e9e0ff 0 2%, rgba(123,44,255,.9) 14%, rgba(37,11,82,.95) 48%, #020206 76%)",
  listening: "radial-gradient(circle at 35% 28%, #d9fbff 0 2%, rgba(0,229,255,.85) 14%, rgba(8,48,66,.95) 48%, #020206 76%)",
  thinking: "radial-gradient(circle at 35% 28%, #fff4cf 0 2%, rgba(212,175,55,.9) 14%, rgba(58,36,8,.95) 48%, #020206 76%)",
  speaking: "radial-gradient(circle at 35% 28%, #ffe9ec 0 2%, rgba(212,55,90,.9) 14%, rgba(70,10,30,.95) 48%, #020206 76%)",
};

const AURA = {
  idle: "0 0 25px #7b2cff, 0 0 80px rgba(123,44,255,.65), inset -25px -28px 45px #020205",
  listening: "0 0 25px #00e5ff, 0 0 80px rgba(0,229,255,.6), inset -25px -28px 45px #020205",
  thinking: "0 0 25px #d4af37, 0 0 90px rgba(212,175,55,.6), inset -25px -28px 45px #020205",
  speaking: "0 0 30px #ff2d6a, 0 0 110px rgba(255,45,106,.6), inset -25px -28px 45px #020205",
};

// The orb takes the reading's mood as its color: urgent red, calm green,
// and everything in between.
const MOOD_COLORS = {
  urgent: "#ff2d4d",
  intense: "#ff2d9a",
  warning: "#ffa53c",
  reflective: "#7b2cff",
  hopeful: "#e8c04a",
  calm: "#2fd98b",
};

const shade = (hex, f) => {
  // f > 0 lightens toward white, f < 0 darkens toward black
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  const c = (v) => Math.round(v + (t - v) * p);
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
const moodCore = (hex) =>
  `radial-gradient(circle at 35% 28%, ${shade(hex, 0.85)} 0 2%, ${rgba(hex, 0.9)} 14%, ${shade(hex, -0.75)} 48%, #020206 76%)`;
const moodAura = (hex) =>
  `0 0 30px ${hex}, 0 0 110px ${rgba(hex, 0.6)}, inset -25px -28px 45px #020205`;

export default function OracleOrb({ state = "idle", size = 215, mood = "" }) {
  const breatheDur = state === "speaking" ? "1.6s" : state === "thinking" ? "2.4s" : "4s";
  const moodHex = MOOD_COLORS[mood] || null;
  const core = moodHex ? moodCore(moodHex) : (CORE[state] || CORE.idle);
  const aura = moodHex ? moodAura(moodHex) : (AURA[state] || AURA.idle);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          background: core,
          boxShadow: aura,
          animation: `breathe ${breatheDur} ease-in-out infinite`,
          transition: "background .7s, box-shadow .7s",
        }}
      >
        {/* holographic sheen ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: size * 0.056,
            border: "1px solid var(--gold-leaf)",
            background: "linear-gradient(130deg, transparent 35%, rgba(0,229,255,.3), transparent 62%)",
            animation: "sheen 4s ease-in-out infinite",
          }}
        />
        {/* gold + cyan inner caustics */}
        <div
          className="absolute rounded-full"
          style={{
            inset: size * 0.14,
            background:
              "radial-gradient(circle at 54% 42%, rgba(212,175,55,.7), transparent 3%, transparent 27%, rgba(0,229,255,.22) 28%, transparent 65%)",
            filter: "blur(6px)",
          }}
        />
      </div>
    </div>
  );
}