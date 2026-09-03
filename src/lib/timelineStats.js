import { format, parseISO } from "date-fns";

// All cards in a reading — main draws plus clarifiers.
export function allCards(entry) {
  const mains = entry.cards_drawn || [];
  const clars = mains.flatMap((c) => c.clarifiers || []);
  return [...mains, ...clars];
}

// Upright ratio of a reading: 1 = fully in alignment, 0 = all reversed.
export function alignmentOf(entry) {
  const all = allCards(entry);
  if (!all.length) return null;
  const upright = all.filter((c) => !c.reversed).length;
  return upright / all.length;
}

export function alignmentBadge(ratio) {
  if (ratio === null) return { label: "Unknown", color: "#a8a29e" };
  if (ratio >= 0.7) return { label: "In Alignment", color: "#d4af37" };
  if (ratio >= 0.4) return { label: "Mixed Currents", color: "#f5e6b8" };
  return { label: "Danger Zone", color: "#c0392b" };
}

// Cards that keep popping up, upright vs reversed, most seen first.
export function recurringCards(entries) {
  const counts = {};
  entries.forEach((e) => {
    allCards(e).forEach((c) => {
      counts[c.name] = counts[c.name] || { name: c.name, upright: 0, reversed: 0 };
      counts[c.name][c.reversed ? "reversed" : "upright"]++;
    });
  });
  return Object.values(counts)
    .map((c) => ({ ...c, total: c.upright + c.reversed }))
    .sort((a, b) => b.total - a.total);
}

// Cumulative readings per month — the growth curve.
export function growthSeries(entries) {
  const months = {};
  entries.forEach((e) => {
    const d = parseISO(e.created_date);
    const key = format(d, "yyyy-MM");
    months[key] = months[key] || { key, label: format(d, "MMM yy"), count: 0 };
    months[key].count++;
  });
  const sorted = Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
  let run = 0;
  return sorted.map((m) => ({ ...m, cumulative: (run += m.count) }));
}

// One point per reading, oldest first — the alignment trend.
export function alignmentSeries(entries) {
  return [...entries]
    .map((e) => ({
      date: format(parseISO(e.created_date), "MMM d"),
      ratio: Math.round((alignmentOf(e) ?? 0) * 100),
      question: e.question,
    }))
    .reverse();
}