import React from "react";
import { Link, useParams } from "react-router-dom";
import CompanyMark from "@/components/CompanyMark";
import DetailBackHeader from "@/components/DetailBackHeader";
import { getPostBySlug, BLOG_POSTS } from "@/lib/blogPosts";
import { useAuth } from "@/lib/AuthContext";

// One blog post — public and search-indexable, mirroring the About page.
export default function BlogPost() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const inLayout = !isLoadingAuth && isAuthenticated;

  if (!post) {
    return (
      <div className="obsidian-page min-h-screen flex flex-col items-center justify-center text-foreground" style={{ background: "var(--void-deep)" }}>
        <p className="font-serif text-lg">That post isn't in the journal.</p>
        <Link to="/blog" className="neo-pill px-6 py-2.5 mt-4 inline-flex items-center">Back to the Blog</Link>
      </div>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

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
            <Link to="/blog" className="neo-navlink inline-flex">Blog</Link>
            <Link to="/" className="neo-button">Consult the Oracle</Link>
          </nav>
        </header>
      )}
      <main className="relative z-[1] max-w-3xl mx-auto px-4 py-12">
        <h1 className="neo-h1 m-0" style={{ fontSize: 36, letterSpacing: 3 }}>{post.title}</h1>
        <p className="neo-note mt-3">{post.date} · The Parlor Journal</p>
        <div className="gold-hairline my-8" />
        <article className="neo-panel">
          <p className="neo-note" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)" }}>{post.excerpt}</p>
          {post.sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-display text-xl text-gold-leaf mt-8 mb-3">{s.h}</h2>
              {s.ps.map((p, j) => (
                <p key={j} className="neo-note mb-3" style={{ fontSize: 16, lineHeight: 1.8, fontStyle: "normal", color: "var(--ivory)" }}>{p}</p>
              ))}
            </div>
          ))}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="neo-button">Ask the Oracle a Question</Link>
            <Link to="/blog" className="neo-pill px-6 py-3 inline-flex items-center">More From the Journal</Link>
          </div>
        </article>
        <div className="mt-10">
          <h2 className="text-gold-leaf text-sm uppercase tracking-widest mb-3">Keep Reading</h2>
          <div className="space-y-4">
            {others.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="block lux-card rounded-xl p-5 no-underline">
                <h3 className="font-display text-lg text-gold-leaf m-0">{p.title}</h3>
                <p className="neo-note mt-2" style={{ fontSize: 14 }}>{p.excerpt}</p>
              </Link>
            ))}
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