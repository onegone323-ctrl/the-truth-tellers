import React from "react";

// Renders the Oracle's reading (markdown) in the dark-luxury theme.
// Supports the exact subset the Oracle writes: #/##/### headings, **bold**,
// *italic*, "- " bullets, "---" dividers, and paragraphs.

function renderInline(text, keyBase) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`${keyBase}-s${i}`} className="text-gold-leaf font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <em key={`${keyBase}-e${i}`} className="italic text-foreground/80">
          {tok.slice(1, -1)}
        </em>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ReadingText({ text }) {
  const lines = (text || "").split("\n");
  const out = [];
  let list = null;
  let listIdx = 0;

  const flushList = () => {
    if (list) {
      out.push(
        <ul key={`ul-${listIdx++}`} className="my-3 space-y-1.5">
          {list}
        </ul>
      );
      list = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `b${idx}`;

    if (line.trim() === "---") {
      flushList();
      out.push(<hr key={key} className="gold-hairline my-5" />);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(
        <h3 key={key} className="font-display text-base text-gold-leaf mt-4 mb-1.5">
          {renderInline(line.slice(4), key)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(
        <h2 key={key} className="font-display text-base sm:text-lg text-gold-leaf mt-6 mb-2 tracking-wide">
          {renderInline(line.slice(3), key)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      out.push(
        <h1 key={key} className="font-display text-lg sm:text-xl text-gold-leaf uppercase tracking-[0.12em] text-center mt-7 mb-4">
          {renderInline(line.slice(2), key)}
        </h1>
      );
    } else if (/^[-*] /.test(line)) {
      list = list || [];
      list.push(
        <li key={key} className="font-body text-foreground/90 text-sm leading-relaxed flex gap-2 before:content-['✦'] before:text-gold-leaf before:shrink-0">
          {renderInline(line.slice(2), key)}
        </li>
      );
    } else if (!line.trim()) {
      flushList();
    } else {
      flushList();
      out.push(
        <p key={key} className="font-body text-foreground/90 leading-relaxed text-[15px] my-2.5">
          {renderInline(line, key)}
        </p>
      );
    }
  });
  flushList();

  return <div>{out}</div>;
}