import { useEffect, useState } from "react";

const isLite = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 768;

// True on small screens or when the OS asks for reduced motion — cut ambient animation cost.
export default function useLiteMotion() {
  const [lite, setLite] = useState(isLite);
  useEffect(() => {
    const update = () => setLite(isLite());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return lite;
}