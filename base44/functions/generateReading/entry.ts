import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// The Oracle generates a full tarot reading on OpenAI.
// Voice: spunky, warm, personal, blunt — a life coach with a wicked sense of
// humor. Every card is named WITH the deck tradition it was drawn from.
// Anti-repetition: freshly spoken every time, real advice, zero templated
// catchphrases.
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

    // Build a compact one-liner per position. EVERY card carries its deck
    // tradition (and that tradition's own name for the card), so the Oracle
    // always knows which deck world each card speaks from.
    const positionLines = cards.map((c, i) => {
      const rev = c.reversed ? ' (R)' : '';
      const clar = (c.clarifiers && c.clarifiers.length)
        ? ' · ' + c.clarifiers.map(x => `${x.name}${x.reversed ? ' (R)' : ''}`).join(' · ')
        : '';
      const tradition = c.deck_tradition || c.deck_name || 'Rider-Waite';
      const altName = c.deck_title && c.deck_title !== c.name
        ? ` — in this tradition it is called "${c.deck_title}"`
        : '';
      return `${i + 1}. POSITION: "${c.position}"  CARDS: ${c.name}${rev}${clar} [deck: ${tradition}${altName}]`;
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
      "You are The Oracle — a man (male voice, he/him if you ever refer to yourself). You read tarot like a brilliant best friend who happens to see straight through people — spunky, warm, sharp-tongued, playful, and impossible to fool. You tease the seeker affectionately. You crack a dry one-liner when the cards earn it. You get genuinely excited when the cards are good and you say so. You tell it like it is: direct, blunt, concrete, actionable advice — never vague mysticism. You are never cruel, but you never sugarcoat either. You know this person. You remember what they told you. You call them by name or title. You tell them the truth in the fewest words that will land — and you have fun doing it.",
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
      "- Each deck's flavor should color its card's message — Egyptian decks speak in pharaohs and ruin, Wildwood in the forest and the hunt, Thoth in alchemy. The reading should feel like cards from many worlds, not one generic tarot deck.",
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
      `DECK MODE: ${deck?.name || 'Rider-Waite'}${deck?.tradition ? ` (${deck.tradition})` : ''} — but individual cards may come from different traditions, as listed below.`,
      `SPREAD: ${spread?.name}${spread?.description ? ` — ${spread.description}` : ''}`,
      "",
      "CARDS DRAWN (in spread order — cover every one):",
      positionLines,
      memBlock,
      "",
      `Now speak the reading. Do NOT restate these instructions, do NOT preface. Begin directly, addressed to ${honorific}.`,
    ].join('\n');

    // Keep the provider credential server-side in Base44 secrets.
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OpenAI is not configured — missing API key.' }, { status: 500 });
    }

    // The Oracle reads cards from prompt only — no tools, no web search.
    //
    // Model fallback chain: if a model is overloaded (429), missing (404/400)
    // or returns a 5xx, we walk to the next model in the list.
    const modelChain = [
      'gpt-5.6-sol',
      'gpt-5.4',
      'gpt-4.1',
    ];

    const oracleInstructions =
      "You are The Oracle — a man; a spunky, warm, personal tarot reader with a wicked sense of humor who tells it like it is. " +
      "Write the reading as natural spoken paragraphs with NO markdown, NO bullets, NO glyphs, NO emojis. " +
      "Cover every position and every card in spread order, naming each card's deck tradition. " +
      "Give a direct verdict on the seeker's actual question, then concrete advice. " +
      "Do NOT cite sources. Do NOT include AI disclaimers. Produce ONLY the reading itself; " +
      "answer entirely from the prompt.";

    let aiRes;
    let data;
    let lastErrorDetail = '';
    let usedModel = '';
    for (const modelId of modelChain) {
      try {
        aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: oracleInstructions },
              { role: 'user', content: prompt },
            ],
            // Generous ceiling so the reading is never cut off mid-thought
            // (reasoning models spend part of this budget thinking first).
            max_completion_tokens: 6000,
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
        // Retriable failures: overloaded (429), unknown model (404/400) or any
        // 5xx from the provider — walk to the next model.
        lastErrorDetail = `${modelId} -> ${aiRes.status}: ${raw.slice(0, 300)}`;
        if (aiRes.status === 429 || aiRes.status === 404 || aiRes.status === 400 || aiRes.status >= 500) {
          continue; // try next model
        }
        // Non-retriable: surface immediately.
        return Response.json({ error: 'OpenAI API ' + aiRes.status + ': ' + raw.slice(0, 500) }, { status: 502 });
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
        error: 'All OpenAI models failed. Last: ' + lastErrorDetail.slice(0, 400),
      }, { status: 502 });
    }

    // Chat Completions response shape: choices[0].message.content.
    let text = '';
    if (Array.isArray(data?.choices) && data.choices.length) {
      text = typeof data.choices[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
    }

    if (!text.trim()) {
      return Response.json({
        error: 'OpenAI API returned no reading content. Raw shape: ' + JSON.stringify(Object.keys(data || {})).slice(0, 200),
      }, { status: 502 });
    }

    return Response.json({ reading: text, model: usedModel });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}