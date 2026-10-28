import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { cancelSubscriptionAtWix, isValidSubscriptionId } from '../../shared/wixSubscription.ts';

// Permanently deletes the signed-in user's account and everything they wrote.
// Requires an explicit confirm token so it can never fire by accident.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'DELETE') {
      return Response.json({ error: 'Confirmation required' }, { status: 400 });
    }

    // Stop billing before the account disappears: a live premium subscription
    // would otherwise keep charging someone who can no longer sign in.
    const ents = await base44.asServiceRole.entities.Entitlement.filter({ user_id: user.id });
    const ent = ents && ents.length ? ents[0] : null;
    if (ent?.plan === 'premium' && isValidSubscriptionId(ent.subscription_id)) {
      const mode = await cancelSubscriptionAtWix(ent.subscription_id, { immediate: true });
      if (!mode) {
        console.error('deleteAccount: could not cancel live subscription', { entitlementId: ent.id });
        return Response.json(
          { error: 'Could not cancel the active subscription — try again.' },
          { status: 502 },
        );
      }
      await base44.asServiceRole.entities.Entitlement.update(ent.id, { plan: '', status: 'canceled' });
    }

    // Everything they wrote. Payment and order records (Entitlement,
    // EntitlementGrant, Base44Purchase) are deliberately kept for accounting.
    const owned = ['JournalEntry', 'OracleMemory', 'SeekerProfile', 'ContactMessage'];
    for (const name of owned) {
      await base44.asServiceRole.entities[name].deleteMany({ created_by_id: user.id });
    }
    // Usage meters are written server-side, so they carry no created_by_id.
    await base44.asServiceRole.entities.OracleUsage.deleteMany({ user_id: user.id });
    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ ok: true });
  } catch (error) {
    // Log the real cause server-side; never echo internal details to callers.
    console.error("deleteAccount: unhandled error", error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}