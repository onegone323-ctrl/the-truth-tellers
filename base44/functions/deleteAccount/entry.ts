import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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

    const owned = ['JournalEntry', 'OracleMemory', 'SeekerProfile'];
    for (const name of owned) {
      await base44.asServiceRole.entities[name].deleteMany({ created_by_id: user.id });
    }
    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}