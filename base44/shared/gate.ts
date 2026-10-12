// Shared paywall/usage gate state for the Oracle's paid services.
// Used by generateReading and speakReading — keep the logic HERE, never copied.

// Everyone's first three readings are free, counted server-side.
export const FREE_READINGS = 3;

// Daily voice-synthesis budget per user, in characters. A full spoken reading
// is ~2,000-4,000 chars, so free users get ~3 readings of voice a day,
// premium users ~15+.
export const TTS_DAILY_CAP_CHARS = { free: 12000, premium: 60000 };

// Reads the entitlement row and the server-side free-reading counter.
// Usage is ALWAYS counted from JournalEntry rows that generateReading writes
// server-side — never from anything a browser does.
export async function getGateState(base44, user) {
  const ents = await base44.asServiceRole.entities.Entitlement.filter({ user_id: user.id });
  const ent = ents && ents.length ? ents[0] : null;
  const used = await base44.asServiceRole.entities.JournalEntry.count({ created_by_id: user.id });
  return { ent, freeLeft: Math.max(0, FREE_READINGS - (used || 0)) };
}

// Today's (UTC) per-user usage row for the daily voice cap; created on demand.
export async function getDailyUsage(base44, userId) {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await base44.asServiceRole.entities.OracleUsage.filter({ user_id: userId, day });
  if (rows && rows.length) return rows[0];
  const created = await base44.asServiceRole.entities.OracleUsage.create({
    user_id: userId, day, tts_chars: 0, tts_calls: 0,
  });
  return created;
}