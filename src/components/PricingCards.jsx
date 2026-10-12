import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Crown, Layers, Zap } from "lucide-react";

// Mirrors base44/shared/products.ts (frontend copy — the authoritative price
// resolution is server-side in create-checkout; the client only sends the id).
const PRODUCTS = [
  { id: "premium-monthly", name: "Premium Monthly", price: "$9.99 / month", tagline: "Unlimited readings — every spread, every deck, every day.", icon: Crown, featured: true },
  { id: "credits-10", name: "10 Reading Credits", price: "$8.99", tagline: "Ten full readings, any spread and deck.", icon: Layers },
  { id: "credits-5", name: "5 Reading Credits", price: "$4.99", tagline: "Five full readings, any spread and deck.", icon: Layers },
  { id: "single-reading", name: "Single Reading", price: "$1.99", tagline: "One full reading, whenever you need the truth.", icon: Zap },
];

export default function PricingCards() {
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState("");

  const buy = async (productId) => {
    setBuyingId(productId);
    setError("");
    try {
      const res = await base44.functions.invoke("create-checkout", { productId });
      const redirectUrl = res?.data?.redirectUrl;
      if (!redirectUrl) throw new Error("Checkout could not start — try again.");
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Checkout could not start — try again.");
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="neo-panel flex flex-col"
              style={p.featured ? { borderColor: "rgba(212,175,55,0.85)" } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: "#d4af37" }} />
                <h3 className="neo-label m-0">{p.name}</h3>
                {p.featured && (
                  <span className="gold-pill text-gold-leaf px-2 py-0.5 ml-auto" style={{ fontSize: 10 }}>
                    Best value
                  </span>
                )}
              </div>
              <div style={{ color: "#eadfbf", fontSize: 28, fontWeight: 600 }}>{p.price}</div>
              <p className="neo-note mt-2 mb-4 flex-1">{p.tagline}</p>
              <button
                onClick={() => buy(p.id)}
                disabled={buyingId !== null}
                className="neo-button w-full"
              >
                {buyingId === p.id ? "Opening checkout…" : "Buy Now"}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="neo-note text-center" style={{ color: "#c0392b" }}>{error}</p>}
      <p className="neo-note text-center">
        You'll be redirected to a secure checkout page. Credits are added automatically the moment your payment clears.
      </p>
    </div>
  );
}