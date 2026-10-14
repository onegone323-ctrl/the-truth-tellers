import React from "react";
import useViewportWidth from "@/hooks/useViewportWidth";

// The Oracle's globe — his own asset, big and slowly spinning in the hero.
// The photo sits on black, so a circular mask trims the square edges and
// screen-blending dissolves the rest into the nebula behind it.
const GLOBE_URL = "https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/891c987d1_globe.jpg";
const SPIN_KEYFRAMES = "@keyframes globeSpin { to { transform: rotate(360deg); } }";

export default function OrbStage({ state = "idle", size = 215, height = 370 }) {
  // On phones the stage shrinks with the screen instead of overflowing it.
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.75)) : size;
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <style>{SPIN_KEYFRAMES}</style>
      <img
        src={GLOBE_URL}
        alt="The Oracle's globe"
        style={{
          width: effective,
          height: effective,
          objectFit: "cover",
          borderRadius: "50%",
          mixBlendMode: "screen",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 45%, transparent 53%)",
          maskImage: "radial-gradient(circle at 50% 50%, black 45%, transparent 53%)",
          animation: "globeSpin 24s linear infinite",
        }}
      />
    </div>
  );
}