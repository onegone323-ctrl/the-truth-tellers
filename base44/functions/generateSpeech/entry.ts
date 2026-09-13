import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// The Oracle speaks — ElevenLabs TTS for the reading.
const VOICES = {
  oracle: 'EXAVITQu4vr4xnSDxMaL', // Sarah — confident, street-smart delivery: the Oracle's voice
  laura: 'FGY2WhTYpPnrIDTdsKH5', // quirky, warm-blunt alternative
  lily: 'pFZP5JQG7iQjIQuC4Bku', // velvety, theatrical alternative
};

// ElevenLabs accepts a limited number of characters per request. Big spreads
// (ten cards plus three clarifiers each = 30 cards) produce readings far
// beyond a single request, so split at sentence boundaries and stitch the
// audio together — she never gets cut off mid-reading again.
function chunkText(text, max = 4500) {
  const clean = text.trim().slice(0, 20000); // hard ceiling to bound cost
  if (clean.length <= max) return [clean];
  const chunks = [];
  let rest = clean;
  while (rest.length > max) {
    let cut = -1;
    for (const sep of ['. ', '! ', '? ', '\n']) {
      const i = rest.lastIndexOf(sep, max);
      if (i + sep.length > cut) cut = i + sep.length;
    }
    if (cut <= 0) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, voice } = body;
    if (!text) return Response.json({ error: 'Text is required' }, { status: 400 });

    const voiceId = VOICES[voice] || VOICES.oracle;
    const chunks = chunkText(text);

    const synthChunk = async (chunk) => {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': secrets.get('elevenlabs'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk,
            model_id: 'eleven_multilingual_v2',
            // Attitude settings: low stability + high style gives her sass and edge,
            // speed 1.15 keeps the delivery quick and urban — no slow mystic drawl.
            voice_settings: { stability: 0.3, similarity_boost: 0.85, style: 0.75, use_speaker_boost: true, speed: 1.15 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error('ElevenLabs: ' + err.slice(0, 300));
      }
      return new Uint8Array(await res.arrayBuffer());
    };

    // Chunks are independent — voicing them all at once means the full reading
    // is ready in roughly one chunk's time instead of the sum of all of them.
    let audioParts;
    try {
      audioParts = await Promise.all(chunks.map(synthChunk));
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }

    const merged = new Uint8Array(audioParts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const part of audioParts) {
      merged.set(part, offset);
      offset += part.length;
    }

    let binary = '';
    for (let i = 0; i < merged.length; i += 0x8000) {
      binary += String.fromCharCode(...merged.subarray(i, i + 0x8000));
    }
    return Response.json({ audio: 'data:audio/mpeg;base64,' + btoa(binary) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}