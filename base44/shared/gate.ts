// Shared paywall/usage gate state for the Oracle's paid services.
// Used by generateReading and speakReading — keep the logic HERE, never copied.
//
// HOW LIMITS ARE ENFORCED (burst-safe):
// 1. A guarded conditional increment (updateMany) applies only to a counter
//    that still fits — the guard is checked against the live value.
// 2. After a short settle (siblings' concurrent claims have landed), the
//    counter is re-read and the request is ADMITTED only if the settled
//    counter is still within its cap. The k-th claim to land always reads at
//    least k, so at most `cap` requests can ever be admitted per meter — a
//    concurrent burst fails closed instead of sharing one stale snapshot.
// No read-then-write against a snapshot survives this pattern.
//
// METERS live on OracleUsage rows, keyed apart so concurrent claims never
// touch the same row's different fields:
//   readings (lifetime free tier):      { user_id, day: 'lifetime' }
//   daily voice budget:                 { user_id, day: today }
//   per-minute throttle:                { user_id, day: <minute key> }
//   GLOBAL daily free readings:         { user_id: '__global__', day: today }
//   GLOBAL daily free-tier voice chars: { user_id: '__global__', day: 'v-<today>' }
//   daily teaser budget:                { user_id, day: <today> }  .readings
//   GLOBAL daily teasers:               { user_id: '__global__', day: 't-<today>' }

// Everyone's first reading is free, metered server-side. After it, a seeker
// with no premium plan and no credits still gets a reading — but only the
// opening snippet, cut off before any real truth lands (see SNIPPET_*).
export const FREE_READINGS = 1;

// How much of a reading a non-paying seeker gets: the opening (~45–70 words,
// roughly 15–20 seconds spoken), clipped at a sentence boundary.
export const SNIPPET_MAX_CHARS = 320;
// Voice is bounded the same way: a teaser-tier seeker may synthesize only a
// snippet-sized piece of speech — anything longer is refused with the
// sign-up message.
export const SNIPPET_VOICE_CHARS = 400;

// Daily voice-synthesis budget per user, in characters. A full spoken reading
// is ~2,000-4,000 chars, so free users get ~3 readings of voice a day,
// premium users ~15+.
export const TTS_DAILY_CAP_CHARS = { free: 12000, premium: 60000 };

// Daily VOICE REQUEST budget per user. A whole reading is spoken in a handful
// of small requests, so this never touches a real listener — it only stops
// hammering, where characters alone would allow endless tiny calls.
export const TTS_DAILY_CAP_CALLS = { free: 120, premium: 600 };

// GLOBAL daily ceilings on FREE-TIER usage (premium subscribers and bought
// credits bypass them). They cap what a fleet of farmed free accounts can
// drain from the app's AI budget in one day.
export const GLOBAL_DAILY_FREE_READINGS = 500;
export const GLOBAL_DAILY_VOICE_CHARS = 500000;

// A teaser (the cut-off opening a spent seeker gets) is still a paid AI call.
export const TEASER_DAILY_CAP = 10;
export const GLOBAL_DAILY_TEASERS = 200;

// Concurrent sibling claims need this long to land before the audit read.
const CLAIM_SETTLE_MS = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The number of rows a conditional update ACTUALLY applied to.
function applied(res) {
  if (!res) return 0;
  return typeof res.updated === 'number' ? res.updated : (res.count ?? res.modifiedCount ?? 0);
}

// Claim by guarded increment, settle, then audit the settled counter.
// entity: entity client (service role) · baseFilter: selects the meter row(s)
// guard: the "still fits" condition · incs: the atomic increment
// capOf: row => boolean, true while the settled counter is within its cap
async function claimWithinCap(entity, baseFilter, guard, incs, capOf) {
  const res = await entity.updateMany({ ...baseFilter, ...guard }, incs);
  if (!applied(res)) return false;
  await sleep(CLAIM_SETTLE_MS);
  const rows = await entity.filter(baseFilter);
  return rows.length > 0 && rows.every(capOf);
}

// A rejected claim's increment can still land and push its meter past the
// cap — clamp it back so the meter stays honest (fail-closed, never reopen).
async function clampMeter(entity, filter, field, cap) {
  const over = { ...filter };
  over[field] = { $gt: cap };
  await entity.updateMany(over, { $set: { [field]: cap } });
}

// Make sure a meter row exists (a concurrent first touch may create two —
// claims then apply to every matching row in lockstep and the audit holds).
async function ensureDailyMeter(sr, userId, day) {
  const rows = await sr.entities.OracleUsage.filter({ user_id: userId, day });
  if (rows && rows.length) return;
  try {
    await sr.entities.OracleUsage.create({ user_id: userId, day, readings: 0, tts_chars: 0, tts_calls: 0 });
  } catch (_) {
    // A concurrent request created it — the claim below handles it.
  }
}

// The lifetime free-reading meter: one row per user (day = 'lifetime'),
// seeded on first touch from journal history — which generateReading writes
// server-side — so long-time users don't get their free readings re-granted.
async function ensureLifetimeMeter(base44, userId) {
  const sr = base44.asServiceRole;
  let rows = await sr.entities.OracleUsage.filter({ user_id: userId, day: 'lifetime' });
  if (rows && rows.length) return rows;
  const used = await sr.entities.JournalEntry.count({ created_by_id: userId });
  const seeded = Math.min(FREE_READINGS, Math.max(0, used || 0));
  try {
    await sr.entities.OracleUsage.create({ user_id: userId, day: 'lifetime', readings: seeded, tts_chars: 0, tts_calls: 0 });
  } catch (_) {
    // A concurrent first-touch seeded it — re-read below.
  }
  rows = await sr.entities.OracleUsage.filter({ user_id: userId, day: 'lifetime' });
  return rows && rows.length ? rows : [];
}

// Entitlement row + how many free readings remain (strictest view of the meter).
export async function getGateState(base44, user) {
  const sr = base44.asServiceRole;
  const ents = await sr.entities.Entitlement.filter({ user_id: user.id });
  const ent = ents && ents.length ? ents[0] : null;
  const rows = await ensureLifetimeMeter(base44, user.id);
  const usedMax = rows.reduce((m, r) => Math.max(m, r.readings || 0), 0);
  return { ent, freeLeft: Math.max(0, FREE_READINGS - usedMax) };
}

// Per-minute throttle, same burst-safe pattern. Each minute gets its OWN
// fresh meter row (keyed by the minute), so there is no rollover/reset race —
// the counter just starts from zero every minute. Returns false when the
// caller is over maxPerMinute for the current minute bucket.
export async function checkRateLimit(base44, userId, maxPerMinute) {
  const sr = base44.asServiceRole;
  const minuteKey = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  // The conditional increment below can only apply to an EXISTING row — a
  // minute with no meter row yet applies 0 rows and would be throttled
  // forever. Make sure this minute's fresh meter exists before claiming.
  await ensureDailyMeter(sr, userId, minuteKey);
  const ok = await claimWithinCap(
    sr.entities.OracleUsage,
    { user_id: userId, day: minuteKey },
    { minute_calls: { $lt: maxPerMinute } },
    { $inc: { minute_calls: 1 } },
    (r) => (r.minute_calls || 0) <= maxPerMinute,
  );
  if (!ok) {
    // A refusal must be visible in the logs — a silent throttle is a bug
    // masquerading as a rate limit.
    console.error('gate.checkRateLimit: refusing call', { userId, minuteKey, maxPerMinute });
  }
  // Housekeeping: rate rows older than an hour are dead weight. The $regex
  // pins this to minute-bucket rows only — the daily voice row's day value
  // ('YYYY-MM-DD') never matches.
  const cutoff = new Date(Date.now() - 3600000).toISOString().slice(0, 16);
  try {
    await sr.entities.OracleUsage.deleteMany({
      user_id: userId,
      day: { $regex: '^\\d{4}-\\d{2}-\\d{2}T', $lt: cutoff },
    });
  } catch (_) {
    // Housekeeping only — never fail a request over it.
  }
  return ok;
}

// Claims one free reading BEFORE any paid work. Returns true only if this
// request is admitted — under the user's own lifetime meter first, then under
// the GLOBAL daily free-reading ceiling (which bounds what farmed free
// accounts can drain per day). A seeker who has already used theirs is refused
// without touching the shared pool: that pool belongs to people still owed a
// first reading.
export async function claimFreeReading(base44, user) {
  const sr = base44.asServiceRole;
  const rows = await ensureLifetimeMeter(base44, user.id);
  const used = rows.reduce((m, r) => Math.max(m, r.readings || 0), 0);
  // Already spent: answer now, instead of paying a claim's settle wait and
  // burning a slice of the shared daily pool on every teaser attempt.
  if (used >= FREE_READINGS) return false;

  const ok = await claimWithinCap(
    sr.entities.OracleUsage,
    { user_id: user.id, day: 'lifetime' },
    { readings: { $lt: FREE_READINGS } },
    { $inc: { readings: 1 } },
    (r) => (r.readings || 0) <= FREE_READINGS,
  );
  if (!ok) {
    await clampMeter(sr.entities.OracleUsage, { user_id: user.id, day: 'lifetime' }, 'readings', FREE_READINGS);
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  await ensureDailyMeter(sr, '__global__', today);
  const globalOk = await claimWithinCap(
    sr.entities.OracleUsage,
    { user_id: '__global__', day: today },
    { readings: { $lt: GLOBAL_DAILY_FREE_READINGS } },
    { $inc: { readings: 1 } },
    (r) => (r.readings || 0) <= GLOBAL_DAILY_FREE_READINGS,
  );
  if (!globalOk) {
    await clampMeter(sr.entities.OracleUsage, { user_id: '__global__', day: today }, 'readings', GLOBAL_DAILY_FREE_READINGS);
    // Their slot came out of the shared pool — put it back before refusing.
    await releaseFreeReading(base44, user);
    return false;
  }
  return true;
}

// Hands a free-reading claim back when no reading reached the seeker (the
// provider failed, or the entry couldn't be saved). Guarded at zero, so a
// double release can never mint usage.
export async function releaseFreeReading(base44, user) {
  const sr = base44.asServiceRole;
  const today = new Date().toISOString().slice(0, 10);
  await sr.entities.OracleUsage.updateMany(
    { user_id: user.id, day: 'lifetime', readings: { $gt: 0 } },
    { $inc: { readings: -1 } },
  );
  await sr.entities.OracleUsage.updateMany(
    { user_id: '__global__', day: today, readings: { $gt: 0 } },
    { $inc: { readings: -1 } },
  );
}

// Claims one TEASER — the cut-off opening a seeker with no free reading and no
// credits gets. It still runs a paid AI call, so it is bounded twice: a daily
// budget per seeker, and a global daily ceiling across everyone. The per-user
// count rides on that day's voice meter row (its `readings` field is otherwise
// unused); the global count gets its own `t-<today>` row so it never collides
// with the global free-reading meter.
export async function claimTeaser(base44, user) {
  const sr = base44.asServiceRole;
  const today = new Date().toISOString().slice(0, 10);
  const globalKey = { user_id: '__global__', day: `t-${today}` };
  await ensureDailyMeter(sr, '__global__', `t-${today}`);
  const globalOk = await claimWithinCap(
    sr.entities.OracleUsage,
    globalKey,
    { readings: { $lt: GLOBAL_DAILY_TEASERS } },
    { $inc: { readings: 1 } },
    (r) => (r.readings || 0) <= GLOBAL_DAILY_TEASERS,
  );
  if (!globalOk) {
    await clampMeter(sr.entities.OracleUsage, globalKey, 'readings', GLOBAL_DAILY_TEASERS);
    return false;
  }
  await ensureDailyMeter(sr, user.id, today);
  const userKey = { user_id: user.id, day: today };
  const ok = await claimWithinCap(
    sr.entities.OracleUsage,
    userKey,
    { readings: { $lt: TEASER_DAILY_CAP } },
    { $inc: { readings: 1 } },
    (r) => (r.readings || 0) <= TEASER_DAILY_CAP,
  );
  if (!ok) {
    await clampMeter(sr.entities.OracleUsage, userKey, 'readings', TEASER_DAILY_CAP);
  }
  return ok;
}

// Atomically spends one credit: the decrement only applies while credits are
// still >= 1, and the request is admitted only if the settled balance is
// still >= 0 — two concurrent requests with one credit cannot both succeed,
// and a burst cannot spend more than the balance held.
export async function spendCredit(base44, userId) {
  const sr = base44.asServiceRole;
  const ok = await claimWithinCap(
    sr.entities.Entitlement,
    { user_id: userId },
    { credits: { $gte: 1 } },
    { $inc: { credits: -1 } },
    (r) => (r.credits || 0) >= 0,
  );
  if (!ok) {
    // An over-spend burst can push the cosmetic balance negative (rejected
    // requests' increments still land) — clamp it back to zero so a later
    // top-up isn't eaten by the overshoot. The audit above is the hard gate.
    await sr.entities.Entitlement.updateMany(
      { user_id: userId, credits: { $lt: 0 } },
      { $set: { credits: 0 } },
    );
  }
  return ok;
}

// Hands a teaser slot back, on both the seeker's daily count and the global one.
export async function releaseTeaser(base44, user) {
  const sr = base44.asServiceRole;
  const today = new Date().toISOString().slice(0, 10);
  await sr.entities.OracleUsage.updateMany(
    { user_id: user.id, day: today, readings: { $gt: 0 } },
    { $inc: { readings: -1 } },
  );
  await sr.entities.OracleUsage.updateMany(
    { user_id: '__global__', day: `t-${today}`, readings: { $gt: 0 } },
    { $inc: { readings: -1 } },
  );
}

// Gives a spent credit back when the reading it paid for never arrived.
export async function refundCredit(base44, userId) {
  await base44.asServiceRole.entities.Entitlement.updateMany(
    { user_id: userId },
    { $inc: { credits: 1 } },
  );
}

// Reserves voice characters against the daily cap. The increment only applies
// to a meter that can still fit this request, and the request is admitted
// only if the settled total is still within the cap — a concurrent burst of
// oversized requests fails closed instead of sharing the pre-burst total.
// When globalCap is set, the request must ALSO fit the global free-tier
// daily voice ceiling (paid voice passes globalCap: null).
export async function reserveVoice(base44, userId, len, cap, globalCap, callsCap) {
  const sr = base44.asServiceRole;
  const day = new Date().toISOString().slice(0, 10);
  await ensureDailyMeter(sr, userId, day);
  const ok = await claimWithinCap(
    sr.entities.OracleUsage,
    { user_id: userId, day },
    { tts_chars: { $lte: cap - len }, tts_calls: { $lt: callsCap } },
    { $inc: { tts_chars: len, tts_calls: 1 } },
    (r) => (r.tts_chars || 0) <= cap && (r.tts_calls || 0) <= callsCap,
  );
  if (!ok) {
    await clampMeter(sr.entities.OracleUsage, { user_id: userId, day }, 'tts_chars', cap);
    await clampMeter(sr.entities.OracleUsage, { user_id: userId, day }, 'tts_calls', callsCap);
    return false;
  }
  if (globalCap == null) return true;
  const vKey = { user_id: '__global__', day: `v-${day}` };
  await ensureDailyMeter(sr, '__global__', `v-${day}`);
  const globalOk = await claimWithinCap(
    sr.entities.OracleUsage,
    vKey,
    { tts_chars: { $lte: globalCap - len } },
    { $inc: { tts_chars: len, tts_calls: 1 } },
    (r) => (r.tts_chars || 0) <= globalCap,
  );
  if (!globalOk) {
    await clampMeter(sr.entities.OracleUsage, vKey, 'tts_chars', globalCap);
    return false;
  }
  return true;
}

// Hands voice characters back that never produced audio — a provider failure,
// or the whitespace lost when the text was split into chunks. `includeGlobal`
// must match how the characters were reserved (free-tier voice is also
// charged against the global ceiling).
export async function releaseVoice(base44, userId, chars, includeGlobal = false) {
  if (!(chars > 0)) return;
  const sr = base44.asServiceRole;
  const day = new Date().toISOString().slice(0, 10);
  await sr.entities.OracleUsage.updateMany(
    { user_id: userId, day, tts_chars: { $gte: chars } },
    { $inc: { tts_chars: -chars } },
  );
  if (!includeGlobal) return;
  await sr.entities.OracleUsage.updateMany(
    { user_id: '__global__', day: `v-${day}`, tts_chars: { $gte: chars } },
    { $inc: { tts_chars: -chars } },
  );
}