import React, { useEffect, useState } from "react";
import OracleSphere from "@/components/OracleSphere";
import { Link } from "react-router-dom";
import { Pause, Play, RotateCcw, RefreshCw, Volume2, X } from "lucide-react";

const tinyBtn = { padding: "5px 12px", fontSize: 12, minHeight: 34, letterSpacing: 1.5 };

// The reading, and nothing else: a full black page, the Oracle's fire globe
// filling it, colors drifting with her voice, and tiny controls pinned to
// the very bottom edge.
export default function ReadingStage({
  state, busy, voiceBusy, voicePaused, error, outOfCredits,
  onPauseToggle, onRewind, onSpeak, onReset, onRetry,
}) {
  const [size, setSize] = useState(200);
  useEffect(() => {
    const fit = () => setSize(Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.42));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const speaking = state === "speaking";

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center" style={{ background: "#000000" }}>
      {/* the flame breathes through the whole page while she speaks */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 47%, rgba(212,175,55,0.3) 0%, rgba(139,26,43,0.16) 34%, transparent 62%)",
          opacity: speaking || busy ? 0.95 : 0.35,
          animation: speaking ? "hueDrift 7s linear infinite alternate" : "none",
          transition: "opacity 1.2s ease",
        }} />

      {/* quiet escape hatch — the page has no chrome of its own */}
      <button onClick={onReset} aria-label="Leave the reading"
        className="neo-pill absolute top-4 right-4 flex items-center justify-center"
        style={{ width: 34, height: 34, padding: 0 }}><X className="w-3.5 h-3.5" /></button>

      <div className="relative flex-1 w-full flex items-center justify-center"
        style={{ animation: "orbRise 0.9s ease-out both" }}>
        <OracleSphere state={state} size={size} />
      </div>

      {error && !busy && (
        <p className="relative px-6 pb-3 text-center" style={{ color: "#b1a38b", fontSize: 12, maxWidth: 420 }}>
          {error}
        </p>
      )}

      <div className="relative flex flex-wrap items-center justify-center gap-2 pb-5 px-4">
        {(voiceBusy || speaking) && (
          <>
            <button onClick={onPauseToggle} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
              {voicePaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {voicePaused ? "Resume" : "Pause"}
            </button>
            <button onClick={onRewind} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
              <RotateCcw className="w-3 h-3" /> Rewind
            </button>
          </>
        )}
        {error && !busy && (
          <>
            {outOfCredits ? (
              <Link to="/pricing" className="neo-button" style={tinyBtn}>Get More Readings</Link>
            ) : (
              <button onClick={onRetry} className="neo-button" style={tinyBtn}>Try Again</button>
            )}
            <button onClick={onReset} className="neo-pill" style={tinyBtn}>Another Reading</button>
          </>
        )}
        {!error && !busy && !voiceBusy && !speaking && (
          <>
            <button onClick={onSpeak} className="neo-button flex items-center gap-1.5" style={tinyBtn}>
              <Volume2 className="w-3 h-3" /> Hear Her Voice
            </button>
            <button onClick={onReset} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
              <RefreshCw className="w-3 h-3" /> Another Reading
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes orbRise {
          from { transform: translateY(60px) scale(0.85); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}