import React from "react";
import OracleSphere from "@/components/OracleSphere";
import useViewportWidth from "@/hooks/useViewportWidth";

// The orb suspended inside counter-rotating gold gyroscope rings.
export default function OrbStage({ state = "idle", size = 215, height = 370 }) {
  // On phones the stage shrinks with the screen instead of overflowing it.
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.6)) : size;
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <OracleSphere state={state} size={effective} />
    </div>
  );
}