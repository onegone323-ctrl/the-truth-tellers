import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { ShoppingBag } from "lucide-react";

// One merchandise product. The buyer picks a quantity and orders — checkout
// is started through the shared create-checkout function, which resolves the
// real price server-side from the Merchandise entity (the client only sends
// the product id as "merch:<id>").
export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const order = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("create-checkout", {
        productId: `merch:${product.id}`,
        quantity: qty,
      });
      const redirectUrl = res?.data?.redirectUrl;
      if (!redirectUrl) throw new Error("Checkout could not start — try again.");
      window.location.href = redirectUrl;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Checkout could not start — try again.");
      setBusy(false);
    }
  };

  return (
    <div className="neo-panel flex flex-col p-0 overflow-hidden">
      <div
        className="relative"
        style={{ aspectRatio: "1 / 1", background: "linear-gradient(160deg, rgba(20,16,12,0.9), rgba(8,8,12,0.95))" }}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            fittingType="fill"
            alt={product.name}
            className="w-full h-full"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "rgba(212,175,55,0.4)", fontFamily: "var(--font-display)", fontSize: 40 }}
            aria-hidden="true"
          >
            ✦
          </div>
        )}
        {product.featured && (
          <span
            className="gold-pill text-gold-leaf absolute top-2 left-2 px-2 py-0.5"
            style={{ fontSize: 10, letterSpacing: 2, lineHeight: 1.4 }}
          >
            FEATURED
          </span>
        )}
        {product.in_stock === false && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <span className="neo-note m-0" style={{ letterSpacing: 3, textTransform: "uppercase" }}>
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="neo-note m-0" style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
          {product.category}
        </span>
        <h3
          className="font-display text-gold-leaf m-0 mt-1"
          style={{ fontSize: 20, letterSpacing: "0.04em", lineHeight: 1.15 }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p className="neo-note mt-2 flex-1" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {product.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span style={{ color: "#eadfbf", fontSize: 22, fontWeight: 600 }}>
            ${product.price}
          </span>
          {product.in_stock !== false && (
            <div className="flex items-center" style={{ border: "1px solid var(--neo-border)", borderRadius: 4 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-2 py-1"
                style={{ color: "#d4af37", fontSize: 16, lineHeight: 1, minHeight: 36 }}
                aria-label="Decrease quantity"
                type="button"
              >
                −
              </button>
              <span style={{ color: "#eadfbf", fontSize: 14, minWidth: 28, textAlign: "center" }}>{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="px-2 py-1"
                style={{ color: "#d4af37", fontSize: 16, lineHeight: 1, minHeight: 36 }}
                aria-label="Increase quantity"
                type="button"
              >
                +
              </button>
            </div>
          )}
        </div>

        <button
          onClick={order}
          disabled={busy || product.in_stock === false}
          className="neo-button w-full mt-3 flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {busy ? "Opening checkout…" : product.in_stock === false ? "Sold Out" : "Order Now"}
        </button>
        {error && (
          <p className="neo-note mt-2 text-center" style={{ color: "#c0392b", fontSize: 12 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}