// Base44 Payments fulfillment webhook — base44/functions/payments-webhook/entry.ts
//
// Provided by the platform. Do NOT rewrite the plumbing (JWT verification, envelope parsing,
// purchase resolution, idempotency). Only edit the region marked
// `// ===== APP-SPECIFIC =====` to define what "grant access" means for this app.
//
// It receives Wix `ORDER_APPROVED` events (and optional subscription lifecycle events),
// verifies the RS256 JWT, resolves the buyer's pending Purchase by checkout id, and marks
// it paid exactly once. It pairs with `create-checkout`, which MUST persist
// `checkoutSession.id` on the Purchase — Wix has no custom-metadata field, so the checkout
// id is the ONLY correlation key back to this app's user.

import { createClientFromRequest } from "npm:@base44/sdk";
import { importSPKI, jwtVerify } from "npm:jose@5.9.6";
import { PRODUCTS } from "../../shared/products.ts";

// Wix event types (verbatim from Wix docs).
const ORDER_APPROVED = "wix.ecom.v1.order_approved";
const SUBSCRIPTION_CANCELED = "wix.ecom.subscription_contracts.v1.subscription_contract_canceled";
const SUBSCRIPTION_EXPIRED = "wix.ecom.subscription_contracts.v1.subscription_contract_expired";

// Unwrap Wix's triple-nested envelope: the request body is a JWT whose verified
// payload has a `data` JSON string; that parses to an envelope with `eventType` and
// another `data` JSON string; that parses to the event data, which for these events
// wraps the entity in a per-action wrapper (see extractOrder).
function parseWixEnvelope(payload: Record<string, unknown>): { eventType: string; eventData: any } {
  const outer = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
  // eventType lives on the parsed envelope; newer DomainEvent envelopes may also carry it as a
  // top-level JWT claim — fall back to that so the event isn't misrouted to the ignore branch.
  const eventType: string = outer?.eventType ?? (payload.eventType as string) ?? "";
  const eventData = typeof outer?.data === "string" ? JSON.parse(outer.data) : outer?.data;
  return { eventType, eventData };
}

// order_approved is an ACTION event: the order is at `actionEvent.body.order`
// (per the Wix docs' sample payload, where `order.checkoutId === checkoutSession.id`).
// The flat `order` / `entity` forms are fallbacks for the other envelope variants Wix emits.
function extractOrder(eventData: any): any | null {
  return eventData?.actionEvent?.body?.order ?? eventData?.order ?? eventData?.entity ?? null;
}

// The buyer's email, as entered on Wix's hosted checkout page. This is the ONLY identity for an
// anonymous buyer (one who wasn't signed in when create-checkout ran, so appUserId is null). Wix
// exposes it in a few places depending on the flow; check the common ones.
function extractBuyerEmail(order: any): string | null {
  return (
    order?.buyerInfo?.email ??
    order?.billingInfo?.contactDetails?.email ??
    order?.billingInfo?.email ??
    null
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Read per request, never at module scope: the key is stored when the webhook is registered, so
    // a warm isolate that captured it at startup would stay keyless and 500 every ORDER_APPROVED.
    const WEBHOOK_PUBLIC_KEY = Deno.env.get("WIX_CHECKOUT_WEBHOOK_PUBLIC_KEY");
    if (!WEBHOOK_PUBLIC_KEY) {
      // Never process an unverifiable event. Missing key = misconfiguration, not a retry case.
      console.error("payments-webhook: WIX_CHECKOUT_WEBHOOK_PUBLIC_KEY is not set");
      return new Response("Webhook not configured", { status: 500 });
    }

    // The raw body IS the JWT (Wix signs the whole payload, RS256).
    const token = await req.text();

    let payload: Record<string, unknown>;
    try {
      const key = await importSPKI(WEBHOOK_PUBLIC_KEY, "RS256");
      const verified = await jwtVerify(token, key);
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      // Signature invalid / malformed. Reject — do NOT grant anything.
      console.error("payments-webhook: JWT verification failed", err);
      return new Response("Invalid signature", { status: 401 });
    }

    const { eventType, eventData } = parseWixEnvelope(payload);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole; // No end user is authenticated on a webhook call.

    if (eventType === ORDER_APPROVED) {
      return await handleOrderApproved(db, eventData);
    }

    if (eventType === SUBSCRIPTION_CANCELED || eventType === SUBSCRIPTION_EXPIRED) {
      return await handleSubscriptionEnded(db, eventData);
    }

    // Unknown/irrelevant event — acknowledge so Wix stops retrying.
    console.log(`payments-webhook: ignoring event ${eventType}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    // Unexpected failure: 500 tells Wix to retry later (the handler is idempotent, so a
    // retry after a partial failure is safe).
    console.error("payments-webhook: unhandled error", err);
    return new Response("Internal error", { status: 500 });
  }
});

async function handleOrderApproved(db: any, eventData: any): Promise<Response> {
  const order = extractOrder(eventData);
  const checkoutId: string | undefined = order?.checkoutId;
  const orderId: string | undefined = order?.id;
  // Subscription id (if any) — persisted below so SUBSCRIPTION_CANCELED/EXPIRED can later
  // resolve this purchase by subscriptionId and revoke access.
  const subscriptionId: string | undefined = (order?.lineItems ?? [])
    .map((li: any) => li?.subscriptionInfo?.id)
    .find((id: any) => !!id);

  if (!checkoutId) {
    // Nothing to correlate on. Acknowledge to stop retries; log for investigation.
    console.error("payments-webhook: ORDER_APPROVED missing order.checkoutId", { orderId });
    return new Response("OK", { status: 200 });
  }

  // Resolve the pending purchase created by `create-checkout` (join key: checkoutSessionId).
  const matches = await db.entities.Base44Purchase.filter({ checkoutSessionId: checkoutId });
  const purchase = matches?.[0];

  if (!purchase) {
    // The pending Base44Purchase is written by create-checkout before the buyer pays, so a miss
    // here is a transient race (entity not yet visible) — return 500 so Wix retries, rather
    // than ACKing a paid order we can't fulfill. (Wix stops after its retry window.)
    console.warn("payments-webhook: no Base44Purchase for checkoutId yet, asking Wix to retry", { checkoutId, orderId });
    return new Response("Purchase not found yet", { status: 500 });
  }

  // IDEMPOTENCY + terminal states: Wix delivers ORDER_APPROVED more than once, and may deliver
  // a stale approval after a cancellation. Skip if already "paid" (prevents double-grant) or
  // "canceled" (a late approval must not resurrect a revoked subscription).
  if (purchase.status === "paid" || purchase.status === "canceled") {
    console.log("payments-webhook: purchase already terminal, skipping", { checkoutId, status: purchase.status });
    return new Response("OK", { status: 200 });
  }

  // The buyer's email: from create-checkout if they were signed in, otherwise from the Wix order
  // (the only identity an anonymous buyer has). Persisted below and used by the grant block.
  const buyerEmail: string | null = purchase.buyerEmail ?? extractBuyerEmail(order);

  // ===== APP-SPECIFIC =====
  // Grant what the buyer paid for: premium-monthly → premium plan, the credit
  // packs → N reading credits. Runs BEFORE the purchase is marked paid, so a
  // failure leaves it "pending" and Wix's retry re-runs this grant.
  const product = PRODUCTS[purchase.productId];
  if (!product) {
    console.error("payments-webhook: unknown productId on purchase", { purchaseId: purchase.id, productId: purchase.productId });
  } else {
    // Fulfillment target: the signed-in app user; otherwise the email the buyer
    // typed on the Wix checkout page.
    const targetFilter = purchase.appUserId
      ? { user_id: purchase.appUserId }
      : { email: (buyerEmail || "").toLowerCase() };
    const hasTarget = purchase.appUserId || (buyerEmail && buyerEmail.trim());
    if (!hasTarget) {
      console.error("payments-webhook: no fulfillment target for purchase", { purchaseId: purchase.id });
    } else {
      // IDEMPOTENCY: Wix can deliver duplicates CONCURRENTLY, so the "pending"
      // check and the grant pre-check below are not locks (TOCTOU). The
      // compare-and-set on the purchase status IS: exactly one concurrent
      // delivery can move "pending" → "fulfilling" (updated === 1); every
      // loser ACKs without granting. A loser may also be a LATER retry of a
      // run that claimed but died mid-grant — that recovery path re-claims
      // "fulfilling" below; the grant pre-check keeps a completed grant from
      // ever being applied twice.
      const appliedCount = (res: any) => {
        if (!res) return 0;
        return typeof res.updated === "number" ? res.updated : (res.count ?? res.modifiedCount ?? 0);
      };
      const claim = await db.entities.Base44Purchase.updateMany(
        { checkoutSessionId: purchase.checkoutSessionId, status: "pending" },
        { $set: { status: "fulfilling" } },
      );
      if (appliedCount(claim) === 0) {
        const fresh = await db.entities.Base44Purchase.filter({ checkoutSessionId: purchase.checkoutSessionId });
        const st: string = fresh?.[0]?.status ?? purchase.status;
        const grants = await db.entities.EntitlementGrant.filter({ purchase_id: purchase.id });
        if (st !== "fulfilling" || (grants && grants.length)) {
          // Already terminal, or another run granted (or is granting) — done.
          console.log("payments-webhook: duplicate delivery, skipping", { purchaseId: purchase.id, status: st });
          return new Response("OK", { status: 200 });
        }
        // Recovery: a previous run claimed but never finished. Re-claim and finish.
        const reClaim = await db.entities.Base44Purchase.updateMany(
          { checkoutSessionId: purchase.checkoutSessionId, status: { $in: ["pending", "fulfilling"] } },
          { $set: { status: "fulfilling" } },
        );
        if (appliedCount(reClaim) === 0) {
          console.log("payments-webhook: claim lost on recovery, skipping", { purchaseId: purchase.id });
          return new Response("OK", { status: 200 });
        }
      }
      // This point is reached by exactly one delivery per purchase claim.
      const grants = await db.entities.EntitlementGrant.filter({ purchase_id: purchase.id });
      if (grants && grants.length) {
        console.log("payments-webhook: grant already exists, skipping", { purchaseId: purchase.id });
      } else {
        await db.entities.EntitlementGrant.create({
          purchase_id: purchase.id,
          kind: purchase.productId,
          credits: product.credits,
        });

        const ents = await db.entities.Entitlement.filter(targetFilter);
        let ent = ents && ents.length ? ents[0] : null;
        if (!ent) {
          ent = await db.entities.Entitlement.create({
            user_id: purchase.appUserId ?? "",
            email: (buyerEmail || "").toLowerCase(),
            plan: "",
            credits: 0,
            status: "",
          });
        }
        if (product.subscription) {
          // Premium plan: set the writable plan field (never is_verified).
          await db.entities.Entitlement.update(ent.id, {
            plan: "premium",
            subscription_id: subscriptionId ?? ent.subscription_id ?? "",
            status: "active",
          });
        } else {
          // Credit pack / single reading: add N credits per unit purchased —
          // atomic $inc, so an increment can never be lost or double-read.
          await db.entities.Entitlement.updateMany(
            { id: ent.id },
            { $inc: { credits: product.credits * (purchase.quantity || 1) } },
          );
        }
        console.log("payments-webhook: granted", { purchaseId: purchase.id, kind: purchase.productId });
      }
    }
  }
  // ===== END APP-SPECIFIC =====

  // Mark paid LAST, so "paid" always implies the grant above completed. The idempotency
  // check at the top short-circuits on this status, so it must only be set after fulfillment.
  // subscriptionId is stored here so SUBSCRIPTION_CANCELED/EXPIRED can resolve this purchase.
  await db.entities.Base44Purchase.update(purchase.id, {
    status: "paid",
    orderId: orderId ?? purchase.orderId ?? null,
    subscriptionId: subscriptionId ?? purchase.subscriptionId ?? null,
    // Persist the buyer email (backfilled from the Wix order for anonymous buyers) so the record
    // always shows who paid, even when create-checkout had no signed-in user.
    buyerEmail: buyerEmail ?? purchase.buyerEmail ?? null,
    paidAt: new Date().toISOString(),
  });

  console.log("payments-webhook: fulfilled purchase", { purchaseId: purchase.id, checkoutId, orderId });
  return new Response("OK", { status: 200 });
}

async function handleSubscriptionEnded(db: any, eventData: any): Promise<Response> {
  // Canceled = ended early; Expired = ran all billing cycles. Both revoke access.
  // Mirrors the order path (actionEvent.body.<entity> first); keep the flat fallbacks since
  // the subscription contract webhook body isn't as tightly documented as order_approved.
  const contract =
    eventData?.actionEvent?.body?.subscriptionContract ??
    eventData?.subscriptionContract ??
    eventData?.entity ??
    null;
  const subscriptionId: string | undefined = contract?.id;

  if (!subscriptionId) {
    console.error("payments-webhook: subscription event missing contract id");
    return new Response("OK", { status: 200 });
  }

  const matches = await db.entities.Base44Purchase.filter({ subscriptionId });
  const purchase = matches?.[0];
  if (!purchase) {
    // The subscriptionId is written on the Purchase by the ORDER_APPROVED handler. If a
    // cancel/expire arrives before (or racing) that approval, no Purchase matches yet —
    // return 500 so Wix retries until the approval has linked it, instead of losing the
    // revoke by acking a not-yet-linkable event.
    console.warn("payments-webhook: no Purchase for subscription yet, asking Wix to retry", { subscriptionId });
    return new Response("Purchase not linkable yet", { status: 500 });
  }

  if (purchase.status === "canceled") {
    return new Response("OK", { status: 200 }); // Idempotent.
  }

  // ===== APP-SPECIFIC =====
  // Revoke the premium plan this subscription granted. Credits already bought
  // stay with the buyer — only unlimited access is removed.
  const ents = await db.entities.Entitlement.filter({ subscription_id: subscriptionId });
  const ent = ents && ents.length ? ents[0] : null;
  if (ent && ent.plan === "premium") {
    await db.entities.Entitlement.update(ent.id, { plan: "", status: "ended" });
    console.log("payments-webhook: revoked plan", { entitlementId: ent.id, subscriptionId });
  }
  // ===== END APP-SPECIFIC =====

  // Mark canceled LAST, so "canceled" always implies access was actually revoked.
  await db.entities.Base44Purchase.update(purchase.id, {
    status: "canceled",
    canceledAt: new Date().toISOString(),
  });

  console.log("payments-webhook: revoked subscription", { purchaseId: purchase.id, subscriptionId });
  return new Response("OK", { status: 200 });
}