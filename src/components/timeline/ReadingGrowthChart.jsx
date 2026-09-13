import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Cumulative readings per month — the growth curve of the seeker's journey.
export default function ReadingGrowthChart({ data }) {
  return (
    <div className="lux-card rounded-xl p-4 sm:p-5">
      <div className="text-sm uppercase tracking-widest text-gold-leaf/80 mb-1">Your Growth</div>
      <p className="text-sm text-muted-foreground mb-3">
        Total readings accumulated, month by month. A rising line means you keep showing up.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4af37" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#d4af37" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(212,175,55,0.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#a8a29e", fontSize: 14 }} stroke="rgba(212,175,55,0.2)" />
          <YAxis allowDecimals={false} tick={{ fill: "#a8a29e", fontSize: 14 }} stroke="rgba(212,175,55,0.2)" />
          <Tooltip
            contentStyle={{ background: "#0a0a0f", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, fontSize: 14 }}
            labelStyle={{ color: "#d4af37" }}
            formatter={(value, name) => (name === "cumulative" ? [value, "Total readings"] : [value, "Readings that month"])}
          />
          <Area type="monotone" dataKey="cumulative" stroke="#d4af37" strokeWidth={2} fill="url(#goldFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}