import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/agent/MessageBubble";
import { ArrowLeft, Brain, Plus, Send } from "lucide-react";

const AGENT_NAME = "oracle_memory";

// The questions this parlor exists for — asked after time has passed.
const SUGGESTIONS = [
  "What lesson am I not seeing?",
  "What am I not understanding?",
  "What keeps happening to me?",
];

const asList = (res) => (Array.isArray(res) ? res : res?.items || res?.conversations || []);

export default function Memory() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null); // active conversation object
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showListMobile, setShowListMobile] = useState(true);
  const bottomRef = useRef(null);

  const selectConversation = async (id) => {
    const conv = await base44.agents.getConversation(id);
    setActive(conv);
    setMessages(conv?.messages || []);
    setShowListMobile(false);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: "Memory Session", description: "Connecting past readings with present memory" },
    });
    setConversations((c) => [conv, ...c]);
    setActive(conv);
    setMessages([]);
    setShowListMobile(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const list = asList(await base44.agents.listConversations({ agent_name: AGENT_NAME }));
        list.sort((a, b) => String(b.updated_date || b.created_date || "").localeCompare(String(a.updated_date || a.created_date || "")));
        setConversations(list);
        if (list.length) await selectConversation(list[0].id);
        else await newConversation();
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live stream: the agent's reply arrives token by token here.
  useEffect(() => {
    if (!active?.id) return undefined;
    const unsubscribe = base44.agents.subscribeToConversation(active.id, (data) => {
      if (data?.messages) setMessages(data.messages);
    });
    return unsubscribe;
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || sending || !active?.id) return;
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const conv = await base44.agents.getConversation(active.id);
      await base44.agents.addMessage(conv, { role: "user", content: text });
      // The streamed reply lands via the subscription above.
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "The connection to my records flickered — try that again." }]);
    }
    setSending(false);
  };

  const waiting = sending || (messages.length > 0 && messages[messages.length - 1]?.role === "user");

  const ConversationList = (
    <div className={active && !showListMobile ? "hidden sm:block" : "block"}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="neo-label m-0 flex items-center gap-2">
          <Brain className="w-4 h-4" /> Memory Sessions
        </h2>
        <button onClick={newConversation} className="neo-pill flex items-center gap-1.5 px-3 py-2" title="New conversation">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => selectConversation(c.id)}
            className={`neo-spread-tile w-full text-left ${active?.id === c.id ? "is-active" : ""}`}
          >
            <strong className="block font-serif text-[14px] font-normal" style={{ color: "#eadfbf" }}>
              {c.metadata?.name || "Memory Session"}
            </strong>
            <span className="block mt-1" style={{ color: "#817a6d", fontSize: 11 }}>
              {String(c.created_date || "").slice(0, 10)}
            </span>
          </button>
        ))}
        {conversations.length === 0 && <p className="neo-note">No sessions yet.</p>}
      </div>
    </div>
  );

  return (
    <div className="enter" style={{ animation: "materialize .8s ease both" }}>
      <div className="neo-hero grid grid-cols-1 sm:grid-cols-2 items-center gap-[30px] px-4 sm:px-[54px] pt-10 pb-9" style={{ minHeight: 300 }}>
        <div>
          <div className="neo-eyebrow mb-5">Memory Parlor</div>
          <h1 className="neo-h1 m-0 text-[30px] tracking-[4px] sm:text-[44px] sm:tracking-[7px]">Ask Your Past</h1>
          <p style={{ maxWidth: 460, color: "#b5ad99", fontSize: 15, lineHeight: 1.7, margin: "20px 0 0" }}>
            After time has passed, come back and ask him: what lesson am I not seeing? He reads every reading he ever gave you — and hands you the hard truth.
          </p>
        </div>
        <div className="hidden sm:flex justify-center">
          <div style={{ fontSize: 72, color: "#00e5ff", textShadow: "0 0 30px #00e5ff" }}>✶</div>
        </div>
      </div>

      <div className="mx-4 sm:mx-[54px] mb-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="neo-panel">{ConversationList}</div>

        <div className={`neo-panel flex flex-col ${active && !showListMobile ? "block" : "hidden sm:flex"}`} style={{ minHeight: 480 }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowListMobile(true)} className="neo-pill sm:hidden px-3 py-2" aria-label="Back to sessions">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="neo-label m-0">{active?.metadata?.name || "Memory Session"}</h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ minHeight: 320, maxHeight: 560 }}>
            {loading && <p className="neo-note">Opening your records…</p>}
            {!loading && messages.length === 0 && (
              <div>
                <p className="neo-note" style={{ color: "#b5ad99" }}>
                  This is where you come back after time has passed — when the lesson still hasn't landed. Ask him. He remembers everything he told you, and he will hand you the hard truth.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="neo-pill">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {waiting && (
              <p className="neo-note" style={{ color: "#00e5ff" }}>
                The Oracle is leafing through your records…
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 mt-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about your patterns…"
              rows={1}
              className="neo-field"
              style={{ minHeight: 48 }}
            />
            <button onClick={send} disabled={!input.trim() || sending} className="neo-button px-4" aria-label="Send" style={{ minHeight: 48 }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}