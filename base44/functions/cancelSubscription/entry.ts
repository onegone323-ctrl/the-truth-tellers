import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

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

    const apiKey = Deno.env.get("WIX_CHECKOUT_API_KEY");
    const siteId = Deno.env.get("WIX_CHECKOUT_SITE_ID");
    if (!apiKey || !siteId) {
      console.error("cancelSubscription: Wix payment config not set");
      return Response.json({ error: "Payments not configured" }, { status: 500 });
    }

    const ents = await base44.entities.Entitlement.filter({ user_id: user.id });
    const ent = ents && ents.length ? ents[0] : null;
    if (!ent || ent.plan !== "premium" || !ent.subscription_id) {
      return Response.json({ error: "No active subscription to cancel" }, { status: 400 });
    }

    const cancel = (immediate) =>
      fetch(
        `https://www.wixapis.com/payments/base44/v1/subscriptions/${ent.subscription_id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "wix-site-id": siteId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription_id: ent.subscription_id,
            immediate,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

    // Soft cancel first — the buyer keeps the period they already paid for.
    let res = await cancel(false);
    if (!res.ok) {
      const detail = await res.text();
      console.warn("cancelSubscription: soft cancel failed, forcing immediate", detail.slice(0, 300));
      res = await cancel(true);
      if (!res.ok) {
        const detail2 = await res.text();
        console.error("cancelSubscription: immediate cancel failed", detail2.slice(0, 300));
        return Response.json({ error: "Could not cancel subscription — try again." }, { status: 502 });
      }
      // Immediate: access ends now.
      await base44.asServiceRole.entities.Entitlement.update(ent.id, {
        plan: "",
        status: "canceled",
      });
      return Response.json({ ok: true, mode: "immediate" });
    }

    // Soft cancel: premium stays on until the cycle ends.
    await base44.asServiceRole.entities.Entitlement.update(ent.id, {
      status: "ending",
    });
    return Response.json({ ok: true, mode: "soft" });
  } catch (err) {
    console.error("cancelSubscription: unhandled error", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}