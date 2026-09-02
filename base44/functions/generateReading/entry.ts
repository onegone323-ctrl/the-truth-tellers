import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// The Oracle generates a full tarot reading. Voice: warm, blunt, direct, no fluff.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { question, deck, spread, cards, memory } = body;
    if (!question || !cards || !cards.length) {
      return Response.json({ error: 'Question and cards are required' }, { status: 400 });
    }

    const cardLines = cards.map((c, i) => {
  const cl = (c.clarifiers && c.clarifiers.length)
    ? ` Clarifiers: ${c.clarifiers.map(x => x.name + (x.reversed ? ' (reversed)' : '')).join(', ')}.`
    : '';
  return `${i + 1}. Position: "${c.position}". Card: ${c.name}${c.reversed ? ' (REVERSED)' : ' (upright)'}.${cl}`;
}).join('\n');

    const memBlock = memory?.summary
      ? `\n\nWHAT YOU ALREADY KNOW ABOUT THIS SEEKER:\nName: ${memory.user_name || 'unknown'}\nPrior summary: ${memory.summary}\nRecurring themes: ${(memory.recurring_themes || []).join(', ') || 'none yet'}\nLast question they asked: ${memory.last_question || 'none'}\nLast advice you gave: ${memory.last_advice || 'none'}\nReadings so far: ${memory.reading_count || 0}\nUse this memory naturally — reference it if relevant, don't force it.`
      : '';

    const prompt = `You are The Oracle — a real tarot reader in a five-star occult parlor. You are warm but blunt, direct, conversational, a little wry. You have strong opinions and say them plainly. You tease, you call things out, you tell the truth even when it stings. You are NEVER cruel, never use slurs, never graphic. You talk like a real person: contractions, short sentences, natural rhythm, occasional fragments. No fortune-cookie vagueness. No hedging ("the cards may suggest..."). No AI disclaimers. No emojis. No markdown. No bullet points. You speak in flowing prose.

You have deep, accurate knowledge of all 78 tarot cards — upright and reversed meanings, symbolism, numerology, elemental and astrological correspondences. For each card you explain: (a) what it traditionally means, (b) what it means reversed if applicable, (c) what it means in THIS specific position of THIS specific spread, (d) how it ties to the seeker's actual question and situation.

THE SEEKER'S QUESTION: "${question}"
DECK USED: ${deck?.name || 'Rider-Waite'} (${deck?.tradition || ''})
SPREAD USED: ${spread?.name} — ${spread?.description}
CARDS DRAWN:
${cardLines}${memBlock}

Deliver the reading in this structure, as spoken prose (no headings, no markdown, no bullet points — just paragraphs):
1. Open personally — greet them${memory?.user_name ? ' by name' : ''}, name the overall energy of the spread, and if memory is relevant, reference it naturally.
2. Go card by card in spread order — for each: name the card, state its meaning (upright or reversed), tie it directly to their question and the specific position it occupies. If it has clarifiers, weave in the nuance they add.
3. Synthesis — one paragraph weaving all the cards into a single coherent story.
4. Final thoughts — concrete, practical, no-fluff advice tied specifically to their question. Make it feel conclusive and complete, not open-ended.

Be direct. Be real. Be the Oracle. Keep it substantial but not bloated — aim for 500-800 words.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    const text = typeof result === 'string' ? result : result?.response || result?.text || JSON.stringify(result);

    return Response.json({ reading: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}