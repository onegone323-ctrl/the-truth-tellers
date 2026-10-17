import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, RotateCcw, RefreshCw, Volume2, X } from "lucide-react";
import OracleFire from "@/components/OracleFire";

const tinyBtn = { padding: "5px 12px", fontSize: 12, minHeight: 34, letterSpacing: 1.5 };

export default function FireReading({ fireRef, aura, busy, voiceBusy, error, outOfCredits, onReset, onRetry }) {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] flex-col items-center overflow-hidden bg-reading-void"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        onClick={onReset}
        aria-label="Leave the reading"
        className="neo-pill absolute right-3 z-20 flex items-center justify-center"
        style={{ top: "max(12px, env(safe-area-inset-top))", width: 34, height: 34, padding: 0 }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <OracleFire ref={fireRef} aura={aura} fill showVideo />
      </div>
      {error && !busy && (
        <p className="relative px-6 pb-3 text-center" style={{ color: "#b1a38b", fontSize: 12, maxWidth: 420 }}>
          {error}
        </p>
      )}
      <div className="relative flex flex-wrap items-center justify-center gap-2 pb-5 px-4">
        {voiceBusy && !error && (
          <>
            <button
              onClick={() => {
                if (paused) {
                  fireRef.current?.resume();
                  setPaused(false);
                } else {
                  fireRef.current?.pause();
                  setPaused(true);
                }
              }}
              className="neo-pill flex items-center gap-1.5"
              style={tinyBtn}
            >
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={() => fireRef.current?.rewind()} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
              <RotateCcw className="w-3 h-3" /> Rewind
            </button>
          </>
        )}
        {error && !busy && (
          <>
            {outOfCredits ? (
              <Link to="/pricing" className="neo-button" style={tinyBtn}>
                Get More Readings
              </Link>
            ) : (
              <button onClick={onRetry} className="neo-button" style={tinyBtn}>
                Try Again
              </button>
            )}
            <button onClick={onReset} className="neo-pill" style={tinyBtn}>
              Another Reading
            </button>
          </>
        )}
        {!error && !busy && !voiceBusy && (
          <>
            <button onClick={() => fireRef.current?.play()} className="neo-button flex items-center gap-1.5" style={tinyBtn}>
              <Volume2 className="w-3 h-3" /> Hear Her Voice
            </button>
            <button onClick={onReset} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
              <RefreshCw className="w-3 h-3" /> Another Reading
            </button>
          </>
        )}
      </div>
    </div>
  );
}