import React from "react";
import { ORACLE_ORB_IMAGE } from "@/lib/oracleFireAssets";

// The reading is live through every one of these phases; everything else is
// the calm idle state. Toggled purely by a class flip — no JS timing, no
// audio hooks, no video element.
const READING_PHASES = ["awakening", "thinking", "igniting", "speaking"];

export default function OracleReadingVideo({ phase = "dormant" }) {
  const readingActive = READING_PHASES.includes(phase);

  return (
    <div
      className="absolute inset-0 bg-reading-void"
      data-oracle-video-stage
      data-orb-active={readingActive}
    >
      {/* Soft fire-colored aura behind the ball; screen-blended, pure CSS. */}
      <div className="orb-aura" aria-hidden="true" />
      {/* Breathing layer: brightness + gentle scale, slow keyframes only. */}
      <div className="orb-breathe">
        <img
          src={ORACLE_ORB_IMAGE}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="orb-img pointer-events-none select-none"
        />
      </div>
    </div>
  );
}