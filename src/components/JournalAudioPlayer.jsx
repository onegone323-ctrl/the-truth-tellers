import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// A managed player for a saved reading's audio. The browser throws an
// unhandled AbortError ("media was removed from the document") when a native
// <audio controls> is taken out of the page mid-play — so playback runs
// through our own play() call (whose promise we catch) and is silenced on
// unmount, keeping the element never-interrupted.
export default function JournalAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    const el = audioRef.current;
    if (el) {
      try {
        el.pause();
      } catch (e) {}
      el.removeAttribute("src");
    }
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      el.play().catch(() => setPlaying(false));
    }
  };

  return (
    <div className="mt-4">
      <audio ref={audioRef} src={src} preload="none" className="hidden"
        onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
      <button onClick={toggle}
        aria-label={playing ? "Pause the reading" : "Play the reading"}
        className="neo-pill flex items-center gap-2 px-4 py-2">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {playing ? "Pause the Reading" : "Play the Reading"}
      </button>
    </div>
  );
}