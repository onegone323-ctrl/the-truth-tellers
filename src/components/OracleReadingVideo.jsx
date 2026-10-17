import React, { useEffect, useRef, useState } from "react";

// The Oracle's three-phase fire — one matched set of clips:
// 1. AWAKENING: the eye blinks open, the fire ignites. Played ONCE when her
//    voice starts; before that, its first frame (the closed eye) is held still.
// 2. SPEAKING: a seamless burn, looped for the whole reading — through every
//    pause between voice segments, until her final word.
// 3. RESTING: the fire dies to embers. Played ONCE after her last word, then
//    held on the last frame.
const AWAKENING_URL = "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/4afa5c09b_media-generation-oracle-awakening-0-a6453e50-4435-4046-ae38-0f792c829f97.mp4";
const SPEAKING_URL = "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/58bbf23ad_media-generation-oracle-speaking-0-70a2fe80-a96e-4432-a618-7fa8043b0799.mp4";
const RESTING_URL = "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/f7846dd7e_media-generation-oracle-resting-0-2bf8d8db-c415-46d5-959b-ff86efe410df.mp4";

const isSameSrc = (video, url) => video && (video.src === url || video.currentSrc === url || video.getAttribute("src") === url);

// `phase` is the Oracle engine's current state:
//   awakening / thinking / dormant → idle (hold the closed eye)
//   igniting / speaking            → awakening once, then the speaking loop
//   simmering / resting            → resting once, then hold the last frame
// `videoRef` lets the Oracle's engine reach the element (kept for the shared
// fire wiring); phase alone drives every playback decision.
export default function OracleReadingVideo({ videoRef: sharedRef, phase = "dormant" }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const seq = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const myRun = ++seq.current;
    const speaking = phase === "igniting" || phase === "speaking";
    const resting = phase === "simmering" || phase === "resting";

    const holdIdle = () => {
      if (seq.current !== myRun) return;
      video.loop = false;
      video.onended = null;
      if (!isSameSrc(video, AWAKENING_URL)) {
        video.src = AWAKENING_URL;
        video.load();
      }
      video.currentTime = 0;
      video.pause();
      setStatus("ready");
    };

    const startSpeakingLoop = () => {
      if (seq.current !== myRun) return;
      video.onended = null;
      video.loop = true;
      if (!isSameSrc(video, SPEAKING_URL)) {
        video.src = SPEAKING_URL;
        video.load();
      }
      video.play().catch(() => setStatus("blocked"));
    };

    if (!speaking && !resting) {
      holdIdle();
      return () => { video.onended = null; };
    }

    if (speaking) {
      // Ignition runs once on the way into the loop — unless it already
      // played (e.g. a replay of a reading she still holds in hand).
      const ignitionFresh = isSameSrc(video, AWAKENING_URL) && video.currentTime < 0.1;
      video.loop = false;
      if (!ignitionFresh) {
        video.src = AWAKENING_URL;
        video.load();
        video.currentTime = 0;
      }
      video.onended = startSpeakingLoop;
      video.play().catch(() => {
        // If even the ignition can't start (rare), go straight to the loop.
        video.onended = null;
        startSpeakingLoop();
      });
      return () => { video.onended = null; };
    }

    // Resting: play once, then freeze on the last frame.
    video.loop = false;
    if (!isSameSrc(video, RESTING_URL)) {
      video.src = RESTING_URL;
      video.load();
    }
    video.onended = () => {
      if (seq.current === myRun) {
        video.onended = null;
        video.pause(); // hold the last frame
        setStatus("ready");
      }
    };
    video.play().catch(() => setStatus("blocked"));
    return () => { video.onended = null; };
  }, [phase]);

  // Leave things tidy if the page itself goes away mid-reading.
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-reading-void" data-oracle-video-stage>
      <video ref={(el) => { videoRef.current = el; if (sharedRef) sharedRef.current = el; }}
        muted loop={false} playsInline preload="auto"
        aria-label="Oracle reading video" className="absolute inset-0 h-full w-full object-cover"
        onLoadedData={() => setStatus("ready")} onPlaying={() => setStatus("ready")}
        onError={() => setStatus("error")} />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading fire">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>}
      {status === "blocked" && <button onClick={() => videoRef.current?.play().catch(() => {})} className="neo-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Play Fire</button>}
      {status === "error" && <p role="alert" className="absolute inset-x-0 top-1/2 px-6 text-center text-foreground">The fire video couldn't load. Please reopen the reading.</p>}
    </div>
  );
}