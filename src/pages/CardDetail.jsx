import React from "react";
import { CARDS } from "@/lib/tarotData";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import useGoBack from "@/hooks/useGoBack";

const SUIT_GLYPH = { Wands: "♣", Cups: "♥", Swords: "♠", Pentacles: "♦", Major: "✶" };

export default function CardDetail() {
  const { name } = useParams();
  const goBack = useGoBack("/cards");
  const card = CARDS.find((c) => c.name === name);

  if (!card) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <p className="font-serif text-lg">That card isn't in the deck.</p>
        <button onClick={goBack}
          className="mt-4 px-6 py-2 min-h-[44px] rounded-full gold-pill text-gold-leaf text-sm uppercase tracking-widest">
          Back to the Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={goBack} aria-label="Back to the Library"
        className="flex items-center gap-2 min-h-[44px] text-sm uppercase tracking-widest text-muted-foreground hover:text-gold-leaf transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to the Library
      </button>

      <div className="lux-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ color: "#d4af37", fontSize: 32 }}>{SUIT_GLYPH[card.arcana === "Major" ? "Major" : card.suit]}</span>
          <div>
            <h2 className="font-display text-2xl text-gold-leaf">{card.name}</h2>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              {card.arcana === "Major" ? "Major Arcana" : `${card.suit} · ${card.element}`}
            </p>
          </div>
          {card.arcana === "Major" && <Sparkles className="w-4 h-4 ml-auto" style={{ color: "#d4af37" }} />}
        </div>
        <hr className="gold-hairline my-3" />
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gold-leaf text-sm uppercase tracking-widest mb-1">Upright</div>
            <p className="text-foreground/90 font-body">{card.upright}</p>
          </div>
          <div>
            <div className="uppercase tracking-widest mb-1 text-sm" style={{ color: "#c0392b" }}>Reversed</div>
            <p className="text-foreground/80 font-body">{card.reversed}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {card.keywords.map((k) => (
              <span key={k} className="text-sm px-2.5 py-1 rounded-full gold-pill text-muted-foreground">{k}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}