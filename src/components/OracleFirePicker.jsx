import React from "react";

const OPTIONS = [
  { id: "dance", label: "Dancing fire" },
  { id: "gold", label: "Gold" },
  { id: "violet", label: "Violet" },
  { id: "azure", label: "Azure" },
  { id: "ember", label: "Ember red" },
  { id: "emerald", label: "Emerald" },
];

const SWATCH = {
  dance: "linear-gradient(100deg,#d4af37,#e8354f,#4a7fb5,#3f8f5f,#8b5fbf)",
  gold: "#d4af37",
  violet: "#8b5fbf",
  azure: "#4a7fb5",
  ember: "#e8354f",
  emerald: "#3f8f5f",
};

// The seeker's chosen fire: "dance" cycles all five flames, every other
// option holds its single color.
export default function OracleFirePicker({ value, onChange }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(212,175,55,.25)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="neo-label m-0" style={{ fontSize: 13 }}>Oracle Fire</h2>
        <div className="flex flex-wrap gap-2 justify-end">
          {OPTIONS.map((o) => (
            <button key={o.id} type="button" aria-pressed={value === o.id}
              aria-label={`${o.label} oracle fire`}
              onClick={() => onChange(o.id)}
              className={`neo-pill-gold ${value === o.id ? "is-active" : ""}`}>
              <span aria-hidden="true" className="inline-block rounded-full align-middle mr-2"
                style={{ width: 10, height: 10, background: SWATCH[o.id] }} />
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}