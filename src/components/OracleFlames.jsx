import React, { useEffect, useRef } from "react";
import { animateOracleFlames } from "@/lib/oracleFlames";

export default function OracleFlames({ active, radius }) {
  const canvasRef = useRef(null);
  const liveRef = useRef({ active, radius });
  liveRef.current = { active, radius };
  useEffect(() => animateOracleFlames(canvasRef.current, liveRef), []);
  return <canvas ref={canvasRef} data-oracle-flames aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}