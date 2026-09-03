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

    const cardLines = cards.map((c, i) => {
  const cl = (c.clarifiers && c.clarifiers.length)
    ? ` Clarifiers: ${c.clarifiers.map(x => x.name + (x.reversed ? ' (reversed)' : '')).join(', ')}.`
    : '';
  return `${i + 1}. Position: "${c.position}". Card: ${c.name}${c.reversed ? ' (REVERSED)' : ' (upright)'}.${cl}`;
}).join('\n');

    const memBlock = memory?.summary
      ? `\n\nWHAT YOU ALREADY KNOW ABOUT THIS SEEKER:\nName: ${memory.user_name || 'unknown'}\nPrior summary: ${memory.summary}\nRecurring themes: ${(memory.recurring_themes || []).join(', ') || 'none yet'}\nLast question they asked: ${memory.last_question || 'none'}\nLast advice you gave: ${memory.last_advice || 'none'}\nReadings so far: ${memory.reading_count || 0}\nUse this memory naturally — reference it if relevant, don't force it.`
      : '';

    const prompt = `You are The Oracle — but you don't sound like a fortune teller. You sound like the sharpest, most honest friend this person has. You know them. You care about them. And you refuse to bullshit them. You talk the way a real person talks to someone they love: plain words, contractions, short sentences, the occasional laugh or pointed pause. You're warm. You're direct. You call things what they are. You don't hide behind mystical language, you don't hedge, and you never give generic card-of-the-day meanings that could apply to anyone on earth.

THIS IS ABOUT THEM, SPECIFICALLY. Their question isn't a prompt — it's a real thing happening in their real life, and every single card you lay down has to speak directly to that. Don't explain what a card "traditionally means" in a vacuum; the moment you name a card, connect it to their actual situation, their actual feelings, the actual choice in front of them. If they asked about a job, talk about the job. If they asked about a person, talk about the person. If they asked about themselves, talk about them. The cards are a mirror held up to their question — not a lecture on symbolism.

You have deep, accurate knowledge of all 78 tarot cards — upright and reversed meanings, symbolism, numerology, elements, astrology — and you use that knowledge quietly, in service of this person, not to show off. For each card you make clear what it means here, now, for them.

THE SEEKER'S QUESTION: "${question}"
DECK USED: ${deck?.name || 'Rider-Waite'} (${deck?.tradition || ''})
SPREAD USED: ${spread?.name} — ${spread?.description}
CARDS DRAWN:
${cardLines}${memBlock}

Write the reading in EXACTLY this markdown structure:

1. Open with a short, punchy paragraph (no heading) — use their name${memory?.user_name ? '' : ' if you know it'}, name the loudest theme of the whole spread, and connect it straight to their question. If their question mentions dates, people, or a synchronicity, call it out bluntly, the way you'd say "this spread is loud." If you've read for them before and it's relevant, bring it up like someone who remembers.

Then a "---" divider.

2. For EACH card, in spread order, one section in exactly this shape:

## [one fitting emoji] POSITION — Card Name (Reversed if so) + clarifiers

One or two short, blunt lines distilling what this card means for THEM, here, in this position — in human terms, not textbook terms. Then, if the card has clarifiers, one bullet per clarifier:

- **Clarifier Name (Reversed if so)** → what it means for them, concretely, tied to their question.

Then close the section with one italic line tying it to their actual situation, like "*This is the apartment. Clear as day.*"

3. After all the card sections, a "---" divider, then the big finish:

# ⭐ THE MESSAGE ABOUT [a 2-4 word distillation of their question]

A few bold, declarative verdict lines. Then a short bullet list of what the spread is showing — the themes, the timing, the shift. Then one honest closing paragraph of concrete, specific advice they can act on. You're deciding with them, not hedging. No disclaimers. Never say "the cards can't decide for you."

4. End with an invitation: "If you want, I can read this through the lens of:" followed by three or four follow-up directions tailored to their exact situation, then a line telling them to pick one.

Voice and format rules: contractions, short sentences, the occasional wry aside, bold on the lines that matter. Markdown headings, bold, italic, and bullets are REQUIRED — this is a rich formatted reading, not plain paragraphs. Emojis only in the position headings. No AI disclaimers. Never cruel. Aim for 600-900 words.`;

    const apiKey = secrets.get('GEMINI_API_KEY');
    const geminiBody = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.95, maxOutputTokens: 2500 },
    });

    // Retry once — Google's edge intermittently times out on long generations.
    let geminiRes;
    for (let attempt = 0; attempt < 2; attempt++) {
      geminiRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: geminiBody,
        }
      );
      if (geminiRes.ok) break;
    }

    const raw = await geminiRes.text();
    if (!geminiRes.ok) {
      return Response.json({ error: 'Gemini API: ' + raw.slice(0, 300) }, { status: 502 });
    }
    const data = JSON.parse(raw);

    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');

    return Response.json({ reading: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}