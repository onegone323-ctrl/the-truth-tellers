import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toSpokenText } from "@/lib/speechText";
import { Loader2, Play, Square } from "lucide-react";

// Splits a long reply into pieces that fit the voice service's per-request
// ceiling (4000 chars), at sentence boundaries. Most replies are one piece.
function splitForVoice(text) {
  if (text.length <= 3900) return [text];
  const sentences = text.match(/[\s\S]+?[.!?]+["')\]]*(?=\s|$)|[\s\S]+$/g) || [text];
  const parts = [];
  let buf = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (buf && buf.length + s.length + 1 > 3900) {
      parts.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

// Plays one Memory Parlor reply aloud with the OpenAI Oracle voice — the
// backup voice, spoken piece by piece. One tap starts; tapping again stops.
export default function VoicePlayButton({ text }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const elRef = useRef(null);
  const stopped = useRef(false);

  const play = async () => {
    if (playing) {
      stopped.current = true;
      elRef.current?.pause();
      setPlaying(false);
      return;
    }
    stopped.current = false;
    setPlaying(true);
    setLoading(true);
    try {
      let el = elRef.current;
      if (!el) {
        el = new Audio();
        elRef.current = el;
      }
      for (const part of splitForVoice(toSpokenText(text))) {
        if (stopped.current) break;
        const res = await base44.functions.invoke("speakReading", { text: part, engine: "openai" });
        const clips = res?.data?.chunks;
        if (!Array.isArray(clips) || !clips.length) break;
        for (const clip of clips) {
          if (stopped.current) break;
          await new Promise((resolve) => {
            el.onended = resolve;
            el.onerror = resolve;
            el.src = "data:audio/mpeg;base64," + clip;
            el.play().catch(() => resolve());
          });
        }
      }
      el.onended = null;
      el.onerror = null;
    } catch (e) {
      console.warn("The Oracle's voice hiccuped here.", e?.response?.data?.message || e?.message || e);
    }
    setPlaying(false);
    setLoading(false);
  };

  return (
    <button onClick={play} className="neo-pill flex items-center gap-1.5 px-2.5 py-1"
      style={{ fontSize: 11, minHeight: 34, marginTop: 6 }}
      aria-label={playing ? "Stop her voice" : "Play her voice"}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : playing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {playing ? "Stop" : "Play"}
    </button>
  );
}