import React from "react";
import useViewportWidth from "@/hooks/useViewportWidth";
import OracleSphere from "@/components/OracleSphere";

// Share the reading globe's state-driven fire without changing the hero size.

export default function OrbStage({ state = "idle", size = 215, height = 370 }) {
  // On phones the stage shrinks with the screen instead of overflowing it.
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.75)) : size;
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <OracleSphere state={state} size={effective / 1.55} />
    </div>
  );
}