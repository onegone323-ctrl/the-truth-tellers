import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import ReadingText from "@/components/ReadingText";
import { Trash2, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function JournalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.JournalEntry.get(id);
        if (!res) setNotFound(true);
        else setEntry(res);
      } catch (e) {
        console.error(e);
        setNotFound(true);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    await base44.entities.JournalEntry.delete(id);
    navigate("/journal");
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  if (notFound) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <p className="font-serif text-lg">This page has been torn from the book.</p>
        <button onClick={() => navigate("/journal")}
          className="mt-4 px-6 py-2 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest">
          Back to the Journal
        </button>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate("/journal")}
        className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold-leaf transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the Journal
      </button>

      <div className="lux-card rounded-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />{fmtDate(entry.created_date)}
            </div>
            <h2 className="font-serif text-xl text-gold-leaf mt-1">"{entry.question}"</h2>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{entry.deck} · {entry.spread}</p>
          </div>
          <button onClick={handleDelete}
            className="p-2 rounded-full text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <hr className="gold-hairline my-3" />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(entry.cards_drawn || []).map((c, i) => (
            <div key={i} className="text-center">
              <span className="text-[10px] px-2 py-0.5 rounded-full gold-pill text-muted-foreground block">
                {c.name}{c.reversed ? " R" : ""}
              </span>
              <span className="text-[8px] text-muted-foreground/60">{c.position}</span>
            </div>
          ))}
        </div>
        <ReadingText text={entry.interpretation} />
        {entry.audio_url && (
          <audio controls src={entry.audio_url} className="w-full mt-4" />
        )}
      </div>
    </div>
  );
}