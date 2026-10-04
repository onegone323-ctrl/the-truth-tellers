import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Turns the Oracle's reading into natural OpenAI TTS audio.
// The reading is split into sentence-sized chunks (the TTS input cap is
// ~4096 chars), each chunk is synthesized, and the base64 MP3 pieces are
// returned so the app can play them back-to-back as one continuous voice.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!text.trim()) return Response.json({ error: 'text is required' }, { status: 400 });
    if (text.length > 20000) return Response.json({ error: 'text too long (max 20000 chars)' }, { status: 400 });

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: 'Voice service is not configured.' }, { status: 500 });

    const model = secrets.get('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts';
    const voice = secrets.get('OPENAI_TTS_VOICE') || 'sage';
    const speedRaw = parseFloat(secrets.get('OPENAI_TTS_SPEED') || '1.0');
    const speed = Number.isFinite(speedRaw) && speedRaw > 0 && speedRaw <= 2 ? speedRaw : 1.0;

    // Sentence-boundary chunks, each kept well under the API input cap.
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*|[^.!?]+$/g) || [text];
    let buf = '';
    for (const s of sentences) {
      if ((buf + s).length > 2800 && buf) { chunks.push(buf.trim()); buf = s; }
      else buf += s;
    }
    if (buf.trim()) chunks.push(buf.trim());

    const audioChunks = [];
    for (const chunk of chunks) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, voice, input: chunk, response_format: 'mp3', speed }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const detail = await res.text();
        return Response.json({ error: `Voice service error ${res.status}: ${detail.slice(0, 300)}` }, { status: 502 });
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = '';
      const step = 0x8000;
      for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
      }
      audioChunks.push(btoa(binary));
    }

    return Response.json({ chunks: audioChunks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}