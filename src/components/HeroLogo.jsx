import React from "react";

// The homepage hero wordmark: "TRUTH 4 CLARITY" split into single letters that
// swell, brighten and lift one beat after the last — light travelling across
// the word, then resting. Only the styling and timing live here as classes;
// the wave itself is CSS in src/index.css.
const WORD = "TRUTH 4 CLARITY";

export default function HeroLogo() {
  return (
    <div className="hero-word-logo" role="img" aria-label="Truth 4 Clarity">
      <div className="hero-word" aria-hidden="true">
        {WORD.split("").map((ch, i) => {
          if (ch === " ") return <span key={i} className="hero-letter-space" />;
          return (
            <span
              key={i}
              className={ch === "4" ? "hero-letter hero-letter-four" : "hero-letter"}
              style={{ "--i": i }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}