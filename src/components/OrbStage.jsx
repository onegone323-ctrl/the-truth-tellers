import React from "react";
import OracleOrb from "@/components/OracleOrb";

// The orb suspended inside counter-rotating gold gyroscope rings.
export default function OrbStage({ state = "idle", size = 215, height = 370 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.44,
          height: size * 1.44,
          border: "1px solid rgba(212,175,55,0.8)",
          boxShadow: "0 0 20px rgba(212,175,55,0.35), inset 0 0 20px rgba(123,44,255,0.2)",
          transform: "rotate(26deg) skewY(8deg)",
          animation: "gyro 12s linear infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.63,
          height: size * 0.79,
          border: "1px solid rgba(212,175,55,0.8)",
          boxShadow: "0 0 20px rgba(212,175,55,0.35), inset 0 0 20px rgba(123,44,255,0.2)",
          transform: "rotate(-28deg)",
          animation: "gyroReverse 10s linear infinite",
        }}
      />
      <OracleOrb state={state} size={size} />
    </div>
  );
}