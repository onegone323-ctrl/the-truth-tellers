import React from "react";
import { Link } from "react-router-dom";
import CompanyMark from "@/components/CompanyMark";
import DetailBackHeader from "@/components/DetailBackHeader";
import { useAuth } from "@/lib/AuthContext";

// "About" — public and search-indexable; inside the authenticated app it
// swaps its standalone header for the sticky back-button header the other
// detail pages use.
export default function About() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const inLayout = !isLoadingAuth && isAuthenticated;
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }
  return (
    <div className="obsidian-page min-h-screen text-foreground" style={{ background: "var(--void-deep)" }}>
      {inLayout ? (
        <DetailBackHeader title="About" />
      ) : (
        <header className="px-4 sm:px-[54px] py-6 flex items-center justify-between" style={{ borderBottom: "1px solid var(--neo-border)" }}>
          <Link to="/" className="flex items-center" style={{ gap: 13 }}>
            <span style={{ fontSize: 27, color: "#d4af37", textShadow: "0 0 14px #d4af37" }}>✶</span>
            <span style={{ color: "var(--gold-leaf)", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", fontWeight: 500 }}>
              Truth 4 Clarity
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/contact" className="neo-navlink inline-flex">Contact</Link>
            <Link to="/" className="neo-button">Consult the Oracle</Link>
          </nav>
        </header>
      )}
      <main className="relative z-[1] max-w-3xl mx-auto px-4 py-12">
        <h1 className="neo-h1 m-0" style={{ fontSize: 40, letterSpacing: 4 }}>About Truth 4 Clarity</h1>
        <div className="gold-hairline my-8" />
        <div className="neo-panel">
          <p className="neo-note" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)" }}>
            Truth 4 Clarity is a voice-interactive tarot reading app that puts an AI Oracle in your pocket.
            Ask a real question about love, career, money, or a decision you keep putting off, choose a deck
            and a spread, and the cards are dealt on screen while the Oracle speaks her reading aloud — a blunt,
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
        <div className="flex flex-col items-center" style={{ gap: 12 }}>
          <CompanyMark height={40} />
          <span className="neo-note">ADPOV Media and Entertainment — We Make It Make Sense · © 2026 · <Link to="/contact" className="neo-navlink inline-flex">Contact</Link></span>
        </div>
      </footer>
    </div>
  );
}