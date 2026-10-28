import React from "react";
import { Image } from "@/components/ui/image";

// The Oracle's crystal ball — full-bleed behind the hero copy. The photo is
// dimmed and masked so the gold headline stays readable, and the scrim blends
// it into the black page above and below.
const ORB_BACKDROP =
  "https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/2fddc8925_orb1.jpg";

export default function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="hero-backdrop">
      <Image
        src={ORB_BACKDROP}
        alt=""
        fittingType="fill"
        focalPointY={0.52}
        className="hero-backdrop-media absolute inset-0"
      />
      <div className="hero-backdrop-scrim" />
    </div>
  );
}