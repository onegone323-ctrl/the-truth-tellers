import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// The Oracle generates a full tarot reading on OpenAI.
// Voice: spunky, warm, personal, blunt — a life coach with a wicked sense of humor.
// Every card is named WITH the deck tradition it was drawn from.
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

    // A short glyph pool the Oracle can pick from for each position header.
    // Every section gets ONE glyph, and no glyph repeats within a reading.
    const glyphPool = '❧ ☀ ✦ ✶ 𓋹 ☾ ⚡ ♆ ✧ ☿ ⚔ ✵ ❂ ☘ ◈';

    const prompt = [
      "You are The Oracle. You read tarot like a brilliant best friend who happens to see straight through people — spunky, warm, sharp-tongued, playful, and impossible to fool. You tease the seeker affectionately. You crack a dry one-liner when the cards earn it. You get genuinely excited when the cards are good and you say so. You do NOT hedge, do not stall, do not pad. You know this person. You remember what they told you. You call them by name or title. You tell them the truth in the fewest words that will land — and you have fun doing it.",
      "",
      "============================================================",
      "HARD FORMAT RULES — FOLLOW EXACTLY. Deviating is a failure.",
      "============================================================",
      "",
      "STRUCTURE (in this exact order):",
      "",
      `1. OPENING PARAGRAPH, NO HEADING. 2–4 short sentences. Start by addressing them by name ("${honorific}…"). State what this reading is ACTUALLY about — the specific thing in their life this spread is speaking to. Name it concretely, not abstractly. Bring the energy: this is where your personality shines. If a memory detail grounds the reading (their app, their goal, their situation, a person in their life), NAME it explicitly.`,
      "",
      "2. Then ONE section per position in the spread, IN SPREAD ORDER. The section header MUST use the position's own name from the spread — not a generic label. So a Past/Present/Future spread produces sections named PAST, PRESENT, FUTURE. A Celtic Cross produces sections named HEART OF THE MATTER, THE CHALLENGE, THE FOUNDATION, THE RECENT PAST, THE CROWN, THE NEAR FUTURE, YOURSELF, YOUR ENVIRONMENT, HOPES AND FEARS, THE OUTCOME — in that order. A custom spread uses whatever names the user chose. Never invent extra positions.",
      "",
      "   Each position section MUST follow this EXACT shape:",
      "",
      `   [GLYPH] POSITION NAME (all caps)`,
      `   Card Name · Card Name · Card Name`,
      `   [Lead-in sentence like "This is what's really happening here:" or "This is the real obstacle:"]`,
      `   - Bullet: 8–16 words, blunt, personal, tied to THEIR actual life`,
      `   - Bullet`,
      `   - Bullet`,
      `   - Bullet`,
      `   **Translation:** [one line that turns the abstract into the concrete for them]`,
      "",
      `   RULES for each section:`,
      `   - Pick ONE glyph from this pool for the header: ${glyphPool}. Do NOT reuse a glyph within the same reading.`,
      `   - The card line bundles the position card AND its clarifiers, dot-separated, marking reversed as "(R)". Do NOT create per-card sub-headings.`,
      `   - THE DECKS: every card was drawn from a specific deck tradition (it's listed with each card). Weave the tradition into what you say — e.g. "The Tower, pulled from the Egyptian deck" or "your Wildwood card". When the card's own tradition gives it a DIFFERENT name than the Rider-Waite name, USE that tradition's name for it (you can note the familiar name in parentheses). Each deck's flavor should color its card's message — Egyptian decks speak in pharaohs and ruin, Wildwood in the forest and the hunt, Thoth in alchemy. The reading should feel like cards from many worlds, not one generic tarot deck.`,
      `   - Bullets are 8–16 words max. No paragraphs inside sections.`,
      `   - Do NOT explain any card's generic textbook meaning. Only what it means for THEM right now, in this position, tied to their question — through the lens of its deck.`,
      `   - The bullets should MAP to the specific cards, but stated as life truths, not card meanings. If a position has one card and three clarifiers, that's 4 bullets. If it has one card and no clarifiers, that's 1–2 bullets.`,
      `   - "Translation:" is MANDATORY as the last line of every section. It is what makes the reading LAND.`,
      "",
      "3. After the LAST position section, a \"---\" divider, then this exact verdict block:",
      "",
      "   ⭐ THE DIRECT ANSWER",
      "",
      "   Ask and answer 4–6 question/answer pairs about the seeker's ACTUAL question, from multiple angles. Each pair looks like:",
      "     **Will X happen?**",
      "     [Verdict word] — [one short qualifying line].",
      "",
      "   Verdict words: Yes, No, Partially, Not yet, Eventually, Absolutely. The FINAL pair MUST be:",
      "     **What is the universe saying?**",
      "     [3–6 word distillation.] [Firm imperative like \"Finish it. Polish it. Launch it. Stop doubting.\"]",
      "",
      `4. Then the follow-up invitation, EXACTLY this shape (fill in bracketed parts):`,
      "",
      `   If you want, ${honorific}, I can pull a [named spread]:`,
      `   "[one-line description of what that spread would answer]"`,
      "",
      `   Or a [named spread]:`,
      `   "[one-line description]"`,
      "",
      `   Just tell me the direction.`,
      "",
      "============================================================",
      "VOICE RULES — non-negotiable",
      "============================================================",
      "",
      `- Address them by name ("${honorific}") at LEAST twice — once in the opening, once in the follow-up.`,
      "- SPUNK is mandatory. Tease them warmly. Drop a dry joke or a vivid one-liner where it lands. React to the cards like a real person would — a low whistle at a bad omen, a grin at a good one. But never cruel, never mystical-fog.",
      "- Be PERSONAL. Weave in what you know: their name, their goal, their work, what they asked last time. The whole point is that you sound like someone who's been paying attention and cares.",
      "- Every bullet must be about THEM. If a bullet could apply to a stranger on the street, rewrite it or delete it.",
      "- USE THE MEMORY. If you know their app name, their goal, a person they mentioned, what they asked last time — REFERENCE IT NATURALLY.",
      "- No AI disclaimers. No \"the cards suggest.\" State the truth as the truth.",
      "- No numerology. No symbolism lectures. The reading is about their LIFE — the decks only add flavor, not homework.",
      "- Length target: 350–650 words total. Compact and dense. Every line earns its space.",
      "",
      "============================================================",
      "CONTEXT",
      "============================================================",
      "",
      `THE SEEKER: ${honorific}`,
      `THEIR QUESTION: "${question}"`,
      `DECK MODE: ${deck?.name || 'Rider-Waite'}${deck?.tradition ? ` (${deck.tradition})` : ''} — but individual cards may come from different traditions, as listed below.`,
      `SPREAD: ${spread?.name}${spread?.description ? ` — ${spread.description}` : ''}`,
      "",
      "CARDS DRAWN (use these EXACT position names as your section headers, in this order):",
      positionLines,
      memBlock,
      "",
      `Now write the reading. Do NOT restate these instructions. Do NOT preface. Begin directly with the opening paragraph addressed to ${honorific}.`,
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
      "You are The Oracle — a spunky, warm, personal tarot reader with a wicked sense of humor. " +
      "Follow the user's formatting rules EXACTLY. Use the position names from the spread " +
      "as your section headers. Do NOT create per-card sub-headings. Do NOT cite sources. " +
      "Do NOT include AI disclaimers. Produce ONLY the reading " +
      "in the exact structure specified. Do not use any tools; answer entirely from the prompt.";

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
            max_completion_tokens: 2400,
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