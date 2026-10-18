import React from "react";
import { Link } from "react-router-dom";
import CompanyMark from "@/components/CompanyMark";
import DetailBackHeader from "@/components/DetailBackHeader";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { useAuth } from "@/lib/AuthContext";

// "Blog" — public and search-indexable; mirrors the About page's structure.
export default function Blog() {
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
        <DetailBackHeader title="Blog" />
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
        <h1 className="neo-h1 m-0" style={{ fontSize: 40, letterSpacing: 4 }}>The Parlor Journal</h1>
        <p className="neo-note mt-4" style={{ fontSize: 16 }}>
          Notes on tarot, questions worth asking, and readings worth trusting — from the Oracle's parlor.
        </p>
        <div className="gold-hairline my-8" />
        <div className="space-y-5">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="block lux-card rounded-xl p-6 no-underline">
              <h2 className="font-display text-xl text-gold-leaf m-0">{post.title}</h2>
              <p className="neo-note mt-3" style={{ fontSize: 15 }}>{post.excerpt}</p>
              <span className="text-sm text-muted-foreground mt-3 inline-block" style={{ color: "var(--gold-leaf)" }}>Read the post →</span>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className="neo-button">Ask the Oracle a Question</Link>
          <Link to="/cards" className="neo-pill px-6 py-3 inline-flex items-center">Browse the Card Library</Link>
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