import React, { useEffect, useRef, useState } from "react";

const VIDEO_URL = "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/2da5d204c_oracle_synced_full.mp4";

export default function OracleReadingVideo() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading");
  // Play is always started from code with a caught promise — never the
  // autoplay attribute, whose browser-initiated play() promise rejects as an
  // uncaught AbortError if the element leaves the document mid-request.
  const play = () => videoRef.current?.play().catch(() => setStatus("blocked"));
  useEffect(() => {
    const video = videoRef.current;
    video.muted = true;
    play();
    return () => {
      // Pause BEFORE dropping the src: clearing a src while a play() request
      // is still being processed is what throws "media removed from the
      // document" — with playback already stopped, the cleanup is silent.
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, []);
  return (
    <div className="absolute inset-0 bg-reading-void" data-oracle-video-stage>
      <video ref={videoRef} src={VIDEO_URL} muted loop playsInline preload="auto"
        aria-label="Oracle reading video" className="absolute inset-0 h-full w-full object-cover"
        onPlaying={() => setStatus("playing")} onError={() => setStatus("error")} />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading fire">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>}
      {status === "blocked" && <button onClick={play} className="neo-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Play Fire</button>}
      {status === "error" && <p role="alert" className="absolute inset-x-0 top-1/2 px-6 text-center text-foreground">The fire video couldn't load. Please reopen the reading.</p>}
    </div>
  );
}