import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { alignmentOf, recurringCards, growthSeries, alignmentSeries } from "@/lib/timelineStats";
import AlignmentTrendChart from "@/components/timeline/AlignmentTrendChart";
import RecurringCardsChart from "@/components/timeline/RecurringCardsChart";
import ReadingGrowthChart from "@/components/timeline/ReadingGrowthChart";
import TimelineList from "@/components/timeline/TimelineList";
import PullToRefresh from "@/components/PullToRefresh";

export default function Timeline() {
  const [entries, setEntries] = useState(null);

  const load = useCallback(async () => {
    const list = await base44.entities.JournalEntry.list("-created_date", 500);
    setEntries(list || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (entries === null) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <PullToRefresh onRefresh={load}>
      <div className="text-center py-16 space-y-4 overscroll-none">
        <div className="text-5xl" style={{ color: "#d4af37", textShadow: "0 0 20px rgba(212,175,55,0.5)" }}>✶</div>
        <h2 className="font-display text-2xl text-gold-leaf uppercase tracking-[0.2em]">The Thread Is Empty</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Your journey hasn't been written yet. Sit with the Oracle for your first reading, and this timeline will begin to trace your path.
        </p>
        <Link to="/" className="gold-pill inline-flex items-center px-6 py-2.5 min-h-[44px] rounded-full text-sm uppercase tracking-widest text-gold-leaf">
          Consult the Oracle
        </Link>
      </div>
      </PullToRefresh>
    );
  }

  const chronological = [...entries].reverse();
  const recurring = recurringCards(entries);
  const growth = growthSeries(entries);
  const trend = alignmentSeries(entries);
  const ratios = entries.map(alignmentOf).filter((r) => r !== null);
  const overall = ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : null;
  const topCard = recurring[0];
  const busiestMonth = [...growth].sort((a, b) => b.count - a.count)[0];

  const stats = [
    { label: "Sessions", value: String(entries.length) },
    { label: "Overall Alignment", value: overall !== null ? `${overall}%` : "—" },
    { label: "Most Seen Card", value: topCard ? topCard.name : "—" },
    { label: "Busiest Month", value: busiestMonth ? `${busiestMonth.label} (${busiestMonth.count})` : "—" },
  ];

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-8 overscroll-none">
      <div className="text-center pt-4">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">Your Journey</h1>
        <p className="text-muted-foreground mt-2 font-body text-sm max-w-md mx-auto">
          Every session with the Oracle, in the order it happened — the questions you carried, the advice she gave, and the patterns forming underneath.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="lux-card rounded-xl p-4 text-center">
            <div className="text-sm uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="font-display text-lg sm:text-xl text-gold-leaf mt-1.5 leading-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlignmentTrendChart data={trend} />
        <ReadingGrowthChart data={growth} />
      </div>
      {recurring.length > 0 && <RecurringCardsChart data={recurring} />}

      <hr className="gold-hairline" />

      <div>
        <h2 className="font-display text-xl text-gold-leaf uppercase tracking-[0.15em] mb-5">The Thread</h2>
        <TimelineList entries={chronological} />
      </div>
    </div>
    </PullToRefresh>
  );
}