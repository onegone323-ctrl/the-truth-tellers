import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { getGateState, reserveVoice, checkRateLimit, TTS_DAILY_CAP_CHARS, GLOBAL_DAILY_VOICE_CHARS } from '../../shared/gate.ts';

// redeploy marker: picks up the shared gate fix (minute meter row creation)
// Turns the Oracle's reading into warm OpenAI TTS audio.
// The reading arrives as already-cleaned spoken text; we split it into
// sentence-sized chunks (the TTS input cap is ~4096 chars), synthesize each
// chunk, and return the base64 MP3 pieces so the app can play them back to
// back as one continuous voice.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }
    // The client speaks a reading in ~600-char pieces, so anything far beyond
    // one full reading per request is not a real use — a short ceiling bounds
    // every request.
    if (text.length > 4000) {
      return Response.json({ error: 'text too long (max 4000 chars)' }, { status: 400 });
    }

    // ===== ACCESS + QUOTA GATE =====
    const isAdmin = user?.role === 'admin';
    // Throttle hammering — synthesis costs the app money on every call.
    if (!isAdmin) {
      // Per-minute speed limit. Both paid functions share one counter, so
      // this and generateReading must use the SAME number to stay consistent.
      const throttled = !(await checkRateLimit(base44, user.id, 4));
      if (throttled) {
        return Response.json({ error: 'rate_limited', message: "You're moving faster than the cards allow — pause a moment." }, { status: 429 });
      }
    }
    const { ent, freeLeft } = await getGateState(base44, user);
    // Voice is part of the reading experience: premium subscribers, credit
    // holders, and anyone still inside their free readings may synthesize.
    // (No credit is debited here — voice ships with a reading already paid
    // for; the daily budget below is what bounds consumption.)
    if (!isAdmin && ent?.plan !== 'premium' && (ent?.credits || 0) < 1 && freeLeft === 0) {
      return Response.json({ error: 'out_of_credits', message: 'Voice is part of your readings — open Pricing to keep it.' }, { status: 402 });
    }
    // ATOMIC daily character budget: scripted abuse cannot drain the app's
    // OpenAI spend. The reserve is a conditional increment verified by its
    // own applied count — a burst of concurrent requests each reserves its
    // own characters; none of them pass on a stale pre-burst total.
    if (!isAdmin) {
      const cap = ent?.plan === 'premium' ? TTS_DAILY_CAP_CHARS.premium : TTS_DAILY_CAP_CHARS.free;
      // The global daily ceiling applies only to free-tier voice — premium
      // subscribers and bought credits have already paid for their audio.
      const globalCap = ent?.plan === 'premium' || (ent?.credits || 0) >= 1 ? null : GLOBAL_DAILY_VOICE_CHARS;
      const reserved = await reserveVoice(base44, user.id, text.length, cap, globalCap);
      if (!reserved) {
        return Response.json({ error: 'daily_voice_limit', message: "You've reached today's voice limit — her voice rests until tomorrow." }, { status: 429 });
      }
    }
    // ===== END GATE =====

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OpenAI is not configured — missing API key.' }, { status: 500 });
    }

    // A stock synthetic voice with its own identity, not an actor imitation.
    // Pin the expressive model so the delivery direction is always applied.
    const model = 'gpt-4o-mini-tts';
    const voice = 'sage';
    const speed = 0.94;

    // Split into chunks under ~3000 chars at sentence boundaries.
    const chunks = [];
    let buf = '';
    for (const part of text.split(/(?<=[.!?])\s+/)) {
      if ((buf + ' ' + part).length > 3000 && buf) {
        chunks.push(buf.trim());
        buf = part;
      } else {
        buf = buf ? buf + ' ' + part : part;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());

    // The WHOLE reading gets spoken, start to finish — bounded by the
    // per-request ceiling and the daily budget above.
    const audio = [];
    for (const chunk of chunks) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          voice,
          input: chunk,
          response_format: 'mp3',
          speed,
          // gpt-4o-mini-tts accepts direction — this is what makes her sound
          // like the wise older woman she is, not just any female voice.
          ...(model === 'gpt-4o-mini-tts' ? {
            instructions: "Use an original mature feminine voice with a low, warm register and a lightly textured, lived-in timbre. Speak conversationally, like a wise older woman talking across a kitchen table: relaxed, grounded, gently amused, quietly certain. Use measured pauses and natural falling intonation. The authority is effortless, never theatrical; the affection is real, never sugary. Deliver blunt truths with calm confidence and a little dry humor. Keep a natural American cadence, no exaggerated accent, no breathy youthfulness, no chirpy uplift or announcer delivery. Do not imitate any actor or identifiable person.",
          } : {}),
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const errText = await res.text();
        // The provider's raw body stays server-side — it can carry model ids
        // and account identifiers. The client gets a stable, generic error.
        console.error('speakReading: provider rejected request', { status: res.status, body: errText.slice(0, 500) });
        return Response.json(
          { error: 'provider_error', message: "The Oracle's voice couldn't be created — try again in a moment." },
          { status: 502 },
        );
      }
      const audioBytes = await res.arrayBuffer();
      audio.push(arrayBufferToBase64(audioBytes));
    }

    return Response.json({ chunks: audio, model, voice, spoken_chunks: chunks.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Encode an ArrayBuffer as base64 without blowing the call stack on
// large audio payloads — convert in 32KB slices.
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const sliceSize = 0x8000;
  for (let i = 0; i < bytes.length; i += sliceSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + sliceSize));
  }
  return btoa(binary);
}