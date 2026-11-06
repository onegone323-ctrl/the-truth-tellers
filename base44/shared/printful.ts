// Printful fulfillment for merchandise orders.
// API reference: https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder
//
// The payments webhook calls createPrintfulOrder the moment a merch purchase
// is confirmed paid, so the order is sent to Printful automatically. The API
// key lives in the PRINTFUL_API_KEY secret and is passed in by the caller.

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  phone?: string | null;
  email?: string | null;
}

// Build a Printful recipient from a Wix ORDER_APPROVED order. Wix collects the
// shipping address on its checkout page; the webhook carries it on
// shippingInfo (preferred) or billingInfo. Returns null when the minimum
// fields Printful requires are missing — the caller then flags the order for
// manual fulfillment instead of sending a half-empty address.
export function buildRecipient(order: any, buyerEmail: string | null): PrintfulRecipient | null {
  const shipAddr = order?.shippingInfo?.address;
  const billAddr = order?.billingInfo?.address;
  const addr = shipAddr || billAddr;
  if (!addr) return null;
  const contact =
    order?.shippingInfo?.contactDetails ||
    order?.billingInfo?.contactDetails ||
    {};
  const first = contact.firstName || order?.buyerInfo?.firstName || "";
  const last = contact.lastName || order?.buyerInfo?.lastName || "";
  const name = `${first} ${last}`.trim();
  const address1 = addr.addressLine || addr.street || "";
  const city = addr.city || "";
  const stateCode = addr.subdivision || addr.state || addr.stateCode || "";
  const countryCode = addr.country || "";
  const zip = addr.postalCode || addr.zip || "";
  if (!name || !address1 || !city || !countryCode || !zip) return null;
  return {
    name,
    address1,
    address2: addr.addressLine2 || null,
    city,
    state_code: stateCode,
    country_code: countryCode,
    zip,
    phone: contact.phone || null,
    email: buyerEmail || null,
  };
}

// Create one Printful order for a merch purchase. Best-effort and never throws:
// returns { id } on success, null on any failure (the caller marks the purchase
// paid regardless and flags failures for manual retry). external_id is the
// purchase id, so duplicate deliveries resolve to the same Printful order.
export async function createPrintfulOrder(opts: {
  apiKey: string;
  externalId: string;
  recipient: PrintfulRecipient;
  items: Array<{ variantId: string; quantity: number; name: string }>;
}): Promise<{ id: string } | null> {
  const { apiKey, externalId, recipient, items } = opts;
  if (!apiKey) {
    console.error("printful: missing PRINTFUL_API_KEY");
    return null;
  }
  if (!items.length) {
    console.error("printful: no fulfillable items", { externalId });
    return null;
  }
  const body: any = {
    external_id: externalId,
    shipping: "STANDARD",
    recipient,
    items: items.map((it) => {
      const item: any = { quantity: it.quantity, name: it.name };
      // A numeric value is a Printful sync_variant_id; otherwise treat it as
      // the external_variant_id the admin set on the synced store product.
      if (/^\d+$/.test(it.variantId)) item.sync_variant_id = Number(it.variantId);
      else item.external_variant_id = it.variantId;
      return item;
    }),
  };
  try {
    const res = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await res.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }
    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.result?.error?.message ||
        raw.slice(0, 200);
      // A duplicate external_id means the order already exists in Printful
      // (a retried webhook) — treat that as a successful fulfillment.
      if (/already exist|duplicate|external_id/i.test(errMsg)) {
        console.log("printful: order already exists for external_id", { externalId });
        return { id: "existing" };
      }
      console.error("printful: create order failed", { externalId, status: res.status, error: errMsg });
      return null;
    }
    const id = data?.result?.id;
    if (!id) {
      console.error("printful: no order id in response", { externalId, raw: raw.slice(0, 200) });
      return null;
    }
    return { id: String(id) };
  } catch (err) {
    console.error("printful: request error", { externalId, error: err?.message || err });
    return null;
  }
}