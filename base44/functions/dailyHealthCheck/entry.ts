import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Daily Oracle health check — runs from the scheduled "Daily Oracle Health
// Check" workflow (and can be invoked from the dashboard). It verifies the
// three things the app can't work without and reports the results:
//   1. Oracle text generation  (OpenAI chat — same primary model as readings)
//   2. The Oracle's voice      (OpenAI TTS — same model/voice/speed as speakReading)
//   3. The data layer          (every core entity answers a read)
// The report is saved to DailyHealthCheck and emailed to the app's admins.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: this function spends paid API credits (chat + TTS) and
    // emails the report, so it must never run for an anonymous or
    // non-admin caller. The scheduled workflow invocation runs with the
    // app owner's identity; direct HTTP calls must present an admin session.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null; // no session at all — treated as anonymous below
    }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checks = [];

    // ---- 1. Oracle text generation ----
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      checks.push({ name: 'Oracle text generation', ok: false, detail: 'OPENAI_API_KEY secret is missing.' });
    } else {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-5.6-sol',
            messages: [{ role: 'user', content: 'Reply with the single word: READY' }],
            max_completion_tokens: 16,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content || '';
          checks.push({
            name: 'Oracle text generation',
            ok: Boolean(text.trim()),
            detail: text.trim() ? `gpt-5.6-sol responded: "${text.trim().slice(0, 40)}"` : 'Model returned no content.',
          });
        } else {
          const raw = await res.text();
          checks.push({ name: 'Oracle text generation', ok: false, detail: `gpt-5.6-sol -> ${res.status}: ${raw.slice(0, 200)}` });
        }
      } catch (e) {
        checks.push({ name: 'Oracle text generation', ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 2. The Oracle's voice (same configuration as speakReading) ----
    const model = secrets.get('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts';
    const voice = secrets.get('OPENAI_TTS_VOICE') || 'ash';
    const speedRaw = parseFloat(secrets.get('OPENAI_TTS_SPEED') || '1.0');
    const speed = Number.isFinite(speedRaw) && speedRaw >= 0.25 && speedRaw <= 4 ? speedRaw : 1.0;
    if (!apiKey) {
      checks.push({ name: 'Oracle voice (TTS)', ok: false, detail: 'OPENAI_API_KEY secret is missing.' });
    } else {
      try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, voice, input: 'The cards are awake.', response_format: 'mp3', speed }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          checks.push({
            name: 'Oracle voice (TTS)',
            ok: bytes.byteLength > 1000,
            detail: `${model} / voice "${voice}" synthesized ${Math.round(bytes.byteLength / 1024)} KB of audio.`,
          });
        } else {
          const raw = await res.text();
          checks.push({ name: 'Oracle voice (TTS)', ok: false, detail: `TTS ${model} -> ${res.status}: ${raw.slice(0, 200)}` });
        }
      } catch (e) {
        checks.push({ name: 'Oracle voice (TTS)', ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 3. The data layer — every core entity answers a read ----
    for (const entityName of ['JournalEntry', 'OracleMemory', 'SeekerProfile', 'DailyHealthCheck']) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        const page = await entity.filter({}, { limit: 1 });
        checks.push({ name: `Data: ${entityName}`, ok: true, detail: `Responds normally (${Array.isArray(page.items) ? page.items.length : 0} record sample).` });
      } catch (e) {
        checks.push({ name: `Data: ${entityName}`, ok: false, detail: e?.message || String(e) });
      }
    }

    const failed = checks.filter((c) => !c.ok);
    const status = failed.length ? 'degraded' : 'healthy';
    const runDate = new Date().toISOString();

    // Save the report so history builds up in the app.
    try {
      await base44.asServiceRole.entities.DailyHealthCheck.create({ status, checks, run_date: runDate });
    } catch (e) {
      console.warn('Could not save the health check report.', e?.message || e);
    }

    // Email the report. Recipient lives in HealthCheckSettings (User roles
    // can't be listed from a scheduled run).
    let emailed = false;
    try {
      const settingsPage = await base44.asServiceRole.entities.HealthCheckSettings.filter({}, { limit: 1, fields: ['report_email'] });
      const to = (settingsPage.items || []).map((s) => s.report_email).filter(Boolean).join(',');
      if (to) {
        const rows = checks
          .map((c) => `<li><strong>${c.ok ? '✅' : '❌'} ${c.name}</strong> — ${c.detail}</li>`)
          .join('');
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: `The Truth Teller daily check — ${status.toUpperCase()}`,
          html: `<p>Today's Oracle health check finished with status <strong>${status}</strong>.</p><ul>${rows}</ul><p>— The automated daily check</p>`,
        });
        emailed = true;
      }
    } catch (e) {
      console.warn('Could not email the health check report.', e?.message || e);
    }

    return Response.json({ status, checks, emailed, run_date: runDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}