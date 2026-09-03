import React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea,
} from "recharts";

// Alignment per reading over time — the danger zone (mostly reversed cards) is shaded red.
export default function AlignmentTrendChart({ data }) {
  return (
    <div className="lux-card rounded-xl p-4 sm:p-5">
      <div className="text-xs uppercase tracking-widest text-gold-leaf/80 mb-1">Alignment Trend</div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Upright energy per reading. Shaded band = danger zone (mostly reversed cards).
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(212,175,55,0.08)" vertical={false} />
          <ReferenceArea y1={0} y2={40} fill="#c0392b" fillOpacity={0.12} />
          <XAxis dataKey="date" tick={{ fill: "#a8a29e", fontSize: 10 }} stroke="rgba(212,175,55,0.2)" />
          <YAxis domain={[0, 100]} tick={{ fill: "#a8a29e", fontSize: 10 }} stroke="rgba(212,175,55,0.2)" unit="%" />
          <Tooltip
            contentStyle={{ background: "#0a0a0f", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#d4af37" }}
            formatter={(value) => [`${value}% upright`, "Alignment"]}
          />
          <Line type="monotone" dataKey="ratio" stroke="#d4af37" strokeWidth={2}
            dot={{ fill: "#f5e6b8", r: 3, stroke: "#d4af37" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}