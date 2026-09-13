import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/PullToRefresh";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.JournalEntry.list("-created_date", 100);
      setEntries(res || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = query
    ? entries.filter((e) =>
        (e.question || "").toLowerCase().includes(query.toLowerCase()) ||
        (e.interpretation || "").toLowerCase().includes(query.toLowerCase()))
    : entries;

  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6 overscroll-none">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">The Journal</h1>
        <p className="text-muted-foreground mt-2 font-body">Every reading the Oracle has given you — kept in her book.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your readings…"
          className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-full bg-black/60 text-sm outline-none"
          style={{ border: "1px solid rgba(212,175,55,0.3)" }} />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Opening the book…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p className="font-serif text-lg">The pages are still blank.</p>
          <p className="text-sm mt-1">Consult the Oracle and your readings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => navigate(`/journal/${e.id}`)}
              className="lux-card rounded-xl p-4 w-full text-left hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {fmtDate(e.created_date)}
                </div>
                <span className="text-sm uppercase tracking-widest text-gold-leaf/70">{e.spread}</span>
              </div>
              <p className="mt-2 font-serif text-base text-foreground/90 line-clamp-2">"{e.question}"</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(e.cards_drawn || []).slice(0, 6).map((c, i) => (
                  <span key={i} className="text-sm px-2.5 py-1 rounded-full gold-pill text-muted-foreground">
                    {c.name}{c.reversed ? " R" : ""}
                  </span>
                ))}
                {(e.cards_drawn || []).length > 6 && <span className="text-sm text-muted-foreground">+{(e.cards_drawn || []).length - 6}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
    </PullToRefresh>
  );
}