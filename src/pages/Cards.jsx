import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CARDS } from "@/lib/tarotData";
import { Search, Sparkles } from "lucide-react";

const SUIT_GLYPH = { Wands: "♣", Cups: "♥", Swords: "♠", Pentacles: "♦", Major: "✶" };

export default function Cards() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const categories = ["All", "Major", "Wands", "Cups", "Swords", "Pentacles"];
  const list = CARDS.filter((c) => {
    const cat = filter === "All" ? true : filter === "Major" ? c.arcana === "Major" : c.suit === filter;
    const q = query ? c.name.toLowerCase().includes(query.toLowerCase()) : true;
    return cat && q;
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">The Card Library</h1>
        <p className="text-muted-foreground mt-2 font-body">All seventy-eight — upright and reversed, the full meaning of each.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${
              filter === cat ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground hover:text-gold-leaf"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the cards…"
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-black/60 text-sm outline-none"
          style={{ border: "1px solid rgba(212,175,55,0.3)" }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {list.map((c) => (
          <button key={c.name} onClick={() => setSelected(c)}
            className="lux-card rounded-lg p-3 text-left hover:scale-[1.03] transition-transform">
            <div className="flex items-center justify-between">
              <span style={{ color: "#d4af37", fontSize: 18 }}>{SUIT_GLYPH[c.arcana === "Major" ? "Major" : c.suit]}</span>
              {c.arcana === "Major" && <Sparkles className="w-3 h-3" style={{ color: "#d4af37" }} />}
            </div>
            <div className="mt-2 font-serif text-sm leading-tight" style={{ color: "#f0e6d2" }}>{c.name}</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
              {c.arcana === "Major" ? "Major Arcana" : `${c.suit} · ${c.element}`}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setSelected(null)}>
          <div className="lux-card rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ color: "#d4af37", fontSize: 32 }}>{SUIT_GLYPH[selected.arcana === "Major" ? "Major" : selected.suit]}</span>
              <div>
                <h2 className="font-display text-2xl text-gold-leaf">{selected.name}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {selected.arcana === "Major" ? "Major Arcana" : `${selected.suit} · ${selected.element}`}
                </p>
              </div>
            </div>
            <hr className="gold-hairline my-3" />
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gold-leaf text-xs uppercase tracking-widest mb-1">Upright</div>
                <p className="text-foreground/90 font-body">{selected.upright}</p>
              </div>
              <div>
                <div className="uppercase tracking-widest mb-1 text-xs" style={{ color: "#c0392b" }}>Reversed</div>
                <p className="text-foreground/80 font-body">{selected.reversed}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selected.keywords.map((k) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded-full gold-pill text-muted-foreground">{k}</span>
                ))}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="mt-5 w-full py-2 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest hover:gold-pill-active transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}