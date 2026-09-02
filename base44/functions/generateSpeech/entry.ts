import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// The Oracle speaks — expressive TTS for the reading.
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

    const result = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: clipped,
      voice: voice || 'storm',
    });

    return Response.json({ audio_url: result?.url || result?.audio_url || result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}