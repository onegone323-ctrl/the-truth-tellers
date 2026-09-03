// Converts the Oracle's formatted markdown reading into clean spoken text —
// no markdown, emojis, bullets, or dividers in what she says aloud.
export function toSpokenText(markdown) {
  return (markdown || "")
    .replace(/^#{1,4}\s*/gm, "") // heading markers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/^[-*]\s+/gm, "") // bullet markers
    .replace(/^---\s*$/gm, "") // dividers
    .replace(/→/g, ",")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "") // emojis & symbols
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}