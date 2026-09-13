import React, { useState } from "react";
import { Plus, X, Wand2 } from "lucide-react";

// Lets the seeker name and build their own spread position-by-position.
export default function CustomSpreadBuilder({ onBuild }) {
  const [name, setName] = useState("");
  const [positions, setPositions] = useState(["The Heart of the Matter"]);
  const [draft, setDraft] = useState("");

  const addPos = () => {
    const v = draft.trim();
    if (!v) return;
    setPositions((p) => [...p, v]);
    setDraft("");
  };
  const removePos = (i) => setPositions((p) => p.filter((_, idx) => idx !== i));
  const build = () => {
    if (positions.length === 0) return;
    onBuild({
      id: "custom",
      name: name.trim() || "Custom Spread",
      category: "Custom",
      description: `${positions.length} position${positions.length > 1 ? "s" : ""} of your own design.`,
      positions,
    });
  };

  return (
    <div className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your spread"
        className="w-full bg-black/50 rounded-lg px-3 py-2 text-sm font-serif outline-none"
        style={{ border: "1px solid rgba(212,175,55,0.25)" }} />

      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPos(); } }}
          placeholder="Add a position (e.g. 'What I Fear')"
          className="flex-1 bg-black/50 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ border: "1px solid rgba(212,175,55,0.25)" }} />
        <button onClick={addPos} aria-label="Add position" className="gold-pill min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gold-leaf"><Plus className="w-4 h-4" /></button>
      </div>

      {positions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {positions.map((p, i) => (
            <span key={i} className="gold-pill pl-3 pr-1 rounded-full text-sm font-serif flex items-center gap-1.5 min-h-[44px]">
              <span className="text-muted-foreground">{i + 1}.</span> {p}
              <button onClick={() => removePos(i)} aria-label={`Remove position ${p}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-accent"><X className="w-4 h-4" /></button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Add at least one position to build your spread.</p>
      )}

      <button onClick={build} disabled={positions.length === 0}
        className="w-full py-2.5 min-h-[44px] rounded-full text-sm uppercase tracking-widest gold-pill text-gold-leaf disabled:opacity-40 flex items-center justify-center gap-2">
        <Wand2 className="w-3.5 h-3.5" /> Build &amp; Use This Spread
      </button>
    </div>
  );
}