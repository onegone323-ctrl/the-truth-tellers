import React, { useState } from "react";
import { CARDS } from "@/lib/tarotData";
import { Search } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import LibraryCardTile from "@/components/LibraryCardTile";

export default function Cards() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const categories = ["All", "Major", "Wands", "Cups", "Swords", "Pentacles"];
  const list = CARDS.filter((c) => {
    const cat = filter === "All" ? true : filter === "Major" ? c.arcana === "Major" : c.suit === filter;
    const q = query ? c.name.toLowerCase().includes(query.toLowerCase()) : true;
    return cat && q;
  });

  // The library is static — a pull simply resets the view.
  const refresh = async () => { setFilter("All"); setQuery(""); };

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="space-y-6 overscroll-none">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">The Card Library</h1>
        <p className="text-muted-foreground mt-2 font-body">All seventy-eight — upright and reversed, the full meaning of each.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-2 min-h-[44px] rounded-full text-sm uppercase tracking-widest transition-all ${
              filter === cat ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground hover:text-gold-leaf"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the cards…"
          className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-full bg-black/60 text-sm outline-none"
          style={{ border: "1px solid rgba(212,175,55,0.3)" }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {list.map((c) => <LibraryCardTile key={c.name} card={c} />)}
      </div>

    </div>
    </PullToRefresh>
  );
}