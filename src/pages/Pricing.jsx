import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PricingCards from "@/components/PricingCards";
import { Crown } from "lucide-react";

export default function Pricing() {
  const [entitlement, setEntitlement] = useState(null);
  const [readingsUsed, setReadingsUsed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  const loadEntitlement = async () => {
    try {
      const [rowsRes, usedRes] = await Promise.allSettled([
        base44.entities.Entitlement.list("-updated_date", 1),
        base44.entities.JournalEntry.count(),
      ]);
      if (rowsRes.status === "fulfilled") {
        const rows = rowsRes.value;
        setEntitlement(rows && rows.length ? rows[0] : null);
      } else console.error(rowsRes.reason);
      if (usedRes.status === "fulfilled" && typeof usedRes.value === "number") setReadingsUsed(usedRes.value);
    } catch (e) {
      console.error(e);
    }
    setLoaded(true);
  };

  useEffect(() => { loadEntitlement(); }, []);

  const isPremium = entitlement?.plan === "premium";

  const handleCancel = async () => {
    setCanceling(true);
    setCancelMessage("");
    try {
      await base44.functions.invoke("cancelSubscription", {});
      await loadEntitlement();
      setCancelMessage("Auto-renewal is off. Your premium access stays on until the end of the billing period.");
    } catch (e) {
      setCancelMessage(e?.response?.data?.error || e?.message || "Couldn't cancel — try again.");
    }
    setCanceling(false);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center pt-4">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">
          Pricing
        </h1>
        <p className="text-muted-foreground mt-2 font-body text-sm max-w-md mx-auto">
          Your first three readings are free. After that, go unlimited or pay per reading.
        </p>
      </div>

      <hr className="gold-hairline" />

      <div className="neo-panel">
        <h2 className="neo-label mt-0 mb-3">Your Balance</h2>
        {!loaded ? (
          <p className="neo-note">Checking your balance…</p>
        ) : isPremium ? (
          <div className="flex items-center gap-3">
            <Crown className="w-4 h-4" style={{ color: "#d4af37" }} />
            <span className="neo-note">
              Premium — unlimited readings
              {entitlement.status === "ending" ? " (auto-renewal off, ends this billing cycle)" : ""}.
            </span>
          </div>
        ) : (
          <p className="neo-note">
            {entitlement.credits || 0} reading credit{(entitlement.credits || 0) === 1 ? "" : "s"} left. Each reading uses one.
          </p>
        )}
        {cancelMessage && <p className="neo-note mt-3">{cancelMessage}</p>}
      </div>

      {isPremium ? (
        <div className="flex justify-center">
          <button onClick={handleCancel} disabled={canceling} className="neo-pill px-6 py-2.5">
            {canceling ? "Canceling…" : "Cancel Auto-Renewal"}
          </button>
        </div>
      ) : (
        <PricingCards />
      )}
    </div>
  );
}