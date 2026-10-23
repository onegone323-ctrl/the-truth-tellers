import React from "react";
import { ORACLE_ORB_VIDEO } from "@/lib/oracleFireAssets";

// Warms the reading's crystal-ball video the moment the home page loads —
// the file is ~6MB, so it must already be in the browser's cache by the
// time the reading view opens. Hidden and silent; purely a preload.
export default function ReadingVideoPreload() {
  return (
    <video
      src={ORACLE_ORB_VIDEO}
      muted
      playsInline
      loop
      preload="auto"
      aria-hidden="true"
      style={{ display: "none" }}
    />
  );
}