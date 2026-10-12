import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Public return page after Wix checkout. The webhook may land before, during,
// or after this redirect — so we show a pending state and poll briefly. The
// webhook itself is the source of truth and activates the grant even if the
// buyer closed this tab.
export default function ThankYou() {
  const [state, setState] = useState("confirming"); // confirming | ready | slow
  const pollsLeft = useRef(10);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      let ready = false;
      try {
        // RLS returns only this buyer's entitlement rows.
        const rows = await base44.entities.Entitlement.list("-updated_date", 1);
        const ent = rows && rows.length ? rows[0] : null;
        if (ent && (ent.plan === "premium" || (ent.credits || 0) > 0)) ready = true;
      } catch (_) {
        // Not signed in or not yet granted — keep polling.
      }
      if (cancelled) return;
      if (ready) { setState("ready"); return; }
      pollsLeft.current -= 1;
      if (pollsLeft.current <= 0) { setState("slow"); return; }
      setTimeout(tick, 3000);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center text-center min-h-screen px-4"
      style={{ background: "var(--void-deep)" }}
    >
      {state === "ready" ? (
        <>
          <h1 className="font-display text-3xl text-gold-leaf uppercase tracking-[0.2em]">
            Payment Received
          </h1>
          <p className="text-muted-foreground mt-3 text-sm max-w-md font-body">
            Your readings are unlocked. The Oracle is waiting.
          </p>
          <Link to="/" className="neo-button px-8 mt-6">Back to the Oracle</Link>
        </>
      ) : state === "slow" ? (
        <>
          <h1 className="font-display text-3xl text-gold-leaf uppercase tracking-[0.2em]">
            Thank You
          </h1>
          <p className="text-muted-foreground mt-3 text-sm max-w-md font-body">
            Your payment is still confirming — credits are added automatically the moment it clears. Refresh this page or check Pricing in a minute.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/pricing" className="neo-button px-6">Check Pricing</Link>
            <Link to="/" className="neo-pill px-6 py-2.5">Back to the Oracle</Link>
          </div>
        </>
      ) : (
        <>
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }}
          />
          <h1 className="font-display text-3xl text-gold-leaf uppercase tracking-[0.2em] mt-6">
            Thank You
          </h1>
          <p className="text-muted-foreground mt-3 text-sm font-body">Confirming your payment…</p>
        </>
      )}
    </div>
  );
}