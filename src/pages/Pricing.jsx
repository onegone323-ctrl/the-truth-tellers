import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PricingCards from "@/components/PricingCards";
import { Crown } from "lucide-react";

export default function Pricing() {
  const [entitlement, setEntitlement] = useState(null);
  const [readingsUsed, setReadingsUsed] = useState(0);
  const [role, setRole] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  const loadEntitlement = async () => {
    try {
      const [rowsRes, usedRes, meRes] = await Promise.allSettled([
        base44.entities.Entitlement.list("-updated_date", 1),
        base44.entities.JournalEntry.count(),
        base44.auth.me(),
      ]);
      if (meRes.status === "fulfilled") setRole(meRes.value?.role || "");
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

  const isAdmin = role === "admin";
  const isPremium = entitlement?.plan === "premium";

  const handleCancel = async () => {
    setCanceling(true);
    setCancelMessage("");
    // Optimistic: flip the status now; roll back if the API refuses.
    const prev = entitlement;
    if (prev) setEntitlement({ ...prev, status: "ending" });
    try {
      await base44.functions.invoke("cancelSubscription", {});
      await loadEntitlement();
      setCancelMessage("Auto-renewal is off. Your premium access stays on until the end of the billing period.");
    } catch (e) {
      if (prev) setEntitlement(prev);
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
          Your first reading is free. After that, each reading opens and then cuts off — go unlimited or pay per reading to hear the whole truth.
        </p>
      </div>

      <hr className="gold-hairline" />

      <div className="neo-panel">
        <h2 className="neo-label mt-0 mb-3">Your Balance</h2>
        {!loaded ? (
          <p className="neo-note">Checking your balance…</p>
        ) : isAdmin ? (
          <div className="flex items-center gap-3">
            <Crown className="w-4 h-4" style={{ color: "#d4af37" }} />
            <span className="neo-note">Admin account — everything unlocked, readings always free.</span>
          </div>
        ) : isPremium ? (
          <div className="flex items-center gap-3">
            <Crown className="w-4 h-4" style={{ color: "#d4af37" }} />
            <span className="neo-note">
              Premium — unlimited readings
              {entitlement.status === "ending" ? " (auto-renewal off, ends this billing cycle)" : ""}.
            </span>
          </div>
        ) : readingsUsed < 1 ? (
          <p className="neo-note">
            Your first reading is free — no purchase needed.
            {(entitlement?.credits || 0) > 0
              ? ` Plus ${(entitlement.credits || 0)} bought credit${(entitlement.credits || 0) === 1 ? "" : "s"}.`
              : ""}
          </p>
        ) : entitlement === null ? (
          <p className="neo-note">
            Your free reading is used up — every reading now cuts off after a short preview. Buy below to hear the whole reading.
          </p>
        ) : (entitlement.credits || 0) < 1 ? (
          <p className="neo-note">
            Every reading opens free, then cuts off after a short preview — buy credits below to hear the whole reading.
          </p>
        ) : (
          <p className="neo-note">
            {entitlement.credits || 0} reading credit{(entitlement.credits || 0) === 1 ? "" : "s"} left. Each reading uses one.
          </p>
        )}
        {cancelMessage && <p className="neo-note mt-3">{cancelMessage}</p>}
      </div>

      {isAdmin ? null : isPremium ? (
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