import React, { useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

const CLIENTS = [
  {
    id: "claude",
    label: "Claude",
    steps: [
      "Open Claude and go to your profile menu, then Settings.",
      "Choose Connectors and click \"Add custom connector\".",
      "Give it a name — \"The Truth Teller\" works — and paste the server URL below.",
      "Click Add. When prompted, approve the connection on this app's consent page.",
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    steps: [
      "Open ChatGPT and go to Apps, then enable Developer mode.",
      "Heads-up: ChatGPT warns that developer mode reduces guardrails on untrusted code — enable it only if you accept that risk.",
      "Click \"Create app\", name it, and paste the server URL below.",
      "Click Create, then enable the app from the chat composer before prompting it.",
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    steps: [
      "Open Cursor and go to Settings, then Tools & Integrations.",
      "Click \"New MCP Server\" — Cursor opens its mcp.json file.",
      "Add an entry whose url is the server URL below, then save.",
      "Toggle the new server on.",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    steps: [
      "Copy the server URL below.",
      "Add it as a streamable HTTP MCP server in your client — a name and the URL are all most clients need.",
      "Reload the client so it picks up the new server.",
    ],
  },
];

export default function Connect() {
  const [active, setActive] = useState("claude");
  const [copied, setCopied] = useState(false);

  const serverUrl = useMemo(
    () => new URL("/api/mcp", window.location.origin).toString(),
    []
  );

  const copyUrl = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(serverUrl);
      ok = true;
    } catch (e) {
      // Fallback for WebViews without the async clipboard API
      try {
        const ta = document.createElement("textarea");
        ta.value = serverUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (_) { /* give up gracefully */ }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const client = CLIENTS.find((c) => c.id === active);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center pt-4">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">
          Connect Your Assistant
        </h1>
        <p className="text-muted-foreground mt-2 font-body text-sm max-w-md mx-auto">
          Let Claude, ChatGPT, Cursor, or any MCP client consult the Oracle on your behalf.
        </p>
      </div>

      <hr className="gold-hairline" />

      {/* Server URL */}
      <div className="lux-card rounded-xl p-5 space-y-3">
        <label className="text-xs uppercase tracking-widest text-gold-leaf/80">
          Your Oracle's MCP Server
        </label>
        <div className="flex items-center gap-2">
          <input
            value={serverUrl}
            readOnly
            onFocus={(e) => e.target.select()}
            className="flex-1 bg-black/60 rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
            style={{ border: "1px solid rgba(212,175,55,0.3)" }}
          />
          <button
            onClick={copyUrl}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Client tabs */}
      <div className="lux-card rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest transition-all ${
                active === c.id ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <ol className="space-y-3 list-decimal list-inside text-sm font-body text-foreground/85">
          {client.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {/* What happens on connect */}
      <div className="gold-pill rounded-xl p-4 text-sm space-y-2">
        <p className="flex items-center gap-2 text-gold-leaf text-xs uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> One Last Step
        </p>
        <p className="text-muted-foreground">
          Because this app is private, your assistant will open a consent page where you
          sign in with your own account and approve access — the assistant only ever acts
          as you.
        </p>
        <p className="text-muted-foreground">
          After we ship changes to the app, refresh the connector in your assistant —
          they cache the list of tools.
        </p>
      </div>
    </div>
  );
}