import React from "react";
import OracleOrb from "@/components/OracleOrb";
import useViewportWidth from "@/hooks/useViewportWidth";

// The orb suspended inside counter-rotating gold gyroscope rings.
export default function OrbStage({ state = "idle", size = 215, height = 370 }) {
  // On phones the stage shrinks with the screen instead of overflowing it.
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.6)) : size;
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: effective * 1.44,
          height: effective * 1.44,
          border: "1px solid color-mix(in srgb, var(--gold-leaf) 80%, transparent)",
          boxShadow: "0 0 20px color-mix(in srgb, var(--gold-leaf) 35%, transparent), inset 0 0 20px rgba(123,44,255,0.2)",
          transform: "rotate(26deg) skewY(8deg)",
          animation: "gyro 12s linear infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: effective * 1.63,
          height: effective * 0.79,
          border: "1px solid color-mix(in srgb, var(--gold-leaf) 80%, transparent)",
          boxShadow: "0 0 20px color-mix(in srgb, var(--gold-leaf) 35%, transparent), inset 0 0 20px rgba(123,44,255,0.2)",
          transform: "rotate(-28deg)",
          animation: "gyroReverse 10s linear infinite",
        }}
      />
      <OracleOrb state={state} size={effective} />
    </div>
  );
}