import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import ProductCard from "@/components/store/ProductCard";
import GoldSpinner from "@/components/GoldSpinner";

const CATEGORIES = ["All", "Apparel", "Home", "Stationery", "Accessories", "Prints"];

export default function Store() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const page = await base44.entities.Merchandise.filter(
          { in_stock: true },
          { sort: "-created_date", limit: 50 }
        );
        setItems(page?.items || []);
      } catch (e) {
        console.error(e);
      }
      setLoaded(true);
    })();
  }, []);

  const shown = category === "All" ? items : items.filter((i) => i.category === category);

  return (
    <div className="space-y-6">
      <div className="text-center pt-2">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">
          The Oracle's Store
        </h1>
        <p className="text-muted-foreground mt-2 font-body text-sm max-w-md mx-auto">
          Wear the truth. Carry the omens. Merchandise forged in the dark-luxury of the Oracle's realm.
        </p>
      </div>

      <hr className="gold-hairline" />

      <div className="flex flex-wrap gap-2 justify-center">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`neo-pill-gold ${category === c ? "is-active" : ""}`}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {!loaded ? (
        <GoldSpinner />
      ) : shown.length === 0 ? (
        <p className="neo-note text-center py-12">
          The store is being stocked — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="neo-note text-center">
        You'll be redirected to a secure checkout page. Shipping and address are collected at checkout.
      </p>
    </div>
  );
}