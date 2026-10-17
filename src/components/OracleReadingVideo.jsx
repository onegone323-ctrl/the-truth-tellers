import React, { useRef, useState } from "react";
import useOracleVideoSequence, { ORACLE_VIDEOS } from "@/components/oracle/useOracleVideoSequence";

export default function OracleReadingVideo({ videoRef: sharedRef, phase = "dormant", onAwakened, onRested }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const sequence = useOracleVideoSequence({ phase, videoRef, onAwakened, onRested, onStatus: setStatus });

  return (
    <div className="absolute inset-0 bg-reading-void" data-oracle-video-stage
      data-video-phase={sequence.phase} data-video-clip={sequence.clip} data-voice-active={sequence.voiceActive}>
      <video key={sequence.clip}
        ref={el => { videoRef.current = el; if (sharedRef) sharedRef.current = el; }}
        src={ORACLE_VIDEOS[sequence.clip]} loop={sequence.phase === "speaking"}
        muted playsInline preload="auto" onEnded={sequence.onEnded}
        aria-label="Oracle reading video" className="absolute inset-0 h-full w-full object-cover"
        onLoadStart={() => setStatus("loading")}
        onLoadedData={() => setStatus("ready")} onPlaying={() => setStatus("ready")}
        onError={() => { setStatus("error"); onAwakened?.(); onRested?.(); }} />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading fire">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>}
      {status === "blocked" && <button onClick={() => videoRef.current?.play().catch(() => {})} className="neo-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Play Fire</button>}
      {status === "error" && <p role="alert" className="absolute inset-x-0 top-1/2 px-6 text-center text-foreground">The fire video couldn't load. Please reopen the reading.</p>}
    </div>
  );
}