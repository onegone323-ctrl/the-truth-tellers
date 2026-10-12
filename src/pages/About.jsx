import React from "react";
import { Link } from "react-router-dom";

// Public "About" page — readable by search engines and by logged-out visitors.
export default function About() {
  return (
    <div className="obsidian-page min-h-screen text-foreground" style={{ background: "var(--void-deep)" }}>
      <header className="px-4 sm:px-[54px] py-6 flex items-center justify-between" style={{ borderBottom: "1px solid var(--neo-border)" }}>
        <Link to="/" className="flex items-center" style={{ gap: 13 }}>
          <span style={{ fontSize: 27, color: "#00e5ff", textShadow: "0 0 14px #00e5ff" }}>✶</span>
          <span style={{ color: "var(--gold-leaf)", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", fontWeight: 500 }}>
            Truth 4 Clarity
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/contact" className="neo-navlink inline-flex">Contact</Link>
          <Link to="/" className="neo-button">Consult the Oracle</Link>
        </nav>
      </header>
      <main className="relative z-[1] max-w-3xl mx-auto px-4 py-12">
        <h1 className="neo-h1 m-0" style={{ fontSize: 40, letterSpacing: 4 }}>About Truth 4 Clarity</h1>
        <div className="gold-hairline my-8" />
        <div className="neo-panel">
          <p className="neo-note" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)" }}>
            Truth 4 Clarity is a voice-interactive tarot reading app that puts an AI Oracle in your pocket.
            Ask a real question about love, career, money, or a decision you keep putting off, choose a deck
            and a spread, and the cards are dealt on screen while the Oracle speaks his reading aloud — a blunt,
            warm, spunky male voice that talks to you like a brilliant best friend who happens to see straight
            through people. He walks the spread position by position, connects every card to your actual life,
            and gives direct, concrete advice: what to do this week, what to stop doing, and what to watch for.
          </p>
          <p className="neo-note" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)", marginTop: 16 }}>
            The app is for anyone who wants straight answers instead of vague mysticism — seekers at a
            crossroads, creative professionals, skeptics who secretly love the cards, and longtime tarot
            readers who want the ritual without the jargon. Every reading is saved to a private journal,
            your personal details are remembered between visits, and a memory parlor lets you return weeks
            later for hard truths grounded in what you asked before.
          </p>
          <p className="neo-note" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)", marginTop: 16 }}>
            Truth 4 Clarity is built and operated by ADPOV-MEDIA-ENT, an independent studio that designs
            voice-first AI experiences. The Oracle's readings are generated with large language models on
            a foundation of traditional tarot meanings, synthesized into natural speech, and delivered with
            your privacy in mind: your journal and profile belong to you alone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="neo-button">Ask the Oracle a Question</Link>
            <Link to="/contact" className="neo-pill px-6 py-3 inline-flex items-center">Contact Us</Link>
          </div>
        </div>
      </main>
      <footer className="px-4 sm:px-[54px] py-8 text-center" style={{ borderTop: "1px solid var(--neo-border)" }}>
        <span className="neo-note">© 2026 ADPOV-MEDIA-ENT · <Link to="/contact" className="neo-navlink inline-flex">Contact</Link></span>
      </footer>
    </div>
  );
}