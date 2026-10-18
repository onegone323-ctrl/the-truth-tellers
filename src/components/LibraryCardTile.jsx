import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getSilentWavSrc } from "@/lib/oracleVoice";
import { Link } from "react-router-dom";
import { Sparkles, Volume2 } from "lucide-react";

const SUIT_GLYPH = { Wands: "♣", Cups: "♥", Swords: "♠", Pentacles: "♦", Major: "✶" };

// One library tile: face shows the card's identity; a click turns it over
// to the full meaning while the Oracle's voice reads the card aloud.
export default function LibraryCardTile({ card }) {
  const [flipped, setFlipped] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | speaking | error
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef(null);

  // Her voice never keeps talking after the seeker leaves the page.
  useEffect(() => {
    return () => {
      try { audioRef.current?.pause(); } catch (e) {}
    };
  }, []);

  const stopAudio = () => {
    try { audioRef.current?.pause(); } catch (e) {}
    setStatus("idle");
  };

  const toggle = () => {
    if (flipped) {
      setFlipped(false);
      stopAudio();
    } else {
      setFlipped(true);
      // Unlock playback inside this tap — the same trick the Oracle's fire
      // uses — so her voice is allowed to start once the clip arrives.
      const el = audioRef.current || (audioRef.current = new Audio());
      el.onended = null;
      el.onerror = null;
      el.src = getSilentWavSrc();
      el.play().catch(() => {});
      speak();
    }
  };

  const speak = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const text =
        `${card.name}. ` +
        (card.arcana === "Major"
          ? "A Major Arcana card. "
          : `The suit of ${card.suit}, the element of ${card.element}. `) +
        `Upright, it means: ${card.upright} Reversed, it means: ${card.reversed} ` +
        `Its keywords are: ${card.keywords.join(", ")}.`;
      const res = await base44.functions.invoke("speakReading", { text });
      const clips = res?.data?.chunks || [];
      if (!clips.length) throw new Error("no audio");
      setStatus("speaking");
      for (const clip of clips) {
        await new Promise((resolve, reject) => {
          const el = audioRef.current || (audioRef.current = new Audio());
          el.onended = () => resolve();
          el.onerror = () => reject(new Error("audio error"));
          el.src = "data:audio/mpeg;base64," + clip;
          el.play().catch(reject);
        });
      }
      setStatus("idle");
    } catch (e) {
      const detail =
        e?.response?.data?.message || e?.data?.message || e?.message || "";
      setErrorMsg(
        /out_of_credits|402/i.test(detail)
          ? "Her voice needs credits — open Pricing to keep listening."
          : detail
            ? `Voice unavailable — ${detail}`
            : "Her voice couldn't load — try again."
      );
      setStatus("error");
    }
  };

  const glyph = SUIT_GLYPH[card.arcana === "Major" ? "Major" : card.suit];

  return (
    <div className="lib-tile" style={{ height: 300 }}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `Turn ${card.name} face down` : `Turn over ${card.name} and hear its meaning`}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
        className={`lib-tile-inner ${flipped ? "flipped" : ""}`}
      >
        {/* Face-up identity — the tile as it always looked */}
        <div className="lib-face lux-card rounded-lg p-3 text-left flex flex-col">
          <div className="flex items-center justify-between">
            <span style={{ color: "#d4af37", fontSize: 18 }}>{glyph}</span>
            {card.arcana === "Major" && <Sparkles className="w-3 h-3" style={{ color: "#d4af37" }} />}
          </div>
          <div className="mt-2 font-serif text-sm leading-tight" style={{ color: "#f0e6d2" }}>{card.name}</div>
          <div className="text-sm text-muted-foreground mt-1 uppercase tracking-wider">
            {card.arcana === "Major" ? "Major Arcana" : `${card.suit} · ${card.element}`}
          </div>
          <div className="mt-auto flex items-center gap-1.5 text-sm" style={{ color: "#b1a38b" }}>
            <Volume2 className="w-3.5 h-3.5" /> Tap to flip &amp; hear
          </div>
        </div>

        {/* The turned-over face — the card's full meaning */}
        <div className="lib-face lib-face-back lux-card rounded-lg p-3 text-left flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2">
            <span style={{ color: "#d4af37", fontSize: 18 }}>{glyph}</span>
            <div className="font-serif text-sm leading-tight" style={{ color: "#f0e6d2" }}>{card.name}</div>
          </div>
          <div className="text-sm uppercase tracking-wider mt-1" style={{ color: "#b1a38b" }}>
            {card.arcana === "Major" ? "Major Arcana" : `${card.suit} · ${card.element}`}
          </div>
          <div className="text-gold-leaf text-sm uppercase tracking-widest mt-2 mb-0.5">Upright</div>
          <p className="text-sm font-body" style={{ color: "#ede4d4" }}>{card.upright}</p>
          <div className="text-sm uppercase tracking-widest mt-2 mb-0.5" style={{ color: "#c0392b" }}>Reversed</div>
          <p className="text-sm font-body" style={{ color: "#ede4d4" }}>{card.reversed}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {card.keywords.map((k) => (
              <span key={k} className="text-sm px-2 py-0.5 rounded-full gold-pill text-muted-foreground">{k}</span>
            ))}
          </div>

          {/* Voice state, pinned to the bottom of the turned-over face */}
          <div className="mt-auto pt-2 text-sm" style={{ color: "#b1a38b" }}>
            {status === "loading" && "The Oracle is finding her voice…"}
            {status === "speaking" && "The Oracle is speaking…"}
            {status === "error" && errorMsg}
            {status === "idle" && (
              <span>
                Tap the card to turn it back — or{" "}
                <Link
                  to={`/cards/${encodeURIComponent(card.name)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="underline"
                  style={{ color: "#d4af37" }}
                >
                  open the full page
                </Link>.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}