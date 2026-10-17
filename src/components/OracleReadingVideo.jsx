import React from "react";
import { ORACLE_ORB_VIDEO } from "@/lib/oracleFireAssets";

// The reading visual: the crystal-ball color-loop video. It simply plays on
// repeat for the whole reading — the colors cycle inside the footage itself.
export default function OracleReadingVideo({ phase }) {
  return (
    <div
      className="absolute inset-0 bg-reading-void"
      data-oracle-video-stage
      data-orb-active="true"
    >
      <video
        src={ORACLE_ORB_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
    </div>
  );
}