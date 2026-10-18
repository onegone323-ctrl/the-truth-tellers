import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { PRODUCTS } from '../../shared/products.ts';

// Daily Oracle health check — runs from the scheduled "Daily Oracle Health
// Check" workflow (and can be invoked from the dashboard). It verifies every
// surface the app can't work without and reports the results:
//   1. Oracle text generation  (OpenAI chat — same primary model as readings)
//   2. The Oracle's voice      (ElevenLabs primary + OpenAI fallback TTS)
//   3. The paywall             (product catalog, Wix secrets, a real checkout
//                               session construct, entitlement + purchase data)
//   4. The data layer          (every core entity answers a read)
//   5. The GitHub connector    (token resolves and the API answers)
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

    // ---- 2. The Oracle's voice — ElevenLabs primary (same config as speakReading) ----
    const elevenKey = secrets.get('ELEVEN_LABS_API_KEY');
    if (!elevenKey) {
      checks.push({ name: "Oracle voice (ElevenLabs)", ok: false, detail: 'ELEVEN_LABS_API_KEY secret is missing.' });
    } else {
      try {
        const res = await fetch(
          'https://api.elevenlabs.io/v1/text-to-speech/hvhlTWefioYsKeeQjLfm?output_format=mp3_44100_128',
          {
            method: 'POST',
            headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: 'The cards are awake.',
              model_id: 'eleven_turbo_v2_5',
              voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
            }),
            signal: AbortSignal.timeout(30000),
          },
        );
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          checks.push({
            name: "Oracle voice (ElevenLabs)",
            ok: bytes.byteLength > 1000,
            detail: `eleven_turbo_v2_5 synthesized ${Math.round(bytes.byteLength / 1024)} KB of audio.`,
          });
        } else {
          const raw = await res.text();
          checks.push({ name: "Oracle voice (ElevenLabs)", ok: false, detail: `ElevenLabs -> ${res.status}: ${raw.slice(0, 200)}` });
        }
      } catch (e) {
        checks.push({ name: "Oracle voice (ElevenLabs)", ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 2b. Voice fallback (OpenAI TTS) ----
    if (!apiKey) {
      checks.push({ name: 'Voice fallback (OpenAI TTS)', ok: false, detail: 'OPENAI_API_KEY secret is missing.' });
    } else {
      try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'sage', input: 'The cards are awake.', response_format: 'mp3', speed: 0.94 }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          checks.push({
            name: 'Voice fallback (OpenAI TTS)',
            ok: bytes.byteLength > 1000,
            detail: `gpt-4o-mini-tts / "sage" synthesized ${Math.round(bytes.byteLength / 1024)} KB of audio.`,
          });
        } else {
          const raw = await res.text();
          checks.push({ name: 'Voice fallback (OpenAI TTS)', ok: false, detail: `TTS -> ${res.status}: ${raw.slice(0, 200)}` });
        }
      } catch (e) {
        checks.push({ name: 'Voice fallback (OpenAI TTS)', ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 3a. Paywall config: product catalog + Wix secrets ----
    const productIds = Object.keys(PRODUCTS);
    const badPrices = productIds.filter((id) => !(parseFloat(PRODUCTS[id].price) >= 0.5));
    checks.push({
      name: 'Paywall: product catalog',
      ok: productIds.length > 0 && badPrices.length === 0,
      detail: productIds.length === 0
        ? 'The product catalog is empty — nothing can be bought.'
        : badPrices.length
          ? `Products under the 0.50 minimum: ${badPrices.join(', ')}.`
          : `${productIds.length} products resolve (${productIds.join(', ')}), every price at or above 0.50.`,
    });

    const wixSecrets = ['WIX_CHECKOUT_API_KEY', 'WIX_CHECKOUT_SITE_ID', 'WIX_CHECKOUT_APP_URL', 'WIX_CHECKOUT_WEBHOOK_PUBLIC_KEY'];
    const missingWix = wixSecrets.filter((name) => !secrets.get(name));
    checks.push({
      name: 'Paywall: payment configuration',
      ok: missingWix.length === 0,
      detail: missingWix.length ? `Missing secrets: ${missingWix.join(', ')}.` : 'All four payment secrets are present.',
    });

    // ---- 3b. Paywall: a real checkout session construct (nothing is persisted
    // and nothing is charged — we only verify Wix accepts a session for the
    // cheapest product and hands back a session id + redirect) ----
    const WIX_API_KEY = secrets.get('WIX_CHECKOUT_API_KEY');
    const WIX_SITE_ID = secrets.get('WIX_CHECKOUT_SITE_ID');
    const WIX_APP_URL = secrets.get('WIX_CHECKOUT_APP_URL');
    if (!WIX_API_KEY || !WIX_SITE_ID || !WIX_APP_URL) {
      checks.push({ name: 'Paywall: checkout session', ok: false, detail: 'Skipped — payment configuration is incomplete.' });
    } else {
      try {
        const res = await fetch('https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct', {
          method: 'POST',
          headers: { Authorization: WIX_API_KEY, 'wix-site-id': WIX_SITE_ID, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: { items: [{ name: PRODUCTS['single-reading'].name, quantity: 1, price: PRODUCTS['single-reading'].price }] },
            callbackUrls: { thankYouPageUrl: `${WIX_APP_URL}/ThankYou`, postFlowUrl: `${WIX_APP_URL}/` },
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const data = await res.json();
          const ok = Boolean(data?.checkoutSession?.id && data?.checkoutSession?.redirectUrl);
          checks.push({
            name: 'Paywall: checkout session',
            ok,
            detail: ok ? 'Wix accepted the session — checkout can start for a real buyer.' : 'Wix responded but returned no session id or redirect.',
          });
        } else {
          const raw = await res.text();
          checks.push({ name: 'Paywall: checkout session', ok: false, detail: `Wix construct -> ${res.status}: ${raw.slice(0, 200)}` });
        }
      } catch (e) {
        checks.push({ name: 'Paywall: checkout session', ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 4. The data layer — every core entity answers a read ----
    for (const entityName of ['JournalEntry', 'OracleMemory', 'SeekerProfile', 'Entitlement', 'EntitlementGrant', 'Base44Purchase', 'OracleUsage', 'ContactMessage', 'HealthCheckSettings', 'DailyHealthCheck']) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        const page = await entity.filter({}, { limit: 1 });
        checks.push({ name: `Data: ${entityName}`, ok: true, detail: `Responds normally (${Array.isArray(page.items) ? page.items.length : 0} record sample).` });
      } catch (e) {
        checks.push({ name: `Data: ${entityName}`, ok: false, detail: e?.message || String(e) });
      }
    }

    // ---- 5. The GitHub connector (token resolves, the API answers) ----
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'truth4clarity-healthcheck' },
        signal: AbortSignal.timeout(15000),
      });
      checks.push({
        name: 'GitHub connector',
        ok: res.ok,
        detail: res.ok ? 'Token resolves and the GitHub API answers.' : `GitHub /user -> ${res.status} — reconnect the connector.`,
      });
    } catch (e) {
      checks.push({ name: 'GitHub connector', ok: false, detail: e?.message || String(e) });
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
          subject: `Truth 4 Clarity daily check — ${status.toUpperCase()}`,
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