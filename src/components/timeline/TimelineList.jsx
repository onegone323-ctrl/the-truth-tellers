import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { alignmentOf, alignmentBadge } from "@/lib/timelineStats";
import ReadingText from "@/components/ReadingText";
import { ChevronDown } from "lucide-react";

// The chronological journey — every session on a gold thread, oldest to newest.
export default function TimelineList({ entries }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="relative pl-8 sm:pl-10">
      <div className="absolute left-3 sm:left-4 top-2 bottom-2 w-px"
        style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.55) 10%, rgba(192,57,43,0.25) 90%, transparent)" }} />
      <div className="space-y-6">
        {entries.map((e, idx) => {
          const ratio = alignmentOf(e);
          const badge = alignmentBadge(ratio);
          const isOpen = openId === e.id;
          return (
            <div key={e.id} className="relative">
              <span className="absolute -left-5 sm:-left-6 top-2 rounded-full"
                style={{
                  width: 10, height: 10,
                  background: badge.color,
                  boxShadow: `0 0 10px ${badge.color}99`,
                }} />
              <div className="lux-card rounded-xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {idx + 1} · {format(parseISO(e.created_date), "MMM d, yyyy")}
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest"
                    style={{
                      border: `1px solid ${badge.color}99`,
                      color: badge.color,
                      background: `${badge.color}14`,
                      boxShadow: badge.label === "Danger Zone" ? `0 0 10px ${badge.color}44` : undefined,
                    }}>
                    {badge.label}
                  </span>
                </div>
                <p className="font-serif text-base sm:text-lg mt-2" style={{ color: "#f0e6d2" }}>
                  “{e.question}”
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 italic">
                  {e.spread} · {e.deck}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(e.cards_drawn || []).map((c, i) => (
                    <span key={i} className="gold-pill px-2 py-0.5 rounded-full text-[10px]"
                      style={{ color: c.reversed ? "#e8a9a9" : "#d4c8a8" }}>
                      {c.name}{c.reversed ? " (R)" : ""}
                    </span>
                  ))}
                </div>
                <button onClick={() => setOpenId(isOpen ? null : e.id)}
                  className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-widest text-gold-leaf/80 hover:text-gold-leaf transition-colors">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  {isOpen ? "Close Her Words" : "Her Words"}
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(212,175,55,0.15)" }}>
                    <ReadingText text={e.interpretation} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}