import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CompanyMark from "@/components/CompanyMark";
import DetailBackHeader from "@/components/DetailBackHeader";
import { useAuth } from "@/lib/AuthContext";
import { Send } from "lucide-react";

// "Contact" — public and search-indexable; inside the authenticated app it
// swaps its standalone header for the sticky back-button header the other
// detail pages use.
export default function Contact() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const inLayout = !isLoadingAuth && isAuthenticated;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await base44.entities.ContactMessage.create({
        name: name.slice(0, 120),
        email: email.trim().slice(0, 200),
        message: message.slice(0, 2000),
      });
      setSent(true);
    } catch (err) {
      setError("The message couldn't be sent — try again in a moment.");
    }
    setSending(false);
  };

  return (
    <div className="obsidian-page min-h-screen text-foreground" style={{ background: "var(--void-deep)" }}>
      {inLayout ? (
        <DetailBackHeader title="Contact" />
      ) : (
        <header className="px-4 sm:px-[54px] py-6 flex items-center justify-between" style={{ borderBottom: "1px solid var(--neo-border)" }}>
          <Link to="/" className="flex items-center" style={{ gap: 13 }}>
            <span style={{ fontSize: 27, color: "#00e5ff", textShadow: "0 0 14px #00e5ff" }}>✶</span>
            <span style={{ color: "var(--gold-leaf)", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", fontWeight: 500 }}>
              Truth 4 Clarity
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/about" className="neo-navlink inline-flex">About</Link>
            <Link to="/" className="neo-button">Consult the Oracle</Link>
          </nav>
        </header>
      )}
      <main className="relative z-[1] max-w-3xl mx-auto px-4 py-12">
        <h1 className="neo-h1 m-0" style={{ fontSize: 40, letterSpacing: 4 }}>Contact Us</h1>
        <div className="gold-hairline my-8" />
        <div className="neo-panel">
          {sent ? (
            <div className="text-center py-6">
              <p style={{ color: "var(--ivory)", fontSize: 16 }}>Your message is with the Oracle's keepers.</p>
              <p className="neo-note mt-2">We'll get back to you at the email you left.</p>
              <Link to="/" className="neo-button mt-6 inline-flex">Back to the Oracle</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="neo-note" style={{ fontStyle: "normal" }}>
                Questions, feedback, or trouble with a reading? Send a message and we'll answer by email.
              </p>
              <div>
                <label htmlFor="contact-name" className="neo-label block mb-2">Your Name</label>
                <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)}
                  maxLength={120} className="neo-field" placeholder="Optional" />
              </div>
              <div>
                <label htmlFor="contact-email" className="neo-label block mb-2">Your Email</label>
                <input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  maxLength={200} className="neo-field" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="contact-message" className="neo-label block mb-2">Message</label>
                <textarea id="contact-message" required value={message} onChange={(e) => setMessage(e.target.value)}
                  rows={5} maxLength={2000} className="neo-field" placeholder="What's on your mind?" />
              </div>
              {error && <p style={{ color: "#e05c6a", fontSize: 14 }}>{error}</p>}
              <button type="submit" disabled={sending} className="neo-button flex items-center gap-2">
                <Send className="w-4 h-4" />{sending ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </main>
      <footer className="px-4 sm:px-[54px] py-8 text-center" style={{ borderTop: "1px solid var(--neo-border)" }}>
        <div className="flex flex-col items-center" style={{ gap: 12 }}>
          <CompanyMark height={40} />
          <span className="neo-note">ADPOV Media and Entertainment — We Make It Make Sense · © 2026 · <Link to="/about" className="neo-navlink inline-flex">About</Link></span>
        </div>
      </footer>
    </div>
  );
}