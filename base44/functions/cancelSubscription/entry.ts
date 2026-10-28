import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { cancelSubscriptionAtWix, isValidSubscriptionId } from "../../shared/wixSubscription.ts";

// Buyer-facing: soft-cancels (turns off auto-renewal on) the signed-in user's
// premium subscription via the Wix subscription API. On soft cancel the buyer
// keeps premium access until the end of the paid cycle (the
// subscription_canceled/expired webhook later revokes it); if soft cancel isn't
// possible, we fall back to immediate cancellation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const ents = await base44.entities.Entitlement.filter({ user_id: user.id });
    const ent = ents && ents.length ? ents[0] : null;
    if (!ent || ent.plan !== "premium" || !ent.subscription_id) {
      return Response.json({ error: "No active subscription to cancel" }, { status: 400 });
    }

    // A cancel already in motion must not hit the provider again — a repeat
    // request just confirms it, instead of hammering Wix once per call.
    if (ent.status === "ending" || ent.status === "canceled") {
      return Response.json({ ok: true, mode: "soft" });
    }

    // The id goes into the provider URL — only a plain id may pass.
    if (!isValidSubscriptionId(ent.subscription_id)) {
      console.error("cancelSubscription: malformed subscription id", { entitlementId: ent.id });
      return Response.json({ error: "Could not cancel subscription — try again." }, { status: 502 });
    }

    // Soft cancel first — the buyer keeps the period they already paid for.
    const mode = await cancelSubscriptionAtWix(ent.subscription_id);
    if (!mode) {
      return Response.json({ error: "Could not cancel subscription — try again." }, { status: 502 });
    }

    if (mode === "immediate") {
      // Immediate: access ends now.
      await base44.asServiceRole.entities.Entitlement.update(ent.id, {
        plan: "",
        status: "canceled",
      });
    } else {
      // Soft cancel: premium stays on until the cycle ends.
      await base44.asServiceRole.entities.Entitlement.update(ent.id, {
        status: "ending",
      });
    }
    return Response.json({ ok: true, mode });
  } catch (err) {
    // Log the real cause server-side; never echo internal details to callers.
    console.error("cancelSubscription: unhandled error", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}