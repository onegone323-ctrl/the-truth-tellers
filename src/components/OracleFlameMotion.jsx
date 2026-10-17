import React from "react";
import { Image } from "@/components/ui/image";
import { ORACLE_ORB_IMAGE } from "@/lib/oracleFireAssets";

// Move two soft crops of the original fire beneath the unmoving glass rim.
// The mask and every crop share the artwork's coordinate system on phones too.
export default function OracleFlameMotion() {
  return (
    <div className="orb-fire-window pointer-events-none" aria-hidden="true">
      {["orb-fire-current", "orb-fire-countercurrent"].map((className) => (
        <div key={className} className={className}>
          <Image
            src={ORACLE_ORB_IMAGE}
            alt=""
            draggable={false}
            className="orb-fire-texture select-none"
            fittingType="fill"
          />
        </div>
      ))}
    </div>
  );
}