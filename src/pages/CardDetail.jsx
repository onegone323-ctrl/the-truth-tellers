import React from "react";
import { CARDS } from "@/lib/tarotData";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const SUIT_GLYPH = { Wands: "♣", Cups: "♥", Swords: "♠", Pentacles: "♦", Major: "✶" };

export default function CardDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const card = CARDS.find((c) => c.name === name);

  if (!card) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <p className="font-serif text-lg">That card isn't in the deck.</p>
        <button onClick={() => navigate("/cards")}
          className="mt-4 px-6 py-2 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest">
          Back to the Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={() => navigate("/cards")}
        className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold-leaf transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the Library
      </button>

      <div className="lux-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ color: "#d4af37", fontSize: 32 }}>{SUIT_GLYPH[card.arcana === "Major" ? "Major" : card.suit]}</span>
          <div>
            <h2 className="font-display text-2xl text-gold-leaf">{card.name}</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {card.arcana === "Major" ? "Major Arcana" : `${card.suit} · ${card.element}`}
            </p>
          </div>
          {card.arcana === "Major" && <Sparkles className="w-4 h-4 ml-auto" style={{ color: "#d4af37" }} />}
        </div>
        <hr className="gold-hairline my-3" />
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gold-leaf text-xs uppercase tracking-widest mb-1">Upright</div>
            <p className="text-foreground/90 font-body">{card.upright}</p>
          </div>
          <div>
            <div className="uppercase tracking-widest mb-1 text-xs" style={{ color: "#c0392b" }}>Reversed</div>
            <p className="text-foreground/80 font-body">{card.reversed}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {card.keywords.map((k) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full gold-pill text-muted-foreground">{k}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}