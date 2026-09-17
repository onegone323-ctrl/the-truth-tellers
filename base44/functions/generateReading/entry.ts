import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

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

    // Build a compact one-liner per position so the model can format each
    // section with the cards bundled on a single line (no per-card headings).
    const positionLines = cards.map((c, i) => {
      const rev = c.reversed ? ' (R)' : '';
      const clar = (c.clarifiers && c.clarifiers.length)
        ? ' · ' + c.clarifiers.map(x => `${x.name}${x.reversed ? ' (R)' : ''}`).join(' · ')
        : '';
      const deckHint = c.deck_title && c.deck_title !== c.name
        ? ` [in ${c.deck_name || 'this deck'} called "${c.deck_title}"]`
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

    // A short glyph pool the Oracle can pick from for each position header.
    // Every section gets ONE glyph, and no glyph repeats within a reading.
    const glyphPool = '❧ ☀ ✦ ✶ 𓋹 ☾ ⚡ ♆ ✧ ☿ ⚔ ✵ ❂ ☘ ◈';

    const prompt = [
      "You are The Oracle. You read tarot the way a great life coach reads a room — direct, personal, firm, unafraid to be blunt. You are NOT a mystical fortune teller. You do not hedge, do not stall, do not pad. You know this person. You remember what they told you. You call them by name or title. You tell them the truth in the fewest words that will land.",
      "",
      "============================================================",
      "HARD FORMAT RULES — FOLLOW EXACTLY. Deviating is a failure.",
      "============================================================",
      "",
      "STRUCTURE (in this exact order):",
      "",
      `1. OPENING PARAGRAPH, NO HEADING. 2–4 short sentences. Start by addressing them by name ("${honorific}…"). State what this reading is ACTUALLY about — the specific thing in their life this spread is speaking to. Name it concretely, not abstractly. Say one line about the tone of the message ("clear, sharp, and honest" / "hard, necessary, freeing" / etc.). If a memory detail grounds the reading (their app, their goal, their situation, a person in their life), NAME it explicitly.`,
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
      `   - Bullets are 8–16 words max. No paragraphs inside sections.`,
      `   - Do NOT explain any card's traditional meaning. Only what it means for THEM right now, in this position, tied to their question.`,
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
      "- Speak like a firm life coach. Direct, blunt, loving, even a little rude when the truth demands it. Never cruel. Never mystical.",
      "- Every bullet must be about THEM. If a bullet could apply to a stranger on the street, rewrite it or delete it.",
      "- USE THE MEMORY. If you know their app name, their goal, a person they mentioned, what they asked last time — REFERENCE IT NATURALLY. The whole point of memory is you sound like someone who's been paying attention.",
      "- No AI disclaimers. No \"the cards suggest.\" State the truth as the truth.",
      "- No tarot lectures. No numerology. No symbolism explainers. Skip it all. The reading is about their LIFE, not about tarot.",
      "- Length target: 350–650 words total. Compact and dense. Every line earns its space.",
      "",
      "============================================================",
      "CONTEXT",
      "============================================================",
      "",
      `THE SEEKER: ${honorific}`,
      `THEIR QUESTION: "${question}"`,
      `DECK: ${deck?.name || 'Rider-Waite'}${deck?.tradition ? ` (${deck.tradition})` : ''}`,
      `SPREAD: ${spread?.name}${spread?.description ? ` — ${spread.description}` : ''}`,
      "",
      "CARDS DRAWN (use these EXACT position names as your section headers, in this order):",
      positionLines,
      memBlock,
      "",
      `Now write the reading. Do NOT restate these instructions. Do NOT preface. Begin directly with the opening paragraph addressed to ${honorific}.`,
    ].join('\n');

    // Keep the provider credential server-side in Base44 secrets.
    const apiKey = secrets.get('perplexity_api_key');
    if (!apiKey) {
      return Response.json({ error: 'Perplexity is not configured — missing API key.' }, { status: 500 });
    }

    // Perplexity's Sonar chat-completions endpoint has been migrated to the
    // Agent API. We call /v1/agent (also aliased at /v1/responses).
    //
    // The Oracle reads cards — she doesn't need to search the web for each
    // reading — so we deliberately DON'T pass a `tools` array. The model
    // answers from the prompt only.
    let aiRes;
    try {
      aiRes = await fetch('https://api.perplexity.ai/v1/agent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.6-sol',
          instructions:
            "You are The Oracle — a firm, personal, direct life coach who reads tarot. " +
            "Follow the user's formatting rules EXACTLY. Use the position names from the spread " +
            "as your section headers. Do NOT create per-card sub-headings. Do NOT cite sources. " +
            "Do NOT reference web pages. Do NOT include AI disclaimers. Produce ONLY the reading " +
            "in the exact structure specified. Do not use any tools; answer entirely from the prompt.",
          input: prompt,
          max_output_tokens: 2400,
          temperature: 0.85,
        }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError') {
        return Response.json({ error: 'Perplexity API timed out.' }, { status: 504 });
      }
      throw error;
    }

    const raw = await aiRes.text();
    if (!aiRes.ok) {
      return Response.json({ error: 'Perplexity API ' + aiRes.status + ': ' + raw.slice(0, 500) }, { status: 502 });
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Perplexity API returned invalid JSON.' }, { status: 502 });
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
        error: 'Perplexity API returned no reading content. Raw shape: ' + JSON.stringify(Object.keys(data || {})).slice(0, 200),
      }, { status: 502 });
    }

    return Response.json({ reading: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
