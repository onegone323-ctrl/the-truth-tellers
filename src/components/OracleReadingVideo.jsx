import React, { useRef } from "react";
import { ORACLE_ORB_VIDEO } from "@/lib/oracleFireAssets";
import useOrbPalette from "@/components/oracle/useOrbPalette";
import useOrbPlayback from "@/components/oracle/useOrbPlayback";

// The reading is live through every one of these phases: the orb loops
// through all of them, seamlessly. No phase machine, no clip transitions.
const READING_PHASES = ["awakening", "thinking", "igniting", "speaking"];

export default function OracleReadingVideo({ phase = "dormant" }) {
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  const readingActive = READING_PHASES.includes(phase);

  useOrbPlayback(videoRef, readingActive);

  // The palette is independent of audio, including during silent pauses.
  useOrbPalette(videoRef, glowRef, readingActive);

  return (
    <div className="absolute inset-0 bg-reading-void" data-oracle-video-stage data-orb-active={readingActive}>
      <video
        ref={videoRef}
        src={ORACLE_ORB_VIDEO}
        loop
        muted
        playsInline
        preload="auto"
        aria-label="The Oracle's orb"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ willChange: "filter, transform" }}
      />
      {/* A soft gold bloom follows the same gentle, timed breath. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ background: "radial-gradient(circle at 50% 55%, rgba(212,175,55,.28), transparent 62%)" }}
      />
    </div>
  );
}