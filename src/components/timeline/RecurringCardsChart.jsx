import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// The cards that keep popping up — gold = upright visits, red = reversed visits.
export default function RecurringCardsChart({ data }) {
  const top = data.slice(0, 8);
  return (
    <div className="lux-card rounded-xl p-4 sm:p-5">
      <div className="text-xs uppercase tracking-widest text-gold-leaf/80 mb-1">What Keeps Popping Up</div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Most-visited cards across all readings. Red = how often they arrived reversed.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(220, top.length * 32)}>
        <BarChart data={top} layout="vertical" margin={{ top: 5, right: 12, left: 10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(212,175,55,0.08)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "#a8a29e", fontSize: 10 }} stroke="rgba(212,175,55,0.2)" />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#d4c8a8", fontSize: 10 }} stroke="rgba(212,175,55,0.2)" />
          <Tooltip
            contentStyle={{ background: "#0a0a0f", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, fontSize: 12 }}
            cursor={{ fill: "rgba(212,175,55,0.06)" }}
          />
          <Bar dataKey="upright" name="Upright" stackId="a" fill="#d4af37" radius={[0, 0, 0, 0]} />
          <Bar dataKey="reversed" name="Reversed" stackId="a" fill="#c0392b" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}