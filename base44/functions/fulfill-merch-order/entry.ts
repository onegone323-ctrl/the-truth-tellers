import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { createPrintfulOrder } from "../../shared/printful.ts";

// Admin-only: re-send a paid merch order to Printful. Used when an order's
// automatic fulfillment failed (e.g. the product wasn't mapped to a Printful
// variant yet, or the address was missing at webhook time) so the keeper can
// push it through once the issue is fixed.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const purchaseId = String(body.purchaseId || "");
    if (!purchaseId) {
      return Response.json({ error: "purchaseId is required" }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const purchase = await db.entities.Base44Purchase.get(purchaseId).catch(() => null);
    if (!purchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }
    if (!String(purchase.productId || "").startsWith("merch:")) {
      return Response.json({ error: "Not a merch order" }, { status: 400 });
    }
    if (purchase.fulfillment_status === "sent") {
      return Response.json({ ok: true, message: "Already sent to Printful." });
    }

    const merchId = String(purchase.productId).slice(5);
    const merch = await db.entities.Merchandise.get(merchId).catch(() => null);
    if (!merch || !merch.printful_variant_id) {
      return Response.json({ error: "Product is not mapped to a Printful variant — set printful_variant_id first." }, { status: 400 });
    }

    let recipient: any = null;
    try {
      recipient = purchase.shipping_address ? JSON.parse(purchase.shipping_address) : null;
    } catch (_) {
      recipient = null;
    }
    if (!recipient || !recipient.address1) {
      return Response.json({ error: "No shipping address on file — this order must be re-triggered from a fresh webhook." }, { status: 400 });
    }

    const result = await createPrintfulOrder({
      apiKey: secrets.get("PRINTFUL_API_KEY") || "",
      externalId: purchase.id,
      recipient,
      items: [{ variantId: String(merch.printful_variant_id), quantity: purchase.quantity || 1, name: merch.name }],
    });

    await db.entities.Base44Purchase.update(purchase.id, {
      fulfillment_id: result?.id || "",
      fulfillment_status: result?.id ? "sent" : "failed",
    });

    return Response.json({ ok: !!result?.id, fulfillmentId: result?.id || null });
  } catch (err) {
    console.error("fulfill-merch-order: unhandled error", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}