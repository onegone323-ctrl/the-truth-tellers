import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

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
    if (text.length > 20000) {
      return Response.json({ error: 'text too long (max 20000 chars)' }, { status: 400 });
    }

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OpenAI is not configured — missing API key.' }, { status: 500 });
    }

    // Voice configuration comes from the app's secrets, with sane defaults:
    // a warm, expressive female voice at natural speed.
    const model = secrets.get('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts';
    const voice = secrets.get('OPENAI_TTS_VOICE') || 'nova';
    const speedRaw = parseFloat(secrets.get('OPENAI_TTS_SPEED') || '1.0');
    const speed = Number.isFinite(speedRaw) && speedRaw >= 0.25 && speedRaw <= 4 ? speedRaw : 1.0;

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

    // No cap: the WHOLE reading gets spoken, start to finish.
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
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const errText = await res.text();
        return Response.json({
          error: 'OpenAI TTS ' + res.status + ': ' + errText.slice(0, 300),
        }, { status: 502 });
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