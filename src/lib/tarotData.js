// The Truth Teller — Tarot knowledge base: 78 cards, decks, spreads

export const DECKS = [
  {
    id: "rider-waite",
    name: "Rider-Waite",
    tradition: "Rider-Waite-Smith",
    description: "The classic 1909 deck — the universal language of tarot.",
    accent: "#d4af37",
    backGlyph: "☀",
  },
  {
    id: "egyptian",
    name: "Egyptian",
    tradition: "Egyptian / Ramsès",
    description: "Ancient Egyptian symbolism — gods, ankhs, and the Book of the Dead.",
    accent: "#e6c068",
    backGlyph: "𓂀",
  },
  {
    id: "thoth",
    name: "Thoth",
    tradition: "Aleister Crowley",
    description: "Crowley & Harris — alchemy, Thelema, and cosmic geometry.",
    accent: "#c9a227",
    backGlyph: "✦",
  },
  {
    id: "marseille",
    name: "Marseille",
    tradition: "Tarot de Marseille",
    description: "The old French woodcut style — stark, symbolic, unadorned.",
    accent: "#b8860b",
    backGlyph: "✶",
  },
];

// When the seeker blends the decks, each card carries whichever tradition speaks loudest.
export const BLENDED_DECK = {
  id: "blended",
  name: "Blended",
  tradition: "All traditions blended",
  description: "Cards drawn from across every deck — each carries the tradition it speaks loudest in.",
  accent: "#d4af37",
  backGlyph: "✶",
};

const MAJOR = [
  ["The Fool", "Beginnings, innocence, spontaneity, a leap of faith taken freely.", "Recklessness, naivety, risk taken without thought, a foolish gamble."],
  ["The Magician", "Manifestation, willpower, skill, the tools to create are in your hands.", "Manipulation, untapped talents, trickery, misuse of power."],
  ["The High Priestess", "Intuition, the unconscious, secrets, listen to the inner voice.", "Secrets kept from you, disconnection from intuition, ignored gut feelings."],
  ["The Empress", "Abundance, nurturing, fertility, creativity, nature's growth.", "Creative block, dependence, smothering, neglect of self-care."],
  ["The Emperor", "Authority, structure, stability, fatherly control, a firm foundation.", "Domination, rigidity, inflexibility, abuse of power, control issues."],
  ["The Hierophant", "Tradition, convention, spiritual wisdom, guidance, institutions.", "Rebellion, unconventional beliefs, freedom from dogma, bad advice."],
  ["The Lovers", "Love, harmony, partnership, a meaningful choice of the heart.", "Disharmony, imbalance, misalignment, a broken choice or trust."],
  ["The Chariot", "Determination, willpower, victory through control and focus.", "Lack of direction, aggression, scattered force, defeat."],
  ["Strength", "Inner strength, courage, patience, compassion taming the beast.", "Self-doubt, weakness, insecurity, raw emotion unleashed."],
  ["The Hermit", "Soul-searching, introspection, inner guidance, solitude.", "Isolation, withdrawal, loneliness, losing your way."],
  ["Wheel of Fortune", "Cycles, fate, turning points, luck and change arriving.", "Bad luck, resistance to change, setbacks, breaking cycles."],
  ["Justice", "Truth, fairness, cause and effect, accountability, balance.", "Dishonesty, unfairness, avoidance of truth, imbalance."],
  ["The Hanged Man", "Surrender, new perspective, pause, sacrifice for insight.", "Stalling, indecision, resistance, pointless sacrifice."],
  ["Death", "Endings, transformation, transition, one door closing for another.", "Resistance to change, stagnation, holding on, decay."],
  ["Temperance", "Balance, moderation, patience, blending opposites into harmony.", "Imbalance, excess, impatience, extremes."],
  ["The Devil", "Bondage, addiction, materialism, the chains we forge ourselves.", "Releasing chains, reclaiming power, awareness of attachments."],
  ["The Tower", "Sudden upheaval, revelation, false foundations crumbling.", "Disaster averted, resisting necessary change, fear of truth."],
  ["The Star", "Hope, faith, renewal, inspiration, guidance from above.", "Despair, hopelessness, disconnection, lost faith."],
  ["The Moon", "Illusion, fear, the unconscious, things hidden in shadow.", "Release of fear, clarity emerging, confusion lifting."],
  ["The Sun", "Joy, success, vitality, truth, warmth and clarity.", "Temporary cloud, delayed success, diminished joy."],
  ["Judgement", "Rebirth, reckoning, awakening, a call to rise renewed.", "Self-doubt, refusal of the call, harsh self-judgement."],
  ["The World", "Completion, accomplishment, wholeness, the cycle fulfilled.", "Incompletion, loose ends, a cycle not yet closed."],
];

const SUIT_MEANINGS = {
  Wands: { element: "Fire", theme: "passion, drive, ambition, creativity, action" },
  Cups: { element: "Water", theme: "emotion, relationships, love, intuition, the heart" },
  Swords: { element: "Air", theme: "intellect, conflict, truth, decisions, the mind" },
  Pentacles: { element: "Earth", theme: "money, work, body, resources, the material world" },
};

const COURT = {
  Page: "A messenger; the start of the suit's energy, eager and learning.",
  Knight: "Action and pursuit; the suit's energy in motion, sometimes reckless.",
  Queen: "Mastery from within; the suit's energy embodied and nurturing.",
  King: "Mastery in the world; authority, control, the suit's energy fully realized.",
};

const NUMBER_MEANINGS = {
  1: "the spark, a new beginning, pure potential",
  2: "duality, partnership, a choice between two",
  3: "expansion, collaboration, the first creation",
  4: "stability, foundation, structure — or being stuck",
  5: "conflict, change, disruption that forces growth",
  6: "harmony, giving and receiving, balance restored",
  7: "assessment, introspection, looking deeper before acting",
  8: "movement, power, momentum building",
  9: "near completion, culmination, the end in sight",
  10: "completion, transition, the cycle's final step",
};

function buildMinor(suit) {
  const el = SUIT_MEANINGS[suit];
  const cards = [];
  for (let n = 1; n <= 10; n++) {
    cards.push([
      `${n === 1 ? "Ace" : n} of ${suit}`,
      `${n === 1 ? `A new surge of ${el.theme} — a gift, an opening, pure potential.` : `The energy of ${el.theme} at the stage of ${NUMBER_MEANINGS[n]}.`}`,
      `${n === 1 ? `A missed or blocked opportunity in ${el.theme}; potential not yet acted on.` : `Disruption or imbalance in ${el.theme}; ${NUMBER_MEANINGS[n]} turned inward or stalled.`}`,
    ]);
  }
  for (const court of ["Page", "Knight", "Queen", "King"]) {
    cards.push([
      `${court} of ${suit}`,
      `${COURT[court]} In the realm of ${el.theme} (${el.element}).`,
      `${COURT[court].replace("the suit's energy", "its energy")} — but shadowed: excess, immaturity, or misuse of ${el.theme}.`,
    ]);
  }
  return cards;
}

export const CARDS = [
  ...MAJOR.map(([name, up, rev]) => ({
    name,
    arcana: "Major",
    upright: up,
    reversed: rev,
    keywords: up.split(", ").slice(0, 4),
  })),
  ...["Wands", "Cups", "Swords", "Pentacles"].flatMap((suit) =>
    buildMinor(suit).map(([name, up, rev]) => ({
      name,
      arcana: "Minor",
      suit: suit,
      element: SUIT_MEANINGS[suit].element,
      upright: up,
      reversed: rev,
      keywords: up.split(", ").slice(0, 4),
    }))
  ),
];

export const SPREADS = [
  // General
  { id: "single", name: "Single Card", category: "General", description: "One card, one truth. Quick guidance for the moment.", positions: ["The Card"] },
  { id: "three-card", name: "Three Card", category: "General", description: "Past, present, future — the arc of your question.", positions: ["Past", "Present", "Future"] },
  { id: "body-mind-spirit", name: "Body, Mind, Spirit", category: "General", description: "A threefold look at where you stand right now.", positions: ["Body", "Mind", "Spirit"] },
  { id: "celtic-cross", name: "Celtic Cross", category: "General", description: "The classic ten-card deep reading — every angle covered.", positions: ["The Heart of the Matter", "The Challenge", "The Foundation", "Recent Past", "Possible Outcome", "Near Future", "Your Self", "External Influences", "Hopes & Fears", "Final Outcome"] },
  { id: "horseshoe", name: "Horseshoe", category: "General", description: "Seven cards in an arc — a full picture of the path ahead.", positions: ["Past", "Present", "Hidden Influences", "Obstacles", "External Influences", "Advice", "Outcome"] },
  { id: "star", name: "Five Point Star", category: "General", description: "A pentagram of five cards — the shape of your situation.", positions: ["The Core", "The Past", "The Future", "The Hidden", "The Outcome"] },
  { id: "mandala", name: "Mandala", category: "General", description: "Nine cards in a circle — a complete view of the self.", positions: ["Center", "Past", "Present", "Future", "Conscious", "Unconscious", "Strength", "Challenge", "Outcome"] },
  { id: "zodiac", name: "Zodiac Wheel", category: "General", description: "Twelve cards around the wheel — one for each house.", positions: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] },

  // Love
  { id: "relationship", name: "Relationship", category: "Love", description: "You, them, and the bond between — where the heart stands.", positions: ["You", "Them", "The Connection", "Strengths", "Challenges", "Where It's Heading"] },
  { id: "soulmate", name: "Soulmate", category: "Love", description: "Is this the one? What the bond is really made of.", positions: ["You", "Them", "The Bond", "What Draws You", "What Tests You", "The Potential"] },
  { id: "love-triangle", name: "Love Triangle", category: "Love", description: "Three hearts in tension — clarity for a tangled situation.", positions: ["You", "Option A", "Option B", "What You Really Want", "The Truth of It"] },
  { id: "broken-heart", name: "Broken Heart", category: "Love", description: "Healing after hurt — what happened, and how to mend.", positions: ["What Happened", "How You Feel", "What You Need", "What You've Learned", "How to Heal", "Moving Forward"] },
  { id: "will-they-return", name: "Will They Return?", category: "Love", description: "The question that won't rest — the truth about their return.", positions: ["Them Now", "How They Feel", "What Stands Between", "Their Intentions", "The Likely Outcome"] },

  // Career
  { id: "career", name: "Career", category: "Career", description: "Your work, your path, and what's blocking the way forward.", positions: ["Current State", "Your Strengths", "Challenges", "What's Hidden", "Advice", "Outcome"] },
  { id: "job-offer", name: "Job Offer", category: "Career", description: "Should you take it? What the offer really holds.", positions: ["The Offer", "What You Bring", "What They Want", "The Hidden Catch", "Advice", "The Likely Outcome"] },
  { id: "work-crossroads", name: "Work Crossroads", category: "Career", description: "Two roads in your career — which way leads to you.", positions: ["Where You Are", "Path A", "Path B", "What You're Missing", "What You Need", "The Way Through"] },
  { id: "financial-path", name: "Financial Path", category: "Career", description: "Money, stability, and what the material future holds.", positions: ["Current State", "Your Habits", "What's Blocking", "Opportunity", "Advice", "Outcome"] },

  // Decision
  { id: "decision", name: "Decision", category: "Decision", description: "Torn between two roads? This spread cuts through the fog.", positions: ["The Question", "Option A", "Option B", "What You're Not Seeing", "What You Need", "The Way Through"] },
  { id: "two-paths", name: "Two Paths", category: "Decision", description: "A clear-eyed look at the fork in front of you.", positions: ["The Crossroads", "Path A — If You Go", "Path B — If You Don't", "What Calls You", "What You Fear", "The Better Way"] },
  { id: "choice", name: "The Choice", category: "Decision", description: "Five cards to settle a hard yes or no.", positions: ["The Situation", "The Pull of Yes", "The Pull of No", "What You're Missing", "The Clear Answer"] },
  { id: "pros-cons", name: "Pros & Cons", category: "Decision", description: "Weighing both sides — the truth of each.", positions: ["The Matter", "What's For", "What's Against", "The Hidden Factor", "The Verdict"] },

  // Yearly
  { id: "year-ahead", name: "Year Ahead", category: "Yearly", description: "Twelve cards, one for each month — the shape of your year.", positions: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  { id: "birthday", name: "Birthday Spread", category: "Yearly", description: "A year from your birthday — what the new cycle brings.", positions: ["The Year's Theme", "What You Leave Behind", "What You Step Into", "Your Gift", "Your Challenge", "The Outcome"] },
  { id: "seasons", name: "Four Seasons", category: "Yearly", description: "The year in four turns — spring, summer, fall, winter.", positions: ["Spring", "Summer", "Autumn", "Winter", "The Thread Between Them"] },

  // Spiritual
  { id: "chakra", name: "Chakra Reading", category: "Spiritual", description: "Seven cards, seven energy centers — where you're open and blocked.", positions: ["Root", "Sacral", "Solar Plexus", "Heart", "Throat", "Third Eye", "Crown"] },
  { id: "past-life", name: "Past Life", category: "Spiritual", description: "A glimpse behind the veil — what your soul carries forward.", positions: ["The Past Life", "The Lesson", "What Carried Over", "How It Shows Now", "What to Release", "What to Embrace"] },
  { id: "shadow-work", name: "Shadow Work", category: "Spiritual", description: "Meet the parts you've hidden — and begin to integrate.", positions: ["The Shadow", "Where It Began", "How It Shows", "What It Protects", "What It Costs", "How to Heal"] },
  { id: "spiritual-path", name: "Spiritual Path", category: "Spiritual", description: "Where your soul is headed and what's asking to be learned.", positions: ["Where You Are", "The Call", "The Lesson", "The Obstacle", "The Guide", "The Next Step"] },
];

export function drawSpread(spread, deckIds = ["rider-waite"]) {
  const pool = [...CARDS];
  const drawn = [];
  for (let i = 0; i < spread.positions.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    drawn.push({
      name: card.name,
      reversed: Math.random() < 0.5,
      position: spread.positions[i],
      card,
    });
  }
  return drawn;
}

export function drawClarifiers(count) {
  const pool = [...CARDS];
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    out.push({ name: card.name, reversed: Math.random() < 0.5, card });
  }
  return out;
}

export function getCardByName(name) {
  return CARDS.find((c) => c.name === name);
}