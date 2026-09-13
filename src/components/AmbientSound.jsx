import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createAmbientEngine } from "@/lib/ambientAudio";

// Floating toggle for the ambient occult soundscape on the home screen.
export default function AmbientSound() {
  const [enabled, setEnabled] = useState(false);
  const engineRef = useRef(null);

  const toggle = () => {
    if (!engineRef.current) engineRef.current = createAmbientEngine();
    if (enabled) {
      engineRef.current.stop();
      setEnabled(false);
    } else {
      engineRef.current.start();
      setEnabled(true);
    }
  };

  // Silence if the component unmounts mid-session
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  return (
    <button
      onClick={toggle}
      title={enabled ? "Silence the ambience" : "Play the ambience"}
      aria-label={enabled ? "Silence the ambience" : "Play the ambience"}
      aria-pressed={enabled}
      className="fixed right-4 z-40 flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3 py-2 rounded-full text-sm uppercase tracking-widest transition-all bottom-[calc(80px_+_env(safe-area-inset-bottom))] sm:bottom-[calc(16px_+_env(safe-area-inset-bottom))]"
      style={{
        background: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(212,175,55,0.45)",
        boxShadow: "0 0 16px rgba(212,175,55,0.15)",
        color: enabled ? "#f5e6b8" : "#a8a29e",
        backdropFilter: "blur(6px)",
      }}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      <span className="hidden sm:inline">{enabled ? "Ambience On" : "Ambience Off"}</span>
    </button>
  );
}