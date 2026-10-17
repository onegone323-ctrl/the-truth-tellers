import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Pause, Play, RotateCcw, RefreshCw, X } from "lucide-react";
import OracleFire from "@/components/OracleFire";

const tinyBtn = { padding: "5px 12px", fontSize: 12, minHeight: 34, letterSpacing: 1.5 };

export default function FireReading({ fireRef, aura, busy, voiceBusy, error, outOfCredits, done, onReset, onRetry }) {
  const [paused, setPaused] = useState(false);
  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden bg-reading-void"
      data-oracle-reading
    >
      <button
        onClick={onReset}
        aria-label="Leave the reading"
        className="neo-pill absolute right-3 z-20 flex items-center justify-center"
        style={{ top: "max(12px, env(safe-area-inset-top))", width: 34, height: 34, padding: 0 }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="absolute inset-0">
        <OracleFire ref={fireRef} aura={aura} fill showVideo />
      </div>
      {/* When she is done, the fire goes out: the stage fades to black. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-reading-void transition-opacity duration-[2500ms] pointer-events-none"
        style={{ opacity: done ? 1 : 0 }}
      />
      {error && !busy && (
        <p className="absolute inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-md bg-background/90 p-3 text-center text-sm text-foreground">
          {error}
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-reading-void/90 to-transparent px-4 pt-8"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
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
          <button onClick={onReset} className="neo-pill flex items-center gap-1.5" style={tinyBtn}>
            <RefreshCw className="w-3 h-3" /> Another Reading
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}