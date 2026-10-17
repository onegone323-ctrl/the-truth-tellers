import { useEffect } from "react";

export default function useOrbPlayback(videoRef, active) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.loop = true;
      if (video.paused) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
      return;
    }
    const rest = () => video.pause();
    // Finish easing the palette to neutral before the last calm-frame pass.
    const timer = window.setTimeout(() => {
      video.loop = false;
      video.addEventListener("ended", rest, { once: true });
      if (video.ended) rest();
      else if (video.paused) video.play().catch(rest);
    }, 1800);
    return () => {
      window.clearTimeout(timer);
      video.removeEventListener("ended", rest);
    };
  }, [active, videoRef]);
}