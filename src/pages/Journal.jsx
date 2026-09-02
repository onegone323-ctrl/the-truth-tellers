import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Trash2, Calendar } from "lucide-react";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

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

  const handleDelete = async (id) => {
    await base44.entities.JournalEntry.delete(id);
    setEntries((p) => p.filter((e) => e.id !== id));
    setSelected(null);
  };

  const filtered = query
    ? entries.filter((e) =>
        (e.question || "").toLowerCase().includes(query.toLowerCase()) ||
        (e.interpretation || "").toLowerCase().includes(query.toLowerCase()))
    : entries;

  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">The Journal</h1>
        <p className="text-muted-foreground mt-2 font-body">Every reading the Oracle has given you — kept in her book.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your readings…"
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-black/60 text-sm outline-none"
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
            <button key={e.id} onClick={() => setSelected(e)}
              className="lux-card rounded-xl p-4 w-full text-left hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {fmtDate(e.created_date)}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-gold-leaf/70">{e.spread}</span>
              </div>
              <p className="mt-2 font-serif text-base text-foreground/90 line-clamp-2">"{e.question}"</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(e.cards_drawn || []).slice(0, 6).map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full gold-pill text-muted-foreground">
                    {c.name}{c.reversed ? " R" : ""}
                  </span>
                ))}
                {(e.cards_drawn || []).length > 6 && <span className="text-[10px] text-muted-foreground">+{(e.cards_drawn || []).length - 6}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setSelected(null)}>
          <div className="lux-card rounded-xl p-6 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />{fmtDate(selected.created_date)}
                </div>
                <h2 className="font-serif text-xl text-gold-leaf mt-1">"{selected.question}"</h2>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{selected.deck} · {selected.spread}</p>
              </div>
              <button onClick={() => handleDelete(selected.id)}
                className="p-2 rounded-full text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <hr className="gold-hairline my-3" />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(selected.cards_drawn || []).map((c, i) => (
                <div key={i} className="text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full gold-pill text-muted-foreground block">
                    {c.name}{c.reversed ? " R" : ""}
                  </span>
                  <span className="text-[8px] text-muted-foreground/60">{c.position}</span>
                </div>
              ))}
            </div>
            <p className="text-sm font-body text-foreground/90 whitespace-pre-wrap leading-relaxed">{selected.interpretation}</p>
            {selected.audio_url && (
              <audio controls src={selected.audio_url} className="w-full mt-4" />
            )}
            <button onClick={() => setSelected(null)} className="mt-5 w-full py-2 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest hover:opacity-80 transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}