import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// The Oracle speaks — ElevenLabs TTS for the reading.
const VOICES = {
  oracle: 'FGY2WhTYpPnrIDTdsKH5', // Laura — sassy, quirky, warm-blunt: the Oracle's voice
  sarah: 'EXAVITQu4vr4xnSDxMaL', // mature, reassuring alternative
  lily: 'pFZP5JQG7iQjIQuC4Bku', // velvety, theatrical alternative
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, voice } = body;
    if (!text) return Response.json({ error: 'Text is required' }, { status: 400 });

    // Cap length to keep cost bounded.
    const clipped = text.slice(0, 4000);
    const voiceId = VOICES[voice] || VOICES.oracle;

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': secrets.get('ELEVENLABS_API_KEY'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: clipped,
          model_id: 'eleven_multilingual_v2',
          // Expressive settings: lower stability + higher style lets her deliver
          // the blunt asides and warm moments with real attitude.
          voice_settings: { stability: 0.35, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: 'ElevenLabs: ' + err.slice(0, 300) }, { status: 502 });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return Response.json({ audio: 'data:audio/mpeg;base64,' + btoa(binary) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}