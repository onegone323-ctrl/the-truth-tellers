// Converts the Oracle's formatted markdown reading into clean spoken text.
//
// Goals:
// - Speak the SAME words the seeker sees on screen — no silent drops.
// - Turn markdown structure into natural spoken pauses: a period after a
//   section header, a period between dot-separated cards, "reversed" for
//   the "(R)" shorthand, etc.
// - Strip only the decorative glyph characters and markdown syntax; keep
//   every meaningful word.

export function toSpokenText(markdown) {
  let s = markdown || "";

  // 1. Strip decorative glyph characters that shouldn't be spoken. We
  //    target the specific glyphs the Oracle uses for section headers and
  //    common markdown emoji, but we do NOT touch ordinary punctuation or
  //    words. Each replaced glyph becomes a space so words don't collide.
  s = s.replace(/[\u2600-\u27BF\uFE0F\u2190-\u21FF]/g, " ");
  s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, " ");
  // Egyptian ankh & related supplementary symbols the Oracle likes.
  s = s.replace(/[\u{13000}-\u{1342F}]/gu, " ");
  // Other misc symbols we specifically use as glyphs.
  s = s.replace(/[❧✦✶✧☿☾☀⭐✵❂◈⚔⚡♆☘]/g, " ");

  // 2. Markdown syntax → plain text.
  s = s.replace(/^#{1,6}\s*/gm, "");         // heading markers
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");     // bold
  s = s.replace(/\*(.+?)\*/g, "$1");         // italic
  s = s.replace(/_([^_]+)_/g, "$1");         // underscore emphasis
  s = s.replace(/`([^`]+)`/g, "$1");         // inline code
  s = s.replace(/^\s*[-*]\s+/gm, "");        // bullet markers
  s = s.replace(/^\s*>\s?/gm, "");           // blockquote markers
  s = s.replace(/^---\s*$/gm, "");           // divider lines

  // 3. Convert card-line separators (middle dot, bullet, en-dash between
  //    cards) into periods so each card gets its own spoken beat.
  s = s.replace(/\s*[·•]\s*/g, ". ");

  // 4. Expand shorthand the Oracle uses in card lines.
  s = s.replace(/\(\s*R\s*\)/g, "(reversed)");
  s = s.replace(/→/g, ", ");

  // 5. Normalize whitespace inside lines BEFORE header detection, so a
  //    leading space left by glyph-strip doesn't break the anchor.
  s = s.replace(/^[ \t]+/gm, "");
  s = s.replace(/[ \t]+$/gm, "");

  // 6. Ensure section headers on their own line end with a period so the
  //    voice pauses before the card list that follows.
  s = s.replace(/^([A-Z][A-Z 0-9'&/-]{2,})$/gm, "$1.");

  // 7. Ensure lines that end with a colon (Translation:, Q/A prompts)
  //    end with a period so the following line is a new spoken beat.
  s = s.replace(/^([^\n:]{1,80}):\s*$/gm, "$1.");

  // 7. Normalize whitespace so line breaks and multiple spaces become
  //    natural pauses without dead air.
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/ *\n */g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  // 8. Strip stray leading punctuation left by earlier substitutions.
  s = s.replace(/^\s*[.,;:]\s*/gm, "");

  return s.trim();
}
