import React, { useEffect, useRef } from "react";
import { ORACLE_ORB_VIDEO } from "@/lib/oracleFireAssets";

// The reading is live through every one of these phases: the orb loops
// through all of them, seamlessly. No phase machine, no clip transitions.
const READING_PHASES = ["awakening", "thinking", "igniting", "speaking"];

export default function OracleReadingVideo({ phase = "dormant", getAnalyser }) {
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  const readingActive = READING_PHASES.includes(phase);

  // Loop for the whole reading. When it ends, let the effects ease back to
  // neutral for a moment, then freeze the orb on a calm frame.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (readingActive) {
      el.loop = true;
      if (el.paused) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } else {
      // The reading is over: let the current pass run out to the video's
      // calm final frame and rest there, no matter where she stopped.
      el.loop = false;
      const rest = () => el.pause();
      el.addEventListener("ended", rest, { once: true });
      if (el.paused) el.play().catch(() => { el.removeEventListener("ended", rest); el.pause(); });
      return () => el.removeEventListener("ended", rest);
    }
  }, [readingActive]);

  // One smoothed loop drives every live effect: her voice's energy flares
  // the fire (brightness, a touch of scale, a gold bloom) and its spectral
  // mix drifts the hue gold -> orange -> magenta -> violet -> teal.
  // Reduced motion keeps the orb looping plainly, without the filters.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const freq = new Uint8Array(128);
    let raf;
    let level = 0; // smoothed voice energy, 0..1
    let hue = 0; // smoothed hue offset, degrees
    let hueTarget = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const el = videoRef.current;
      if (!el) return;
      const analyser = readingActive ? getAnalyser?.() : null;
      if (analyser && !reduced) {
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < freq.length; i++) sum += freq[i];
        const energy = sum / (freq.length * 255);
        level += (Math.min(1, energy * 1.9) - level) * 0.12;
        // The orb video's base is green (~120deg on the wheel). Her voice
        // pushes the rotation across the FULL span: -90deg (orange/gold end)
        // up through teal (+60), violet (+150), magenta (+180) and around to
        // orange (+270) and gold (+285) on emphasized words.
        hueTarget = -90 + level * 375;
      } else {
        level += (0 - level) * 0.08;
        hueTarget = 0;
      }
      hue += (hueTarget - hue) * 0.05;
      el.style.filter = `hue-rotate(${hue.toFixed(1)}deg) brightness(${(1 + level * 0.35).toFixed(3)}) saturate(${(1 + level * 0.45).toFixed(3)})`;
      el.style.transform = `scale(${(1 + level * 0.02).toFixed(4)})`;
      if (glowRef.current) glowRef.current.style.opacity = (level * 0.45).toFixed(3);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [readingActive, getAnalyser]);

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
      {/* A soft gold bloom that breathes with her voice */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ background: "radial-gradient(circle at 50% 55%, rgba(212,175,55,.28), transparent 62%)" }}
      />
    </div>
  );
}