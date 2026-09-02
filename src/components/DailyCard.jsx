import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CARDS, DECKS, getCardByName } from "@/lib/tarotData";
import CardFace from "@/components/CardFace";
import { Sparkles } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

// Today's Card — one free draw every 24 hours, for quick daily guidance.
export default function DailyCard({ memory, setMemory, userName }) {
  const [busy, setBusy] = useState(false);
  const [justDrawn, setJustDrawn] = useState(false);
  const [, setTick] = useState(0);

  // Re-check the 24h window every minute so the reset happens live.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const drawnAt = memory?.daily_drawn_at ? new Date(memory.daily_drawn_at).getTime() : 0;
  const fresh = drawnAt && Date.now() - drawnAt < DAY_MS;
  const msLeft = fresh ? DAY_MS - (Date.now() - drawnAt) : 0;
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);

  const cardInfo = fresh ? getCardByName(memory.daily_card) : null;
  const isReversed = fresh ? !!memory.daily_reversed : false;

  const drawDaily = async () => {
    if (busy || fresh) return;
    setBusy(true);
    const pick = CARDS[Math.floor(Math.random() * CARDS.length)];
    const reversed = Math.random() < 0.5;
    const fields = {
      daily_card: pick.name,
      daily_reversed: reversed,
      daily_drawn_at: new Date().toISOString(),
    };
    try {
      if (memory) {
        await base44.entities.OracleMemory.update(memory.id, fields);
        setMemory({ ...memory, ...fields });
      } else {
        const created = await base44.entities.OracleMemory.create({
          user_name: userName || "",
          summary: "Daily card pulls so far.",
          ...fields,
        });
        setMemory(created);
      }
      setJustDrawn(true);
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  };

  return (
    <div className="lux-card rounded-xl p-6 max-w-xl mx-auto">
      <div className="text-center">
        <label className="text-xs uppercase tracking-widest text-gold-leaf/80">Today's Card</label>
        <p className="text-[11px] text-muted-foreground italic mt-1">
          {fresh
            ? "One card a day. Come back when the window resets."
            : "A single card for quick daily guidance — free once every 24 hours."}
        </p>
      </div>

      {fresh && cardInfo ? (
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
          <CardFace
            card={{ name: cardInfo.name, reversed: isReversed, position: "Today", card: cardInfo }}
            deck={DECKS[0]}
            index={0}
            revealed={!justDrawn}
          />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-xl" style={{ color: "#f5e6b8" }}>
              {cardInfo.name}{isReversed ? " — Reversed" : ""}
            </h3>
            <p className="text-sm text-foreground/85 mt-2 leading-relaxed">
              {isReversed ? cardInfo.reversed : cardInfo.upright}
            </p>
            <p className="text-[11px] text-muted-foreground mt-3">
              New card in {hoursLeft}h {minsLeft}m
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="rounded-lg flex items-center justify-center"
            style={{
              width: 110, height: 180,
              background: "linear-gradient(145deg, #1a0306, #3a0810 50%, #1a0306)",
              border: "1.5px solid #d4af37",
              boxShadow: "0 10px 30px rgba(0,0,0,0.7), 0 0 12px rgba(212,175,55,0.2)",
            }}>
            <span style={{ fontSize: 40, color: "#d4af37", opacity: 0.8 }}>✦</span>
          </div>
          <button onClick={drawDaily} disabled={busy}
            className="px-8 py-2.5 rounded-full text-xs uppercase tracking-[0.2em] font-display transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(160deg, rgba(120,20,30,0.7), rgba(60,10,15,0.9))",
              border: "1px solid rgba(212,175,55,0.6)",
              color: "#f5e6b8",
              boxShadow: "0 0 20px rgba(192,57,43,0.3)",
            }}>
            <Sparkles className="w-4 h-4 inline mr-2" />
            {busy ? "Drawing…" : "Draw Today's Card"}
          </button>
        </div>
      )}
    </div>
  );
}