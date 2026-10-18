// Per-card SEO copy: a hand-written essence for the Majors, composed from
// structured suit/number/court material for the Minors. buildCardDescription
// returns 2-3 paragraphs (150+ words) for the card detail pages.

const MAJOR_SEO = {
  "The Fool": {
    e: "card zero of the arcana — the soul stepping off a cliff with the dawn behind it, unburdened by everything that came before.",
    q: "you stand at the very start of something, and the only real risk is refusing to jump.",
  },
  "The Magician": {
    e: "the alchemist of the deck, all four elements laid out on the table and the will to turn them into something real.",
    q: "you already hold every tool the situation requires — the work is claiming them and acting.",
  },
  "The High Priestess": {
    e: "the veiled keeper of hidden knowledge, seated between the pillars of the seen and the unseen.",
    q: "the answer isn't out there yet — it is the quiet one you keep talking over.",
  },
  "The Empress": {
    e: "nature's abundance made human, the great mother whose creations grow because she tends them.",
    q: "something in you is ready to be tended into full bloom — nurture it deliberately.",
  },
  "The Emperor": {
    e: "the stone fortress of the arcana, order built by a steady hand that answers for what it protects.",
    q: "the structure you build now — boundaries, routines, commitments — is what will hold you later.",
  },
  "The Hierophant": {
    e: "the bridge between the sacred and the everyday, keeper of tradition, lineage, and earned wisdom.",
    q: "a teacher, a tradition, or an established way holds the key — borrow what has already been tested.",
  },
  "The Lovers": {
    e: "the heart's crossroads, where two become one and every true union begins with a choice.",
    q: "a bond — and the decision about it — is the real subject of the reading.",
  },
  "The Chariot": {
    e: "the victor's ride, opposing forces harnessed under a single will and driven forward.",
    q: "momentum is yours if you grip the reins — divided effort is what has been stalling you.",
  },
  "Strength": {
    e: "the woman with the lion, force mastered not by combat but by calm, patience, and gentleness.",
    q: "what looks like a battle will be won with patience rather than power.",
  },
  "The Hermit": {
    e: "the lantern in the dark, the soul who steps away from the crowd to find what is actually true.",
    q: "solitude is the medicine — the answer arrives in the quiet you've been avoiding.",
  },
  "Wheel of Fortune": {
    e: "the great turning wheel of fate, rising and falling while the center holds perfectly still.",
    q: "a cycle is turning whether you push it or not — timing matters more than force right now.",
  },
  "Justice": {
    e: "the scales and the sword, cause meeting effect with neither mercy nor cruelty.",
    q: "a truth is being weighed, and the outcome will match what has actually been done.",
  },
  "The Hanged Man": {
    e: "the figure suspended upside down, finally seeing the world rightly by letting go of how it should be.",
    q: "you gain everything by pausing — the insight is living inside the delay.",
  },
  "Death": {
    e: "the scythe over a fallen crown, the great change that ends one chapter so another can breathe.",
    q: "an ending is not the loss it feels like — it is the door that had to open.",
  },
  "Temperance": {
    e: "the angel pouring between two cups, blending opposites into a third, better thing.",
    q: "moderation and patient blending — not extremes — are what carry you through.",
  },
  "The Devil": {
    e: "the chained figures who never notice their bonds hang loose, the shadow made comfortable.",
    q: "look honestly at what you keep returning to — the chain opens from the inside.",
  },
  "The Tower": {
    e: "the lightning-struck tower, the structure that had to fall so the truth underneath could be seen.",
    q: "a sudden shake is clearing something false — let it fall instead of propping it up.",
  },
  "The Star": {
    e: "the figure beneath a great star, pouring hope back into still waters after the storm.",
    q: "after turbulence comes renewal — faith is being restored, slowly and genuinely.",
  },
  "The Moon": {
    e: "the moonlit path between two towers, where nothing is quite what it seems.",
    q: "not everything you are perceiving is real — stay curious before you commit.",
  },
  "The Sun": {
    e: "the child on the white horse under a blazing sun, joy too simple to be doubted.",
    q: "clarity and success are available now — this is the deck's plainest yes.",
  },
  "Judgement": {
    e: "the rising figures answering a great call, the honest reckoning that wakes the sleeping parts of a life.",
    q: "a call to rise is sounding — the past is being weighed, not repeated.",
  },
  "The World": {
    e: "the dancer within the laurel wreath, the cycle complete and the next door already open.",
    q: "you are finishing something real — close it well and step through.",
  },
};

const NUMBER_SEO = {
  1: {
    e: "The ace marks the spark — a new beginning, pure potential, a gift that has just been placed in your hands.",
    q: "an opening has just appeared and it rewards a bold first move.",
  },
  2: {
    e: "The two marks duality — partnership, balance, or a genuine choice weighing between two real options.",
    q: "two forces or two choices are weighing against each other and one must be honored.",
  },
  3: {
    e: "The three marks expansion — collaboration, the first visible creation, the seedling breaking soil.",
    q: "the first fruits are showing — what you started is taking visible form.",
  },
  4: {
    e: "The four marks stability — foundation, structure, and the plateau that asks whether the walls still serve you.",
    q: "a plateau has been reached and the question is whether this structure still serves you.",
  },
  5: {
    e: "The five marks disruption — conflict, change, and the friction that forces real growth.",
    q: "friction is doing its necessary work, clearing what could not survive contact.",
  },
  6: {
    e: "The six marks harmony — giving and receiving, a turn toward easier water, balance restored.",
    q: "the water is turning easier — receive it, and pass the kindness forward.",
  },
  7: {
    e: "The seven marks the test point — assessment, introspection, looking deeper before committing to action.",
    q: "you are mid-test, and honesty about your own tactics matters more than speed.",
  },
  8: {
    e: "The eight marks movement — power, momentum building, the energy finally moving fast.",
    q: "things are moving quickly now — speed and repetition are on your side.",
  },
  9: {
    e: "The nine marks near completion — culmination, the end in sight, the last stretch before the summit.",
    q: "you are closer than it feels, and the final stretch asks for resolve.",
  },
  10: {
    e: "The ten marks completion — the cycle's final step, the harvest, the weight to be carried and then released.",
    q: "a cycle is completing — carry the lesson forward and let the weight go.",
  },
};

const COURT_SEO = {
  Page: {
    e: "Pages are messengers — the suit's energy at its beginning, eager, curious, still learning its own strength.",
    q: "a message, a student, or a very new beginning is carrying this card's energy into your life.",
  },
  Knight: {
    e: "Knights are pursuit — the suit's energy in full motion, all drive and direction, sometimes reckless.",
    q: "someone in motion — or your own impatience — is carrying this card's energy toward a result.",
  },
  Queen: {
    e: "Queens are mastery from within — the suit's energy embodied, receptive, and quietly in command.",
    q: "an inner mastery — yours or someone else's — is shaping how this card's energy flows.",
  },
  King: {
    e: "Kings are mastery in the world — authority, control, the suit's energy fully realized and outward-facing.",
    q: "an established authority — a person, or your own command — is directing this card's energy.",
  },
};

const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function buildCardDescription(card) {
  if (!card) return [];
  const paras = [];
  const isCourt = ["Page", "Knight", "Queen", "King"].some((r) => card.name.startsWith(r));

  if (card.arcana === "Major") {
    const s = MAJOR_SEO[card.name] || { e: "", q: "" };
    paras.push(
      `${card.name} is one of the twenty-two Major Arcana of the tarot — the archetypal forces that move beneath the surface of everyday events. ${cap(s.e)}`
    );
    paras.push(
      `In a reading, ${card.name} upright speaks of ${lc(card.upright)} Reversed, the same energy turns shadowed: ${lc(card.reversed)}. Its essence in the fewest words: ${card.keywords.join(", ")}.`
    );
    paras.push(
      `At Truth 4 Clarity, ${card.name} tends to surface when ${s.q} Whether you meet this card in the Rider-Waite, Thoth, Marseille, Egyptian, or any other tradition, the core meaning holds — only the imagery changes with the deck. The Oracle reads it in the context of its position in your spread, so the same card means something different as your Past than as your Outcome.`
    );
    return paras;
  }

  const suit = card.suit;
  const element = card.element;
  const suitTheme = card.upright; // fallback only

  if (isCourt) {
    const rank = ["Page", "Knight", "Queen", "King"].find((r) => card.name.startsWith(r));
    const s = COURT_SEO[rank] || { e: "", q: "" };
    paras.push(
      `${card.name} is a court card of the tarot, part of the ${element} suit of ${suit}. ${cap(s.e)} In practice, a court card often names a person in your life — or the part of you currently acting through this card's energy.`
    );
    paras.push(
      `Upright, ${card.name} centers on ${lc(card.upright)} Reversed, watch for ${lc(card.reversed)}. Its keywords: ${card.keywords.join(", ")}.`
    );
    paras.push(
      `The Oracle reads court cards as living energy rather than abstract events: when ${card.name} appears in your spread, ${s.q} The ${suit} suit's themes give the card its subject, and its position in the spread tells you where in your life that energy is standing.`
    );
    return paras;
  }

  const n = card.name.startsWith("Ace") ? 1 : parseInt(card.name, 10);
  const s = NUMBER_SEO[n] || { e: "", q: "" };
  paras.push(
    `${card.name} belongs to the ${element} suit of ${suit} — in tarot, the element of ${element} speaks through ${suit} cards. ${cap(s.e)}`
  );
  paras.push(
    `Upright, the ${card.name} carries the energy of ${lc(card.upright)} Reversed, its meaning turns inward or shadowed: ${lc(card.reversed)}. Its keywords: ${card.keywords.join(", ")}.`
  );
  paras.push(
    `In a Truth 4 Clarity reading, the ${card.name} tends to appear when ${s.q} The suit gives the card its element and subject, the number gives it its stage — read together, they turn a single card into a precise answer. The Oracle reads it in the context of its position in your spread, so the same card means something different as your Present than as your Outcome.`
  );
  return paras;
}

// Three related cards for internal links: same suit (or adjacent Majors).
export function relatedCards(card, CARDS) {
  if (!card) return [];
  let pool;
  if (card.arcana === "Major") {
    const i = CARDS.findIndex((c) => c.name === card.name);
    pool = CARDS.filter((c) => c.arcana === "Major" && c.name !== card.name)
      .sort((a, b) => Math.abs(CARDS.indexOf(a) - i) - Math.abs(CARDS.indexOf(b) - i));
  } else {
    pool = CARDS.filter((c) => c.suit === card.suit && c.name !== card.name);
  }
  return pool.slice(0, 3);
}