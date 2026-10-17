import { useEffect, useRef } from "react";

// One 24-second, full-wheel drift from the green video's gold offset.
// Time alone drives the palette and breathing, never the voice signal.
export default function useOrbPalette(videoRef, glowRef, active) {
  const current = useRef({ hue: 0, breath: 0 });
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const from = { ...current.current };
    const restHue = ((from.hue + 180) % 360 + 360) % 360 - 180;
    let raf;
    const frame = (now) => {
      const elapsed = now - start;
      let hue = 0, breath = 0;
      if (active && !reduced) {
        // Decreasing rotation: gold, orange, magenta, violet, teal, gold.
        hue = -75 - (elapsed / 24000) * 360;
        breath = (1 - Math.cos((elapsed / 6000) * Math.PI * 2)) / 2;
      } else if (!active) {
        const t = Math.min(1, elapsed / 1800);
        const ease = t * t * (3 - 2 * t);
        hue = restHue * (1 - ease);
        breath = from.breath * (1 - ease);
      }
      current.current = { hue, breath };
      const video = videoRef.current;
      if (video) {
        video.style.filter = `hue-rotate(${hue.toFixed(1)}deg) brightness(${(1 + breath * 0.12).toFixed(3)}) saturate(1)`;
        video.style.transform = `scale(${(1 + breath * 0.008).toFixed(4)})`;
      }
      if (glowRef.current) glowRef.current.style.opacity = (breath * 0.2).toFixed(3);
      if (active && !reduced || !active && elapsed < 1800) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, videoRef, glowRef]);
}