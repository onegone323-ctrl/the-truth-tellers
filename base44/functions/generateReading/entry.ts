import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// The Oracle generates a full tarot reading. Voice: blunt, warm, personal —
// freshly spoken every time, real advice, zero templated catchphrases.
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

    // Build a compact one-liner per position so the model covers every card
    // (and its clarifiers) with the deck tradition it was drawn from.
    const positionLines = cards.map((c, i) => {
      const rev = c.reversed ? ' (R)' : '';
      const clar = (c.clarifiers && c.clarifiers.length)
        ? ' · ' + c.clarifiers.map(x => `${x.name}${x.reversed ? ' (R)' : ''}`).join(' · ')
        : '';
      const deckHint = c.deck_title && c.deck_title !== c.name
        ? ` [in ${c.deck_name || 'this deck'} tradition, called "${c.deck_title}"]`
        : '';
      return `${i + 1}. POSITION: "${c.position}"  CARDS: ${c.name}${rev}${clar}${deckHint}`;
    }).join('\n');

    // Memory block — everything the Oracle should already know about this seeker.
    const memBlock = memory?.summary
      ? [
          '',
          'WHAT YOU ALREADY KNOW ABOUT THIS SEEKER (USE THIS — reference it naturally):',
          `- Name/title: ${memory.user_name || 'unknown'}`,
          `- Prior context: ${memory.summary}`,
          `- Recurring themes: ${(memory.recurring_themes || []).join(', ') || 'none yet'}`,
          `- Last question they asked you: ${memory.last_question || 'none'}`,
          `- Last advice you gave: ${memory.last_advice || 'none'}`,
          `- Total readings so far: ${memory.reading_count || 0}`,
          '',
        ].join('\n')
      : '';

    const honorific = memory?.user_name || 'my friend';

    const prompt = [
      "You are The Oracle. To this seeker you are a real person: their blunt, warm, wickedly funny friend who happens to read tarot. You tell it like it is. You give real advice — concrete, specific, actionable — not vague mysticism. You are never cruel, but you never sugarcoat either.",
      "",
      "============================================",
      "ANTI-REPETITION — THE MOST IMPORTANT RULE",
      "============================================",
      "- Every reading must sound freshly spoken, never templated. Two readings about the same situation should share NO sentences and no catchphrases.",
      "- NEVER use stock lines or signature phrases: no \"the cards are loud\", no \"Translation:\", no formula verdicts, no repeated imperative couplets like \"Ship it. Stop doubting.\"",
      "- Change your opening, your rhythm, and your closing line every single time. Invent the language fresh for THIS person and THIS question.",
      (memory?.last_advice ? `- Last time you told them: "${memory.last_advice}". Do NOT repeat or rephrase that advice. If the situation is unchanged, go deeper, get more specific, or call it out directly.` : ""),
      "",
      "============================================",
      "FORMAT — THIS WILL BE SPOKEN ALOUD",
      "============================================",
      "- Write it as natural speech: plain flowing paragraphs. NO markdown, NO bullets, NO headers, NO glyphs, NO emojis, NO colons followed by lists.",
      `- Address them by name ("${honorific}") naturally 2–3 times, never mechanically.`,
      "- Walk the spread in order. For each position: announce the position conversationally (\"Where you've been…\", \"what's coming at you next\" — vary the phrasing every time), then name each card AND the deck tradition it was drawn from. If that tradition uses a different name for the card, say that name too (it was given to you in brackets). Then get straight to what it means for THEM in their life — blunt, specific, tied to their actual question. No tarot lectures, no card-meaning explainers, no symbolism.",
      "- Weave in what you know about them from memory when it sharpens the point — their situation, their goal, what they asked before.",
      "- Answer their ACTUAL question out loud, directly — a real verdict, stated as the truth. No hedging, no \"the cards suggest.\"",
      "- Then give ADVICE: a short stretch of direct, concrete advice — what to do this week, what to stop doing, what to watch for. Firm. Tell it like it is.",
      "- Close with ONE short punchy line that lands — different every time.",
      "- Length: 350–600 words. Compact and dense. Every line earns its place.",
      "",
      "============================================",
      "CONTEXT",
      "============================================",
      "",
      `THE SEEKER: ${honorific}`,
      `THEIR QUESTION: "${question}"`,
      `DECK: ${deck?.name || 'Rider-Waite'}${deck?.tradition ? ` (${deck.tradition})` : ''}`,
      `SPREAD: ${spread?.name}${spread?.description ? ` — ${spread.description}` : ''}`,
      "",
      "CARDS DRAWN (in spread order — cover every one):",
      positionLines,
      memBlock,
      "",
      `Now speak the reading. Do NOT restate these instructions, do NOT preface. Begin directly, addressed to ${honorific}.`,
    ].join('\n');

    // Keep the provider credential server-side in Base44 secrets.
    const apiKey = secrets.get('perplexity_api_key');
    if (!apiKey) {
      return Response.json({ error: 'The Oracle is not configured — missing API key.' }, { status: 500 });
    }

    // Perplexity Agent API. Multi-model fallback chain: on overload (429) or
    // a 5xx we walk to the next model. The Agent API does NOT accept a model
    // array, so we loop client-side.
    const modelChain = [
      'openai/gpt-5.6-sol',
      'anthropic/claude-sonnet-5',
      'google/gemini-3.8-flash',
    ];

    const oracleInstructions =
      "You are The Oracle — a blunt, warm, personal friend who reads tarot and tells it like it is. " +
      "Write the reading as natural spoken paragraphs with NO markdown, NO bullets, NO glyphs, NO emojis. " +
      "Cover every position and every card in spread order, naming each card's deck tradition. " +
      "Give a direct verdict on the seeker's actual question, then concrete advice. " +
      "Do NOT cite sources. Do NOT include AI disclaimers. Produce ONLY the reading itself.";

    let aiRes;
    let data;
    let lastErrorDetail = '';
    let usedModel = '';
    for (const modelId of modelChain) {
      try {
        aiRes = await fetch('https://api.perplexity.ai/v1/agent', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId,
            instructions: oracleInstructions,
            input: prompt,
            max_output_tokens: 2400,
            temperature: 0.95,
          }),
          signal: AbortSignal.timeout(60000),
        });
      } catch (error) {
        if (error?.name === 'TimeoutError') {
          lastErrorDetail = `${modelId} timed out`;
          continue; // try next model
        }
        throw error;
      }

      const raw = await aiRes.text();
      if (!aiRes.ok) {
        // Retriable failures: overloaded (429) or any 5xx from the provider.
        // Non-retriable: 400 invalid_request, 401 auth, 402 billing, 404 model.
        lastErrorDetail = `${modelId} -> ${aiRes.status}: ${raw.slice(0, 300)}`;
        if (aiRes.status === 429 || aiRes.status >= 500) {
          continue; // try next model
        }
        // Non-retriable: surface immediately.
        return Response.json({ error: 'Oracle API ' + aiRes.status + ': ' + raw.slice(0, 500) }, { status: 502 });
      }

      try {
        data = JSON.parse(raw);
      } catch {
        lastErrorDetail = `${modelId} returned invalid JSON`;
        continue; // try next model
      }

      usedModel = modelId;
      break; // got a good response
    }

    if (!data) {
      return Response.json({
        error: 'All Oracle models failed. Last: ' + lastErrorDetail.slice(0, 400),
      }, { status: 502 });
    }

    // Agent API response shape: data.output is an array of typed items. The
    // model's answer is a `message` item whose `content` array contains one
    // or more `output_text` blocks. Concatenate all text blocks across all
    // message items so we never miss a piece of the reading.
    let text = '';
    if (Array.isArray(data?.output)) {
      for (const item of data.output) {
        if (item?.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block?.type === 'output_text' && typeof block.text === 'string') {
              text += block.text;
            }
          }
        }
      }
    }
    // Fallback: some SDK-shaped responses expose output_text directly.
    if (!text && typeof data?.output_text === 'string') {
      text = data.output_text;
    }

    if (!text.trim()) {
      return Response.json({
        error: 'Oracle API returned no reading content. Raw shape: ' + JSON.stringify(Object.keys(data || {})).slice(0, 200),
      }, { status: 502 });
    }

    return Response.json({ reading: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}