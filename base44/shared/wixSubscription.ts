import { secrets } from 'base44:runtime';

// One place for cancelling a subscription at Wix, shared by cancelSubscription
// (the buyer's own "cancel" button) and deleteAccount (so closing an account
// never leaves a live subscription charging a person who can no longer sign in).

// The id is placed in the provider URL — only a plain id is allowed through.
const SUBSCRIPTION_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidSubscriptionId(id) {
  return typeof id === 'string' && SUBSCRIPTION_ID.test(id);
}

// Cancels a subscription. Soft by default — the buyer keeps the period they
// already paid for — with immediate cancellation as the fallback. Pass
// { immediate: true } to end access now. Returns 'soft' | 'immediate', or
// null when the provider refused (or isn't configured).
export async function cancelSubscriptionAtWix(subscriptionId, { immediate = false } = {}) {
  const apiKey = secrets.get('WIX_CHECKOUT_API_KEY');
  const siteId = secrets.get('WIX_CHECKOUT_SITE_ID');
  if (!apiKey || !siteId) {
    console.error('wixSubscription: Wix payment config not set');
    return null;
  }

  const call = (now) =>
    fetch(
      `https://www.wixapis.com/payments/base44/v1/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'wix-site-id': siteId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription_id: subscriptionId, immediate: now }),
        signal: AbortSignal.timeout(10000),
      },
    );

  if (immediate) {
    const res = await call(true);
    if (!res.ok) {
      console.error('wixSubscription: immediate cancel failed', (await res.text()).slice(0, 300));
      return null;
    }
    return 'immediate';
  }

  const soft = await call(false);
  if (soft.ok) return 'soft';

  console.warn('wixSubscription: soft cancel failed, forcing immediate', (await soft.text()).slice(0, 300));
  const hard = await call(true);
  if (!hard.ok) {
    console.error('wixSubscription: immediate cancel failed', (await hard.text()).slice(0, 300));
    return null;
  }
  return 'immediate';
}