import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { getGateState, claimFreeReading, spendCredit, claimTeaser, checkRateLimit, releaseFreeReading, releaseTeaser, refundCredit, FREE_READINGS, SNIPPET_MAX_CHARS } from '../../shared/gate.ts';

// redeploy marker: picks up the shared gate fix (minute meter row creation)
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

    // Monetization gate: premium subscribers read freely, and EVERYONE's first
    // three readings are free — metered by an ATOMIC server-side counter
    // (OracleUsage, seeded from server-written journal history), never from
    // anything a browser does. After the free three, each reading spends one
    // credit. The admin (builder) account is always free.
    const isAdmin = user?.role === 'admin';
    // When the free reading AND any credits are gone, the seeker still gets
    // a reading — but only the opening snippet, cut off mid-flow.
    let snippetMode = false;
    // Throttle hammering before anything else runs — each call costs the
    // app money, and a script firing nonstop must be slowed down first.
    if (!isAdmin) {
      // Per-minute speed limit. Both paid functions share one counter, so
      // this and speakReading must use the SAME number to stay consistent.
      const throttled = !(await checkRateLimit(base44, user.id, 4));
      if (throttled) {
        return Response.json({ error: 'rate_limited', message: 'Slow down — one reading at a time.' }, { status: 429 });
      }
    }
    const body = await req.json();
    // Input ceilings: bound the prompt size (and so the cost per call) and
    // keep oversized or malformed payloads out of generation.
    const clampStr = (v, max) => (typeof v === 'string' ? v.slice(0, max) : v);
    const question = clampStr(body.question, 1000);
    const deck = {
      ...body.deck,
      name: clampStr(body.deck?.name, 120),
      tradition: clampStr(body.deck?.tradition, 120),
    };
    const spread = {
      ...body.spread,
      name: clampStr(body.spread?.name, 200),
      description: clampStr(body.spread?.description, 400),
      meanings: (Array.isArray(body.spread?.meanings) ? body.spread.meanings : []).slice(0, 20).map((m) => clampStr(m, 200)),
    };
    const cards = (Array.isArray(body.cards) ? body.cards : []).slice(0, 20).map((c) => ({
      ...c,
      name: clampStr(c?.name, 120),
      position: clampStr(c?.position, 120),
      deck_tradition: clampStr(c?.deck_tradition, 120),
      deck_name: clampStr(c?.deck_name, 120),
      deck_title: clampStr(c?.deck_title, 160),
      clarifiers: (Array.isArray(c?.clarifiers) ? c.clarifiers : []).slice(0, 3).map((x) => ({ name: clampStr(x?.name, 120), reversed: !!x?.reversed })),
    }));
    // TRUE MEMORY: the last 5 interactions, each one entry — the question
    // asked plus the full 880-character reading in a single block.
    const history = (Array.isArray(body.memory?.history) ? body.memory.history : [])
      .slice(-5)
      .map((h) => ({
        question: clampStr(h?.question, 500),
        summary: clampStr(h?.summary, 900),
      }))
      .filter((h) => h.question && h.summary);
    const memory = body.memory
      ? {
          user_name: clampStr(body.memory.user_name, 120),
          history,
          recurring_themes: (Array.isArray(body.memory.recurring_themes) ? body.memory.recurring_themes : []).slice(0, 12).map((t) => clampStr(t, 80)),
          reading_count: Number(body.memory.reading_count) || 0,
        }
      : null;
    if (!question || !cards.length) {
      return Response.json({ error: 'Question and cards are required' }, { status: 400 });
    }

    // ===== ACCESS + QUOTA GATE =====
    // Claimed only AFTER the request proves valid — a rejected call must never
    // cost a free reading or a credit. `charge` remembers what this request
    // reserved, so it can be handed back if no reading reaches the seeker.
    let charge = null; // 'free' | 'credit' | 'teaser'
    const { ent: entitlement, freeLeft } = isAdmin
      ? { ent: null, freeLeft: FREE_READINGS }
      : await getGateState(base44, user);
    if (!isAdmin && entitlement?.plan !== 'premium') {
      // Reserve BEFORE any paid work: atomically claim a free slot, or
      // atomically spend a credit. Each is a conditional increment verified
      // by its own applied count — the guard is checked against the live row
      // at write time, so a burst of concurrent requests can never share one
      // snapshot. If neither lands, refuse.
      const claimedFree = await claimFreeReading(base44, user);
      if (claimedFree) {
        charge = 'free';
      } else {
        const spent = entitlement && entitlement.credits >= 1
          ? await spendCredit(base44, user.id)
          : false;
        if (spent) {
          charge = 'credit';
        } else {
          snippetMode = true;
          // A teaser still runs a paid AI call — bound how many one seeker,
          // and everyone together, can trigger in a day. Over the cap they get
          // the pricing message with no generation at all.
          const teaserOk = await claimTeaser(base44, user);
          if (!teaserOk) {
            return Response.json({
              error: 'out_of_credits',
              message: "You've had all of today's glimpses. Open Pricing to hear the whole reading.",
            }, { status: 402 });
          }
          charge = 'teaser';
        }
      }
    }

    // A reservation is only earned by a reading that arrives — a provider
    // outage or an unsaved reading must not cost a free read or a credit.
    const releaseCharge = async () => {
      if (!charge) return;
      try {
        if (charge === 'free') await releaseFreeReading(base44, user);
        else if (charge === 'credit') await refundCredit(base44, user.id);
        else await releaseTeaser(base44, user);
      } catch (e) {
        console.error('generateReading: could not release the reserved charge', e?.message || e);
      }
      charge = null;
    };

    // Build a compact one-liner per position. EVERY card carries its deck
    // tradition (and that tradition's own name for the card), so the Oracle
    // always knows which deck world each card speaks from.
    // Each spread position carries a meaning (what that spot covers in the
    // seeker's life) so the Oracle can announce what a placement represents
    // before translating the card that landed there.
    const meanings = Array.isArray(spread?.meanings) ? spread.meanings : [];
    const positionLines = cards.map((c, i) => {
      const rev = c.reversed ? ' (R)' : '';
      const clar = (c.clarifiers && c.clarifiers.length)
        ? ' · ' + c.clarifiers.map(x => `${x.name}${x.reversed ? ' (R)' : ''}`).join(' · ')
        : '';
      const tradition = c.deck_tradition || c.deck_name || 'Rider-Waite';
      const altName = c.deck_title && c.deck_title !== c.name
        ? ` — in this tradition it is called "${c.deck_title}"`
        : '';
      const meaning = meanings[i] || c.position;
      return `${i + 1}. POSITION: "${c.position}" — this placement covers: ${meaning}.  CARDS: ${c.name}${rev}${clar} [deck: ${tradition}${altName}]`;
    }).join('\n');

    // A name that is just the account's email username (which the platform
    // auto-fills, e.g. "t4cmldxp82t") is never a person's name — drop it and
    // use the generic honorific instead of addressing them like that.
    // (Defined BEFORE the memory block, which reads seekerName.)
    const emailLocal = (user?.email || '').split('@')[0].toLowerCase();
    const seekerName = memory?.user_name && memory.user_name.trim().toLowerCase() !== emailLocal
      ? memory.user_name.trim()
      : '';
    const honorific = seekerName || 'my friend';

    // Memory block — her TRUE history of every interaction. She is told she
    // remembers all of it and must never deny remembering.
    const historyLines = (memory?.history || []).map((h, i) =>
      `Interaction ${i + 1} — they asked: "${h.question}" | your reading, as you gave it: ${h.summary}`);
    const lastHistory = memory?.history?.length ? memory.history[memory.history.length - 1] : null;
    const memBlock = memory?.history?.length
      ? [
          '',
          'YOUR MEMORY OF THIS SEEKER — every interaction below REALLY HAPPENED and you REMEMBER all of them. Reference them naturally when it sharpens this reading (the people they mentioned, the topics that keep coming back, the advice you gave and whether it landed). Never recite them wholesale. If the seeker suggests you forgot any of it, correct them — you must NEVER claim you do not remember.',
          `- Name/title: ${seekerName || 'unknown'}`,
          `- Recurring themes across their readings: ${(memory.recurring_themes || []).join(', ') || 'none yet'}`,
          `- Total readings so far: ${memory.reading_count || 0}`,
          ...historyLines,
          '',
        ].join('\n')
      : '';

    const prompt = [
      "You are The Oracle — an older Black woman, everybody's grandmother (female voice, she/her if you ever refer to yourself). Stern, sharp-tongued, authoritative and matter-of-fact — warm and inviting underneath, but you do not repeat yourself and you do not soften the truth. You read tarot like a brilliant best friend who happens to see straight through people — spunky, warm, sharp-tongued, playful, and impossible to fool. You tease the seeker affectionately. You crack a dry one-liner when the cards earn it. You get genuinely excited when the cards are good and you say so. You tell it like it is: direct, blunt, concrete, actionable advice — never vague mysticism. You are never cruel, but you never sugarcoat either. You know this person. You remember what they told you. You call them by name or title. You tell them the truth in the fewest words that will land — and you have fun doing it.",
      "",
      "============================================",
      "CLARIFIERS — each main card may carry one or more small clarifier cards listed after it. Read them as the nuance of that position — the detail that says WHY it's showing up or WHERE it's heading. Weave that nuance into your translation WITHOUT naming the clarifier cards (\"and the little card beside it adds…\"). Never list them dryly.",

      "============================================",
      "ANTI-REPETITION — THE MOST IMPORTANT RULE",
      "============================================",
      "- Every reading must sound freshly spoken, never templated. Two readings about the same situation should share NO sentences and no catchphrases.",
      "- NEVER use stock lines or signature phrases: no \"the cards are loud\", no \"Translation:\", no formula verdicts, no repeated imperative couplets like \"Ship it. Stop doubting.\"",
      "- Change your opening, your rhythm, and your closing line every single time. Invent the language fresh for THIS person and THIS question.",
      (lastHistory ? `- Last time you told them: "${lastHistory.summary}". Do NOT repeat or rephrase that advice. If the situation is unchanged, go deeper, get more specific, or call it out directly.` : ""),
      "- Never reuse a sentence, a transition, or a verdict from any interaction listed in your memory below — that language is already spent. Build every line of this reading from scratch.",
      "- THEIR HISTORY IS PRIVATE CONTEXT, NOT MATERIAL: everything you already know about them (in the memory section below) has ALREADY been said to them in past readings. NEVER restate it — no \"as you know\", no recapping their loss, their work, their situation, their past readings. Retelling it makes every reading sound identical, and this one must sound like the first. Use that knowledge SILENTLY, only to sharpen what the cards are saying NOW. The only time personal history may surface is when THIS spread's cards make it unavoidable, and even then only inside a brand-new insight, never as its own sentence.",
      "",
      "============================================",
      "FORMAT — THIS WILL BE SPOKEN ALOUD",
      "============================================",
      "- Write it as natural speech: plain flowing paragraphs. NO markdown, NO bullets, NO headers, NO glyphs, NO emojis, NO colons followed by lists.",
      `- Address them by name ("${honorific}") naturally 2–3 times, never mechanically.`,
      "- OPEN by addressing them by name and restating their question, then name the deck set and the spread they chose. ALWAYS in this shape, with fresh wording each time: \"[Name], you want to know [their question]. This reading is from the [deck set — 'the blended decks' or the single deck's name], and the spread you have chosen is [spread name].\" NEVER skip the question, the deck set, or the spread name — all three, every reading. Then flow straight into the positions.",
      "- NEVER say the names of the tarot cards. Not once. The seeker can SEE every card on the table in front of them — naming it aloud is redundant and kills the pace. You use the cards drawn at each position (given below) as YOUR private knowledge to shape what you say — but in your speech you go straight from the placement to the truth it holds. The card names, their deck traditions, and any alternate tradition names in brackets are for your eyes only.",
      "- Go position by position, in spread order, and NEVER skip a position. For EACH position, speak two beats in one breath: FIRST, what that placement represents in their life right now, said personally — \"first, let's look at what's really going on with you…\", \"and your challenge — this is what's blocking you today…\", \"and this is how it's affecting you right now\" — vary the phrasing every time, never use the same transition twice. SECOND, a blunt, specific translation of what that placement means for their actual question and their life, built from the cards that landed there (which you never name). Then move to the next position naturally (\"and now…\", \"next up…\"). No tarot lectures, no card-meaning explainers, no symbolism.",
      "- Weave in what you know about them — from your memory of every past interaction listed below — when it sharpens the point: their situation, what they asked before, the people and topics that keep coming back. Speak TO them, like the two of you are mid-conversation: reference what they just told you, react to it, ask nothing but keep them in it.",
      "- Answer their ACTUAL question out loud, directly — a real verdict, stated as the truth. No hedging, no \"the cards suggest.\"",
      "- Then give ADVICE: a short stretch of direct, concrete advice — what to do this week, what to stop doing, what to watch for. Firm. Tell it like it is.",
      "- Close with ONE short punchy line that lands — different every time.",
      "- Length: 200–350 words. Tight and dense — no filler, no long-winded passages, every line earns its place. You MUST still cover every spread position (the heart of the matter, the challenge, every placement) and every clarifier — compressed, never skipped.",
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
      "HOW YOU USE ALL OF THIS: The question is the spine of the whole reading — every position you read comes back around to what they actually asked. You are not reciting cards, you are TALKING to them: the question, the placement's meaning, the card drawn there, the clarifiers beside it, and everything you already know about them (their work, their goals, what trips them up, what lights them up) all fuse into one personal, connected story. Real advice means advice built from THEIR specifics — name their goal, their habit, their situation when you tell them what to do.",
      "",
      "CARDS DRAWN (in spread order — cover every one):",
      positionLines,
      memBlock,
      "",
      `Now speak the reading. Do NOT restate these instructions, do NOT preface. Begin directly, addressed to ${honorific}.`,
    ].join('\n');

    // TEASER MODE: the Oracle gives only the opening — a hook that cuts off
    // right as the real reading begins. Same persona, a fraction of the cost.
    let finalPrompt = prompt;
    let maxTokens = 6000;
    if (snippetMode) {
      finalPrompt = [
        "You are The Oracle — an older Black woman, everybody's grandmother. Stern, sharp-tongued, warm underneath; you tease the seeker affectionately and speak in plain flowing paragraphs. NO markdown, NO bullets, NO emojis, NO headers. NEVER name tarot cards.",
        "",
        `TEASER — this seeker's free reading is used up and they are not a member. Write ONLY the very beginning of the reading, 45–70 words: address them by name ("${honorific}"), restate their question, name the deck set and the spread they chose, then begin the first position — and STOP mid-flow, mid-thought. Do not conclude anything, do not finish the reading.`,
        "",
        `THE SEEKER: ${honorific}`,
        `THEIR QUESTION: "${question}"`,
        `DECK MODE: ${deck?.name || 'Rider-Waite'}${deck?.tradition ? ` (${deck.tradition})` : ''}`,
        `SPREAD: ${spread?.name}${spread?.description ? ` — ${spread.description}` : ''}`,
        "",
        `Now speak the teaser. Do NOT restate these instructions, do NOT preface. Begin directly, addressed to ${honorific}.`,
      ].join('\n');
      maxTokens = 220;
    }

    // Keep the provider credential server-side in Base44 secrets.
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      await releaseCharge();
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
      "You are The Oracle — a wise older Black woman, everybody's grandmother; a spunky, warm, personal tarot reader with a wicked sense of humor who tells it like it is. " +
      "Write the reading as natural spoken paragraphs with NO markdown, NO bullets, NO glyphs, NO emojis. " +
      "Cover every position in spread order. NEVER speak the names of the tarot cards or their deck traditions — the seeker sees the cards themselves; use them only as your private knowledge. " +
      "Open by restating the seeker's question, then name the deck set and the spread they chose, then walk the positions. " +
      "Give a direct verdict on the seeker's actual question, then concrete advice. " +
      "Do NOT cite sources. Do NOT include AI disclaimers. " +
      "Answer entirely from the prompt.";

    let aiRes;
    let data;
    let lastErrorDetail = '';
    let lastWasBusy = false;
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
              { role: 'user', content: finalPrompt },
            ],
            // Generous ceiling so the reading is never cut off mid-thought
            // (reasoning models spend part of this budget thinking first).
            max_completion_tokens: maxTokens,
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
        lastWasBusy = aiRes.status === 429;
        if (aiRes.status === 429 || aiRes.status === 404 || aiRes.status === 400 || aiRes.status >= 500) {
          continue; // try next model
        }
        // Non-retriable: the provider's raw body NEVER reaches the client — it
        // can carry model ids and account identifiers. It is logged here
        // instead; the client gets a stable, generic error.
        console.error('generateReading: provider rejected request', { model: modelId, status: aiRes.status, body: raw.slice(0, 500) });
        await releaseCharge();
        return Response.json(
          { error: 'provider_error', message: "The Oracle couldn't finish the reading — try again in a moment." },
          { status: 502 },
        );
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
      // Same rule for the exhausted-fallback path: raw provider detail stays
      // server-side; a busy provider gets its own friendlier message.
      console.error('generateReading: all models failed', lastErrorDetail.slice(0, 600));
      await releaseCharge();
      return Response.json(
        {
          error: lastWasBusy ? 'provider_busy' : 'provider_error',
          message: lastWasBusy
            ? 'The Oracle is busy right now — try again in a moment.'
            : "The Oracle couldn't finish the reading — try again in a moment.",
        },
        { status: 502 },
      );
    }

    // Chat Completions response shape: choices[0].message.content.
    let text = '';
    if (Array.isArray(data?.choices) && data.choices.length) {
      text = typeof data.choices[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
    }

    if (!text.trim()) {
      console.error('generateReading: no reading content', JSON.stringify(Object.keys(data || {})).slice(0, 200));
      await releaseCharge();
      return Response.json(
        { error: 'provider_error', message: "The Oracle couldn't finish the reading — try again in a moment." },
        { status: 502 },
      );
    }

    // The teaser is clipped at a sentence boundary — it must feel cut off.
    if (snippetMode) text = trimSnippet(text);

    // SERVER-SIDE usage record: the reading is logged BEFORE it is handed
    // back, so direct API and MCP callers are counted too — the free-tier
    // counter can no longer be bypassed by skipping the app's UI. Uses this
    // user's own client (not service role) so the entry is owned by them.
    try {
      await base44.entities.JournalEntry.create({
        question,
        deck: deck?.name || 'Rider-Waite',
        spread: spread?.name || 'Custom',
        cards_drawn: cards.map((c) => ({
          name: c.name,
          reversed: !!c.reversed,
          position: c.position || '',
          clarifiers: (c.clarifiers || []).map((x) => ({ name: x.name, reversed: !!x.reversed })),
        })),
        interpretation: text,
        audio_url: null,
      });
    } catch (logError) {
      // Fail closed: an unlogged reading is an unpaid reading.
      console.error('generateReading: could not record journal entry', logError);
      await releaseCharge();
      return Response.json({ error: 'Could not record the reading — try again.' }, { status: 500 });
    }

    if (snippetMode) {
      return Response.json({
        reading: text,
        model: usedModel,
        snippet: true,
        message: "Your one free reading is done — every reading after it cuts off here. Sign up in Pricing to hear the whole truth.",
      });
    }
    return Response.json({ reading: text, model: usedModel });
  } catch (error) {
    // Log the real cause server-side; never echo internal details to callers.
    console.error("generateReading: unhandled error", error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

// Clip the teaser at the last sentence end inside the budget — never
// mid-word, and never long enough to give the reading away.
function trimSnippet(text) {
  const cut = text.slice(0, SNIPPET_MAX_CHARS);
  const stops = [cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? ')]
    .filter((i) => i > SNIPPET_MAX_CHARS * 0.4);
  const at = stops.length ? Math.max(...stops) + 1 : cut.length;
  return cut.slice(0, at).trim();
}