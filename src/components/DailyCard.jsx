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
    const previous = memory;
    try {
      if (memory) {
        setMemory({ ...memory, ...fields });
        await base44.entities.OracleMemory.update(memory.id, fields);
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
      setMemory(previous);
    }
    setBusy(false);
  };

  return (
    <div className="neo-panel" style={{ background: "linear-gradient(110deg, rgba(34,15,58,.9), rgba(5,5,7,.93))", padding: "30px 40px" }}>
      <div>
        <label className="block" style={{ color: "#00e5ff", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>Today's Card</label>
        <p className="mt-2.5 italic" style={{ color: "#a9a18f", fontSize: 13 }}>
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
        <div className="flex items-center justify-between gap-6 mt-4">
          <button onClick={drawDaily} disabled={busy} className="neo-button flex items-center gap-2 px-8">
            <Sparkles className="w-4 h-4" />
            {busy ? "Drawing…" : "Draw Today's Card"}
          </button>
          <span style={{ fontSize: 66, color: "#d4af37", textShadow: "0 0 25px #d4af37", animation: "breathe 4s ease-in-out infinite" }}>✦</span>
        </div>
      )}
    </div>
  );
}