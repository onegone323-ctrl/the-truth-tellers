import React from "react";
import ReactMarkdown from "react-markdown";

const FAILED = /error|failed/i;

// One chat bubble. Assistant text renders as markdown; tool calls render as
// small status chips (the Oracle reading his records is not interesting
// enough to show by default).
export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? "rounded-2xl rounded-br-sm text-[#f2e8c9]"
            : "rounded-2xl rounded-bl-sm text-[#d7cfb7]"
        }`}
        style={
          isUser
            ? { background: "linear-gradient(120deg, rgba(123,44,255,.28), rgba(0,229,255,.14))", border: "1px solid rgba(0,229,255,.35)" }
            : { background: "var(--neo-field-bg)", border: "1px solid var(--neo-border)" }
        }
      >
        {message.content &&
          (isUser ? (
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-p:text-[#d7cfb7]">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        {(message.tool_calls || []).map((tc, i) => {
          const parsed = (() => {
            try {
              return typeof tc.results === "string" ? JSON.parse(tc.results) : tc.results;
            } catch {
              return tc.results;
            }
          })();
          const failed =
            ["failed", "error"].includes(tc.status) ||
            FAILED.test(String(tc.results || "")) ||
            parsed?.success === false;
          return (
            <div key={i} className="mt-2 text-[11px] tracking-wide" style={{ color: failed ? "#ff6b6b" : "#827b6d" }}>
              {failed ? "✕" : "◈"} {tc.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}