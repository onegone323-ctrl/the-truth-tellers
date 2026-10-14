// A short "glimpse" reading for the Daily Card — a real two-line reading,
// not just the keyword meaning. Majors are hand-written; minors are composed
// from the suit's element and the card's stage.
const MAJOR_GLIMPSES = {
  "The Fool": {
    up: "A leap day — the road opens under your feet the moment you step. Say yes before you feel ready.",
    rev: "The leap you're avoiding is the one you need. Check you're not mistaking recklessness for freedom.",
  },
  "The Magician": {
    up: "Everything you need is already in your hands — stop waiting for permission. Name the goal, then act on it today.",
    rev: "Watch for talk that isn't backed by action, including your own. Real power today is quiet and precise.",
  },
  "The High Priestess": {
    up: "The answer isn't out there — it's the one you keep talking yourself out of. Be still and listen to it.",
    rev: "Your gut has been ringing and you've been muting it. Something hidden surfaces if you stop looking away.",
  },
  "The Empress": {
    up: "Today rewards tending — your work, your body, your people. Grow what you love and abundance follows.",
    rev: "You can't pour from an empty cup. Nourish yourself first, or what you build today leans on fumes.",
  },
  "The Emperor": {
    up: "Take the seat of authority today — structure it, decide it, hold the line. Order set now carries you for weeks.",
    rev: "Rigidity is costing you. Loosen your grip before control becomes the very chaos you're fighting.",
  },
  "The Hierophant": {
    up: "There's wisdom in the tried and true today — lean on teachers, tradition, and proven paths.",
    rev: "The rulebook doesn't own you today. Break convention where it has outlived its purpose.",
  },
  "The Lovers": {
    up: "A choice of the heart is on the table — make it with honesty and courage, not convenience.",
    rev: "Misalignment is showing itself. Don't paper over the crack — name it and realign.",
  },
  "The Chariot": {
    up: "Focus is your weapon today — one direction, full rein, and the win is yours.",
    rev: "You're pulling in two directions at once. Pick a lane before the reins decide for you.",
  },
  "Strength": {
    up: "Quiet courage wins today — steady hands, soft voice, unshakable patience.",
    rev: "Doubt is louder than the lion right now. Breathe, then act anyway — that's what strength is.",
  },
  "The Hermit": {
    up: "Step back from the noise — the answer arrives in solitude and honest self-reflection.",
    rev: "Withdrawal has tipped into hiding. Come back toward the light, one step at a time.",
  },
  "Wheel of Fortune": {
    up: "The wheel is turning in your favor — ride the momentum and take the lucky break seriously.",
    rev: "A rough spin of the wheel. Don't fight the turn — position yourself for the next one.",
  },
  "Justice": {
    up: "A reckoning day — what you've set in motion comes back to be weighed. Meet it with honesty and the scales land in your favor.",
    rev: "Dishonesty or avoidance clouds the scales today. Face the truth you've been circling and balance restores itself.",
  },
  "The Hanged Man": {
    up: "Pause is the move today — the view from a different angle changes everything.",
    rev: "You've been suspended long enough. Make the call — stalling is now its own decision.",
  },
  "Death": {
    up: "Something is ending so something better can begin. Release your grip and let the transformation work.",
    rev: "You're holding on to what's already gone. Clinging only delays the rebirth waiting behind it.",
  },
  "Temperance": {
    up: "Blend, balance, moderate — the middle path is the fast one today.",
    rev: "Extremes are pulling at you. Come back to center before excess writes a check you'll regret.",
  },
  "The Devil": {
    up: "Name the chain before it tightens — an attachment or craving wants your freewill today.",
    rev: "The chains are loosening. Claim the awareness and walk out while the door is open.",
  },
  "The Tower": {
    up: "What falls today was false anyway. Let it crumble — the ground underneath is finally real.",
    rev: "The crash is cushioned — a crisis averted. Still, honor the warning it carried.",
  },
  "The Star": {
    up: "Hope is not naive today — it's fuel. Follow the inspiration and let yourself be guided.",
    rev: "Faith feels thin right now, but the well isn't dry. Rest, refill, and don't quit in the dark.",
  },
  "The Moon": {
    up: "Not everything is as it appears — move slowly through the fog and trust what's proven, not what's promised.",
    rev: "The fog is lifting. Fears that shaped this week are dissolving — clarity is arriving.",
  },
  "The Sun": {
    up: "A bright day — say yes to joy, show your work, and let success be seen.",
    rev: "A cloud, not a storm — warmth is delayed, not denied. Keep going.",
  },
  "Judgement": {
    up: "The call is sounding — an awakening, a reckoning, a chance to rise renewed. Answer it.",
    rev: "Self-judgement is drowning out the call. Forgive yourself first, then rise.",
  },
  "The World": {
    up: "A cycle completes — finish it well, honor how far you've come, and stand in the wholeness.",
    rev: "Loose ends keep the door from closing. Tie them off and claim what you've earned.",
  },
};

const SUITS = {
  Wands: { theme: "passion, drive, and ambition" },
  Cups: { theme: "emotion, love, and intuition" },
  Swords: { theme: "truth, decisions, and the mind" },
  Pentacles: { theme: "money, work, and the material world" },
};

const STAGES = {
  1: "A new surge opens the door — pure potential, ready to be used.",
  2: "A choice between two sits in front of you.",
  3: "Something is expanding — give it room to grow.",
  4: "The foundations hold — build on them, or notice if you're stuck.",
  5: "Disruption forces growth — let it teach, not defeat.",
  6: "Balance restores itself — give as much as you receive.",
  7: "Look deeper before you act — assessment beats impulse.",
  8: "Momentum is building — keep it moving.",
  9: "You're nearly there — hold the line.",
  10: "The cycle's final step — complete it and move on.",
};

// A little glimpse of a reading for today's card, in the Oracle's blunt-warm voice.
export function dailyGlimpse(card, reversed) {
  if (!card) return "";
  if (card.arcana === "Major") {
    const g = MAJOR_GLIMPSES[card.name];
    if (!g) return reversed ? card.reversed : card.upright;
    return reversed ? g.rev : g.up;
  }
  const suit = SUITS[card.suit];
  const n = card.name.startsWith("Ace") ? 1 : parseInt(card.name, 10);
  if (!suit || !n) return reversed ? card.reversed : card.upright;
  if (reversed) {
    const stage = n === 1 ? "The opening hasn't been claimed yet." : STAGES[n];
    return `The ${suit.theme} current runs backward today — expect friction there. ${stage || "Something in that realm needs realignment."} Pause, realign, and don't force what wants time.`;
  }
  return `Today moves through ${suit.theme}. ${STAGES[n] || "Something in that realm is asking for your attention."} Move with the current, not against it.`;
}