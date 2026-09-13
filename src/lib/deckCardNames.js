// What each tradition calls a card, when it differs from Rider-Waite.
const ALT = {
  thoth: {
    "Strength": "Lust",
    "Justice": "Adjustment",
    "Temperance": "Art",
    "Judgement": "The Aeon",
    "The World": "The Universe",
    "Wheel of Fortune": "Fortune",
    "The Hierophant": "The Hierophant (Atu V)",
    "Page": "Princess", "Knight": "Prince", "King": "Knight",
    "Pentacles": "Disks",
  },
  marseille: {
    "Judgement": "Le Jugement",
    "The Fool": "Le Mat",
    "The Magician": "Le Bateleur",
    "The High Priestess": "La Papesse",
    "The Empress": "L'Impératrice",
    "The Emperor": "L'Empereur",
    "The Hierophant": "Le Pape",
    "The Lovers": "L'Amoureux",
    "Strength": "La Force",
    "The Hermit": "L'Ermite",
    "Wheel of Fortune": "La Roue de Fortune",
    "Justice": "La Justice",
    "The Hanged Man": "Le Pendu",
    "Death": "L'Arcane sans Nom",
    "Temperance": "Tempérance",
    "The Devil": "Le Diable",
    "The Tower": "La Maison Dieu",
    "The Star": "L'Étoile",
    "The Moon": "La Lune",
    "The Sun": "Le Soleil",
    "The World": "Le Monde",
    "Page": "Valet", "Pentacles": "Coins", "Wands": "Batons",
  },
  egyptian: {
    "The Fool": "The Crocodile",
    "The Magician": "The Magus of Thoth",
    "The High Priestess": "Isis Veiled",
    "The Empress": "Isis Unveiled",
    "The Emperor": "The Cubic Stone",
    "The Hierophant": "The Master of the Mysteries",
    "The Lovers": "The Two Paths",
    "The Chariot": "The Chariot of Osiris",
    "Strength": "The Tamed Lion",
    "The Hermit": "The Veiled Lamp",
    "Wheel of Fortune": "The Wheel of Karma",
    "Justice": "Maat, the Scales",
    "The Hanged Man": "The Sacrifice",
    "Death": "The Scythe of Anubis",
    "Temperance": "The Two Urns",
    "The Devil": "Typhon / Set",
    "The Tower": "The Lightning-Struck Pyramid",
    "The Star": "The Star of the Magi",
    "The Moon": "The Twilight of Khonsu",
    "The Sun": "The Blazing Ra",
    "Judgement": "The Awakening of the Dead",
    "The World": "The Crown of the Magi",
  },
  isis: {
    "The High Priestess": "Isis Enthroned",
    "The Empress": "Hathor",
    "The Emperor": "Amun-Ra",
    "The Hierophant": "Osiris",
    "The Lovers": "Isis & Osiris",
    "The Chariot": "The Solar Barque",
    "Strength": "Sekhmet",
    "The Hermit": "The Veiled Lamp",
    "Death": "Anubis",
    "Justice": "Maat",
    "The Moon": "Khonsu",
    "The Sun": "Ra",
    "The Devil": "Set",
    "Judgement": "The Weighing of the Heart",
    "The World": "The Ennead",
  },
  "golden-dawn": {
    "Strength": "Fortitude",
    "Judgement": "The Last Judgement",
    "Wheel of Fortune": "The Wheel of Fortune (Rota)",
    "Page": "Princess", "Knight": "Prince", "King": "Knight",
  },
  wildwood: {
    "The Fool": "The Wanderer",
    "The Magician": "The Shaman",
    "The High Priestess": "The Seer",
    "The Empress": "The Green Woman",
    "The Emperor": "The Green Man",
    "The Hierophant": "The Ancestor",
    "The Lovers": "The Lovers (Blodeuwedd)",
    "The Chariot": "The Archer",
    "Strength": "The Woodward",
    "The Hermit": "The Hooded Man",
    "Wheel of Fortune": "The Wheel of the Year",
    "Justice": "The Blasted Oak's Balance",
    "The Hanged Man": "The Mirror",
    "Death": "The Journey",
    "Temperance": "Balance",
    "The Devil": "The Guardian",
    "The Tower": "The Blasted Oak",
    "The Star": "The Pole Star",
    "The Moon": "The Moon on Water",
    "The Sun": "The Sun of Life",
    "Judgement": "The Great Bear",
    "The World": "The World Tree",
    "Wands": "Arrows", "Cups": "Vessels", "Swords": "Stones", "Pentacles": "Stones",
    "Page": "Child", "Knight": "Warrior", "Queen": "Queen", "King": "King",
  },
  "deviant-moon": {
    "The Fool": "The Fool (Moonchild)",
    "The Moon": "The Deviant Moon",
    "The Devil": "The Asylum Devil",
  },
};

// The name this deck gives the card, or null when it matches Rider-Waite.
export function deckCardTitle(deckId, cardName) {
  const map = ALT[deckId];
  if (!map || !cardName) return null;
  if (map[cardName]) return map[cardName];

  // Minor arcana: swap court rank and/or suit if this tradition renames them.
  const m = cardName.match(/^(Ace|Page|Knight|Queen|King|\d+) of (Wands|Cups|Swords|Pentacles)$/);
  if (m) {
    const rank = map[m[1]] || m[1];
    const suit = map[m[2]] || m[2];
    const alt = `${rank} of ${suit}`;
    if (alt !== cardName) return alt;
  }
  return null;
}