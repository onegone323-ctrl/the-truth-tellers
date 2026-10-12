import { useEffect, useState } from "react";

// Live viewport width for component-level responsive decisions
// (orb sizing, tab-bar labels). Re-renders on resize.
export default function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}